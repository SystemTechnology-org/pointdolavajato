"use client";

import React, { useState } from "react";
import { DailyTrendPoint } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface SimpleTrendChartProps {
  data: DailyTrendPoint[];
  metric: "faturamento" | "atendimentos";
  title: string;
  subtitle?: string;
  className?: string;
}

export function SimpleTrendChart({
  data,
  metric,
  title,
  subtitle,
  className,
}: SimpleTrendChartProps) {
  const [activePoint, setActivePoint] = useState<DailyTrendPoint | null>(null);

  // Filtra ou verifica se há algum dado diferente de zero
  const hasData = data.some((d) =>
    metric === "faturamento" ? d.faturamento > 0 : d.atendimentosConcluidos > 0
  );

  if (!hasData || data.length === 0) {
    return (
      <div
        className={cn(
          "p-5 rounded-xl bg-surface border border-surface-border flex flex-col justify-between",
          className
        )}
      >
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-0.5">
            {title}
          </h3>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="py-12 text-center text-xs text-muted-foreground">
          <p>Não há dados para o período selecionado.</p>
        </div>
      </div>
    );
  }

  // Encontrar valor máximo para escala
  const values = data.map((d) =>
    metric === "faturamento" ? d.faturamento : d.atendimentosConcluidos
  );
  const maxValue = Math.max(...values, metric === "faturamento" ? 50 : 2);

  return (
    <div
      className={cn(
        "p-4 sm:p-5 rounded-xl bg-surface border border-surface-border flex flex-col justify-between space-y-4",
        className
      )}
    >
      {/* Topo do Card com Título e Indicador Ativo */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {activePoint ? (
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground block">
              {activePoint.weekday}, {activePoint.displayDate}
            </span>
            <span className="text-xs font-bold text-brand-green-text">
              {metric === "faturamento"
                ? formatCurrency(activePoint.faturamento)
                : `${activePoint.atendimentosConcluidos} finalizados`}
            </span>
          </div>
        ) : (
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground block">
              Total no período
            </span>
            <span className="text-xs font-bold text-white">
              {metric === "faturamento"
                ? formatCurrency(values.reduce((a, b) => a + b, 0))
                : `${values.reduce((a, b) => a + b, 0)} finalizados`}
            </span>
          </div>
        )}
      </div>

      {/* Gráfico de Barras Responsivo em SVG */}
      <div className="relative pt-2">
        <div className="h-36 sm:h-44 flex items-end gap-1.5 sm:gap-2 justify-between w-full">
          {data.map((item, index) => {
            const rawVal =
              metric === "faturamento" ? item.faturamento : item.atendimentosConcluidos;
            const heightPercent = Math.max(rawVal > 0 ? (rawVal / maxValue) * 100 : 4, 3);
            const isHovered = activePoint?.date === item.date;

            return (
              <div
                key={item.date || index}
                onMouseEnter={() => setActivePoint(item)}
                onMouseLeave={() => setActivePoint(null)}
                className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
              >
                {/* Tooltip inline em desktop */}
                {isHovered && (
                  <div className="absolute top-0 transform -translate-y-2 bg-surface-dark border border-slate-700 text-[10px] px-2 py-1 rounded shadow-lg z-10 whitespace-nowrap text-white">
                    <span className="font-semibold text-brand-green-text">
                      {metric === "faturamento"
                        ? formatCurrency(item.faturamento)
                        : `${item.atendimentosConcluidos} atendimentos`}
                    </span>
                    <span className="text-muted-foreground ml-1">
                      ({item.displayDate})
                    </span>
                  </div>
                )}

                {/* Barra */}
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={cn(
                    "w-full rounded-t-sm sm:rounded-t transition-all duration-300",
                    rawVal > 0
                      ? isHovered
                        ? "bg-brand-yellow shadow-sm"
                        : "bg-brand-green/80 group-hover:bg-brand-green"
                      : "bg-surface-elevated/40"
                  )}
                />

                {/* Rótulo de Data no Eixo X */}
                <div className="mt-2 text-center">
                  <span
                    className={cn(
                      "text-[9px] sm:text-[10px] block transition-colors leading-none",
                      isHovered
                        ? "text-brand-green-text font-bold"
                        : "text-muted-foreground"
                    )}
                  >
                    {item.displayDate.split("/")[0]}
                  </span>
                  <span className="text-[8px] text-slate-500 hidden sm:block mt-0.5">
                    {item.weekday}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
