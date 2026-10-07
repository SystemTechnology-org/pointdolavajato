"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  DollarSign,
  TrendingUp,
  Clock,
  Wallet,
  QrCode,
  CreditCard,
  Banknote,
  Search,
  Filter,
  History,
  RotateCcw,
  CheckCircle2,
  Calendar,
} from "lucide-react";

import {
  Payment,
  PaymentMethod,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/types";

export default function FinanceiroPage() {
  const {
    payments,
    appointments,
    customers,
    services,
    cancelPayment,
    activeCashRegister,
  } = useAppStore();

  const { success, error } = useToast();

  const [periodo, setPeriodo] = useState<"hoje" | "7dias" | "mes" | "todos">("hoje");
  const [metodoFiltro, setMetodoFiltro] = useState<string>("todos");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Determinar limites de data para o período selecionado
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const sevenDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Filtrar agendamentos para o Faturamento Previsto do período
  const periodAppointments = useMemo(() => {
    return appointments.filter((a) => {
      if (periodo === "hoje") return a.scheduled_date === todayStr;
      if (periodo === "7dias") return a.scheduled_date >= sevenDaysAgoStr && a.scheduled_date <= todayStr;
      if (periodo === "mes") return a.scheduled_date.startsWith(monthPrefix);
      return true;
    });
  }, [appointments, periodo, todayStr, sevenDaysAgoStr, monthPrefix]);

  // Filtrar pagamentos para o período
  const periodPayments = useMemo(() => {
    return payments.filter((p) => {
      const pDate = p.paid_at.split("T")[0];
      if (periodo === "hoje") return pDate === todayStr;
      if (periodo === "7dias") return pDate >= sevenDaysAgoStr && pDate <= todayStr;
      if (periodo === "mes") return pDate.startsWith(monthPrefix);
      return true;
    });
  }, [payments, periodo, todayStr, sevenDaysAgoStr, monthPrefix]);

  // Cálculos financeiros do período
  const faturamentoPrevisto = useMemo(() => {
    return periodAppointments
      .filter((a) => !["cancelled", "no_show"].includes(a.status))
      .reduce((acc, a) => acc + (Number(a.price) || 0), 0);
  }, [periodAppointments]);

  const valorRecebido = useMemo(() => {
    return periodPayments
      .filter((p) => p.status === "paid")
      .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  }, [periodPayments]);

  const valorPendente = useMemo(() => {
    return Math.max(0, faturamentoPrevisto - valorRecebido);
  }, [faturamentoPrevisto, valorRecebido]);

  const totalTransacoes = useMemo(() => {
    return periodPayments.filter((p) => p.status === "paid").length;
  }, [periodPayments]);

  // Breakdown por forma de pagamento
  const breakdownPorMetodo = useMemo(() => {
    const paidOnly = periodPayments.filter((p) => p.status === "paid");
    const counts: Record<PaymentMethod, { amount: number; count: number }> = {
      pix: { amount: 0, count: 0 },
      dinheiro: { amount: 0, count: 0 },
      debito: { amount: 0, count: 0 },
      credito: { amount: 0, count: 0 },
    };

    paidOnly.forEach((p) => {
      if (counts[p.payment_method]) {
        counts[p.payment_method].amount += Number(p.amount) || 0;
        counts[p.payment_method].count += 1;
      }
    });

    return counts;
  }, [periodPayments]);

  // Serviços com maior receita no período
  const topServicos = useMemo(() => {
    const serviceMap = new Map<string, { nome: string; count: number; total: number }>();

    periodAppointments
      .filter((a) => !["cancelled", "no_show"].includes(a.status))
      .forEach((a) => {
        const srv = services.find((s) => s.id === a.service_id);
        const name = srv ? srv.name : "Serviço Geral";
        const cur = serviceMap.get(name) || { nome: name, count: 0, total: 0 };
        cur.count += 1;
        cur.total += Number(a.price) || 0;
        serviceMap.set(name, cur);
      });

    return Array.from(serviceMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [periodAppointments, services]);

  // Pagamentos filtrados para listagem/tabela
  const filteredPayments = useMemo(() => {
    return periodPayments.filter((p) => {
      if (metodoFiltro !== "todos" && p.payment_method !== metodoFiltro) return false;
      if (statusFiltro !== "todos" && p.status !== statusFiltro) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const app = appointments.find((a) => a.id === p.appointment_id);
        const cust = app ? customers.find((c) => c.id === app.customer_id) : null;
        const srv = app ? services.find((s) => s.id === app.service_id) : null;

        const custName = (cust?.full_name || "").toLowerCase();
        const srvName = (srv?.name || "").toLowerCase();
        const notes = (p.notes || "").toLowerCase();
        const idCode = p.id.toLowerCase();

        return (
          custName.includes(term) ||
          srvName.includes(term) ||
          notes.includes(term) ||
          idCode.includes(term)
        );
      }

      return true;
    });
  }, [periodPayments, metodoFiltro, statusFiltro, searchTerm, appointments, customers, services]);

  // Estornar pagamento com confirmação
  const handleEstornar = async (payment: Payment) => {
    const motivo = window.prompt(
      `Confirma o cancelamento/estorno de ${formatCurrency(payment.amount)}?\nInforme o motivo:`
    );
    if (motivo === null) return;

    try {
      setCancellingId(payment.id);
      await cancelPayment(payment.id, motivo.trim() || "Estorno financeiro");
      success("Pagamento cancelado e estornado com sucesso!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao estornar pagamento.";
      error(msg);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOPO: TÍTULO, SUBTEXTO E ATALHOS DE CAIXA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-surface-border/60">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Financeiro
            {activeCashRegister && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-brand-green/20 text-brand-green-text border border-brand-green/30 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse"></span>
                Caixa Aberto
              </span>
            )}
          </h2>
          <p className="text-xs text-muted-foreground">
            Acompanhe os recebimentos e o movimento do caixa.
          </p>
        </div>

        {/* Atalhos Rápidos */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/caixa">
            <Button
              size="sm"
              variant="primary"
              className="bg-brand-green hover:bg-emerald-600 text-black font-bold h-9"
              leftIcon={<Wallet className="w-4 h-4" />}
            >
              Caixa Diário
            </Button>
          </Link>

          <Link href="/caixa/historico">
            <Button
              size="sm"
              variant="outline"
              className="h-9 border-surface-border text-slate-300 hover:text-white"
              leftIcon={<History className="w-4 h-4" />}
            >
              Histórico de Caixas
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. FILTRO DE PERÍODO */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-surface p-2 rounded-xl border border-surface-border">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-2">
          <Calendar className="w-4 h-4 text-brand-green" />
          <span className="font-medium text-slate-300">Período de análise:</span>
        </div>

        <div className="flex items-center gap-1">
          {(
            [
              { key: "hoje", label: "Hoje" },
              { key: "7dias", label: "Últimos 7 dias" },
              { key: "mes", label: "Este mês" },
              { key: "todos", label: "Todo o histórico" },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              onClick={() => setPeriodo(item.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                periodo === item.key
                  ? "bg-brand-green text-black shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-surface-elevated"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. CARDS DE RESUMO FINANCEIRO (Requisito 3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Faturamento Previsto */}
        <div className="p-4 rounded-xl bg-surface border border-surface-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Faturamento Previsto</span>
            <div className="w-8 h-8 rounded-lg bg-brand-yellow/10 flex items-center justify-center text-brand-yellow">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-brand-yellow-text">
            {formatCurrency(faturamentoPrevisto)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {periodAppointments.length} agendamentos no período
          </p>
        </div>

        {/* Card 2: Valor Recebido */}
        <div className="p-4 rounded-xl bg-surface border border-brand-green/30 space-y-1">
          <div className="flex items-center justify-between text-brand-green-text">
            <span className="text-xs font-semibold">Valor Recebido</span>
            <div className="w-8 h-8 rounded-lg bg-brand-green/10 flex items-center justify-center text-brand-green">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-brand-green-text">
            {formatCurrency(valorRecebido)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {faturamentoPrevisto > 0
              ? `${((valorRecebido / faturamentoPrevisto) * 100).toFixed(0)}% do previsto arrecadado`
              : "Sem previsões registradas"}
          </p>
        </div>

        {/* Card 3: Valor Pendente */}
        <div className="p-4 rounded-xl bg-surface border border-surface-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Valor Pendente</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {formatCurrency(valorPendente)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            A receber de clientes em atendimento
          </p>
        </div>

        {/* Card 4: Total de Transações */}
        <div className="p-4 rounded-xl bg-surface border border-surface-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total de Transações</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {totalTransacoes}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {totalTransacoes > 0
              ? `Ticket médio de ${formatCurrency(valorRecebido / totalTransacoes)}`
              : "Nenhum recebimento"}
          </p>
        </div>
      </div>

      {/* 4. BREAKDOWN POR FORMA DE PAGAMENTO E RANKING DE SERVIÇOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Breakdown de Pagamentos */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-surface border border-surface-border space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-surface-border/60">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Wallet className="w-4 h-4 text-brand-green" />
              <span>Recebimento por Forma de Pagamento</span>
            </h3>
            <span className="text-xs font-bold text-brand-green-text">
              Total: {formatCurrency(valorRecebido)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* PIX */}
            <div className="p-3 rounded-lg bg-surface-elevated/40 border border-surface-border space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                <span>PIX</span>
              </div>
              <div className="text-base font-bold text-white">
                {formatCurrency(breakdownPorMetodo.pix.amount)}
              </div>
              <div className="text-[10px] text-muted-foreground flex justify-between">
                <span>{breakdownPorMetodo.pix.count} pagtos</span>
                <span>
                  {valorRecebido > 0
                    ? `${((breakdownPorMetodo.pix.amount / valorRecebido) * 100).toFixed(0)}%`
                    : "0%"}
                </span>
              </div>
            </div>

            {/* Dinheiro */}
            <div className="p-3 rounded-lg bg-surface-elevated/40 border border-surface-border space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                <span>Dinheiro</span>
              </div>
              <div className="text-base font-bold text-white">
                {formatCurrency(breakdownPorMetodo.dinheiro.amount)}
              </div>
              <div className="text-[10px] text-muted-foreground flex justify-between">
                <span>{breakdownPorMetodo.dinheiro.count} pagtos</span>
                <span>
                  {valorRecebido > 0
                    ? `${((breakdownPorMetodo.dinheiro.amount / valorRecebido) * 100).toFixed(0)}%`
                    : "0%"}
                </span>
              </div>
            </div>

            {/* Cartão de Débito */}
            <div className="p-3 rounded-lg bg-surface-elevated/40 border border-surface-border space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CreditCard className="w-3.5 h-3.5 text-sky-400" />
                <span>Débito</span>
              </div>
              <div className="text-base font-bold text-white">
                {formatCurrency(breakdownPorMetodo.debito.amount)}
              </div>
              <div className="text-[10px] text-muted-foreground flex justify-between">
                <span>{breakdownPorMetodo.debito.count} pagtos</span>
                <span>
                  {valorRecebido > 0
                    ? `${((breakdownPorMetodo.debito.amount / valorRecebido) * 100).toFixed(0)}%`
                    : "0%"}
                </span>
              </div>
            </div>

            {/* Cartão de Crédito */}
            <div className="p-3 rounded-lg bg-surface-elevated/40 border border-surface-border space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                <span>Crédito</span>
              </div>
              <div className="text-base font-bold text-white">
                {formatCurrency(breakdownPorMetodo.credito.amount)}
              </div>
              <div className="text-[10px] text-muted-foreground flex justify-between">
                <span>{breakdownPorMetodo.credito.count} pagtos</span>
                <span>
                  {valorRecebido > 0
                    ? `${((breakdownPorMetodo.credito.amount / valorRecebido) * 100).toFixed(0)}%`
                    : "0%"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Ranking de Serviços por Faturamento */}
        <div className="p-5 rounded-xl bg-surface border border-surface-border space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center justify-between pb-2 border-b border-surface-border/60">
            <span>Serviços Mais Rentáveis</span>
            <span className="text-[11px] text-muted-foreground font-normal">Top faturamento</span>
          </h3>

          {topServicos.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center">
              Sem dados de serviços no período.
            </p>
          ) : (
            <div className="space-y-2.5">
              {topServicos.map((srv, idx) => (
                <div
                  key={srv.nome}
                  className="flex items-center justify-between text-xs p-2 rounded-lg bg-surface-elevated/30 border border-surface-border/50"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="w-5 h-5 rounded-full bg-surface-elevated text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-slate-200 font-medium truncate" title={srv.nome}>
                      {srv.nome}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-brand-green-text block">
                      {formatCurrency(srv.total)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {srv.count} {srv.count === 1 ? "lavagem" : "lavagens"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. TABELA DE TRANSAÇÕES E PAGAMENTOS (DESKTOP E MOBILE) */}
      <div className="p-5 rounded-xl bg-surface border border-surface-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-border/60">
          <div>
            <h3 className="text-sm font-bold text-white">
              Transações e Pagamentos Registrados
            </h3>
            <p className="text-xs text-muted-foreground">
              Histórico detalhado de recebimentos e estornos
            </p>
          </div>

          {/* Filtros da Tabela */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Busca */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar cliente, serviço..."
                className="pl-8 pr-3 py-1.5 bg-surface-elevated border border-surface-border rounded-lg text-xs text-white focus:outline-none focus:border-brand-green w-48 sm:w-56"
              />
            </div>

            {/* Filtro Método */}
            <div className="flex items-center gap-1 text-xs">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={metodoFiltro}
                onChange={(e) => setMetodoFiltro(e.target.value)}
                className="bg-surface-elevated border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-brand-green"
              >
                <option value="todos">Todos os métodos</option>
                <option value="pix">PIX</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="debito">Débito</option>
                <option value="credito">Crédito</option>
              </select>
            </div>

            {/* Filtro Status */}
            <select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value)}
              className="bg-surface-elevated border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-brand-green"
            >
              <option value="todos">Todos os status</option>
              <option value="paid">Recebido / Pago</option>
              <option value="cancelled">Estornado / Cancelado</option>
            </select>
          </div>
        </div>

        {/* Tabela Desktop */}
        {filteredPayments.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <DollarSign className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
            <p className="text-xs text-muted-foreground italic">
              Nenhuma transação encontrada para os filtros selecionados.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-elevated/50 text-muted-foreground uppercase text-[10px] font-semibold border-b border-surface-border">
                  <tr>
                    <th className="py-2.5 px-3">Data / Hora</th>
                    <th className="py-2.5 px-3">Cliente</th>
                    <th className="py-2.5 px-3">Serviço / Atendimento</th>
                    <th className="py-2.5 px-3">Forma de Pagamento</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Valor</th>
                    <th className="py-2.5 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/50">
                  {filteredPayments.map((p) => {
                    const app = appointments.find((a) => a.id === p.appointment_id);
                    const cust = app ? customers.find((c) => c.id === app.customer_id) : null;
                    const srv = app ? services.find((s) => s.id === app.service_id) : null;
                    const isCancelled = p.status === "cancelled";

                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-surface-hover/50 transition-colors ${
                          isCancelled ? "opacity-60 bg-red-500/5" : ""
                        }`}
                      >
                        {/* Data / Hora */}
                        <td className="py-3 px-3 font-mono text-slate-300">
                          {new Date(p.paid_at).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>

                        {/* Cliente */}
                        <td className="py-3 px-3">
                          <span className="font-semibold text-white block">
                            {cust ? cust.full_name : "Cliente"}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {cust ? cust.phone : "Sem telefone"}
                          </span>
                        </td>

                        {/* Serviço / Atendimento */}
                        <td className="py-3 px-3">
                          <span className="text-slate-200 block truncate max-w-xs">
                            {srv ? srv.name : "Atendimento"}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            #{app?.code || p.appointment_id.slice(-6).toUpperCase()}
                            {p.notes && ` • ${p.notes}`}
                          </span>
                        </td>

                        {/* Forma de Pagamento */}
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-elevated text-slate-200 border border-surface-border text-[11px] font-medium">
                            {p.payment_method === "pix" && <QrCode className="w-3 h-3 text-emerald-400" />}
                            {p.payment_method === "dinheiro" && <Banknote className="w-3 h-3 text-emerald-400" />}
                            {["debito", "credito"].includes(p.payment_method) && <CreditCard className="w-3 h-3 text-sky-400" />}
                            <span>{PAYMENT_METHOD_LABELS[p.payment_method]}</span>
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.status === "paid"
                                ? "bg-brand-green/20 text-brand-green-text border border-brand-green/30"
                                : "bg-red-500/20 text-red-300 border border-red-500/30"
                            }`}
                          >
                            {PAYMENT_STATUS_LABELS[p.status]}
                          </span>
                        </td>

                        {/* Valor */}
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`font-bold font-mono text-sm ${
                              isCancelled ? "text-slate-400 line-through" : "text-brand-green-text"
                            }`}
                          >
                            +{formatCurrency(p.amount)}
                          </span>
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-3 text-right">
                          {!isCancelled ? (
                            <button
                              type="button"
                              onClick={() => handleEstornar(p)}
                              disabled={cancellingId === p.id}
                              className="text-[11px] text-red-400 hover:text-red-300 hover:underline inline-flex items-center gap-1"
                              title="Estornar / Cancelar este pagamento"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Estornar</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">
                              Estornado
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Cards Mobile */}
            <div className="md:hidden space-y-2.5">
              {filteredPayments.map((p) => {
                const app = appointments.find((a) => a.id === p.appointment_id);
                const cust = app ? customers.find((c) => c.id === app.customer_id) : null;
                const srv = app ? services.find((s) => s.id === app.service_id) : null;
                const isCancelled = p.status === "cancelled";

                return (
                  <div
                    key={p.id}
                    className={`p-3.5 rounded-xl border text-xs space-y-2.5 ${
                      isCancelled ? "bg-red-500/5 border-red-500/20 opacity-70" : "bg-surface-elevated/40 border-surface-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">
                        {cust ? cust.full_name : "Cliente"}
                      </span>
                      <span
                        className={`font-mono font-bold text-sm ${
                          isCancelled ? "text-slate-400 line-through" : "text-brand-green-text"
                        }`}
                      >
                        +{formatCurrency(p.amount)}
                      </span>
                    </div>

                    <div className="text-muted-foreground flex items-center justify-between text-[11px]">
                      <span className="truncate max-w-[200px]">{srv?.name || "Atendimento"}</span>
                      <span className="font-mono">
                        {new Date(p.paid_at).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-surface-border/50 text-[11px]">
                      <span className="inline-flex items-center gap-1 text-slate-300">
                        {PAYMENT_METHOD_LABELS[p.payment_method]}
                        {isCancelled && <span className="text-red-400 font-bold">(Estornado)</span>}
                      </span>

                      {!isCancelled && (
                        <button
                          type="button"
                          onClick={() => handleEstornar(p)}
                          disabled={cancellingId === p.id}
                          className="text-red-400 hover:underline flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Estornar</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
