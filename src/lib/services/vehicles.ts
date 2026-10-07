import { Vehicle, VehicleType, Appointment, Customer } from "@/types/database";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

export function normalizePlate(plate: string): string {
  return plate.replace(/[\s-]/g, "").toUpperCase();
}

export function formatPlateDisplay(plate?: string | null): string {
  if (!plate || plate.trim() === "" || plate === "---") return "Sem placa";
  const clean = normalizePlate(plate);
  if (clean.length === 7) {
    // Se padrão antigo ABC1234 -> ABC-1234
    if (/^[A-Z]{3}\d{4}$/.test(clean)) {
      return `${clean.slice(0, 3)}-${clean.slice(3)}`;
    }
    // Mercosul ABC1D23 -> mantém direto ou com espaço
    return clean;
  }
  return clean;
}

export async function fetchVehiclesFromSupabase(filter?: {
  customerId?: string;
  vehicleType?: VehicleType;
  searchTerm?: string;
  includeInactive?: boolean;
}): Promise<Vehicle[]> {
  if (!supabase || !isSupabaseConfigured()) return [];

  let query = supabase
    .from("vehicles")
    .select("*, customer:customers(*)")
    .order("created_at", { ascending: false });

  if (!filter?.includeInactive) {
    query = query.eq("active", true);
  }

  if (filter?.customerId) {
    query = query.eq("customer_id", filter.customerId);
  }

  if (filter?.vehicleType) {
    query = query.eq("vehicle_type", filter.vehicleType);
  }

  if (filter?.searchTerm && filter.searchTerm.trim()) {
    const s = filter.searchTerm.trim();
    query = query.or(`model.ilike.%${s}%,plate.ilike.%${s}%,brand.ilike.%${s}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Erro ao buscar veículos no Supabase:", error);
    throw new Error(error.message);
  }

  return (data as Vehicle[]) || [];
}

/**
 * Checa duplicidade de placa para alertar se já pertence a outro cliente (Requisito 24)
 */
export async function checkPlateDuplicate(
  plate: string,
  excludeVehicleId?: string
): Promise<{ exists: boolean; vehicle?: Vehicle; customerName?: string; customerId?: string }> {
  if (!supabase || !isSupabaseConfigured() || !plate || plate.trim().length < 3) {
    return { exists: false };
  }

  const clean = normalizePlate(plate);

  let query = supabase
    .from("vehicles")
    .select("*, customer:customers(id, full_name, phone)")
    .eq("active", true);

  if (excludeVehicleId) {
    query = query.neq("id", excludeVehicleId);
  }

  const { data, error } = await query;
  if (error || !data) return { exists: false };

  const match = data.find((v) => v.plate && normalizePlate(v.plate) === clean);
  if (match) {
    const cust = match.customer as unknown as { id?: string; full_name?: string };
    return {
      exists: true,
      vehicle: match as Vehicle,
      customerName: cust?.full_name || "Outro cliente",
      customerId: cust?.id,
    };
  }

  return { exists: false };
}

export async function createVehicleInSupabase(
  payload: Omit<Vehicle, "id" | "created_at" | "updated_at">
): Promise<Vehicle> {
  if (!supabase || !isSupabaseConfigured()) {
    throw new Error("Supabase não configurado.");
  }

  const cleanPlate = payload.plate ? normalizePlate(payload.plate) : null;

  // Verificar se placa já existe em outro cliente
  if (cleanPlate) {
    const dupCheck = await checkPlateDuplicate(cleanPlate);
    if (dupCheck.exists && dupCheck.customerId !== payload.customer_id) {
      throw new Error(`Este veículo já está cadastrado para o cliente ${dupCheck.customerName}.`);
    }
  }

  const { data, error } = await supabase
    .from("vehicles")
    .insert([
      {
        ...payload,
        plate: cleanPlate,
        brand: payload.brand?.trim() || null,
        notes: payload.notes?.trim() || null,
        active: payload.active !== undefined ? payload.active : true,
      },
    ])
    .select("*, customer:customers(*)")
    .single();

  if (error) {
    console.error("Erro ao criar veículo no Supabase:", error);
    throw new Error(error.message);
  }

  return data as Vehicle;
}

export async function updateVehicleInSupabase(
  id: string,
  payload: Partial<Vehicle>
): Promise<Vehicle> {
  if (!supabase || !isSupabaseConfigured()) {
    throw new Error("Supabase não configurado.");
  }

  const cleanPayload = { ...payload };
  if (cleanPayload.plate) {
    cleanPayload.plate = normalizePlate(cleanPayload.plate);
    const dupCheck = await checkPlateDuplicate(cleanPayload.plate, id);
    if (dupCheck.exists && dupCheck.customerId && cleanPayload.customer_id && dupCheck.customerId !== cleanPayload.customer_id) {
      throw new Error(`Este veículo já está cadastrado para o cliente ${dupCheck.customerName}.`);
    }
  }

  const { data, error } = await supabase
    .from("vehicles")
    .update(cleanPayload)
    .eq("id", id)
    .select("*, customer:customers(*)")
    .single();

  if (error) {
    console.error("Erro ao atualizar veículo no Supabase:", error);
    throw new Error(error.message);
  }

  return data as Vehicle;
}

/**
 * Desativação segura (Soft Delete) de veículo para manter histórico (Requisito 15)
 */
export async function deactivateVehicleInSupabase(id: string): Promise<void> {
  if (!supabase || !isSupabaseConfigured()) {
    throw new Error("Supabase não configurado.");
  }

  const { error } = await supabase
    .from("vehicles")
    .update({ active: false })
    .eq("id", id);

  if (error) {
    console.error("Erro ao desativar veículo no Supabase:", error);
    throw new Error(error.message);
  }
}

/**
 * Ativa veículo novamente
 */
export async function activateVehicleInSupabase(id: string): Promise<void> {
  if (!supabase || !isSupabaseConfigured()) {
    throw new Error("Supabase não configurado.");
  }

  const { error } = await supabase
    .from("vehicles")
    .update({ active: true })
    .eq("id", id);

  if (error) {
    console.error("Erro ao ativar veículo no Supabase:", error);
    throw new Error(error.message);
  }
}

export async function deleteVehicleInSupabase(id: string): Promise<void> {
  // Preservar histórico conforme Requisito 15
  await deactivateVehicleInSupabase(id);
}

/**
 * Detalhes completos do veículo com proprietário e linha do tempo de atendimentos (Requisitos 16, 17)
 */
export async function fetchVehicleDetailsFromSupabase(id: string): Promise<{
  vehicle: Vehicle;
  customer: Customer | null;
  appointments: Appointment[];
  totalAppointments: number;
  completedAppointments: number;
  totalHistoricalRevenue: number;
  lastAppointment: Appointment | null;
}> {
  if (!supabase || !isSupabaseConfigured()) {
    throw new Error("Supabase não configurado.");
  }

  const { data: veh, error: vehErr } = await supabase
    .from("vehicles")
    .select("*, customer:customers(*)")
    .eq("id", id)
    .single();

  if (vehErr || !veh) {
    throw new Error("Veículo não encontrado.");
  }

  const { data: appointmentsData, error: appErr } = await supabase
    .from("appointments")
    .select("*, service:services(*)")
    .eq("vehicle_id", id)
    .order("scheduled_date", { ascending: false })
    .order("start_time", { ascending: false });

  if (appErr) {
    console.error("Erro ao buscar histórico do veículo:", appErr);
  }

  const appointments = (appointmentsData as Appointment[]) || [];
  const completed = appointments.filter((a) => a.status === "completed");
  const totalRevenue = completed.reduce((acc, a) => acc + (Number(a.price) || 0), 0);
  const lastAppointment = appointments.length > 0 ? appointments[0] : null;

  return {
    vehicle: veh as Vehicle,
    customer: (veh.customer as Customer) || null,
    appointments,
    totalAppointments: appointments.length,
    completedAppointments: completed.length,
    totalHistoricalRevenue: totalRevenue,
    lastAppointment,
  };
}
