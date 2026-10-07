import { Customer, Vehicle, Appointment } from "@/types/database";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function formatPhoneFriendly(phone: string): string {
  const clean = normalizePhone(phone);
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 3)} ${clean.slice(3, 7)}-${clean.slice(7)}`;
  }
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }
  return phone;
}

export async function fetchCustomersFromSupabase(
  search?: string,
  includeInactive = false
): Promise<Customer[]> {
  if (!supabase || !isSupabaseConfigured()) return [];

  let query = supabase
    .from("customers")
    .select("*, vehicles(*)")
    .order("created_at", { ascending: false });

  if (!includeInactive) {
    query = query.eq("active", true);
  }

  if (search && search.trim()) {
    const s = search.trim();
    query = query.or(`full_name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Erro ao buscar clientes no Supabase:", error);
    throw new Error(error.message);
  }

  return (data as Customer[]) || [];
}

/**
 * Checa duplicidade de WhatsApp/telefone para evitar cadastros repetidos (Requisito 23)
 */
export async function checkCustomerPhoneDuplicate(
  phone: string,
  excludeId?: string
): Promise<{ exists: boolean; customer?: { id: string; full_name: string; phone: string } }> {
  if (!supabase || !isSupabaseConfigured()) {
    return { exists: false };
  }

  const clean = normalizePhone(phone);
  if (clean.length < 8) return { exists: false };

  let query = supabase
    .from("customers")
    .select("id, full_name, phone")
    .eq("active", true);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;
  if (error || !data) return { exists: false };

  const match = data.find((c) => normalizePhone(c.phone) === clean);
  if (match) {
    return {
      exists: true,
      customer: {
        id: match.id,
        full_name: match.full_name,
        phone: match.phone,
      },
    };
  }

  return { exists: false };
}

export async function createCustomerInSupabase(
  payload: Omit<Customer, "id" | "created_at" | "updated_at">
): Promise<Customer> {
  if (!supabase || !isSupabaseConfigured()) {
    throw new Error("Supabase não configurado.");
  }

  const cleanPhone = normalizePhone(payload.phone);
  if (cleanPhone.length < 8) {
    throw new Error("Número de telefone/WhatsApp inválido.");
  }

  // Verificar duplicidade de telefone
  const dupCheck = await checkCustomerPhoneDuplicate(payload.phone);
  if (dupCheck.exists && dupCheck.customer) {
    throw new Error(`Já existe um cliente cadastrado com este WhatsApp: ${dupCheck.customer.full_name}`);
  }

  const { data, error } = await supabase
    .from("customers")
    .insert([
      {
        ...payload,
        email: payload.email?.trim() || null,
        notes: payload.notes?.trim() || null,
        active: payload.active !== undefined ? payload.active : true,
      },
    ])
    .select("*, vehicles(*)")
    .single();

  if (error) {
    console.error("Erro ao criar cliente no Supabase:", error);
    throw new Error(error.message);
  }

  return data as Customer;
}

export async function updateCustomerInSupabase(
  id: string,
  payload: Partial<Customer>
): Promise<Customer> {
  if (!supabase || !isSupabaseConfigured()) {
    throw new Error("Supabase não configurado.");
  }

  if (payload.phone) {
    const dupCheck = await checkCustomerPhoneDuplicate(payload.phone, id);
    if (dupCheck.exists && dupCheck.customer) {
      throw new Error(`Já existe outro cliente com este WhatsApp: ${dupCheck.customer.full_name}`);
    }
  }

  const { data, error } = await supabase
    .from("customers")
    .update({
      ...payload,
      email: payload.email !== undefined ? (payload.email?.trim() || null) : undefined,
      notes: payload.notes !== undefined ? (payload.notes?.trim() || null) : undefined,
    })
    .eq("id", id)
    .select("*, vehicles(*)")
    .single();

  if (error) {
    console.error("Erro ao atualizar cliente no Supabase:", error);
    throw new Error(error.message);
  }

  return data as Customer;
}

/**
 * Desativação segura (Soft Delete) do cliente para preservar histórico (Requisito 8)
 */
export async function deactivateCustomerInSupabase(id: string): Promise<void> {
  if (!supabase || !isSupabaseConfigured()) {
    throw new Error("Supabase não configurado.");
  }

  const { error } = await supabase
    .from("customers")
    .update({ active: false })
    .eq("id", id);

  if (error) {
    console.error("Erro ao desativar cliente no Supabase:", error);
    throw new Error(error.message);
  }
}

/**
 * Ativa cliente novamente
 */
export async function activateCustomerInSupabase(id: string): Promise<void> {
  if (!supabase || !isSupabaseConfigured()) {
    throw new Error("Supabase não configurado.");
  }

  const { error } = await supabase
    .from("customers")
    .update({ active: true })
    .eq("id", id);

  if (error) {
    console.error("Erro ao ativar cliente no Supabase:", error);
    throw new Error(error.message);
  }
}

export async function deleteCustomerInSupabase(id: string): Promise<void> {
  // Conforme Requisito 8: NÃO permitir exclusão física de clientes que possuam histórico
  await deactivateCustomerInSupabase(id);
}

/**
 * Detalhes completos do cliente com veículos e histórico de agendamentos (Requisitos 9, 10, 11, 12, 18)
 */
export async function fetchCustomerDetailsFromSupabase(id: string): Promise<{
  customer: Customer;
  vehicles: Vehicle[];
  appointments: Appointment[];
  totalVehicles: number;
  totalAppointments: number;
  completedAppointments: number;
  totalHistoricalRevenue: number;
  lastAppointment: Appointment | null;
}> {
  if (!supabase || !isSupabaseConfigured()) {
    throw new Error("Supabase não configurado.");
  }

  const [custRes, vehRes, appRes] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).single(),
    supabase.from("vehicles").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
    supabase
      .from("appointments")
      .select("*, service:services(*), vehicle:vehicles(*)")
      .eq("customer_id", id)
      .order("scheduled_date", { ascending: false })
      .order("start_time", { ascending: false }),
  ]);

  if (custRes.error || !custRes.data) {
    throw new Error("Cliente não encontrado.");
  }

  const customer = custRes.data as Customer;
  const vehicles = (vehRes.data as Vehicle[]) || [];
  const appointments = (appRes.data as Appointment[]) || [];

  const completed = appointments.filter((a) => a.status === "completed");
  const totalRevenue = completed.reduce((acc, a) => acc + (Number(a.price) || 0), 0);
  const lastAppointment = appointments.length > 0 ? appointments[0] : null;

  return {
    customer,
    vehicles,
    appointments,
    totalVehicles: vehicles.length,
    totalAppointments: appointments.length,
    completedAppointments: completed.length,
    totalHistoricalRevenue: totalRevenue,
    lastAppointment,
  };
}
