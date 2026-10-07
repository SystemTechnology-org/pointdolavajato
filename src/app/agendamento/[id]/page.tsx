"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Phone,
  Ban,
  MapPin,
  ExternalLink,
  Calendar,
} from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAppStore } from "@/lib/store";
import { formatCurrency, formatDateBR } from "@/lib/utils";
import { normalizePhone } from "@/lib/services/customers";
import { generateWhatsAppLink } from "@/lib/services/whatsapp";
import { Agendamento } from "@/types";

export default function DetalhesAgendamentoPublicoPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const id = typeof params?.id === "string" ? params.id : "";
  const tokenFromUrl = searchParams.get("token") || "";

  const { agendamentos, cancelAppointment, isLoaded, businessSettings } = useAppStore();

  const [appointment, setAppointment] = useState<Agendamento | null>(null);
  const [phoneConfirmInput, setPhoneConfirmInput] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Localizar agendamento no store
  const foundAppointment = useMemo(() => {
    return agendamentos.find(
      (a) => a.id === id || (a.code && a.code.toLowerCase() === id.toLowerCase())
    );
  }, [agendamentos, id]);

  useEffect(() => {
    if (foundAppointment) {
      setAppointment(foundAppointment);
    }
  }, [foundAppointment]);

  const activeToken = tokenFromUrl;
  const isAuthorized = Boolean(
    (appointment?.cancel_token && activeToken && appointment.cancel_token === activeToken) ||
    (appointment && phoneConfirmInput && normalizePhone(appointment.cliente_whatsapp) === normalizePhone(phoneConfirmInput))
  );

  const canCancel =
    appointment &&
    ["Agendado", "Confirmado"].includes(appointment.status) &&
    !cancelSuccess;

  const handleCancel = async () => {
    if (!appointment) return;

    if (!isAuthorized) {
      setErrorMessage("Por favor, confirme seu número de WhatsApp cadastrado para autorizar o cancelamento.");
      return;
    }

    setIsCancelling(true);
    setErrorMessage(null);

    try {
      // 1. Tentar cancelar no backend via API
      const res = await fetch(`/api/appointments/${appointment.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: activeToken,
          phone: phoneConfirmInput,
          reason: cancelReason.trim() || "Cancelado pelo cliente na página web",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Não foi possível cancelar o agendamento no momento.");
      }

      // 2. Atualizar no store local
      await cancelAppointment(appointment.id, cancelReason.trim());
      setCancelSuccess(true);
      setShowConfirmModal(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao cancelar agendamento.";
      setErrorMessage(msg);
    } finally {
      setIsCancelling(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-canvas text-slate-100 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground">Carregando detalhes do agendamento...</p>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-canvas text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full p-6 rounded-2xl bg-surface border border-surface-border text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
            <XCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Agendamento não encontrado</h2>
          <p className="text-xs text-muted-foreground">
            O protocolo informado não foi localizado em nossa base de dados.
          </p>
          <div className="pt-2">
            <Link href="/agendar">
              <Button variant="primary" className="w-full text-xs">
                Realizar novo agendamento
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isCancelled = appointment.status === "Cancelado" || cancelSuccess;

  return (
    <div className="min-h-screen bg-canvas text-slate-100 flex flex-col justify-between py-6 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col items-center text-center space-y-2">
          <Logo size="md" showText={false} href="/agendar" />
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center justify-center gap-1.5">
              <span>Point do Coco</span>
              <span className="w-2 h-2 rounded-full bg-brand-yellow"></span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Consulta e Gerenciamento de Agendamento
            </p>
          </div>
        </header>

        {/* Card do Agendamento */}
        <div className="p-5 rounded-2xl bg-surface border border-surface-border space-y-5">
          {/* Topo do Card com Protocolo e Status */}
          <div className="flex items-center justify-between pb-3 border-b border-surface-border">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground block">
                Protocolo
              </span>
              <span className="text-sm font-mono font-bold text-brand-yellow-text">
                #{appointment.code || appointment.id}
              </span>
            </div>
            <StatusBadge status={isCancelled ? "Cancelado" : appointment.status} />
          </div>

          {/* Mensagem de Cancelado se aplicável */}
          {isCancelled && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-200">
              <Ban className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-300">Este agendamento foi cancelado.</p>
                <p className="text-[11px] text-red-200/80 mt-0.5">
                  O horário foi liberado para outros clientes. Você pode realizar uma nova reserva quando desejar.
                </p>
              </div>
            </div>
          )}

          {/* Dados do Atendimento */}
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-surface-elevated/60 border border-surface-border/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-semibold text-white">{appointment.cliente_nome}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Veículo:</span>
                <span className="font-semibold text-white">
                  {appointment.veiculo_modelo || appointment.veiculo_tipo} {appointment.veiculo_placa && appointment.veiculo_placa !== "---" ? `(${appointment.veiculo_placa})` : ""}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Categoria:</span>
                <span className="px-2 py-0.5 rounded bg-surface border border-surface-border text-slate-300">
                  {appointment.veiculo_tipo}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Serviço:</span>
                <span className="font-semibold text-white">{appointment.servico_nome}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-surface-border/50">
                <span className="text-muted-foreground">Data e Horário:</span>
                <span className="font-bold text-brand-yellow-text">
                  {formatDateBR(appointment.data)} às {appointment.horario}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Valor:</span>
                <span className="font-bold text-brand-green-text text-sm">
                  {formatCurrency(appointment.valor)}
                </span>
              </div>
            </div>

            {appointment.observacoes && (
              <div className="p-3 rounded-xl bg-surface-elevated/40 border border-surface-border/40 text-[11px] text-muted-foreground">
                <span className="font-semibold text-slate-300 block mb-0.5">Observações:</span>
                <p>{appointment.observacoes}</p>
              </div>
            )}
          </div>

          {/* Seção de Cancelamento Seguro (Requisito 18) */}
          {canCancel && (
            <div className="pt-3 border-t border-surface-border space-y-3">
              <Button
                variant="outline"
                className="w-full text-xs text-red-400 hover:text-red-300 border-red-500/30 hover:bg-red-500/10"
                onClick={() => setShowConfirmModal(true)}
              >
                <Ban className="w-4 h-4 mr-2" />
                Cancelar este agendamento
              </Button>
            </div>
          )}

          {/* Modal ou Área de Confirmação de Cancelamento */}
          {showConfirmModal && canCancel && (
            <div className="p-4 rounded-xl bg-surface-elevated border border-red-500/40 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-red-300">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>Confirmação de Cancelamento</span>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Para sua segurança, informe os dados abaixo para confirmar o cancelamento:
              </p>

              {!tokenFromUrl && (
                <Input
                  label="Confirme seu WhatsApp cadastrado *"
                  placeholder="Ex: 71 99999-9999"
                  value={phoneConfirmInput}
                  onChange={(e) => setPhoneConfirmInput(e.target.value)}
                />
              )}

              <Input
                label="Motivo do cancelamento (opcional)"
                placeholder="Ex: Imprevisto no trabalho"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />

              {errorMessage && (
                <p className="text-[11px] text-red-400 font-medium">{errorMessage}</p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-1/2 text-xs"
                  onClick={() => setShowConfirmModal(false)}
                >
                  Voltar
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-1/2 text-xs bg-red-600 hover:bg-red-700 text-white"
                  disabled={isCancelling}
                  onClick={handleCancel}
                >
                  {isCancelling ? "Cancelando..." : "Confirmar cancelamento"}
                </Button>
              </div>
            </div>
          )}

          {/* Detalhes do Estabelecimento (Requisitos 13, 14 e 15) */}
          <div className="p-3 rounded-xl bg-surface-elevated/40 border border-surface-border text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <MapPin className="w-3.5 h-3.5 text-brand-yellow shrink-0" />
              <span>{businessSettings?.business_name || "Point do Coco Lava Jato"}</span>
            </div>
            <p className="text-[11px] text-muted-foreground pl-5">
              {businessSettings?.address || "Entrada do bosque Guaraípe, Litoral Norte - BA"}
            </p>
          </div>

          {/* Ações adicionais */}
          <div className="space-y-2 pt-2 border-t border-surface-border">
            {businessSettings?.whatsapp && (
              <a
                href={
                  generateWhatsAppLink(
                    businessSettings.whatsapp,
                    `Olá! Gostaria de informações sobre meu agendamento #${appointment.code || appointment.id} para ${appointment.cliente_nome}.`
                  ) || "#"
                }
                target="_blank"
                rel="noopener noreferrer"
                className="w-full block"
              >
                <Button variant="outline" className="w-full text-xs">
                  <Phone className="w-3.5 h-3.5 mr-2 text-brand-green" />
                  Falar com o Lava Jato no WhatsApp
                </Button>
              </a>
            )}

            <a
              href={businessSettings?.instagram_url || "https://instagram.com/pointdococolavajato"}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full block"
            >
              <Button variant="ghost" className="w-full text-xs text-brand-yellow hover:text-white hover:bg-brand-yellow/10">
                <ExternalLink className="w-3.5 h-3.5 mr-2" />
                Seguir @pointdococolavajato no Instagram
              </Button>
            </a>

            <Link
              href={`/meus-agendamentos${appointment?.cliente_whatsapp ? `?phone=${normalizePhone(appointment.cliente_whatsapp)}` : ""}`}
              className="w-full block"
            >
              <Button variant="ghost" className="w-full text-xs text-brand-yellow hover:text-white hover:bg-brand-yellow/10">
                <Calendar className="w-3.5 h-3.5 mr-2" />
                Ver todos os meus agendamentos
              </Button>
            </Link>

            <Link href="/agendar" className="w-full block">
              <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:text-white">
                <ArrowLeft className="w-3.5 h-3.5 mr-2" />
                Ir para início / Novo agendamento
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
