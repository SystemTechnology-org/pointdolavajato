"use client";

import React, { useState, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import {
  Lock,
  CheckCircle2,
  AlertTriangle,
  Banknote,
  QrCode,
  CreditCard,
  Calculator,
} from "lucide-react";

interface FecharCaixaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function FecharCaixaModal({
  isOpen,
  onClose,
  onSuccess,
}: FecharCaixaModalProps) {
  const { activeCashRegister, cashMovements, closeCashRegister } = useAppStore();
  const { success, error } = useToast();

  const [countedBalanceStr, setCountedBalanceStr] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Movimentações do caixa ativo
  const {
    cashIncome,
    cashExpenses,
    cashReversals,
    expectedCash,
    pixTotal,
    cardTotal,
  } = useMemo(() => {
    if (!activeCashRegister) {
      return {
        cashIncome: 0,
        cashExpenses: 0,
        cashReversals: 0,
        expectedCash: 0,
        pixTotal: 0,
        cardTotal: 0,
      };
    }

    const regId = activeCashRegister.id;
    const regMovements = cashMovements.filter((m) => m.cash_register_id === regId);

    const cIncome = regMovements
      .filter((m) => m.type === "income" && m.payment_method === "dinheiro")
      .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

    const cExpenses = regMovements
      .filter((m) => m.type === "expense" && m.payment_method === "dinheiro")
      .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

    const cReversals = regMovements
      .filter((m) => m.type === "reversal" && m.payment_method === "dinheiro")
      .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

    const exp =
      Number(activeCashRegister.opening_balance) +
      cIncome -
      cExpenses -
      cReversals;

    const pTotal = regMovements
      .filter((m) => m.type === "income" && m.payment_method === "pix")
      .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

    const crdTotal = regMovements
      .filter((m) => m.type === "income" && ["debito", "credito"].includes(m.payment_method))
      .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

    return {
      cashIncome: cIncome,
      cashExpenses: cExpenses,
      cashReversals: cReversals,
      expectedCash: exp,
      pixTotal: pTotal,
      cardTotal: crdTotal,
    };
  }, [activeCashRegister, cashMovements]);

  // Inicializar o campo de dinheiro contado com o esperado se estiver vazio
  React.useEffect(() => {
    if (expectedCash !== undefined && countedBalanceStr === "") {
      setCountedBalanceStr(expectedCash.toFixed(2));
    }
  }, [expectedCash, countedBalanceStr]);

  if (!activeCashRegister) return null;

  const counted = parseFloat(countedBalanceStr.replace(",", ".")) || 0;
  const difference = Number((counted - expectedCash).toFixed(2));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(counted) || counted < 0) {
      error("Informe o valor em dinheiro físico contado na gaveta.");
      return;
    }

    try {
      setSubmitting(true);
      await closeCashRegister(counted, notes.trim() || undefined);
      success("Caixa diário fechado com sucesso!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao fechar caixa.";
      error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Fechamento do Caixa Diário"
      description={`Caixa iniciado em ${new Date(activeCashRegister.opened_at).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Painel de Conciliação em Dinheiro Físico */}
        <div className="p-4 rounded-xl bg-surface-elevated/40 border border-surface-border space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-surface-border/50 text-xs">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-emerald-400" />
              <span>Conferência de Dinheiro Físico na Gaveta</span>
            </span>
            <span className="text-[11px] text-muted-foreground">Moeda e Cédula</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2 rounded-lg bg-surface border border-surface-border">
              <span className="text-[10px] text-muted-foreground block">Fundo Inicial</span>
              <span className="font-semibold text-white">
                {formatCurrency(activeCashRegister.opening_balance)}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-surface border border-surface-border">
              <span className="text-[10px] text-muted-foreground block">Entradas (+)</span>
              <span className="font-semibold text-brand-green-text">
                +{formatCurrency(cashIncome)}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-surface border border-surface-border">
              <span className="text-[10px] text-muted-foreground block">Despesas / Saídas (-)</span>
              <span className="font-semibold text-red-400">
                -{formatCurrency(cashExpenses + cashReversals)}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-surface-elevated border border-brand-green/30">
              <span className="text-[10px] text-brand-green-text font-bold block">
                Saldo Esperado
              </span>
              <span className="text-sm font-bold text-white">
                {formatCurrency(expectedCash)}
              </span>
            </div>
          </div>
        </div>

        {/* Resumo de Outros Métodos (PIX e Cartões) para Conferência de Extratos */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-lg bg-surface border border-surface-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="font-medium text-white block">PIX Recebido</span>
                <span className="text-[10px] text-muted-foreground">Conferir extrato bancário</span>
              </div>
            </div>
            <span className="font-bold text-white text-sm">
              {formatCurrency(pixTotal)}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-surface border border-surface-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-sky-400" />
              <div>
                <span className="font-medium text-white block">Cartões (Débito/Crédito)</span>
                <span className="text-[10px] text-muted-foreground">Conferir maquininhas</span>
              </div>
            </div>
            <span className="font-bold text-white text-sm">
              {formatCurrency(cardTotal)}
            </span>
          </div>
        </div>

        {/* Campo de Dinheiro Contado */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Dinheiro Físico Contado na Gaveta (R$) *</span>
            </label>
            <button
              type="button"
              onClick={() => setCountedBalanceStr(expectedCash.toFixed(2))}
              className="text-[11px] text-brand-green hover:underline font-medium"
            >
              Usar valor esperado ({formatCurrency(expectedCash)})
            </button>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-semibold">
              R$
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={countedBalanceStr}
              onChange={(e) => setCountedBalanceStr(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-surface border border-surface-border rounded-lg text-white font-bold text-lg focus:border-brand-green focus:outline-none"
              placeholder="0,00"
              required
            />
          </div>
        </div>

        {/* Indicador de Diferença / Conciliação Cega */}
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            difference === 0
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : difference > 0
              ? "bg-sky-500/10 border-sky-500/30 text-sky-300"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {difference === 0 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            )}
            <div>
              <span className="font-bold block">
                {difference === 0
                  ? "Conferência Exata"
                  : difference > 0
                  ? "Sobra de Caixa Identificada"
                  : "Falta de Caixa Identificada"}
              </span>
              <span className="text-[11px] opacity-80">
                {difference === 0
                  ? "O dinheiro físico na gaveta confere exatamente com as movimentações registradas."
                  : difference > 0
                  ? `Há ${formatCurrency(difference)} a mais do que o calculado pelo sistema.`
                  : `Faltam ${formatCurrency(Math.abs(difference))} em relação ao calculado pelo sistema.`}
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-base font-mono font-bold">
              {difference > 0 ? `+${formatCurrency(difference)}` : formatCurrency(difference)}
            </span>
          </div>
        </div>

        {/* Observações de Fechamento */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">
            Observações de Fechamento (opcional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Turno encerrado normalmente, sangria de R$ 300 realizada para o cofre"
            className="w-full px-3 py-2 bg-surface border border-surface-border rounded-lg text-xs text-white focus:border-brand-green focus:outline-none"
          />
        </div>

        {/* Botões */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border/60">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={submitting}
          >
            Voltar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={submitting}
            className="bg-brand-green hover:bg-emerald-600 text-black font-bold"
            leftIcon={<Lock className="w-4 h-4" />}
          >
            Confirmar e Fechar Caixa
          </Button>
        </div>
      </form>
    </Modal>
  );
}
