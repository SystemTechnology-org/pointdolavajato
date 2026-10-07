"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Car,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Eye,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Agendamento } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import {
  computeWaitingForPickupMinutes,
  getWaitingPickupSeverity,
} from "@/lib/services/appointments";
import { whatsappTemplates, generateWhatsAppLink } from "@/lib/services/whatsapp";
import { EntregaVeiculoModal } from "./EntregaVeiculoModal";
import { ComprovanteEntregaModal } from "./ComprovanteEntregaModal";

interface SecaoAguardandoRetiradaProps {
  agendamentos: Agendamento[];
  onOpenPagamento?: (agendamento: Agendamento) => void;
  onRefresh?: () => void;
}

export function SecaoAguardandoRetirada({
  agendamentos,
  onOpenPagamento,
  onRefresh,
}: SecaoAguardandoRetiradaProps) {
  const {
    getAppointmentPaymentSummary,
    businessSettings,
    logCommunication,
  } = useAppStore();

  const [entregandoAgendamento, setEntregandoAgendamento] = useState<Agendamento | null>(null);
  const [comprovanteAgendamento, setComprovanteAgendamento] = useState<Agendamento | null>(null);

  // Filtrar apenas veículos prontos ou aguardando retirada (que ainda não foram entregues ou cancelados)
  const veiculosAguardando = agendamentos.filter(
    (a) => a.status === "Pronto" || a.status === "Aguardando retirada" || a.status === "Aguardando pagamento"
  );

  if (veiculosAguardando.length === 0) {
    return null;
  }

  const handleAvisarWhatsApp = (a: Agendamento) => {
    const pay = getAppointmentPaymentSummary(a.id);
    const temPendente = pay.remainingBalance > 0.01;

    const msg = temPendente
      ? whatsappTemplates.vehicleReadyPendingPayment({
          cliente: a.cliente_nome,
          veiculo: a.veiculo_modelo,
          servico: a.servico_nome,
          valor: a.valor,
          pago: pay.totalPaid,
          saldo: pay.remainingBalance,
          empresa: businessSettings.business_name || "Point do Coco Lava Jato",
        })
      : whatsappTemplates.vehicleReady({
          cliente: a.cliente_nome,
          veiculo: a.veiculo_modelo,
          servico: a.servico_nome,
          empresa: businessSettings.business_name || "Point do Coco Lava Jato",
        });

    const link = generateWhatsAppLink(a.cliente_whatsapp, msg);
    if (link) {
      logCommunication({
        customer_id: a.cliente_id,
        appointment_id: a.id,
        channel: "whatsapp",
        type: "vehicle_ready",
        message_preview: msg,
        status: "opened",
      }).catch(console.warn);

      window.open(link, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-4">
      {/* Topo da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-500/20 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                VEÍCULOS AGUARDANDO RETIRADA
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                {veiculosAguardando.length} {veiculosAguardando.length === 1 ? "veículo" : "veículos"}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Veículos já lavados e inspecionados prontos para devolução ao cliente.
            </p>
          </div>
        </div>
      </div>

      {/* Grid de Veículos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {veiculosAguardando.map((a) => {
          const pay = getAppointmentPaymentSummary(a.id);
          const temPendente = pay.remainingBalance > 0.01;
          const minutosEspera = computeWaitingForPickupMinutes(a.ready_at || a.completed_at);
          const severity = minutosEspera !== null ? getWaitingPickupSeverity(minutosEspera) : null;

          return (
            <div
              key={a.id}
              className="p-4 rounded-xl bg-surface border border-surface-border hover:border-cyan-500/40 transition-all space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                {/* Placa e Tempo de Espera */}
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-surface-elevated border border-surface-border font-mono text-xs font-bold text-brand-yellow tracking-wider">
                    {a.veiculo_placa && a.veiculo_placa !== "---" ? a.veiculo_placa : "SEM PLACA"}
                  </span>

                  {severity && (
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${severity.badgeClass}`}
                      title={`Pronto há ${minutosEspera} minutos`}
                    >
                      <Clock className="w-3 h-3" />
                      Pronto há {severity.label}
                    </span>
                  )}
                </div>

                {/* Veículo e Cliente */}
                <div>
                  <h4 className="font-bold text-white text-sm truncate">{a.veiculo_modelo}</h4>
                  <p className="text-xs text-slate-300 truncate mt-0.5">
                    Cliente: <span className="font-semibold text-white">{a.cliente_nome}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    Serviço: {a.servico_nome}
                  </p>
                </div>

                {/* Status Financeiro */}
                <div className="p-2 rounded-lg bg-surface-elevated/40 border border-surface-border text-xs flex items-center justify-between">
                  <span className="text-muted-foreground">Financeiro:</span>
                  {temPendente ? (
                    <span className="font-bold text-rose-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Pendente {formatCurrency(pay.remainingBalance)}
                    </span>
                  ) : (
                    <span className="font-bold text-brand-green-text flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Quitado ({formatCurrency(pay.totalPaid)})
                    </span>
                  )}
                </div>
              </div>

              {/* Ações Rápidas do Card */}
              <div className="pt-2 border-t border-surface-border/60 flex flex-wrap items-center gap-1.5 text-xs">
                {/* Botão WhatsApp */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAvisarWhatsApp(a)}
                  leftIcon={<MessageCircle className="w-3.5 h-3.5 text-brand-green" />}
                  className="h-8 px-2.5 text-[11px] flex-1 bg-surface-elevated/60"
                  title="Avisar cliente no WhatsApp"
                >
                  Avisar WhatsApp
                </Button>

                {/* Botão Pagar se pendente */}
                {temPendente && onOpenPagamento && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenPagamento(a)}
                    leftIcon={<DollarSign className="w-3.5 h-3.5 text-amber-400" />}
                    className="h-8 px-2 text-[11px] border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                    title="Registrar pagamento"
                  >
                    Pagar
                  </Button>
                )}

                {/* Botão Entregar Veículo */}
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setEntregandoAgendamento(a)}
                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  className="h-8 px-3 text-[11px] font-bold bg-brand-green hover:bg-emerald-600 text-black flex-1"
                >
                  Entregar
                </Button>

                {/* Link para detalhes */}
                <Link href={`/atendimentos/${a.id}`} className="shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Ver detalhes do atendimento"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Entrega */}
      {entregandoAgendamento && (
        <EntregaVeiculoModal
          isOpen={!!entregandoAgendamento}
          onClose={() => setEntregandoAgendamento(null)}
          agendamento={entregandoAgendamento}
          onOpenPagamento={() => {
            if (onOpenPagamento) {
              onOpenPagamento(entregandoAgendamento);
            }
          }}
          onOpenComprovante={() => {
            setComprovanteAgendamento(entregandoAgendamento);
          }}
          onSuccess={() => {
            setComprovanteAgendamento(entregandoAgendamento);
            onRefresh?.();
          }}
        />
      )}

      {/* Modal de Comprovante */}
      {comprovanteAgendamento && (
        <ComprovanteEntregaModal
          isOpen={!!comprovanteAgendamento}
          onClose={() => setComprovanteAgendamento(null)}
          agendamento={comprovanteAgendamento}
        />
      )}
    </div>
  );
}
