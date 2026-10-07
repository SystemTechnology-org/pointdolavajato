import { UserRole, PermissionKey, Profile } from "@/types";

export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  description: string;
  category: "Cadastros" | "Operacional" | "Financeiro" | "Administração";
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // Cadastros
  {
    key: "customers.view",
    label: "Visualizar clientes",
    description: "Permite listar clientes e acessar histórico de atendimentos.",
    category: "Cadastros",
  },
  {
    key: "customers.create",
    label: "Cadastrar clientes",
    description: "Permite registrar novos clientes na base do lava-jato.",
    category: "Cadastros",
  },
  {
    key: "customers.edit",
    label: "Editar clientes",
    description: "Permite alterar dados de contato, notas e status de clientes.",
    category: "Cadastros",
  },
  {
    key: "vehicles.view",
    label: "Visualizar veículos",
    description: "Permite consultar veículos cadastrados, modelos e placas.",
    category: "Cadastros",
  },
  {
    key: "services.view",
    label: "Visualizar serviços",
    description: "Permite consultar os serviços e tabela de preços ativa.",
    category: "Cadastros",
  },
  {
    key: "services.manage",
    label: "Gerenciar serviços",
    description: "Permite criar, alterar preços, duração e desativar serviços.",
    category: "Cadastros",
  },

  // Operacional
  {
    key: "appointments.view",
    label: "Visualizar agenda",
    description: "Permite consultar a agenda de agendamentos e horários.",
    category: "Operacional",
  },
  {
    key: "appointments.manage",
    label: "Gerenciar agendamentos",
    description: "Permite criar, editar, reagendar e cancelar agendamentos.",
    category: "Operacional",
  },
  {
    key: "attendance.manage",
    label: "Operar atendimento",
    description: "Permite avançar status da fila (fila, em atendimento, finalizar, checklists).",
    category: "Operacional",
  },
  {
    key: "attendance.complete",
    label: "Concluir lavagem/serviço",
    description: "Permite finalizar a execução técnica do serviço no box.",
    category: "Operacional",
  },
  {
    key: "attendance.ready",
    label: "Marcar veículo como pronto",
    description: "Permite realizar conferência final de saída e sinalizar veículo pronto.",
    category: "Operacional",
  },
  {
    key: "attendance.deliver",
    label: "Realizar entrega do veículo",
    description: "Permite realizar o checkout operacional e entregar o carro ao cliente.",
    category: "Operacional",
  },
  {
    key: "checkin.create",
    label: "Realizar check-in",
    description: "Permite realizar checklist visual, registrar avarias, fotos e conferir pertences na recepção.",
    category: "Operacional",
  },
  {
    key: "checkin.manage",
    label: "Gerenciar/editar check-in",
    description: "Permite alterar check-ins finalizados, editar avarias e retificar vistorias.",
    category: "Operacional",
  },

  // Financeiro
  {
    key: "payments.view",
    label: "Visualizar pagamentos",
    description: "Permite consultar pagamentos recebidos dos atendimentos.",
    category: "Financeiro",
  },
  {
    key: "payments.create",
    label: "Registrar pagamentos",
    description: "Permite receber valores via PIX, dinheiro ou cartão.",
    category: "Financeiro",
  },
  {
    key: "payment.override",
    label: "Liberar entrega com pendência",
    description: "Permite autorizar a entrega de veículo com saldo em aberto mediante justificativa.",
    category: "Financeiro",
  },
  {
    key: "cash.view",
    label: "Visualizar caixa",
    description: "Permite consultar o saldo em dinheiro e movimentações.",
    category: "Financeiro",
  },
  {
    key: "cash.manage",
    label: "Gerenciar caixa diário",
    description: "Permite abrir/fechar caixa, registrar sangrias, despesas e troco.",
    category: "Financeiro",
  },
  {
    key: "reports.view",
    label: "Relatórios e Métricas",
    description: "Permite acessar métricas de receita, ticket médio e relatórios gerenciais.",
    category: "Financeiro",
  },

  // Administração
  {
    key: "settings.manage",
    label: "Configurações da empresa",
    description: "Permite configurar dados do lava-jato, horários de funcionamento e regras.",
    category: "Administração",
  },
  {
    key: "users.manage",
    label: "Gerenciar usuários",
    description: "Permite cadastrar, convidar, alterar permissões e desativar membros da equipe.",
    category: "Administração",
  },
  {
    key: "audit.view",
    label: "Auditoria do sistema",
    description: "Permite consultar o histórico imutável de ações críticas realizadas.",
    category: "Administração",
  },

  // Comercial, Retenção & Avaliações (Etapa 12)
  {
    key: "reviews.view",
    label: "Visualizar avaliações",
    description: "Permite consultar as avaliações de clientes e notas de atendimentos.",
    category: "Operacional",
  },
  {
    key: "reviews.manage",
    label: "Gerenciar avaliações",
    description: "Permite registrar e gerenciar avaliações e feedbacks de clientes.",
    category: "Operacional",
  },
  {
    key: "customer_tags.manage",
    label: "Gerenciar tags de clientes",
    description: "Permite atribuir e remover marcadores (VIP, Recorrente, etc.) de clientes.",
    category: "Cadastros",
  },
  {
    key: "reports.commercial",
    label: "Relatórios comerciais e retenção",
    description: "Permite consultar ranking de clientes, clientes inativos e inteligência comercial.",
    category: "Financeiro",
  },
];

const ALL_PERMISSIONS: PermissionKey[] = PERMISSION_DEFINITIONS.map((p) => p.key);

export const ROLE_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  admin: ALL_PERMISSIONS,
  owner: ALL_PERMISSIONS,
  manager: [
    "customers.view",
    "customers.create",
    "customers.edit",
    "vehicles.view",
    "services.view",
    "services.manage",
    "appointments.view",
    "appointments.manage",
    "attendance.manage",
    "attendance.complete",
    "attendance.ready",
    "attendance.deliver",
    "checkin.create",
    "checkin.manage",
    "payments.view",
    "payments.create",
    "payment.override",
    "cash.view",
    "reports.view",
    "reviews.view",
    "reviews.manage",
    "customer_tags.manage",
    "reports.commercial",
  ],
  employee: [
    "customers.view",
    "customers.create",
    "vehicles.view",
    "services.view",
    "appointments.view",
    "attendance.manage",
    "attendance.complete",
    "attendance.ready",
    "attendance.deliver",
    "checkin.create",
    "reviews.view",
  ],
};

/**
 * Verifica se um papel possui uma permissão específica
 */
export function hasPermission(role: UserRole, permission: PermissionKey): boolean {
  const allowed = ROLE_PERMISSIONS[role] || [];
  return allowed.includes(permission);
}

/**
 * Retorna lista de permissões concedidas para uma função
 */
export function getPermissionsForRole(role: UserRole): PermissionKey[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Requisito 19: Proteção do Último Administrador Ativo
 * Verifica se um usuário é o único administrador ativo do sistema.
 */
export function isLastActiveAdmin(profiles: Profile[], userId: string): boolean {
  const activeAdmins = profiles.filter(
    (p) => (p.role === "admin" || p.role === "owner") && p.active
  );

  if (activeAdmins.length <= 1) {
    return activeAdmins.some((p) => p.id === userId);
  }

  return false;
}

/**
 * Valida se é seguro alterar a função ou o status de ativação de um usuário
 */
export function canDeactivateOrDemoteUser(
  profiles: Profile[],
  targetUserId: string,
  newRole?: UserRole,
  newActive?: boolean
): { allowed: boolean; reason?: string } {
  const target = profiles.find((p) => p.id === targetUserId);
  if (!target) {
    return { allowed: false, reason: "Usuário não encontrado." };
  }

  const isCurrentAdmin = (target.role === "admin" || target.role === "owner") && target.active;
  if (!isCurrentAdmin) {
    return { allowed: true };
  }

  const willLoseAdminRole = newRole !== undefined && newRole !== "admin" && newRole !== "owner";
  const willBeDeactivated = newActive === false;

  if (willLoseAdminRole || willBeDeactivated) {
    if (isLastActiveAdmin(profiles, targetUserId)) {
      return {
        allowed: false,
        reason: "É necessário manter pelo menos um administrador ativo.",
      };
    }
  }

  return { allowed: true };
}
