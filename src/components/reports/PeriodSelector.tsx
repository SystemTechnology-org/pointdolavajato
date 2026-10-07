"use client";

import React, { useState } from "react";
import { Calendar, Check } from "lucide-react";
import { PeriodFilter, DateRange } from "@/types";
import { resolveDateRange, formatDateBr } from "@/lib/services/reports";
import { cn } from "@/lib/utils";

interface PeriodSelectorProps {
  currentFilter: PeriodFilter;
  currentRange: DateRange;
  onChange: (filter: PeriodFilter, range: DateRange) => void;
  className?: string;
}

const FILTER_OPTIONS: { id: PeriodFilter; label: string }[] = [
  { id: "today", label: "Hoje" },
  { id: "yesterday", label: "Ontem" },
  { id: "last7days", label: "Últimos 7 dias" },
  { id: "last30days", label: "Últimos 30 dias" },
  { id: "thisMonth", label: "Este mês" },
  { id: "lastMonth", label: "Mês anterior" },
  { id: "custom", label: "Personalizado" },
];

export function PeriodSelector({
  currentFilter,
  currentRange,
  onChange,
  className,
}: PeriodSelectorProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(currentFilter === "custom");
  const [customStart, setCustomStart] = useState(currentRange.startDate);
  const [customEnd, setCustomEnd] = useState(currentRange.endDate);

  const handleSelectFilter = (filterId: PeriodFilter) => {
    if (filterId === "custom") {
      setIsCustomOpen(true);
      return;
    }

    setIsCustomOpen(false);
    const newRange = resolveDateRange(filterId);
    onChange(filterId, newRange);
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStart || !customEnd) return;
    const newRange = resolveDateRange("custom", customStart, customEnd);
    onChange("custom", newRange);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Barra de Seleção de Períodos Rápidos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Chips / Botões de Período */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {FILTER_OPTIONS.map((opt) => {
            const isSelected = currentFilter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectFilter(opt.id)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-1.5",
                  isSelected
                    ? "bg-brand-green/20 text-brand-green-text border border-brand-green/40 shadow-sm"
                    : "bg-surface-elevated/70 text-slate-300 hover:text-white hover:bg-surface-elevated border border-surface-border"
                )}
              >
                {isSelected && <Check className="w-3 h-3 text-brand-green" />}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Indicador Claro do Período Atual Selecionado (Requisito 23) */}
        <div className="flex items-center gap-2 text-xs text-slate-300 bg-surface px-3 py-1.5 rounded-lg border border-surface-border self-start sm:self-auto">
          <Calendar className="w-3.5 h-3.5 text-brand-yellow" />
          <span className="font-semibold text-white">
            {formatDateBr(currentRange.startDate)} — {formatDateBr(currentRange.endDate)}
          </span>
        </div>
      </div>

      {/* Caixa de Entrada para Período Personalizado */}
      {isCustomOpen && (
        <form
          onSubmit={handleApplyCustom}
          className="p-3.5 rounded-xl bg-surface border border-surface-border flex flex-col sm:flex-row sm:items-end gap-3 animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <div className="flex-1">
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Data Inicial
            </label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-green"
              required
            />
          </div>

          <div className="flex-1">
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Data Final
            </label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-green"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-brand-green hover:bg-brand-green-hover text-surface-dark text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>Aplicar</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCustomOpen(false)}
              className="px-3 py-2 bg-surface-elevated hover:bg-surface-border text-slate-300 text-xs font-medium rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
