"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Agendamento, StatusAgendamento } from "@/types";
import { formatCurrency, formatDateBR } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { useAppStore } from "@/lib/store";
import {
  User,
  Car,
  Clock,
  CheckCircle2,
  Save,
  ShieldCheck,
  History,
  AlertCircle,
  Camera,
  Printer,
  ExternalLink,
} from "lucide-react";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { FichaCheckinModal } from "@/components/modals/FichaCheckinModal";

interface DetalhesAtendimentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  agendamento: Agendamento | null;
  onAlterarStatus?: (id: string, novoStatus: StatusAgendamento) => void;
  onAbrirCancelar?: (agendamento: Agendamento) => void;
}

export function DetalhesAtendimentoModal({
  isOpen,
  onClose,
  agendamento,
  onAlterarStatus,
  onAbrirCancelar,
}: DetalhesAtendimentoModalProps) {
  const {
    updateAgendamentoNotes,
    getStatusHistory,
    getAppointmentPaymentSummary,
    getCheckinByAppointmentId,
  } = useAppStore();
  const { success } = useToast();

  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [isFichaOpen, setIsFichaOpen] = useState(false);

  useEffect(() => {
    if (agendamento) {
      setNotes(agendamento.observacoes || "");
    }
  }, [agendamento]);

  if (!agendamento) return null;

  const checkin = getCheckinByAppointmentId(agendamento.id);
  const history = getStatusHistory(agendamento.id);
  const paySummary = getAppointmentPaymentSummary(agendamento.id);
  const remaining = paySummary?.remainingBalance || 0;
  const totalPaid = paySummary?.totalPaid || 0;

  const templateVars = {
    cliente: agendamento.cliente_nome,
    servico: agendamento.servico_nome,
    veiculo: `${agendamento.veiculo_modelo}${agendamento.veiculo_placa && agendamento.veiculo_placa !== "---" ? ` (${agendamento.veiculo_placa})` : ""}`,
    data: formatDateBR(agendamento.data),
    horario: agendamento.horario,
    valor: agendamento.valor,
    pago: totalPaid,
    saldo: remaining,
    codigo: agendamento.code || agendamento.id,
  };

  const handleSaveNotes = () => {
    setSavingNotes(true);
    try {
      updateAgendamentoNotes(agendamento.id, notes.trim());
      success("Observações do atendimento atualizadas!");
    } finally {
      setSavingNotes(false);
    }
  };


  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Atendimento & Ordem de Serviço"
      description={`Protocolo: #${agendamento.code || agendamento.id.slice(-6).toUpperCase()}`}
      size="lg"
    >
      <div className="space-y-4 text-xs max-h-[80vh] overflow-y-auto pr-1">
        {/* 1. TOPO: STATUS E VALORES */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-surface-elevated border border-surface-border">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              Status Operacional
            </span>
            <div className="flex items-center gap-2">
              <StatusBadge status={agendamento.status} />
              {agendamento.duracao_real_minutos && (
                <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Duração real: {agendamento.duracao_real_minutos} min
                </span>
              )}
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              Valor Contratado (Snapshot)
            </span>
            <span className="text-base font-bold text-brand-green-text">
              {formatCurrency(agendamento.valor)}
            </span>
          </div>
        </div>

        {/* 2. DADOS DO CLIENTE E VEÍCULO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Card Cliente */}
          <div className="p-3.5 rounded-xl bg-surface border border-surface-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-300" />
                Cliente
              </span>
              {agendamento.cliente_id && (
                <Link
                  href={`/clientes/${agendamento.cliente_id}`}
                  className="text-brand-green hover:underline text-[11px]"
                  onClick={onClose}
                >
                  Ver cadastro
                </Link>
              )}
            </div>

            <p className="font-semibold text-white text-sm">
              {agendamento.cliente_nome}
            </p>

            <div className="flex items-center justify-between pt-1 border-t border-surface-border/50">
              <span className="text-muted-foreground">WhatsApp:</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">{agendamento.cliente_whatsapp}</span>
                <WhatsAppButton
                  phone={agendamento.cliente_whatsapp}
                  templateType={
                    agendamento.status === "Aguardando"
                      ? "appointmentWaiting"
                      : agendamento.status === "Em atendimento"
                      ? "appointmentInProgress"
                      : agendamento.status === "Finalizado"
                      ? "appointmentCompleted"
                      : "generalContact"
                  }
                  templateVars={templateVars}
                  customerId={agendamento.cliente_id}
                  appointmentId={agendamento.id}
                  label="WhatsApp"
                  size="xs"
                  variant="outline"
                />
              </div>
            </div>
          </div>

          {/* Card Veículo */}
          <div className="p-3.5 rounded-xl bg-surface border border-surface-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-slate-300" />
                Veículo
              </span>
              {agendamento.veiculo_id && (
                <Link
                  href={`/veiculos/${agendamento.veiculo_id}`}
                  className="text-brand-green hover:underline text-[11px]"
                  onClick={onClose}
                >
                  Ver histórico
                </Link>
              )}
            </div>

            <div className="flex items-center justify-between">
              <p className="font-semibold text-white text-sm">
                {agendamento.veiculo_modelo}
              </p>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-elevated text-brand-yellow-text border border-surface-border">
                {agendamento.veiculo_placa && agendamento.veiculo_placa !== "---" ? agendamento.veiculo_placa : "Sem placa"}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-surface-border/50">
              <span className="text-muted-foreground">Categoria:</span>
              <span className="px-2 py-0.5 rounded bg-surface-elevated text-slate-300 text-[11px]">
                {agendamento.veiculo_tipo}
              </span>
            </div>
          </div>
        </div>

        {/* 3. SERVIÇO E HORÁRIO */}
        <div className="p-3.5 rounded-xl bg-surface border border-surface-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold text-muted-foreground">
              Serviço Agendado
            </span>
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Previsão: {agendamento.duracao_minutos || 45} min
            </span>
          </div>

          <p className="font-semibold text-white">
            {agendamento.servico_nome}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-surface-border/50 text-[11px]">
            <div>
              <span className="text-muted-foreground block">Data:</span>
              <span className="font-medium text-slate-200">{formatDateBR(agendamento.data)}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Horário:</span>
              <span className="font-medium text-slate-200">{agendamento.horario}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Iniciado às:</span>
              <span className="font-medium text-slate-200">
                {agendamento.started_at
                  ? new Date(agendamento.started_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                  : "—"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Concluído às:</span>
              <span className="font-medium text-slate-200">
                {agendamento.completed_at
                  ? new Date(agendamento.completed_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                  : "—"}
              </span>
            </div>
          </div>

          {agendamento.cancellation_reason && (
            <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-[11px] flex items-start gap-2 mt-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <div>
                <strong>Motivo do cancelamento:</strong> {agendamento.cancellation_reason}
              </div>
            </div>
          )}
        </div>

        {/* 4. OBSERVAÇÕES OPERACIONAIS (Requisito 25) */}
        <div className="p-3.5 rounded-xl bg-surface border border-surface-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold text-muted-foreground">
              Observações do Atendimento
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] px-2"
              onClick={handleSaveNotes}
              isLoading={savingNotes}
              leftIcon={<Save className="w-3 h-3" />}
            >
              Salvar notas
            </Button>
          </div>
          <textarea
            rows={2}
            placeholder="Ex: Cliente pediu cuidado com retrovisor, atenção nas rodas, tapetes guardados na mala..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-2.5 text-xs rounded-xl bg-surface-elevated border border-surface-border text-white placeholder-muted-foreground focus:outline-none focus:border-brand-green"
          />
        </div>

        {/* 5. CHECK-IN FORMAL & VISTORIA (ETAPA 10) */}
        <div className="p-3.5 rounded-xl bg-surface border border-surface-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-green" />
              Vistoria de Entrada / Check-in
            </span>
            {checkin ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-green/20 text-brand-green border border-brand-green/30 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Realizado
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                Pendente
              </span>
            )}
          </div>

          {checkin ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] p-2.5 rounded-lg bg-surface-elevated/60 border border-surface-border/60">
                <div>
                  <span className="text-muted-foreground block text-[10px]">KM:</span>
                  <span className="font-semibold text-white">
                    {checkin.mileage != null ? `${checkin.mileage.toLocaleString("pt-BR")} km` : "Não informado"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Combustível:</span>
                  <span className="font-semibold text-white capitalize">{checkin.fuel_level || "Não informado"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Avarias:</span>
                  <span className={checkin.damages && checkin.damages.length > 0 ? "text-amber-400 font-bold" : "text-emerald-400 font-semibold"}>
                    {checkin.damages && checkin.damages.length > 0
                      ? `${checkin.damages.length} avaria(s)`
                      : "Nenhuma"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Fotos:</span>
                  <span className="font-semibold text-white flex items-center gap-1">
                    <Camera className="w-3 h-3 text-muted-foreground" />
                    {checkin.photos?.length || 0} registrada(s)
                  </span>
                </div>
              </div>

              {checkin.objects_left_in_vehicle && (
                <div className="p-2 rounded-lg bg-surface-elevated/40 border border-surface-border text-[11px]">
                  <span className="text-muted-foreground block text-[10px] font-medium">Objetos deixados no veículo:</span>
                  <p className="text-slate-200 mt-0.5">{checkin.objects_left_in_vehicle}</p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs text-brand-yellow hover:text-white border-brand-yellow/40 hover:bg-brand-yellow/10"
                  onClick={() => setIsFichaOpen(true)}
                  leftIcon={<Printer className="w-3.5 h-3.5" />}
                >
                  Ficha de Entrada
                </Button>
                <Link
                  href={`/atendimentos/${agendamento.id}`}
                  onClick={onClose}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md text-brand-green hover:bg-brand-green/10 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Ver vistoria completa
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2">
              <p className="text-amber-200 text-[11px] leading-relaxed">
                Nenhum check-in formal de entrada (avarias, fotos, KM e pertences) foi registrado para este atendimento.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Link
                  href={`/atendimentos/${agendamento.id}/checkin`}
                  onClick={onClose}
                >
                  <Button
                    size="sm"
                    variant="primary"
                    className="h-7 text-xs bg-brand-yellow hover:bg-amber-500 text-black font-semibold"
                    leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
                  >
                    Fazer Check-in Agora
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* 6. HISTÓRICO DE MUDANÇAS DE STATUS (Requisito 20) */}
        <div className="p-3.5 rounded-xl bg-surface border border-surface-border space-y-2">
          <span className="text-[11px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-slate-300" />
            Linha do Tempo / Histórico de Mudanças
          </span>

          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground py-1">
              Criado em {new Date(agendamento.created_at).toLocaleString("pt-BR")}. Nenhuma alteração operacional registrada.
            </p>
          ) : (
            <div className="space-y-1.5 pt-1">
              {history.map((h, i) => (
                <div
                  key={h.id || i}
                  className="flex items-start justify-between p-2 rounded-lg bg-surface-elevated/50 border border-surface-border/50 text-[11px]"
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-white">
                      Status alterado para: {h.new_status}
                    </span>
                    {h.old_status && (
                      <span className="text-muted-foreground block text-[10px]">
                        (Anterior: {h.old_status})
                      </span>
                    )}
                    {h.notes && (
                      <p className="text-slate-300 text-[10px]">{h.notes}</p>
                    )}
                  </div>
                  <span className="text-muted-foreground text-[10px] shrink-0 font-mono">
                    {new Date(h.changed_at).toLocaleString("pt-BR")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 7. BARRA DE AÇÕES INFERIORES */}
        <div className="pt-2 border-t border-surface-border flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {agendamento.status === "Agendado" && onAlterarStatus && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  onAlterarStatus(agendamento.id, "Confirmado");
                  onClose();
                }}
              >
                Confirmar
              </Button>
            )}

            {["Agendado", "Confirmado"].includes(agendamento.status) && onAlterarStatus && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  onAlterarStatus(agendamento.id, "Aguardando");
                  onClose();
                }}
              >
                Marcar como aguardando
              </Button>
            )}

            {["Agendado", "Confirmado", "Aguardando"].includes(agendamento.status) && onAlterarStatus && (
              <Button
                size="sm"
                variant="primary"
                className="bg-brand-green hover:bg-emerald-600 text-black font-semibold"
                onClick={() => {
                  onAlterarStatus(agendamento.id, "Em atendimento");
                  onClose();
                }}
              >
                Iniciar atendimento
              </Button>
            )}

            {agendamento.status === "Em atendimento" && (
              <Link href={`/atendimentos/${agendamento.id}`} onClick={onClose}>
                <Button
                  size="sm"
                  variant="primary"
                  className="bg-brand-yellow hover:bg-amber-500 text-black font-semibold"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Concluir Lavagem
                </Button>
              </Link>
            )}

            {agendamento.status === "Concluído" && (
              <Link href={`/atendimentos/${agendamento.id}`} onClick={onClose}>
                <Button
                  size="sm"
                  variant="primary"
                  className="bg-sky-500 hover:bg-sky-600 text-white font-semibold"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Conferência & Pronto
                </Button>
              </Link>
            )}

            {["Pronto", "Aguardando retirada", "Aguardando pagamento"].includes(agendamento.status) && (
              <Link href={`/atendimentos/${agendamento.id}`} onClick={onClose}>
                <Button
                  size="sm"
                  variant="primary"
                  className="bg-brand-green hover:bg-emerald-600 text-black font-semibold"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Entregar Veículo
                </Button>
              </Link>
            )}

            {/* Ações contextuais de WhatsApp (Requisitos 7, 8, 9, 19, Etapa 11) */}
            {agendamento.status === "Aguardando" && (
              <WhatsAppButton
                phone={agendamento.cliente_whatsapp}
                templateType="appointmentWaiting"
                templateVars={templateVars}
                customerId={agendamento.cliente_id}
                appointmentId={agendamento.id}
                label="Avisar fila"
                size="sm"
                variant="secondary"
              />
            )}

            {agendamento.status === "Em atendimento" && (
              <WhatsAppButton
                phone={agendamento.cliente_whatsapp}
                templateType="appointmentInProgress"
                templateVars={templateVars}
                customerId={agendamento.cliente_id}
                appointmentId={agendamento.id}
                label="Avisar em atendimento"
                size="sm"
                variant="secondary"
              />
            )}

            {["Pronto", "Aguardando retirada"].includes(agendamento.status) && (
              <>
                <WhatsAppButton
                  phone={agendamento.cliente_whatsapp}
                  templateType="vehicleReady"
                  templateVars={templateVars}
                  customerId={agendamento.cliente_id}
                  appointmentId={agendamento.id}
                  label="Avisar pronto para retirada"
                  size="sm"
                  variant="green"
                />
                {remaining > 0 && (
                  <WhatsAppButton
                    phone={agendamento.cliente_whatsapp}
                    templateType="vehicleReadyPendingPayment"
                    templateVars={templateVars}
                    customerId={agendamento.cliente_id}
                    appointmentId={agendamento.id}
                    label="Cobrança com PIX"
                    size="sm"
                    variant="outline"
                  />
                )}
              </>
            )}

            {agendamento.status === "Entregue" && (
              <WhatsAppButton
                phone={agendamento.cliente_whatsapp}
                templateType="vehicleDelivered"
                templateVars={templateVars}
                customerId={agendamento.cliente_id}
                appointmentId={agendamento.id}
                label="Agradecer e avaliar"
                size="sm"
                variant="secondary"
              />
            )}

            {agendamento.status === "Finalizado" && (
              <>
                <WhatsAppButton
                  phone={agendamento.cliente_whatsapp}
                  templateType="appointmentCompleted"
                  templateVars={templateVars}
                  customerId={agendamento.cliente_id}
                  appointmentId={agendamento.id}
                  label="Avisar veículo pronto"
                  size="sm"
                  variant="green"
                />
                {remaining > 0 && (
                  <WhatsAppButton
                    phone={agendamento.cliente_whatsapp}
                    templateType="paymentPending"
                    templateVars={templateVars}
                    customerId={agendamento.cliente_id}
                    appointmentId={agendamento.id}
                    label="Enviar cobrança"
                    size="sm"
                    variant="outline"
                  />
                )}
              </>
            )}

            {!["Cancelado", "Finalizado", "Entregue"].includes(agendamento.status) && onAbrirCancelar && (
              <Button
                size="sm"
                variant="outline"
                className="text-red-400 hover:bg-red-500/10 border-red-500/30"
                onClick={() => {
                  onAbrirCancelar(agendamento);
                  onClose();
                }}
              >
                Cancelar
              </Button>
            )}
          </div>

          <Button size="sm" variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>

      {/* MODAL FICHA DE ENTRADA (ETAPA 10) */}
      <FichaCheckinModal
        isOpen={isFichaOpen}
        onClose={() => setIsFichaOpen(false)}
        checkin={checkin || null}
        agendamento={agendamento}
      />
    </Modal>
  );
}
