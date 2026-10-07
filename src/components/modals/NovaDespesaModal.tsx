"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store";
import {
  EXPENSE_CATEGORIES,
  PaymentMethod,
  PAYMENT_METHOD_LABELS,
} from "@/types";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { TrendingDown } from "lucide-react";

interface NovaDespesaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function NovaDespesaModal({
  isOpen,
  onClose,
  onSuccess,
}: NovaDespesaModalProps) {
  const { addCashExpense, activeCashRegister } = useAppStore();
  const { success, error } = useToast();

  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [amountStr, setAmountStr] = useState<string>("");
  const [method, setMethod] = useState<PaymentMethod>("dinheiro");
  const [description, setDescription] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amountStr.replace(",", "."));

    if (isNaN(val) || val <= 0) {
      error("Informe um valor válido e maior que zero para a despesa.");
      return;
    }

    if (!activeCashRegister) {
      error("Não há caixa aberto no momento para lançar saídas.");
      return;
    }

    try {
      setSubmitting(true);
      await addCashExpense({
        category,
        amount: val,
        payment_method: method,
        description: description.trim() || undefined,
      });

      success(`Despesa de ${formatCurrency(val)} lançada com sucesso no caixa!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao lançar despesa.";
      error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Despesa / Saída de Caixa"
      description="Lançamento operacional de compras, insumos, sangrias ou manutenção"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Categoria */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">
            Categoria da Despesa *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-surface-border rounded-lg text-xs text-white focus:border-brand-green focus:outline-none"
            required
          >
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Valor da Despesa */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">
            Valor da Saída (R$) *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-semibold">
              R$
            </span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface border border-surface-border rounded-lg text-white font-bold text-base focus:border-brand-green focus:outline-none"
              placeholder="0,00"
              required
            />
          </div>
        </div>

        {/* Forma de Pagamento / Saída */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">
            Origem do Pagamento *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(["dinheiro", "pix"] as PaymentMethod[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`py-2 px-3 rounded-lg border text-xs font-medium text-center transition-all ${
                  method === m
                    ? "bg-brand-green/20 border-brand-green text-brand-green-text font-bold"
                    : "bg-surface border-surface-border text-slate-300 hover:bg-surface-hover"
                }`}
              >
                {PAYMENT_METHOD_LABELS[m]}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Saídas em dinheiro abatem diretamente o valor físico da gaveta do caixa.
          </p>
        </div>

        {/* Descrição / Justificativa */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">
            Descrição / Fornecedor (opcional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Compra de 2 pretinhos para pneus na casa do óleo"
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
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={submitting}
            className="bg-brand-green hover:bg-emerald-600 text-black font-bold"
            leftIcon={<TrendingDown className="w-4 h-4" />}
          >
            Confirmar Despesa
          </Button>
        </div>
      </form>
    </Modal>
  );
}
