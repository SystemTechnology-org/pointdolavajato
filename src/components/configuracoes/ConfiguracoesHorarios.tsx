"use client";

import React, { useState } from "react";
import { Clock, Coffee, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { BusinessHour } from "@/types";

const DIAS_SEMANA = [
  { day: 1, label: "Segunda-feira" },
  { day: 2, label: "Terça-feira" },
  { day: 3, label: "Quarta-feira" },
  { day: 4, label: "Quinta-feira" },
  { day: 5, label: "Sexta-feira" },
  { day: 6, label: "Sábado" },
  { day: 0, label: "Domingo" },
];

interface ConfiguracoesHorariosProps {
  onDirtyChange?: (isDirty: boolean) => void;
}

export function ConfiguracoesHorarios({ onDirtyChange }: ConfiguracoesHorariosProps) {
  const { businessHours, updateBusinessHours, isCurrentUserAdmin } = useAppStore();
  const { success, error: toastError } = useToast();

  const [hoursState, setHoursState] = useState<BusinessHour[]>(() => {
    return DIAS_SEMANA.map((d) => {
      const found = businessHours.find((h) => h.day_of_week === d.day);
      if (found) return { ...found };
      return {
        id: `bh-${d.day}`,
        day_of_week: d.day,
        is_open: d.day !== 0,
        opening_time: "08:00",
        closing_time: "18:00",
        break_start: d.day !== 0 ? "12:00" : null,
        break_end: d.day !== 0 ? "13:00" : null,
      };
    });
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleToggleDay = (day: number) => {
    if (!isCurrentUserAdmin) return;
    setHoursState((prev) =>
      prev.map((h) => (h.day_of_week === day ? { ...h, is_open: !h.is_open } : h))
    );
    if (onDirtyChange) onDirtyChange(true);
  };

  const handleTimeChange = (
    day: number,
    field: "opening_time" | "closing_time" | "break_start" | "break_end",
    value: string
  ) => {
    if (!isCurrentUserAdmin) return;
    setHoursState((prev) =>
      prev.map((h) => (h.day_of_week === day ? { ...h, [field]: value || null } : h))
    );
    if (onDirtyChange) onDirtyChange(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCurrentUserAdmin) {
      toastError("Apenas administradores podem alterar os horários de funcionamento.");
      return;
    }

    // Validações básicas de consistência de horários
    for (const h of hoursState) {
      if (h.is_open) {
        if (h.closing_time <= h.opening_time) {
          const diaNome = DIAS_SEMANA.find((d) => d.day === h.day_of_week)?.label;
          toastError(`No dia ${diaNome}, o fechamento deve ser posterior à abertura.`);
          return;
        }
        if (h.break_start && h.break_end && h.break_end <= h.break_start) {
          const diaNome = DIAS_SEMANA.find((d) => d.day === h.day_of_week)?.label;
          toastError(`No dia ${diaNome}, o fim do intervalo de almoço deve ser posterior ao início.`);
          return;
        }
      }
    }

    setIsSaving(true);
    try {
      await updateBusinessHours(hoursState);
      if (onDirtyChange) onDirtyChange(false);
      success("Horários de funcionamento e intervalos salvos com sucesso!");
    } catch (err: unknown) {
      console.error(err);
      toastError("Não foi possível salvar os horários.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div className="p-4 rounded-xl bg-surface border border-surface-border">
        <div className="flex items-center justify-between pb-3 border-b border-surface-border/50">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-yellow" />
              <span>Horário de Funcionamento Semanal</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure os dias abertos, limites de expediente e pausas de almoço em que novos agendamentos não serão permitidos.
            </p>
          </div>
        </div>

        <div className="divide-y divide-surface-border/40 mt-2">
          {DIAS_SEMANA.map((d) => {
            const h = hoursState.find((item) => item.day_of_week === d.day) || {
              id: `bh-${d.day}`,
              day_of_week: d.day,
              is_open: false,
              opening_time: "08:00",
              closing_time: "18:00",
              break_start: null,
              break_end: null,
            };

            return (
              <div
                key={d.day}
                className={`py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                  !h.is_open ? "opacity-60 bg-surface-elevated/20 rounded-lg px-2 my-1" : ""
                }`}
              >
                {/* Dia e Toggle */}
                <div className="flex items-center gap-3 w-48">
                  <button
                    type="button"
                    onClick={() => handleToggleDay(d.day)}
                    disabled={!isCurrentUserAdmin}
                    className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                      h.is_open ? "bg-brand-green" : "bg-slate-700"
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        h.is_open ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <div>
                    <span className="text-xs font-bold text-white block">{d.label}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {h.is_open ? "Aberto" : "Fechado"}
                    </span>
                  </div>
                </div>

                {/* Campos de Horário */}
                {h.is_open ? (
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    {/* Expediente Principal */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-300 w-16">Expediente:</span>
                      <input
                        type="time"
                        value={h.opening_time}
                        onChange={(e) => handleTimeChange(d.day, "opening_time", e.target.value)}
                        disabled={!isCurrentUserAdmin}
                        className="text-xs px-2 py-1 rounded bg-surface-elevated/60 border border-surface-border text-white focus:outline-none focus:border-brand-green"
                      />
                      <span className="text-muted-foreground text-xs">até</span>
                      <input
                        type="time"
                        value={h.closing_time}
                        onChange={(e) => handleTimeChange(d.day, "closing_time", e.target.value)}
                        disabled={!isCurrentUserAdmin}
                        className="text-xs px-2 py-1 rounded bg-surface-elevated/60 border border-surface-border text-white focus:outline-none focus:border-brand-green"
                      />
                    </div>

                    {/* Intervalo de Almoço */}
                    <div className="flex items-center gap-2">
                      <Coffee className="w-3.5 h-3.5 text-brand-yellow shrink-0" />
                      <span className="text-[11px] text-slate-300 w-14">Almoço:</span>
                      <input
                        type="time"
                        value={h.break_start || ""}
                        onChange={(e) => handleTimeChange(d.day, "break_start", e.target.value)}
                        disabled={!isCurrentUserAdmin}
                        placeholder="Início"
                        className="text-xs px-2 py-1 rounded bg-surface-elevated/60 border border-surface-border text-white focus:outline-none focus:border-brand-green"
                      />
                      <span className="text-muted-foreground text-xs">até</span>
                      <input
                        type="time"
                        value={h.break_end || ""}
                        onChange={(e) => handleTimeChange(d.day, "break_end", e.target.value)}
                        disabled={!isCurrentUserAdmin}
                        placeholder="Fim"
                        className="text-xs px-2 py-1 rounded bg-surface-elevated/60 border border-surface-border text-white focus:outline-none focus:border-brand-green"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 text-xs text-muted font-medium italic">
                    Sem atendimentos neste dia da semana.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-brand-yellow/10 border border-brand-yellow/20 flex items-center gap-2 text-xs text-brand-yellow-text">
        <AlertCircle className="w-4 h-4 shrink-0 text-brand-yellow" />
        <span>
          O intervalo de almoço bloqueia automaticamente a geração de horários públicos durante aquele período, assegurando descanso para a equipe.
        </span>
      </div>

      {isCurrentUserAdmin && (
        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            variant="primary"
            isLoading={isSaving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            {isSaving ? "Salvando..." : "Salvar Horários"}
          </Button>
        </div>
      )}
    </form>
  );
}
