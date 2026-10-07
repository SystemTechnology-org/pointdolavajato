// ==============================================================================
// src/lib/services/reports.ts
// ETAPA 7 — Módulo de Relatórios, Agregações Analíticas e Exportação CSV
// Point do Coco Lava Jato Litoral
// ==============================================================================

import {
  type Agendamento,
  type Cliente,
  type Veiculo,
  type Servico,
  type Payment,
  type CashMovement,
  type BusinessHour,
  type ScheduleBlock,
  type DateRange,
  type PeriodFilter,
  type PeriodMetrics,
  type PaymentMethod,
  PAYMENT_METHOD_LABELS,
  TIPOS_VEICULO,
  type DailyTrendPoint,
  type CustomerReportItem,
  type ServicePerformance,
  type VehicleTypeDistribution,
  type PaymentMethodBreakdown,
} from "@/types";

// ==============================================================================
// 1. RESOLVER INTERVALO DE DATAS (TIMEZONE AMERICA/BAHIA)
// ==============================================================================

/**
 * Retorna a data no fuso de Salvador/Bahia em formato YYYY-MM-DD
 */
export function getBahiaDateString(offsetDays: number = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bahia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Formata YYYY-MM-DD para exibição visual amigável (DD/MM/YYYY)
 */
export function formatDateBr(dateStr: string): string {
  if (!dateStr || dateStr.length < 10) return dateStr || "";
  const [year, month, day] = dateStr.substring(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

/**
 * Verifica se um status operacional representa serviço finalizado, pronto ou entregue
 */
export function isCompletedStatus(status: string): boolean {
  return [
    "Concluído",
    "Pronto",
    "Aguardando pagamento",
    "Aguardando retirada",
    "Entregue",
    "Finalizado",
  ].includes(status);
}

/**
 * Resolve o DateRange de acordo com o filtro selecionado
 */
export function resolveDateRange(
  filter: PeriodFilter,
  customStart?: string,
  customEnd?: string
): DateRange {
  const today = getBahiaDateString(0);

  switch (filter) {
    case "today":
      return {
        startDate: today,
        endDate: today,
        label: "Hoje",
      };

    case "yesterday": {
      const yesterday = getBahiaDateString(-1);
      return {
        startDate: yesterday,
        endDate: yesterday,
        label: "Ontem",
      };
    }

    case "last7days": {
      const start7 = getBahiaDateString(-6);
      return {
        startDate: start7,
        endDate: today,
        label: `Últimos 7 dias (${formatDateBr(start7)} a ${formatDateBr(today)})`,
      };
    }

    case "last30days": {
      const start30 = getBahiaDateString(-29);
      return {
        startDate: start30,
        endDate: today,
        label: `Últimos 30 dias (${formatDateBr(start30)} a ${formatDateBr(today)})`,
      };
    }

    case "thisMonth": {
      const [year, month] = today.split("-");
      const firstDay = `${year}-${month}-01`;
      // Último dia do mês atual
      const lastDate = new Date(Number(year), Number(month), 0);
      const lastDayNum = String(lastDate.getDate()).padStart(2, "0");
      const lastDay = `${year}-${month}-${lastDayNum}`;

      return {
        startDate: firstDay,
        endDate: lastDay,
        label: `Este mês (${formatDateBr(firstDay)} a ${formatDateBr(lastDay)})`,
      };
    }

    case "lastMonth": {
      const [yearStr, monthStr] = today.split("-");
      let year = Number(yearStr);
      let month = Number(monthStr) - 1;
      if (month === 0) {
        month = 12;
        year -= 1;
      }
      const prevMonthPadded = String(month).padStart(2, "0");
      const firstDay = `${year}-${prevMonthPadded}-01`;
      const lastDate = new Date(year, month, 0);
      const lastDayNum = String(lastDate.getDate()).padStart(2, "0");
      const lastDay = `${year}-${prevMonthPadded}-${lastDayNum}`;

      return {
        startDate: firstDay,
        endDate: lastDay,
        label: `Mês anterior (${formatDateBr(firstDay)} a ${formatDateBr(lastDay)})`,
      };
    }

    case "custom": {
      const start = customStart && customStart.length === 10 ? customStart : today;
      const end = customEnd && customEnd.length === 10 ? customEnd : today;
      // Garante ordem cronológica
      const [actualStart, actualEnd] = start <= end ? [start, end] : [end, start];
      return {
        startDate: actualStart,
        endDate: actualEnd,
        label: `${formatDateBr(actualStart)} — ${formatDateBr(actualEnd)}`,
      };
    }

    default:
      return {
        startDate: today,
        endDate: today,
        label: "Hoje",
      };
  }
}

// ==============================================================================
// 2. CÁLCULO DAS MÉTRICAS DO PERÍODO (AGREGAÇÕES ANALÍTICAS)
// ==============================================================================

export interface PeriodCalculationParams {
  agendamentos: Agendamento[];
  payments: Payment[];
  cashMovements: CashMovement[];
  clientes: Cliente[];
  veiculos: Veiculo[];
  servicos: Servico[];
  businessHours: BusinessHour[];
  scheduleBlocks: ScheduleBlock[];
  dateRange: DateRange;
}

export function calculatePeriodMetrics({
  agendamentos,
  payments,
  cashMovements,
  clientes,
  servicos,
  businessHours,
  scheduleBlocks,
  dateRange,
}: PeriodCalculationParams): PeriodMetrics {
  const { startDate, endDate } = dateRange;

  // 1. Filtrar agendamentos no período
  const periodAppointments = agendamentos.filter(
    (a) => a.data >= startDate && a.data <= endDate
  );

  const totalAgendamentos = periodAppointments.length;
  const agendados = periodAppointments.filter((a) => a.status === "Agendado").length;
  const confirmados = periodAppointments.filter((a) => a.status === "Confirmado").length;
  const aguardando = periodAppointments.filter((a) => a.status === "Aguardando").length;
  const emAtendimento = periodAppointments.filter((a) => a.status === "Em atendimento").length;
  const concluidos = periodAppointments.filter((a) => isCompletedStatus(a.status)).length;
  const cancelados = periodAppointments.filter((a) => a.status === "Cancelado").length;
  const naoCompareceram = periodAppointments.filter((a) => a.status === "Não compareceu").length;

  const taxaCancelamento = totalAgendamentos > 0 ? (cancelados / totalAgendamentos) * 100 : 0;
  const taxaNoShow = totalAgendamentos > 0 ? (naoCompareceram / totalAgendamentos) * 100 : 0;

  // 2. Faturamento Previsto (Preserva snapshot appointments.price / valor)
  // Somente atendimentos válidos (não cancelados e sem falta)
  const validAppointments = periodAppointments.filter(
    (a) => !["Cancelado", "Não compareceu"].includes(a.status)
  );
  const faturamentoPrevisto = validAppointments.reduce(
    (acc, a) => acc + (Number(a.valor) || 0),
    0
  );

  // 3. Pagamentos Recebidos no período
  // Pagamentos confirmados cujo paid_at está dentro do intervalo
  const validPayments = payments.filter((p) => {
    if (p.status !== "paid") return false;
    const payDate = p.paid_at ? p.paid_at.substring(0, 10) : "";
    return payDate >= startDate && payDate <= endDate;
  });

  const recebidoTotal = validPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const totalPagamentosQtd = validPayments.length;

  // 4. Saldo Pendente (Faturamento dos agendamentos válidos do período menos o que já foi quitado para eles)
  const appointmentIdsInPeriod = new Set(validAppointments.map((a) => a.id));
  const paymentsForPeriodAppointments = payments.filter(
    (p) => p.status === "paid" && appointmentIdsInPeriod.has(p.appointment_id)
  );
  const totalPaidForPeriodAppointments = paymentsForPeriodAppointments.reduce(
    (acc, p) => acc + (Number(p.amount) || 0),
    0
  );
  const pendenteTotal = Math.max(0, faturamentoPrevisto - totalPaidForPeriodAppointments);

  // 5. Movimentações de Saída do Caixa
  const validExpenses = cashMovements.filter((cm) => {
    if (cm.type !== "expense") return false;
    const cmDate = cm.created_at ? cm.created_at.substring(0, 10) : "";
    return cmDate >= startDate && cmDate <= endDate;
  });
  const saidasCaixaTotal = validExpenses.reduce((acc, cm) => acc + (Number(cm.amount) || 0), 0);

  // 6. Resultado do Caixa: Entradas - Saídas (NUNCA chamar de lucro)
  const resultadoCaixa = recebidoTotal - saidasCaixaTotal;

  // 7. Breakdown por Forma de Pagamento
  const porMetodo: Record<PaymentMethod, PaymentMethodBreakdown> = {
    pix: { metodo: "pix", label: PAYMENT_METHOD_LABELS.pix, quantidade: 0, valor: 0, percentual: 0 },
    dinheiro: { metodo: "dinheiro", label: PAYMENT_METHOD_LABELS.dinheiro, quantidade: 0, valor: 0, percentual: 0 },
    debito: { metodo: "debito", label: PAYMENT_METHOD_LABELS.debito, quantidade: 0, valor: 0, percentual: 0 },
    credito: { metodo: "credito", label: PAYMENT_METHOD_LABELS.credito, quantidade: 0, valor: 0, percentual: 0 },
  };

  validPayments.forEach((p) => {
    const m = p.payment_method;
    if (porMetodo[m]) {
      porMetodo[m].quantidade += 1;
      porMetodo[m].valor += Number(p.amount) || 0;
    }
  });

  (Object.keys(porMetodo) as PaymentMethod[]).forEach((m) => {
    porMetodo[m].percentual =
      recebidoTotal > 0 ? (porMetodo[m].valor / recebidoTotal) * 100 : 0;
  });

  // 8. Ranking de Serviços Realizados (Ordenado por quantidade)
  const servicosMap = new Map<string, ServicePerformance>();

  // Inicializar com todos os serviços cadastrados
  servicos.forEach((s) => {
    servicosMap.set(s.id, {
      id: s.id,
      nome: s.nome,
      tipoVeiculo: s.tipo_veiculo,
      quantidade: 0,
      faturamento: 0,
      ticketMedio: 0,
      percentualVolume: 0,
      percentualReceita: 0,
    });
  });

  // Contabilizar atendimentos concluídos (ou válidos caso nenhum finalizado ainda)
  const targetAppointmentsForServices =
    concluidos > 0
      ? periodAppointments.filter((a) => isCompletedStatus(a.status))
      : validAppointments;

  targetAppointmentsForServices.forEach((a) => {
    const entry = servicosMap.get(a.servico_id);
    if (entry) {
      entry.quantidade += 1;
      entry.faturamento += Number(a.valor) || 0;
    } else {
      // Caso serviço não esteja no catálogo atual (ex.: serviço antigo deletado)
      servicosMap.set(a.servico_id, {
        id: a.servico_id,
        nome: a.servico_nome || "Serviço Personalizado",
        tipoVeiculo: a.veiculo_tipo,
        quantidade: 1,
        faturamento: Number(a.valor) || 0,
        ticketMedio: 0,
        percentualVolume: 0,
        percentualReceita: 0,
      });
    }
  });

  const totalServicosContados = targetAppointmentsForServices.length || 1;
  const faturamentoServicosTotal = Array.from(servicosMap.values()).reduce(
    (acc, s) => acc + s.faturamento,
    0
  ) || 1;

  const servicosRealizados: ServicePerformance[] = Array.from(servicosMap.values())
    .map((s) => ({
      ...s,
      ticketMedio: s.quantidade > 0 ? s.faturamento / s.quantidade : 0,
      percentualVolume: (s.quantidade / totalServicosContados) * 100,
      percentualReceita: (s.faturamento / faturamentoServicosTotal) * 100,
    }))
    .sort((a, b) => b.quantidade - a.quantidade);

  // 9. Distribuição por Tipo de Veículo
  const veiculosPorTipo: VehicleTypeDistribution[] = TIPOS_VEICULO.map((tipo) => {
    const count = periodAppointments.filter((a) => a.veiculo_tipo === tipo).length;
    const percentual = totalAgendamentos > 0 ? (count / totalAgendamentos) * 100 : 0;
    return {
      tipo,
      quantidade: count,
      percentual,
    };
  });

  // 10. Clientes (Regra objetiva: Recorrente = cliente com >= 2 atendimentos concluídos no período)
  const totalClientesAtivos = clientes.filter((c) => c.ativo !== false).length;

  const novosClientes = clientes.filter((c) => {
    const regDate = c.created_at ? c.created_at.substring(0, 10) : "";
    return regDate >= startDate && regDate <= endDate;
  }).length;

  // Mapa de atendimentos concluídos por cliente no período
  const customerCompletedCounts = new Map<string, number>();
  periodAppointments
    .filter((a) => isCompletedStatus(a.status))
    .forEach((a) => {
      const key = a.cliente_id || a.cliente_whatsapp || a.cliente_nome;
      customerCompletedCounts.set(key, (customerCompletedCounts.get(key) || 0) + 1);
    });

  const clientesAtendidos = customerCompletedCounts.size;
  let clientesRecorrentes = 0;
  customerCompletedCounts.forEach((count) => {
    if (count >= 2) {
      clientesRecorrentes += 1;
    }
  });

  const clientesSemAtendimento = Math.max(0, totalClientesAtivos - clientesAtendidos);

  // 11. Ocupação da Agenda
  // Calcula horários de abertura configurados em business_hours
  let totalCapacidadeSlots = 0;
  let horariosBloqueados = 0;

  // Gerar dias do período
  const daysList = generateDateList(startDate, endDate);

  daysList.forEach((dayStr) => {
    const [y, m, d] = dayStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayOfWeek = dateObj.getDay();

    const config = businessHours.find((bh) => bh.day_of_week === dayOfWeek);
    if (config && config.is_open) {
      const [startH, startM] = config.opening_time.split(":").map(Number);
      const [endH, endM] = config.closing_time.split(":").map(Number);
      const totalMinutes = endH * 60 + endM - (startH * 60 + startM);
      const slotsNoDia = Math.max(0, Math.floor(totalMinutes / 30));
      totalCapacidadeSlots += slotsNoDia;
    }

    // Bloqueios que afetam o dia
    const blocksOnDay = scheduleBlocks.filter((sb) => {
      const bDate = sb.start_datetime ? sb.start_datetime.substring(0, 10) : "";
      return bDate === dayStr;
    });
    horariosBloqueados += blocksOnDay.length * 2; // estimativa de slots bloqueados
  });

  const horariosOcupados = validAppointments.length;
  const horariosDisponiveis = Math.max(
    0,
    totalCapacidadeSlots - horariosOcupados - horariosBloqueados
  );
  const taxaOcupacao =
    totalCapacidadeSlots > 0
      ? Math.min(100, Math.round((horariosOcupados / totalCapacidadeSlots) * 100))
      : 0;

  // 12. Tendência Diária (Faturamento e Atendimentos por dia)
  const weekdayShort = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const tendenciaDiaria: DailyTrendPoint[] = daysList.map((dayStr) => {
    const [y, m, d] = dayStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const weekday = weekdayShort[dateObj.getDay()];
    const displayDate = `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;

    const appsOnDay = periodAppointments.filter((a) => a.data === dayStr);
    const concluidosOnDay = appsOnDay.filter((a) => isCompletedStatus(a.status)).length;
    const faturamentoOnDay = appsOnDay
      .filter((a) => !["Cancelado", "Não compareceu"].includes(a.status))
      .reduce((acc, a) => acc + (Number(a.valor) || 0), 0);

    const recebidoOnDay = validPayments
      .filter((p) => p.paid_at && p.paid_at.substring(0, 10) === dayStr)
      .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    return {
      date: dayStr,
      displayDate,
      weekday,
      faturamento: faturamentoOnDay,
      recebido: recebidoOnDay,
      atendimentosConcluidos: concluidosOnDay,
      atendimentosTotal: appsOnDay.length,
    };
  });

  return {
    period: dateRange,
    totalAgendamentos,
    agendados,
    confirmados,
    aguardando,
    emAtendimento,
    concluidos,
    cancelados,
    naoCompareceram,
    taxaCancelamento,
    taxaNoShow,

    faturamentoPrevisto,
    recebidoTotal,
    pendenteTotal,
    saidasCaixaTotal,
    resultadoCaixa,
    totalPagamentosQtd,
    porMetodo,

    servicosRealizados,
    veiculosPorTipo,

    totalClientesAtivos,
    novosClientes,
    clientesAtendidos,
    clientesRecorrentes,
    clientesSemAtendimento,

    horariosOcupados,
    horariosDisponiveis,
    horariosBloqueados,
    taxaOcupacao,

    tendenciaDiaria,
  };
}

// ==============================================================================
// 3. CONSTRUTOR DO RELATÓRIO DE CLIENTES (ITEM A ITEM)
// ==============================================================================

export function buildCustomerReport(
  clientes: Cliente[],
  agendamentos: Agendamento[],
  veiculos: Veiculo[],
  dateRange: DateRange
): CustomerReportItem[] {
  const { startDate, endDate } = dateRange;

  return clientes.map((cliente) => {
    // Veículos do cliente
    const clientVehicles = veiculos.filter((v) => v.cliente_id === cliente.id);

    // Agendamentos no período
    const clientAppointments = agendamentos.filter((a) => {
      const isClient =
        a.cliente_id === cliente.id ||
        a.cliente_whatsapp === cliente.whatsapp ||
        (a.cliente_nome && a.cliente_nome.toLowerCase() === cliente.nome.toLowerCase());
      const inPeriod = a.data >= startDate && a.data <= endDate;
      return isClient && inPeriod;
    });

    const concluidos = clientAppointments.filter((a) => isCompletedStatus(a.status));
    const totalGasto = concluidos.reduce((acc, a) => acc + (Number(a.valor) || 0), 0);

    // Último atendimento no período
    const sorted = [...clientAppointments].sort((a, b) => {
      const dateA = `${a.data} ${a.horario}`;
      const dateB = `${b.data} ${b.horario}`;
      return dateB.localeCompare(dateA);
    });
    const ultimo = sorted[0];

    return {
      id: cliente.id,
      nome: cliente.nome,
      whatsapp: cliente.whatsapp,
      email: cliente.email,
      veiculosCount: clientVehicles.length,
      totalAtendimentosPeriodo: clientAppointments.length,
      atendimentosConcluidosPeriodo: concluidos.length,
      totalGastoPeriodo: totalGasto,
      // REGRA OBJETIVA: recorrente se tiver >= 2 atendimentos concluídos no período
      isRecorrente: concluidos.length >= 2,
      ultimoAtendimentoPeriodo: ultimo ? `${formatDateBr(ultimo.data)} ${ultimo.horario}` : undefined,
    };
  });
}

// ==============================================================================
// 4. UTILITÁRIO DE EXPORTAÇÃO CSV COM SUPORTE A UTF-8 BOM E EXCEL PT-BR
// ==============================================================================

export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | undefined | null)[][]
): void {
  // Delimitador ponto e vírgula (padrão regional pt-BR no Excel)
  const delimiter = ";";

  const escapeCell = (val: string | number | undefined | null): string => {
    if (val === undefined || val === null) return "";
    let str = String(val).trim();
    // Se contiver delimitador, quebras de linha ou aspas, envolve entre aspas duplas
    if (str.includes(delimiter) || str.includes("\n") || str.includes('"')) {
      str = `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map(escapeCell).join(delimiter);
  const dataLines = rows.map((row) => row.map(escapeCell).join(delimiter));

  // UTF-8 BOM (\uFEFF) para garantir que acentos abram sem corrupção no Microsoft Excel
  const csvContent = "\uFEFF" + [headerLine, ...dataLines].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ==============================================================================
// 5. HELPER PARA GERAR LISTA DE DATAS ENTRE INÍCIO E FIM
// ==============================================================================

function generateDateList(startDate: string, endDate: string): string[] {
  const result: string[] = [];
  const [y1, m1, d1] = startDate.split("-").map(Number);
  const [y2, m2, d2] = endDate.split("-").map(Number);

  const current = new Date(y1, m1 - 1, d1);
  const end = new Date(y2, m2 - 1, d2);

  // Limite de segurança de 366 dias para evitar loops acidentais
  let safety = 0;
  while (current <= end && safety < 366) {
    const yr = current.getFullYear();
    const mo = String(current.getMonth() + 1).padStart(2, "0");
    const da = String(current.getDate()).padStart(2, "0");
    result.push(`${yr}-${mo}-${da}`);
    current.setDate(current.getDate() + 1);
    safety++;
  }

  return result;
}
