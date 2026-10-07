import { AuditLog } from "@/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

export type AuditActionType =
  | "settings.updated"
  | "business_hours.updated"
  | "schedule_block.created"
  | "schedule_block.deleted"
  | "user.created"
  | "user.role_changed"
  | "user.activated"
  | "user.deactivated"
  | "payment.created"
  | "payment.cancelled"
  | "cash.opened"
  | "cash.closed"
  | "appointment.cancelled"
  | "appointment.status_changed"
  | "appointment.completed"
  | "appointment.ready"
  | "appointment.delivered"
  | "appointment.delivery_override"
  | "checkin.created"
  | "checkin.updated"
  | "damage.added"
  | "damage.removed"
  | "photo.added"
  | "photo.removed"
  | "review.created"
  | "review.updated"
  | "customer_tag.assigned"
  | "customer_tag.removed"
  | "vip_settings.updated";

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "settings.updated": "Alteração de Configurações",
  "business_hours.updated": "Alteração de Horários de Funcionamento",
  "schedule_block.created": "Criação de Bloqueio/Feriado",
  "schedule_block.deleted": "Remoção de Bloqueio/Feriado",
  "user.created": "Criação/Convite de Usuário",
  "user.role_changed": "Alteração de Função/Permissão",
  "user.activated": "Reativação de Usuário",
  "user.deactivated": "Desativação de Usuário",
  "payment.created": "Recebimento de Pagamento",
  "payment.cancelled": "Cancelamento/Estorno de Pagamento",
  "cash.opened": "Abertura de Caixa Diário",
  "cash.closed": "Fechamento de Caixa Diário",
  "appointment.cancelled": "Cancelamento de Agendamento",
  "appointment.status_changed": "Alteração de Status de Atendimento",
  "appointment.completed": "Conclusão de Serviço/Lavagem",
  "appointment.ready": "Veículo Marcado como Pronto",
  "appointment.delivered": "Entrega de Veículo ao Cliente",
  "appointment.delivery_override": "Liberação de Entrega com Pendência",
  "checkin.created": "Realização de Check-in de Veículo",
  "checkin.updated": "Edição de Check-in de Veículo",
  "damage.added": "Registro de Avaria em Veículo",
  "damage.removed": "Remoção de Avaria de Veículo",
  "photo.added": "Upload de Foto de Check-in",
  "photo.removed": "Remoção de Foto de Check-in",
  "review.created": "Registro de Avaliação de Atendimento",
  "review.updated": "Atualização de Avaliação",
  "customer_tag.assigned": "Atribuição de Tag a Cliente",
  "customer_tag.removed": "Remoção de Tag de Cliente",
  "vip_settings.updated": "Atualização de Critérios VIP/Retenção",
};

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  settings: "Configurações",
  business_hours: "Horários",
  schedule_block: "Bloqueio de Agenda",
  user: "Usuário",
  payment: "Pagamento",
  cash: "Caixa Diário",
  appointment: "Agendamento",
  vehicle_checkin: "Check-in do Veículo",
  vehicle_damage: "Avaria do Veículo",
  service_review: "Avaliação de Atendimento",
  customer_tag: "Tag de Cliente",
};

/**
 * Busca logs de auditoria no Supabase
 */
export async function fetchAuditLogsFromSupabase(limit = 100): Promise<AuditLog[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  try {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("Erro ao buscar audit_logs no Supabase:", error.message);
      return [];
    }

    return (data || []) as AuditLog[];
  } catch (err) {
    console.error("Falha ao comunicar com tabela de auditoria:", err);
    return [];
  }
}

/**
 * Insere um novo registro de auditoria no Supabase
 */
export async function insertAuditLogInSupabase(
  payload: Omit<AuditLog, "id" | "created_at">
): Promise<AuditLog | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  try {
    const { data, error } = await supabase
      .from("audit_logs")
      .insert({
        user_id: payload.user_id || null,
        user_name: payload.user_name || "Sistema",
        action: payload.action,
        entity: payload.entity,
        entity_id: payload.entity_id || null,
        metadata: payload.metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.warn("Falha ao persistir audit_log no Supabase:", error.message);
      return null;
    }

    return data as AuditLog;
  } catch (err) {
    console.error("Erro inesperado ao registrar auditoria:", err);
    return null;
  }
}
