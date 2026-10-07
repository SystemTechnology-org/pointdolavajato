// ==============================================================================
// src/lib/services/customerIntelligence.ts
// Inteligência de Clientes, Métricas de Retenção, Fidelização e Avaliações
// ETAPA 12 — Point do Coco Lava Jato
// ==============================================================================

import {
  Cliente,
  Agendamento,
  Payment,
  ServiceReview,
  CustomerTagAssignment,
  CustomerOperationalSummary,
  CustomerVehicleSummary,
  CommercialTimelineEvent,
  InactiveCustomerItem,
  CustomerRankingItem,
  ReviewDistribution,
  Veiculo,
} from "@/types";

// ==============================================================================
// 1. HELPERS DE STATUS E DATAS
// ==============================================================================

/**
 * Verifica se um status de agendamento representa serviço efetivamente concluído/executado.
 * Cobre status operacionais pós-execução (Pronto, Aguardando pagamento, Aguardando retirada, Entregue, Finalizado).
 */
export function isCompletedStatus(status: string): boolean {
  if (!status) return false;
  const s = status.trim().toLowerCase();
  return [
    "concluído",
    "concluido",
    "finalizado",
    "pronto",
    "aguardando pagamento",
    "aguardando retirada",
    "entregue",
    "completed",
    "ready",
    "awaiting_payment",
    "awaiting_pickup",
    "delivered",
  ].includes(s);
}

/**
 * Calcula a diferença em dias entre uma data YYYY-MM-DD e o dia atual (timezone local/Bahia).
 */
export function getDaysDifferenceFromToday(dateString: string): number {
  if (!dateString) return 0;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Assume YYYY-MM-DD ou ISO
    const parts = dateString.split("T")[0].split("-");
    if (parts.length < 3) return 0;
    const targetDate = new Date(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10)
    );
    targetDate.setHours(0, 0, 0, 0);

    const diffMs = today.getTime() - targetDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  } catch {
    return 0;
  }
}

/**
 * Requisito 11: Frequência média de visitas em dias.
 * Se houver menos de 2 visitas concluídas, retorna null ("Dados insuficientes").
 * Ordena as datas cronologicamente e calcula o intervalo médio entre visitas.
 */
export function calculateVisitFrequencyDays(completedDates: string[]): number | null {
  if (!completedDates || completedDates.length < 2) {
    return null; // Menos de 2 atendimentos: dados insuficientes
  }

  // Ordena cronologicamente
  const sorted = [...completedDates].sort((a, b) => a.localeCompare(b));
  let totalIntervalDays = 0;
  let intervalsCount = 0;

  for (let i = 1; i < sorted.length; i++) {
    const d1 = new Date(sorted[i - 1].split("T")[0]);
    const d2 = new Date(sorted[i].split("T")[0]);
    const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0) {
      totalIntervalDays += diffDays;
      intervalsCount++;
    }
  }

  if (intervalsCount === 0) return null;
  return Math.round(totalIntervalDays / intervalsCount);
}

// ==============================================================================
// 2. RESUMO OPERACIONAL E FINANCEIRO DO CLIENTE (Requisito 9, 10, 11, 14)
// ==============================================================================

export interface CalculateMetricsParams {
  customerId: string;
  customerName?: string;
  appointments: Agendamento[];
  payments: Payment[];
  reviews: ServiceReview[];
  tagAssignments: CustomerTagAssignment[];
  vipMinSpent?: number;
  vipMinVisits?: number;
  inactiveThresholdDays?: number;
}

export function calculateCustomerMetrics({
  customerId,
  customerName,
  appointments,
  payments,
  reviews,
  tagAssignments,
  vipMinSpent = 500,
  vipMinVisits = 10,
  inactiveThresholdDays = 60,
}: CalculateMetricsParams): CustomerOperationalSummary {
  // Filtra agendamentos pertencentes ao cliente (por ID ou fallback seguro por nome)
  const clientApps = appointments.filter((a) => {
    if (a.cliente_id && a.cliente_id === customerId) return true;
    if (customerName && a.cliente_nome && a.cliente_nome.trim().toLowerCase() === customerName.trim().toLowerCase()) {
      return true;
    }
    return false;
  });

  const totalAppointments = clientApps.length;

  const completedApps = clientApps.filter((a) => isCompletedStatus(a.status));
  const completedCount = completedApps.length;

  const cancelledCount = clientApps.filter(
    (a) => (a.status as string) === "Cancelado" || (a.status as string) === "cancelled"
  ).length;

  const noShowCount = clientApps.filter(
    (a) => (a.status as string) === "Não compareceu" || (a.status as string) === "no_show"
  ).length;

  // Valor total contratado (apenas dos serviços executados/concluídos)
  const totalContracted = completedApps.reduce((acc, a) => acc + (Number(a.valor) || 0), 0);

  // Pagamentos reais quitados do cliente
  const clientAppIds = new Set(clientApps.map((a) => a.id));
  const clientPaidPayments = payments.filter(
    (p) => clientAppIds.has(p.appointment_id) && p.status === "paid"
  );
  const totalPaid = clientPaidPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  const totalPending = Math.max(0, totalContracted - totalPaid);

  // Ticket médio do cliente
  // Se houver pagamentos reais computados, usa totalPaid / completedCount; caso contrário usa contratado
  const baseRevenue = totalPaid > 0 ? totalPaid : totalContracted;
  const averageTicket = completedCount > 0 ? baseRevenue / completedCount : 0;

  // Datas de visitas
  const completedDates = completedApps
    .map((a) => a.data)
    .filter(Boolean)
    .sort();

  const firstVisitDate = completedDates.length > 0 ? completedDates[0] : null;
  const lastVisitDate = completedDates.length > 0 ? completedDates[completedDates.length - 1] : null;

  const daysSinceLastVisit = lastVisitDate ? getDaysDifferenceFromToday(lastVisitDate) : null;
  const visitFrequencyDays = calculateVisitFrequencyDays(completedDates);

  // Avaliações do cliente
  const clientReviews = reviews.filter((r) => r.customer_id === customerId);
  const reviewsCount = clientReviews.length;
  const averageRating =
    reviewsCount > 0
      ? clientReviews.reduce((acc, r) => acc + r.rating, 0) / reviewsCount
      : null;

  // Classificações e Fidelidade (Requisitos 12, 13, 22)
  const effectiveRevenue = Math.max(totalPaid, totalContracted);
  const isVip = effectiveRevenue >= vipMinSpent || completedCount >= vipMinVisits;
  const isRecorrente = completedCount >= 2;
  const isNovo = completedCount === 1;
  const isInativo = completedCount > 0 && (daysSinceLastVisit ?? 0) >= inactiveThresholdDays;

  // Tags manuais
  const manualTags = tagAssignments
    .filter((ta) => ta.customer_id === customerId)
    .map((ta) => ta.tag_name);

  // Maior serviço contratado
  let largestService: CustomerOperationalSummary["largestService"] = null;
  if (completedApps.length > 0) {
    const sortedByPrice = [...completedApps].sort((a, b) => (Number(b.valor) || 0) - (Number(a.valor) || 0));
    const top = sortedByPrice[0];
    if (top && (Number(top.valor) || 0) > 0) {
      largestService = {
        service_name: top.servico_nome || "Serviço",
        price: Number(top.valor) || 0,
        date: top.data,
      };
    }
  }

  return {
    totalAppointments,
    completedAppointments: completedCount,
    cancelledAppointments: cancelledCount,
    noShowAppointments: noShowCount,
    totalContracted,
    totalPaid,
    totalPending,
    averageTicket,
    firstVisitDate,
    lastVisitDate,
    daysSinceLastVisit,
    visitFrequencyDays,
    averageRating,
    reviewsCount,
    isVip,
    isRecorrente,
    isNovo,
    isInativo,
    tags: manualTags,
    largestService,
  };
}

// ==============================================================================
// 3. RESUMO POR VEÍCULO DO CLIENTE (Requisito 10)
// ==============================================================================

export function calculateCustomerVehiclesSummary(
  customerId: string,
  vehicles: Veiculo[],
  appointments: Agendamento[],
  payments: Payment[]
): CustomerVehicleSummary[] {
  const clientVehicles = vehicles.filter((v) => v.cliente_id === customerId);

  return clientVehicles.map((veh) => {
    const vehApps = appointments.filter(
      (a) =>
        a.veiculo_id === veh.id ||
        (veh.placa && veh.placa !== "---" && a.veiculo_placa?.toUpperCase() === veh.placa.toUpperCase())
    );

    const completedVehApps = vehApps.filter((a) => isCompletedStatus(a.status));
    const visitsCount = completedVehApps.length;

    // Faturamento pago deste veículo
    const vehAppIds = new Set(vehApps.map((a) => a.id));
    const vehPayments = payments.filter((p) => vehAppIds.has(p.appointment_id) && p.status === "paid");
    let totalSpent = vehPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    // Fallback se não houver registros de pagamentos separados
    if (totalSpent === 0 && visitsCount > 0) {
      totalSpent = completedVehApps.reduce((acc, a) => acc + (Number(a.valor) || 0), 0);
    }

    const sortedDates = [...completedVehApps].sort((a, b) => `${b.data} ${b.horario}`.localeCompare(`${a.data} ${a.horario}`));
    const lastApp = sortedDates[0];

    return {
      vehicle_id: veh.id,
      plate: veh.placa || "Sem placa",
      model: veh.modelo,
      brand: veh.marca,
      type: veh.tipo,
      visitsCount,
      totalSpent,
      lastServiceDate: lastApp ? lastApp.data : null,
      lastServiceName: lastApp ? lastApp.servico_nome : null,
    };
  });
}

// ==============================================================================
// 4. LINHA DO TEMPO COMERCIAL DO CLIENTE (Requisito 14)
// ==============================================================================

export function buildCommercialTimeline(
  customerId: string,
  customerName: string | undefined,
  appointments: Agendamento[],
  payments: Payment[],
  reviews: ServiceReview[]
): CommercialTimelineEvent[] {
  const clientApps = appointments
    .filter((a) => {
      if (a.cliente_id && a.cliente_id === customerId) return true;
      if (customerName && a.cliente_nome && a.cliente_nome.trim().toLowerCase() === customerName.trim().toLowerCase()) {
        return true;
      }
      return false;
    })
    .sort((a, b) => `${b.data} ${b.horario}`.localeCompare(`${a.data} ${a.horario}`));

  const reviewsMap = new Map<string, ServiceReview>();
  reviews.forEach((r) => {
    if (r.appointment_id) {
      reviewsMap.set(r.appointment_id, r);
    }
  });

  return clientApps.map((app) => {
    const appPayments = payments.filter((p) => p.appointment_id === app.id && p.status === "paid");
    const paidAmount = appPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    const review = reviewsMap.get(app.id);

    return {
      appointmentId: app.id,
      date: app.data,
      time: app.horario,
      serviceName: app.servico_nome || "Serviço",
      vehiclePlate: app.veiculo_placa || "---",
      vehicleModel: app.veiculo_modelo || "Veículo",
      contractedPrice: Number(app.valor) || 0,
      paidAmount,
      status: app.status,
      deliveredAt: isCompletedStatus(app.status) ? app.data : null,
      review: review
        ? {
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            created_at: review.created_at,
          }
        : undefined,
    };
  });
}

// ==============================================================================
// 5. CLIENTES INATIVOS (Requisito 22, 27)
// ==============================================================================

export function findInactiveCustomers(
  customers: Cliente[],
  appointments: Agendamento[],
  payments: Payment[],
  thresholdDays: number = 60
): InactiveCustomerItem[] {
  const result: InactiveCustomerItem[] = [];

  for (const customer of customers) {
    if (customer.ativo === false) continue;

    const clientApps = appointments.filter((a) => {
      if (a.cliente_id && a.cliente_id === customer.id) return true;
      if (a.cliente_nome && a.cliente_nome.trim().toLowerCase() === customer.nome.trim().toLowerCase()) return true;
      return false;
    });

    const completedApps = clientApps.filter((a) => isCompletedStatus(a.status));
    if (completedApps.length === 0) continue; // Cliente que nunca concluiu não é inativo de retorno

    // Encontra o mais recente
    const sorted = [...completedApps].sort((a, b) => `${b.data} ${b.horario}`.localeCompare(`${a.data} ${a.horario}`));
    const last = sorted[0];
    const daysSince = getDaysDifferenceFromToday(last.data);

    if (daysSince >= thresholdDays) {
      // Calcula total faturado
      const clientAppIds = new Set(clientApps.map((a) => a.id));
      const clientPaid = payments.filter((p) => clientAppIds.has(p.appointment_id) && p.status === "paid");
      let totalSpent = clientPaid.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      if (totalSpent === 0) {
        totalSpent = completedApps.reduce((acc, a) => acc + (Number(a.valor) || 0), 0);
      }

      result.push({
        customerId: customer.id,
        customerName: customer.nome,
        customerPhone: customer.whatsapp,
        customerEmail: customer.email,
        lastVisitDate: last.data,
        daysSinceLastVisit: daysSince,
        totalCompletedVisits: completedApps.length,
        totalSpent,
        lastServiceName: last.servico_nome,
        lastVehiclePlate: last.veiculo_placa,
      });
    }
  }

  // Ordena por maior tempo sem visita (mais crítico primeiro)
  return result.sort((a, b) => b.daysSinceLastVisit - a.daysSinceLastVisit);
}

// ==============================================================================
// 6. RANKINGS: FREQUÊNCIA E FATURAMENTO (Requisitos 19, 20)
// ==============================================================================

export function getTopFrequentCustomers(
  customers: Cliente[],
  appointments: Agendamento[],
  payments: Payment[],
  tagAssignments: CustomerTagAssignment[],
  limit: number = 10,
  vipMinSpent: number = 500,
  vipMinVisits: number = 10
): CustomerRankingItem[] {
  const rankingList: CustomerRankingItem[] = [];

  for (const customer of customers) {
    const clientApps = appointments.filter((a) => {
      if (a.cliente_id && a.cliente_id === customer.id) return true;
      if (a.cliente_nome && a.cliente_nome.trim().toLowerCase() === customer.nome.trim().toLowerCase()) return true;
      return false;
    });

    const completedApps = clientApps.filter((a) => isCompletedStatus(a.status));
    if (completedApps.length === 0) continue;

    // Faturamento real via payments quitados
    const clientAppIds = new Set(clientApps.map((a) => a.id));
    const paidList = payments.filter((p) => clientAppIds.has(p.appointment_id) && p.status === "paid");
    let totalSpentReal = paidList.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    if (totalSpentReal === 0) {
      totalSpentReal = completedApps.reduce((acc, a) => acc + (Number(a.valor) || 0), 0);
    }

    const sortedDates = [...completedApps].sort((a, b) => `${b.data} ${b.horario}`.localeCompare(`${a.data} ${a.horario}`));
    const lastVisitDate = sortedDates[0]?.data || null;
    const daysSince = lastVisitDate ? getDaysDifferenceFromToday(lastVisitDate) : null;

    const tags = tagAssignments
      .filter((ta) => ta.customer_id === customer.id)
      .map((ta) => ta.tag_name);

    const isVip = totalSpentReal >= vipMinSpent || completedApps.length >= vipMinVisits;

    rankingList.push({
      customerId: customer.id,
      customerName: customer.nome,
      customerPhone: customer.whatsapp,
      completedVisits: completedApps.length,
      totalSpentReal,
      averageTicket: completedApps.length > 0 ? totalSpentReal / completedApps.length : 0,
      lastVisitDate,
      daysSinceLastVisit: daysSince,
      tags,
      isVip,
    });
  }

  return rankingList.sort((a, b) => b.completedVisits - a.completedVisits).slice(0, limit);
}

export function getTopRevenueCustomers(
  customers: Cliente[],
  appointments: Agendamento[],
  payments: Payment[],
  tagAssignments: CustomerTagAssignment[],
  limit: number = 10,
  vipMinSpent: number = 500,
  vipMinVisits: number = 10
): CustomerRankingItem[] {
  const rankingList: CustomerRankingItem[] = [];

  for (const customer of customers) {
    const clientApps = appointments.filter((a) => {
      if (a.cliente_id && a.cliente_id === customer.id) return true;
      if (a.cliente_nome && a.cliente_nome.trim().toLowerCase() === customer.nome.trim().toLowerCase()) return true;
      return false;
    });

    const completedApps = clientApps.filter((a) => isCompletedStatus(a.status));
    if (completedApps.length === 0) continue;

    // Faturamento real via pagamentos quitados
    const clientAppIds = new Set(clientApps.map((a) => a.id));
    const paidList = payments.filter((p) => clientAppIds.has(p.appointment_id) && p.status === "paid");
    let totalSpentReal = paidList.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    if (totalSpentReal === 0) {
      totalSpentReal = completedApps.reduce((acc, a) => acc + (Number(a.valor) || 0), 0);
    }

    const sortedDates = [...completedApps].sort((a, b) => `${b.data} ${b.horario}`.localeCompare(`${a.data} ${a.horario}`));
    const lastVisitDate = sortedDates[0]?.data || null;
    const daysSince = lastVisitDate ? getDaysDifferenceFromToday(lastVisitDate) : null;

    const tags = tagAssignments
      .filter((ta) => ta.customer_id === customer.id)
      .map((ta) => ta.tag_name);

    const isVip = totalSpentReal >= vipMinSpent || completedApps.length >= vipMinVisits;

    rankingList.push({
      customerId: customer.id,
      customerName: customer.nome,
      customerPhone: customer.whatsapp,
      completedVisits: completedApps.length,
      totalSpentReal,
      averageTicket: completedApps.length > 0 ? totalSpentReal / completedApps.length : 0,
      lastVisitDate,
      daysSinceLastVisit: daysSince,
      tags,
      isVip,
    });
  }

  return rankingList.sort((a, b) => b.totalSpentReal - a.totalSpentReal).slice(0, limit);
}

// ==============================================================================
// 7. AVALIAÇÕES E SATISFAÇÃO (Requisito 15, 16, 26)
// ==============================================================================

export function calculateReviewDistribution(reviews: ServiceReview[]): ReviewDistribution {
  const countByRating: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  const total = reviews.length;
  if (total === 0) {
    return {
      total: 0,
      average: 0,
      countByRating,
      percentageByRating: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      negativeCount: 0,
      positiveCount: 0,
    };
  }

  let sum = 0;
  let negativeCount = 0;
  let positiveCount = 0;

  for (const r of reviews) {
    const rating = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    countByRating[rating] = (countByRating[rating] || 0) + 1;
    sum += rating;

    if (rating <= 2) negativeCount++;
    if (rating >= 4) positiveCount++;
  }

  const average = Number((sum / total).toFixed(1));

  const percentageByRating: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: Math.round((countByRating[1] / total) * 100),
    2: Math.round((countByRating[2] / total) * 100),
    3: Math.round((countByRating[3] / total) * 100),
    4: Math.round((countByRating[4] / total) * 100),
    5: Math.round((countByRating[5] / total) * 100),
  };

  return {
    total,
    average,
    countByRating,
    percentageByRating,
    negativeCount,
    positiveCount,
  };
}

export function identifyNegativeReviews(reviews: ServiceReview[]): ServiceReview[] {
  return reviews
    .filter((r) => r.rating <= 2)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
