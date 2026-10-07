"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store";
import { Agendamento, PaymentMethod, PAYMENT_METHOD_LABELS } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import {
  DollarSign,
  QrCode,
  CreditCard,
  Banknote,
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCcw,
} from "lucide-react";

interface RegistrarPagamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  agendamento: Agendamento | null;
  onSuccess?: () => void;
}

export function RegistrarPagamentoModal({
  isOpen,
  onClose,
  agendamento,
  onSuccess,
}: RegistrarPagamentoModalProps) {
  const {
    getAppointmentPaymentSummary,
    addPayment,
    cancelPayment,
    activeCashRegister,
  } = useAppStore();

  const { success, error } = useToast();

  const [amountStr, setAmountStr] = useState<string>("");
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [cancellingPaymentId, setCancellingPaymentId] = useState<string | null>(null);

  const summary = agendamento
    ? getAppointmentPaymentSummary(agendamento.id)
    : null;

  const remainingBalance = summary?.remainingBalance;

  // Ao abrir o modal, preencher automaticamente o campo com o saldo restante
  useEffect(() => {
    if (remainingBalance !== undefined) {
      setAmountStr(remainingBalance.toFixed(2));
      setNotes("");
      setMethod("pix");
    }
  }, [agendamento?.id, remainingBalance]);


  if (!agendamento || !summary) return null;

  const remaining = summary.remainingBalance;
  const isPaidOff = summary.status === "paid";

  const handlePagarTotal = () => {
    setAmountStr(remaining.toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amountStr.replace(",", "."));

    if (isNaN(val) || val <= 0) {
      error("Informe um valor válido e maior que zero.");
      return;
    }

    if (val > remaining + 0.01) {
      error(`O valor não pode ultrapassar o saldo restante de ${formatCurrency(remaining)}.`);
      return;
    }

    try {
      setSubmitting(true);
      await addPayment({
        appointment_id: agendamento.id,
        amount: val,
        payment_method: method,
        notes: notes.trim() || undefined,
      });

      success(`Pagamento de ${formatCurrency(val)} via ${PAYMENT_METHOD_LABELS[method]} registrado com sucesso!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao registrar pagamento.";
      error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEstornarPagamento = async (paymentId: string) => {
    const motivo = window.prompt("Motivo do cancelamento / estorno:");
    if (motivo === null) return; // cancelou o prompt

    try {
      setCancellingPaymentId(paymentId);
      await cancelPayment(paymentId, motivo.trim() || "Estorno operacional");
      success("Pagamento estornado com sucesso!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao estornar pagamento.";
      error(msg);
    } finally {
      setCancellingPaymentId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Pagamento"
      description={`Atendimento #${agendamento.code || agendamento.id.slice(-6).toUpperCase()}`}
      size="md"
    >
      <div className="space-y-5">
        {/* Resumo do Atendimento e Valores */}
        <div className="p-4 rounded-xl bg-surface-elevated/40 border border-surface-border space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-surface-border/50 text-xs">
            <div>
              <span className="text-muted-foreground">Cliente: </span>
              <span className="font-semibold text-white">{agendamento.cliente_nome}</span>
            </div>
            <div>
              <span className="font-mono text-brand-yellow-text">
                {agendamento.veiculo_modelo} ({agendamento.veiculo_placa})
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="p-2 rounded-lg bg-surface border border-surface-border">
              <span className="text-[10px] text-muted-foreground block uppercase">
                Total Serviço
              </span>
              <span className="text-sm font-bold text-white">
                {formatCurrency(agendamento.valor)}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-surface border border-surface-border">
              <span className="text-[10px] text-muted-foreground block uppercase">
                Já Recebido
              </span>
              <span className="text-sm font-bold text-brand-green-text">
                {formatCurrency(summary.totalPaid)}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-surface border border-surface-border">
              <span className="text-[10px] text-muted-foreground block uppercase">
                Saldo Pendente
              </span>
              <span
                className={`text-sm font-bold ${
                  remaining > 0 ? "text-amber-400" : "text-brand-green-text"
                }`}
              >
                {formatCurrency(remaining)}
              </span>
            </div>
          </div>
        </div>

        {/* Se já estiver 100% quitado */}
        {isPaidOff ? (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">
              Atendimento Totalmente Quitado
            </h4>
            <p className="text-xs text-muted-foreground">
              Não há saldo pendente para este atendimento.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Método de Pagamento */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Forma de Pagamento *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setMethod("pix")}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all ${
                    method === "pix"
                      ? "bg-brand-green/20 border-brand-green text-brand-green-text font-bold"
                      : "bg-surface border-surface-border text-slate-300 hover:bg-surface-hover"
                  }`}
                >
                  <QrCode className="w-4 h-4 text-emerald-400" />
                  <span>PIX</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod("dinheiro")}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all ${
                    method === "dinheiro"
                      ? "bg-brand-green/20 border-brand-green text-brand-green-text font-bold"
                      : "bg-surface border-surface-border text-slate-300 hover:bg-surface-hover"
                  }`}
                >
                  <Banknote className="w-4 h-4 text-emerald-400" />
                  <span>Dinheiro</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod("debito")}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all ${
                    method === "debito"
                      ? "bg-brand-green/20 border-brand-green text-brand-green-text font-bold"
                      : "bg-surface border-surface-border text-slate-300 hover:bg-surface-hover"
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-sky-400" />
                  <span>Débito</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod("credito")}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all ${
                    method === "credito"
                      ? "bg-brand-green/20 border-brand-green text-brand-green-text font-bold"
                      : "bg-surface border-surface-border text-slate-300 hover:bg-surface-hover"
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <span>Crédito</span>
                </button>
              </div>

              {/* Aviso amigável sobre integração com Caixa */}
              {activeCashRegister ? (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-green" />
                  <span>O valor será integrado automaticamente ao Caixa Diário aberto.</span>
                </p>
              ) : (
                <p className="text-[11px] text-amber-400/90 flex items-center gap-1.5 pt-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Caixa diário fechado. O pagamento será registrado no financeiro geral.</span>
                </p>
              )}
            </div>

            {/* Valor do Pagamento */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Valor a Pagar (R$) *
                </label>
                {remaining > 0 && (
                  <button
                    type="button"
                    onClick={handlePagarTotal}
                    className="text-[11px] text-brand-green hover:underline font-medium"
                  >
                    Quitar valor restante ({formatCurrency(remaining)})
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-semibold">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={remaining}
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-surface border border-surface-border rounded-lg text-white font-bold text-base focus:border-brand-green focus:outline-none"
                  placeholder="0,00"
                  required
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Suporta pagamentos parciais (ex: entrada em dinheiro e restante no PIX).
              </p>
            </div>

            {/* Observações */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Observações / Detalhes (opcional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Pago pelo filho do cliente, comprovante conferido"
                className="w-full px-3 py-2 bg-surface border border-surface-border rounded-lg text-xs text-white focus:border-brand-green focus:outline-none"
              />
            </div>

            {/* Botões do Formulário */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border/60">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={submitting}
                className="bg-brand-green hover:bg-emerald-600 text-black font-bold"
                leftIcon={<DollarSign className="w-4 h-4" />}
              >
                Confirmar Recebimento
              </Button>
            </div>
          </form>
        )}

        {/* Histórico de Pagamentos Deste Atendimento */}
        {summary.payments.length > 0 && (
          <div className="pt-3 border-t border-surface-border/60 space-y-2">
            <h5 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Transações Registradas ({summary.payments.length})</span>
            </h5>

            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {summary.payments.map((p) => {
                const isCancelled = p.status === "cancelled";
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                      isCancelled
                        ? "bg-red-500/5 border-red-500/20 opacity-70"
                        : "bg-surface border-surface-border"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">
                          {formatCurrency(p.amount)}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold bg-surface-elevated text-slate-300">
                          {PAYMENT_METHOD_LABELS[p.payment_method]}
                        </span>
                        {isCancelled && (
                          <span className="text-[10px] text-red-400 font-semibold">
                            (Estornado)
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(p.paid_at).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {p.notes && ` • ${p.notes}`}
                      </span>
                    </div>

                    {!isCancelled && (
                      <button
                        type="button"
                        onClick={() => handleEstornarPagamento(p.id)}
                        disabled={cancellingPaymentId === p.id}
                        className="text-[11px] text-red-400 hover:text-red-300 hover:underline flex items-center gap-1 p-1"
                        title="Estornar / Cancelar este pagamento"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Estornar</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
