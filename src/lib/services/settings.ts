import { BusinessSettings, BusinessHour, ScheduleBlock, Profile, UserRole } from "@/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * Atualiza as configurações gerais da empresa no Supabase
 */
export async function updateBusinessSettingsInSupabase(
  id: string,
  updates: Partial<BusinessSettings>
): Promise<BusinessSettings | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  try {
    const { data, error } = await supabase
      .from("business_settings")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.warn("Erro ao atualizar business_settings no Supabase:", error.message);
      return null;
    }

    return data as BusinessSettings;
  } catch (err) {
    console.error("Falha ao salvar business_settings no Supabase:", err);
    return null;
  }
}

/**
 * Atualiza múltiplos horários de funcionamento no Supabase
 */
export async function updateBusinessHoursInSupabase(
  hours: BusinessHour[]
): Promise<BusinessHour[] | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  try {
    const { data, error } = await supabase
      .from("business_hours")
      .upsert(hours, { onConflict: "day_of_week" })
      .select();

    if (error) {
      console.warn("Erro ao atualizar business_hours no Supabase:", error.message);
      return null;
    }

    return (data || []) as BusinessHour[];
  } catch (err) {
    console.error("Falha ao salvar business_hours no Supabase:", err);
    return null;
  }
}

/**
 * Insere um novo bloqueio de agenda no Supabase
 */
export async function insertScheduleBlockInSupabase(
  block: Omit<ScheduleBlock, "id" | "created_at">
): Promise<ScheduleBlock | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  try {
    const { data, error } = await supabase
      .from("schedule_blocks")
      .insert({
        start_datetime: block.start_datetime,
        end_datetime: block.end_datetime,
        reason: block.reason,
        created_by: block.created_by || null,
      })
      .select()
      .single();

    if (error) {
      console.warn("Erro ao inserir schedule_block no Supabase:", error.message);
      return null;
    }

    return data as ScheduleBlock;
  } catch (err) {
    console.error("Falha ao salvar schedule_block no Supabase:", err);
    return null;
  }
}

/**
 * Remove um bloqueio de agenda no Supabase
 */
export async function deleteScheduleBlockInSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  try {
    const { error } = await supabase
      .from("schedule_blocks")
      .delete()
      .eq("id", id);

    if (error) {
      console.warn("Erro ao deletar schedule_block no Supabase:", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Falha ao remover schedule_block no Supabase:", err);
    return false;
  }
}

/**
 * Busca perfis de usuários cadastrados no Supabase
 */
export async function fetchProfilesFromSupabase(): Promise<Profile[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("Erro ao buscar profiles no Supabase:", error.message);
      return [];
    }

    return (data || []) as Profile[];
  } catch (err) {
    console.error("Falha ao consultar perfis no Supabase:", err);
    return [];
  }
}

/**
 * Atualiza papel (role) de um usuário no Supabase
 */
export async function updateProfileRoleInSupabase(
  id: string,
  role: UserRole
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  try {
    const { error } = await supabase
      .from("profiles")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.warn("Erro ao atualizar papel do perfil:", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Falha ao atualizar papel do perfil:", err);
    return false;
  }
}

/**
 * Atualiza status (active/inactive) de um usuário no Supabase
 */
export async function updateProfileActiveInSupabase(
  id: string,
  active: boolean
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  try {
    const { error } = await supabase
      .from("profiles")
      .update({ active, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.warn("Erro ao atualizar status do perfil:", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Falha ao atualizar status do perfil:", err);
    return false;
  }
}
