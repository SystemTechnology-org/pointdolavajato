import {
  Appointment,
  AppointmentStatus,
  AppointmentStatusHistory,
  BusinessHour,
  ScheduleBlock,
} from "@/types/database";
import { ResumoMetricas, MAP_DB_TO_STATUS } from "@/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

// Capacidade padrão simultânea de atendimento (ETAPA 3: preparada para múltiplos boxes futuramente, mas 1 no momento)
export const DEFAULT_SIMULTANEOUS_CAPACITY = 1;

export interface ConflictCheckResult {
  available: boolean;
  conflictReason?: string;
  activeCount: number;
}

export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function intervalsOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  return Math.max(startA, startB) < Math.min(endA, endB);
}

export function generateAppointmentCode(): string {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `PC-${randomNum}`;
}

export function generateCancelToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Validação de Conflito com Sobreposição de Intervalo (Requisito 11 e 31)
 * Ex: Se um serviço é 09:00 -> 10:00, outro atendimento 09:30 -> 10:30 DEVE ser rejeitado.
 */
export function checkSlotConflict(
  existingAppointments: Appointment[],
  date: string,
  startTime: string,
  excludeId?: string,
  maxCapacity: number = DEFAULT_SIMULTANEOUS_CAPACITY,
  durationMinutes: number = 45,
  scheduleBlocks: ScheduleBlock[] = []
): ConflictCheckResult {
  const candidateStartMin = timeToMinutes(startTime);
  const candidateEndMin = candidateStartMin + durationMinutes;

  // 1. Verificar bloqueios da agenda (schedule_blocks)
  if (scheduleBlocks && scheduleBlocks.length > 0) {
    const candidateStartIso = new Date(`${date}T${startTime}:00`).getTime();
    const candidateEndIso = new Date(`${date}T${minutesToTime(candidateEndMin)}:00`).getTime();

    for (const block of scheduleBlocks) {
      const blockStart = new Date(block.start_datetime).getTime();
      const blockEnd = new Date(block.end_datetime).getTime();

      if (Math.max(candidateStartIso, blockStart) < Math.min(candidateEndIso, blockEnd)) {
        return {
          available: false,
          conflictReason: `Período bloqueado: ${block.reason || "Fechado temporariamente"}`,
          activeCount: 1,
        };
      }
    }
  }

  // 2. Verificar sobreposição com agendamentos ativos existentes
  const overlappingAppointments = existingAppointments.filter((a) => {
    if (excludeId && a.id === excludeId) return false;
    if (a.scheduled_date !== date) return false;

    // Apenas status ativos ocupam horário
    const isActiveStatus = ["scheduled", "confirmed", "waiting", "in_progress"].includes(a.status);
    if (!isActiveStatus) return false;

    const existStart = timeToMinutes(a.start_time);
    const existEnd = a.end_time ? timeToMinutes(a.end_time) : existStart + 45;

    return intervalsOverlap(candidateStartMin, candidateEndMin, existStart, existEnd);
  });

  const activeCount = overlappingAppointments.length;
  if (activeCount >= maxCapacity) {
    return {
      available: false,
      conflictReason: "Este horário acabou de ser reservado. Por favor, escolha outro.",
      activeCount,
    };
  }

  return {
    available: true,
    activeCount,
  };
}

export interface AvailableSlotItem {
  time: string;
  endTime: string;
  available: boolean;
  reason?: string;
}

export interface DayAvailabilityResult {
  isOpen: boolean;
  reason?: string;
  openingTime?: string;
  closingTime?: string;
  slots: AvailableSlotItem[];
}

/**
 * Calcula horários disponíveis dinamicamente para uma data (Requisito 10, 13, 14)
 */
export function calculateAvailableSlots(params: {
  date: string;
  serviceDuration: number;
  businessHours: BusinessHour[];
  intervalMinutes?: number;
  existingAppointments: Appointment[];
  scheduleBlocks?: ScheduleBlock[];
  maxCapacity?: number;
  excludeAppointmentId?: string;
  minimumAdvanceMinutes?: number;
  maximumAdvanceDays?: number;
  allowSameDayBooking?: boolean;
}): DayAvailabilityResult {
  const {
    date,
    serviceDuration,
    businessHours,
    intervalMinutes = 30,
    existingAppointments,
    scheduleBlocks = [],
    maxCapacity = DEFAULT_SIMULTANEOUS_CAPACITY,
    excludeAppointmentId,
    minimumAdvanceMinutes = 30,
    maximumAdvanceDays = 30,
    allowSameDayBooking = true,
  } = params;

  // 1. Determinar dia da semana
  const dateObj = new Date(`${date}T12:00:00`);
  if (isNaN(dateObj.getTime())) {
    return { isOpen: false, reason: "Data inválida informada.", slots: [] };
  }

  // 1.1 Verificar se o dia inteiro está bloqueado por feriado ou bloqueio administrativo
  const dayStartIso = new Date(`${date}T00:00:00`).getTime();
  const dayEndIso = new Date(`${date}T23:59:59`).getTime();
  const wholeDayBlock = scheduleBlocks.find((b) => {
    const bStart = new Date(b.start_datetime).getTime();
    const bEnd = new Date(b.end_datetime).getTime();
    return bStart <= dayStartIso && bEnd >= dayEndIso;
  });
  if (wholeDayBlock) {
    return {
      isOpen: false,
      reason: `Data bloqueada: ${wholeDayBlock.reason}`,
      slots: [],
    };
  }

  const dayOfWeek = dateObj.getDay(); // 0 = Domingo, 1 = Segunda, etc.
  const hourConfig = businessHours.find((h) => h.day_of_week === dayOfWeek);

  if (!hourConfig || !hourConfig.is_open) {
    return {
      isOpen: false,
      reason: "Não realizamos atendimentos nesta data.",
      slots: [],
    };
  }

  const openMin = timeToMinutes(hourConfig.opening_time);
  const closeMin = timeToMinutes(hourConfig.closing_time);
  const breakStartMin = hourConfig.break_start ? timeToMinutes(hourConfig.break_start) : null;
  const breakEndMin = hourConfig.break_end ? timeToMinutes(hourConfig.break_end) : null;

  // Verificar se a data já passou
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const isToday = date === todayStr;
  const currentMinutesNow = now.getHours() * 60 + now.getMinutes();

  if (date < todayStr) {
    return {
      isOpen: false,
      reason: "Não é permitido selecionar datas que já passaram.",
      slots: [],
    };
  }

  // Regra de antecedência máxima em dias
  const diffMs = new Date(`${date}T00:00:00`).getTime() - new Date(`${todayStr}T00:00:00`).getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays > maximumAdvanceDays) {
    return {
      isOpen: false,
      reason: `Agendamentos são permitidos com até ${maximumAdvanceDays} dias de antecedência.`,
      slots: [],
    };
  }

  // Regra de agendamento no mesmo dia
  if (isToday && !allowSameDayBooking) {
    return {
      isOpen: false,
      reason: "Agendamentos para o mesmo dia não estão disponíveis.",
      slots: [],
    };
  }

  const slots: AvailableSlotItem[] = [];

  // Gerar horários do início ao fim do expediente
  for (let startM = openMin; startM + serviceDuration <= closeMin; startM += intervalMinutes) {
    const endM = startM + serviceDuration;
    const timeStr = minutesToTime(startM);
    const endTimeStr = minutesToTime(endM);

    // Se for hoje, respeitar antecedência mínima em minutos
    if (isToday && startM <= currentMinutesNow + minimumAdvanceMinutes) {
      continue;
    }

    // Intervalo de almoço/pausa
    if (breakStartMin !== null && breakEndMin !== null) {
      if (intervalsOverlap(startM, endM, breakStartMin, breakEndMin)) {
        continue;
      }
    }

    // Checar conflitos com agendamentos e bloqueios
    const conflict = checkSlotConflict(
      existingAppointments,
      date,
      timeStr,
      excludeAppointmentId,
      maxCapacity,
      serviceDuration,
      scheduleBlocks
    );

    if (conflict.available) {
      slots.push({
        time: timeStr,
        endTime: endTimeStr,
        available: true,
      });
    }
  }

  return {
    isOpen: true,
    openingTime: hourConfig.opening_time,
    closingTime: hourConfig.closing_time,
    slots,
    reason: slots.length === 0 ? "Todos os horários desta data já foram preenchidos." : undefined,
  };
}

export async function fetchAppointmentsFromSupabase(
  date?: string,
  status?: AppointmentStatus
): Promise<Appointment[]> {
  if (!supabase || !isSupabaseConfigured()) return [];

  let query = supabase
    .from("appointments")
    .select(`
      *,
      customer:customers(*),
      vehicle:vehicles(*),
      service:services(*)
    `)
    .order("scheduled_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (date) {
    query = query.eq("scheduled_date", date);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Erro ao buscar agendamentos no Supabase:", error);
    throw new Error(error.message);
  }

  return (data as Appointment[]) || [];
}

export async function createAppointmentInSupabase(payload: {
  customer_id: string;
  vehicle_id: string;
  service_id: string;
  scheduled_date: string;
  start_time: string;
  end_time?: string;
  status?: AppointmentStatus;
  notes?: string;
  code?: string;
  cancel_token?: string;
  created_by?: string;
}): Promise<Appointment> {
  if (!supabase || !isSupabaseConfigured()) {
    throw new Error("Supabase não configurado.");
  }

  // 1. Validar e obter o SNAPSHOT DO PREÇO do serviço atual
  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("id, name, price, duration_minutes, active, vehicle_type")
    .eq("id", payload.service_id)
    .single();

  if (serviceError || !service) {
    throw new Error("Serviço selecionado não encontrado.");
  }

  if (!service.active) {
    throw new Error("Este serviço está desativado no momento.");
  }

  // 2. Validar compatibilidade do veículo com o serviço
  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("id, vehicle_type, plate, model")
    .eq("id", payload.vehicle_id)
    .single();

  if (vehicleError || !vehicle) {
    throw new Error("Veículo selecionado não encontrado.");
  }

  if (vehicle.vehicle_type !== service.vehicle_type) {
    throw new Error(
      `O serviço selecionado é incompatível com a categoria do veículo (${vehicle.vehicle_type} != ${service.vehicle_type}).`
    );
  }

  // 3. Checar conflito com sobreposição de tempo no banco
  const duration = service.duration_minutes || 45;
  const startMin = timeToMinutes(payload.start_time);
  const endMin = startMin + duration;
  const computedEndTime = payload.end_time || minutesToTime(endMin);

  const { data: dayBookings } = await supabase
    .from("appointments")
    .select("id, start_time, end_time, status")
    .eq("scheduled_date", payload.scheduled_date)
    .in("status", ["scheduled", "confirmed", "waiting", "in_progress"]);

  if (dayBookings && dayBookings.length > 0) {
    const overlapping = dayBookings.filter((b) => {
      const bStart = timeToMinutes(b.start_time);
      const bEnd = b.end_time ? timeToMinutes(b.end_time) : bStart + 45;
      return intervalsOverlap(startMin, endMin, bStart, bEnd);
    });

    if (overlapping.length >= DEFAULT_SIMULTANEOUS_CAPACITY) {
      throw new Error("Este horário acabou de ser reservado. Por favor, escolha outro.");
    }
  }

  // 4. Inserir o agendamento com SNAPSHOT DO PREÇO, código amigável e token
  const friendlyCode = payload.code || generateAppointmentCode();
  const token = payload.cancel_token || generateCancelToken();

  const { data: newAppointment, error: insertError } = await supabase
    .from("appointments")
    .insert([
      {
        customer_id: payload.customer_id,
        vehicle_id: payload.vehicle_id,
        service_id: payload.service_id,
        scheduled_date: payload.scheduled_date,
        start_time: payload.start_time,
        end_time: computedEndTime,
        status: payload.status || "scheduled",
        price: service.price, // SNAPSHOT DO PREÇO HISTÓRICO
        notes: payload.notes || null,
        code: friendlyCode,
        cancel_token: token,
        created_by: payload.created_by || null,
      },
    ])
    .select(`
      *,
      customer:customers(*),
      vehicle:vehicles(*),
      service:services(*)
    `)
    .single();

  if (insertError) {
    console.error("Erro ao criar agendamento no Supabase:", insertError);
    throw new Error(insertError.message);
  }

  return newAppointment as Appointment;
}

export async function updateAppointmentInSupabase(
  id: string,
  payload: Partial<Appointment>
): Promise<Appointment> {
  if (!supabase || !isSupabaseConfigured()) {
    throw new Error("Supabase não configurado.");
  }

  // Se alterou data ou horário, verificar conflito novamente
  if (payload.scheduled_date || payload.start_time) {
    const { data: current } = await supabase
      .from("appointments")
      .select("scheduled_date, start_time, end_time, service_id")
      .eq("id", id)
      .single();

    if (current) {
      const targetDate = payload.scheduled_date || current.scheduled_date;
      const targetStart = payload.start_time || current.start_time;
      const targetDuration = payload.end_time
        ? timeToMinutes(payload.end_time) - timeToMinutes(targetStart)
        : current.end_time
        ? timeToMinutes(current.end_time) - timeToMinutes(current.start_time)
        : 45;

      const startMin = timeToMinutes(targetStart);
      const endMin = startMin + targetDuration;

      const { data: dayBookings } = await supabase
        .from("appointments")
        .select("id, start_time, end_time, status")
        .eq("scheduled_date", targetDate)
        .neq("id", id)
        .in("status", ["scheduled", "confirmed", "waiting", "in_progress"]);

      if (dayBookings) {
        const overlapping = dayBookings.filter((b) => {
          const bStart = timeToMinutes(b.start_time);
          const bEnd = b.end_time ? timeToMinutes(b.end_time) : bStart + 45;
          return intervalsOverlap(startMin, endMin, bStart, bEnd);
        });

        if (overlapping.length >= DEFAULT_SIMULTANEOUS_CAPACITY) {
          throw new Error("Este novo horário está em conflito com outro agendamento já existente.");
        }
      }
    }
  }

  const { data, error } = await supabase
    .from("appointments")
    .update(payload)
    .eq("id", id)
    .select(`
      *,
      customer:customers(*),
      vehicle:vehicles(*),
      service:services(*)
    `)
    .single();

  if (error) {
    console.error("Erro ao atualizar agendamento:", error);
    throw new Error(error.message);
  }

  return data as Appointment;
}

export const ALLOWED_STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled: ["confirmed", "waiting", "in_progress", "cancelled", "no_show"],
  confirmed: ["waiting", "in_progress", "cancelled", "no_show"],
  waiting: ["in_progress", "cancelled", "no_show"],
  in_progress: ["completed", "waiting", "cancelled"],
  completed: ["ready", "awaiting_payment", "awaiting_pickup", "cancelled"],
  ready: ["awaiting_payment", "awaiting_pickup", "delivered", "completed"],
  awaiting_payment: ["awaiting_pickup", "delivered", "ready"],
  awaiting_pickup: ["delivered", "awaiting_payment", "ready"],
  delivered: [],
  cancelled: [],
  no_show: ["scheduled", "confirmed", "waiting"],
};

export function validateStatusTransition(
  currentStatus: AppointmentStatus,
  targetStatus: AppointmentStatus,
  isAdmin: boolean = false
): { allowed: boolean; reason?: string } {
  if (currentStatus === targetStatus) {
    return { allowed: true };
  }

  if (currentStatus === "delivered" && !isAdmin) {
    return { allowed: false, reason: "Veículo já entregue ao cliente. Atendimento finalizado operacionalmente." };
  }

  if (currentStatus === "cancelled") {
    if (targetStatus === "completed" || targetStatus === "ready" || targetStatus === "delivered") {
      return { allowed: false, reason: "Não é permitido finalizar um atendimento cancelado." };
    }
    if (targetStatus === "in_progress") {
      return { allowed: false, reason: "Não é permitido iniciar um atendimento cancelado." };
    }
    return { allowed: false, reason: "Atendimento cancelado não pode ter seu status alterado no fluxo normal." };
  }

  if (currentStatus === "completed") {
    if (targetStatus === "no_show") {
      return { allowed: false, reason: "Não é possível marcar como 'Não compareceu' um atendimento já finalizado." };
    }
    if (targetStatus === "cancelled" && !isAdmin) {
      return { allowed: false, reason: "Atendimentos finalizados não podem ser cancelados diretamente." };
    }
  }

  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus]?.includes(targetStatus);
  if (!allowed && !isAdmin) {
    const currentPt = MAP_DB_TO_STATUS[currentStatus] || currentStatus;
    const targetPt = MAP_DB_TO_STATUS[targetStatus] || targetStatus;
    return {
      allowed: false,
      reason: `Transição de "${currentPt}" para "${targetPt}" não é permitida pelo fluxo operacional.`,
    };
  }

  return { allowed: true };
}

export function computeRealDurationMinutes(
  startedAt?: string | null,
  completedAt?: string | null
): number | null {
  if (!startedAt || !completedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  if (isNaN(start) || isNaN(end) || end <= start) return null;
  return Math.round((end - start) / 60000);
}

export function computeWaitingForPickupMinutes(
  readyAt?: string | null,
  deliveredAt?: string | null
): number | null {
  if (!readyAt) return null;
  const start = new Date(readyAt).getTime();
  const end = deliveredAt ? new Date(deliveredAt).getTime() : Date.now();
  if (isNaN(start) || isNaN(end) || end < start) return 0;
  return Math.round((end - start) / 60000);
}

export function getWaitingPickupSeverity(minutes: number): {
  severity: "normal" | "atencao" | "demorado";
  label: string;
  badgeClass: string;
} {
  if (minutes < 30) {
    return {
      severity: "normal",
      label: `${minutes}m`,
      badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    };
  }
  if (minutes <= 60) {
    return {
      severity: "atencao",
      label: `${minutes}m`,
      badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    };
  }
  return {
    severity: "demorado",
    label: `${minutes}m`,
    badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  };
}

export async function updateAppointmentStatusInSupabase(
  id: string,
  targetStatus: AppointmentStatus,
  options?: {
    cancellationReason?: string;
    notes?: string;
    changedBy?: string;
    isAdmin?: boolean;
  }
): Promise<Appointment> {
  if (!supabase || !isSupabaseConfigured()) {
    throw new Error("Supabase não configurado.");
  }

  // 1. Obter registro atual
  const { data: existing, error: fetchErr } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) {
    throw new Error("Agendamento não encontrado no banco.");
  }

  // 2. Validar máquina de estados
  const validation = validateStatusTransition(
    existing.status as AppointmentStatus,
    targetStatus,
    options?.isAdmin
  );
  if (!validation.allowed) {
    throw new Error(validation.reason || "Transição de status não permitida.");
  }

  // 3. Montar payload com timestamps operacionais reais
  const nowIso = new Date().toISOString();
  const updatePayload: Partial<Appointment> = {
    status: targetStatus,
    updated_at: nowIso,
  };

  if (targetStatus === "confirmed" && !existing.confirmed_at) {
    updatePayload.confirmed_at = nowIso;
  } else if (targetStatus === "in_progress" && !existing.started_at) {
    updatePayload.started_at = nowIso;
  } else if (targetStatus === "completed" && !existing.completed_at) {
    updatePayload.completed_at = nowIso;
  } else if (targetStatus === "ready" && !existing.ready_at) {
    updatePayload.ready_at = nowIso;
  } else if (targetStatus === "delivered" && !existing.delivered_at) {
    updatePayload.delivered_at = nowIso;
  } else if (targetStatus === "cancelled" && !existing.cancelled_at) {
    updatePayload.cancelled_at = nowIso;
    if (options?.cancellationReason) {
      updatePayload.cancellation_reason = options.cancellationReason;
    }
  } else if (targetStatus === "no_show" && !existing.no_show_at) {
    updatePayload.no_show_at = nowIso;
  }

  if (options?.notes !== undefined) {
    updatePayload.notes = options.notes;
  }

  const { data: updated, error: updateErr } = await supabase
    .from("appointments")
    .update(updatePayload)
    .eq("id", id)
    .select(`
      *,
      customer:customers(*),
      vehicle:vehicles(*),
      service:services(*)
    `)
    .single();

  if (updateErr) {
    console.error("Erro ao atualizar status do agendamento:", updateErr);
    throw new Error(updateErr.message);
  }

  // 4. Inserir no histórico de status
  try {
    await supabase.from("appointment_status_history").insert([
      {
        appointment_id: id,
        old_status: existing.status,
        new_status: targetStatus,
        changed_by: options?.changedBy || null,
        changed_at: nowIso,
        notes: options?.cancellationReason
          ? `Cancelamento: ${options.cancellationReason}`
          : options?.notes || null,
      },
    ]);
  } catch (histErr) {
    console.warn("Aviso ao registrar histórico de status:", histErr);
  }

  return updated as Appointment;
}

export async function fetchAppointmentStatusHistoryFromSupabase(
  appointmentId: string
): Promise<AppointmentStatusHistory[]> {
  if (!supabase || !isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from("appointment_status_history")
    .select("*")
    .eq("appointment_id", appointmentId)
    .order("changed_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar histórico de status:", error);
    return [];
  }

  return (data as AppointmentStatusHistory[]) || [];
}

export async function cancelAppointmentInSupabase(
  id: string,
  reason?: string,
  token?: string
): Promise<Appointment> {
  if (!supabase || !isSupabaseConfigured()) {
    throw new Error("Supabase não configurado.");
  }

  const query = supabase.from("appointments").select("status, cancel_token").eq("id", id);
  const { data: existing, error: fetchErr } = await query.single();

  if (fetchErr || !existing) {
    throw new Error("Agendamento não encontrado.");
  }

  // Se token foi fornecido na chamada pública, validar correspondência
  if (token && existing.cancel_token && existing.cancel_token !== token) {
    throw new Error("Token de segurança inválido para cancelar este agendamento.");
  }

  if (["completed", "in_progress"].includes(existing.status)) {
    throw new Error("Não é possível cancelar um atendimento que já está em andamento ou finalizado.");
  }

  const { data, error } = await supabase
    .from("appointments")
    .update({
      status: "cancelled",
      notes: reason ? `Cancelado: ${reason}` : "Cancelado pelo usuário",
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Erro ao cancelar agendamento:", error);
    throw new Error(error.message);
  }

  return data as Appointment;
}

export function computeDailyMetrics(
  appointments: Appointment[],
  targetDate: string
): ResumoMetricas {
  const daily = appointments.filter((a) => a.scheduled_date === targetDate);

  const totalAgendamentos = daily.length;
  const emAtendimento = daily.filter((a) => a.status === "in_progress").length;
  const concluidos = daily.filter((a) => a.status === "completed").length;

  // Faturamento previsto do dia (agendamentos relevantes: scheduled, confirmed, waiting, in_progress, completed)
  const faturamentoTotal = daily
    .filter((a) => ["scheduled", "confirmed", "waiting", "in_progress", "completed"].includes(a.status))
    .reduce((acc, a) => acc + (Number(a.price) || 0), 0);

  return {
    totalAgendamentos,
    emAtendimento,
    concluidos,
    faturamentoTotal,
  };
}
