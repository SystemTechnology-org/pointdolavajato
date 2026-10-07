"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { Calendar, Clock, AlertTriangle, ShieldAlert } from "lucide-react";
import { getTodayDateString } from "@/lib/initialData";

interface NovoBloqueioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBloqueioCriado?: () => void;
}

export function NovoBloqueioModal({ isOpen, onClose, onBloqueioCriado }: NovoBloqueioModalProps) {
  const { addScheduleBlock } = useAppStore();
  const { success, error: toastError } = useToast();

  const [tipo, setTipo] = useState<"dia_inteiro" | "periodo">("dia_inteiro");
  const [data, setData] = useState(getTodayDateString());
  const [horaInicio, setHoraInicio] = useState("12:00");
  const [horaFim, setHoraFim] = useState("14:00");
  const [motivo, setMotivo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!motivo.trim() || motivo.trim().length < 2) {
      toastError("Informe o motivo do bloqueio (ex: Feriado, Manutenção).");
      return;
    }

    if (!data) {
      toastError("Selecione a data para o bloqueio.");
      return;
    }

    let startIso: string;
    let endIso: string;

    if (tipo === "dia_inteiro") {
      startIso = `${data}T00:00:00-03:00`;
      endIso = `${data}T23:59:59-03:00`;
    } else {
      if (horaFim <= horaInicio) {
        toastError("O horário final deve ser posterior ao horário inicial.");
        return;
      }
      startIso = `${data}T${horaInicio}:00-03:00`;
      endIso = `${data}T${horaFim}:00-03:00`;
    }

    setIsSubmitting(true);
    try {
      await addScheduleBlock({
        start_datetime: startIso,
        end_datetime: endIso,
        reason: motivo.trim(),
      });

      success(`Bloqueio "${motivo.trim()}" registrado com sucesso!`);
      setMotivo("");
      setTipo("dia_inteiro");
      onClose();
      if (onBloqueioCriado) onBloqueioCriado();
    } catch (err: unknown) {
      console.error(err);
      toastError("Não foi possível salvar o bloqueio de agenda.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Novo Bloqueio de Horário ou Feriado"
      description="Impeça novos agendamentos em um dia específico ou período de manutenção."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tipo de Bloqueio */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-surface-elevated/60 border border-surface-border rounded-lg">
          <button
            type="button"
            onClick={() => setTipo("dia_inteiro")}
            className={`py-2 px-3 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
              tipo === "dia_inteiro"
                ? "bg-brand-green text-black shadow"
                : "text-muted-foreground hover:text-white"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Dia Inteiro (Feriado)</span>
          </button>
          <button
            type="button"
            onClick={() => setTipo("periodo")}
            className={`py-2 px-3 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
              tipo === "periodo"
                ? "bg-brand-green text-black shadow"
                : "text-muted-foreground hover:text-white"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Período Específico</span>
          </button>
        </div>

        <Input
          label="Data do Bloqueio *"
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          required
        />

        {tipo === "periodo" && (
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Horário Inicial *"
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              required
            />
            <Input
              label="Horário Final *"
              type="time"
              value={horaFim}
              onChange={(e) => setHoraFim(e.target.value)}
              required
            />
          </div>
        )}

        <Input
          label="Motivo do Bloqueio *"
          placeholder="Ex: Feriado Nacional, Manutenção dos compressores"
          leftIcon={<AlertTriangle className="w-4 h-4 text-brand-yellow" />}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          required
        />

        <div className="p-3 rounded-lg bg-brand-yellow/10 border border-brand-yellow/20 flex items-start gap-2 text-[11px] text-brand-yellow-text">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-brand-yellow" />
          <span>
            Os horários compreendidos neste bloqueio não ficarão visíveis para agendamentos na página pública nem permitirão reservas.
          </span>
        </div>

        <div className="pt-4 flex items-center justify-end gap-2 border-t border-surface-border/60">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            leftIcon={<Calendar className="w-4 h-4" />}
          >
            Confirmar Bloqueio
          </Button>
        </div>
      </form>
    </Modal>
  );
}
