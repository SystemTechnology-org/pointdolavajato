export * from "./database";

// Compatibilidade com a Etapa 1
import type { VehicleType, AppointmentStatus, AppointmentFinancialStatus, PaymentMethod } from "./database";


export type TipoVeiculo = "Moto" | "Carro pequeno" | "SUV" | "Caminhonete";

export const TIPOS_VEICULO: TipoVeiculo[] = [
  "Moto",
  "Carro pequeno",
  "SUV",
  "Caminhonete",
];

export type StatusAgendamento =
  | "Agendado"
  | "Confirmado"
  | "Aguardando"
  | "Em atendimento"
  | "Concluído"
  | "Finalizado"
  | "Pronto"
  | "Aguardando pagamento"
  | "Aguardando retirada"
  | "Entregue"
  | "Cancelado"
  | "Não compareceu";

export const STATUS_AGENDAMENTO: StatusAgendamento[] = [
  "Agendado",
  "Confirmado",
  "Aguardando",
  "Em atendimento",
  "Concluído",
  "Pronto",
  "Aguardando pagamento",
  "Aguardando retirada",
  "Entregue",
  "Cancelado",
  "Não compareceu",
];

export const MAP_TIPO_TO_DB: Record<TipoVeiculo, VehicleType> = {
  Moto: "moto",
  "Carro pequeno": "car_small",
  SUV: "suv",
  Caminhonete: "pickup",
};

export const MAP_DB_TO_TIPO: Record<VehicleType, TipoVeiculo> = {
  moto: "Moto",
  car_small: "Carro pequeno",
  suv: "SUV",
  pickup: "Caminhonete",
};

export const MAP_STATUS_TO_DB: Record<StatusAgendamento, AppointmentStatus> = {
  Agendado: "scheduled",
  Confirmado: "confirmed",
  Aguardando: "waiting",
  "Em atendimento": "in_progress",
  Concluído: "completed",
  Finalizado: "completed",
  Pronto: "ready",
  "Aguardando pagamento": "awaiting_payment",
  "Aguardando retirada": "awaiting_pickup",
  Entregue: "delivered",
  Cancelado: "cancelled",
  "Não compareceu": "no_show",
};

export const MAP_DB_TO_STATUS: Record<AppointmentStatus, StatusAgendamento> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  waiting: "Aguardando",
  in_progress: "Em atendimento",
  completed: "Concluído",
  ready: "Pronto",
  awaiting_payment: "Aguardando pagamento",
  awaiting_pickup: "Aguardando retirada",
  delivered: "Entregue",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};

export interface Cliente {
  id: string;
  nome: string;
  whatsapp: string;
  email?: string;
  observacoes?: string;
  ativo?: boolean;
  created_at: string;
  updated_at?: string;
  ultimo_atendimento?: string;
  veiculos?: Veiculo[];
}

export interface Veiculo {
  id: string;
  cliente_id: string;
  cliente_nome?: string;
  marca: string;
  modelo: string;
  placa: string;
  cor: string;
  tipo: TipoVeiculo;
  observacoes?: string;
  ativo?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Servico {
  id: string;
  numero: number;
  nome: string;
  descricao?: string;
  preco: number;
  duracao_minutos: number;
  tipo_veiculo: TipoVeiculo;
  ativo: boolean;
}

export interface Agendamento {
  id: string;
  cliente_id?: string;
  cliente_nome: string;
  cliente_whatsapp: string;
  veiculo_id?: string;
  veiculo_tipo: TipoVeiculo;
  veiculo_modelo: string;
  veiculo_placa: string;
  servico_id: string;
  servico_nome: string;
  valor: number;
  data: string; // YYYY-MM-DD
  horario: string; // HH:mm
  status: StatusAgendamento;
  observacoes?: string;
  code?: string;
  cancel_token?: string;
  confirmed_at?: string;
  started_at?: string;
  completed_at?: string;
  completed_by?: string;
  completed_by_name?: string;
  ready_at?: string;
  ready_by?: string;
  ready_by_name?: string;
  delivered_at?: string;
  delivered_by?: string;
  delivered_by_name?: string;
  cancelled_at?: string;
  no_show_at?: string;
  cancellation_reason?: string;
  checklist?: Record<string, boolean | string>;
  checkout_checklist?: Record<string, boolean>;
  final_notes?: string;
  final_rating?: number;
  final_feedback?: string;
  delivery_override_reason?: string;
  vehicle_photos?: string[];
  duracao_minutos?: number;
  duracao_real_minutos?: number;
  financial_status?: AppointmentFinancialStatus;
  paid_amount?: number;
  status_history?: {
    id: string;
    old_status?: StatusAgendamento;
    new_status: StatusAgendamento;
    changed_by?: string;
    changed_at: string;
    notes?: string;
  }[];
  created_at: string;
}


export interface ResumoMetricas {
  totalAgendamentos: number;
  emAtendimento: number;
  concluidos: number;
  faturamentoTotal: number;
}

export type { AppointmentStatusHistory } from "./database";

// ==============================================================================
// ETAPA 7: DASHBOARD E RELATÓRIOS
// ==============================================================================
export type PeriodFilter =
  | "today"
  | "yesterday"
  | "last7days"
  | "last30days"
  | "thisMonth"
  | "lastMonth"
  | "custom";

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  label: string;     // Ex: "Hoje", "Últimos 7 dias", etc.
}

export interface ServicePerformance {
  id: string;
  nome: string;
  tipoVeiculo: string;
  quantidade: number;
  faturamento: number;
  ticketMedio: number;
  percentualVolume: number;
  percentualReceita: number;
}

export interface VehicleTypeDistribution {
  tipo: TipoVeiculo;
  quantidade: number;
  percentual: number;
}

export interface PaymentMethodBreakdown {
  metodo: PaymentMethod;
  label: string;
  quantidade: number;
  valor: number;
  percentual: number;
}

export interface DailyTrendPoint {
  date: string; // YYYY-MM-DD
  displayDate: string; // "03/10"
  weekday: string; // "Sáb"
  faturamento: number;
  recebido: number;
  atendimentosConcluidos: number;
  atendimentosTotal: number;
}

export interface CustomerReportItem {
  id: string;
  nome: string;
  whatsapp: string;
  email?: string;
  veiculosCount: number;
  totalAtendimentosPeriodo: number;
  atendimentosConcluidosPeriodo: number;
  totalGastoPeriodo: number;
  isRecorrente: boolean; // >= 2 atendimentos concluídos no período
  ultimoAtendimentoPeriodo?: string;
}

export interface PeriodMetrics {
  period: DateRange;

  // 1. Atendimentos
  totalAgendamentos: number;
  agendados: number;
  confirmados: number;
  aguardando: number;
  emAtendimento: number;
  concluidos: number;
  cancelados: number;
  naoCompareceram: number;
  taxaCancelamento: number; // 0 - 100
  taxaNoShow: number;        // 0 - 100

  // 2. Financeiro (Visível para gestores: owner, admin, manager)
  faturamentoPrevisto: number;
  recebidoTotal: number;
  pendenteTotal: number;
  saidasCaixaTotal: number;
  resultadoCaixa: number; // Entradas - Saídas (NUNCA chamar de lucro)
  totalPagamentosQtd: number;
  porMetodo: Record<PaymentMethod, PaymentMethodBreakdown>;

  // 3. Rankings e Distribuições
  servicosRealizados: ServicePerformance[];
  veiculosPorTipo: VehicleTypeDistribution[];

  // 4. Clientes
  totalClientesAtivos: number;
  novosClientes: number;
  clientesAtendidos: number;
  clientesRecorrentes: number; // >= 2 atendimentos concluídos no período
  clientesSemAtendimento: number;

  // 5. Ocupação da Agenda (horários baseados no horário comercial configurado)
  horariosOcupados: number;
  horariosDisponiveis: number;
  horariosBloqueados: number;
  taxaOcupacao: number;

  // 6. Tendência Diária (para gráficos de períodos > 1 dia)
  tendenciaDiaria: DailyTrendPoint[];
}

