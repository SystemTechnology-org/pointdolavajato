import React from "react";
import { cn } from "@/lib/utils";
import { StatusAgendamento } from "@/types";

interface StatusBadgeProps {
  status: StatusAgendamento;
  className?: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, className, size = "md" }: StatusBadgeProps) {
  const configMap: Record<
    StatusAgendamento,
    { label: string; dotClass: string; badgeClass: string }
  > = {
    Agendado: {
      label: "Agendado",
      dotClass: "bg-sky-400",
      badgeClass: "bg-sky-500/10 text-sky-300 border-sky-500/20",
    },
    Confirmado: {
      label: "Confirmado",
      dotClass: "bg-emerald-400",
      badgeClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    },
    Aguardando: {
      label: "Aguardando",
      dotClass: "bg-amber-400",
      badgeClass: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    },
    "Em atendimento": {
      label: "Em atendimento",
      dotClass: "bg-orange-400 animate-pulse",
      badgeClass: "bg-orange-500/10 text-orange-300 border-orange-500/20",
    },
    Concluído: {
      label: "Lavagem Concluída",
      dotClass: "bg-teal-400",
      badgeClass: "bg-teal-500/10 text-teal-300 border-teal-500/20",
    },
    Pronto: {
      label: "Veículo Pronto",
      dotClass: "bg-emerald-400",
      badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    },
    "Aguardando pagamento": {
      label: "Aguardando Pagamento",
      dotClass: "bg-amber-400 animate-pulse",
      badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    },
    "Aguardando retirada": {
      label: "Aguardando Retirada",
      dotClass: "bg-cyan-400 animate-pulse",
      badgeClass: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    },
    Entregue: {
      label: "Entregue",
      dotClass: "bg-green-500",
      badgeClass: "bg-green-500/15 text-green-300 border-green-500/30",
    },
    Finalizado: {
      label: "Finalizado",
      dotClass: "bg-green-500",
      badgeClass: "bg-green-500/15 text-green-300 border-green-500/30",
    },
    Cancelado: {
      label: "Cancelado",
      dotClass: "bg-slate-400",
      badgeClass: "bg-slate-800 text-slate-400 border-slate-700/60",
    },
    "Não compareceu": {
      label: "Não compareceu",
      dotClass: "bg-rose-400",
      badgeClass: "bg-rose-500/10 text-rose-300 border-rose-500/20",
    },
  };

  const current = configMap[status] || configMap["Agendado"];

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[11px] gap-1.5",
    md: "px-2.5 py-1 text-xs gap-2",
  };

  const dotSize = size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2";

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full border shrink-0 tracking-normal",
        current.badgeClass,
        sizeStyles[size],
        className
      )}
    >
      <span className={cn("rounded-full shrink-0", dotSize, current.dotClass)} />
      <span>{current.label}</span>
    </span>
  );
}
