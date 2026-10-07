"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import {
  Customer,
  Vehicle,
  Service,
  Appointment,
  ResumoMetricas,
  AppointmentStatus,
  VehicleType,
  BusinessSettings,
  BusinessHour,
  ScheduleBlock,
  Cliente,
  Veiculo,
  Servico,
  Agendamento,
  StatusAgendamento,
  MAP_DB_TO_TIPO,
  MAP_TIPO_TO_DB,
  MAP_DB_TO_STATUS,
  MAP_STATUS_TO_DB,
  AppointmentStatusHistory,
  Payment,
  CashRegister,
  CashMovement,
  PaymentMethod,
  AppointmentPaymentSummary,
  PAYMENT_METHOD_LABELS,
  UserRole,
  DateRange,
  PeriodMetrics,
  CommunicationLog,
  CommunicationType,
  CommunicationChannel,
  CommunicationStatus,
  Profile,
  AuditLog,
  PermissionKey,
  VehicleCheckin,
  VehicleChecklistItem,
  VehicleDamage,
  VehicleCheckinPhoto,
  CheckinPhotoType,
  ServiceReview,
  CustomerTag,
  CustomerTagAssignment,
  CustomerOperationalSummary,
  CustomerVehicleSummary,
  CommercialTimelineEvent,
} from "@/types";

import {
  INITIAL_CLIENTES,
  INITIAL_VEICULOS,
  INITIAL_SERVICOS,
  INITIAL_AGENDAMENTOS,
  INITIAL_BUSINESS_SETTINGS,
  INITIAL_BUSINESS_HOURS,
  INITIAL_SCHEDULE_BLOCKS,
  INITIAL_PAYMENTS,
  INITIAL_CASH_REGISTERS,
  INITIAL_CASH_MOVEMENTS,
  INITIAL_COMMUNICATION_LOGS,
  INITIAL_PROFILES,
  INITIAL_AUDIT_LOGS,
  INITIAL_VEHICLE_CHECKINS,
  INITIAL_CUSTOMER_TAGS,
  INITIAL_CUSTOMER_TAG_ASSIGNMENTS,
  INITIAL_SERVICE_REVIEWS,
  getTodayDateString,
} from "./initialData";
import { normalizePhone } from "./services/customers";
import {
  fetchCheckinsFromSupabase,
  insertCheckinInSupabase,
} from "./services/checkin";
import {
  fetchServiceReviewsFromSupabase,
  upsertServiceReviewInSupabase,
  fetchCustomerTagsFromSupabase,
  fetchCustomerTagAssignmentsFromSupabase,
  assignCustomerTagInSupabase,
  removeCustomerTagInSupabase,
} from "./services/reviewsAndTags";
import {
  calculateCustomerMetrics,
  calculateCustomerVehiclesSummary,
  buildCommercialTimeline,
  isCompletedStatus,
} from "./services/customerIntelligence";
import {
  fetchCommunicationLogsFromSupabase,
  insertCommunicationLogInSupabase,
} from "./services/whatsapp";
import {
  checkSlotConflict,
  calculateAvailableSlots,
  generateAppointmentCode,
  generateCancelToken,
  DayAvailabilityResult,
  DEFAULT_SIMULTANEOUS_CAPACITY,
  validateStatusTransition,
  computeRealDurationMinutes,
  computeWaitingForPickupMinutes,
  updateAppointmentStatusInSupabase,
  updateAppointmentInSupabase,
} from "./services/appointments";
import {
  deactivateServiceInSupabase,
  activateServiceInSupabase,
} from "./services/services";
import {
  calculateAppointmentPaymentSummary,
  fetchPaymentsFromSupabase,
  fetchCashRegistersFromSupabase,
  fetchCashMovementsFromSupabase,
  insertPaymentInSupabase,
  updatePaymentStatusInSupabase,
  insertCashRegisterInSupabase,
  closeCashRegisterInSupabase,
  insertCashMovementInSupabase,
} from "./services/financial";
import { calculatePeriodMetrics } from "./services/reports";
import {
  hasPermission,
  canDeactivateOrDemoteUser,
} from "./services/permissions";
import {
  fetchAuditLogsFromSupabase,
  insertAuditLogInSupabase,
} from "./services/audit";
import {
  updateBusinessSettingsInSupabase,
  updateBusinessHoursInSupabase,
  insertScheduleBlockInSupabase,
  deleteScheduleBlockInSupabase,
  fetchProfilesFromSupabase,
  updateProfileRoleInSupabase,
  updateProfileActiveInSupabase,
} from "./services/settings";
import { isSupabaseConfigured, supabase } from "./supabase/client";


interface StoreContextType {
  // Entidades normalizadas
  customers: Customer[];
  vehicles: Vehicle[];
  services: Service[];
  appointments: Appointment[];
  businessSettings: BusinessSettings;
  businessHours: BusinessHour[];
  scheduleBlocks: ScheduleBlock[];

  // Compatibilidade com Etapa 1
  clientes: Cliente[];
  veiculos: Veiculo[];
  servicos: Servico[];
  agendamentos: Agendamento[];

  metricasHoje: ResumoMetricas;
  isLoaded: boolean;
  isSupabaseActive: boolean;

  // Helpers de Agendamento da ETAPA 3
  getAvailableSlotsForDate: (date: string, serviceDuration: number, excludeAppointmentId?: string) => DayAvailabilityResult;
  findCustomerByPhone: (phone: string) => { customer: Customer | null; vehicles: Vehicle[] };

  // Métricas Globais (Requisito 25)
  totalClientesAtivos: number;
  totalVeiculosAtivos: number;
  novosClientesMes: number;

  // CRUD Clientes (Requisitos 6, 7, 8, 23)
  addCustomer: (data: { full_name: string; phone: string; email?: string; notes?: string }) => Promise<Customer>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<void>;
  addCliente: (data: Omit<Cliente, "id" | "created_at">) => Cliente;
  updateCliente: (id: string, data: Partial<Cliente>) => void;
  deleteCliente: (id: string) => void;
  deactivateCliente: (id: string) => void;
  activateCliente: (id: string) => void;
  checkCustomerDuplicate: (phone: string, excludeId?: string) => { exists: boolean; customer?: Cliente };

  // CRUD Veículos (Requisitos 13, 14, 15, 24)
  addVehicle: (data: { customer_id: string; vehicle_type: VehicleType; model: string; plate: string; brand?: string; color?: string; notes?: string }) => Promise<Vehicle>;
  updateVehicle: (id: string, data: Partial<Vehicle>) => Promise<Vehicle>;
  deleteVehicle: (id: string) => Promise<void>;
  addVeiculo: (data: Omit<Veiculo, "id" | "created_at">) => Veiculo;
  updateVeiculo: (id: string, data: Partial<Veiculo>) => void;
  deleteVeiculo: (id: string) => void;
  deactivateVeiculo: (id: string) => void;
  activateVeiculo: (id: string) => void;
  getVeiculosPorCliente: (clienteId: string) => Veiculo[];
  checkVehicleDuplicate: (plate: string, excludeId?: string) => { exists: boolean; vehicle?: Veiculo; clienteNome?: string };

  // Consulta Completa de Histórico (Requisitos 9, 10, 16, 17, 18)
  getClienteDetails: (id: string) => {
    cliente: Cliente | null;
    veiculos: Veiculo[];
    agendamentos: Agendamento[];
    totalAgendamentos: number;
    concluidos: number;
    totalGasto: number;
    ultimoAtendimento: Agendamento | null;
    metrics: CustomerOperationalSummary;
    vehiclesSummary: CustomerVehicleSummary[];
    timeline: CommercialTimelineEvent[];
    reviews: ServiceReview[];
  };
  getVeiculoDetails: (id: string) => {
    veiculo: Veiculo | null;
    cliente: Cliente | null;
    agendamentos: Agendamento[];
    totalAtendimentos: number;
    concluidos: number;
    totalGasto: number;
    ultimoAtendimento: Agendamento | null;
  };

  // CRUD Serviços & Preços Dinâmicos
  updateServicePrice: (id: string, price: number, durationMinutes: number, name?: string, description?: string) => Promise<Service>;
  addService: (data: Omit<Service, "id" | "created_at" | "updated_at">) => Promise<Service>;
  updateServico: (id: string, data: Partial<Servico>) => void;
  addServico: (data: Omit<Servico, "id">) => Servico;
  deactivateServico: (id: string) => void;
  activateServico: (id: string) => void;
  deleteServico: (id: string) => void;

  // Agendamentos (com Snapshot de Preço e Detecção de Conflitos)
  addAppointment: (data: {
    customer_id: string;
    vehicle_id: string;
    service_id: string;
    scheduled_date: string;
    start_time: string;
    end_time?: string;
    notes?: string;
    status?: AppointmentStatus;
  }) => Promise<Appointment>;
  updateAppointmentStatus: (id: string, status: AppointmentStatus) => Promise<void>;
  cancelAppointment: (id: string, reason?: string) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;

  addAgendamento: (dados: Omit<Agendamento, "id" | "created_at">) => Agendamento;
  updateAgendamentoStatus: (
    id: string,
    status: StatusAgendamento,
    options?: { cancellationReason?: string; notes?: string; changedBy?: string }
  ) => void;
  updateAgendamentoNotes: (id: string, notes: string) => void;
  updateAgendamentoChecklist: (id: string, checklist: Record<string, boolean | string>) => void;
  getStatusHistory: (appointmentId: string) => AppointmentStatusHistory[];
  updateAgendamento: (id: string, dados: Partial<Agendamento>) => void;
  deleteAgendamento: (id: string) => void;

  // Fluxo Operacional & Métricas do Dia (ETAPA 5 & 11)
  metricasAtendimentosHoje: {
    aguardando: number;
    emAtendimento: number;
    finalizados: number;
    lavagemConcluida: number;
    prontos: number;
    aguardandoPagamento: number;
    aguardandoRetirada: number;
    entreguesHoje: number;
    naoCompareceram: number;
    cancelados: number;
    total: number;
    tempoMedioLavagemMinutos: number;
    tempoMedioEsperaRetiradaMinutos: number;
  };

  // MÓDULO FINANCEIRO E CAIXA DIÁRIO (ETAPA 6)
  payments: Payment[];
  cashRegisters: CashRegister[];
  cashMovements: CashMovement[];
  activeCashRegister: CashRegister | null;

  getAppointmentPaymentSummary: (appointmentId: string) => AppointmentPaymentSummary;

  addPayment: (data: {
    appointment_id: string;
    amount: number;
    payment_method: PaymentMethod;
    notes?: string;
  }) => Promise<Payment>;

  cancelPayment: (id: string, reason?: string) => Promise<void>;

  openCashRegister: (openingBalance: number, notes?: string) => Promise<CashRegister>;

  closeCashRegister: (countedBalance: number, notes?: string) => Promise<CashRegister>;

  addCashExpense: (data: {
    category: string;
    amount: number;
    description?: string;
    payment_method?: PaymentMethod;
  }) => Promise<CashMovement>;

  metricasFinanceirasHoje: {
    faturamentoPrevistoHoje: number;
    recebidoHoje: number;
    pendenteHoje: number;
    despesasHoje: number;
    saldoCaixaDinheiroHoje: number;
    totalTransacoesHoje: number;
    totalPorMetodoHoje: Record<PaymentMethod, number>;
  };

  // ETAPA 7: CONTROLE DE PERMISSÕES & RELATÓRIOS
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  canViewFinancial: boolean;
  getPeriodMetrics: (dateRange: DateRange) => PeriodMetrics;

  // ETAPA 8: WHATSAPP E REGISTRO DE COMUNICAÇÃO
  communicationLogs: CommunicationLog[];
  logCommunication: (payload: {
    customer_id?: string | null;
    appointment_id?: string | null;
    channel?: CommunicationChannel;
    type: CommunicationType;
    message_preview: string;
    status?: CommunicationStatus;
  }) => Promise<CommunicationLog>;

  // ETAPA 9: CONFIGURAÇÕES, USUÁRIOS, PERMISSÕES E AUDITORIA
  profiles: Profile[];
  auditLogs: AuditLog[];
  updateBusinessSettings: (updates: Partial<BusinessSettings>) => Promise<BusinessSettings>;
  updateBusinessHours: (hours: BusinessHour[]) => Promise<BusinessHour[]>;
  addScheduleBlock: (data: { start_datetime: string; end_datetime: string; reason: string }) => Promise<ScheduleBlock>;
  deleteScheduleBlock: (id: string) => Promise<void>;
  updateUserRole: (id: string, newRole: UserRole) => Promise<void>;
  toggleUserActive: (id: string) => Promise<void>;
  addUserProfile: (data: { full_name: string; email: string; phone?: string; role: UserRole }) => Promise<Profile>;
  logAudit: (payload: { action: string; entity: string; entity_id?: string; metadata?: Record<string, unknown> }) => Promise<AuditLog>;
  isCurrentUserAdmin: boolean;
  isCurrentUserManager: boolean;
  hasCurrentUserPermission: (permission: PermissionKey) => boolean;
  // ETAPA 10: CHECK-IN DO VEÍCULO, CHECKLIST, AVARIAS E FOTOS
  vehicleCheckins: VehicleCheckin[];
  getCheckinByAppointmentId: (appointmentId: string) => VehicleCheckin | undefined;
  getCheckinsByVehicleId: (vehicleId: string) => VehicleCheckin[];
  createVehicleCheckin: (payload: {
    appointment_id: string;
    vehicle_id: string;
    customer_id: string;
    mileage?: number | null;
    fuel_level?: string | null;
    interior_condition?: string | null;
    exterior_condition?: string | null;
    objects_left_in_vehicle?: string | null;
    general_notes?: string | null;
    confirmed_by?: string | null;
    confirmed_by_name?: string | null;
    checklist_items?: Omit<VehicleChecklistItem, "id" | "checkin_id">[];
    damages?: Omit<VehicleDamage, "id" | "checkin_id" | "vehicle_id" | "created_at">[];
    photos?: Omit<VehicleCheckinPhoto, "id" | "checkin_id" | "vehicle_id" | "created_at">[];
  }) => Promise<VehicleCheckin>;
  updateVehicleCheckin: (id: string, updates: Partial<VehicleCheckin>) => Promise<VehicleCheckin>;
  addVehicleDamage: (checkinId: string, damage: Omit<VehicleDamage, "id" | "checkin_id">) => Promise<VehicleDamage>;
  removeVehicleDamage: (checkinId: string, damageId: string) => Promise<void>;
  addVehiclePhoto: (checkinId: string, photo: Omit<VehicleCheckinPhoto, "id" | "checkin_id">) => Promise<VehicleCheckinPhoto>;
  removeVehiclePhoto: (checkinId: string, photoId: string) => Promise<void>;
  canStartAppointment: (appointmentId: string) => { canStart: boolean; reason?: string; checkin?: VehicleCheckin };

  // ETAPA 11: PÓS-ATENDIMENTO, CONFERÊNCIA FINAL E ENTREGA
  concluirServico: (
    id: string,
    options?: { completed_by?: string; completed_by_name?: string; notes?: string }
  ) => Promise<Appointment>;
  salvarConferenciaFinal: (
    id: string,
    data: {
      checkout_checklist: Record<string, boolean>;
      final_notes?: string;
      markAsReady?: boolean;
      ready_by?: string;
      ready_by_name?: string;
      final_photos?: Array<{
        storage_path: string;
        photo_url: string;
        photo_type: CheckinPhotoType;
        description?: string;
      }>;
    }
  ) => Promise<Appointment>;
  marcarComoPronto: (
    id: string,
    options?: { ready_by?: string; ready_by_name?: string }
  ) => Promise<Appointment>;
  entregarVeiculo: (
    id: string,
    options: {
      delivered_by?: string;
      delivered_by_name?: string;
      rating?: number;
      feedback?: string;
      overridePayment?: boolean;
      overrideReason?: string;
    }
  ) => Promise<Appointment>;

  // ETAPA 12: AVALIAÇÕES, RETENÇÃO, FIDELIZAÇÃO E INTELIGÊNCIA DE CLIENTES
  serviceReviews: ServiceReview[];
  customerTags: CustomerTag[];
  customerTagAssignments: CustomerTagAssignment[];
  addServiceReview: (data: {
    appointment_id: string;
    customer_id: string;
    rating: number;
    comment?: string;
  }) => Promise<ServiceReview>;
  assignCustomerTag: (customerId: string, tagName: string) => Promise<void>;
  removeCustomerTag: (customerId: string, tagName: string) => Promise<void>;
  updateVipSettings: (settings: {
    vip_min_spent?: number;
    vip_min_visits?: number;
    inactive_threshold_days?: number;
  }) => Promise<void>;

  checkAvailability: (date: string, startTime: string, excludeId?: string) => { available: boolean; conflictReason?: string; activeCount: number };
  resetToDefaults: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const STORAGE_KEYS = {
  CUSTOMERS: "pdc_db_customers_v2",
  VEHICLES: "pdc_db_vehicles_v2",
  SERVICES: "pdc_db_services_v2",
  APPOINTMENTS: "pdc_db_appointments_v2",
  SETTINGS: "pdc_db_settings_v2",
  HOURS: "pdc_db_hours_v2",
  BLOCKS: "pdc_db_blocks_v2",
  STATUS_HISTORY: "pdc_db_status_history_v2",
  PAYMENTS: "pdc_db_payments_v2",
  CASH_REGISTERS: "pdc_db_cash_registers_v2",
  CASH_MOVEMENTS: "pdc_db_cash_movements_v2",
  COMMUNICATION_LOGS: "pdc_db_communication_logs_v2",
  PROFILES: "pdc_db_profiles_v2",
  AUDIT_LOGS: "pdc_db_audit_logs_v2",
  VEHICLE_CHECKINS: "pdc_db_vehicle_checkins_v2",
  SERVICE_REVIEWS: "pdc_db_service_reviews_v2",
  CUSTOMER_TAGS: "pdc_db_customer_tags_v2",
  CUSTOMER_TAG_ASSIGNMENTS: "pdc_db_customer_tag_assignments_v2",
};


// Conversão inicial dos dados da Etapa 1 para o novo modelo de banco
function getInitialDbData() {
  const initialServices: Service[] = INITIAL_SERVICOS.map((s) => ({
    id: s.id,
    name: s.nome,
    description: s.descricao || null,
    vehicle_type: MAP_TIPO_TO_DB[s.tipo_veiculo],
    price: s.preco,
    duration_minutes: s.duracao_minutos,
    active: s.ativo,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const initialCustomers: Customer[] = INITIAL_CLIENTES.map((c) => ({
    id: c.id,
    full_name: c.nome,
    phone: c.whatsapp,
    email: null,
    notes: c.observacoes || null,
    active: true,
    created_at: `${c.created_at}T10:00:00Z`,
    updated_at: `${c.created_at}T10:00:00Z`,
  }));

  const initialVehicles: Vehicle[] = INITIAL_VEICULOS.map((v) => ({
    id: v.id,
    customer_id: v.cliente_id,
    vehicle_type: MAP_TIPO_TO_DB[v.tipo],
    brand: v.marca,
    model: v.modelo,
    color: v.cor,
    plate: v.placa,
    notes: v.observacoes || null,
    active: true,
    created_at: `${v.created_at}T10:00:00Z`,
    updated_at: `${v.created_at}T10:00:00Z`,
  }));

  const initialAppointments: Appointment[] = INITIAL_AGENDAMENTOS.map((a) => {
    const matchedService = initialServices.find((s) => s.id === a.servico_id);
    const duration = matchedService?.duration_minutes || 45;
    const [h, m] = a.horario.split(":").map(Number);
    const endMinutes = h * 60 + m + duration;
    const endH = String(Math.floor(endMinutes / 60)).padStart(2, "0");
    const endM = String(endMinutes % 60).padStart(2, "0");
    const dbStatus = MAP_STATUS_TO_DB[a.status] || "scheduled";

    return {
      id: a.id,
      code: a.code || `PC-${a.id.slice(-6).toUpperCase()}`,
      cancel_token: a.cancel_token || `tok-${a.id}`,
      customer_id: a.cliente_id || "cli-1",
      vehicle_id: a.veiculo_id || "veic-1",
      service_id: a.servico_id,
      scheduled_date: a.data,
      start_time: a.horario,
      end_time: `${endH}:${endM}`,
      status: dbStatus,
      price: a.valor, // SNAPSHOT HISTÓRICO
      notes: a.observacoes || null,
      confirmed_at: ["confirmed", "waiting", "in_progress", "completed"].includes(dbStatus) ? a.created_at : null,
      started_at: ["in_progress", "completed"].includes(dbStatus) ? a.created_at : null,
      completed_at: dbStatus === "completed" ? a.created_at : null,
      cancelled_at: dbStatus === "cancelled" ? a.created_at : null,
      no_show_at: dbStatus === "no_show" ? a.created_at : null,
      cancellation_reason: null,
      checklist: {},
      vehicle_photos: [],
      created_by: null,
      created_at: a.created_at,
      updated_at: a.created_at,
    };
  });

  const initialBusinessSettings: BusinessSettings = INITIAL_BUSINESS_SETTINGS;
  const initialBusinessHours: BusinessHour[] = INITIAL_BUSINESS_HOURS;
  const initialScheduleBlocks: ScheduleBlock[] = INITIAL_SCHEDULE_BLOCKS;
  const initialPayments: Payment[] = INITIAL_PAYMENTS;
  const initialCashRegisters: CashRegister[] = INITIAL_CASH_REGISTERS;
  const initialCashMovements: CashMovement[] = INITIAL_CASH_MOVEMENTS;

  return {
    initialCustomers,
    initialVehicles,
    initialServices,
    initialAppointments,
    initialBusinessSettings,
    initialBusinessHours,
    initialScheduleBlocks,
    initialPayments,
    initialCashRegisters,
    initialCashMovements,
  };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const defaults = useMemo(() => getInitialDbData(), []);

  const [customers, setCustomers] = useState<Customer[]>(defaults.initialCustomers);
  const [vehicles, setVehicles] = useState<Vehicle[]>(defaults.initialVehicles);
  const [services, setServices] = useState<Service[]>(defaults.initialServices);
  const [appointments, setAppointments] = useState<Appointment[]>(defaults.initialAppointments);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>(defaults.initialBusinessSettings);
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>(defaults.initialBusinessHours);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>(defaults.initialScheduleBlocks);
  const [statusHistory, setStatusHistory] = useState<AppointmentStatusHistory[]>([]);
  const [payments, setPayments] = useState<Payment[]>(defaults.initialPayments);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>(defaults.initialCashRegisters);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>(defaults.initialCashMovements);
  const [communicationLogs, setCommunicationLogs] = useState<CommunicationLog[]>(INITIAL_COMMUNICATION_LOGS);
  const [profiles, setProfiles] = useState<Profile[]>(INITIAL_PROFILES);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [vehicleCheckins, setVehicleCheckins] = useState<VehicleCheckin[]>(INITIAL_VEHICLE_CHECKINS);
  const [serviceReviews, setServiceReviews] = useState<ServiceReview[]>(INITIAL_SERVICE_REVIEWS);
  const [customerTags, setCustomerTags] = useState<CustomerTag[]>(INITIAL_CUSTOMER_TAGS);
  const [customerTagAssignments, setCustomerTagAssignments] = useState<CustomerTagAssignment[]>(INITIAL_CUSTOMER_TAG_ASSIGNMENTS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSupabaseActive, setIsSupabaseActive] = useState(false);

  // ETAPA 7 & 9: Papel de usuário (padrão 'admin', permite alternar para 'employee' ou 'manager' para testes de permissão)
  const [currentRole, setCurrentRole] = useState<UserRole>("admin");
  const canViewFinancial = useMemo(
    () => ["owner", "admin", "manager"].includes(currentRole),
    [currentRole]
  );

  const isCurrentUserAdmin = useMemo(
    () => currentRole === "admin" || currentRole === "owner",
    [currentRole]
  );

  const isCurrentUserManager = useMemo(
    () => isCurrentUserAdmin || currentRole === "manager",
    [currentRole, isCurrentUserAdmin]
  );

  const hasCurrentUserPermission = useCallback(
    (permission: PermissionKey) => hasPermission(currentRole, permission),
    [currentRole]
  );

  const logAudit = useCallback(
    async (payload: {
      action: string;
      entity: string;
      entity_id?: string;
      metadata?: Record<string, unknown>;
    }): Promise<AuditLog> => {
      const activeAdminProfile = profiles.find((p) => p.role === currentRole);
      const userName = activeAdminProfile?.full_name || (currentRole === "admin" ? "Administrador" : currentRole === "manager" ? "Gerente" : "Funcionário");
      const userId = activeAdminProfile?.id || null;

      const newLog: AuditLog = {
        id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        user_id: userId,
        user_name: userName,
        action: payload.action,
        entity: payload.entity,
        entity_id: payload.entity_id || null,
        metadata: payload.metadata || {},
        created_at: new Date().toISOString(),
      };

      setAuditLogs((prev) => [newLog, ...prev]);

      if (isSupabaseActive) {
        insertAuditLogInSupabase({
          user_id: userId,
          user_name: userName,
          action: payload.action,
          entity: payload.entity,
          entity_id: payload.entity_id || null,
          metadata: payload.metadata || {},
        }).catch((err) => console.warn("Erro ao salvar log de auditoria no Supabase:", err));
      }

      return newLog;
    },
    [currentRole, profiles, isSupabaseActive]
  );

  // Inicializar estado (local ou Supabase)
  useEffect(() => {
    async function loadData() {
      const isConfigured = isSupabaseConfigured();
      setIsSupabaseActive(isConfigured);

      if (isConfigured && supabase) {
        try {
          const [
            custRes,
            vehRes,
            srvRes,
            appRes,
            setRes,
            hourRes,
            blkRes,
            histRes,
            paymentsData,
            cashRegistersData,
            cashMovementsData,
            commsData,
            profilesData,
            auditLogsData,
            checkinsData,
            reviewsData,
            tagsData,
            tagAssignmentsData,
          ] = await Promise.all([
            supabase.from("customers").select("*"),
            supabase.from("vehicles").select("*"),
            supabase.from("services").select("*").order("price"),
            supabase.from("appointments").select("*").order("scheduled_date").order("start_time"),
            supabase.from("business_settings").select("*").limit(1).maybeSingle(),
            supabase.from("business_hours").select("*").order("day_of_week"),
            supabase.from("schedule_blocks").select("*").order("start_datetime"),
            supabase.from("appointment_status_history").select("*").order("changed_at", { ascending: false }),
            fetchPaymentsFromSupabase(),
            fetchCashRegistersFromSupabase(),
            fetchCashMovementsFromSupabase(),
            fetchCommunicationLogsFromSupabase(),
            fetchProfilesFromSupabase(),
            fetchAuditLogsFromSupabase(),
            fetchCheckinsFromSupabase(),
            fetchServiceReviewsFromSupabase(),
            fetchCustomerTagsFromSupabase(),
            fetchCustomerTagAssignmentsFromSupabase(),
          ]);

          if (custRes.data && custRes.data.length > 0) setCustomers(custRes.data);
          if (vehRes.data && vehRes.data.length > 0) setVehicles(vehRes.data);
          if (srvRes.data && srvRes.data.length > 0) setServices(srvRes.data);
          if (appRes.data && appRes.data.length > 0) setAppointments(appRes.data);
          if (setRes.data) setBusinessSettings(setRes.data);
          if (hourRes.data && hourRes.data.length > 0) setBusinessHours(hourRes.data);
          if (blkRes.data) setScheduleBlocks(blkRes.data);
          if (histRes.data && histRes.data.length > 0) setStatusHistory(histRes.data);
          if (paymentsData && paymentsData.length > 0) setPayments(paymentsData);
          if (cashRegistersData && cashRegistersData.length > 0) setCashRegisters(cashRegistersData);
          if (cashMovementsData && cashMovementsData.length > 0) setCashMovements(cashMovementsData);
          if (commsData && commsData.length > 0) setCommunicationLogs(commsData);
          if (profilesData && profilesData.length > 0) setProfiles(profilesData);
          if (auditLogsData && auditLogsData.length > 0) setAuditLogs(auditLogsData);
          if (checkinsData && checkinsData.length > 0) setVehicleCheckins(checkinsData);
          if (reviewsData && reviewsData.length > 0) setServiceReviews(reviewsData);
          if (tagsData && tagsData.length > 0) setCustomerTags(tagsData);
          if (tagAssignmentsData && tagAssignmentsData.length > 0) setCustomerTagAssignments(tagAssignmentsData);
        } catch (err) {

          console.warn("Supabase conectou mas houve falha na leitura. Usando armazenamento local:", err);
        }
      } else {
        // Modo Local com persistência
        try {
          const storedC = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
          const storedV = localStorage.getItem(STORAGE_KEYS.VEHICLES);
          const storedS = localStorage.getItem(STORAGE_KEYS.SERVICES);
          const storedA = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
          const storedCfg = localStorage.getItem(STORAGE_KEYS.SETTINGS);
          const storedH = localStorage.getItem(STORAGE_KEYS.HOURS);
          const storedB = localStorage.getItem(STORAGE_KEYS.BLOCKS);
          const storedHist = localStorage.getItem(STORAGE_KEYS.STATUS_HISTORY);
          const storedPay = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
          const storedReg = localStorage.getItem(STORAGE_KEYS.CASH_REGISTERS);
          const storedMov = localStorage.getItem(STORAGE_KEYS.CASH_MOVEMENTS);
          const storedComm = localStorage.getItem(STORAGE_KEYS.COMMUNICATION_LOGS);
          const storedProf = localStorage.getItem(STORAGE_KEYS.PROFILES);
          const storedAud = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
          const storedChk = localStorage.getItem(STORAGE_KEYS.VEHICLE_CHECKINS);
          const storedRev = localStorage.getItem(STORAGE_KEYS.SERVICE_REVIEWS);
          const storedTags = localStorage.getItem(STORAGE_KEYS.CUSTOMER_TAGS);
          const storedTagAss = localStorage.getItem(STORAGE_KEYS.CUSTOMER_TAG_ASSIGNMENTS);

          if (storedC) setCustomers(JSON.parse(storedC));
          if (storedV) setVehicles(JSON.parse(storedV));
          if (storedS) setServices(JSON.parse(storedS));
          if (storedA) setAppointments(JSON.parse(storedA));
          if (storedCfg) setBusinessSettings(JSON.parse(storedCfg));
          if (storedH) setBusinessHours(JSON.parse(storedH));
          if (storedB) setScheduleBlocks(JSON.parse(storedB));
          if (storedHist) setStatusHistory(JSON.parse(storedHist));
          if (storedPay) setPayments(JSON.parse(storedPay));
          if (storedReg) setCashRegisters(JSON.parse(storedReg));
          if (storedMov) setCashMovements(JSON.parse(storedMov));
          if (storedComm) setCommunicationLogs(JSON.parse(storedComm));
          if (storedProf) setProfiles(JSON.parse(storedProf));
          if (storedAud) setAuditLogs(JSON.parse(storedAud));
          if (storedChk) setVehicleCheckins(JSON.parse(storedChk));
          if (storedRev) setServiceReviews(JSON.parse(storedRev));
          if (storedTags) setCustomerTags(JSON.parse(storedTags));
          if (storedTagAss) setCustomerTagAssignments(JSON.parse(storedTagAss));
        } catch (e) {
          console.error("Erro ao ler localStorage", e);
        }
      }
      setIsLoaded(true);
    }

    loadData();
  }, [defaults]);

  // Persistir no LocalStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
      localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(vehicles));
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(services));
      localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appointments));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(businessSettings));
      localStorage.setItem(STORAGE_KEYS.HOURS, JSON.stringify(businessHours));
      localStorage.setItem(STORAGE_KEYS.BLOCKS, JSON.stringify(scheduleBlocks));
      localStorage.setItem(STORAGE_KEYS.STATUS_HISTORY, JSON.stringify(statusHistory));
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
      localStorage.setItem(STORAGE_KEYS.CASH_REGISTERS, JSON.stringify(cashRegisters));
      localStorage.setItem(STORAGE_KEYS.CASH_MOVEMENTS, JSON.stringify(cashMovements));
      localStorage.setItem(STORAGE_KEYS.COMMUNICATION_LOGS, JSON.stringify(communicationLogs));
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(auditLogs));
      localStorage.setItem(STORAGE_KEYS.VEHICLE_CHECKINS, JSON.stringify(vehicleCheckins));
      localStorage.setItem(STORAGE_KEYS.SERVICE_REVIEWS, JSON.stringify(serviceReviews));
      localStorage.setItem(STORAGE_KEYS.CUSTOMER_TAGS, JSON.stringify(customerTags));
      localStorage.setItem(STORAGE_KEYS.CUSTOMER_TAG_ASSIGNMENTS, JSON.stringify(customerTagAssignments));
    } catch (e) {
      console.error("Erro ao salvar no localStorage", e);
    }
  }, [customers, vehicles, services, appointments, businessSettings, businessHours, scheduleBlocks, statusHistory, payments, cashRegisters, cashMovements, communicationLogs, profiles, auditLogs, vehicleCheckins, serviceReviews, customerTags, customerTagAssignments, isLoaded]);


  // Métricas do Dashboard calculadas a partir de dados reais
  const metricasHoje = useMemo<ResumoMetricas>(() => {
    const today = getTodayDateString();
    const daily = appointments.filter((a) => a.scheduled_date === today);

    const totalAgendamentos = daily.length;
    const emAtendimento = daily.filter((a) => a.status === "in_progress").length;
    const concluidos = daily.filter((a) => a.status === "completed").length;

    // Faturamento previsto do dia com base nos preços capturados no agendamento (Snapshot)
    const faturamentoTotal = daily
      .filter((a) => ["scheduled", "confirmed", "waiting", "in_progress", "completed"].includes(a.status))
      .reduce((acc, a) => acc + (Number(a.price) || 0), 0);

    return {
      totalAgendamentos,
      emAtendimento,
      concluidos,
      faturamentoTotal,
    };
  }, [appointments]);

  // ==========================================
  // OPERAÇÕES: CLIENTES (Com validação e duplicidade)
  // ==========================================
  const addCustomer = useCallback(
    async (data: { full_name: string; phone: string; email?: string; notes?: string }) => {
      const cleanName = data.full_name.trim();
      const cleanPhone = normalizePhone(data.phone);

      if (!cleanName || cleanName.length < 2) {
        throw new Error("Nome completo do cliente é obrigatório.");
      }

      if (!cleanPhone || cleanPhone.length < 8) {
        throw new Error("Telefone ou WhatsApp válido é obrigatório.");
      }

      // Impedir clientes duplicados pelo mesmo telefone normalizado
      const exists = customers.find(
        (c) => c.active && normalizePhone(c.phone) === cleanPhone
      );
      if (exists) {
        throw new Error(`Já existe um cliente cadastrado com este telefone: ${exists.full_name}`);
      }

      const newCustomer: Customer = {
        id: `cust-${Date.now()}`,
        full_name: cleanName,
        phone: data.phone.trim(),
        email: data.email?.trim() || null,
        notes: data.notes?.trim() || null,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setCustomers((prev) => [newCustomer, ...prev]);
      return newCustomer;
    },
    [customers]
  );

  const updateCustomer = useCallback(
    async (id: string, data: Partial<Customer>) => {
      let updated: Customer | null = null;
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === id) {
            updated = { ...c, ...data, updated_at: new Date().toISOString() };
            return updated;
          }
          return c;
        })
      );
      if (!updated) throw new Error("Cliente não encontrado.");
      return updated;
    },
    []
  );

  const deleteCustomer = useCallback(async (id: string) => {
    // Soft-delete
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    setVehicles((prev) => prev.filter((v) => v.customer_id !== id));
  }, []);

  // ==========================================
  // OPERAÇÕES: VEÍCULOS (Com relacionamento N:1)
  // ==========================================
  const addVehicle = useCallback(
    async (data: {
      customer_id: string;
      vehicle_type: VehicleType;
      model: string;
      plate: string;
      brand?: string;
      color?: string;
      notes?: string;
    }) => {
      const cleanPlate = data.plate.trim().toUpperCase();
      const cleanModel = data.model.trim();

      if (!cleanPlate || cleanPlate.length < 5) {
        throw new Error("Placa de veículo válida é obrigatória.");
      }

      if (!cleanModel) {
        throw new Error("Modelo do veículo é obrigatório.");
      }

      const customerExists = customers.some((c) => c.id === data.customer_id);
      if (!customerExists) {
        throw new Error("Cliente proprietário não encontrado.");
      }

      const newVehicle: Vehicle = {
        id: `veh-${Date.now()}`,
        customer_id: data.customer_id,
        vehicle_type: data.vehicle_type,
        brand: data.brand?.trim() || null,
        model: cleanModel,
        color: data.color?.trim() || null,
        plate: cleanPlate,
        notes: data.notes?.trim() || null,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setVehicles((prev) => [newVehicle, ...prev]);
      return newVehicle;
    },
    [customers]
  );

  const updateVehicle = useCallback(
    async (id: string, data: Partial<Vehicle>) => {
      let updated: Vehicle | null = null;
      setVehicles((prev) =>
        prev.map((v) => {
          if (v.id === id) {
            updated = {
              ...v,
              ...data,
              plate: data.plate ? data.plate.trim().toUpperCase() : v.plate,
              updated_at: new Date().toISOString(),
            };
            return updated;
          }
          return v;
        })
      );
      if (!updated) throw new Error("Veículo não encontrado.");
      return updated;
    },
    []
  );

  const deleteVehicle = useCallback(async (id: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  }, []);

  // ==========================================
  // OPERAÇÕES: SERVIÇOS (Preços dinâmicos do banco)
  // ==========================================
  const updateServicePrice = useCallback(
    async (
      id: string,
      price: number,
      durationMinutes: number,
      name?: string,
      description?: string
    ) => {
      if (price < 0) throw new Error("Preço não pode ser negativo.");
      if (durationMinutes <= 0) throw new Error("Duração deve ser maior que 0 minutos.");

      let updated: Service | null = null;
      setServices((prev) =>
        prev.map((s) => {
          if (s.id === id) {
            updated = {
              ...s,
              price,
              duration_minutes: durationMinutes,
              name: name?.trim() || s.name,
              description: description !== undefined ? description.trim() : s.description,
              updated_at: new Date().toISOString(),
            };
            return updated;
          }
          return s;
        })
      );
      if (!updated) throw new Error("Serviço não encontrado.");
      return updated;
    },
    []
  );

  const addService = useCallback(
    async (data: Omit<Service, "id" | "created_at" | "updated_at">) => {
      if (data.price < 0) throw new Error("Preço não pode ser negativo.");
      if (data.duration_minutes <= 0) throw new Error("Duração deve ser maior que 0 minutos.");

      const newService: Service = {
        ...data,
        id: `srv-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setServices((prev) => [...prev, newService]);
      return newService;
    },
    []
  );

  // ==========================================
  // OPERAÇÕES: AGENDAMENTOS (Snapshot de Preço & Conflitos)
  // ==========================================
  const getAvailableSlotsForDate = useCallback(
    (date: string, serviceDuration: number, excludeAppointmentId?: string): DayAvailabilityResult => {
      return calculateAvailableSlots({
        date,
        serviceDuration,
        businessHours,
        intervalMinutes: businessSettings.appointment_interval || 30,
        minimumAdvanceMinutes: businessSettings.minimum_advance_minutes ?? 30,
        maximumAdvanceDays: businessSettings.maximum_advance_days ?? 30,
        allowSameDayBooking: businessSettings.allow_same_day_booking ?? true,
        existingAppointments: appointments,
        scheduleBlocks,
        maxCapacity: DEFAULT_SIMULTANEOUS_CAPACITY,
        excludeAppointmentId,
      });
    },
    [businessHours, businessSettings, appointments, scheduleBlocks]
  );

  const findCustomerByPhone = useCallback(
    (phone: string) => {
      const clean = normalizePhone(phone);
      if (!clean) return { customer: null, vehicles: [] };
      const cust = customers.find((c) => c.active && normalizePhone(c.phone) === clean) || null;
      const vehs = cust ? vehicles.filter((v) => v.active && v.customer_id === cust.id) : [];
      return { customer: cust, vehicles: vehs };
    },
    [customers, vehicles]
  );

  const checkAvailability = useCallback(
    (date: string, startTime: string, excludeId?: string) => {
      return checkSlotConflict(
        appointments,
        date,
        startTime,
        excludeId,
        DEFAULT_SIMULTANEOUS_CAPACITY,
        45,
        scheduleBlocks
      );
    },
    [appointments, scheduleBlocks]
  );

  const addAppointment = useCallback(
    async (data: {
      customer_id: string;
      vehicle_id: string;
      service_id: string;
      scheduled_date: string;
      start_time: string;
      end_time?: string;
      notes?: string;
      status?: AppointmentStatus;
      code?: string;
      cancel_token?: string;
    }) => {
      // 1. Obter e validar serviço
      const service = services.find((s) => s.id === data.service_id);
      if (!service || !service.active) {
        throw new Error("Serviço selecionado não existe ou está inativo.");
      }

      // 2. Obter e validar veículo
      const vehicle = vehicles.find((v) => v.id === data.vehicle_id);
      if (!vehicle) {
        throw new Error("Veículo selecionado não encontrado.");
      }

      // 3. Validar compatibilidade serviço vs veículo
      if (service.vehicle_type !== vehicle.vehicle_type) {
        throw new Error(
          `Serviço incompatível: '${service.name}' é para ${MAP_DB_TO_TIPO[service.vehicle_type]}, mas o veículo é ${MAP_DB_TO_TIPO[vehicle.vehicle_type]}.`
        );
      }

      // 4. Checar conflito com sobreposição de intervalo
      const duration = service.duration_minutes || 45;
      const slotCheck = checkSlotConflict(
        appointments,
        data.scheduled_date,
        data.start_time,
        undefined,
        DEFAULT_SIMULTANEOUS_CAPACITY,
        duration,
        scheduleBlocks
      );
      if (!slotCheck.available) {
        throw new Error(slotCheck.conflictReason || "Este horário acabou de ser reservado. Por favor, escolha outro.");
      }

      // 5. Calcular término
      const [h, m] = data.start_time.split(":").map(Number);
      const endMinutes = h * 60 + m + duration;
      const endH = String(Math.floor(endMinutes / 60)).padStart(2, "0");
      const endM = String(endMinutes % 60).padStart(2, "0");
      const endTime = data.end_time || `${endH}:${endM}`;

      // 6. Criar com SNAPSHOT DO PREÇO ATUAL, código amigável e token
      const friendlyCode = data.code || generateAppointmentCode();
      const cancelToken = data.cancel_token || generateCancelToken();

      const newAppointment: Appointment = {
        id: `agd-${Date.now()}`,
        code: friendlyCode,
        cancel_token: cancelToken,
        customer_id: data.customer_id,
        vehicle_id: data.vehicle_id,
        service_id: data.service_id,
        scheduled_date: data.scheduled_date,
        start_time: data.start_time,
        end_time: endTime,
        status: data.status || "scheduled",
        price: service.price, // SNAPSHOT HISTÓRICO
        notes: data.notes?.trim() || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setAppointments((prev) => [newAppointment, ...prev]);
      return newAppointment;
    },
    [services, vehicles, appointments, scheduleBlocks]
  );

  const updateAppointmentStatus = useCallback(
    async (id: string, status: AppointmentStatus) => {
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, status, updated_at: new Date().toISOString() }
            : a
        )
      );
    },
    []
  );

  const cancelAppointment = useCallback(
    async (id: string, reason?: string) => {
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                status: "cancelled",
                notes: reason ? `Cancelado: ${reason}` : (a.notes || "Cancelado"),
                updated_at: new Date().toISOString(),
              }
            : a
        )
      );
    },
    []
  );

  const deleteAppointment = useCallback(async (id: string) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // ==========================================
  // MÉTODOS DE COMPATIBILIDADE COM A ETAPA 1
  // ==========================================
  // ==========================================
  // MÉTODOS E ESTADO DE GESTÃO (ETAPA 4)
  // ==========================================
  const veiculos: Veiculo[] = useMemo(() => {
    return vehicles.map((v) => {
      const cust = customers.find((c) => c.id === v.customer_id);
      return {
        id: v.id,
        cliente_id: v.customer_id,
        cliente_nome: cust ? cust.full_name : "Cliente",
        marca: v.brand || "",
        modelo: v.model,
        placa: v.plate || "---",
        cor: v.color || "",
        tipo: MAP_DB_TO_TIPO[v.vehicle_type] || "Carro pequeno",
        observacoes: v.notes || undefined,
        ativo: v.active,
        created_at: v.created_at.split("T")[0],
        updated_at: v.updated_at ? v.updated_at.split("T")[0] : undefined,
      };
    });
  }, [vehicles, customers]);

  const clientes: Cliente[] = useMemo(() => {
    return customers.map((c) => {
      const custVehicles = veiculos.filter((v) => v.cliente_id === c.id);
      const custApps = appointments
        .filter((a) => a.customer_id === c.id)
        .sort((a, b) => `${b.scheduled_date} ${b.start_time}`.localeCompare(`${a.scheduled_date} ${a.start_time}`));

      const lastApp = custApps.length > 0 ? custApps[0] : null;
      let lastAtendimentoStr = "Sem atendimentos";
      if (lastApp) {
        lastAtendimentoStr = `${lastApp.scheduled_date.split("-").reverse().join("/")} às ${lastApp.start_time}`;
      }

      return {
        id: c.id,
        nome: c.full_name,
        whatsapp: c.phone,
        email: c.email || undefined,
        observacoes: c.notes || undefined,
        ativo: c.active,
        created_at: c.created_at.split("T")[0],
        updated_at: c.updated_at ? c.updated_at.split("T")[0] : undefined,
        ultimo_atendimento: lastAtendimentoStr,
        veiculos: custVehicles,
      };
    });
  }, [customers, veiculos, appointments]);

  // Métricas do Dashboard para Clientes e Veículos (Requisito 25)
  const totalClientesAtivos = useMemo(() => customers.filter((c) => c.active).length, [customers]);
  const totalVeiculosAtivos = useMemo(() => vehicles.filter((v) => v.active).length, [vehicles]);
  const novosClientesMes = useMemo(() => {
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return customers.filter((c) => c.created_at.startsWith(prefix)).length;
  }, [customers]);

  const servicos: Servico[] = useMemo(() => {
    return services.map((s, index) => ({
      id: s.id,
      numero: index + 1,
      nome: s.name,
      descricao: s.description || undefined,
      preco: Number(s.price),
      duracao_minutos: s.duration_minutes,
      tipo_veiculo: MAP_DB_TO_TIPO[s.vehicle_type],
      ativo: s.active,
    }));
  }, [services]);

  const agendamentos: Agendamento[] = useMemo(() => {
    return appointments.map((a) => {
      const cust = customers.find((c) => c.id === a.customer_id);
      const veh = vehicles.find((v) => v.id === a.vehicle_id);
      const srv = services.find((s) => s.id === a.service_id);

      const hist = statusHistory
        .filter((h) => h.appointment_id === a.id)
        .sort((x, y) => new Date(y.changed_at).getTime() - new Date(x.changed_at).getTime())
        .map((h) => ({
          id: h.id,
          old_status: h.old_status ? MAP_DB_TO_STATUS[h.old_status] : undefined,
          new_status: MAP_DB_TO_STATUS[h.new_status] || "Agendado",
          changed_by: h.changed_by || undefined,
          changed_at: h.changed_at,
          notes: h.notes || undefined,
        }));

      const paySummary = calculateAppointmentPaymentSummary(a.id, Number(a.price), payments);

      return {
        id: a.id,
        cliente_id: a.customer_id,
        cliente_nome: cust ? cust.full_name : "Cliente",
        cliente_whatsapp: cust ? cust.phone : "",
        veiculo_id: a.vehicle_id,
        veiculo_tipo: veh ? MAP_DB_TO_TIPO[veh.vehicle_type] : "Carro pequeno",
        veiculo_modelo: veh ? `${veh.brand || ""} ${veh.model}`.trim() : "Veículo",
        veiculo_placa: veh ? (veh.plate || "---") : "---",
        servico_id: a.service_id,
        servico_nome: srv ? srv.name : "Serviço",
        valor: Number(a.price), // SNAPSHOT DO PREÇO PRESERVADO
        data: a.scheduled_date,
        horario: a.start_time,
        status: MAP_DB_TO_STATUS[a.status] || "Agendado",
        observacoes: a.notes || undefined,
        code: a.code || `PC-${a.id.slice(-6).toUpperCase()}`,
        cancel_token: a.cancel_token || undefined,
        confirmed_at: a.confirmed_at || undefined,
        started_at: a.started_at || undefined,
        completed_at: a.completed_at || undefined,
        completed_by: a.completed_by || undefined,
        completed_by_name: a.completed_by_name || undefined,
        ready_at: a.ready_at || undefined,
        ready_by: a.ready_by || undefined,
        ready_by_name: a.ready_by_name || undefined,
        delivered_at: a.delivered_at || undefined,
        delivered_by: a.delivered_by || undefined,
        delivered_by_name: a.delivered_by_name || undefined,
        cancelled_at: a.cancelled_at || undefined,
        no_show_at: a.no_show_at || undefined,
        cancellation_reason: a.cancellation_reason || undefined,
        checklist: a.checklist || undefined,
        checkout_checklist: a.checkout_checklist || undefined,
        final_notes: a.final_notes || undefined,
        final_rating: a.final_rating || undefined,
        final_feedback: a.final_feedback || undefined,
        delivery_override_reason: a.delivery_override_reason || undefined,
        vehicle_photos: a.vehicle_photos || undefined,
        duracao_minutos: srv ? srv.duration_minutes : 45,
        duracao_real_minutos: computeRealDurationMinutes(a.started_at, a.completed_at) || undefined,
        financial_status: paySummary.status,
        paid_amount: paySummary.totalPaid,
        status_history: hist,
        created_at: a.created_at,
      };
    });
  }, [appointments, customers, vehicles, services, statusHistory, payments]);


  // Métricas Operacionais de Atendimentos de Hoje (ETAPA 5 & 11)
  const metricasAtendimentosHoje = useMemo(() => {
    const today = getTodayDateString();
    const todayApps = appointments.filter((a) => a.scheduled_date === today);

    const washDurations = todayApps
      .map((a) => computeRealDurationMinutes(a.started_at, a.completed_at))
      .filter((m): m is number => m !== null && m > 0);
    const tempoMedioLavagemMinutos = washDurations.length > 0
      ? Math.round(washDurations.reduce((acc, v) => acc + v, 0) / washDurations.length)
      : 0;

    const pickupDurations = todayApps
      .map((a) => computeWaitingForPickupMinutes(a.ready_at, a.delivered_at))
      .filter((m): m is number => m !== null && m > 0);
    const tempoMedioEsperaRetiradaMinutos = pickupDurations.length > 0
      ? Math.round(pickupDurations.reduce((acc, v) => acc + v, 0) / pickupDurations.length)
      : 0;

    const lavagemConcluida = todayApps.filter((a) => a.status === "completed").length;
    const prontos = todayApps.filter((a) => a.status === "ready").length;
    const aguardandoPagamento = todayApps.filter((a) => a.status === "awaiting_payment").length;
    const aguardandoRetirada = todayApps.filter((a) => a.status === "awaiting_pickup" || a.status === "ready").length;
    const entreguesHoje = todayApps.filter((a) => a.status === "delivered").length;
    const finalizados = lavagemConcluida + prontos + entreguesHoje;

    return {
      aguardando: todayApps.filter((a) => a.status === "waiting").length,
      emAtendimento: todayApps.filter((a) => a.status === "in_progress").length,
      finalizados,
      lavagemConcluida,
      prontos,
      aguardandoPagamento,
      aguardandoRetirada,
      entreguesHoje,
      naoCompareceram: todayApps.filter((a) => a.status === "no_show").length,
      cancelados: todayApps.filter((a) => a.status === "cancelled").length,
      total: todayApps.length,
      tempoMedioLavagemMinutos,
      tempoMedioEsperaRetiradaMinutos,
    };
  }, [appointments]);

  const checkCustomerDuplicate = useCallback(
    (phone: string, excludeId?: string) => {
      const clean = normalizePhone(phone);
      if (!clean || clean.length < 8) return { exists: false };
      const found = clientes.find(
        (c) => c.ativo !== false && normalizePhone(c.whatsapp) === clean && c.id !== excludeId
      );
      return { exists: !!found, customer: found };
    },
    [clientes]
  );

  const checkVehicleDuplicate = useCallback(
    (plate: string, excludeId?: string) => {
      const clean = plate ? plate.replace(/[\s-]/g, "").toUpperCase() : "";
      if (!clean || clean.length < 3 || clean === "---") return { exists: false };
      const found = veiculos.find(
        (v) =>
          v.ativo !== false &&
          v.placa &&
          v.placa.replace(/[\s-]/g, "").toUpperCase() === clean &&
          v.id !== excludeId
      );
      return { exists: !!found, vehicle: found, clienteNome: found?.cliente_nome };
    },
    [veiculos]
  );

  const addCliente = useCallback(
    (dados: Omit<Cliente, "id" | "created_at">): Cliente => {
      const cleanPhone = normalizePhone(dados.whatsapp);
      const exists = customers.find(
        (c) => c.active && normalizePhone(c.phone) === cleanPhone
      );
      if (exists) {
        throw new Error(`Já existe um cliente cadastrado com este WhatsApp: ${exists.full_name}`);
      }

      const id = `cust-${Date.now()}`;
      const newCust: Customer = {
        id,
        full_name: dados.nome.trim(),
        phone: dados.whatsapp.trim(),
        email: dados.email ? dados.email.trim() : null,
        notes: dados.observacoes?.trim() || null,
        active: dados.ativo !== undefined ? dados.ativo : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setCustomers((prev) => [newCust, ...prev]);

      return {
        id,
        nome: newCust.full_name,
        whatsapp: newCust.phone,
        email: newCust.email || undefined,
        observacoes: newCust.notes || undefined,
        ativo: newCust.active,
        created_at: getTodayDateString(),
      };
    },
    [customers]
  );

  const updateCliente = useCallback((id: string, dados: Partial<Cliente>) => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              full_name: dados.nome !== undefined ? dados.nome.trim() : c.full_name,
              phone: dados.whatsapp !== undefined ? dados.whatsapp.trim() : c.phone,
              email: dados.email !== undefined ? (dados.email ? dados.email.trim() : null) : c.email,
              notes: dados.observacoes !== undefined ? dados.observacoes : c.notes,
              active: dados.ativo !== undefined ? dados.ativo : c.active,
              updated_at: new Date().toISOString(),
            }
          : c
      )
    );
  }, []);

  const deactivateCliente = useCallback((id: string) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, active: false, updated_at: new Date().toISOString() } : c))
    );
  }, []);

  const activateCliente = useCallback((id: string) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, active: true, updated_at: new Date().toISOString() } : c))
    );
  }, []);

  const deleteCliente = useCallback((id: string) => {
    // Requisito 8: NÃO permitir exclusão física de clientes que possuam veículos, agendamentos ou histórico.
    const hasVehicles = vehicles.some((v) => v.customer_id === id);
    const hasAppointments = appointments.some((a) => a.customer_id === id);

    if (hasVehicles || hasAppointments) {
      // Soft delete
      setCustomers((prev) =>
        prev.map((c) => (c.id === id ? { ...c, active: false, updated_at: new Date().toISOString() } : c))
      );
    } else {
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      setVehicles((prev) => prev.filter((v) => v.customer_id !== id));
    }
  }, [vehicles, appointments]);

  const addVeiculo = useCallback(
    (dados: Omit<Veiculo, "id" | "created_at">): Veiculo => {
      const id = `veh-${Date.now()}`;
      const newVeh: Vehicle = {
        id,
        customer_id: dados.cliente_id,
        vehicle_type: MAP_TIPO_TO_DB[dados.tipo],
        brand: dados.marca || null,
        model: dados.modelo.trim(),
        color: dados.cor || null,
        plate: dados.placa && dados.placa !== "---" ? dados.placa.trim().toUpperCase() : null,
        notes: dados.observacoes || null,
        active: dados.ativo !== undefined ? dados.ativo : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setVehicles((prev) => [newVeh, ...prev]);

      return {
        ...dados,
        id,
        placa: newVeh.plate || "---",
        ativo: newVeh.active,
        created_at: getTodayDateString(),
      };
    },
    []
  );

  const updateVeiculo = useCallback((id: string, dados: Partial<Veiculo>) => {
    setVehicles((prev) =>
      prev.map((v) =>
        v.id === id
          ? {
              ...v,
              brand: dados.marca !== undefined ? dados.marca : v.brand,
              model: dados.modelo !== undefined ? dados.modelo : v.model,
              color: dados.cor !== undefined ? dados.cor : v.color,
              plate: dados.placa !== undefined ? (dados.placa && dados.placa !== "---" ? dados.placa.trim().toUpperCase() : null) : v.plate,
              vehicle_type: dados.tipo ? MAP_TIPO_TO_DB[dados.tipo] : v.vehicle_type,
              notes: dados.observacoes !== undefined ? dados.observacoes : v.notes,
              active: dados.ativo !== undefined ? dados.ativo : v.active,
              updated_at: new Date().toISOString(),
            }
          : v
      )
    );
  }, []);

  const deactivateVeiculo = useCallback((id: string) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === id ? { ...v, active: false, updated_at: new Date().toISOString() } : v))
    );
  }, []);

  const activateVeiculo = useCallback((id: string) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === id ? { ...v, active: true, updated_at: new Date().toISOString() } : v))
    );
  }, []);

  const deleteVeiculo = useCallback((id: string) => {
    // Requisito 15: Não apagar automaticamente veículos com histórico
    const hasAppointments = appointments.some((a) => a.vehicle_id === id);
    if (hasAppointments) {
      setVehicles((prev) =>
        prev.map((v) => (v.id === id ? { ...v, active: false, updated_at: new Date().toISOString() } : v))
      );
    } else {
      setVehicles((prev) => prev.filter((v) => v.id !== id));
    }
  }, [appointments]);

  const getClienteDetails = useCallback(
    (id: string) => {
      const cliente = clientes.find((c) => c.id === id) || null;
      const clientVehicles = veiculos.filter((v) => v.cliente_id === id);
      const clientAppointments = agendamentos
        .filter((a) => a.cliente_id === id || (cliente && a.cliente_nome.toLowerCase() === cliente.nome.toLowerCase()))
        .sort((a, b) => `${b.data} ${b.horario}`.localeCompare(`${a.data} ${a.horario}`));

      const concluidos = clientAppointments.filter((a) => isCompletedStatus(a.status));
      const clientAppIds = new Set(clientAppointments.map((a) => a.id));
      const clientPaidPayments = payments.filter((p) => clientAppIds.has(p.appointment_id) && p.status === "paid");
      let totalGasto = clientPaidPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      if (totalGasto === 0 && concluidos.length > 0) {
        totalGasto = concluidos.reduce((acc, a) => acc + (Number(a.valor) || 0), 0);
      }
      const ultimoAtendimento = clientAppointments.length > 0 ? clientAppointments[0] : null;

      const metrics = calculateCustomerMetrics({
        customerId: id,
        customerName: cliente?.nome,
        appointments: agendamentos,
        payments,
        reviews: serviceReviews,
        tagAssignments: customerTagAssignments,
        vipMinSpent: businessSettings?.vip_min_spent ?? 500,
        vipMinVisits: businessSettings?.vip_min_visits ?? 10,
        inactiveThresholdDays: businessSettings?.inactive_threshold_days ?? 60,
      });

      const vehiclesSummary = calculateCustomerVehiclesSummary(
        id,
        veiculos,
        agendamentos,
        payments
      );

      const timeline = buildCommercialTimeline(
        id,
        cliente?.nome,
        agendamentos,
        payments,
        serviceReviews
      );

      const clientReviews = serviceReviews.filter((r) => r.customer_id === id);

      return {
        cliente,
        veiculos: clientVehicles,
        agendamentos: clientAppointments,
        totalAgendamentos: clientAppointments.length,
        concluidos: concluidos.length,
        totalGasto,
        ultimoAtendimento,
        metrics,
        vehiclesSummary,
        timeline,
        reviews: clientReviews,
      };
    },
    [clientes, veiculos, agendamentos, payments, serviceReviews, customerTagAssignments, businessSettings]
  );

  const getVeiculoDetails = useCallback(
    (id: string) => {
      const veiculo = veiculos.find((v) => v.id === id) || null;
      const cliente = veiculo ? clientes.find((c) => c.id === veiculo.cliente_id) || null : null;
      const vehAppointments = agendamentos
        .filter((a) => a.veiculo_id === id || (veiculo && veiculo.placa && veiculo.placa !== "---" && a.veiculo_placa === veiculo.placa))
        .sort((a, b) => `${b.data} ${b.horario}`.localeCompare(`${a.data} ${a.horario}`));

      const concluidos = vehAppointments.filter((a) => isCompletedStatus(a.status));
      const vehAppIds = new Set(vehAppointments.map((a) => a.id));
      const vehPayments = payments.filter((p) => vehAppIds.has(p.appointment_id) && p.status === "paid");
      let totalGasto = vehPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      if (totalGasto === 0 && concluidos.length > 0) {
        totalGasto = concluidos.reduce((acc, a) => acc + (Number(a.valor) || 0), 0);
      }
      const ultimoAtendimento = vehAppointments.length > 0 ? vehAppointments[0] : null;

      return {
        veiculo,
        cliente,
        agendamentos: vehAppointments,
        totalAtendimentos: vehAppointments.length,
        concluidos: concluidos.length,
        totalGasto,
        ultimoAtendimento,
      };
    },
    [veiculos, clientes, agendamentos, payments]
  );

  const getVeiculosPorCliente = useCallback(
    (clienteId: string) => {
      return veiculos.filter((v) => v.cliente_id === clienteId);
    },
    [veiculos]
  );

  const updateServico = useCallback((id: string, dados: Partial<Servico>) => {
    if (dados.preco !== undefined && dados.preco < 0) {
      throw new Error("O preço do serviço não pode ser negativo.");
    }
    setServices((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              name: dados.nome !== undefined ? dados.nome : s.name,
              price: dados.preco !== undefined ? dados.preco : s.price,
              duration_minutes: dados.duracao_minutos !== undefined ? dados.duracao_minutos : s.duration_minutes,
              description: dados.descricao !== undefined ? dados.descricao : s.description,
              vehicle_type: dados.tipo_veiculo ? MAP_TIPO_TO_DB[dados.tipo_veiculo] : s.vehicle_type,
              active: dados.ativo !== undefined ? dados.ativo : s.active,
              updated_at: new Date().toISOString(),
            }
          : s
      )
    );
  }, []);

  const addServico = useCallback((dados: Omit<Servico, "id">): Servico => {
    const id = `srv-${Date.now()}`;
    const newSrv: Service = {
      id,
      name: dados.nome.trim(),
      description: dados.descricao || null,
      vehicle_type: MAP_TIPO_TO_DB[dados.tipo_veiculo],
      price: Number(dados.preco),
      duration_minutes: Number(dados.duracao_minutos),
      active: dados.ativo,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setServices((prev) => [...prev, newSrv]);

    return {
      ...dados,
      id,
    };
  }, []);

  const deactivateServico = useCallback((id: string) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: false, updated_at: new Date().toISOString() } : s))
    );
    if (isSupabaseConfigured()) {
      deactivateServiceInSupabase(id).catch(console.warn);
    }
  }, []);

  const activateServico = useCallback((id: string) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: true, updated_at: new Date().toISOString() } : s))
    );
    if (isSupabaseConfigured()) {
      activateServiceInSupabase(id).catch(console.warn);
    }
  }, []);

  const deleteServico = useCallback(
    (id: string) => {
      const hasAppointments = appointments.some((a) => a.service_id === id);
      if (hasAppointments) {
        deactivateServico(id);
      } else {
        setServices((prev) => prev.filter((s) => s.id !== id));
      }
    },
    [appointments, deactivateServico]
  );

  const addAgendamento = useCallback(
    (dados: Omit<Agendamento, "id" | "created_at">): Agendamento => {
      // 1. Encontrar serviço para snapshot
      const service = services.find((s) => s.id === dados.servico_id);
      const snapshotPrice = service ? Number(service.price) : Number(dados.valor);
      const duration = service?.duration_minutes || 45;

      // 2. Verificar conflito de horário com sobreposição e blocos
      const slotCheck = checkSlotConflict(
        appointments,
        dados.data,
        dados.horario,
        undefined,
        DEFAULT_SIMULTANEOUS_CAPACITY,
        duration,
        scheduleBlocks
      );
      if (!slotCheck.available) {
        throw new Error(slotCheck.conflictReason || "Este horário acabou de ser reservado. Por favor, escolha outro.");
      }

      // 3. Encontrar ou criar cliente
      let customerId = dados.cliente_id;
      if (!customerId) {
        const cleanPhone = normalizePhone(dados.cliente_whatsapp);
        const existingCust = customers.find(
          (c) => normalizePhone(c.phone) === cleanPhone
        );
        if (existingCust) {
          customerId = existingCust.id;
        } else {
          const newCustId = `cust-${Date.now()}`;
          const newCust: Customer = {
            id: newCustId,
            full_name: dados.cliente_nome.trim(),
            phone: dados.cliente_whatsapp.trim(),
            notes: "Cadastrado no agendamento",
            active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setCustomers((prev) => [newCust, ...prev]);
          customerId = newCustId;
        }
      }

      // 4. Encontrar ou criar veículo
      let vehicleId = dados.veiculo_id;
      if (!vehicleId) {
        const cleanPlate = (dados.veiculo_placa || "NÃO INFORMADA").trim().toUpperCase();
        const existingVeh = vehicles.find(
          (v) => v.customer_id === customerId && v.plate === cleanPlate
        );
        if (existingVeh) {
          vehicleId = existingVeh.id;
        } else {
          const newVehId = `veh-${Date.now()}`;
          const newVeh: Vehicle = {
            id: newVehId,
            customer_id: customerId,
            vehicle_type: MAP_TIPO_TO_DB[dados.veiculo_tipo],
            model: dados.veiculo_modelo || dados.veiculo_tipo,
            plate: cleanPlate,
            active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setVehicles((prev) => [newVeh, ...prev]);
          vehicleId = newVehId;
        }
      }

      const [h, m] = dados.horario.split(":").map(Number);
      const endMinutes = h * 60 + m + duration;
      const endH = String(Math.floor(endMinutes / 60)).padStart(2, "0");
      const endM = String(endMinutes % 60).padStart(2, "0");

      const id = `agd-${Date.now()}`;
      const friendlyCode = dados.code || generateAppointmentCode();
      const cancelToken = dados.cancel_token || generateCancelToken();

      const newApp: Appointment = {
        id,
        code: friendlyCode,
        cancel_token: cancelToken,
        customer_id: customerId,
        vehicle_id: vehicleId,
        service_id: dados.servico_id,
        scheduled_date: dados.data,
        start_time: dados.horario,
        end_time: `${endH}:${endM}`,
        status: MAP_STATUS_TO_DB[dados.status] || "scheduled",
        price: snapshotPrice, // PREÇO SNAPSHOT HISTÓRICO
        notes: dados.observacoes?.trim() || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setAppointments((prev) => [newApp, ...prev]);

      return {
        ...dados,
        id,
        code: friendlyCode,
        cancel_token: cancelToken,
        valor: snapshotPrice,
        created_at: newApp.created_at,
      };
    },
    [services, appointments, customers, vehicles, scheduleBlocks]
  );

  const updateAgendamentoStatus = useCallback(
    (
      id: string,
      status: StatusAgendamento,
      options?: { cancellationReason?: string; notes?: string; changedBy?: string }
    ) => {
      const existing = appointments.find((a) => a.id === id);
      if (!existing) return;

      const targetDbStatus = MAP_STATUS_TO_DB[status];
      const validation = validateStatusTransition(existing.status, targetDbStatus);
      if (!validation.allowed) {
        throw new Error(validation.reason || "Transição de status não permitida.");
      }

      // ETAPA 10: Bloquear início de atendimento sem check-in quando configurado
      if (targetDbStatus === "in_progress") {
        const requireCheckin = businessSettings.require_checkin_to_start !== false;
        if (requireCheckin) {
          const hasCheckin = vehicleCheckins.some(
            (c) => c.appointment_id === id && c.status === "completed"
          );
          if (!hasCheckin) {
            throw new Error(
              "Check-in do veículo obrigatório antes de iniciar o atendimento! Realize o checklist e a vistoria de entrada."
            );
          }
        }
      }

      const nowIso = new Date().toISOString();
      let confirmed_at = existing.confirmed_at;
      let started_at = existing.started_at;
      let completed_at = existing.completed_at;
      let ready_at = existing.ready_at;
      let delivered_at = existing.delivered_at;
      let cancelled_at = existing.cancelled_at;
      let no_show_at = existing.no_show_at;
      let cancellation_reason = existing.cancellation_reason;

      if (targetDbStatus === "confirmed" && !confirmed_at) {
        confirmed_at = nowIso;
      } else if (targetDbStatus === "in_progress" && !started_at) {
        started_at = nowIso;
      } else if (targetDbStatus === "completed" && !completed_at) {
        completed_at = nowIso;
      } else if (targetDbStatus === "ready" && !ready_at) {
        ready_at = nowIso;
      } else if (targetDbStatus === "delivered" && !delivered_at) {
        delivered_at = nowIso;
      } else if (targetDbStatus === "cancelled") {
        cancelled_at = nowIso;
        if (options?.cancellationReason) {
          cancellation_reason = options.cancellationReason;
        }
      } else if (targetDbStatus === "no_show" && !no_show_at) {
        no_show_at = nowIso;
      }

      setAppointments((prev) =>
        prev.map((a) => {
          if (a.id === id) {
            return {
              ...a,
              status: targetDbStatus,
              confirmed_at,
              started_at,
              completed_at,
              ready_at,
              delivered_at,
              cancelled_at,
              no_show_at,
              cancellation_reason,
              notes: options?.notes !== undefined ? options.notes : a.notes,
              updated_at: nowIso,
            };
          }
          return a;
        })
      );

      const historyEntry: AppointmentStatusHistory = {
        id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        appointment_id: id,
        old_status: existing.status,
        new_status: targetDbStatus,
        changed_by: options?.changedBy || null,
        changed_at: nowIso,
        notes: options?.cancellationReason
          ? `Cancelamento: ${options.cancellationReason}`
          : options?.notes || null,
      };
      setStatusHistory((prev) => [historyEntry, ...prev]);

      if (targetDbStatus === "cancelled") {
        logAudit({
          action: "appointment.cancelled",
          entity: "appointment",
          entity_id: id,
          metadata: { motivo: options?.cancellationReason },
        }).catch(console.warn);
      } else if (targetDbStatus === "completed") {
        logAudit({
          action: "appointment.completed",
          entity: "appointment",
          entity_id: id,
          metadata: { responsavel: options?.changedBy || "Equipe" },
        }).catch(console.warn);
      } else if (targetDbStatus === "ready") {
        logAudit({
          action: "appointment.ready",
          entity: "appointment",
          entity_id: id,
          metadata: { responsavel: options?.changedBy || "Equipe" },
        }).catch(console.warn);
      } else if (targetDbStatus === "delivered") {
        logAudit({
          action: "appointment.delivered",
          entity: "appointment",
          entity_id: id,
          metadata: { responsavel: options?.changedBy || "Equipe" },
        }).catch(console.warn);
      } else {
        logAudit({
          action: "appointment.status_changed",
          entity: "appointment",
          entity_id: id,
          metadata: { de: existing.status, para: targetDbStatus },
        }).catch(console.warn);
      }

      if (isSupabaseConfigured()) {
        updateAppointmentStatusInSupabase(id, targetDbStatus, options).catch((err) => {
          console.warn("Aviso ao atualizar status no Supabase:", err);
        });
      }
    },
    [appointments, businessSettings, vehicleCheckins, logAudit]
  );

  const updateAgendamentoNotes = useCallback((id: string, notes: string) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, notes, updated_at: new Date().toISOString() } : a))
    );
    if (isSupabaseConfigured()) {
      updateAppointmentInSupabase(id, { notes }).catch((err) => {
        console.warn("Aviso ao salvar observação no Supabase:", err);
      });
    }
  }, []);

  const updateAgendamentoChecklist = useCallback((id: string, checklist: Record<string, boolean | string>) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, checklist, updated_at: new Date().toISOString() } : a))
    );
    if (isSupabaseConfigured()) {
      updateAppointmentInSupabase(id, { checklist } as Partial<Appointment>).catch(console.warn);
    }
  }, []);

  const getStatusHistory = useCallback(
    (appointmentId: string): AppointmentStatusHistory[] => {
      return statusHistory
        .filter((h) => h.appointment_id === appointmentId)
        .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());
    },
    [statusHistory]
  );

  const updateAgendamento = useCallback(
    (id: string, dados: Partial<Agendamento>) => {
      const existing = appointments.find((a) => a.id === id);
      if (!existing) return;

      const targetDate = dados.data || existing.scheduled_date;
      const targetTime = dados.horario || existing.start_time;
      const targetServiceId = dados.servico_id || existing.service_id;
      const srv = services.find((s) => s.id === targetServiceId);
      const duration = srv?.duration_minutes || 45;

      // Se mudou data, horário ou serviço, verificar conflito!
      if (dados.data || dados.horario || dados.servico_id) {
        const slotCheck = checkSlotConflict(
          appointments,
          targetDate,
          targetTime,
          id,
          DEFAULT_SIMULTANEOUS_CAPACITY,
          duration,
          scheduleBlocks
        );
        if (!slotCheck.available) {
          throw new Error(slotCheck.conflictReason || "Este novo horário conflita com outro agendamento existente.");
        }
      }

      const [h, m] = targetTime.split(":").map(Number);
      const endMinutes = h * 60 + m + duration;
      const endH = String(Math.floor(endMinutes / 60)).padStart(2, "0");
      const endM = String(endMinutes % 60).padStart(2, "0");
      const computedEndTime = `${endH}:${endM}`;

      setAppointments((prev) =>
        prev.map((a) => {
          if (a.id === id) {
            return {
              ...a,
              service_id: targetServiceId,
              scheduled_date: targetDate,
              start_time: targetTime,
              end_time: computedEndTime,
              price: srv ? Number(srv.price) : a.price,
              status: dados.status ? MAP_STATUS_TO_DB[dados.status] : a.status,
              notes: dados.observacoes !== undefined ? dados.observacoes : a.notes,
              updated_at: new Date().toISOString(),
            };
          }
          return a;
        })
      );
    },
    [appointments, services, scheduleBlocks]
  );

  const deleteAgendamento = useCallback((id: string) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // ==========================================
  // MÓDULO FINANCEIRO E CONTROLE DE CAIXA (ETAPA 6)
  // ==========================================
  const activeCashRegister = useMemo(() => {
    return cashRegisters.find((r) => r.status === "open") || null;
  }, [cashRegisters]);

  const getAppointmentPaymentSummary = useCallback(
    (appointmentId: string): AppointmentPaymentSummary => {
      const app = appointments.find((a) => a.id === appointmentId);
      const price = app ? Number(app.price) : 0;
      return calculateAppointmentPaymentSummary(appointmentId, price, payments);
    },
    [appointments, payments]
  );

  const metricasFinanceirasHoje = useMemo(() => {
    const today = getTodayDateString();
    const todayApps = appointments.filter((a) => a.scheduled_date === today);

    // Faturamento Previsto: agendamentos do dia não cancelados e não faltas
    const faturamentoPrevistoHoje = todayApps
      .filter((a) => !["cancelled", "no_show"].includes(a.status))
      .reduce((acc, a) => acc + (Number(a.price) || 0), 0);

    // Pagamentos quitados com data de hoje
    const validPaymentsToday = payments.filter(
      (p) => p.status === "paid" && p.paid_at.startsWith(today)
    );

    const recebidoHoje = validPaymentsToday.reduce(
      (acc, p) => acc + (Number(p.amount) || 0),
      0
    );

    const pendenteHoje = Math.max(0, faturamentoPrevistoHoje - recebidoHoje);

    // Movimentações no caixa de hoje
    const todayMovements = cashMovements.filter((m) => m.created_at.startsWith(today));

    const despesasHoje = todayMovements
      .filter((m) => m.type === "expense")
      .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

    const entradasDinheiroHoje = todayMovements
      .filter((m) => m.type === "income" && m.payment_method === "dinheiro")
      .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

    const despesasDinheiroHoje = todayMovements
      .filter((m) => m.type === "expense" && m.payment_method === "dinheiro")
      .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

    const estornosDinheiroHoje = todayMovements
      .filter((m) => m.type === "reversal" && m.payment_method === "dinheiro")
      .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

    const saldoCaixaDinheiroHoje =
      (activeCashRegister ? Number(activeCashRegister.opening_balance) : 0) +
      entradasDinheiroHoje -
      despesasDinheiroHoje -
      estornosDinheiroHoje;

    const totalTransacoesHoje = validPaymentsToday.length;

    const totalPorMetodoHoje: Record<PaymentMethod, number> = {
      dinheiro: 0,
      pix: 0,
      debito: 0,
      credito: 0,
    };

    validPaymentsToday.forEach((p) => {
      if (totalPorMetodoHoje[p.payment_method] !== undefined) {
        totalPorMetodoHoje[p.payment_method] += Number(p.amount) || 0;
      }
    });

    return {
      faturamentoPrevistoHoje,
      recebidoHoje,
      pendenteHoje,
      despesasHoje,
      saldoCaixaDinheiroHoje,
      totalTransacoesHoje,
      totalPorMetodoHoje,
    };
  }, [appointments, payments, cashMovements, activeCashRegister]);

  const addPayment = useCallback(
    async (data: {
      appointment_id: string;
      amount: number;
      payment_method: PaymentMethod;
      notes?: string;
    }): Promise<Payment> => {
      const val = Number(data.amount);
      if (!val || val <= 0) {
        throw new Error("O valor do pagamento deve ser maior que zero.");
      }

      const app = appointments.find((a) => a.id === data.appointment_id);
      if (!app) {
        throw new Error("Agendamento correspondente não encontrado.");
      }

      const currentSummary = calculateAppointmentPaymentSummary(
        app.id,
        Number(app.price),
        payments
      );

      if (currentSummary.status === "paid") {
        throw new Error("Este atendimento já foi completamente quitado.");
      }

      if (val > currentSummary.remainingBalance + 0.01) {
        throw new Error(
          `O valor informado (R$ ${val.toFixed(2)}) ultrapassa o saldo restante de R$ ${currentSummary.remainingBalance.toFixed(2)}.`
        );
      }

      const paymentId = `pay-${Date.now()}`;
      const nowIso = new Date().toISOString();

      const newPayment: Payment = {
        id: paymentId,
        appointment_id: data.appointment_id,
        amount: val,
        payment_method: data.payment_method,
        status: "paid",
        paid_at: nowIso,
        notes: data.notes?.trim() || null,
        created_by: null,
        created_at: nowIso,
        updated_at: nowIso,
      };

      setPayments((prev) => [newPayment, ...prev]);

      // Se houver caixa aberto, criar movimentação de entrada correspondente
      if (activeCashRegister) {
        const cust = customers.find((c) => c.id === app.customer_id);
        const srv = services.find((s) => s.id === app.service_id);
        const desc = `${srv?.name || "Atendimento"} - ${cust?.full_name || "Cliente"} (${PAYMENT_METHOD_LABELS[data.payment_method]})`;

        const newMovement: CashMovement = {
          id: `mov-${Date.now()}`,
          cash_register_id: activeCashRegister.id,
          appointment_id: app.id,
          payment_id: newPayment.id,
          type: "income",
          category: "Pagamento de Atendimento",
          amount: val,
          payment_method: data.payment_method,
          description: desc,
          created_by: null,
          created_at: nowIso,
        };

        setCashMovements((prev) => [newMovement, ...prev]);

        if (isSupabaseConfigured()) {
          insertCashMovementInSupabase(newMovement).catch(console.warn);
        }
      }

      if (isSupabaseConfigured()) {
        insertPaymentInSupabase(newPayment).catch(console.warn);
      }

      return newPayment;
    },
    [appointments, payments, activeCashRegister, customers, services]
  );

  const cancelPayment = useCallback(
    async (id: string, reason?: string): Promise<void> => {
      const existing = payments.find((p) => p.id === id);
      if (!existing) {
        throw new Error("Pagamento não encontrado.");
      }
      if (existing.status === "cancelled") {
        throw new Error("Este pagamento já se encontra cancelado.");
      }

      const nowIso = new Date().toISOString();
      const updatedNotes = reason
        ? `${existing.notes ? existing.notes + " | " : ""}Estorno: ${reason}`
        : existing.notes;

      setPayments((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, status: "cancelled", notes: updatedNotes, updated_at: nowIso }
            : p
        )
      );

      // Se houver caixa aberto, registrar estorno do movimento
      if (activeCashRegister) {
        const reversalMovement: CashMovement = {
          id: `mov-rev-${Date.now()}`,
          cash_register_id: activeCashRegister.id,
          appointment_id: existing.appointment_id,
          payment_id: null,
          type: "reversal",
          category: "Estorno de Pagamento",
          amount: Number(existing.amount),
          payment_method: existing.payment_method,
          description: `Estorno do pagamento #${existing.id.slice(-6).toUpperCase()}${reason ? ` (${reason})` : ""}`,
          created_by: null,
          created_at: nowIso,
        };

        setCashMovements((prev) => [reversalMovement, ...prev]);
        if (isSupabaseConfigured()) {
          insertCashMovementInSupabase(reversalMovement).catch(console.warn);
        }
      }

      if (isSupabaseConfigured()) {
        updatePaymentStatusInSupabase(id, "cancelled", updatedNotes || undefined).catch(console.warn);
      }

      logAudit({
        action: "payment.cancelled",
        entity: "payment",
        entity_id: id,
        metadata: { motivo: reason, valor: existing.amount },
      }).catch(console.warn);
    },
    [payments, activeCashRegister, logAudit]
  );

  const openCashRegister = useCallback(
    async (openingBalance: number, notes?: string): Promise<CashRegister> => {
      if (activeCashRegister) {
        throw new Error("Já existe um caixa aberto no momento. É necessário fechá-lo antes de abrir outro.");
      }

      const balance = Math.max(0, Number(openingBalance) || 0);
      const nowIso = new Date().toISOString();
      const newReg: CashRegister = {
        id: `reg-${Date.now()}`,
        opened_at: nowIso,
        closed_at: null,
        opening_balance: balance,
        closing_balance: null,
        counted_balance: null,
        difference: null,
        status: "open",
        notes: notes?.trim() || null,
        opened_by: null,
        closed_by: null,
        created_at: nowIso,
        updated_at: nowIso,
      };

      setCashRegisters((prev) => [newReg, ...prev]);

      if (isSupabaseConfigured()) {
        insertCashRegisterInSupabase(newReg).catch(console.warn);
      }

      logAudit({
        action: "cash.opened",
        entity: "cash",
        entity_id: newReg.id,
        metadata: { saldo_inicial: balance },
      }).catch(console.warn);

      return newReg;
    },
    [activeCashRegister, logAudit]
  );

  const closeCashRegister = useCallback(
    async (countedBalance: number, notes?: string): Promise<CashRegister> => {
      if (!activeCashRegister) {
        throw new Error("Nenhum caixa aberto encontrado para fechar.");
      }

      const regId = activeCashRegister.id;
      const regMovements = cashMovements.filter((m) => m.cash_register_id === regId);

      const cashIncome = regMovements
        .filter((m) => m.type === "income" && m.payment_method === "dinheiro")
        .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

      const cashExpenses = regMovements
        .filter((m) => m.type === "expense" && m.payment_method === "dinheiro")
        .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

      const cashReversals = regMovements
        .filter((m) => m.type === "reversal" && m.payment_method === "dinheiro")
        .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

      const expectedCash =
        Number(activeCashRegister.opening_balance) +
        cashIncome -
        cashExpenses -
        cashReversals;

      const counted = Number(countedBalance) || 0;
      const difference = Number((counted - expectedCash).toFixed(2));
      const nowIso = new Date().toISOString();

      const closedReg: CashRegister = {
        ...activeCashRegister,
        status: "closed",
        closed_at: nowIso,
        closing_balance: expectedCash,
        counted_balance: counted,
        difference: difference,
        notes: notes?.trim() || activeCashRegister.notes,
        updated_at: nowIso,
      };

      setCashRegisters((prev) =>
        prev.map((r) => (r.id === regId ? closedReg : r))
      );

      if (isSupabaseConfigured()) {
        closeCashRegisterInSupabase(regId, {
          closed_at: nowIso,
          closing_balance: expectedCash,
          counted_balance: counted,
          difference: difference,
          notes: notes?.trim() || activeCashRegister.notes,
        }).catch(console.warn);
      }

      logAudit({
        action: "cash.closed",
        entity: "cash",
        entity_id: regId,
        metadata: { saldo_apurado: counted, diferenca: difference, esperado: expectedCash },
      }).catch(console.warn);

      return closedReg;
    },
    [activeCashRegister, cashMovements, logAudit]
  );

  const addCashExpense = useCallback(
    async (data: {
      category: string;
      amount: number;
      description?: string;
      payment_method?: PaymentMethod;
    }): Promise<CashMovement> => {
      if (!activeCashRegister) {
        throw new Error("Não há caixa aberto no momento para registrar despesas.");
      }

      const val = Number(data.amount);
      if (!val || val <= 0) {
        throw new Error("O valor da despesa deve ser maior que zero.");
      }

      const nowIso = new Date().toISOString();
      const newMovement: CashMovement = {
        id: `mov-${Date.now()}`,
        cash_register_id: activeCashRegister.id,
        appointment_id: null,
        payment_id: null,
        type: "expense",
        category: data.category,
        amount: val,
        payment_method: data.payment_method || "dinheiro",
        description: data.description?.trim() || null,
        created_by: null,
        created_at: nowIso,
      };

      setCashMovements((prev) => [newMovement, ...prev]);

      if (isSupabaseConfigured()) {
        insertCashMovementInSupabase(newMovement).catch(console.warn);
      }

      return newMovement;
    },
    [activeCashRegister]
  );

  // ETAPA 7: Métricas Agregadas do Período
  const getPeriodMetrics = useCallback(
    (dateRange: DateRange): PeriodMetrics => {
      return calculatePeriodMetrics({
        agendamentos,
        payments,
        cashMovements,
        clientes,
        veiculos,
        servicos,
        businessHours,
        scheduleBlocks,
        dateRange,
      });
    },
    [agendamentos, payments, cashMovements, clientes, veiculos, servicos, businessHours, scheduleBlocks]
  );

  // ETAPA 8: REGISTRO DE COMUNICAÇÃO (Requisito 20 e 21)
  const logCommunication = useCallback(
    async (payload: {
      customer_id?: string | null;
      appointment_id?: string | null;
      channel?: CommunicationChannel;
      type: CommunicationType;
      message_preview: string;
      status?: CommunicationStatus;
    }): Promise<CommunicationLog> => {
      const matchedCustomer = payload.customer_id
        ? customers.find((c) => c.id === payload.customer_id)
        : null;
      const matchedAppointment = payload.appointment_id
        ? appointments.find((a) => a.id === payload.appointment_id)
        : null;

      const newLog: CommunicationLog = {
        id: `comm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        customer_id: payload.customer_id || null,
        appointment_id: payload.appointment_id || null,
        channel: payload.channel || "whatsapp",
        type: payload.type,
        message_preview: payload.message_preview,
        status: payload.status || "opened",
        created_by: null,
        created_at: new Date().toISOString(),
        customer_name: matchedCustomer?.full_name,
        customer_phone: matchedCustomer?.phone,
        appointment_code: matchedAppointment?.code || (matchedAppointment?.id ? `#${matchedAppointment.id.slice(-6).toUpperCase()}` : undefined),
      };

      setCommunicationLogs((prev) => [newLog, ...prev]);

      if (isSupabaseConfigured()) {
        try {
          const dbLog = await insertCommunicationLogInSupabase({
            customer_id: payload.customer_id,
            appointment_id: payload.appointment_id,
            channel: payload.channel || "whatsapp",
            type: payload.type,
            message_preview: payload.message_preview,
            status: payload.status || "opened",
            created_by: null,
          });
          if (dbLog) {
            setCommunicationLogs((prev) =>
              prev.map((l) => (l.id === newLog.id ? { ...newLog, id: dbLog.id } : l))
            );
          }
        } catch (err) {
          console.warn("Falha ao persistir log de comunicação no Supabase:", err);
        }
      }

      return newLog;
    },
    [customers, appointments]
  );

  // ==========================================
  // ETAPA 9: CONFIGURAÇÕES E GERENCIAMENTO
  // ==========================================
  const updateBusinessSettings = useCallback(
    async (updates: Partial<BusinessSettings>): Promise<BusinessSettings> => {
      const updated: BusinessSettings = {
        ...businessSettings,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      setBusinessSettings(updated);

      if (isSupabaseActive && businessSettings.id) {
        await updateBusinessSettingsInSupabase(businessSettings.id, updates);
      }

      await logAudit({
        action: "settings.updated",
        entity: "settings",
        entity_id: businessSettings.id,
        metadata: { campos_alterados: Object.keys(updates) },
      });

      return updated;
    },
    [businessSettings, isSupabaseActive, logAudit]
  );

  const updateBusinessHours = useCallback(
    async (newHours: BusinessHour[]): Promise<BusinessHour[]> => {
      setBusinessHours(newHours);

      if (isSupabaseActive) {
        await updateBusinessHoursInSupabase(newHours);
      }

      await logAudit({
        action: "business_hours.updated",
        entity: "business_hours",
        metadata: { total_dias: newHours.length },
      });

      return newHours;
    },
    [isSupabaseActive, logAudit]
  );

  const addScheduleBlock = useCallback(
    async (data: { start_datetime: string; end_datetime: string; reason: string }): Promise<ScheduleBlock> => {
      let created: ScheduleBlock;
      if (isSupabaseActive) {
        const res = await insertScheduleBlockInSupabase(data);
        created = res || {
          id: `blk-${Date.now()}`,
          ...data,
          created_at: new Date().toISOString(),
        };
      } else {
        created = {
          id: `blk-${Date.now()}`,
          ...data,
          created_at: new Date().toISOString(),
        };
      }

      setScheduleBlocks((prev) => [...prev, created]);

      await logAudit({
        action: "schedule_block.created",
        entity: "schedule_block",
        entity_id: created.id,
        metadata: { motivo: created.reason, inicio: created.start_datetime, fim: created.end_datetime },
      });

      return created;
    },
    [isSupabaseActive, logAudit]
  );

  const deleteScheduleBlock = useCallback(
    async (id: string): Promise<void> => {
      const block = scheduleBlocks.find((b) => b.id === id);
      setScheduleBlocks((prev) => prev.filter((b) => b.id !== id));

      if (isSupabaseActive) {
        await deleteScheduleBlockInSupabase(id);
      }

      await logAudit({
        action: "schedule_block.deleted",
        entity: "schedule_block",
        entity_id: id,
        metadata: { motivo: block?.reason },
      });
    },
    [scheduleBlocks, isSupabaseActive, logAudit]
  );

  const updateUserRole = useCallback(
    async (id: string, newRole: UserRole): Promise<void> => {
      const validation = canDeactivateOrDemoteUser(profiles, id, newRole);
      if (!validation.allowed) {
        throw new Error(validation.reason || "Operação não permitida.");
      }

      const user = profiles.find((p) => p.id === id);
      const oldRole = user?.role;

      setProfiles((prev) =>
        prev.map((p) => (p.id === id ? { ...p, role: newRole, updated_at: new Date().toISOString() } : p))
      );

      if (isSupabaseActive) {
        await updateProfileRoleInSupabase(id, newRole);
      }

      await logAudit({
        action: "user.role_changed",
        entity: "user",
        entity_id: id,
        metadata: { usuario: user?.full_name, old_role: oldRole, new_role: newRole },
      });
    },
    [profiles, isSupabaseActive, logAudit]
  );

  const toggleUserActive = useCallback(
    async (id: string): Promise<void> => {
      const user = profiles.find((p) => p.id === id);
      if (!user) return;

      const nextActive = !user.active;
      const validation = canDeactivateOrDemoteUser(profiles, id, undefined, nextActive);
      if (!validation.allowed) {
        throw new Error(validation.reason || "Operação não permitida.");
      }

      setProfiles((prev) =>
        prev.map((p) => (p.id === id ? { ...p, active: nextActive, updated_at: new Date().toISOString() } : p))
      );

      if (isSupabaseActive) {
        await updateProfileActiveInSupabase(id, nextActive);
      }

      await logAudit({
        action: nextActive ? "user.activated" : "user.deactivated",
        entity: "user",
        entity_id: id,
        metadata: { usuario: user.full_name, status_anterior: user.active, novo_status: nextActive },
      });
    },
    [profiles, isSupabaseActive, logAudit]
  );

  const addUserProfile = useCallback(
    async (data: { full_name: string; email: string; phone?: string; role: UserRole }): Promise<Profile> => {
      const newProfile: Profile = {
        id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone || null,
        role: data.role,
        avatar_url: null,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setProfiles((prev) => [...prev, newProfile]);

      await logAudit({
        action: "user.created",
        entity: "user",
        entity_id: newProfile.id,
        metadata: { nome: newProfile.full_name, email: newProfile.email, role: newProfile.role },
      });

      return newProfile;
    },
    [logAudit]
  );

  // ==============================================================================
  // ETAPA 10: MÉTODOS DE CHECK-IN, CHECKLIST, AVARIAS E FOTOS
  // ==============================================================================

  const getCheckinByAppointmentId = useCallback(
    (appointmentId: string): VehicleCheckin | undefined => {
      return vehicleCheckins.find((c) => c.appointment_id === appointmentId);
    },
    [vehicleCheckins]
  );

  const getCheckinsByVehicleId = useCallback(
    (vehicleId: string): VehicleCheckin[] => {
      return vehicleCheckins
        .filter((c) => c.vehicle_id === vehicleId)
        .sort((a, b) => b.confirmed_at.localeCompare(a.confirmed_at));
    },
    [vehicleCheckins]
  );

  const createVehicleCheckin = useCallback(
    async (payload: {
      appointment_id: string;
      vehicle_id: string;
      customer_id: string;
      mileage?: number | null;
      fuel_level?: string | null;
      interior_condition?: string | null;
      exterior_condition?: string | null;
      objects_left_in_vehicle?: string | null;
      general_notes?: string | null;
      confirmed_by?: string | null;
      confirmed_by_name?: string | null;
      checklist_items?: Omit<VehicleChecklistItem, "id" | "checkin_id">[];
      damages?: Omit<VehicleDamage, "id" | "checkin_id" | "vehicle_id" | "created_at">[];
      photos?: Omit<VehicleCheckinPhoto, "id" | "checkin_id" | "vehicle_id" | "created_at">[];
    }): Promise<VehicleCheckin> => {
      // 1. Validação de duplicidade (Concorrência / Requisito 24)
      const existing = vehicleCheckins.find((c) => c.appointment_id === payload.appointment_id);
      if (existing) {
        throw new Error("Já existe um check-in registrado para este agendamento.");
      }

      // 2. Validação de atendimento cancelado
      const targetAppt = appointments.find((a) => a.id === payload.appointment_id);
      if (targetAppt && ["cancelled", "cancelled_by_client"].includes(targetAppt.status)) {
        throw new Error("Não é possível realizar check-in em um atendimento cancelado.");
      }
      const targetAgd = agendamentos.find((a) => a.id === payload.appointment_id);
      if (targetAgd && targetAgd.status === "Cancelado") {
        throw new Error("Não é possível realizar check-in em um atendimento cancelado.");
      }

      const checkinId = `chk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const nowIso = new Date().toISOString();

      const formattedItems: VehicleChecklistItem[] = (payload.checklist_items || []).map((it, idx) => ({
        id: `it-${Date.now()}-${idx}`,
        checkin_id: checkinId,
        category: it.category,
        item_key: it.item_key,
        item_label: it.item_label,
        status: it.status,
        notes: it.notes || null,
        created_at: nowIso,
      }));

      const formattedDamages: VehicleDamage[] = (payload.damages || []).map((d, idx) => ({
        id: `dam-${Date.now()}-${idx}`,
        checkin_id: checkinId,
        vehicle_id: payload.vehicle_id,
        type: d.type,
        location: d.location,
        specific_part: d.specific_part || null,
        severity: d.severity,
        description: d.description,
        photo_url: d.photo_url || null,
        created_by: payload.confirmed_by || null,
        created_at: nowIso,
      }));

      const formattedPhotos: VehicleCheckinPhoto[] = (payload.photos || []).map((p, idx) => ({
        id: `pho-${Date.now()}-${idx}`,
        checkin_id: checkinId,
        vehicle_id: payload.vehicle_id,
        storage_path: p.storage_path,
        photo_url: p.photo_url,
        photo_type: p.photo_type,
        description: p.description || null,
        created_by: payload.confirmed_by || null,
        created_at: nowIso,
      }));

      const newCheckin: VehicleCheckin = {
        id: checkinId,
        appointment_id: payload.appointment_id,
        vehicle_id: payload.vehicle_id,
        customer_id: payload.customer_id,
        mileage: payload.mileage ?? null,
        fuel_level: payload.fuel_level ?? null,
        interior_condition: payload.interior_condition ?? null,
        exterior_condition: payload.exterior_condition ?? null,
        objects_left_in_vehicle: payload.objects_left_in_vehicle ?? null,
        general_notes: payload.general_notes ?? null,
        confirmed_by: payload.confirmed_by ?? null,
        confirmed_by_name: payload.confirmed_by_name ?? "Funcionário",
        confirmed_at: nowIso,
        status: "completed",
        created_at: nowIso,
        updated_at: nowIso,
        checklist_items: formattedItems,
        damages: formattedDamages,
        photos: formattedPhotos,
      };

      setVehicleCheckins((prev) => [newCheckin, ...prev]);

      // Auditoria
      logAudit({
        action: "checkin.created",
        entity: "vehicle_checkin",
        entity_id: checkinId,
        metadata: {
          appointment_id: payload.appointment_id,
          mileage: payload.mileage,
          avarias_qtd: formattedDamages.length,
          fotos_qtd: formattedPhotos.length,
          responsavel: payload.confirmed_by_name,
        },
      }).catch(console.warn);

      // Persistência assíncrona no Supabase
      if (isSupabaseActive) {
        insertCheckinInSupabase(
          {
            appointment_id: payload.appointment_id,
            vehicle_id: payload.vehicle_id,
            customer_id: payload.customer_id,
            mileage: payload.mileage,
            fuel_level: payload.fuel_level,
            interior_condition: payload.interior_condition,
            exterior_condition: payload.exterior_condition,
            objects_left_in_vehicle: payload.objects_left_in_vehicle,
            general_notes: payload.general_notes,
            confirmed_by: payload.confirmed_by,
            confirmed_by_name: payload.confirmed_by_name,
            confirmed_at: nowIso,
            status: "completed",
          },
          payload.checklist_items || [],
          payload.damages || [],
          payload.photos || []
        ).catch((err) => console.warn("Erro ao salvar check-in no Supabase:", err));
      }

      return newCheckin;
    },
    [vehicleCheckins, appointments, agendamentos, isSupabaseActive, logAudit]
  );

  const updateVehicleCheckin = useCallback(
    async (id: string, updates: Partial<VehicleCheckin>): Promise<VehicleCheckin> => {
      const existing = vehicleCheckins.find((c) => c.id === id);
      if (!existing) throw new Error("Check-in não encontrado para edição.");

      const updated: VehicleCheckin = {
        ...existing,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      setVehicleCheckins((prev) => prev.map((c) => (c.id === id ? updated : c)));

      logAudit({
        action: "checkin.updated",
        entity: "vehicle_checkin",
        entity_id: id,
        metadata: { campos_atualizados: Object.keys(updates) },
      }).catch(console.warn);

      return updated;
    },
    [vehicleCheckins, logAudit]
  );

  const addVehicleDamage = useCallback(
    async (
      checkinId: string,
      damage: Omit<VehicleDamage, "id" | "checkin_id">
    ): Promise<VehicleDamage> => {
      const checkin = vehicleCheckins.find((c) => c.id === checkinId);
      if (!checkin) throw new Error("Check-in não encontrado para adicionar avaria.");

      const newDamage: VehicleDamage = {
        id: `dam-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        checkin_id: checkinId,
        vehicle_id: damage.vehicle_id,
        type: damage.type,
        location: damage.location,
        specific_part: damage.specific_part || null,
        severity: damage.severity,
        description: damage.description,
        photo_url: damage.photo_url || null,
        created_by: damage.created_by || null,
        created_at: new Date().toISOString(),
      };

      setVehicleCheckins((prev) =>
        prev.map((c) => {
          if (c.id === checkinId) {
            return {
              ...c,
              damages: [...(c.damages || []), newDamage],
              updated_at: new Date().toISOString(),
            };
          }
          return c;
        })
      );

      logAudit({
        action: "damage.added",
        entity: "vehicle_damage",
        entity_id: newDamage.id,
        metadata: {
          checkin_id: checkinId,
          tipo: newDamage.type,
          local: newDamage.location,
          parte: newDamage.specific_part,
          gravidade: newDamage.severity,
        },
      }).catch(console.warn);

      return newDamage;
    },
    [vehicleCheckins, logAudit]
  );

  const removeVehicleDamage = useCallback(
    async (checkinId: string, damageId: string): Promise<void> => {
      setVehicleCheckins((prev) =>
        prev.map((c) => {
          if (c.id === checkinId) {
            return {
              ...c,
              damages: (c.damages || []).filter((d) => d.id !== damageId),
              updated_at: new Date().toISOString(),
            };
          }
          return c;
        })
      );

      logAudit({
        action: "damage.removed",
        entity: "vehicle_damage",
        entity_id: damageId,
        metadata: { checkin_id: checkinId },
      }).catch(console.warn);
    },
    [logAudit]
  );

  const addVehiclePhoto = useCallback(
    async (
      checkinId: string,
      photo: Omit<VehicleCheckinPhoto, "id" | "checkin_id">
    ): Promise<VehicleCheckinPhoto> => {
      const newPhoto: VehicleCheckinPhoto = {
        id: `pho-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        checkin_id: checkinId,
        vehicle_id: photo.vehicle_id,
        storage_path: photo.storage_path,
        photo_url: photo.photo_url,
        photo_type: photo.photo_type,
        description: photo.description || null,
        created_by: photo.created_by || null,
        created_at: new Date().toISOString(),
      };

      setVehicleCheckins((prev) =>
        prev.map((c) => {
          if (c.id === checkinId) {
            return {
              ...c,
              photos: [...(c.photos || []), newPhoto],
              updated_at: new Date().toISOString(),
            };
          }
          return c;
        })
      );

      logAudit({
        action: "photo.added",
        entity: "vehicle_checkin",
        entity_id: newPhoto.id,
        metadata: { checkin_id: checkinId, tipo: newPhoto.photo_type },
      }).catch(console.warn);

      return newPhoto;
    },
    [logAudit]
  );

  const removeVehiclePhoto = useCallback(
    async (checkinId: string, photoId: string): Promise<void> => {
      setVehicleCheckins((prev) =>
        prev.map((c) => {
          if (c.id === checkinId) {
            return {
              ...c,
              photos: (c.photos || []).filter((p) => p.id !== photoId),
              updated_at: new Date().toISOString(),
            };
          }
          return c;
        })
      );

      logAudit({
        action: "photo.removed",
        entity: "vehicle_checkin",
        entity_id: photoId,
        metadata: { checkin_id: checkinId },
      }).catch(console.warn);
    },
    [logAudit]
  );

  const canStartAppointment = useCallback(
    (appointmentId: string): { canStart: boolean; reason?: string; checkin?: VehicleCheckin } => {
      const checkin = vehicleCheckins.find(
        (c) => c.appointment_id === appointmentId && c.status === "completed"
      );

      const requireCheckin = businessSettings.require_checkin_to_start !== false;

      if (!requireCheckin) {
        return { canStart: true, checkin };
      }

      if (!checkin) {
        return {
          canStart: false,
          reason: "Check-in do veículo obrigatório antes de iniciar o atendimento.",
          checkin: undefined,
        };
      }

      return { canStart: true, checkin };
    },
    [vehicleCheckins, businessSettings.require_checkin_to_start]
  );

  // ETAPA 11: PÓS-ATENDIMENTO, CONFERÊNCIA FINAL E ENTREGA
  const concluirServico = useCallback(
    async (
      id: string,
      options?: { completed_by?: string; completed_by_name?: string; notes?: string }
    ): Promise<Appointment> => {
      const existing = appointments.find((a) => a.id === id);
      if (!existing) throw new Error("Atendimento não encontrado.");
      if (existing.status !== "in_progress") {
        throw new Error("Apenas atendimentos em andamento podem ter o serviço concluído.");
      }

      const nowIso = new Date().toISOString();
      const updatedApp: Appointment = {
        ...existing,
        status: "completed",
        completed_at: existing.completed_at || nowIso,
        completed_by: options?.completed_by || null,
        completed_by_name: options?.completed_by_name || "Equipe do Box",
        notes: options?.notes !== undefined ? options.notes : existing.notes,
        updated_at: nowIso,
      };

      setAppointments((prev) => prev.map((a) => (a.id === id ? updatedApp : a)));

      const hist: AppointmentStatusHistory = {
        id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        appointment_id: id,
        old_status: existing.status,
        new_status: "completed",
        changed_by: options?.completed_by_name || null,
        changed_at: nowIso,
        notes: "Lavagem/Serviço técnico concluído no box",
      };
      setStatusHistory((prev) => [hist, ...prev]);

      logAudit({
        action: "appointment.completed",
        entity: "appointment",
        entity_id: id,
        metadata: {
          responsavel: options?.completed_by_name || "Equipe",
          duracao_minutos: computeRealDurationMinutes(existing.started_at, nowIso),
        },
      }).catch(console.warn);

      if (isSupabaseConfigured()) {
        updateAppointmentInSupabase(id, {
          status: "completed",
          completed_at: updatedApp.completed_at,
          completed_by: updatedApp.completed_by,
          completed_by_name: updatedApp.completed_by_name,
          updated_at: nowIso,
        } as Partial<Appointment>).catch(console.warn);
      }

      return updatedApp;
    },
    [appointments, logAudit]
  );

  const salvarConferenciaFinal = useCallback(
    async (
      id: string,
      data: {
        checkout_checklist: Record<string, boolean>;
        final_notes?: string;
        markAsReady?: boolean;
        ready_by?: string;
        ready_by_name?: string;
        final_photos?: Array<{
          storage_path: string;
          photo_url: string;
          photo_type: CheckinPhotoType;
          description?: string;
        }>;
      }
    ): Promise<Appointment> => {
      const existing = appointments.find((a) => a.id === id);
      if (!existing) throw new Error("Atendimento não encontrado.");

      const nowIso = new Date().toISOString();
      const newStatus: AppointmentStatus = data.markAsReady ? "ready" : existing.status;
      const ready_at = data.markAsReady ? (existing.ready_at || nowIso) : existing.ready_at;
      const ready_by = data.markAsReady ? (data.ready_by || null) : existing.ready_by;
      const ready_by_name = data.markAsReady ? (data.ready_by_name || "Conferente") : existing.ready_by_name;

      const updatedApp: Appointment = {
        ...existing,
        status: newStatus,
        checkout_checklist: data.checkout_checklist,
        final_notes: data.final_notes !== undefined ? data.final_notes : existing.final_notes,
        ready_at,
        ready_by,
        ready_by_name,
        updated_at: nowIso,
      };

      setAppointments((prev) => prev.map((a) => (a.id === id ? updatedApp : a)));

      if (data.final_photos && data.final_photos.length > 0) {
        const checkin = vehicleCheckins.find((c) => c.appointment_id === id);
        if (checkin) {
          const newPhotos: VehicleCheckinPhoto[] = data.final_photos.map((p, idx) => ({
            id: `final-photo-${Date.now()}-${idx}`,
            checkin_id: checkin.id,
            vehicle_id: checkin.vehicle_id,
            storage_path: p.storage_path,
            photo_url: p.photo_url,
            photo_type: p.photo_type,
            description: p.description || "Foto final do veículo pronto",
            created_at: nowIso,
          }));
          setVehicleCheckins((prev) =>
            prev.map((c) =>
              c.id === checkin.id
                ? { ...c, photos: [...(c.photos || []), ...newPhotos], updated_at: nowIso }
                : c
            )
          );
        }
      }

      if (data.markAsReady) {
        const hist: AppointmentStatusHistory = {
          id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          appointment_id: id,
          old_status: existing.status,
          new_status: "ready",
          changed_by: data.ready_by_name || null,
          changed_at: nowIso,
          notes: "Veículo conferido e marcado como pronto para retirada",
        };
        setStatusHistory((prev) => [hist, ...prev]);

        logAudit({
          action: "appointment.ready",
          entity: "appointment",
          entity_id: id,
          metadata: {
            responsavel: data.ready_by_name || "Conferente",
            itens_conferidos: Object.values(data.checkout_checklist).filter(Boolean).length,
          },
        }).catch(console.warn);
      }

      if (isSupabaseConfigured()) {
        updateAppointmentInSupabase(id, {
          checkout_checklist: updatedApp.checkout_checklist,
          final_notes: updatedApp.final_notes,
          status: updatedApp.status,
          ready_at: updatedApp.ready_at,
          ready_by: updatedApp.ready_by,
          ready_by_name: updatedApp.ready_by_name,
          updated_at: nowIso,
        } as Partial<Appointment>).catch(console.warn);
      }

      return updatedApp;
    },
    [appointments, vehicleCheckins, logAudit]
  );

  const marcarComoPronto = useCallback(
    async (
      id: string,
      options?: { ready_by?: string; ready_by_name?: string }
    ): Promise<Appointment> => {
      const existing = appointments.find((a) => a.id === id);
      if (!existing) throw new Error("Atendimento não encontrado.");

      const nowIso = new Date().toISOString();
      const updatedApp: Appointment = {
        ...existing,
        status: "ready",
        ready_at: existing.ready_at || nowIso,
        ready_by: options?.ready_by || null,
        ready_by_name: options?.ready_by_name || "Equipe",
        updated_at: nowIso,
      };

      setAppointments((prev) => prev.map((a) => (a.id === id ? updatedApp : a)));

      const hist: AppointmentStatusHistory = {
        id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        appointment_id: id,
        old_status: existing.status,
        new_status: "ready",
        changed_by: options?.ready_by_name || null,
        changed_at: nowIso,
        notes: "Veículo pronto para retirada pelo cliente",
      };
      setStatusHistory((prev) => [hist, ...prev]);

      logAudit({
        action: "appointment.ready",
        entity: "appointment",
        entity_id: id,
        metadata: { responsavel: options?.ready_by_name || "Equipe" },
      }).catch(console.warn);

      if (isSupabaseConfigured()) {
        updateAppointmentInSupabase(id, {
          status: "ready",
          ready_at: updatedApp.ready_at,
          ready_by: updatedApp.ready_by,
          ready_by_name: updatedApp.ready_by_name,
          updated_at: nowIso,
        } as Partial<Appointment>).catch(console.warn);
      }

      return updatedApp;
    },
    [appointments, logAudit]
  );

  const entregarVeiculo = useCallback(
    async (
      id: string,
      options: {
        delivered_by?: string;
        delivered_by_name?: string;
        rating?: number;
        feedback?: string;
        overridePayment?: boolean;
        overrideReason?: string;
      }
    ): Promise<Appointment> => {
      const existing = appointments.find((a) => a.id === id);
      if (!existing) throw new Error("Atendimento não encontrado.");

      // Proteção de concorrência: evitar dupla entrega
      if (existing.status === "delivered") {
        throw new Error("Este veículo já foi entregue anteriormente!");
      }

      // Validação financeira
      const paySummary = calculateAppointmentPaymentSummary(id, Number(existing.price), payments);
      if (paySummary.remainingBalance > 0.01 && !options.overridePayment) {
        throw new Error(
          `Não é permitido entregar o veículo com saldo pendente de R$ ${paySummary.remainingBalance.toFixed(2).replace(".", ",")}. Registre o pagamento ou utilize liberação autorizada.`
        );
      }

      if (paySummary.remainingBalance > 0.01 && options.overridePayment) {
        if (!options.overrideReason || !options.overrideReason.trim()) {
          throw new Error("Justificativa obrigatória para liberar veículo com saldo pendente.");
        }
      }

      const nowIso = new Date().toISOString();
      const updatedApp: Appointment = {
        ...existing,
        status: "delivered",
        delivered_at: nowIso,
        delivered_by: options.delivered_by || null,
        delivered_by_name: options.delivered_by_name || "Recepcionista",
        final_rating: options.rating || null,
        final_feedback: options.feedback?.trim() || null,
        delivery_override_reason: options.overridePayment ? options.overrideReason?.trim() || null : null,
        updated_at: nowIso,
      };

      setAppointments((prev) => prev.map((a) => (a.id === id ? updatedApp : a)));

      const hist: AppointmentStatusHistory = {
        id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        appointment_id: id,
        old_status: existing.status,
        new_status: "delivered",
        changed_by: options.delivered_by_name || null,
        changed_at: nowIso,
        notes: options.overridePayment
          ? `Veículo entregue ao cliente (Liberação com pendência: ${options.overrideReason})`
          : "Veículo entregue ao cliente e atendimento finalizado com sucesso",
      };
      setStatusHistory((prev) => [hist, ...prev]);

      if (options.overridePayment) {
        logAudit({
          action: "appointment.delivery_override",
          entity: "appointment",
          entity_id: id,
          metadata: {
            responsavel: options.delivered_by_name || "Admin",
            saldo_pendente: paySummary.remainingBalance,
            motivo: options.overrideReason,
          },
        }).catch(console.warn);
      }

      logAudit({
        action: "appointment.delivered",
        entity: "appointment",
        entity_id: id,
        metadata: {
          responsavel: options.delivered_by_name || "Equipe",
          avaliacao: options.rating || "Não avaliado",
          tempo_espera_minutos: computeWaitingForPickupMinutes(existing.ready_at, nowIso),
        },
      }).catch(console.warn);

      if (isSupabaseConfigured()) {
        updateAppointmentInSupabase(id, {
          status: "delivered",
          delivered_at: updatedApp.delivered_at,
          delivered_by: updatedApp.delivered_by,
          delivered_by_name: updatedApp.delivered_by_name,
          final_rating: updatedApp.final_rating,
          final_feedback: updatedApp.final_feedback,
          delivery_override_reason: updatedApp.delivery_override_reason,
          updated_at: nowIso,
        } as Partial<Appointment>).catch(console.warn);
      }

      // ETAPA 12: Registrar avaliação automaticamente se informada na entrega
      if (options.rating) {
        const revRating = Math.min(5, Math.max(1, options.rating));
        const client = customers.find((c) => c.id === existing.customer_id);
        const srv = services.find((s) => s.id === existing.service_id);
        const veh = vehicles.find((v) => v.id === existing.vehicle_id);

        const newReview: ServiceReview = {
          id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          appointment_id: id,
          customer_id: existing.customer_id,
          rating: revRating,
          comment: options.feedback?.trim() || null,
          created_by: options.delivered_by || null,
          created_at: nowIso,
          updated_at: nowIso,
          customer_name: client?.full_name,
          service_name: srv?.name,
          vehicle_plate: veh?.plate || undefined,
        };
        setServiceReviews((prev) => {
          const filtered = prev.filter((r) => r.appointment_id !== id);
          return [newReview, ...filtered];
        });
        if (isSupabaseActive) {
          upsertServiceReviewInSupabase({
            appointment_id: id,
            customer_id: existing.customer_id,
            rating: revRating,
            comment: options.feedback?.trim() || null,
            created_by: options.delivered_by || null,
          }).catch(console.warn);
        }
      }

      return updatedApp;
    },
    [appointments, payments, customers, services, vehicles, isSupabaseActive, logAudit]
  );

  // ETAPA 12: AVALIAÇÕES, RETENÇÃO, FIDELIZAÇÃO E TAGS DE CLIENTES
  const addServiceReview = useCallback(
    async (payload: {
      appointment_id: string;
      customer_id: string;
      rating: number;
      comment?: string;
    }): Promise<ServiceReview> => {
      const existingApp = appointments.find((a) => a.id === payload.appointment_id);
      const client = customers.find((c) => c.id === payload.customer_id);
      const srv = existingApp ? services.find((s) => s.id === existingApp.service_id) : undefined;
      const veh = existingApp ? vehicles.find((v) => v.id === existingApp.vehicle_id) : undefined;
      const nowIso = new Date().toISOString();

      const existingReview = serviceReviews.find((r) => r.appointment_id === payload.appointment_id);

      const newReview: ServiceReview = {
        id: existingReview ? existingReview.id : `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        appointment_id: payload.appointment_id,
        customer_id: payload.customer_id,
        rating: Math.min(5, Math.max(1, payload.rating)),
        comment: payload.comment?.trim() || null,
        created_by: profiles.find((p) => p.role === currentRole)?.id || null,
        created_at: existingReview ? existingReview.created_at : nowIso,
        updated_at: nowIso,
        customer_name: client?.full_name,
        service_name: srv?.name,
        vehicle_plate: veh?.plate || undefined,
      };

      setServiceReviews((prev) => {
        const filtered = prev.filter((r) => r.appointment_id !== payload.appointment_id);
        return [newReview, ...filtered];
      });

      if (existingApp && !existingApp.final_rating) {
        setAppointments((prev) =>
          prev.map((a) =>
            a.id === payload.appointment_id
              ? { ...a, final_rating: newReview.rating, final_feedback: newReview.comment }
              : a
          )
        );
      }

      logAudit({
        action: existingReview ? "review.updated" : "review.created",
        entity: "service_review",
        entity_id: newReview.id,
        metadata: {
          rating: newReview.rating,
          customer_id: payload.customer_id,
          appointment_id: payload.appointment_id,
          has_comment: Boolean(payload.comment),
        },
      }).catch(console.warn);

      if (isSupabaseActive) {
        upsertServiceReviewInSupabase(payload).catch(console.warn);
      }

      return newReview;
    },
    [appointments, customers, services, vehicles, serviceReviews, profiles, currentRole, isSupabaseActive, logAudit]
  );

  const assignCustomerTag = useCallback(
    async (customerId: string, tagName: string): Promise<void> => {
      const exists = customerTagAssignments.some(
        (cta) => cta.customer_id === customerId && cta.tag_name === tagName
      );
      if (exists) return;

      const newAssignment: CustomerTagAssignment = {
        id: `cta-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        customer_id: customerId,
        tag_name: tagName,
        created_by: profiles.find((p) => p.role === currentRole)?.id || null,
        created_at: new Date().toISOString(),
      };

      setCustomerTagAssignments((prev) => [...prev, newAssignment]);

      logAudit({
        action: "customer_tag.assigned",
        entity: "customer_tag",
        entity_id: customerId,
        metadata: { tag: tagName, customer_id: customerId },
      }).catch(console.warn);

      if (isSupabaseActive) {
        assignCustomerTagInSupabase(customerId, tagName, newAssignment.created_by).catch(console.warn);
      }
    },
    [customerTagAssignments, profiles, currentRole, isSupabaseActive, logAudit]
  );

  const removeCustomerTag = useCallback(
    async (customerId: string, tagName: string): Promise<void> => {
      setCustomerTagAssignments((prev) =>
        prev.filter((cta) => !(cta.customer_id === customerId && cta.tag_name === tagName))
      );

      logAudit({
        action: "customer_tag.removed",
        entity: "customer_tag",
        entity_id: customerId,
        metadata: { tag: tagName, customer_id: customerId },
      }).catch(console.warn);

      if (isSupabaseActive) {
        removeCustomerTagInSupabase(customerId, tagName).catch(console.warn);
      }
    },
    [isSupabaseActive, logAudit]
  );

  const updateVipSettings = useCallback(
    async (settings: {
      vip_min_spent?: number;
      vip_min_visits?: number;
      inactive_threshold_days?: number;
    }): Promise<void> => {
      await updateBusinessSettings(settings);
      logAudit({
        action: "vip_settings.updated",
        entity: "settings",
        metadata: settings,
      }).catch(console.warn);
    },
    [updateBusinessSettings, logAudit]
  );

  const resetToDefaults = useCallback(() => {
    const d = getInitialDbData();
    setCustomers(d.initialCustomers);
    setVehicles(d.initialVehicles);
    setServices(d.initialServices);
    setAppointments(d.initialAppointments);
    setBusinessSettings(INITIAL_BUSINESS_SETTINGS);
    setBusinessHours(INITIAL_BUSINESS_HOURS);
    setScheduleBlocks(INITIAL_SCHEDULE_BLOCKS);
    setStatusHistory([]);
    setPayments(d.initialPayments);
    setCashRegisters(d.initialCashRegisters);
    setCashMovements(d.initialCashMovements);
    setCommunicationLogs(INITIAL_COMMUNICATION_LOGS);
    setProfiles(INITIAL_PROFILES);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setVehicleCheckins(INITIAL_VEHICLE_CHECKINS);
    setCurrentRole("admin");
    try {
      localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
      localStorage.removeItem(STORAGE_KEYS.VEHICLES);
      localStorage.removeItem(STORAGE_KEYS.SERVICES);
      localStorage.removeItem(STORAGE_KEYS.APPOINTMENTS);
      localStorage.removeItem(STORAGE_KEYS.SETTINGS);
      localStorage.removeItem(STORAGE_KEYS.HOURS);
      localStorage.removeItem(STORAGE_KEYS.BLOCKS);
      localStorage.removeItem(STORAGE_KEYS.STATUS_HISTORY);
      localStorage.removeItem(STORAGE_KEYS.PAYMENTS);
      localStorage.removeItem(STORAGE_KEYS.CASH_REGISTERS);
      localStorage.removeItem(STORAGE_KEYS.CASH_MOVEMENTS);
      localStorage.removeItem(STORAGE_KEYS.COMMUNICATION_LOGS);
      localStorage.removeItem(STORAGE_KEYS.PROFILES);
      localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
      localStorage.removeItem(STORAGE_KEYS.VEHICLE_CHECKINS);
    } catch {}
  }, []);

  return (
    <StoreContext.Provider
      value={{
        customers,
        vehicles,
        services,
        appointments,
        businessSettings,
        businessHours,
        scheduleBlocks,
        clientes,
        veiculos,
        servicos,
        agendamentos,
        metricasHoje,
        totalClientesAtivos,
        totalVeiculosAtivos,
        novosClientesMes,
        isLoaded,
        isSupabaseActive,

        getAvailableSlotsForDate,
        findCustomerByPhone,

        addCustomer,
        updateCustomer,
        deleteCustomer,
        addCliente,
        updateCliente,
        deleteCliente,
        deactivateCliente,
        activateCliente,
        checkCustomerDuplicate,

        addVehicle,
        updateVehicle,
        deleteVehicle,
        addVeiculo,
        updateVeiculo,
        deleteVeiculo,
        deactivateVeiculo,
        activateVeiculo,
        getVeiculosPorCliente,
        checkVehicleDuplicate,

        getClienteDetails,
        getVeiculoDetails,

        updateServicePrice,
        addService,
        updateServico,
        addServico,
        deactivateServico,
        activateServico,
        deleteServico,

        addAppointment,
        updateAppointmentStatus,
        cancelAppointment,
        deleteAppointment,

        addAgendamento,
        updateAgendamentoStatus,
        updateAgendamentoNotes,
        updateAgendamentoChecklist,
        getStatusHistory,
        updateAgendamento,
        deleteAgendamento,

        metricasAtendimentosHoje,

        // Etapa 6
        payments,
        cashRegisters,
        cashMovements,
        activeCashRegister,
        getAppointmentPaymentSummary,
        addPayment,
        cancelPayment,
        openCashRegister,
        closeCashRegister,
        addCashExpense,
        metricasFinanceirasHoje,

        // Etapa 7: Papel do Usuário & Relatórios
        currentRole,
        setCurrentRole,
        canViewFinancial,
        getPeriodMetrics,

        // Etapa 8: Comunicação e WhatsApp
        communicationLogs,
        logCommunication,

        // Etapa 9: Configurações, Usuários, Permissões e Auditoria
        profiles,
        auditLogs,
        updateBusinessSettings,
        updateBusinessHours,
        addScheduleBlock,
        deleteScheduleBlock,
        updateUserRole,
        toggleUserActive,
        addUserProfile,
        logAudit,
        isCurrentUserAdmin,
        isCurrentUserManager,
        hasCurrentUserPermission,

        // Etapa 10: Check-in, Checklist, Avarias e Fotos
        vehicleCheckins,
        getCheckinByAppointmentId,
        getCheckinsByVehicleId,
        createVehicleCheckin,
        updateVehicleCheckin,
        addVehicleDamage,
        removeVehicleDamage,
        addVehiclePhoto,
        removeVehiclePhoto,
        canStartAppointment,

        // Etapa 11: Pós-Atendimento, Conferência Final e Entrega
        concluirServico,
        salvarConferenciaFinal,
        marcarComoPronto,
        entregarVeiculo,

        // Etapa 12: Avaliações, Retenção, Fidelização e Inteligência de Clientes
        serviceReviews,
        customerTags,
        customerTagAssignments,
        addServiceReview,
        assignCustomerTag,
        removeCustomerTag,
        updateVipSettings,

        checkAvailability,
        resetToDefaults,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useAppStore deve ser usado dentro de StoreProvider");
  }
  return context;
}

