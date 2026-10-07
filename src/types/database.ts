export type UserRole = "admin" | "employee" | "owner" | "manager";

export type VehicleType = "moto" | "car_small" | "suv" | "pickup";

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "waiting"
  | "in_progress"
  | "completed"
  | "ready"
  | "awaiting_payment"
  | "awaiting_pickup"
  | "delivered"
  | "cancelled"
  | "no_show";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  avatar_url?: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  full_name: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  vehicles?: Vehicle[];
}

export interface Vehicle {
  id: string;
  customer_id: string;
  vehicle_type: VehicleType;
  brand?: string | null;
  model: string;
  color?: string | null;
  plate?: string | null;
  notes?: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  customer?: Customer;
}

export interface Service {
  id: string;
  name: string;
  description?: string | null;
  vehicle_type: VehicleType;
  price: number;
  duration_minutes: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  customer_id: string;
  vehicle_id: string;
  service_id: string;
  scheduled_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  status: AppointmentStatus;
  price: number; // SNAPSHOT DO PREÇO NO MOMENTO DO AGENDAMENTO
  notes?: string | null;
  code?: string | null;
  cancel_token?: string | null;
  confirmed_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  completed_by?: string | null;
  completed_by_name?: string | null;
  ready_at?: string | null;
  ready_by?: string | null;
  ready_by_name?: string | null;
  delivered_at?: string | null;
  delivered_by?: string | null;
  delivered_by_name?: string | null;
  cancelled_at?: string | null;
  no_show_at?: string | null;
  cancellation_reason?: string | null;
  checklist?: Record<string, boolean | string> | null;
  checkout_checklist?: Record<string, boolean> | null;
  final_notes?: string | null;
  final_rating?: number | null;
  final_feedback?: string | null;
  delivery_override_reason?: string | null;
  vehicle_photos?: string[] | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  // Relacionamentos expandidos
  customer?: Customer;
  vehicle?: Vehicle;
  service?: Service;
}

export interface AppointmentStatusHistory {
  id: string;
  appointment_id: string;
  old_status?: AppointmentStatus | null;
  new_status: AppointmentStatus;
  changed_by?: string | null;
  changed_at: string;
  notes?: string | null;
}

export interface BusinessSettings {
  id: string;
  business_name: string;
  commercial_name?: string | null;
  phone?: string | null;
  whatsapp: string;
  email?: string | null;
  address?: string | null;
  address_number?: string | null;
  address_complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  logo_url?: string | null;
  description?: string | null;
  timezone: string;
  currency?: string;
  appointment_interval: number;
  minimum_advance_minutes?: number;
  maximum_advance_days?: number;
  cancellation_deadline_minutes?: number;
  allow_rescheduling?: boolean;
  reschedule_deadline_minutes?: number;
  buffer_between_services_minutes?: number;
  allow_overbooking?: boolean;
  allow_same_day_booking?: boolean;
  allow_booking_without_plate?: boolean;
  require_phone?: boolean;
  require_name?: boolean;
  // Etapa 8: Campos de comunicação e automação futura
  whatsapp_enabled?: boolean;
  automatic_confirmation?: boolean;
  automatic_reminder?: boolean;
  automatic_completion_message?: boolean;
  automatic_payment_reminder?: boolean;
  instagram_url?: string | null;
  // Etapa 10: Check-in obrigatório antes de iniciar atendimento
  require_checkin_to_start?: boolean;
  // Etapa 12: Parâmetros de Fidelização, VIP e Inatividade de Clientes
  vip_min_spent?: number;
  vip_min_visits?: number;
  inactive_threshold_days?: number;
  created_at: string;
  updated_at: string;
}

export interface BusinessHour {
  id: string;
  day_of_week: number; // 0 a 6 (0 = Domingo)
  is_open: boolean;
  opening_time: string;
  closing_time: string;
  break_start?: string | null;
  break_end?: string | null;
}

export interface ScheduleBlock {
  id: string;
  start_datetime: string;
  end_datetime: string;
  reason: string;
  created_by?: string | null;
  created_at: string;
}

// Labels e Helpers para a Interface
export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  moto: "Moto",
  car_small: "Carro pequeno",
  suv: "SUV",
  pickup: "Caminhonete",
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  waiting: "Aguardando",
  in_progress: "Em atendimento",
  completed: "Lavagem Concluída",
  ready: "Veículo Pronto",
  awaiting_payment: "Aguardando Pagamento",
  awaiting_pickup: "Aguardando Retirada",
  delivered: "Entregue",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};

// ==============================================================================
// ETAPA 6: FINANCEIRO E CONTROLE DE CAIXA
// ==============================================================================
export type PaymentMethod = "dinheiro" | "pix" | "debito" | "credito";
export type PaymentStatus = "pending" | "paid" | "cancelled";
export type CashRegisterStatus = "open" | "closed";
export type CashMovementType = "income" | "expense" | "reversal";

export interface Payment {
  id: string;
  appointment_id: string;
  amount: number;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  paid_at: string;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  appointment?: Appointment;
}

export interface CashRegister {
  id: string;
  opened_at: string;
  closed_at?: string | null;
  opening_balance: number;
  closing_balance?: number | null;
  counted_balance?: number | null;
  difference?: number | null;
  status: CashRegisterStatus;
  opened_by?: string | null;
  closed_by?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CashMovement {
  id: string;
  cash_register_id: string;
  appointment_id?: string | null;
  payment_id?: string | null;
  type: CashMovementType;
  category: string;
  amount: number;
  payment_method: PaymentMethod;
  description?: string | null;
  created_by?: string | null;
  created_at: string;
}

export type AppointmentFinancialStatus = "pending" | "partial" | "paid";

export interface AppointmentPaymentSummary {
  appointmentId: string;
  totalPrice: number;
  totalPaid: number;
  remainingBalance: number;
  status: AppointmentFinancialStatus;
  paymentsCount: number;
  payments: Payment[];
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  debito: "Cartão de Débito",
  credito: "Cartão de Crédito",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pendente",
  paid: "Pago",
  cancelled: "Cancelado / Estornado",
};

export const CASH_REGISTER_STATUS_LABELS: Record<CashRegisterStatus, string> = {
  open: "Aberto",
  closed: "Fechado",
};

export const CASH_MOVEMENT_TYPE_LABELS: Record<CashMovementType, string> = {
  income: "Entrada",
  expense: "Saída / Despesa",
  reversal: "Estorno",
};

export const EXPENSE_CATEGORIES = [
  "Produtos e insumos",
  "Material de limpeza",
  "Manutenção e ferramentas",
  "Combustível",
  "Alimentação da equipe",
  "Sangria / Retirada",
  "Suprimento de troco",
  "Outros",
] as const;

// ==============================================================================
// ETAPA 8: WHATSAPP E REGISTRO DE COMUNICAÇÃO
// ==============================================================================
export type CommunicationChannel = "whatsapp" | "sms" | "email";

export type CommunicationType =
  | "general"
  | "confirmation"
  | "reminder"
  | "waiting"
  | "in_progress"
  | "completed"
  | "payment_pending"
  | "vehicle_ready"
  | "vehicle_delivered"
  | "customer_retention"
  | "feedback_followup";

export type CommunicationStatus = "prepared" | "opened" | "sent" | "failed";

export interface CommunicationLog {
  id: string;
  customer_id?: string | null;
  appointment_id?: string | null;
  channel: CommunicationChannel;
  type: CommunicationType;
  message_preview: string;
  status: CommunicationStatus;
  created_by?: string | null;
  created_at: string;
  // Metadados convenientes para exibição
  customer_name?: string;
  customer_phone?: string;
  appointment_code?: string;
  created_by_name?: string;
}

export const COMMUNICATION_TYPE_LABELS: Record<CommunicationType, string> = {
  general: "Contato Geral",
  confirmation: "Confirmação de Agendamento",
  reminder: "Lembrete de Horário",
  waiting: "Aviso de Fila/Espera",
  in_progress: "Veículo em Atendimento",
  completed: "Serviço Concluído",
  payment_pending: "Aviso de Pagamento Pendente",
  vehicle_ready: "Veículo Pronto para Retirada",
  vehicle_delivered: "Confirmação de Entrega",
  customer_retention: "Reativação de Cliente Inativo",
  feedback_followup: "Acompanhamento de Avaliação",
};

export const COMMUNICATION_STATUS_LABELS: Record<CommunicationStatus, string> = {
  prepared: "Mensagem preparada",
  opened: "WhatsApp aberto",
  sent: "Enviada (externo)",
  failed: "Falha na comunicação",
};

// ==============================================================================
// ETAPA 9: AUDITORIA, PERMISSÕES E USUÁRIOS
// ==============================================================================
export interface AuditLog {
  id: string;
  user_id?: string | null;
  user_name?: string | null;
  action: string;
  entity: string;
  entity_id?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  owner: "Proprietário",
  manager: "Gerente",
  employee: "Funcionário",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: "Acesso total a todas as funções, relatórios, configurações e usuários.",
  owner: "Proprietário com privilégios completos de gestão administrativa e financeira.",
  manager: "Acesso operacional amplo (clientes, veículos, serviços, agenda, atendimentos e relatórios operacionais).",
  employee: "Acesso operacional restrito para visualização de agenda, atendimento da fila e atualização de status.",
};

export type PermissionKey =
  | "customers.view"
  | "customers.create"
  | "customers.edit"
  | "vehicles.view"
  | "services.view"
  | "services.manage"
  | "appointments.view"
  | "appointments.manage"
  | "attendance.manage"
  | "attendance.complete"
  | "attendance.ready"
  | "attendance.deliver"
  | "payment.override"
  | "payments.view"
  | "payments.create"
  | "cash.view"
  | "cash.manage"
  | "reports.view"
  | "settings.manage"
  | "users.manage"
  | "audit.view"
  | "checkin.create"
  | "checkin.manage"
  | "reviews.view"
  | "reviews.manage"
  | "customer_tags.manage"
  | "reports.commercial";

// ==============================================================================
// ETAPA 10: CHECK-IN DO VEÍCULO, CHECKLIST, AVARIAS E FOTOS
// ==============================================================================

export type FuelLevel = "vazio" | "reserva" | "1/4" | "1/2" | "3/4" | "cheio";
export type VehicleCondition = "otimo" | "bom" | "regular" | "ruim" | "muito_sujo";
export type ChecklistItemStatus = "ok" | "damaged" | "missing" | "not_checked";
export type DamageSeverity = "leve" | "media" | "grave";

export type DamageType =
  | "risco"
  | "amassado"
  | "trinca"
  | "peca_quebrada"
  | "pintura_danificada"
  | "vidro_danificado"
  | "retrovisor_danificado"
  | "roda_danificada"
  | "pneu_danificado"
  | "outro";

export type DamageLocation =
  | "dianteira"
  | "traseira"
  | "lateral_esquerda"
  | "lateral_direita"
  | "teto"
  | "interior"
  | "porta_malas"
  | "rodas"
  | "outro";

export type CheckinPhotoType =
  | "front"
  | "rear"
  | "left_side"
  | "right_side"
  | "interior"
  | "damage"
  | "other"
  | "final_front"
  | "final_rear"
  | "final_left"
  | "final_right"
  | "final_interior"
  | "final_other";

export interface VehicleCheckin {
  id: string;
  appointment_id: string;
  vehicle_id: string;
  customer_id: string;
  mileage?: number | null;
  fuel_level?: FuelLevel | string | null;
  interior_condition?: VehicleCondition | string | null;
  exterior_condition?: VehicleCondition | string | null;
  objects_left_in_vehicle?: string | null;
  general_notes?: string | null;
  confirmed_by?: string | null;
  confirmed_by_name?: string | null;
  confirmed_at: string;
  status: "pending" | "completed";
  created_at: string;
  updated_at: string;
  // Sub-entidades carregadas/associadas
  checklist_items?: VehicleChecklistItem[];
  damages?: VehicleDamage[];
  photos?: VehicleCheckinPhoto[];
}

export interface VehicleChecklistItem {
  id: string;
  checkin_id: string;
  category: "exterior" | "interior" | "accessories";
  item_key: string;
  item_label: string;
  status: ChecklistItemStatus;
  notes?: string | null;
  created_at?: string;
}

export interface VehicleDamage {
  id: string;
  checkin_id: string;
  vehicle_id: string;
  type: DamageType;
  location: DamageLocation;
  specific_part?: string | null;
  severity: DamageSeverity;
  description: string;
  photo_url?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface VehicleCheckinPhoto {
  id: string;
  checkin_id: string;
  vehicle_id: string;
  storage_path: string;
  photo_url: string;
  photo_type: CheckinPhotoType;
  description?: string | null;
  created_by?: string | null;
  created_at: string;
}

// ==============================================================================
// ETAPA 12: AVALIAÇÕES, RETENÇÃO, FIDELIZAÇÃO E INTELIGÊNCIA DE CLIENTES
// ==============================================================================

export interface ServiceReview {
  id: string;
  appointment_id: string;
  customer_id: string;
  rating: number; // 1 a 5
  comment?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  // Campos de exibição/carregados
  appointment?: Appointment;
  customer_name?: string;
  service_name?: string;
  vehicle_plate?: string;
}

export interface CustomerTag {
  id: string;
  name: string;
  color: string;
  description?: string | null;
  created_at: string;
}

export interface CustomerTagAssignment {
  id: string;
  customer_id: string;
  tag_name: string;
  created_by?: string | null;
  created_at: string;
}

export interface CustomerOperationalSummary {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  totalContracted: number;
  totalPaid: number;
  totalPending: number;
  averageTicket: number;
  firstVisitDate: string | null;
  lastVisitDate: string | null;
  daysSinceLastVisit: number | null;
  visitFrequencyDays: number | null; // null significa "Dados insuficientes" (< 2 visitas)
  averageRating: number | null;
  reviewsCount: number;
  isVip: boolean;
  isRecorrente: boolean;
  isNovo: boolean;
  isInativo: boolean;
  tags: string[];
  largestService: {
    service_name: string;
    price: number;
    date: string;
  } | null;
}

export interface CustomerVehicleSummary {
  vehicle_id: string;
  plate: string;
  model: string;
  brand: string;
  type: string;
  visitsCount: number;
  totalSpent: number;
  lastServiceDate: string | null;
  lastServiceName: string | null;
}

export interface CommercialTimelineEvent {
  appointmentId: string;
  date: string;
  time: string;
  serviceName: string;
  vehiclePlate: string;
  vehicleModel: string;
  contractedPrice: number;
  paidAmount: number;
  status: AppointmentStatus | string;
  deliveredAt: string | null;
  review?: {
    id: string;
    rating: number;
    comment?: string | null;
    created_at: string;
  };
}

export interface InactiveCustomerItem {
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  lastVisitDate: string;
  daysSinceLastVisit: number;
  totalCompletedVisits: number;
  totalSpent: number;
  lastServiceName?: string;
  lastVehiclePlate?: string;
}

export interface CustomerRankingItem {
  customerId: string;
  customerName: string;
  customerPhone: string;
  completedVisits: number;
  totalSpentReal: number;
  averageTicket: number;
  lastVisitDate: string | null;
  daysSinceLastVisit: number | null;
  tags: string[];
  isVip: boolean;
}

export interface ReviewDistribution {
  total: number;
  average: number;
  countByRating: Record<1 | 2 | 3 | 4 | 5, number>;
  percentageByRating: Record<1 | 2 | 3 | 4 | 5, number>;
  negativeCount: number; // <= 2 estrelas
  positiveCount: number; // >= 4 estrelas
}




