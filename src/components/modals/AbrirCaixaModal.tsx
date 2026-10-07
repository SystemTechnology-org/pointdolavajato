"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { Banknote, ShieldCheck } from "lucide-react";

interface AbrirCaixaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AbrirCaixaModal({
  isOpen,
  onClose,
  onSuccess,
}: AbrirCaixaModalProps) {
  const { openCashRegister } = useAppStore();
  const { success, error } = useToast();

  const [openingBalanceStr, setOpeningBalanceStr] = useState<string>("100.00");
  const [notes, setNotes] = useState<string>("Abertura padrão de turno");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const balance = parseFloat(openingBalanceStr.replace(",", "."));

    if (isNaN(balance) || balance < 0) {
      error("Informe um valor válido para o saldo inicial (não pode ser negativo).");
      return;
    }

    try {
      setSubmitting(true);
      await openCashRegister(balance, notes.trim() || undefined);
      success(`Caixa diário aberto com sucesso! Saldo inicial: ${formatCurrency(balance)}`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao abrir caixa.";
      error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Abertura de Caixa Diário"
      description="Inicie o controle diário de entradas, trocos e despesas operacionais"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3.5 rounded-xl bg-surface-elevated/40 border border-surface-border text-xs text-muted-foreground flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
          <span>
            Ao abrir o caixa, você estabelece o fundo de troco inicial em dinheiro físico. Todas as entradas e despesas do dia ficarão vinculadas a este registro.
          </span>
        </div>

        {/* Saldo Inicial / Fundo de Troco */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">
            Fundo de Troco Inicial (Dinheiro Físico na Gaveta) *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-semibold">
              R$
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={openingBalanceStr}
              onChange={(e) => setOpeningBalanceStr(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface border border-surface-border rounded-lg text-white font-bold text-base focus:border-brand-green focus:outline-none"
              placeholder="0,00"
              required
            />
          </div>
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-[11px] text-muted-foreground">Valores comuns:</span>
            <button
              type="button"
              onClick={() => setOpeningBalanceStr("50.00")}
              className="text-[11px] px-2 py-0.5 rounded bg-surface border border-surface-border hover:bg-surface-hover text-slate-300"
            >
              R$ 50
            </button>
            <button
              type="button"
              onClick={() => setOpeningBalanceStr("100.00")}
              className="text-[11px] px-2 py-0.5 rounded bg-surface border border-surface-border hover:bg-surface-hover text-slate-300"
            >
              R$ 100
            </button>
            <button
              type="button"
              onClick={() => setOpeningBalanceStr("150.00")}
              className="text-[11px] px-2 py-0.5 rounded bg-surface border border-surface-border hover:bg-surface-hover text-slate-300"
            >
              R$ 150
            </button>
          </div>
        </div>

        {/* Observações */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">
            Observações de Abertura (opcional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Turno da manhã, operador Carlos"
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
            leftIcon={<Banknote className="w-4 h-4" />}
          >
            Confirmar Abertura
          </Button>
        </div>
      </form>
    </Modal>
  );
}
