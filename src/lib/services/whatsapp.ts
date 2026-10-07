// ==============================================================================
// src/lib/services/whatsapp.ts
// Utilitários de normalização de telefone, templates de mensagens e logs
// ETAPA 8 — Point do Coco Lava Jato
// ==============================================================================

import { CommunicationLog } from "@/types/database";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

// ==============================================================================
// 1. NORMALIZAÇÃO CENTRALIZADA DE TELEFONE (Requisito 11)
// ==============================================================================

/**
 * Normaliza e valida número para envio via WhatsApp wa.me.
 * Adiciona o código do Brasil (55) quando omitido e rejeita números inválidos.
 * Não altera a string original do banco.
 */
export function formatWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone || typeof phone !== "string") return null;

  // 1. Remove qualquer caractere não numérico
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  // 2. Se iniciar com '0' e tiver mais de 10 dígitos (ex: discagem interurbana 0719...), remove o 0
  if (digits.startsWith("0") && digits.length >= 11) {
    digits = digits.slice(1);
  }

  // 3. Validação do padrão brasileiro:
  // - 10 dígitos: DDD (2) + Fixo (8) -> ex: 7132441010
  // - 11 dígitos: DDD (2) + Celular (9) -> ex: 71991234567
  if (digits.length === 10 || digits.length === 11) {
    // DDDs válidos no Brasil variam de 11 a 99
    const ddd = parseInt(digits.slice(0, 2), 10);
    if (ddd >= 11 && ddd <= 99) {
      return `55${digits}`;
    }
    return null;
  }

  // Se já vier com código do Brasil (55):
  // - 12 dígitos: 55 + DDD (2) + 8 dígitos
  // - 13 dígitos: 55 + DDD (2) + 9 dígitos
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    const ddd = parseInt(digits.slice(2, 4), 10);
    if (ddd >= 11 && ddd <= 99) {
      return digits;
    }
    return null;
  }

  // Demais formatos ou comprimentos são considerados inválidos
  return null;
}

/**
 * Checa se o telefone informado é um WhatsApp válido
 */
export function isValidWhatsAppNumber(phone: string | null | undefined): boolean {
  return formatWhatsAppNumber(phone) !== null;
}

/**
 * Formata telefone para exibição visual amigável (ex: (71) 99123-4567)
 */
export function formatPhoneFriendlyDisplay(phone: string | null | undefined): string {
  if (!phone) return "Não informado";
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) {
    digits = digits.slice(2);
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

/**
 * Gera a URL oficial wa.me pronta para abertura do WhatsApp.
 * Retorna null caso o número seja inválido (Requisito 2 e 10).
 */
export function generateWhatsAppLink(
  phone: string | null | undefined,
  message?: string
): string | null {
  const formatted = formatWhatsAppNumber(phone);
  if (!formatted) return null;

  if (message && message.trim()) {
    return `https://wa.me/${formatted}?text=${encodeURIComponent(message.trim())}`;
  }

  return `https://wa.me/${formatted}`;
}

// ==============================================================================
// 2. MOTOR DE SUBSTITUIÇÃO SEGURA DE VARIÁVEIS (Requisito 28)
// ==============================================================================

export interface WhatsAppTemplateVariables {
  cliente?: string;
  servico?: string;
  veiculo?: string;
  data?: string;
  horario?: string;
  valor?: string | number;
  pago?: string | number;
  saldo?: string | number;
  empresa?: string;
  codigo?: string;
}

/**
 * Substitui placeholders {{variavel}} sem usar eval por segurança estrita.
 */
export function renderTemplate(
  template: string,
  variables: WhatsAppTemplateVariables
): string {
  const varsWithDefaults: Record<string, string> = {
    cliente: variables.cliente || "Cliente",
    servico: variables.servico || "Serviço",
    veiculo: variables.veiculo || "Veículo",
    data: variables.data || "",
    horario: variables.horario || "",
    valor:
      variables.valor !== undefined && variables.valor !== null
        ? typeof variables.valor === "number"
          ? variables.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : String(variables.valor)
        : "0,00",
    pago:
      variables.pago !== undefined && variables.pago !== null
        ? typeof variables.pago === "number"
          ? variables.pago.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : String(variables.pago)
        : "0,00",
    saldo:
      variables.saldo !== undefined && variables.saldo !== null
        ? typeof variables.saldo === "number"
          ? variables.saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : String(variables.saldo)
        : "0,00",
    empresa: variables.empresa || "Point do Coco Lava Jato",
    codigo: variables.codigo || "",
  };

  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    return varsWithDefaults[key] !== undefined ? varsWithDefaults[key] : "";
  });
}

// ==============================================================================
// 3. TEMPLATES CENTRALIZADOS DE MENSAGENS (Requisitos 3 a 9, 12 e 19)
// ==============================================================================

export const RAW_TEMPLATES = {
  // Contato geral
  generalContact:
    "Olá, {{cliente}}! Aqui é do {{empresa}}. Podemos falar sobre seu atendimento?",

  // Confirmação de agendamento (Requisito 5)
  appointmentConfirmation:
    "Olá, {{cliente}}! 👋\n\nSeu agendamento no {{empresa}} foi confirmado.\n\n📅 Data: {{data}}\n⏰ Horário: {{horario}}\n🚗 Veículo: {{veiculo}}\n🧽 Serviço: {{servico}}\n\nAté lá!",

  // Lembrete prévio (Requisito 6)
  appointmentReminder:
    "Olá, {{cliente}}! 👋\n\nPassando para lembrar do seu atendimento no {{empresa}}.\n\n📅 Data: {{data}}\n⏰ Horário: {{horario}}\n🚗 Veículo: {{veiculo}}\n🧽 Serviço: {{servico}}\n\nEsperamos você!",

  // Aguardando início (Requisito 19)
  appointmentWaiting:
    "Olá, {{cliente}}! 👋\n\nSeu atendimento no {{empresa}} está agendado e aguardando o início em breve.\n\n🚗 Veículo: {{veiculo}}\n🧽 Serviço: {{servico}}\n⏰ Horário previsto: {{horario}}\n\nAvisaremos assim que o veículo entrar no box!",

  // Atendimento em andamento (Requisito 7 e 19)
  appointmentInProgress:
    "Olá, {{cliente}}!\n\nSeu veículo já está em atendimento no {{empresa}}. 🚗✨\n\nAssim que finalizarmos, avisaremos você.",

  // Atendimento finalizado / veículo pronto (Requisito 8 e 19)
  appointmentCompleted:
    "Olá, {{cliente}}! 👋\n\nSeu veículo está pronto! 🚗✨\n\nO atendimento foi finalizado.\n\n🧽 Serviço: {{servico}}\n💰 Valor: R$ {{valor}}\n\nObrigado pela preferência!",

  // Cobrança de pagamento pendente (Requisito 9)
  paymentPending:
    "Olá, {{cliente}}!\n\nSeu atendimento no {{empresa}} foi finalizado.\n\n💰 Valor total: R$ {{valor}}\n💳 Valor recebido: R$ {{pago}}\n📌 Saldo pendente: R$ {{saldo}}\n\nCaso precise de alguma informação, estamos à disposição.",

  // ETAPA 11: Veículo pronto para retirada (Quitado)
  vehicleReady:
    "Olá, {{cliente}}! 👋\n\nSeu veículo {{veiculo}} está PRONTO para retirada no {{empresa}}! 🚗✨\n\n🧽 Serviço: {{servico}}\n💰 Pagamento: Quitado\n\nPode vir buscá-lo quando desejar! Obrigado pela preferência.",

  // ETAPA 11: Veículo pronto para retirada (Com saldo pendente)
  vehicleReadyPendingPayment:
    "Olá, {{cliente}}! 👋\n\nSeu veículo {{veiculo}} está PRONTO para retirada no {{empresa}}! 🚗✨\n\n🧽 Serviço: {{servico}}\n💰 Valor total: R$ {{valor}}\n💳 Valor pago: R$ {{pago}}\n📌 Saldo pendente: R$ {{saldo}}\n\nAguardamos você para retirada e acerto!",

  // ETAPA 11: Confirmação de entrega
  vehicleDelivered:
    "Olá, {{cliente}}! 👋\n\nSeu veículo {{veiculo}} foi entregue com sucesso. Agradecemos pela confiança no {{empresa}}! 🚗✨\n\nEsperamos vê-lo novamente em breve!",

  // ETAPA 12: Retenção / Reativação de cliente inativo (Requisito 27)
  customerRetention:
    "Olá, {{cliente}}! Faz um tempo que não vemos seu veículo por aqui no {{empresa}}. 🚗✨\n\nQue tal agendar uma lavagem para manter seu carro sempre protegido e impecável? Estamos com ótimos horários disponíveis!",

  // ETAPA 12: Acompanhamento de feedback negativo (Requisito 16)
  feedbackFollowup:
    "Olá, {{cliente}}! Notamos sua avaliação sobre o atendimento no {{empresa}}. 🤝\n\nSua satisfação é fundamental para nós e gostaríamos de entender melhor como podemos melhorar sua experiência. Podemos conversar?",
};

export const whatsappTemplates = {
  generalContact: (vars: WhatsAppTemplateVariables = {}) =>
    renderTemplate(RAW_TEMPLATES.generalContact, vars),

  appointmentConfirmation: (vars: WhatsAppTemplateVariables = {}) =>
    renderTemplate(RAW_TEMPLATES.appointmentConfirmation, vars),

  appointmentReminder: (vars: WhatsAppTemplateVariables = {}) =>
    renderTemplate(RAW_TEMPLATES.appointmentReminder, vars),

  appointmentWaiting: (vars: WhatsAppTemplateVariables = {}) =>
    renderTemplate(RAW_TEMPLATES.appointmentWaiting, vars),

  appointmentInProgress: (vars: WhatsAppTemplateVariables = {}) =>
    renderTemplate(RAW_TEMPLATES.appointmentInProgress, vars),

  appointmentCompleted: (vars: WhatsAppTemplateVariables = {}) =>
    renderTemplate(RAW_TEMPLATES.appointmentCompleted, vars),

  paymentPending: (vars: WhatsAppTemplateVariables = {}) =>
    renderTemplate(RAW_TEMPLATES.paymentPending, vars),

  vehicleReady: (vars: WhatsAppTemplateVariables = {}) =>
    renderTemplate(RAW_TEMPLATES.vehicleReady, vars),

  vehicleReadyPendingPayment: (vars: WhatsAppTemplateVariables = {}) =>
    renderTemplate(RAW_TEMPLATES.vehicleReadyPendingPayment, vars),

  vehicleDelivered: (vars: WhatsAppTemplateVariables = {}) =>
    renderTemplate(RAW_TEMPLATES.vehicleDelivered, vars),

  customerRetention: (vars: WhatsAppTemplateVariables = {}) =>
    renderTemplate(RAW_TEMPLATES.customerRetention, vars),

  feedbackFollowup: (vars: WhatsAppTemplateVariables = {}) =>
    renderTemplate(RAW_TEMPLATES.feedbackFollowup, vars),
};

// ==============================================================================
// 4. INTEGRAÇÃO COM SUPABASE PARA LOGS DE COMUNICAÇÃO (Requisito 20)
// ==============================================================================

export async function fetchCommunicationLogsFromSupabase(): Promise<CommunicationLog[]> {
  if (!supabase || !isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("communication_logs")
      .select("*, customer:customers(full_name, phone), appointment:appointments(code)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.warn("Tabela communication_logs ainda não disponível no Supabase ou erro de RLS:", error.message);
      return [];
    }

    type LogRowWithRelations = CommunicationLog & {
      customer?: { full_name?: string; phone?: string } | null;
      appointment?: { code?: string } | null;
    };

    return ((data || []) as unknown as LogRowWithRelations[]).map((row) => ({
      id: row.id,
      customer_id: row.customer_id,
      appointment_id: row.appointment_id,
      channel: row.channel,
      type: row.type,
      message_preview: row.message_preview,
      status: row.status,
      created_by: row.created_by,
      created_at: row.created_at,
      customer_name: row.customer?.full_name,
      customer_phone: row.customer?.phone,
      appointment_code: row.appointment?.code,
    }));
  } catch (err) {
    console.error("Erro ao carregar logs de comunicação:", err);
    return [];
  }
}

export async function insertCommunicationLogInSupabase(
  log: Omit<CommunicationLog, "id" | "created_at">
): Promise<CommunicationLog | null> {
  if (!supabase || !isSupabaseConfigured()) {
    return null;
  }

  try {
    // Trunca a prévia para privacidade e performance (máx 200 caracteres, Requisito 22)
    const preview = log.message_preview.length > 200
      ? log.message_preview.slice(0, 197) + "..."
      : log.message_preview;

    const payload = {
      customer_id: log.customer_id || null,
      appointment_id: log.appointment_id || null,
      channel: log.channel || "whatsapp",
      type: log.type,
      message_preview: preview,
      status: log.status || "opened",
      created_by: log.created_by || null,
    };

    const { data, error } = await supabase
      .from("communication_logs")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.warn("Não foi possível persistir o log no Supabase (utilizando fallback local):", error.message);
      return null;
    }

    return data as CommunicationLog;
  } catch (err) {
    console.warn("Erro ao inserir log de comunicação:", err);
    return null;
  }
}
