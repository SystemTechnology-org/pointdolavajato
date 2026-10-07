"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Agendamento } from "@/types";
import { formatCurrency, formatDateBR } from "@/lib/utils";
import { Edit2, Ban, CheckCircle2, Play, MessageSquare } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";

interface DetalhesAgendamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  agendamento: Agendamento | null;
  onEditar?: (agendamento: Agendamento) => void;
  onConfirmar?: (id: string) => void;
  onIniciarAtendimento?: (id: string) => void;
  onFinalizar?: (id: string) => void;
  onCancelar?: (id: string) => void;
}

export function DetalhesAgendamentoModal({
  isOpen,
  onClose,
  agendamento,
  onEditar,
  onConfirmar,
  onIniciarAtendimento,
  onFinalizar,
  onCancelar,
}: DetalhesAgendamentoModalProps) {
  const { getAppointmentPaymentSummary } = useAppStore();

  if (!agendamento) return null;

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detalhes do Agendamento"
      description={`Protocolo: #${agendamento.code || agendamento.id}`}
      size="md"
    >
      <div className="space-y-4 text-xs">
        {/* Topo: Status e Protocolo */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-surface-elevated border border-surface-border">
          <div>
            <span className="text-[10px] uppercase text-muted-foreground block">Status Atual</span>
            <span className="font-semibold text-white">{agendamento.status}</span>
          </div>
          <StatusBadge status={agendamento.status} />
        </div>

        {/* Detalhes do Cliente */}
        <div className="p-3.5 rounded-xl bg-surface border border-surface-border space-y-2">
          <span className="text-[11px] uppercase font-bold text-muted-foreground block">
            Dados do Cliente
          </span>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nome:</span>
            <span className="font-semibold text-white">{agendamento.cliente_nome}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">WhatsApp:</span>
            <div className="flex items-center gap-2">
              <span className="font-medium text-white">{agendamento.cliente_whatsapp}</span>
              <WhatsAppButton
                phone={agendamento.cliente_whatsapp}
                templateType="generalContact"
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

        {/* Detalhes do Veículo e Serviço */}
        <div className="p-3.5 rounded-xl bg-surface border border-surface-border space-y-2">
          <span className="text-[11px] uppercase font-bold text-muted-foreground block">
            Veículo & Serviço
          </span>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Veículo:</span>
            <span className="font-semibold text-white">
              {agendamento.veiculo_modelo} {agendamento.veiculo_placa && agendamento.veiculo_placa !== "---" ? `(${agendamento.veiculo_placa})` : ""}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Categoria:</span>
            <span className="px-2 py-0.5 rounded bg-surface-elevated text-slate-300">
              {agendamento.veiculo_tipo}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Serviço:</span>
            <span className="font-semibold text-white">{agendamento.servico_nome}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-surface-border/50">
            <span className="text-muted-foreground">Valor:</span>
            <span className="text-sm font-bold text-brand-green-text">
              {formatCurrency(agendamento.valor)}
            </span>
          </div>
        </div>

        {/* Data, Horário e Registro */}
        <div className="p-3.5 rounded-xl bg-surface border border-surface-border space-y-2">
          <span className="text-[11px] uppercase font-bold text-muted-foreground block">
            Agendamento
          </span>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Data:</span>
            <span className="font-bold text-brand-yellow-text">{formatDateBR(agendamento.data)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Horário:</span>
            <span className="font-bold text-brand-yellow-text">{agendamento.horario}</span>
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground pt-1 border-t border-surface-border/50">
            <span>Criado em:</span>
            <span>{new Date(agendamento.created_at).toLocaleString("pt-BR")}</span>
          </div>
          {agendamento.duracao_real_minutos && (
            <div className="flex justify-between text-[11px] text-emerald-400 font-medium">
              <span>Duração real:</span>
              <span>{agendamento.duracao_real_minutos} minutos</span>
            </div>
          )}
        </div>

        {/* Motivo do Cancelamento */}
        {agendamento.cancellation_reason && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-[11px]">
            <span className="font-semibold block mb-0.5">Motivo do cancelamento:</span>
            <p>{agendamento.cancellation_reason}</p>
          </div>
        )}

        {/* Observações */}
        {agendamento.observacoes && (
          <div className="p-3 rounded-xl bg-surface-elevated/40 border border-surface-border text-[11px]">
            <span className="font-semibold text-slate-300 block mb-0.5">Observações:</span>
            <p className="text-muted-foreground">{agendamento.observacoes}</p>
          </div>
        )}

        {/* COMUNICAÇÃO VIA WHATSAPP (Requisitos 4, 5, 6, 8, 9, 18) */}
        <div className="p-3.5 rounded-xl bg-surface border border-surface-border space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-brand-green" />
              <span>Ações de WhatsApp</span>
            </span>
            <WhatsAppButton
              phone={agendamento.cliente_whatsapp}
              templateType="generalContact"
              templateVars={templateVars}
              customerId={agendamento.cliente_id}
              appointmentId={agendamento.id}
              label="Contato Direto"
              size="xs"
              variant="secondary"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {["Agendado", "Confirmado"].includes(agendamento.status) && (
              <>
                <WhatsAppButton
                  phone={agendamento.cliente_whatsapp}
                  templateType="appointmentConfirmation"
                  templateVars={templateVars}
                  customerId={agendamento.cliente_id}
                  appointmentId={agendamento.id}
                  label="Enviar confirmação"
                  size="sm"
                  variant="green"
                />
                <WhatsAppButton
                  phone={agendamento.cliente_whatsapp}
                  templateType="appointmentReminder"
                  templateVars={templateVars}
                  customerId={agendamento.cliente_id}
                  appointmentId={agendamento.id}
                  label="Enviar lembrete"
                  size="sm"
                  variant="outline"
                />
              </>
            )}

            {agendamento.status === "Aguardando" && (
              <WhatsAppButton
                phone={agendamento.cliente_whatsapp}
                templateType="appointmentWaiting"
                templateVars={templateVars}
                customerId={agendamento.cliente_id}
                appointmentId={agendamento.id}
                label="Avisar fila de espera"
                size="sm"
                variant="green"
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
                variant="green"
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
                  label="Enviar aviso de conclusão"
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
                    label={`Enviar cobrança (${formatCurrency(remaining)})`}
                    size="sm"
                    variant="outline"
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Ações Rápidas de Acordo com o Status (Requisito 25) */}
        <div className="pt-2 border-t border-surface-border flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {agendamento.status === "Agendado" && onConfirmar && (
              <Button
                size="sm"
                variant="primary"
                className="text-xs"
                onClick={() => {
                  onConfirmar(agendamento.id);
                  onClose();
                }}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Confirmar
              </Button>
            )}

            {["Agendado", "Confirmado", "Aguardando"].includes(agendamento.status) && onIniciarAtendimento && (
              <Button
                size="sm"
                variant="secondary"
                className="text-xs"
                onClick={() => {
                  onIniciarAtendimento(agendamento.id);
                  onClose();
                }}
              >
                <Play className="w-3.5 h-3.5 mr-1 fill-current" />
                Iniciar atendimento
              </Button>
            )}

            {agendamento.status === "Em atendimento" && onFinalizar && (
              <Button
                size="sm"
                variant="primary"
                className="text-xs bg-emerald-600 hover:bg-emerald-700"
                onClick={() => {
                  onFinalizar(agendamento.id);
                  onClose();
                }}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Finalizar atendimento
              </Button>
            )}

            {!["Cancelado", "Finalizado"].includes(agendamento.status) && onCancelar && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs text-red-400 hover:text-red-300 border-red-500/30 hover:bg-red-500/10"
                onClick={() => {
                  onCancelar(agendamento.id);
                  onClose();
                }}
              >
                <Ban className="w-3.5 h-3.5 mr-1" />
                Cancelar
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onEditar && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => {
                  onEditar(agendamento);
                  onClose();
                }}
              >
                <Edit2 className="w-3.5 h-3.5 mr-1" />
                Editar
              </Button>
            )}

            <Button size="sm" variant="ghost" className="text-xs" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
