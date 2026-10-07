"use client";

import React, { useState } from "react";
import { CalendarRange, Clock, Save, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";

interface ConfiguracoesAgendamentosProps {
  onDirtyChange?: (isDirty: boolean) => void;
}

export function ConfiguracoesAgendamentos({ onDirtyChange }: ConfiguracoesAgendamentosProps) {
  const { businessSettings, updateBusinessSettings, isCurrentUserAdmin } = useAppStore();
  const { success, error: toastError } = useToast();

  const [intervalo, setIntervalo] = useState(String(businessSettings.appointment_interval || 30));
  const [minAdvanceMinutes, setMinAdvanceMinutes] = useState(String(businessSettings.minimum_advance_minutes ?? 30));
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(String(businessSettings.maximum_advance_days ?? 30));
  const [cancelDeadlineMinutes, setCancelDeadlineMinutes] = useState(String(businessSettings.cancellation_deadline_minutes ?? 120));
  const [allowRescheduling, setAllowRescheduling] = useState(businessSettings.allow_rescheduling ?? true);
  const [rescheduleDeadlineMinutes, setRescheduleDeadlineMinutes] = useState(String(businessSettings.reschedule_deadline_minutes ?? 120));
  const [bufferBetweenServices, setBufferBetweenServices] = useState(String(businessSettings.buffer_between_services_minutes ?? 0));
  const [allowOverbooking, setAllowOverbooking] = useState(businessSettings.allow_overbooking ?? false);
  const [allowSameDayBooking, setAllowSameDayBooking] = useState(businessSettings.allow_same_day_booking ?? true);
  const [allowBookingWithoutPlate, setAllowBookingWithoutPlate] = useState(businessSettings.allow_booking_without_plate ?? false);
  const [requirePhone, setRequirePhone] = useState(businessSettings.require_phone ?? true);
  const [requireName, setRequireName] = useState(businessSettings.require_name ?? true);
  const [requireCheckinToStart, setRequireCheckinToStart] = useState(businessSettings.require_checkin_to_start ?? true);

  const [isSaving, setIsSaving] = useState(false);

  const markDirty = () => {
    if (onDirtyChange) onDirtyChange(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCurrentUserAdmin) {
      toastError("Apenas administradores podem alterar as regras de agendamento.");
      return;
    }

    setIsSaving(true);
    try {
      await updateBusinessSettings({
        appointment_interval: parseInt(intervalo, 10) || 30,
        minimum_advance_minutes: parseInt(minAdvanceMinutes, 10) || 30,
        maximum_advance_days: parseInt(maxAdvanceDays, 10) || 30,
        cancellation_deadline_minutes: parseInt(cancelDeadlineMinutes, 10) || 120,
        allow_rescheduling: allowRescheduling,
        reschedule_deadline_minutes: parseInt(rescheduleDeadlineMinutes, 10) || 120,
        buffer_between_services_minutes: parseInt(bufferBetweenServices, 10) || 0,
        allow_overbooking: allowOverbooking,
        allow_same_day_booking: allowSameDayBooking,
        allow_booking_without_plate: allowBookingWithoutPlate,
        require_phone: requirePhone,
        require_name: requireName,
        require_checkin_to_start: requireCheckinToStart,
      });

      if (onDirtyChange) onDirtyChange(false);
      success("Regras e parâmetros de agendamento salvos com sucesso!");
    } catch (err: unknown) {
      console.error(err);
      toastError("Não foi possível salvar as regras.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Bloco 1: Intervalos e Antecedência */}
      <div className="p-5 rounded-xl bg-surface border border-surface-border space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-yellow" />
          <span>Intervalos e Grade de Horários</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Grade de Horários *
            </label>
            <Select
              value={intervalo}
              onChange={(e) => {
                setIntervalo(e.target.value);
                markDirty();
              }}
              disabled={!isCurrentUserAdmin}
              options={[
                { value: "15", label: "A cada 15 minutos" },
                { value: "30", label: "A cada 30 minutos (Recomendado)" },
                { value: "45", label: "A cada 45 minutos" },
                { value: "60", label: "A cada 60 minutos (1 hora)" },
              ]}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Frequência de slots exibidos no formulário público.
            </p>
          </div>

          <Input
            label="Antecedência Mínima (minutos) *"
            type="number"
            value={minAdvanceMinutes}
            onChange={(e) => {
              setMinAdvanceMinutes(e.target.value);
              markDirty();
            }}
            disabled={!isCurrentUserAdmin}
            min={0}
            step={5}
            helperText="Ex: 30 min antes do horário pretendido."
          />

          <Input
            label="Antecedência Máxima (dias) *"
            type="number"
            value={maxAdvanceDays}
            onChange={(e) => {
              setMaxAdvanceDays(e.target.value);
              markDirty();
            }}
            disabled={!isCurrentUserAdmin}
            min={1}
            max={90}
            helperText="Quantos dias no futuro o cliente pode agendar."
          />
        </div>
      </div>

      {/* Bloco 2: Cancelamentos e Reagendamentos */}
      <div className="p-5 rounded-xl bg-surface border border-surface-border space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <CalendarRange className="w-4 h-4 text-brand-green" />
          <span>Políticas de Cancelamento e Reagendamento Online</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Prazo Mínimo para Cancelamento Online (minutos) *"
            type="number"
            value={cancelDeadlineMinutes}
            onChange={(e) => {
              setCancelDeadlineMinutes(e.target.value);
              markDirty();
            }}
            disabled={!isCurrentUserAdmin}
            min={0}
            step={15}
            helperText="Ex: 120 min (2h). Passado esse prazo, o cliente deve ligar para o lava jato."
          />

          <Input
            label="Prazo Mínimo para Reagendamento Online (minutos) *"
            type="number"
            value={rescheduleDeadlineMinutes}
            onChange={(e) => {
              setRescheduleDeadlineMinutes(e.target.value);
              markDirty();
            }}
            disabled={!isCurrentUserAdmin}
            min={0}
            step={15}
            helperText="Tempo mínimo antes do horário original para troca de data."
          />

          <Input
            label="Tempo Padrão de Intervalo Entre Serviços (minutos)"
            type="number"
            value={bufferBetweenServices}
            onChange={(e) => {
              setBufferBetweenServices(e.target.value);
              markDirty();
            }}
            disabled={!isCurrentUserAdmin}
            min={0}
            step={5}
            helperText="Tempo adicional de folga entre agendamentos sucessivos."
          />
        </div>
      </div>

      {/* Bloco 3: Toggles de Regras Operacionais */}
      <div className="p-5 rounded-xl bg-surface border border-surface-border space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-brand-blue" />
          <span>Regras e Validações de Agendamento</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Exigir Check-in de Entrada (ETAPA 10 - Requisito 12) */}
          <div className="p-3 rounded-lg bg-surface-elevated/60 border border-brand-yellow/30 flex items-center justify-between col-span-1 sm:col-span-2">
            <div className="pr-3">
              <span className="text-xs font-semibold text-white block flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-brand-yellow" />
                Exigir check-in antes de iniciar atendimento (Obrigatório por padrão)
              </span>
              <span className="text-[11px] text-muted-foreground">
                Quando ativado, nenhum veículo poderá entrar em atendimento no pátio sem que a vistoria de entrada (avarias e fotos) seja realizada.
              </span>
            </div>
            <input
              type="checkbox"
              checked={requireCheckinToStart}
              onChange={(e) => {
                setRequireCheckinToStart(e.target.checked);
                markDirty();
              }}
              disabled={!isCurrentUserAdmin}
              className="accent-brand-yellow w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Mesmo Dia */}
          <div className="p-3 rounded-lg bg-surface-elevated/40 border border-surface-border flex items-center justify-between">
            <div className="pr-3">
              <span className="text-xs font-semibold text-white block">
                Permitir Agendamento no Mesmo Dia
              </span>
              <span className="text-[11px] text-muted-foreground">
                Permite clientes reservarem horários ainda disponíveis hoje.
              </span>
            </div>
            <input
              type="checkbox"
              checked={allowSameDayBooking}
              onChange={(e) => {
                setAllowSameDayBooking(e.target.checked);
                markDirty();
              }}
              disabled={!isCurrentUserAdmin}
              className="accent-brand-green w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Reagendamento Online */}
          <div className="p-3 rounded-lg bg-surface-elevated/40 border border-surface-border flex items-center justify-between">
            <div className="pr-3">
              <span className="text-xs font-semibold text-white block">
                Permitir Reagendamento pelo Cliente
              </span>
              <span className="text-[11px] text-muted-foreground">
                Habilita troca de horário na página pública do agendamento.
              </span>
            </div>
            <input
              type="checkbox"
              checked={allowRescheduling}
              onChange={(e) => {
                setAllowRescheduling(e.target.checked);
                markDirty();
              }}
              disabled={!isCurrentUserAdmin}
              className="accent-brand-green w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Encaixe */}
          <div className="p-3 rounded-lg bg-surface-elevated/40 border border-surface-border flex items-center justify-between">
            <div className="pr-3">
              <span className="text-xs font-semibold text-white block">
                Permitir Encaixe / Vagas Simultâneas
              </span>
              <span className="text-[11px] text-muted-foreground">
                Permite mais de um veículo por horário quando houver boxes livres.
              </span>
            </div>
            <input
              type="checkbox"
              checked={allowOverbooking}
              onChange={(e) => {
                setAllowOverbooking(e.target.checked);
                markDirty();
              }}
              disabled={!isCurrentUserAdmin}
              className="accent-brand-green w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Sem Placa */}
          <div className="p-3 rounded-lg bg-surface-elevated/40 border border-surface-border flex items-center justify-between">
            <div className="pr-3">
              <span className="text-xs font-semibold text-white block">
                Permitir Agendamento Sem Placa
              </span>
              <span className="text-[11px] text-muted-foreground">
                Útil para veículos 0km ou quando cliente não souber a placa no ato.
              </span>
            </div>
            <input
              type="checkbox"
              checked={allowBookingWithoutPlate}
              onChange={(e) => {
                setAllowBookingWithoutPlate(e.target.checked);
                markDirty();
              }}
              disabled={!isCurrentUserAdmin}
              className="accent-brand-green w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Exigir Telefone */}
          <div className="p-3 rounded-lg bg-surface-elevated/40 border border-surface-border flex items-center justify-between">
            <div className="pr-3">
              <span className="text-xs font-semibold text-white block">
                Exigir Telefone / WhatsApp *
              </span>
              <span className="text-[11px] text-muted-foreground">
                Obrigatório para confirmação e avisos do lava jato.
              </span>
            </div>
            <input
              type="checkbox"
              checked={requirePhone}
              onChange={(e) => {
                setRequirePhone(e.target.checked);
                markDirty();
              }}
              disabled={!isCurrentUserAdmin}
              className="accent-brand-green w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Exigir Nome */}
          <div className="p-3 rounded-lg bg-surface-elevated/40 border border-surface-border flex items-center justify-between">
            <div className="pr-3">
              <span className="text-xs font-semibold text-white block">
                Exigir Nome Completo *
              </span>
              <span className="text-[11px] text-muted-foreground">
                Identificação do proprietário do veículo na recepção.
              </span>
            </div>
            <input
              type="checkbox"
              checked={requireName}
              onChange={(e) => {
                setRequireName(e.target.checked);
                markDirty();
              }}
              disabled={!isCurrentUserAdmin}
              className="accent-brand-green w-4 h-4 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {isCurrentUserAdmin && (
        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            variant="primary"
            isLoading={isSaving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            {isSaving ? "Salvando..." : "Salvar Regras de Agendamento"}
          </Button>
        </div>
      )}
    </form>
  );
}
