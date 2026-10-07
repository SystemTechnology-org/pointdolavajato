"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  DollarSign,
  Star,
  ShieldAlert,
  User,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAppStore } from "@/lib/store";
import { Agendamento } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface EntregaVeiculoModalProps {
  isOpen: boolean;
  onClose: () => void;
  agendamento: Agendamento;
  onOpenPagamento?: () => void;
  onOpenComprovante?: () => void;
  onSuccess?: () => void;
}

export function EntregaVeiculoModal({
  isOpen,
  onClose,
  agendamento,
  onOpenPagamento,
  onOpenComprovante,
  onSuccess,
}: EntregaVeiculoModalProps) {
  const {
    entregarVeiculo,
    getAppointmentPaymentSummary,
    hasCurrentUserPermission,
    isCurrentUserAdmin,
    isCurrentUserManager,
  } = useAppStore();

  const { success, error } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [responsavel, setResponsavel] = useState<string>("Recepcionista");
  const [rating, setRating] = useState<number>(5);
  const [feedback, setFeedback] = useState<string>("");
  const [overridePayment, setOverridePayment] = useState<boolean>(false);
  const [overrideReason, setOverrideReason] = useState<string>("");

  const paySummary = getAppointmentPaymentSummary(agendamento.id);
  const temSaldoPendente = paySummary.remainingBalance > 0.01;

  // Permissão para liberar entrega sem pagamento total
  const canOverride =
    isCurrentUserAdmin ||
    isCurrentUserManager ||
    hasCurrentUserPermission("payment.override");

  const handleConfirmarEntrega = async () => {
    if (agendamento.status === "Entregue") {
      error("Este veículo já foi entregue anteriormente!");
      onClose();
      return;
    }

    if (temSaldoPendente && !overridePayment) {
      error("Pagamento pendente! Registre o pagamento antes de realizar a entrega.");
      return;
    }

    if (temSaldoPendente && overridePayment && !overrideReason.trim()) {
      error("Informe a justificativa da liberação com pendência financeira.");
      return;
    }

    try {
      setIsLoading(true);

      await entregarVeiculo(agendamento.id, {
        delivered_by_name: responsavel.trim() || "Recepcionista",
        rating: rating > 0 ? rating : undefined,
        feedback: feedback.trim() || undefined,
        overridePayment: temSaldoPendente ? overridePayment : false,
        overrideReason: temSaldoPendente && overridePayment ? overrideReason.trim() : undefined,
      });

      success("Veículo entregue com sucesso! Atendimento concluído operacionalmente.");
      onSuccess?.();
      onClose();
      onOpenComprovante?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao registrar entrega.";
      error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Entrega do Veículo (Checkout Operacional)"
      size="md"
    >
      <div className="space-y-5">
        {/* Resumo do Veículo e Cliente */}
        <div className="p-4 rounded-xl bg-surface-elevated/40 border border-surface-border space-y-2.5 text-xs">
          <div className="flex items-center justify-between border-b border-surface-border/60 pb-2">
            <span className="text-muted-foreground">Veículo:</span>
            <span className="font-bold text-white text-sm">
              {agendamento.veiculo_modelo} {agendamento.veiculo_placa && agendamento.veiculo_placa !== "---" && `(${agendamento.veiculo_placa})`}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-surface-border/60 pb-2">
            <span className="text-muted-foreground">Cliente:</span>
            <span className="font-semibold text-white">{agendamento.cliente_nome}</span>
          </div>

          <div className="flex items-center justify-between border-b border-surface-border/60 pb-2">
            <span className="text-muted-foreground">Serviço Realizado:</span>
            <span className="font-semibold text-brand-green-text">{agendamento.servico_nome}</span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-muted-foreground">Conferência de Saída:</span>
            <span
              className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                agendamento.checkout_checklist &&
                Object.values(agendamento.checkout_checklist).filter(Boolean).length >= 5
                  ? "bg-brand-green/20 text-brand-green-text"
                  : "bg-amber-500/20 text-amber-300"
              }`}
            >
              {agendamento.checkout_checklist
                ? `${Object.values(agendamento.checkout_checklist).filter(Boolean).length} itens conferidos`
                : "Inspeção rápida"}
            </span>
          </div>
        </div>

        {/* Resumo Financeiro */}
        <div className="p-3.5 rounded-xl bg-surface-elevated/60 border border-surface-border space-y-2 text-xs">
          <div className="flex items-center justify-between font-medium">
            <span className="text-muted-foreground">Valor Total do Atendimento:</span>
            <span className="text-white font-bold">{formatCurrency(agendamento.valor)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Valor Já Quitado:</span>
            <span className="text-brand-green-text font-bold">{formatCurrency(paySummary.totalPaid)}</span>
          </div>

          <div className="flex items-center justify-between pt-1.5 border-t border-surface-border font-bold">
            <span className="text-slate-300">Saldo Pendente:</span>
            <span
              className={`text-sm ${
                temSaldoPendente ? "text-rose-400" : "text-brand-green-text"
              }`}
            >
              {formatCurrency(paySummary.remainingBalance)}
            </span>
          </div>
        </div>

        {/* ALERTA DE PENDÊNCIA FINANCEIRA */}
        {temSaldoPendente && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-3">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-rose-300">
                  Atenção: Saldo Pendente de {formatCurrency(paySummary.remainingBalance)}!
                </p>
                <p className="text-slate-300 leading-relaxed">
                  O veículo ainda não está 100% quitado. Registre o recebimento antes de liberar a saída.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {onOpenPagamento && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onOpenPagamento();
                  }}
                  leftIcon={<DollarSign className="w-4 h-4 text-brand-green" />}
                  className="text-xs border-brand-green/40 hover:bg-brand-green/10 text-white"
                >
                  Registrar Pagamento Agora
                </Button>
              )}

              {canOverride ? (
                <div className="w-full pt-2 border-t border-rose-500/20 space-y-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-amber-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overridePayment}
                      onChange={(e) => setOverridePayment(e.target.checked)}
                      className="rounded border-rose-500 text-rose-600 focus:ring-0 w-4 h-4"
                    />
                    Autorizar liberação do veículo mesmo com pendência (Exceção)
                  </label>

                  {overridePayment && (
                    <input
                      type="text"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="Justificativa obrigatória (ex: Cliente mensal, autorização do dono...)"
                      className="w-full h-9 px-3 rounded-lg bg-surface border border-rose-500/40 text-white text-xs placeholder:text-muted focus:outline-none"
                    />
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-rose-400 font-medium italic">
                  Apenas gerentes e administradores podem liberar saída com pendência financeira.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Responsável pela Entrega */}
        <div className="space-y-1.5 text-xs">
          <label className="font-semibold text-slate-300 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            Responsável pela Entrega ao Cliente:
          </label>
          <input
            type="text"
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
            placeholder="Nome do funcionário ou recepcionista"
            className="w-full h-9 px-3 rounded-xl bg-surface-elevated border border-surface-border text-white text-xs placeholder:text-muted focus:border-brand-green focus:outline-none transition-colors"
          />
        </div>

        {/* Avaliação Rápida do Cliente (1 a 5 estrelas) */}
        <div className="p-3.5 rounded-xl bg-surface-elevated/40 border border-surface-border space-y-2.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Avaliação do Cliente (Opcional):</span>
            <span className="text-brand-yellow font-bold text-xs">
              {rating === 5 && "Excelente ⭐⭐⭐⭐⭐"}
              {rating === 4 && "Muito Bom ⭐⭐⭐⭐"}
              {rating === 3 && "Regular ⭐⭐⭐"}
              {rating === 2 && "Ruim ⭐⭐"}
              {rating === 1 && "Péssimo ⭐"}
            </span>
          </label>

          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="p-1 rounded-lg hover:bg-surface-elevated transition-colors"
              >
                <Star
                  className={`w-5 h-5 ${
                    star <= rating
                      ? "text-brand-yellow fill-brand-yellow"
                      : "text-slate-600"
                  }`}
                />
              </button>
            ))}
          </div>

          <input
            type="text"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Feedback do cliente (ex: Gostou muito do brilho das rodas)"
            className="w-full h-8 px-3 rounded-lg bg-surface border border-surface-border text-white text-xs placeholder:text-muted focus:border-brand-green focus:outline-none transition-colors"
          />
        </div>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-surface-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            Voltar
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleConfirmarEntrega}
              isLoading={isLoading}
              disabled={temSaldoPendente && !overridePayment}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
              className="flex-1 sm:flex-none bg-brand-green hover:bg-emerald-600 text-black font-bold shadow-lg shadow-brand-green/20"
            >
              Confirmar Entrega do Veículo
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
