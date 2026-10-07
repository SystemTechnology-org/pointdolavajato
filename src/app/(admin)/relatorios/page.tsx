"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Calendar,
  Users,
  DollarSign,
  Sparkles,
  ShieldAlert,
  Filter,
  Star,
  RotateCcw,
  Award,
  AlertTriangle,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PeriodSelector } from "@/components/reports/PeriodSelector";
import { ExportButton } from "@/components/reports/ExportButton";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { useAppStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import {
  resolveDateRange,
  formatDateBr,
  exportToCsv,
  buildCustomerReport,
} from "@/lib/services/reports";
import {
  getTopFrequentCustomers,
  getTopRevenueCustomers,
  findInactiveCustomers,
  calculateReviewDistribution,
  identifyNegativeReviews,
} from "@/lib/services/customerIntelligence";
import {
  PeriodFilter,
  DateRange,
  TIPOS_VEICULO,
  PAYMENT_METHOD_LABELS,
} from "@/types";

type TabType = "atendimentos" | "financeiro" | "servicos" | "clientes" | "retencao" | "avaliacoes";

export default function RelatoriosPage() {
  const {
    agendamentos,
    clientes,
    veiculos,
    payments,
    serviceReviews,
    customerTagAssignments,
    businessSettings,
    canViewFinancial,
    getPeriodMetrics,
  } = useAppStore();

  // Aba ativa
  const [activeTab, setActiveTab] = useState<TabType>("atendimentos");

  // Filtros de Retenção e Clientes (Etapa 12)
  const [retentionInactiveThreshold, setRetentionInactiveThreshold] = useState<number>(
    businessSettings?.inactive_threshold_days || 60
  );
  const [retentionRankingMode, setRetentionRankingMode] = useState<"frequencia" | "faturamento">("frequencia");

  // ETAPA 12: Métricas de Retenção & Fidelização
  const topFrequentCustomers = useMemo(() => {
    return getTopFrequentCustomers(
      clientes,
      agendamentos,
      payments,
      customerTagAssignments,
      15,
      businessSettings?.vip_min_spent,
      businessSettings?.vip_min_visits
    );
  }, [clientes, agendamentos, payments, customerTagAssignments, businessSettings]);

  const topRevenueCustomers = useMemo(() => {
    return getTopRevenueCustomers(
      clientes,
      agendamentos,
      payments,
      customerTagAssignments,
      15,
      businessSettings?.vip_min_spent,
      businessSettings?.vip_min_visits
    );
  }, [clientes, agendamentos, payments, customerTagAssignments, businessSettings]);

  const inactiveCustomers = useMemo(() => {
    return findInactiveCustomers(
      clientes,
      agendamentos,
      payments,
      retentionInactiveThreshold
    );
  }, [clientes, agendamentos, payments, retentionInactiveThreshold]);

  // ETAPA 12: Métricas e Distribuição de Avaliações
  const reviewsDistribution = useMemo(() => {
    return calculateReviewDistribution(serviceReviews || []);
  }, [serviceReviews]);

  const negativeReviews = useMemo(() => {
    return identifyNegativeReviews(serviceReviews || []);
  }, [serviceReviews]);

  // Seletor de Período
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("last30days");
  const [dateRange, setDateRange] = useState<DateRange>(() =>
    resolveDateRange("last30days")
  );

  // Filtros da aba de Atendimentos
  const [filterAtendimentoStatus, setFilterAtendimentoStatus] = useState<string>("todos");
  const [filterAtendimentoVeiculo, setFilterAtendimentoVeiculo] = useState<string>("todos");

  // Filtros da aba Financeira
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>("todos");

  // Filtros da aba de Serviços
  const [filterServicoVeiculo, setFilterServicoVeiculo] = useState<string>("todos");

  // Filtros da aba de Clientes
  const [filterClienteTipo, setFilterClienteTipo] = useState<string>("todos");

  // Métricas agregadas do período
  const metrics = useMemo(() => {
    return getPeriodMetrics(dateRange);
  }, [getPeriodMetrics, dateRange]);

  // Relatório de Clientes construído item a item
  const customerReportData = useMemo(() => {
    return buildCustomerReport(clientes, agendamentos, veiculos, dateRange);
  }, [clientes, agendamentos, veiculos, dateRange]);

  // Lista de atendimentos filtrada no período
  const filteredAppointments = useMemo(() => {
    return agendamentos.filter((a) => {
      const inDate = a.data >= dateRange.startDate && a.data <= dateRange.endDate;
      if (!inDate) return false;
      if (filterAtendimentoStatus !== "todos" && a.status !== filterAtendimentoStatus) {
        return false;
      }
      if (
        filterAtendimentoVeiculo !== "todos" &&
        a.veiculo_tipo !== filterAtendimentoVeiculo
      ) {
        return false;
      }
      return true;
    });
  }, [agendamentos, dateRange, filterAtendimentoStatus, filterAtendimentoVeiculo]);

  // Lista de pagamentos filtrada no período
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const payDate = p.paid_at ? p.paid_at.substring(0, 10) : "";
      const inDate = payDate >= dateRange.startDate && payDate <= dateRange.endDate;
      if (!inDate) return false;
      if (filterPaymentMethod !== "todos" && p.payment_method !== filterPaymentMethod) {
        return false;
      }
      return true;
    });
  }, [payments, dateRange, filterPaymentMethod]);

  // Ranking de serviços filtrado
  const filteredServices = useMemo(() => {
    return metrics.servicosRealizados.filter((s) => {
      if (filterServicoVeiculo !== "todos" && s.tipoVeiculo !== filterServicoVeiculo) {
        return false;
      }
      return true;
    });
  }, [metrics.servicosRealizados, filterServicoVeiculo]);

  // Clientes filtrados
  const filteredCustomerReport = useMemo(() => {
    return customerReportData.filter((c) => {
      if (filterClienteTipo === "novos") {
        const regDate = c.ultimoAtendimentoPeriodo || "";
        return c.totalAtendimentosPeriodo > 0 && regDate.includes(dateRange.startDate);
      }
      if (filterClienteTipo === "recorrentes") {
        return c.isRecorrente;
      }
      if (filterClienteTipo === "sem_atendimento") {
        return c.totalAtendimentosPeriodo === 0;
      }
      return true;
    });
  }, [customerReportData, filterClienteTipo, dateRange.startDate]);

  // ==============================================================================
  // EXPORTAÇÃO CSV DE CADA ABA COM DADOS REAIS E FILTRADOS (Requisito 22)
  // ==============================================================================
  const handleExportCsv = () => {
    const filenameDate = `${dateRange.startDate}_a_${dateRange.endDate}`;

    switch (activeTab) {
      case "atendimentos": {
        const headers = [
          "ID",
          "Data",
          "Horário",
          "Cliente",
          "WhatsApp",
          "Veículo",
          "Placa",
          "Categoria",
          "Serviço",
          "Valor (R$)",
          "Status",
        ];
        const rows = filteredAppointments.map((a) => [
          a.code || a.id,
          formatDateBr(a.data),
          a.horario,
          a.cliente_nome,
          a.cliente_whatsapp,
          a.veiculo_modelo,
          a.veiculo_placa,
          a.veiculo_tipo,
          a.servico_nome,
          Number(a.valor).toFixed(2),
          a.status,
        ]);
        exportToCsv(`relatorio_atendimentos_${filenameDate}.csv`, headers, rows);
        break;
      }

      case "financeiro": {
        if (!canViewFinancial) return;
        const headers = [
          "ID Pagamento",
          "Data do Pagamento",
          "ID Agendamento",
          "Método",
          "Valor (R$)",
          "Status",
          "Observações",
        ];
        const rows = filteredPayments.map((p) => [
          p.id,
          p.paid_at ? formatDateBr(p.paid_at.substring(0, 10)) : "",
          p.appointment_id,
          PAYMENT_METHOD_LABELS[p.payment_method] || p.payment_method,
          Number(p.amount).toFixed(2),
          p.status,
          p.notes || "",
        ]);
        exportToCsv(`relatorio_financeiro_${filenameDate}.csv`, headers, rows);
        break;
      }

      case "servicos": {
        const headers = [
          "Posição",
          "Serviço",
          "Categoria Veículo",
          "Qtd Realizada",
          "Faturamento Total (R$)",
          "Preço Médio Realizado (R$)",
          "% Volume",
          "% Receita",
        ];
        const rows = filteredServices.map((s, idx) => [
          idx + 1,
          s.nome,
          s.tipoVeiculo,
          s.quantidade,
          s.faturamento.toFixed(2),
          s.ticketMedio.toFixed(2),
          `${s.percentualVolume.toFixed(1)}%`,
          `${s.percentualReceita.toFixed(1)}%`,
        ]);
        exportToCsv(`relatorio_servicos_${filenameDate}.csv`, headers, rows);
        break;
      }

      case "clientes": {
        const headers = [
          "Cliente",
          "WhatsApp",
          "Email",
          "Qtd Veículos",
          "Atendimentos no Período",
          "Concluídos no Período",
          "Total Gasto (R$)",
          "Recorrente (≥2)",
          "Último Atendimento",
        ];
        const rows = filteredCustomerReport.map((c) => [
          c.nome,
          c.whatsapp,
          c.email || "",
          c.veiculosCount,
          c.totalAtendimentosPeriodo,
          c.atendimentosConcluidosPeriodo,
          c.totalGastoPeriodo.toFixed(2),
          c.isRecorrente ? "Sim" : "Não",
          c.ultimoAtendimentoPeriodo || "Nenhum",
        ]);
        exportToCsv(`relatorio_clientes_${filenameDate}.csv`, headers, rows);
        break;
      }

      case "retencao": {
        const headers = [
          "Cliente",
          "WhatsApp",
          "Visitas Concluídas",
          "Faturamento Real Pago (R$)",
          "Ticket Médio (R$)",
          "Última Visita",
          "Dias Sem Retorno",
          "Tags",
          "VIP?",
        ];
        const ranking = retentionRankingMode === "frequencia" ? topFrequentCustomers : topRevenueCustomers;
        const rows = ranking.map((r) => [
          r.customerName,
          r.customerPhone,
          r.completedVisits,
          r.totalSpentReal.toFixed(2),
          r.averageTicket.toFixed(2),
          r.lastVisitDate ? formatDateBr(r.lastVisitDate) : "Nunca",
          r.daysSinceLastVisit !== null ? `${r.daysSinceLastVisit} dias` : "—",
          r.tags.join("; "),
          r.isVip ? "Sim" : "Não",
        ]);
        exportToCsv(`relatorio_retencao_${retentionRankingMode}_${filenameDate}.csv`, headers, rows);
        break;
      }

      case "avaliacoes": {
        const headers = [
          "ID",
          "Data",
          "Cliente",
          "Serviço",
          "Placa",
          "Nota (1 a 5)",
          "Comentário",
        ];
        const rows = (serviceReviews || []).map((rev) => [
          rev.id,
          formatDateBr(rev.created_at.substring(0, 10)),
          rev.customer_name || "Cliente",
          rev.service_name || "Serviço",
          rev.vehicle_plate || "—",
          rev.rating,
          rev.comment || "",
        ]);
        exportToCsv(`relatorio_avaliacoes_${filenameDate}.csv`, headers, rows);
        break;
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOPO DA PÁGINA (Requisito 16) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-surface-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Relatórios & Indicadores
            </h1>
            <span className="w-2 h-2 rounded-full bg-brand-yellow" />
          </div>
          <p className="text-xs text-muted-foreground">
            Acompanhe o desempenho de atendimentos, financeiro, serviços e clientes com dados reais.
          </p>
        </div>

        {/* Botão de Exportação e Impressão */}
        <ExportButton
          onExportCsv={handleExportCsv}
          onPrint={() => window.print()}
          label="Exportar CSV da Aba"
        />
      </div>

      {/* 2. SELETOR DE PERÍODO (Requisito 15 e 23) */}
      <section className="bg-surface/60 p-3 sm:p-4 rounded-xl border border-surface-border">
        <PeriodSelector
          currentFilter={periodFilter}
          currentRange={dateRange}
          onChange={(newFilter, newRange) => {
            setPeriodFilter(newFilter);
            setDateRange(newRange);
          }}
        />
      </section>

      {/* 3. ABAS DE NAVEGAÇÃO DOS RELATÓRIOS (Requisito 16) */}
      <div className="flex items-center gap-2 border-b border-surface-border overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("atendimentos")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
            activeTab === "atendimentos"
              ? "text-brand-green-text border-brand-green bg-surface/50"
              : "text-muted-foreground border-transparent hover:text-white hover:bg-surface/20"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Atendimentos</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-elevated text-white">
            {metrics.totalAgendamentos}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("financeiro")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
            activeTab === "financeiro"
              ? "text-brand-yellow-text border-brand-yellow bg-surface/50"
              : "text-muted-foreground border-transparent hover:text-white hover:bg-surface/20"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Financeiro</span>
          {!canViewFinancial && (
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("servicos")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
            activeTab === "servicos"
              ? "text-brand-green-text border-brand-green bg-surface/50"
              : "text-muted-foreground border-transparent hover:text-white hover:bg-surface/20"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Serviços</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-elevated text-white">
            {metrics.servicosRealizados.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("clientes")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
            activeTab === "clientes"
              ? "text-brand-green-text border-brand-green bg-surface/50"
              : "text-muted-foreground border-transparent hover:text-white hover:bg-surface/20"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Clientes</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-elevated text-white">
            {metrics.totalClientesAtivos}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("retencao")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
            activeTab === "retencao"
              ? "text-brand-yellow-text border-brand-yellow bg-surface/50"
              : "text-muted-foreground border-transparent hover:text-white hover:bg-surface/20"
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Retenção & Fidelização</span>
          {inactiveCustomers.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {inactiveCustomers.length} inativos
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("avaliacoes")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
            activeTab === "avaliacoes"
              ? "text-brand-yellow-text border-brand-yellow bg-surface/50"
              : "text-muted-foreground border-transparent hover:text-white hover:bg-surface/20"
          }`}
        >
          <Star className="w-4 h-4 text-brand-yellow fill-brand-yellow" />
          <span>Avaliações</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-elevated text-brand-yellow font-bold">
            {reviewsDistribution.average.toFixed(1)} ★
          </span>
        </button>
      </div>

      {/* ======================================================================== */}
      {/* ABA 1: RELATÓRIO DE ATENDIMENTOS (Requisito 17) */}
      {/* ======================================================================== */}
      {activeTab === "atendimentos" && (
        <div className="space-y-4">
          {/* Indicadores do Topo */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-xl bg-surface border border-surface-border">
              <span className="text-xs text-muted-foreground block">Total de Agendamentos</span>
              <span className="text-xl font-bold text-white mt-1 block">
                {metrics.totalAgendamentos}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface border border-surface-border">
              <span className="text-xs text-muted-foreground block">Confirmados</span>
              <span className="text-xl font-bold text-blue-400 mt-1 block">
                {metrics.confirmados}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface border border-surface-border">
              <span className="text-xs text-muted-foreground block">Concluídos</span>
              <span className="text-xl font-bold text-emerald-400 mt-1 block">
                {metrics.concluidos}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface border border-surface-border">
              <span className="text-xs text-muted-foreground block">Em Atendimento</span>
              <span className="text-xl font-bold text-brand-green-text mt-1 block">
                {metrics.emAtendimento}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface border border-surface-border">
              <span className="text-xs text-muted-foreground block">Cancelados</span>
              <span className="text-xl font-bold text-red-400 mt-1 block">
                {metrics.cancelados} ({metrics.taxaCancelamento.toFixed(0)}%)
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface border border-surface-border">
              <span className="text-xs text-muted-foreground block">Não Compareceu</span>
              <span className="text-xl font-bold text-rose-400 mt-1 block">
                {metrics.naoCompareceram} ({metrics.taxaNoShow.toFixed(0)}%)
              </span>
            </div>
          </div>

          {/* Filtros Específicos */}
          <div className="p-3.5 rounded-xl bg-surface border border-surface-border flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-brand-yellow" />
              <span className="font-semibold text-white">Filtros:</span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Status:</span>
                <select
                  value={filterAtendimentoStatus}
                  onChange={(e) => setFilterAtendimentoStatus(e.target.value)}
                  className="bg-surface-elevated border border-surface-border rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                >
                  <option value="todos">Todos os status</option>
                  <option value="Agendado">Agendado</option>
                  <option value="Confirmado">Confirmado</option>
                  <option value="Aguardando">Aguardando</option>
                  <option value="Em atendimento">Em atendimento</option>
                  <option value="Concluído">Concluído (Lavado)</option>
                  <option value="Pronto">Pronto</option>
                  <option value="Aguardando retirada">Aguardando retirada</option>
                  <option value="Entregue">Entregue</option>
                  <option value="Finalizado">Finalizado</option>
                  <option value="Cancelado">Cancelado</option>
                  <option value="Não compareceu">Não compareceu</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Veículo:</span>
                <select
                  value={filterAtendimentoVeiculo}
                  onChange={(e) => setFilterAtendimentoVeiculo(e.target.value)}
                  className="bg-surface-elevated border border-surface-border rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                >
                  <option value="todos">Todas as categorias</option>
                  {TIPOS_VEICULO.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tabela de Atendimentos */}
          {filteredAppointments.length === 0 ? (
            <div className="p-12 rounded-xl bg-surface border border-surface-border text-center text-xs text-muted-foreground">
              Não há dados para o período selecionado.
            </div>
          ) : (
            <div className="rounded-xl bg-surface border border-surface-border overflow-hidden">
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-surface-elevated text-slate-400 font-semibold uppercase tracking-wider border-b border-surface-border">
                    <tr>
                      <th className="py-2.5 px-4">Data/Hora</th>
                      <th className="py-2.5 px-4">Cliente</th>
                      <th className="py-2.5 px-4">Veículo</th>
                      <th className="py-2.5 px-4">Serviço</th>
                      {canViewFinancial && (
                        <th className="py-2.5 px-4 text-right">Valor</th>
                      )}
                      <th className="py-2.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border/60">
                    {filteredAppointments.map((a) => (
                      <tr key={a.id} className="hover:bg-surface-hover/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-white whitespace-nowrap">
                          {formatDateBr(a.data)} às {a.horario}
                        </td>
                        <td className="py-3 px-4 font-medium text-white">
                          <div>{a.cliente_nome}</div>
                          <div className="text-[10px] text-muted-foreground">{a.cliente_whatsapp}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-white font-medium">{a.veiculo_modelo}</div>
                          <div className="font-mono text-[10px] text-muted-foreground uppercase">
                            {a.veiculo_placa} • {a.veiculo_tipo}
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-[220px] truncate text-slate-200">
                          {a.servico_nome}
                        </td>
                        {canViewFinancial && (
                          <td className="py-3 px-4 text-right font-bold text-white">
                            {formatCurrency(a.valor)}
                          </td>
                        )}
                        <td className="py-3 px-4 text-center">
                          <StatusBadge status={a.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-surface-border/60">
                {filteredAppointments.map((a) => (
                  <div key={a.id} className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-white bg-surface-elevated px-2 py-0.5 rounded">
                        {formatDateBr(a.data)} {a.horario}
                      </span>
                      <StatusBadge status={a.status} />
                    </div>
                    <div className="text-xs">
                      <p className="font-semibold text-white">{a.cliente_nome}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {a.veiculo_modelo} ({a.veiculo_placa}) • {a.veiculo_tipo}
                      </p>
                      <p className="text-slate-300 mt-1">{a.servico_nome}</p>
                    </div>
                    {canViewFinancial && (
                      <div className="text-right font-bold text-brand-yellow-text text-xs">
                        {formatCurrency(a.valor)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================================== */}
      {/* ABA 2: RELATÓRIO FINANCEIRO (Requisito 20) */}
      {/* ======================================================================== */}
      {activeTab === "financeiro" && (
        <>
          {canViewFinancial ? (
            <div className="space-y-4">
              {/* Indicadores do Topo */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="p-3.5 rounded-xl bg-surface border border-surface-border">
                  <span className="text-xs text-muted-foreground block">Faturamento Previsto</span>
                  <span className="text-xl font-bold text-brand-yellow-text mt-1 block">
                    {formatCurrency(metrics.faturamentoPrevisto)}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-surface border border-brand-green/30">
                  <span className="text-xs text-brand-green-text font-semibold block">Total Recebido</span>
                  <span className="text-xl font-bold text-brand-green-text mt-1 block">
                    {formatCurrency(metrics.recebidoTotal)}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-surface border border-surface-border">
                  <span className="text-xs text-muted-foreground block">Pendente</span>
                  <span className="text-xl font-bold text-amber-400 mt-1 block">
                    {formatCurrency(metrics.pendenteTotal)}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-surface border border-rose-500/30">
                  <span className="text-xs text-rose-400 font-semibold block">Saídas de Caixa</span>
                  <span className="text-xl font-bold text-rose-400 mt-1 block">
                    {formatCurrency(metrics.saidasCaixaTotal)}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-surface border border-surface-border col-span-2 sm:col-span-1">
                  <span className="text-xs text-white font-semibold block">Resultado do caixa</span>
                  <span
                    className={`text-xl font-bold mt-1 block ${
                      metrics.resultadoCaixa >= 0 ? "text-white" : "text-rose-400"
                    }`}
                  >
                    {formatCurrency(metrics.resultadoCaixa)}
                  </span>
                </div>
              </div>

              {/* Formas de Pagamento no Período */}
              <div className="p-4 rounded-xl bg-surface border border-surface-border space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Recebimento por Forma de Pagamento
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(["pix", "dinheiro", "debito", "credito"] as const).map((m) => {
                    const item = metrics.porMetodo[m];
                    return (
                      <div
                        key={m}
                        className="p-3 rounded-lg bg-surface-elevated border border-surface-border/70"
                      >
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-white">{item.label}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {item.quantidade} pagtos
                          </span>
                        </div>
                        <div className="text-base font-bold text-brand-green-text mt-1">
                          {formatCurrency(item.valor)}
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-0.5 block">
                          {Math.round(item.percentual)}% do total recebido
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Filtro de Pagamentos */}
              <div className="p-3.5 rounded-xl bg-surface border border-surface-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-brand-yellow" />
                  <span className="font-semibold text-white">Método:</span>
                </div>
                <select
                  value={filterPaymentMethod}
                  onChange={(e) => setFilterPaymentMethod(e.target.value)}
                  className="bg-surface-elevated border border-surface-border rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                >
                  <option value="todos">Todos os métodos</option>
                  <option value="pix">PIX</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="debito">Cartão de Débito</option>
                  <option value="credito">Cartão de Crédito</option>
                </select>
              </div>

              {/* Tabela de Pagamentos */}
              {filteredPayments.length === 0 ? (
                <div className="p-12 rounded-xl bg-surface border border-surface-border text-center text-xs text-muted-foreground">
                  Não há dados para o período selecionado.
                </div>
              ) : (
                <div className="rounded-xl bg-surface border border-surface-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-surface-elevated text-slate-400 font-semibold uppercase tracking-wider border-b border-surface-border">
                        <tr>
                          <th className="py-2.5 px-4">Data Pagamento</th>
                          <th className="py-2.5 px-4">Método</th>
                          <th className="py-2.5 px-4">Status</th>
                          <th className="py-2.5 px-4 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-border/60">
                        {filteredPayments.map((p) => (
                          <tr key={p.id} className="hover:bg-surface-hover/50 transition-colors">
                            <td className="py-3 px-4 font-mono font-medium text-white">
                              {p.paid_at ? formatDateBr(p.paid_at.substring(0, 10)) : "-"}
                            </td>
                            <td className="py-3 px-4 font-medium text-white">
                              {PAYMENT_METHOD_LABELS[p.payment_method] || p.payment_method}
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                {p.status === "paid" ? "Pago" : p.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-brand-green-text">
                              {formatCurrency(p.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Mensagem amigável de Acesso Restrito */
            <div className="p-8 rounded-xl bg-surface border border-surface-border text-center space-y-3">
              <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto" />
              <h3 className="text-base font-bold text-white">
                Acesso Restrito ao Relatório Financeiro
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Apenas usuários com papel de proprietário, administrador ou gerente têm autorização para consultar dados financeiros, recebimentos e caixa.
              </p>
            </div>
          )}
        </>
      )}

      {/* ======================================================================== */}
      {/* ABA 3: RELATÓRIO DE SERVIÇOS (Requisito 18) */}
      {/* ======================================================================== */}
      {activeTab === "servicos" && (
        <div className="space-y-4">
          {/* Indicadores do Topo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-surface border border-surface-border">
              <span className="text-xs text-muted-foreground block">Total de Atendimentos</span>
              <span className="text-xl font-bold text-white mt-1 block">
                {metrics.concluidos} concluídos
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface border border-surface-border">
              <span className="text-xs text-muted-foreground block">Faturamento Gerado</span>
              <span className="text-xl font-bold text-brand-yellow-text mt-1 block">
                {canViewFinancial ? formatCurrency(metrics.faturamentoPrevisto) : "••••••"}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface border border-surface-border">
              <span className="text-xs text-muted-foreground block">Serviço Líder em Volume</span>
              <span className="text-xs font-bold text-white mt-1 block truncate">
                {metrics.servicosRealizados[0]?.nome || "Nenhum"}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface border border-surface-border">
              <span className="text-xs text-muted-foreground block">Ticket Médio Realizado</span>
              <span className="text-xl font-bold text-white mt-1 block">
                {canViewFinancial && metrics.concluidos > 0
                  ? formatCurrency(metrics.faturamentoPrevisto / metrics.concluidos)
                  : "••••••"}
              </span>
            </div>
          </div>

          {/* Filtro por Tipo de Veículo */}
          <div className="p-3.5 rounded-xl bg-surface border border-surface-border flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-brand-yellow" />
              <span className="font-semibold text-white">Categoria do Veículo:</span>
            </div>
            <select
              value={filterServicoVeiculo}
              onChange={(e) => setFilterServicoVeiculo(e.target.value)}
              className="bg-surface-elevated border border-surface-border rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
            >
              <option value="todos">Todas as categorias</option>
              {TIPOS_VEICULO.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>

          {/* Tabela do Ranking de Serviços (Ordenado por quantidade) */}
          {filteredServices.length === 0 ? (
            <div className="p-12 rounded-xl bg-surface border border-surface-border text-center text-xs text-muted-foreground">
              Não há dados para o período selecionado.
            </div>
          ) : (
            <div className="rounded-xl bg-surface border border-surface-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-surface-elevated text-slate-400 font-semibold uppercase tracking-wider border-b border-surface-border">
                    <tr>
                      <th className="py-2.5 px-4 text-center">#</th>
                      <th className="py-2.5 px-4">Serviço</th>
                      <th className="py-2.5 px-4">Categoria</th>
                      <th className="py-2.5 px-4 text-center">Qtd Realizada</th>
                      {canViewFinancial && (
                        <>
                          <th className="py-2.5 px-4 text-right">Faturamento Total</th>
                          <th className="py-2.5 px-4 text-right">Preço Médio Realizado</th>
                          <th className="py-2.5 px-4 text-right">% Receita</th>
                        </>
                      )}
                      <th className="py-2.5 px-4 text-right">% Volume</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border/60">
                    {filteredServices.map((srv, index) => (
                      <tr key={srv.id} className="hover:bg-surface-hover/50 transition-colors">
                        <td className="py-3 px-4 text-center font-bold text-slate-400">
                          {index + 1}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">
                          {srv.nome}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {srv.tipoVeiculo}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-white">
                          {srv.quantidade}
                        </td>
                        {canViewFinancial && (
                          <>
                            <td className="py-3 px-4 text-right font-bold text-brand-yellow-text">
                              {formatCurrency(srv.faturamento)}
                            </td>
                            <td className="py-3 px-4 text-right text-slate-200">
                              {formatCurrency(srv.ticketMedio)}
                            </td>
                            <td className="py-3 px-4 text-right text-muted-foreground">
                              {srv.percentualReceita.toFixed(1)}%
                            </td>
                          </>
                        )}
                        <td className="py-3 px-4 text-right font-semibold text-brand-green-text">
                          {srv.percentualVolume.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================================== */}
      {/* ABA 4: RELATÓRIO DE CLIENTES (Requisito 19) */}
      {/* ======================================================================== */}
      {activeTab === "clientes" && (
        <div className="space-y-4">
          {/* Indicadores do Topo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-surface border border-surface-border">
              <span className="text-xs text-muted-foreground block">Clientes Atendidos</span>
              <span className="text-xl font-bold text-white mt-1 block">
                {metrics.clientesAtendidos}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface border border-surface-border">
              <span className="text-xs text-muted-foreground block">Novos no Período</span>
              <span className="text-xl font-bold text-brand-green-text mt-1 block">
                {metrics.novosClientes}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface border border-surface-border">
              <span className="text-xs text-muted-foreground block" title="Cliente com ≥ 2 atendimentos concluídos no período">
                Recorrentes (≥2)
              </span>
              <span className="text-xl font-bold text-brand-yellow-text mt-1 block">
                {metrics.clientesRecorrentes}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface border border-surface-border">
              <span className="text-xs text-muted-foreground block">Sem Atendimento</span>
              <span className="text-xl font-bold text-slate-400 mt-1 block">
                {metrics.clientesSemAtendimento}
              </span>
            </div>
          </div>

          {/* Filtro de Tipo de Cliente */}
          <div className="p-3.5 rounded-xl bg-surface border border-surface-border flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-brand-yellow" />
              <span className="font-semibold text-white">Segmento:</span>
            </div>
            <select
              value={filterClienteTipo}
              onChange={(e) => setFilterClienteTipo(e.target.value)}
              className="bg-surface-elevated border border-surface-border rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
            >
              <option value="todos">Todos os clientes</option>
              <option value="recorrentes">Recorrentes (≥ 2 atendimentos)</option>
              <option value="sem_atendimento">Sem atendimento no período</option>
            </select>
          </div>

          {/* Tabela de Clientes */}
          {filteredCustomerReport.length === 0 ? (
            <div className="p-12 rounded-xl bg-surface border border-surface-border text-center text-xs text-muted-foreground">
              Não há dados para o período selecionado.
            </div>
          ) : (
            <div className="rounded-xl bg-surface border border-surface-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-surface-elevated text-slate-400 font-semibold uppercase tracking-wider border-b border-surface-border">
                    <tr>
                      <th className="py-2.5 px-4">Cliente</th>
                      <th className="py-2.5 px-4">WhatsApp</th>
                      <th className="py-2.5 px-4 text-center">Veículos</th>
                      <th className="py-2.5 px-4 text-center">Atendimentos</th>
                      <th className="py-2.5 px-4 text-center">Concluídos</th>
                      {canViewFinancial && (
                        <th className="py-2.5 px-4 text-right">Total Gasto</th>
                      )}
                      <th className="py-2.5 px-4 text-center">Recorrente?</th>
                      <th className="py-2.5 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border/60">
                    {filteredCustomerReport.map((c) => (
                      <tr key={c.id} className="hover:bg-surface-hover/50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-white">
                          {c.nome}
                        </td>
                        <td className="py-3 px-4 font-mono text-muted-foreground">
                          {c.whatsapp}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-bold text-white">{c.veiculosCount}</span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-white">
                          {c.totalAtendimentosPeriodo}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-400">
                          {c.atendimentosConcluidosPeriodo}
                        </td>
                        {canViewFinancial && (
                          <td className="py-3 px-4 text-right font-bold text-brand-green-text">
                            {formatCurrency(c.totalGastoPeriodo)}
                          </td>
                        )}
                        <td className="py-3 px-4 text-center">
                          {c.isRecorrente ? (
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-brand-yellow/20 text-brand-yellow-text border border-brand-yellow/30">
                              Sim (≥2)
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Link
                            href={`/clientes/${c.id}`}
                            className="text-brand-green-text hover:underline text-[11px] font-medium"
                          >
                            Ver cliente
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================================== */}
      {/* ABA 5: RETENÇÃO, FIDELIZAÇÃO E CLIENTES INATIVOS (ETAPA 12) */}
      {/* ======================================================================== */}
      {activeTab === "retencao" && (
        <div className="space-y-6">
          {/* Indicadores Topo Retenção */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-surface border border-surface-border">
              <span className="text-xs text-muted-foreground block">Clientes com Atendimentos</span>
              <span className="text-xl font-bold text-white mt-1 block">
                {topFrequentCustomers.length}
              </span>
              <span className="text-[10px] text-muted-foreground">Histórico completo</span>
            </div>

            <div className="p-3.5 rounded-xl bg-surface border border-surface-border">
              <span className="text-xs text-muted-foreground block">Clientes VIP</span>
              <span className="text-xl font-bold text-amber-300 mt-1 block flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" />
                {topRevenueCustomers.filter((c) => c.isVip).length}
              </span>
              <span className="text-[10px] text-muted-foreground">≥ R$ {businessSettings?.vip_min_spent || 500} ou ≥ {businessSettings?.vip_min_visits || 10} visitas</span>
            </div>

            <div className="p-3.5 rounded-xl bg-surface border border-surface-border">
              <span className="text-xs text-muted-foreground block">Clientes Inativos</span>
              <span className="text-xl font-bold text-amber-400 mt-1 block">
                {inactiveCustomers.length}
              </span>
              <span className="text-[10px] text-muted-foreground">≥ {retentionInactiveThreshold} dias sem retorno</span>
            </div>

            <div className="p-3.5 rounded-xl bg-surface border border-surface-border">
              <span className="text-xs text-muted-foreground block">Taxa de Clientes em Risco</span>
              <span className="text-xl font-bold text-slate-300 mt-1 block">
                {topFrequentCustomers.length > 0
                  ? `${Math.round((inactiveCustomers.length / topFrequentCustomers.length) * 100)}%`
                  : "0%"}
              </span>
              <span className="text-[10px] text-muted-foreground">Proporção inativa</span>
            </div>
          </div>

          {/* SEÇÃO 1: RANKINGS DE FIDELIDADE (FREQUÊNCIA E FATURAMENTO REAL) */}
          <section className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-surface-border/60">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <Award className="w-4 h-4 text-brand-yellow" />
                  <span>Ranking de Melhores Clientes</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Identifique quem mais frequenta e quem gera mais receita quitada no lava-jato.
                </p>
              </div>

              {/* Toggle de Ranking */}
              <div className="flex items-center gap-1 p-1 bg-surface rounded-xl border border-surface-border text-xs">
                <button
                  type="button"
                  onClick={() => setRetentionRankingMode("frequencia")}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    retentionRankingMode === "frequencia"
                      ? "bg-surface-elevated text-brand-green font-semibold"
                      : "text-muted-foreground hover:text-white"
                  }`}
                >
                  Por Frequência (Visitas)
                </button>
                <button
                  type="button"
                  onClick={() => setRetentionRankingMode("faturamento")}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    retentionRankingMode === "faturamento"
                      ? "bg-surface-elevated text-brand-yellow font-semibold"
                      : "text-muted-foreground hover:text-white"
                  }`}
                >
                  Por Faturamento Real Pago
                </button>
              </div>
            </div>

            {/* Tabela do Ranking */}
            <div className="rounded-xl bg-surface border border-surface-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-surface-elevated text-slate-400 font-semibold uppercase tracking-wider border-b border-surface-border text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3 text-center">Pos</th>
                      <th className="py-2.5 px-4">Cliente</th>
                      <th className="py-2.5 px-4">WhatsApp</th>
                      <th className="py-2.5 px-4 text-center">Visitas Concluídas</th>
                      {canViewFinancial && (
                        <>
                          <th className="py-2.5 px-4 text-right">Faturamento Real</th>
                          <th className="py-2.5 px-4 text-right">Ticket Médio</th>
                        </>
                      )}
                      <th className="py-2.5 px-4 text-center">Última Visita</th>
                      <th className="py-2.5 px-4 text-center">Dias Sem Voltar</th>
                      <th className="py-2.5 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border/60">
                    {(retentionRankingMode === "frequencia" ? topFrequentCustomers : topRevenueCustomers).map((item, idx) => (
                      <tr key={item.customerId} className="hover:bg-surface-hover/50 transition-colors">
                        <td className="py-3 px-3 text-center font-bold text-slate-400">
                          {idx + 1}º
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{item.customerName}</span>
                            {item.isVip && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                VIP
                              </span>
                            )}
                            {item.tags.filter((t) => t !== "VIP").map((t) => (
                              <span key={t} className="px-1.5 py-0.2 rounded text-[9px] bg-slate-700/60 text-slate-300 border border-slate-600">
                                {t}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-muted-foreground">
                          {item.customerPhone}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-400 text-sm">
                          {item.completedVisits}
                        </td>
                        {canViewFinancial && (
                          <>
                            <td className="py-3 px-4 text-right font-bold text-brand-green-text">
                              {formatCurrency(item.totalSpentReal)}
                            </td>
                            <td className="py-3 px-4 text-right text-slate-200">
                              {formatCurrency(item.averageTicket)}
                            </td>
                          </>
                        )}
                        <td className="py-3 px-4 text-center text-slate-300">
                          {item.lastVisitDate ? formatDateBr(item.lastVisitDate) : "—"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.daysSinceLastVisit !== null ? (
                            <span className={`font-semibold ${item.daysSinceLastVisit > 60 ? "text-amber-400" : "text-slate-300"}`}>
                              {item.daysSinceLastVisit} dias
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <WhatsAppButton
                              phone={item.customerPhone}
                              templateType="generalContact"
                              templateVars={{ cliente: item.customerName }}
                              customerId={item.customerId}
                              label="WhatsApp"
                              variant="ghost"
                              size="xs"
                            />
                            <Link
                              href={`/clientes/${item.customerId}`}
                              className="text-brand-green-text hover:underline text-[11px] font-medium"
                            >
                              Ver
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* SEÇÃO 2: PAINEL DE CLIENTES INATIVOS & AÇÕES DE RETENÇÃO (Requisito 22 e 27) */}
          <section className="space-y-3 pt-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-surface-border/60">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  <span>Painel de Clientes Inativos (Oportunidades de Retorno)</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Clientes que já frequentaram o lava-jato mas estão sem retorno. Contate diretamente via WhatsApp com mensagem preparada.
                </p>
              </div>

              {/* Filtro de Dias de Inatividade */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Critério de inatividade:</span>
                <select
                  value={retentionInactiveThreshold}
                  onChange={(e) => setRetentionInactiveThreshold(Number(e.target.value))}
                  className="bg-surface-elevated border border-surface-border rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                >
                  <option value={30}>≥ 30 dias sem retorno</option>
                  <option value={60}>≥ 60 dias sem retorno (padrão)</option>
                  <option value={90}>≥ 90 dias sem retorno</option>
                  <option value={120}>≥ 120 dias sem retorno</option>
                </select>
              </div>
            </div>

            {inactiveCustomers.length === 0 ? (
              <div className="p-8 rounded-xl bg-surface border border-surface-border text-center text-xs text-muted-foreground">
                🎉 Nenhum cliente inativo encontrado para o critério de {retentionInactiveThreshold} dias! Todos os clientes retornaram recentemente.
              </div>
            ) : (
              <div className="rounded-xl bg-surface border border-surface-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-surface-elevated text-slate-400 font-semibold uppercase tracking-wider border-b border-surface-border text-[10px]">
                      <tr>
                        <th className="py-2.5 px-4">Cliente</th>
                        <th className="py-2.5 px-4">WhatsApp</th>
                        <th className="py-2.5 px-4 text-center">Última Visita</th>
                        <th className="py-2.5 px-4 text-center">Dias Sem Voltar</th>
                        <th className="py-2.5 px-4 text-center">Visitas Anteriores</th>
                        {canViewFinancial && (
                          <th className="py-2.5 px-4 text-right">Total Já Gasto</th>
                        )}
                        <th className="py-2.5 px-4">Último Serviço</th>
                        <th className="py-2.5 px-4 text-center">Ação de Retenção</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border/60">
                      {inactiveCustomers.map((cust) => (
                        <tr key={cust.customerId} className="hover:bg-surface-hover/50 transition-colors">
                          <td className="py-3 px-4 font-semibold text-white">
                            {cust.customerName}
                          </td>
                          <td className="py-3 px-4 font-mono text-muted-foreground">
                            {cust.customerPhone}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-300">
                            {formatDateBr(cust.lastVisitDate)}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-amber-400">
                            {cust.daysSinceLastVisit} dias
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-white">
                            {cust.totalCompletedVisits}
                          </td>
                          {canViewFinancial && (
                            <td className="py-3 px-4 text-right font-bold text-brand-green-text">
                              {formatCurrency(cust.totalSpent)}
                            </td>
                          )}
                          <td className="py-3 px-4 text-muted-foreground truncate max-w-[160px]">
                            {cust.lastServiceName || "—"}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <WhatsAppButton
                                phone={cust.customerPhone}
                                templateType="customerRetention"
                                templateVars={{ cliente: cust.customerName }}
                                customerId={cust.customerId}
                                label="WhatsApp Retenção"
                                variant="green"
                                size="xs"
                              />
                              <Link
                                href={`/clientes/${cust.customerId}`}
                                className="text-slate-400 hover:text-white text-[11px]"
                              >
                                Ver perfil
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ======================================================================== */}
      {/* ABA 6: AVALIAÇÕES E SATISFAÇÃO DE CLIENTES (ETAPA 12) */}
      {/* ======================================================================== */}
      {activeTab === "avaliacoes" && (
        <div className="space-y-6">
          {/* Indicadores Topo Avaliações */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-surface border border-surface-border">
              <span className="text-xs text-muted-foreground block">Nota Média Geral</span>
              <div className="text-2xl font-bold text-brand-yellow mt-1 flex items-center gap-2">
                <span>{reviewsDistribution.average.toFixed(1)}</span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= Math.round(reviewsDistribution.average)
                          ? "text-brand-yellow fill-brand-yellow"
                          : "text-slate-600"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground">Escala de 1 a 5 estrelas</span>
            </div>

            <div className="p-4 rounded-xl bg-surface border border-surface-border">
              <span className="text-xs text-muted-foreground block">Total de Avaliações</span>
              <span className="text-2xl font-bold text-white mt-1 block">
                {reviewsDistribution.total}
              </span>
              <span className="text-[10px] text-muted-foreground">Avaliações registradas</span>
            </div>

            <div className="p-4 rounded-xl bg-surface border border-surface-border">
              <span className="text-xs text-muted-foreground block">Satisfeitos (4 a 5★)</span>
              <span className="text-2xl font-bold text-brand-green-text mt-1 block">
                {reviewsDistribution.positiveCount}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {reviewsDistribution.total > 0
                  ? `${Math.round((reviewsDistribution.positiveCount / reviewsDistribution.total) * 100)}% de aprovação`
                  : "0%"}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-surface border border-surface-border">
              <span className="text-xs text-muted-foreground block">Atenção Crítica (≤ 2★)</span>
              <span className="text-2xl font-bold text-amber-400 mt-1 block">
                {reviewsDistribution.negativeCount}
              </span>
              <span className="text-[10px] text-muted-foreground">Feedbacks que exigem contato</span>
            </div>
          </div>

          {/* DISTRIBUIÇÃO GRÁFICA DE NOTAS (1★ A 5★) */}
          <section className="p-5 rounded-xl bg-surface border border-surface-border space-y-3">
            <h3 className="text-sm font-bold text-white tracking-tight">
              Distribuição de Avaliações por Estrela
            </h3>

            <div className="space-y-2 pt-2">
              {([5, 4, 3, 2, 1] as const).map((stars) => {
                const count = reviewsDistribution.countByRating[stars] || 0;
                const pct = reviewsDistribution.percentageByRating[stars] || 0;
                return (
                  <div key={stars} className="flex items-center gap-3 text-xs">
                    <div className="w-16 flex items-center gap-1 font-semibold text-slate-300 shrink-0">
                      <span>{stars}</span>
                      <Star className="w-3.5 h-3.5 text-brand-yellow fill-brand-yellow" />
                    </div>

                    <div className="flex-1 h-3 rounded-full bg-surface-elevated overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          stars >= 4
                            ? "bg-brand-green"
                            : stars === 3
                            ? "bg-brand-yellow"
                            : "bg-rose-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="w-20 text-right text-muted-foreground shrink-0 font-medium">
                      <span>{count}</span>
                      <span className="text-[10px] ml-1">({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ALERTA DE FEEDBACKS NEGATIVOS (≤ 2 ESTRELAS) */}
          {negativeReviews.length > 0 && (
            <section className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
              <div className="flex items-center gap-2 text-amber-300">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <h3 className="text-sm font-bold text-amber-200">
                  Alerta: Feedbacks Críticos Registrados ({negativeReviews.length})
                </h3>
              </div>
              <p className="text-xs text-amber-300/80">
                Os seguintes atendimentos receberam notas 1 ou 2 estrelas. Recomenda-se realizar contato proativo via WhatsApp para entender e resolver eventuais insatisfações.
              </p>

              <div className="space-y-2 pt-1">
                {negativeReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3 rounded-lg bg-surface border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white">{rev.customer_name || "Cliente"}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          {rev.rating} ★
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                          {formatDateBr(rev.created_at.substring(0, 10))}
                        </span>
                        {rev.service_name && (
                          <span className="text-slate-300">• {rev.service_name}</span>
                        )}
                      </div>
                      {rev.comment && (
                        <p className="text-slate-300 italic bg-black/20 p-2 rounded border border-surface-border/50">
                          &quot;{rev.comment}&quot;
                        </p>
                      )}
                    </div>

                    <WhatsAppButton
                      phone={clientes.find((c) => c.id === rev.customer_id)?.whatsapp}
                      templateType="feedbackFollowup"
                      templateVars={{ cliente: rev.customer_name || "Cliente" }}
                      customerId={rev.customer_id}
                      appointmentId={rev.appointment_id}
                      label="Acompanhar Feedback"
                      variant="green"
                      size="xs"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* LISTA COMPLETA DE AVALIAÇÕES E COMENTÁRIOS */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-white tracking-tight">
              Histórico Completo de Avaliações ({serviceReviews?.length || 0})
            </h3>

            {(!serviceReviews || serviceReviews.length === 0) ? (
              <div className="p-8 rounded-xl bg-surface border border-surface-border text-center text-xs text-muted-foreground">
                Nenhuma avaliação registrada ainda no sistema.
              </div>
            ) : (
              <div className="rounded-xl bg-surface border border-surface-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-surface-elevated text-slate-400 font-semibold uppercase tracking-wider border-b border-surface-border text-[10px]">
                      <tr>
                        <th className="py-2.5 px-4">Data</th>
                        <th className="py-2.5 px-4">Cliente</th>
                        <th className="py-2.5 px-4">Serviço</th>
                        <th className="py-2.5 px-4 text-center">Nota</th>
                        <th className="py-2.5 px-4">Comentário / Relato</th>
                        <th className="py-2.5 px-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border/60">
                      {serviceReviews.map((rev) => (
                        <tr key={rev.id} className="hover:bg-surface-hover/50 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap text-muted-foreground">
                            {formatDateBr(rev.created_at.substring(0, 10))}
                          </td>
                          <td className="py-3 px-4 font-semibold text-white">
                            {rev.customer_name || "Cliente"}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {rev.service_name || "Serviço"}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                                rev.rating >= 4
                                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                  : rev.rating === 3
                                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                  : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                              }`}
                            >
                              <span>{rev.rating}</span>
                              <Star className="w-3 h-3 fill-current" />
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300 max-w-xs">
                            {rev.comment ? (
                              <span className="italic">&quot;{rev.comment}&quot;</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Link
                              href={`/clientes/${rev.customer_id}`}
                              className="text-brand-green-text hover:underline text-[11px]"
                            >
                              Ver cliente
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
