"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import {
  Wallet,
  Lock,
  Plus,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  Banknote,
  QrCode,
  CreditCard,
  RotateCcw,
  Calendar,
} from "lucide-react";
import { PAYMENT_METHOD_LABELS } from "@/types";

import { AbrirCaixaModal } from "@/components/modals/AbrirCaixaModal";
import { FecharCaixaModal } from "@/components/modals/FecharCaixaModal";
import { NovaDespesaModal } from "@/components/modals/NovaDespesaModal";

export default function CaixaPage() {
  const { activeCashRegister, cashMovements } = useAppStore();

  const [isAbrirModalOpen, setIsAbrirModalOpen] = useState(false);
  const [isFecharModalOpen, setIsFecharModalOpen] = useState(false);
  const [isNovaDespesaOpen, setIsNovaDespesaOpen] = useState(false);

  // Movimentações do caixa atualmente aberto
  const currentMovements = useMemo(() => {
    if (!activeCashRegister) return [];
    return cashMovements
      .filter((m) => m.cash_register_id === activeCashRegister.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [activeCashRegister, cashMovements]);

  // Cálculos do caixa aberto
  const {
    cashIncome,
    cashExpenses,
    cashReversals,
    currentCashDrawer,
    pixTotal,
    cardTotal,
  } = useMemo(() => {
    if (!activeCashRegister) {
      return {
        cashIncome: 0,
        cashExpenses: 0,
        cashReversals: 0,
        currentCashDrawer: 0,
        pixTotal: 0,
        cardTotal: 0,
      };
    }

    const cIncome = currentMovements
      .filter((m) => m.type === "income" && m.payment_method === "dinheiro")
      .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

    const cExpenses = currentMovements
      .filter((m) => m.type === "expense" && m.payment_method === "dinheiro")
      .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

    const cReversals = currentMovements
      .filter((m) => m.type === "reversal" && m.payment_method === "dinheiro")
      .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

    const drawer =
      Number(activeCashRegister.opening_balance) +
      cIncome -
      cExpenses -
      cReversals;

    const pTotal = currentMovements
      .filter((m) => m.type === "income" && m.payment_method === "pix")
      .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

    const crdTotal = currentMovements
      .filter((m) => m.type === "income" && ["debito", "credito"].includes(m.payment_method))
      .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

    return {
      cashIncome: cIncome,
      cashExpenses: cExpenses,
      cashReversals: cReversals,
      currentCashDrawer: drawer,
      pixTotal: pTotal,
      cardTotal: crdTotal,
    };
  }, [activeCashRegister, currentMovements]);

  return (
    <div className="space-y-6">
      {/* 1. TOPO: TÍTULO, STATUS E ATALHOS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-surface-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Controle de Caixa Diário
            </h2>
            {activeCashRegister ? (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full bg-brand-green/20 text-brand-green-text border border-brand-green/30 font-semibold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-brand-green"></span>
                Caixa Aberto
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full bg-surface-elevated text-slate-400 border border-surface-border font-medium">
                <Lock className="w-3 h-3" />
                Caixa Fechado
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Abertura, conciliação e fechamento de caixa do dia.
          </p>
        </div>

        {/* Botões do Topo */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/caixa/historico">
            <Button
              size="sm"
              variant="outline"
              className="h-9 border-surface-border text-slate-300 hover:text-white"
              leftIcon={<History className="w-4 h-4" />}
            >
              Histórico de Caixas
            </Button>
          </Link>

          {activeCashRegister ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsNovaDespesaOpen(true)}
                className="h-9 border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Registrar Despesa
              </Button>

              <Button
                size="sm"
                variant="primary"
                onClick={() => setIsFecharModalOpen(true)}
                className="h-9 bg-brand-green hover:bg-emerald-600 text-black font-bold"
                leftIcon={<Lock className="w-4 h-4" />}
              >
                Fechar Caixa
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsAbrirModalOpen(true)}
              className="h-9 bg-brand-green hover:bg-emerald-600 text-black font-bold shadow-lg shadow-brand-green/20"
              leftIcon={<Wallet className="w-4 h-4" />}
            >
              Abrir Caixa Diário
            </Button>
          )}
        </div>
      </div>

      {/* 2. CONTEÚDO PRINCIPAL: QUANDO CAIXA ESTIVER FECHADO */}
      {!activeCashRegister ? (
        <div className="p-8 rounded-2xl bg-surface border border-surface-border text-center max-w-xl mx-auto space-y-4 my-6">
          <div className="w-16 h-16 rounded-2xl bg-brand-green/10 text-brand-green border border-brand-green/20 flex items-center justify-center mx-auto shadow-inner">
            <Wallet className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">
              Nenhum Caixa Aberto no Momento
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Inicie a rotina operacional abrindo o caixa. Você poderá informar o fundo de troco inicial em dinheiro e registrar entradas e sangrias com conciliação automática.
            </p>
          </div>

          <div className="pt-2">
            <Button
              size="md"
              variant="primary"
              onClick={() => setIsAbrirModalOpen(true)}
              className="bg-brand-green hover:bg-emerald-600 text-black font-bold px-6 shadow-lg shadow-brand-green/20"
              leftIcon={<Wallet className="w-4 h-4" />}
            >
              Abrir Caixa Agora
            </Button>
          </div>
        </div>
      ) : (
        /* 3. CONTEÚDO PRINCIPAL: QUANDO CAIXA ESTIVER ABERTO */
        <div className="space-y-6">
          {/* Dados de Abertura */}
          <div className="p-3.5 rounded-xl bg-surface-elevated/40 border border-surface-border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-green" />
              <span className="text-muted-foreground">Iniciado em:</span>
              <span className="font-semibold text-white">
                {new Date(activeCashRegister.opened_at).toLocaleString("pt-BR", {
                  dateStyle: "full",
                  timeStyle: "short",
                })}
              </span>
            </div>

            {activeCashRegister.notes && (
              <span className="text-slate-400 italic">
                &quot;{activeCashRegister.notes}&quot;
              </span>
            )}
          </div>

          {/* Cards de Resumo do Dinheiro Físico (Gaveta) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Saldo Inicial */}
            <div className="p-4 rounded-xl bg-surface border border-surface-border space-y-1">
              <span className="text-xs text-muted-foreground">Fundo Inicial (Troco)</span>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(activeCashRegister.opening_balance)}
              </div>
              <p className="text-[11px] text-muted-foreground">Valor na abertura da gaveta</p>
            </div>

            {/* Entradas em Dinheiro */}
            <div className="p-4 rounded-xl bg-surface border border-surface-border space-y-1">
              <span className="text-xs text-muted-foreground">Entradas em Dinheiro (+)</span>
              <div className="text-2xl font-bold text-brand-green-text">
                +{formatCurrency(cashIncome)}
              </div>
              <p className="text-[11px] text-muted-foreground">Recebido em mãos hoje</p>
            </div>

            {/* Despesas em Dinheiro */}
            <div className="p-4 rounded-xl bg-surface border border-surface-border space-y-1">
              <span className="text-xs text-muted-foreground">Saídas e Despesas (-)</span>
              <div className="text-2xl font-bold text-red-400">
                -{formatCurrency(cashExpenses + cashReversals)}
              </div>
              <p className="text-[11px] text-muted-foreground">Compras, insumos e sangrias</p>
            </div>

            {/* Saldo Atual em Gaveta */}
            <div className="p-4 rounded-xl bg-surface border border-brand-green/40 space-y-1">
              <span className="text-xs font-semibold text-brand-green-text flex items-center gap-1">
                <Banknote className="w-3.5 h-3.5" />
                <span>Saldo Físico na Gaveta</span>
              </span>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(currentCashDrawer)}
              </div>
              <p className="text-[11px] text-brand-green-text font-medium">
                Dinheiro em espécie esperado
              </p>
            </div>
          </div>

          {/* Outros Métodos de Pagamento na Sessão (PIX e Cartões) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-surface border border-surface-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">PIX Direto na Conta</span>
                  <span className="text-lg font-bold text-white">
                    {formatCurrency(pixTotal)}
                  </span>
                </div>
              </div>
              <span className="text-[11px] px-2 py-1 rounded bg-surface-elevated text-emerald-400 border border-surface-border font-medium">
                Banco / Conta
              </span>
            </div>

            <div className="p-4 rounded-xl bg-surface border border-surface-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Cartões (Débito & Crédito)</span>
                  <span className="text-lg font-bold text-white">
                    {formatCurrency(cardTotal)}
                  </span>
                </div>
              </div>
              <span className="text-[11px] px-2 py-1 rounded bg-surface-elevated text-sky-400 border border-surface-border font-medium">
                Maquininhas
              </span>
            </div>
          </div>

          {/* Lista de Movimentações Deste Caixa */}
          <div className="p-5 rounded-xl bg-surface border border-surface-border space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border/60">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Movimentações do Caixa Atual
                </h3>
                <p className="text-xs text-muted-foreground">
                  Entradas automáticas de serviços e saídas operacionais lançadas
                </p>
              </div>

              <Button
                size="sm"
                variant="secondary"
                onClick={() => setIsNovaDespesaOpen(true)}
                className="text-xs h-8 bg-surface-elevated text-slate-200 border-surface-border"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                + Despesa / Saída
              </Button>
            </div>

            {currentMovements.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground italic">
                Nenhuma movimentação registrada neste caixa até o momento.
              </div>
            ) : (
              <div className="space-y-2">
                {currentMovements.map((m) => {
                  const isIncome = m.type === "income";
                  const isExpense = m.type === "expense";
                  const isReversal = m.type === "reversal";

                  return (
                    <div
                      key={m.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-surface-elevated/30 border border-surface-border/60 text-xs gap-2"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isIncome
                              ? "bg-brand-green/10 text-brand-green"
                              : isExpense
                              ? "bg-red-500/10 text-red-400"
                              : "bg-amber-500/10 text-amber-400"
                          }`}
                        >
                          {isIncome && <ArrowUpRight className="w-4 h-4" />}
                          {isExpense && <ArrowDownLeft className="w-4 h-4" />}
                          {isReversal && <RotateCcw className="w-4 h-4" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">
                              {m.category}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-surface text-muted-foreground uppercase">
                              {PAYMENT_METHOD_LABELS[m.payment_method]}
                            </span>
                          </div>
                          {m.description && (
                            <span className="text-[11px] text-muted-foreground block truncate max-w-sm">
                              {m.description}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-surface-border/40">
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {new Date(m.created_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>

                        <span
                          className={`font-mono font-bold text-sm ${
                            isIncome
                              ? "text-brand-green-text"
                              : isExpense
                              ? "text-red-400"
                              : "text-amber-400"
                          }`}
                        >
                          {isIncome ? "+" : "-"}
                          {formatCurrency(m.amount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAIS */}
      <AbrirCaixaModal
        isOpen={isAbrirModalOpen}
        onClose={() => setIsAbrirModalOpen(false)}
      />

      <FecharCaixaModal
        isOpen={isFecharModalOpen}
        onClose={() => setIsFecharModalOpen(false)}
      />

      <NovaDespesaModal
        isOpen={isNovaDespesaOpen}
        onClose={() => setIsNovaDespesaOpen(false)}
      />
    </div>
  );
}
