"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  Users,
  CheckCircle2,
  Clock,
  DollarSign,
  Plus,
  Play,
  ArrowRight,
  Car,
  Wallet,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  XCircle,
  TrendingUp,
  CalendarCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PeriodSelector } from "@/components/reports/PeriodSelector";
import { SimpleTrendChart } from "@/components/reports/SimpleTrendChart";
import { NovoAgendamentoModal } from "@/components/modals/NovoAgendamentoModal";
import { NovoClienteModal } from "@/components/modals/NovoClienteModal";
import { NovoAtendimentoModal } from "@/components/modals/NovoAtendimentoModal";
import { useAppStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { resolveDateRange, formatDateBr } from "@/lib/services/reports";
import {
  calculateReviewDistribution,
  findInactiveCustomers,
} from "@/lib/services/customerIntelligence";
import { PeriodFilter, DateRange, UserRole } from "@/types";

export default function DashboardPage() {
  const {
    agendamentos,
    clientes,
    payments,
    serviceReviews,
    businessSettings,
    updateAgendamentoStatus,
    activeCashRegister,
    currentRole,
    setCurrentRole,
    canViewFinancial,
    getPeriodMetrics,
  } = useAppStore();

  // Modais de ações rápidas
  const [isNovoAgendamentoOpen, setIsNovoAgendamentoOpen] = useState(false);
  const [isNovoClienteOpen, setIsNovoClienteOpen] = useState(false);
  const [isNovoAtendimentoOpen, setIsNovoAtendimentoOpen] = useState(false);

  // Seletor de Período
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("today");
  const [dateRange, setDateRange] = useState<DateRange>(() => resolveDateRange("today"));

  // Filtro de status da lista de atendimentos do dia
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  // Métricas do período selecionado
  const metrics = useMemo(() => {
    return getPeriodMetrics(dateRange);
  }, [getPeriodMetrics, dateRange]);

  // Atendimentos do período para listagem
  const periodAppointments = useMemo(() => {
    return agendamentos.filter(
      (a) => a.data >= dateRange.startDate && a.data <= dateRange.endDate
    );
  }, [agendamentos, dateRange]);

  // Lista de próximos atendimentos (filtrada)
  const filteredAppointments = useMemo(() => {
    return periodAppointments.filter((a) => {
      if (statusFilter === "todos") return true;
      return a.status === statusFilter;
    });
  }, [periodAppointments, statusFilter]);

  // Novos clientes no período para listagem rápida
  const recentNewClients = useMemo(() => {
    return clientes
      .filter((c) => {
        const regDate = c.created_at ? c.created_at.substring(0, 10) : "";
        return regDate >= dateRange.startDate && regDate <= dateRange.endDate;
      })
      .slice(0, 4);
  }, [clientes, dateRange]);

  // ETAPA 12: Métricas de Clientes e Avaliações
  const reviewsStats = useMemo(() => {
    return calculateReviewDistribution(serviceReviews || []);
  }, [serviceReviews]);

  const inactiveCount = useMemo(() => {
    return findInactiveCustomers(
      clientes,
      agendamentos,
      payments,
      businessSettings?.inactive_threshold_days || 60
    ).length;
  }, [clientes, agendamentos, payments, businessSettings]);

  return (
    <div className="space-y-6">
      {/* 1. TOPO DO DASHBOARD (Requisitos 2 e 33) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-surface-border/60">
        <div className="flex items-center gap-3">
          <Logo size="sm" showText={false} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Olá, Point do Coco 👋
              </h1>
              <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
            </div>
            <p className="text-xs text-muted-foreground">
              Veja o movimento do seu lava-jato.
            </p>
          </div>
        </div>

        {/* Controles de Topo: Alternador de Perfil (Role) & Ações Rápidas */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Seletor de Perfil para testes de permissão */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-surface-border text-xs">
            {canViewFinancial ? (
              <ShieldCheck className="w-3.5 h-3.5 text-brand-green" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="text-muted-foreground hidden sm:inline text-[11px]">Perfil:</span>
            <select
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value as UserRole)}
              className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer"
              title="Alternar perfil para testar permissão de visualização financeira"
            >
              <option value="admin" className="bg-surface-dark text-white">
                Administrador
              </option>
              <option value="owner" className="bg-surface-dark text-white">
                Proprietário
              </option>
              <option value="manager" className="bg-surface-dark text-white">
                Gerente
              </option>
              <option value="employee" className="bg-surface-dark text-white">
                Funcionário (Operacional)
              </option>
            </select>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsNovoClienteOpen(true)}
            leftIcon={<Users className="w-3.5 h-3.5 text-slate-300" />}
          >
            Novo cliente
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsNovoAtendimentoOpen(true)}
            leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
          >
            Atendimento
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsNovoAgendamentoOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Agendamento
          </Button>
        </div>
      </div>

      {/* 2. SELETOR DE PERÍODO (Requisitos 2 e 15) */}
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

      {/* 3. RESUMO DO PERÍODO — CARDS COMPACTOS (Requisito 3) */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Resumo — {dateRange.label}
          </h2>
          <span className="text-[11px] text-muted-foreground">
            {metrics.totalAgendamentos} registros no período
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Agendamentos */}
          <div className="p-3.5 rounded-xl bg-surface border border-surface-border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">
                Agendamentos
              </span>
              <div className="w-6 h-6 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
                <CalendarIcon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-bold text-white">
              {metrics.totalAgendamentos}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Volume do período
            </p>
          </div>

          {/* 2. Em Atendimento */}
          <div className="p-3.5 rounded-xl bg-surface border border-brand-green/30">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-brand-green-text">
                Em atendimento
              </span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-green" />
              </span>
            </div>
            <div className="text-xl font-bold text-white">
              {metrics.emAtendimento}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Boxes ocupados agora
            </p>
          </div>

          {/* 3. Concluídos */}
          <div className="p-3.5 rounded-xl bg-surface border border-surface-border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">
                Concluídos
              </span>
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-bold text-brand-green-text">
              {metrics.concluidos}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Veículos entregues
            </p>
          </div>

          {/* 4. Faturamento (Apenas gestores) */}
          <div className="p-3.5 rounded-xl bg-surface border border-surface-border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">
                Faturamento
              </span>
              <div className="w-6 h-6 rounded-lg bg-brand-yellow/10 flex items-center justify-center text-brand-yellow">
                <DollarSign className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-bold text-brand-yellow-text">
              {canViewFinancial ? formatCurrency(metrics.faturamentoPrevisto) : "••••••"}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {canViewFinancial ? "Previsto no período" : "Acesso restrito"}
            </p>
          </div>

          {/* 5. Recebido (Apenas gestores) */}
          <div className="p-3.5 rounded-xl bg-surface border border-surface-border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">
                Recebido
              </span>
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-bold text-brand-green-text">
              {canViewFinancial ? formatCurrency(metrics.recebidoTotal) : "••••••"}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {canViewFinancial ? `${metrics.totalPagamentosQtd} pagtos pagos` : "Acesso restrito"}
            </p>
          </div>

          {/* 6. Pendente (Apenas gestores) */}
          <div className="p-3.5 rounded-xl bg-surface border border-surface-border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">
                Pendente
              </span>
              <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-bold text-amber-400">
              {canViewFinancial ? formatCurrency(metrics.pendenteTotal) : "••••••"}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {canViewFinancial ? "Saldo a receber" : "Acesso restrito"}
            </p>
          </div>
        </div>
      </section>

      {/* 4. ATENDIMENTOS DO PERÍODO & AÇÕES RÁPIDAS (Requisito 4) */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <span>Atendimentos do período</span>
              <span className="text-xs font-normal text-muted-foreground">
                ({filteredAppointments.length} de {metrics.totalAgendamentos})
              </span>
            </h3>
          </div>

          {/* Filtros rápidos de status */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {["todos", "Aguardando", "Em atendimento", "Concluído", "Pronto", "Entregue", "Finalizado", "Cancelado"].map(
              (filtro) => (
                <button
                  key={filtro}
                  onClick={() => setStatusFilter(filtro)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all whitespace-nowrap ${
                    statusFilter === filtro
                      ? "bg-brand-green/20 text-brand-green-text border-brand-green/40 font-semibold"
                      : "bg-surface text-muted-foreground border-surface-border hover:text-white"
                  }`}
                >
                  {filtro === "todos" ? "Todos" : filtro}
                </button>
              )
            )}
          </div>
        </div>

        {/* Lista de Atendimentos */}
        {filteredAppointments.length === 0 ? (
          <div className="p-8 rounded-xl bg-surface border border-surface-border text-center space-y-2">
            <CalendarCheck className="w-8 h-8 text-muted mx-auto" />
            <p className="text-sm font-medium text-white">Nenhum atendimento encontrado</p>
            <p className="text-xs text-muted-foreground">
              Não há atendimentos para o filtro selecionado no período.
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-surface border border-surface-border overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-surface-elevated text-slate-400 font-semibold uppercase tracking-wider border-b border-surface-border">
                  <tr>
                    <th className="py-2.5 px-4">Data & Horário</th>
                    <th className="py-2.5 px-4">Cliente</th>
                    <th className="py-2.5 px-4">Veículo</th>
                    <th className="py-2.5 px-4">Serviço</th>
                    <th className="py-2.5 px-4">Status</th>
                    {canViewFinancial && <th className="py-2.5 px-4 text-right">Valor</th>}
                    <th className="py-2.5 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/60">
                  {filteredAppointments.slice(0, 8).map((a) => (
                    <tr key={a.id} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-white">
                        <div>{a.horario}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatDateBr(a.data)}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-white">
                        {a.cliente_nome}
                      </td>
                      <td className="py-3 px-4">
                        <div>{a.veiculo_modelo}</div>
                        <div className="font-mono text-[10px] text-muted-foreground uppercase">
                          {a.veiculo_placa} • {a.veiculo_tipo}
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-[200px] truncate text-slate-200">
                        {a.servico_nome}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={a.status} />
                      </td>
                      {canViewFinancial && (
                        <td className="py-3 px-4 text-right font-bold text-white">
                          {formatCurrency(a.valor)}
                        </td>
                      )}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {a.status === "Aguardando" && (
                            <button
                              onClick={() => updateAgendamentoStatus(a.id, "Em atendimento")}
                              className="px-2 py-1 bg-brand-green/20 hover:bg-brand-green/30 text-brand-green-text border border-brand-green/40 rounded text-[11px] font-semibold transition-all"
                            >
                              Iniciar
                            </button>
                          )}
                          {a.status === "Em atendimento" && (
                            <Link
                              href={`/atendimentos/${a.id}`}
                              className="px-2 py-1 bg-brand-yellow/20 hover:bg-brand-yellow/30 text-brand-yellow-text border border-brand-yellow/40 rounded text-[11px] font-semibold transition-all"
                            >
                              Concluir
                            </Link>
                          )}
                          {a.status === "Concluído" && (
                            <Link
                              href={`/atendimentos/${a.id}`}
                              className="px-2 py-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 border border-sky-500/40 rounded text-[11px] font-semibold transition-all"
                            >
                              Conferir
                            </Link>
                          )}
                          {["Pronto", "Aguardando retirada"].includes(a.status) && (
                            <Link
                              href={`/atendimentos/${a.id}`}
                              className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded text-[11px] font-semibold transition-all"
                            >
                              Entregar
                            </Link>
                          )}
                          <Link
                            href={`/atendimentos/${a.id}`}
                            className="px-2 py-1 text-slate-400 hover:text-white text-[11px] underline"
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

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-surface-border/60">
              {filteredAppointments.slice(0, 6).map((a) => (
                <div key={a.id} className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white bg-surface-elevated px-2 py-0.5 rounded">
                        {a.horario}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDateBr(a.data)}
                      </span>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>

                  <div className="text-xs">
                    <p className="font-semibold text-white">{a.cliente_nome}</p>
                    <p className="text-muted-foreground text-[11px]">
                      {a.veiculo_modelo} • {a.veiculo_placa}
                    </p>
                    <p className="text-slate-300 mt-0.5">{a.servico_nome}</p>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    {canViewFinancial ? (
                      <span className="font-bold text-brand-yellow-text">
                        {formatCurrency(a.valor)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-[11px]">••••••</span>
                    )}

                    <div className="flex items-center gap-1.5">
                      {a.status === "Aguardando" && (
                        <button
                          onClick={() => updateAgendamentoStatus(a.id, "Em atendimento")}
                          className="px-2.5 py-1 bg-brand-green text-surface-dark text-[11px] font-bold rounded"
                        >
                          Iniciar
                        </button>
                      )}
                      {a.status === "Em atendimento" && (
                        <Link
                          href={`/atendimentos/${a.id}`}
                          className="px-2.5 py-1 bg-brand-yellow text-surface-dark text-[11px] font-bold rounded"
                        >
                          Concluir
                        </Link>
                      )}
                      {a.status === "Concluído" && (
                        <Link
                          href={`/atendimentos/${a.id}`}
                          className="px-2.5 py-1 bg-sky-400 text-surface-dark text-[11px] font-bold rounded"
                        >
                          Conferir
                        </Link>
                      )}
                      {["Pronto", "Aguardando retirada"].includes(a.status) && (
                        <Link
                          href={`/atendimentos/${a.id}`}
                          className="px-2.5 py-1 bg-brand-green text-surface-dark text-[11px] font-bold rounded"
                        >
                          Entregar
                        </Link>
                      )}
                      <Link
                        href={`/atendimentos/${a.id}`}
                        className="text-brand-green-text hover:underline text-[11px] font-medium"
                      >
                        Detalhes
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Rodapé da tabela com link para a agenda */}
            <div className="p-3 bg-surface-elevated/40 border-t border-surface-border flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Exibindo {Math.min(8, filteredAppointments.length)} de {filteredAppointments.length} atendimentos
              </span>
              <Link
                href="/agenda"
                className="text-brand-green-text hover:underline font-semibold flex items-center gap-1"
              >
                <span>Ver agenda completa</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* 5. STATUS DO PERÍODO (Requisito 5) */}
      <section className="p-4 sm:p-5 rounded-xl bg-surface border border-surface-border space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Distribuição de Status do Período
          </h3>
          <span className="text-xs text-muted-foreground">
            Total: {metrics.totalAgendamentos}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          <div className="p-2.5 rounded-lg bg-surface-elevated border border-surface-border text-center">
            <span className="text-[10px] text-muted-foreground block">Agendados</span>
            <span className="text-lg font-bold text-sky-400">{metrics.agendados}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-surface-elevated border border-surface-border text-center">
            <span className="text-[10px] text-muted-foreground block">Confirmados</span>
            <span className="text-lg font-bold text-blue-400">{metrics.confirmados}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-surface-elevated border border-surface-border text-center">
            <span className="text-[10px] text-muted-foreground block">Aguardando</span>
            <span className="text-lg font-bold text-amber-400">{metrics.aguardando}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-surface-elevated border border-surface-border text-center">
            <span className="text-[10px] text-muted-foreground block">Em atendimento</span>
            <span className="text-lg font-bold text-brand-green-text">{metrics.emAtendimento}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-surface-elevated border border-surface-border text-center">
            <span className="text-[10px] text-muted-foreground block">Finalizados</span>
            <span className="text-lg font-bold text-emerald-400">{metrics.concluidos}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-surface-elevated border border-surface-border text-center">
            <span className="text-[10px] text-muted-foreground block">Cancelados</span>
            <span className="text-lg font-bold text-red-400">{metrics.cancelados}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-surface-elevated border border-surface-border text-center">
            <span className="text-[10px] text-muted-foreground block">Não compareceram</span>
            <span className="text-lg font-bold text-rose-400">{metrics.naoCompareceram}</span>
          </div>
        </div>
      </section>

      {/* 6. FINANCEIRO & RESULTADO DO CAIXA (Requisitos 6, 7 e 8) */}
      {canViewFinancial ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Financeiro & Caixa — {dateRange.label}
              </h3>
              {activeCashRegister ? (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-brand-green/20 text-brand-green-text border border-brand-green/30 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
                  Caixa Aberto
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-elevated text-muted-foreground border border-surface-border">
                  Caixa Fechado
                </span>
              )}
            </div>
            <Link
              href="/financeiro"
              className="text-xs text-brand-green-text hover:underline flex items-center gap-1 font-medium"
            >
              <span>Ver financeiro completo</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Entradas / Recebimentos */}
            <div className="p-4 rounded-xl bg-surface border border-brand-green/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-brand-green-text font-semibold">
                  Entradas (Recebido)
                </span>
                <div className="w-7 h-7 rounded-lg bg-brand-green/10 flex items-center justify-center text-brand-green">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-brand-green-text">
                {formatCurrency(metrics.recebidoTotal)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {metrics.totalPagamentosQtd} pagamentos quitados
              </p>
            </div>

            {/* Saídas do Caixa */}
            <div className="p-4 rounded-xl bg-surface border border-rose-500/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-rose-400 font-semibold">
                  Saídas do Caixa
                </span>
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
                  <TrendingUp className="w-4 h-4 rotate-180" />
                </div>
              </div>
              <div className="text-2xl font-bold text-rose-400">
                {formatCurrency(metrics.saidasCaixaTotal)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Despesas e sangrias operacionais
              </p>
            </div>

            {/* Resultado do Caixa (Entradas - Saídas) - NUNCA CHAMAR DE LUCRO (Requisito 7) */}
            <div className="p-4 rounded-xl bg-surface border border-surface-border">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-white font-semibold">
                  Resultado do caixa
                </span>
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div
                className={`text-2xl font-bold ${
                  metrics.resultadoCaixa >= 0 ? "text-white" : "text-rose-400"
                }`}
              >
                {formatCurrency(metrics.resultadoCaixa)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Entradas − Saídas (resultado do período)
              </p>
            </div>
          </div>

          {/* Formas de Pagamento (Requisito 8) */}
          <div className="p-4 rounded-xl bg-surface border border-surface-border space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Formas de Pagamento no Período
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(["pix", "dinheiro", "debito", "credito"] as const).map((metodo) => {
                const item = metrics.porMetodo[metodo];
                return (
                  <div
                    key={metodo}
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
                    <div className="w-full h-1.5 rounded-full bg-slate-800 mt-2 overflow-hidden">
                      <div
                        className="h-full bg-brand-green rounded-full"
                        style={{ width: `${Math.max(item.percentual, 3)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 block">
                      {Math.round(item.percentual)}% do recebimento
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : (
        /* Aviso de Acesso Restrito para Funcionários (Requisito 33) */
        <div className="p-4 rounded-xl bg-surface/50 border border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-xs font-semibold text-white">
                Métricas Financeiras Restritas
              </p>
              <p className="text-[11px] text-muted-foreground">
                Seu perfil operacional não possui acesso aos dados de faturamento e caixa.
              </p>
            </div>
          </div>
          <span className="text-xs text-amber-400 font-medium px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20">
            Apenas Gestores
          </span>
        </div>
      )}

      {/* 7. GRÁFICOS DE TENDÊNCIA DIÁRIA (Requisitos 28, 29 e 30) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Faturamento Diário (Apenas gestores) */}
        {canViewFinancial ? (
          <SimpleTrendChart
            data={metrics.tendenciaDiaria}
            metric="faturamento"
            title="Evolução do Faturamento por Dia"
            subtitle="Valores dos atendimentos válidos no período"
          />
        ) : (
          <div className="p-5 rounded-xl bg-surface border border-surface-border flex flex-col justify-center items-center text-center py-12">
            <ShieldAlert className="w-8 h-8 text-muted mb-2" />
            <p className="text-xs text-muted-foreground">
              Gráfico de faturamento restrito à gestão financeira.
            </p>
          </div>
        )}

        {/* Atendimentos Concluídos por Dia */}
        <SimpleTrendChart
          data={metrics.tendenciaDiaria}
          metric="atendimentos"
          title="Atendimentos Concluídos por Dia"
          subtitle="Veículos finalizados e entregues no período"
        />
      </section>

      {/* 8. SERVIÇOS MAIS REALIZADOS & TIPOS DE VEÍCULO (Requisitos 9 e 10) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Serviços Mais Realizados (Métrica de utilização, não rotular como melhores) */}
        <div className="p-4 sm:p-5 rounded-xl bg-surface border border-surface-border space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-yellow" />
                <span>Serviços Mais Realizados</span>
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Ordenados por quantidade de atendimentos realizados
              </p>
            </div>
            <Link
              href="/servicos"
              className="text-xs text-brand-green-text hover:underline flex items-center gap-1"
            >
              <span>Catálogo</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {metrics.servicosRealizados.slice(0, 5).map((srv, idx) => (
              <div
                key={srv.id}
                className="p-3 rounded-lg bg-surface-elevated/50 border border-surface-border flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[10px]">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="font-semibold text-white block">{srv.nome}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {srv.tipoVeiculo}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bold text-white block">
                    {srv.quantidade} atendimentos
                  </span>
                  {canViewFinancial && (
                    <span className="text-[11px] text-brand-yellow-text">
                      {formatCurrency(srv.faturamento)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tipo de Veículo (Requisito 10) */}
        <div className="p-4 sm:p-5 rounded-xl bg-surface border border-surface-border space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-sky-400" />
                <span>Atendimentos por Tipo de Veículo</span>
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Demanda por categoria de frota no período
              </p>
            </div>
            <Link
              href="/veiculos"
              className="text-xs text-brand-green-text hover:underline flex items-center gap-1"
            >
              <span>Frota</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3 pt-1">
            {metrics.veiculosPorTipo.map((vt) => (
              <div key={vt.tipo} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">{vt.tipo}</span>
                  <span className="text-muted-foreground">
                    <strong className="text-white">{vt.quantidade}</strong> atendimentos ({Math.round(vt.percentual)}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-elevated overflow-hidden">
                  <div
                    className="h-full bg-brand-green rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(vt.percentual, 3)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. CLIENTES, OCUPAÇÃO & CANCELAMENTOS (Requisitos 11, 12, 13 e 14) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Base de Clientes no Período (Requisito 11 e 12 + Etapa 12) */}
        <div className="p-4 sm:p-5 rounded-xl bg-surface border border-surface-border space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-brand-green" />
              <span>Inteligência de Clientes</span>
            </h3>
            <Link
              href="/relatorios"
              className="text-xs text-brand-green-text hover:underline flex items-center gap-1"
            >
              <span>Retenção</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-2 rounded-lg bg-surface-elevated border border-surface-border">
              <span className="text-[10px] text-muted-foreground block">Novos</span>
              <span className="text-base font-bold text-brand-green-text">
                {metrics.novosClientes}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-surface-elevated border border-surface-border">
              <span className="text-[10px] text-muted-foreground block" title="Cliente com ≥ 2 atendimentos concluídos no período">
                Recorrentes
              </span>
              <span className="text-base font-bold text-brand-yellow-text">
                {metrics.clientesRecorrentes}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-surface-elevated border border-surface-border">
              <span className="text-[10px] text-muted-foreground block" title="Sem retorno há mais de 60 dias">
                Inativos
              </span>
              <span className="text-base font-bold text-amber-400">
                {inactiveCount}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-surface-elevated border border-surface-border">
              <span className="text-[10px] text-muted-foreground block">Avaliação</span>
              <span className="text-base font-bold text-brand-yellow flex items-center justify-center gap-0.5">
                <span>{reviewsStats.average.toFixed(1)}</span>
                <Star className="w-3 h-3 fill-brand-yellow" />
              </span>
            </div>
          </div>

          {/* Lista de novos clientes no período (Requisito 12) */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-semibold text-slate-400 block">
              Novos clientes recentes:
            </span>
            {recentNewClients.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                Nenhum novo cliente cadastrado no período.
              </p>
            ) : (
              recentNewClients.map((c) => (
                <div
                  key={c.id}
                  className="p-2 rounded bg-surface-elevated/40 border border-surface-border flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-medium text-white block">{c.nome}</span>
                    <span className="text-[10px] text-muted-foreground">
                      Cadastrado em {formatDateBr(c.created_at.substring(0, 10))}
                    </span>
                  </div>
                  <Link
                    href={`/clientes/${c.id}`}
                    className="text-brand-green-text hover:underline text-[11px] font-medium"
                  >
                    Ver cliente
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Ocupação da Agenda (Requisito 13) */}
        <div className="p-4 sm:p-5 rounded-xl bg-surface border border-surface-border space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Ocupação da Agenda</span>
            </h3>
            <span className="text-xs font-bold text-white">
              {metrics.taxaOcupacao}%
            </span>
          </div>

          <div className="w-full h-3 rounded-full bg-surface-elevated overflow-hidden flex">
            <div
              className="bg-brand-green transition-all"
              style={{ width: `${metrics.taxaOcupacao}%` }}
              title={`Ocupados: ${metrics.horariosOcupados}`}
            />
            <div
              className="bg-slate-700 transition-all"
              style={{
                width: `${
                  metrics.horariosBloqueados > 0
                    ? Math.min(30, metrics.horariosBloqueados * 2)
                    : 0
                }%`,
              }}
              title={`Bloqueados: ${metrics.horariosBloqueados}`}
            />
          </div>

          <div className="space-y-2 text-xs pt-1">
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-green" />
                <span>Horários ocupados</span>
              </span>
              <span className="font-bold text-white">{metrics.horariosOcupados}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-surface-elevated border border-slate-600" />
                <span>Horários disponíveis</span>
              </span>
              <span className="font-bold text-white">{metrics.horariosDisponiveis}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                <span>Horários bloqueados</span>
              </span>
              <span className="font-bold text-white">{metrics.horariosBloqueados}</span>
            </div>
          </div>
        </div>

        {/* Cancelamentos e Não Comparecimentos (Requisito 14) */}
        <div className="p-4 sm:p-5 rounded-xl bg-surface border border-surface-border space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Cancelamentos & Faltas</span>
            </h3>
            <span className="text-[11px] text-muted-foreground">No período</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-3 rounded-lg bg-surface-elevated border border-surface-border">
              <div className="flex items-center justify-center gap-1 text-red-400 text-xs mb-1">
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancelamentos</span>
              </div>
              <span className="text-xl font-bold text-white">{metrics.cancelados}</span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">
                {metrics.totalAgendamentos > 0
                  ? `${metrics.taxaCancelamento.toFixed(1)}% dos agendamentos`
                  : "0%"}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-surface-elevated border border-surface-border">
              <div className="flex items-center justify-center gap-1 text-rose-400 text-xs mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Não compareceu</span>
              </div>
              <span className="text-xl font-bold text-white">{metrics.naoCompareceram}</span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">
                {metrics.totalAgendamentos > 0
                  ? `${metrics.taxaNoShow.toFixed(1)}% dos agendamentos`
                  : "0%"}
              </span>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            Indicadores apurados a partir dos agendamentos do período.
          </p>
        </div>
      </section>

      {/* MODAIS GLOBAIS DE AÇÃO RÁPIDA */}
      <NovoAgendamentoModal
        isOpen={isNovoAgendamentoOpen}
        onClose={() => setIsNovoAgendamentoOpen(false)}
      />
      <NovoClienteModal
        isOpen={isNovoClienteOpen}
        onClose={() => setIsNovoClienteOpen(false)}
      />
      <NovoAtendimentoModal
        isOpen={isNovoAtendimentoOpen}
        onClose={() => setIsNovoAtendimentoOpen(false)}
      />
    </div>
  );
}
