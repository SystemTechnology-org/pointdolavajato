import { Service, VehicleType } from "@/types/database";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

export function isServiceCompatibleWithVehicle(
  service: Service,
  vehicleType: VehicleType
): boolean {
  return service.vehicle_type === vehicleType;
}

export async function fetchServicesFromSupabase(
  vehicleType?: VehicleType
): Promise<Service[]> {
  if (!supabase || !isSupabaseConfigured()) return [];

  let query = supabase
    .from("services")
    .select("*")
    .eq("active", true)
    .order("price", { ascending: true });

  if (vehicleType) {
    query = query.eq("vehicle_type", vehicleType);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Erro ao buscar serviços no Supabase:", error);
    throw new Error(error.message);
  }

  return (data as Service[]) || [];
}

export async function updateServiceInSupabase(
  id: string,
  payload: Partial<Service>
): Promise<Service> {
  if (!supabase || !isSupabaseConfigured()) {
    throw new Error("Supabase não configurado.");
  }

  if (payload.price !== undefined && payload.price < 0) {
    throw new Error("O preço do serviço não pode ser negativo.");
  }

  if (payload.duration_minutes !== undefined && payload.duration_minutes <= 0) {
    throw new Error("A duração do serviço deve ser maior que zero.");
  }

  const { data, error } = await supabase
    .from("services")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Erro ao atualizar serviço no Supabase:", error);
    throw new Error(error.message);
  }

  return data as Service;
}

export async function createServiceInSupabase(
  payload: Omit<Service, "id" | "created_at" | "updated_at">
): Promise<Service> {
  if (!supabase || !isSupabaseConfigured()) {
    throw new Error("Supabase não configurado.");
  }

  if (payload.price < 0) {
    throw new Error("O preço do serviço não pode ser negativo.");
  }

  if (payload.duration_minutes <= 0) {
    throw new Error("A duração do serviço deve ser maior que zero.");
  }

  const { data, error } = await supabase
    .from("services")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("Erro ao cadastrar serviço no Supabase:", error);
    throw new Error(error.message);
  }

  return data as Service;
}

export async function fetchAllServicesFromSupabase(): Promise<Service[]> {
  if (!supabase || !isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("price", { ascending: true });

  if (error) {
    console.error("Erro ao carregar todos os serviços no Supabase:", error);
    throw new Error(error.message);
  }

  return (data as Service[]) || [];
}

export async function deactivateServiceInSupabase(id: string): Promise<Service> {
  return updateServiceInSupabase(id, { active: false });
}

export async function activateServiceInSupabase(id: string): Promise<Service> {
  return updateServiceInSupabase(id, { active: true });
}
