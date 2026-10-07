"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import {
  History,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Wallet,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { CASH_REGISTER_STATUS_LABELS } from "@/types";

export default function HistoricoCaixasPage() {
  const { cashRegisters, cashMovements } = useAppStore();

  const [expandedRegisterId, setExpandedRegisterId] = useState<string | null>(null);

  // Ordenar caixas: mais recentes primeiro
  const sortedRegisters = useMemo(() => {
    return [...cashRegisters].sort(
      (a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime()
    );
  }, [cashRegisters]);

  const toggleExpand = (id: string) => {
    setExpandedRegisterId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      {/* 1. TOPO: TÍTULO, SUBTEXTO E BOTÃO VOLTAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-surface-border/60">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-brand-green" />
            <span>Histórico de Fechamentos de Caixa</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Consulte os caixas anteriores, valores apurados, conferências e divergências.
          </p>
        </div>

        <Link href="/caixa">
          <Button
            size="sm"
            variant="outline"
            className="h-9 border-surface-border text-slate-300 hover:text-white"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Voltar ao Caixa Diário
          </Button>
        </Link>
      </div>

      {/* 2. LISTAGEM DOS CAIXAS */}
      {sortedRegisters.length === 0 ? (
        <div className="p-8 rounded-2xl bg-surface border border-surface-border text-center max-w-md mx-auto space-y-3">
          <Wallet className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
          <h3 className="text-base font-bold text-white">Nenhum Caixa Registrado</h3>
          <p className="text-xs text-muted-foreground">
            Os registros de caixas abertos e fechados aparecerão aqui após a primeira abertura.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedRegisters.map((reg) => {
            const isClosed = reg.status === "closed";
            const isExpanded = expandedRegisterId === reg.id;
            const diff = reg.difference !== null && reg.difference !== undefined ? Number(reg.difference) : null;

            // Movimentações deste caixa específico
            const regMovements = cashMovements.filter((m) => m.cash_register_id === reg.id);
            const totalIncome = regMovements
              .filter((m) => m.type === "income")
              .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);
            const totalExpenses = regMovements
              .filter((m) => m.type === "expense")
              .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

            return (
              <div
                key={reg.id}
                className="rounded-xl bg-surface border border-surface-border overflow-hidden transition-all"
              >
                {/* Header do Card */}
                <div
                  onClick={() => toggleExpand(reg.id)}
                  className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-surface-hover/40"
                >
                  {/* Bloco 1: Data, Status e Identificação */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isClosed
                          ? "bg-surface-elevated text-slate-400 border border-surface-border"
                          : "bg-brand-green/20 text-brand-green border border-brand-green/30 animate-pulse"
                      }`}
                    >
                      {isClosed ? <Lock className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          {new Date(reg.opened_at).toLocaleDateString("pt-BR", {
                            weekday: "short",
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            isClosed
                              ? "bg-surface-elevated text-slate-400"
                              : "bg-brand-green/20 text-brand-green-text border border-brand-green/30"
                          }`}
                        >
                          {CASH_REGISTER_STATUS_LABELS[reg.status]}
                        </span>
                      </div>

                      <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span>
                          Aberto às{" "}
                          {new Date(reg.opened_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {reg.closed_at && (
                          <>
                            <span>•</span>
                            <span>
                              Fechado às{" "}
                              {new Date(reg.closed_at).toLocaleTimeString("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bloco 2: Valores Resumidos */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs lg:text-right">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">
                        Fundo Inicial
                      </span>
                      <span className="font-semibold text-white font-mono">
                        {formatCurrency(reg.opening_balance)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-muted-foreground block">
                        Saldo Esperado
                      </span>
                      <span className="font-semibold text-white font-mono">
                        {reg.closing_balance !== null && reg.closing_balance !== undefined
                          ? formatCurrency(reg.closing_balance)
                          : "---"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-muted-foreground block">
                        Saldo Contado
                      </span>
                      <span className="font-semibold text-white font-mono">
                        {reg.counted_balance !== null && reg.counted_balance !== undefined
                          ? formatCurrency(reg.counted_balance)
                          : "Em aberto"}
                      </span>
                    </div>

                    {/* Diferença / Conciliação */}
                    <div>
                      <span className="text-[10px] text-muted-foreground block">
                        Diferença
                      </span>
                      {diff !== null ? (
                        <span
                          className={`font-bold font-mono text-xs inline-flex items-center gap-1 ${
                            diff === 0
                              ? "text-brand-green-text"
                              : diff > 0
                              ? "text-sky-400"
                              : "text-red-400"
                          }`}
                        >
                          {diff === 0 ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-brand-green" />
                              <span>Exato</span>
                            </>
                          ) : diff > 0 ? (
                            `+${formatCurrency(diff)}`
                          ) : (
                            formatCurrency(diff)
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">Pendente</span>
                      )}
                    </div>
                  </div>

                  {/* Botão de expansão */}
                  <div className="flex items-center justify-end text-muted-foreground">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-300" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-300" />
                    )}
                  </div>
                </div>

                {/* Detalhes Expandidos (Movimentações do Caixa) */}
                {isExpanded && (
                  <div className="p-4 bg-surface-elevated/30 border-t border-surface-border text-xs space-y-3">
                    <div className="flex items-center justify-between text-muted-foreground text-[11px] pb-2 border-b border-surface-border/50">
                      <span>
                        Movimentações registradas ({regMovements.length}) • Entradas:{" "}
                        <strong className="text-brand-green-text">
                          +{formatCurrency(totalIncome)}
                        </strong>{" "}
                        • Despesas:{" "}
                        <strong className="text-red-400">
                          -{formatCurrency(totalExpenses)}
                        </strong>
                      </span>
                      {reg.notes && (
                        <span className="italic text-slate-300 max-w-sm truncate">
                          Obs: &quot;{reg.notes}&quot;
                        </span>
                      )}
                    </div>

                    {regMovements.length === 0 ? (
                      <p className="text-muted-foreground italic text-center py-2">
                        Nenhuma movimentação detalhada encontrada para este caixa.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {regMovements.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between p-2 rounded bg-surface border border-surface-border/50 text-[11px]"
                          >
                            <div>
                              <span className="font-semibold text-white mr-2">
                                {m.category}
                              </span>
                              {m.description && (
                                <span className="text-muted-foreground">
                                  {m.description}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-muted-foreground uppercase font-mono text-[10px]">
                                {m.payment_method}
                              </span>
                              <span
                                className={`font-mono font-bold ${
                                  m.type === "income"
                                    ? "text-brand-green-text"
                                    : "text-red-400"
                                }`}
                              >
                                {m.type === "income" ? "+" : "-"}
                                {formatCurrency(m.amount)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
