// ==============================================================================
// src/lib/services/reviewsAndTags.ts
// Integração de Avaliações (Reviews) e Tags de Clientes com o Supabase
// ETAPA 12 — Point do Coco Lava Jato
// ==============================================================================

import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { ServiceReview, CustomerTag, CustomerTagAssignment } from "@/types";

/**
 * Busca avaliações de atendimento no Supabase
 */
export async function fetchServiceReviewsFromSupabase(): Promise<ServiceReview[]> {
  if (!supabase || !isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from("service_reviews")
      .select("*, customer:customers(full_name), appointment:appointments(code, price, scheduled_date)")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Tabela service_reviews indisponível no Supabase ou erro de RLS:", error.message);
      return [];
    }

    type ReviewRowWithRelations = ServiceReview & {
      customer?: { full_name?: string } | null;
      appointment?: { code?: string; price?: number; scheduled_date?: string } | null;
    };

    return (data as ReviewRowWithRelations[]).map((r) => ({
      id: r.id,
      appointment_id: r.appointment_id,
      customer_id: r.customer_id,
      rating: r.rating,
      comment: r.comment || null,
      created_by: r.created_by || null,
      created_at: r.created_at,
      updated_at: r.updated_at,
      customer_name: r.customer?.full_name || undefined,
    }));
  } catch (err) {
    console.warn("Exceção ao buscar service_reviews no Supabase:", err);
    return [];
  }
}

/**
 * Salva ou atualiza uma avaliação no Supabase (upsert baseado em appointment_id)
 */
export async function upsertServiceReviewInSupabase(review: {
  appointment_id: string;
  customer_id: string;
  rating: number;
  comment?: string | null;
  created_by?: string | null;
}): Promise<ServiceReview | null> {
  if (!supabase || !isSupabaseConfigured()) return null;

  try {
    const payload = {
      appointment_id: review.appointment_id,
      customer_id: review.customer_id,
      rating: review.rating,
      comment: review.comment?.trim() || null,
      created_by: review.created_by || null,
    };

    const { data, error } = await supabase
      .from("service_reviews")
      .upsert(payload, { onConflict: "appointment_id" })
      .select("*")
      .single();

    if (error) {
      console.warn("Erro ao salvar avaliação no Supabase:", error.message);
      return null;
    }

    return data as ServiceReview;
  } catch (err) {
    console.warn("Exceção ao salvar avaliação no Supabase:", err);
    return null;
  }
}

/**
 * Busca tags cadastradas no Supabase
 */
export async function fetchCustomerTagsFromSupabase(): Promise<CustomerTag[]> {
  if (!supabase || !isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from("customer_tags")
      .select("*")
      .order("name");

    if (error) {
      console.warn("Tabela customer_tags indisponível no Supabase:", error.message);
      return [];
    }

    return data as CustomerTag[];
  } catch (err) {
    console.warn("Exceção ao buscar customer_tags no Supabase:", err);
    return [];
  }
}

/**
 * Busca atribuições de tags aos clientes no Supabase
 */
export async function fetchCustomerTagAssignmentsFromSupabase(): Promise<CustomerTagAssignment[]> {
  if (!supabase || !isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from("customer_tag_assignments")
      .select("*");

    if (error) {
      console.warn("Tabela customer_tag_assignments indisponível no Supabase:", error.message);
      return [];
    }

    return data as CustomerTagAssignment[];
  } catch (err) {
    console.warn("Exceção ao buscar customer_tag_assignments no Supabase:", err);
    return [];
  }
}

/**
 * Atribui uma tag a um cliente no Supabase
 */
export async function assignCustomerTagInSupabase(
  customerId: string,
  tagName: string,
  createdBy?: string | null
): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from("customer_tag_assignments")
      .upsert(
        {
          customer_id: customerId,
          tag_name: tagName,
          created_by: createdBy || null,
        },
        { onConflict: "customer_id,tag_name" }
      );

    if (error) {
      console.warn("Erro ao vincular tag no Supabase:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Exceção ao vincular tag no Supabase:", err);
    return false;
  }
}

/**
 * Remove a atribuição de uma tag de um cliente no Supabase
 */
export async function removeCustomerTagInSupabase(
  customerId: string,
  tagName: string
): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from("customer_tag_assignments")
      .delete()
      .match({ customer_id: customerId, tag_name: tagName });

    if (error) {
      console.warn("Erro ao remover tag no Supabase:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Exceção ao remover tag no Supabase:", err);
    return false;
  }
}
