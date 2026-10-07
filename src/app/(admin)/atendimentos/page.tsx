"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Play,
  CheckCircle2,
  Clock,
  Car,
  Ban,
  AlertTriangle,
  Eye,
  Plus,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  ShieldCheck,
  Camera,
  Sparkles,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { NovoAtendimentoModal } from "@/components/modals/NovoAtendimentoModal";
import { DetalhesAtendimentoModal } from "@/components/modals/DetalhesAtendimentoModal";
import { CancelarAtendimentoModal } from "@/components/modals/CancelarAtendimentoModal";
import { RegistrarPagamentoModal } from "@/components/modals/RegistrarPagamentoModal";
import { FichaCheckinModal } from "@/components/modals/FichaCheckinModal";
import { ConcluirServicoModal } from "@/components/checkout/ConcluirServicoModal";
import { ConferenciaFinalModal } from "@/components/checkout/ConferenciaFinalModal";
import { EntregaVeiculoModal } from "@/components/checkout/EntregaVeiculoModal";
import { ComprovanteEntregaModal } from "@/components/checkout/ComprovanteEntregaModal";
import { SecaoAguardandoRetirada } from "@/components/checkout/SecaoAguardandoRetirada";
import { useAppStore } from "@/lib/store";
import { formatCurrency, formatDateBR } from "@/lib/utils";
import { getTodayDateString } from "@/lib/initialData";
import { useToast } from "@/components/ui/Toast";
import { Agendamento, StatusAgendamento, VehicleCheckin } from "@/types";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";

export default function AtendimentosPage() {
  const router = useRouter();
  const {
    agendamentos,
    updateAgendamentoStatus,
    getAppointmentPaymentSummary,
    getCheckinByAppointmentId,
  } = useAppStore();
  const { success, error } = useToast();

  const todayStr = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  // Modais operacionais
  const [isNovoAtendimentoOpen, setIsNovoAtendimentoOpen] = useState(false);
  const [viewingAgendamento, setViewingAgendamento] = useState<Agendamento | null>(null);
  const [cancellingAgendamento, setCancellingAgendamento] = useState<Agendamento | null>(null);
  const [payingAgendamento, setPayingAgendamento] = useState<Agendamento | null>(null);
  const [viewingCheckin, setViewingCheckin] = useState<{
    checkin: VehicleCheckin;
    agendamento: Agendamento;
  } | null>(null);

  // Modais Etapa 11 (Pós-serviço e Entrega)
  const [concluindoAgendamento, setConcluindoAgendamento] = useState<Agendamento | null>(null);
  const [conferindoAgendamento, setConferindoAgendamento] = useState<Agendamento | null>(null);
  const [entregandoAgendamento, setEntregandoAgendamento] = useState<Agendamento | null>(null);
  const [comprovanteAgendamento, setComprovanteAgendamento] = useState<Agendamento | null>(null);


  // Lista do dia selecionado
  const dateAppointments = useMemo(() => {
    return agendamentos
      .filter((a) => a.data === selectedDate)
      .sort((a, b) => a.horario.localeCompare(b.horario));
  }, [agendamentos, selectedDate]);

  // Lista filtrada
  const filteredList = useMemo(() => {
    if (statusFilter === "todos") return dateAppointments;
    if (statusFilter === "Pronto") {
      return dateAppointments.filter(
        (a) => a.status === "Pronto" || a.status === "Aguardando retirada" || a.status === "Aguardando pagamento"
      );
    }
    if (statusFilter === "Entregue") {
      return dateAppointments.filter(
        (a) => a.status === "Entregue" || a.status === "Finalizado"
      );
    }
    return dateAppointments.filter((a) => a.status === statusFilter);
  }, [dateAppointments, statusFilter]);

  // Contagens do dia selecionado
  const dateMetrics = useMemo(() => {
    const lavagemConcluida = dateAppointments.filter((a) => a.status === "Concluído").length;
    const prontos = dateAppointments.filter((a) => a.status === "Pronto").length;
    const aguardandoPagamento = dateAppointments.filter((a) => a.status === "Aguardando pagamento").length;
    const aguardandoRetirada = dateAppointments.filter(
      (a) => a.status === "Aguardando retirada" || a.status === "Pronto" || a.status === "Aguardando pagamento"
    ).length;
    const entreguesHoje = dateAppointments.filter(
      (a) => a.status === "Entregue" || a.status === "Finalizado"
    ).length;

    return {
      aguardando: dateAppointments.filter((a) => a.status === "Aguardando").length,
      emAtendimento: dateAppointments.filter((a) => a.status === "Em atendimento").length,
      lavagemConcluida,
      prontos,
      aguardandoPagamento,
      aguardandoRetirada,
      entreguesHoje,
      finalizados: entreguesHoje,
      naoCompareceram: dateAppointments.filter((a) => a.status === "Não compareceu").length,
      cancelados: dateAppointments.filter((a) => a.status === "Cancelado").length,
      total: dateAppointments.length,
    };
  }, [dateAppointments]);

  // Ações de alteração de status com máquina de estados
  const handleAlterarStatus = (
    id: string,
    novoStatus: StatusAgendamento,
    options?: { cancellationReason?: string; notes?: string }
  ) => {
    try {
      updateAgendamentoStatus(id, novoStatus, options);
      if (novoStatus === "Em atendimento") {
        success("Atendimento iniciado! Veículo alocado no box de serviço.");
      } else if (novoStatus === "Concluído" || novoStatus === "Finalizado") {
        success("Lavagem concluída! Veículo pronto para conferência final.");
      } else if (novoStatus === "Pronto") {
        success("Veículo marcado como pronto para retirada.");
      } else if (novoStatus === "Entregue") {
        success("Veículo entregue ao cliente!");
      } else if (novoStatus === "Aguardando") {
        success("Cliente marcado como aguardando no pátio.");
      } else if (novoStatus === "Confirmado") {
        success("Agendamento confirmado.");
      } else if (novoStatus === "Não compareceu") {
        success("Marcado como 'Não compareceu'.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transição de status inválida.";
      error(msg);
      if (msg.includes("Check-in")) {
        router.push(`/atendimentos/${id}/checkin`);
      }
    }
  };

  const handleConfirmarCancelamento = (id: string, motivo: string) => {
    try {
      updateAgendamentoStatus(id, "Cancelado", { cancellationReason: motivo });
      success("Atendimento cancelado e registrado no histórico.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao cancelar atendimento.";
      error(msg);
    }
  };

  // Funções de data
  const handleShiftDate = (days: number) => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    setSelectedDate(`${y}-${m}-${day}`);
  };

  const isToday = selectedDate === todayStr;

  return (
    <div className="space-y-6">
      {/* 1. TOPO: TÍTULO, SUBTEXTO E NOVO ATENDIMENTO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-border/60">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Fluxo de Atendimento & Pátio
            {dateMetrics.emAtendimento > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full bg-brand-green/20 text-brand-green-text border border-brand-green/30 animate-pulse font-normal">
                <span className="w-2 h-2 rounded-full bg-brand-green"></span>
                {dateMetrics.emAtendimento} {dateMetrics.emAtendimento === 1 ? "box ativo" : "boxes ativos"}
              </span>
            )}
          </h2>
          <p className="text-xs text-muted-foreground">
            Acompanhamento operacional em tempo real dos veículos na esteira de lavagem.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Navegação de Data */}
          <div className="flex items-center gap-1 bg-surface border border-surface-border rounded-lg p-1">
            <button
              onClick={() => handleShiftDate(-1)}
              className="p-1 rounded text-muted-foreground hover:text-white"
              title="Dia anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold px-2 text-slate-200">
              {isToday ? "Hoje" : formatDateBR(selectedDate)}
            </span>
            <button
              onClick={() => handleShiftDate(1)}
              className="p-1 rounded text-muted-foreground hover:text-white"
              title="Próximo dia"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {!isToday && (
              <button
                onClick={() => setSelectedDate(todayStr)}
                className="text-[10px] px-2 py-0.5 rounded bg-brand-green/20 text-brand-green-text hover:bg-brand-green/30 ml-1"
              >
                Hoje
              </button>
            )}
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsNovoAtendimentoOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Iniciar atendimento
          </Button>
        </div>
      </div>

      {/* 2. CARDS DE STATUS OPERACIONAIS (ETAPA 11 - Contadores rápidos no topo) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* 1. EM ATENDIMENTO / EM SERVIÇO */}
        <div
          onClick={() => setStatusFilter("Em atendimento")}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === "Em atendimento"
              ? "bg-brand-green/20 border-brand-green ring-1 ring-brand-green"
              : "bg-surface border-brand-green/30 hover:border-brand-green/60"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-brand-green-text">
              Em serviço
            </span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-green"></span>
            </span>
          </div>
          <div className="text-xl font-bold text-white">
            {dateMetrics.emAtendimento}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Boxes em lavagem
          </p>
        </div>

        {/* 2. LAVAGEM CONCLUÍDA */}
        <div
          onClick={() => setStatusFilter("Concluído")}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === "Concluído"
              ? "bg-teal-500/20 border-teal-500 ring-1 ring-teal-500"
              : "bg-surface border-surface-border hover:border-teal-500/40"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-teal-300">
              Lavagem Concluída
            </span>
            <div className="w-2 h-2 rounded-full bg-teal-400"></div>
          </div>
          <div className="text-xl font-bold text-teal-300">
            {dateMetrics.lavagemConcluida}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Aguardando vistoria
          </p>
        </div>

        {/* 3. PRONTOS */}
        <div
          onClick={() => setStatusFilter("Pronto")}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === "Pronto"
              ? "bg-emerald-500/20 border-emerald-500 ring-1 ring-emerald-500"
              : "bg-surface border-surface-border hover:border-emerald-500/40"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-emerald-300">
              Prontos
            </span>
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-300">
            {dateMetrics.prontos}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Inspecionados
          </p>
        </div>

        {/* 4. AGUARDANDO RETIRADA */}
        <div
          onClick={() => setStatusFilter("Pronto")}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === "Pronto"
              ? "bg-cyan-500/20 border-cyan-500 ring-1 ring-cyan-500"
              : "bg-surface border-cyan-500/30 hover:border-cyan-500/60"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-cyan-300">
              Aguardando Retirada
            </span>
            <Car className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-cyan-300">
            {dateMetrics.aguardandoRetirada}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Pátio / Entrega
          </p>
        </div>

        {/* 5. ENTREGUES HOJE */}
        <div
          onClick={() => setStatusFilter("Entregue")}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === "Entregue"
              ? "bg-green-500/20 border-green-500 ring-1 ring-green-500"
              : "bg-surface border-surface-border hover:border-green-500/40"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-muted-foreground">
              Entregues hoje
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
          </div>
          <div className="text-xl font-bold text-green-400">
            {dateMetrics.entreguesHoje}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Finalizados 100%
          </p>
        </div>

        {/* 6. TOTAL DO DIA */}
        <div
          onClick={() => setStatusFilter("todos")}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === "todos"
              ? "bg-surface-elevated border-slate-500 ring-1 ring-slate-500"
              : "bg-surface border-surface-border hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-muted-foreground">
              Total do Dia
            </span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-white">
            {dateMetrics.total}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Agendamentos
          </p>
        </div>
      </div>

      {/* SEÇÃO DESTACADA: VEÍCULOS AGUARDANDO RETIRADA (Requisito 5) */}
      <SecaoAguardandoRetirada
        agendamentos={dateAppointments}
        onOpenPagamento={(a) => setPayingAgendamento(a)}
      />

      {/* 3. FILTROS RÁPIDOS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { label: "Todos", value: "todos", count: dateMetrics.total },
          { label: "Em serviço", value: "Em atendimento", count: dateMetrics.emAtendimento },
          { label: "Lavagem Concluída", value: "Concluído", count: dateMetrics.lavagemConcluida },
          { label: "Prontos / Retirada", value: "Pronto", count: dateMetrics.aguardandoRetirada },
          { label: "Entregues", value: "Entregue", count: dateMetrics.entreguesHoje },
          { label: "Aguardando fila", value: "Aguardando", count: dateMetrics.aguardando },
          { label: "Cancelados", value: "Cancelado", count: dateMetrics.cancelados },
          { label: "Não compareceram", value: "Não compareceu", count: dateMetrics.naoCompareceram },
        ].map((item) => (
          <button
            key={item.value}
            onClick={() => setStatusFilter(item.value)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === item.value
                ? "bg-brand-green/20 text-brand-green-text border-brand-green font-medium"
                : "bg-surface text-muted-foreground border-surface-border hover:text-slate-200"
            }`}
          >
            <span>{item.label}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-elevated text-slate-400 font-mono">
              {item.count}
            </span>
          </button>
        ))}
      </div>

      {/* 4. LISTA DE ATENDIMENTOS (Ordenada por Horário, responsiva em cards rápidos) */}
      {filteredList.length === 0 ? (
        <EmptyState
          title="Nenhum atendimento neste filtro"
          description="Selecione outro filtro ou cadastre um atendimento imediato."
          icon={<Car className="w-6 h-6 text-muted" />}
        />
      ) : (
        <div className="space-y-3">
          {filteredList.map((item) => {
            const isEmAndamento = item.status === "Em atendimento";
            const isAguardando = item.status === "Aguardando";
            const isFinalizado = item.status === "Finalizado";
            const isCancelado = item.status === "Cancelado";
            const isNoShow = item.status === "Não compareceu";

            const paySummary = getAppointmentPaymentSummary(item.id);

            const itemTemplateVars = {
              cliente: item.cliente_nome,
              servico: item.servico_nome,
              veiculo: `${item.veiculo_modelo}${item.veiculo_placa && item.veiculo_placa !== "---" ? ` (${item.veiculo_placa})` : ""}`,
              data: formatDateBR(item.data),
              horario: item.horario,
              valor: item.valor,
              pago: paySummary.totalPaid,
              saldo: paySummary.remainingBalance,
              codigo: item.code || item.id,
            };

            const itemCheckin = getCheckinByAppointmentId(item.id);

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-all ${
                  isEmAndamento
                    ? "bg-surface border-brand-green ring-1 ring-brand-green/40 shadow-lg shadow-brand-green/5"
                    : isAguardando
                    ? "bg-surface border-amber-500/40"
                    : "bg-surface border-surface-border hover:border-slate-700"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Bloco 1: Horário, Cliente, Veículo e Serviço */}
                  <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                    {/* Horário */}
                    <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-surface-elevated border border-surface-border shrink-0">
                      <span className="text-sm font-bold text-white font-mono">
                        {item.horario}
                      </span>
                      <span className="text-[9px] text-muted-foreground uppercase font-bold">
                        Hora
                      </span>
                    </div>

                    {/* Informações centrais */}
                    <div className="space-y-1 min-w-0 flex-1">
                      {/* Linha 1: Cliente e Telefone */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={item.cliente_id ? `/clientes/${item.cliente_id}` : "#"}
                          className="font-bold text-sm text-white hover:text-brand-green transition-colors truncate"
                        >
                          {item.cliente_nome}
                        </Link>

                        <WhatsAppButton
                          phone={item.cliente_whatsapp}
                          templateType={
                            item.status === "Aguardando"
                              ? "appointmentWaiting"
                              : item.status === "Em atendimento"
                              ? "appointmentInProgress"
                              : item.status === "Finalizado"
                              ? (paySummary.remainingBalance > 0 ? "paymentPending" : "appointmentCompleted")
                              : "generalContact"
                          }
                          templateVars={itemTemplateVars}
                          customerId={item.cliente_id}
                          appointmentId={item.id}
                          label="WhatsApp"
                          size="xs"
                          variant="outline"
                        />

                        <span className="text-[10px] text-muted-foreground font-mono">
                          #{item.code || item.id.slice(-6).toUpperCase()}
                        </span>
                      </div>

                      {/* Linha 2: Veículo, Placa e Categoria */}
                      <div className="flex items-center gap-2 text-xs text-slate-300 flex-wrap">
                        <span className="font-semibold text-white">
                          {item.veiculo_modelo}
                        </span>

                        <span className="font-mono text-[11px] px-2 py-0.2 rounded bg-surface-elevated text-brand-yellow-text border border-surface-border">
                          {item.veiculo_placa && item.veiculo_placa !== "---" ? item.veiculo_placa : "Sem placa"}
                        </span>

                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-elevated text-muted-foreground">
                          {item.veiculo_tipo}
                        </span>
                      </div>

                      {/* Linha 3: Serviço, Valor e Status do Pagamento */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span className="font-medium text-slate-300">
                          {item.servico_nome}
                        </span>
                        <span>•</span>
                        <span className="font-bold text-brand-green-text">
                          {formatCurrency(item.valor)}
                        </span>
                        <span>•</span>
                        {paySummary.status === "paid" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-brand-green/20 text-brand-green-text border border-brand-green/30 font-semibold">
                            <CheckCircle2 className="w-3 h-3 text-brand-green" />
                            Pago
                          </span>
                        ) : paySummary.status === "partial" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                            Parcial ({formatCurrency(paySummary.totalPaid)} / {formatCurrency(item.valor)})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-surface-elevated text-amber-400 border border-surface-border font-medium">
                            Pagamento pendente
                          </span>
                        )}
                        {item.observacoes && (
                          <>
                            <span>•</span>
                            <span className="italic text-slate-400 truncate max-w-xs text-[11px]">
                              &quot;{item.observacoes}&quot;
                            </span>
                          </>
                        )}
                      </div>

                      {/* Linha 4: Indicador de Check-in e Avarias (Requisitos 15 e 16) */}
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        {itemCheckin ? (
                          <button
                            type="button"
                            onClick={() => setViewingCheckin({ checkin: itemCheckin, agendamento: item })}
                            className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-surface-elevated border border-surface-border hover:border-brand-green transition-all"
                            title="Clique para ver a ficha de vistoria completa"
                          >
                            <span className="text-brand-green font-semibold flex items-center gap-1">
                              ✓ Check-in
                            </span>
                            {itemCheckin.damages && itemCheckin.damages.length > 0 ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                                <AlertTriangle className="w-3 h-3 text-amber-400" />
                                {itemCheckin.damages.length} {itemCheckin.damages.length === 1 ? "avaria" : "avarias"}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">
                                (Sem avarias)
                              </span>
                            )}
                            {itemCheckin.photos && itemCheckin.photos.length > 0 && (
                              <span className="text-muted-foreground flex items-center gap-0.5 ml-0.5">
                                <Camera className="w-3 h-3" />
                                {itemCheckin.photos.length}
                              </span>
                            )}
                          </button>
                        ) : (
                          <Link
                            href={`/atendimentos/${item.id}/checkin`}
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-surface-elevated/40 border border-surface-border text-slate-400 hover:text-white hover:border-brand-yellow/60 transition-colors"
                          >
                            <ShieldCheck className="w-3 h-3 text-brand-yellow" />
                            <span>Sem check-in</span>
                            <span className="text-[10px] text-brand-yellow font-medium ml-1">Fazer check-in →</span>
                          </Link>
                        )}
                      </div>

                    </div>
                  </div>

                  {/* Bloco 2: Status e Ações Rápidas */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between lg:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-surface-border/60">
                    {/* Status Badge e Duração Real */}
                    <div className="flex flex-col sm:items-end">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={item.status} />
                      </div>

                      {isEmAndamento && item.started_at && (
                        <span className="text-[10px] text-brand-green-text mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3 animate-spin" />
                          Iniciado às {new Date(item.started_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}

                      {isFinalizado && item.duracao_real_minutos && (
                        <span className="text-[10px] text-emerald-400 mt-1">
                          Concluído em {item.duracao_real_minutos} min
                        </span>
                      )}

                      {isCancelado && item.cancellation_reason && (
                        <span className="text-[10px] text-red-400 mt-1 max-w-[180px] truncate" title={item.cancellation_reason}>
                          Motivo: {item.cancellation_reason}
                        </span>
                      )}
                    </div>

                    {/* Botões Operacionais Rápidos */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Se Agendado ou Confirmado */}
                      {["Agendado", "Confirmado"].includes(item.status) && (
                        <>
                          {!itemCheckin && (
                            <Link href={`/atendimentos/${item.id}/checkin`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs px-2.5 text-brand-yellow hover:text-white border-brand-yellow/40 hover:bg-brand-yellow/10"
                                leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
                              >
                                Check-in
                              </Button>
                            </Link>
                          )}

                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 text-xs px-2.5 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border-amber-500/30"
                            onClick={() => handleAlterarStatus(item.id, "Aguardando")}
                          >
                            Aguardando
                          </Button>

                          <Button
                            size="sm"
                            variant="primary"
                            className="h-8 text-xs px-3 bg-brand-green hover:bg-emerald-600 text-black font-semibold"
                            onClick={() => handleAlterarStatus(item.id, "Em atendimento")}
                            leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
                          >
                            Iniciar
                          </Button>
                        </>
                      )}

                      {/* Se Aguardando */}
                      {isAguardando && (
                        <>
                          {!itemCheckin && (
                            <Link href={`/atendimentos/${item.id}/checkin`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs px-2.5 text-brand-yellow hover:text-white border-brand-yellow/40 hover:bg-brand-yellow/10"
                                leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
                              >
                                Check-in
                              </Button>
                            </Link>
                          )}

                          <Button
                            size="sm"
                            variant="primary"
                            className="h-8 text-xs px-3.5 bg-brand-green hover:bg-emerald-600 text-black font-bold shadow-md shadow-brand-green/20"
                            onClick={() => handleAlterarStatus(item.id, "Em atendimento")}
                            leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
                          >
                            Iniciar atendimento
                          </Button>
                          <WhatsAppButton
                            phone={item.cliente_whatsapp}
                            templateType="appointmentWaiting"
                            templateVars={itemTemplateVars}
                            customerId={item.cliente_id}
                            appointmentId={item.id}
                            label="Avisar fila"
                            size="sm"
                            variant="secondary"
                            className="h-8"
                          />
                        </>
                      )}

                      {/* Se Em atendimento */}
                      {isEmAndamento && (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            className="h-8 text-xs px-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold"
                            onClick={() => setConcluindoAgendamento(item)}
                            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                          >
                            Concluir Lavagem
                          </Button>
                          <WhatsAppButton
                            phone={item.cliente_whatsapp}
                            templateType="appointmentInProgress"
                            templateVars={itemTemplateVars}
                            customerId={item.cliente_id}
                            appointmentId={item.id}
                            label="Avisar andamento"
                            size="sm"
                            variant="secondary"
                            className="h-8"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs px-2 text-slate-300 hover:text-white border-surface-border"
                            onClick={() => setPayingAgendamento(item)}
                            title="Registrar pagamento antecipado"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}

                      {/* Se Concluído (Lavagem concluída no box, aguardando conferência final) */}
                      {item.status === "Concluído" && (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            className="h-8 text-xs px-3 bg-brand-green hover:bg-emerald-600 text-black font-bold shadow-md shadow-brand-green/20"
                            onClick={() => setConferindoAgendamento(item)}
                            leftIcon={<Sparkles className="w-3.5 h-3.5 fill-current" />}
                          >
                            Conferência / Pronto
                          </Button>
                        </>
                      )}

                      {/* Se Pronto ou Aguardando Retirada */}
                      {(item.status === "Pronto" || item.status === "Aguardando retirada" || item.status === "Aguardando pagamento") && (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            className="h-8 text-xs px-3 bg-brand-green hover:bg-emerald-600 text-black font-bold shadow-md shadow-brand-green/20"
                            onClick={() => setEntregandoAgendamento(item)}
                            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                          >
                            Entregar
                          </Button>
                          <WhatsAppButton
                            phone={item.cliente_whatsapp}
                            templateType={paySummary.remainingBalance > 0.01 ? "vehicleReadyPendingPayment" : "vehicleReady"}
                            templateVars={itemTemplateVars}
                            customerId={item.cliente_id}
                            appointmentId={item.id}
                            label="Avisar Pronto"
                            size="sm"
                            variant="green"
                            className="h-8"
                          />
                          {paySummary.remainingBalance > 0.01 ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs px-2.5 text-amber-300 border-amber-500/30 hover:bg-amber-500/10"
                              onClick={() => setPayingAgendamento(item)}
                              leftIcon={<DollarSign className="w-3.5 h-3.5 text-amber-400" />}
                            >
                              Pagar
                            </Button>
                          ) : (
                            <span className="text-[10px] text-brand-green-text font-bold px-1.5 py-0.5 rounded bg-brand-green/10 border border-brand-green/20">
                              Quitado
                            </span>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs px-2 text-slate-300 hover:text-white"
                            onClick={() => setConferindoAgendamento(item)}
                            title="Revisar conferência"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}

                      {/* Se Entregue (ou Finalizado legado) */}
                      {(item.status === "Entregue" || item.status === "Finalizado") && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs px-2.5 text-slate-200 border-surface-border hover:bg-surface-elevated"
                            onClick={() => setComprovanteAgendamento(item)}
                            leftIcon={<Printer className="w-3.5 h-3.5" />}
                          >
                            Comprovante
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs px-2 text-brand-green hover:bg-brand-green/10"
                            onClick={() => setPayingAgendamento(item)}
                            leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-brand-green" />}
                          >
                            Pagamento
                          </Button>
                        </>
                      )}

                      {/* Botão Cancelar (para estados não finais) */}
                      {!["Finalizado", "Entregue", "Cancelado"].includes(item.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs px-2 text-red-400 border-red-500/30 hover:bg-red-500/10"
                          onClick={() => setCancellingAgendamento(item)}
                          title="Cancelar atendimento"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </Button>
                      )}

                      {/* Botão Falta / Não compareceu (para agendados, confirmados ou aguardando) */}
                      {["Agendado", "Confirmado", "Aguardando"].includes(item.status) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs px-2 text-muted-foreground hover:text-red-300"
                          onClick={() => handleAlterarStatus(item.id, "Não compareceu")}
                          title="Marcar como não compareceu"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </Button>
                      )}

                      {/* Botão de Recuperação para No-show */}
                      {isNoShow && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs px-2.5 text-slate-300"
                          onClick={() => handleAlterarStatus(item.id, "Aguardando")}
                        >
                          Reabrir atendimento
                        </Button>
                      )}

                      {/* Ver Detalhes / Checklist / Histórico */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs px-2 text-slate-400 hover:text-white"
                        onClick={() => setViewingAgendamento(item)}
                        title="Ver detalhes, checklist e histórico"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. MODAL NOVO ATENDIMENTO RÁPIDO */}
      <NovoAtendimentoModal
        isOpen={isNovoAtendimentoOpen}
        onClose={() => setIsNovoAtendimentoOpen(false)}
      />

      {/* 6. MODAL DETALHES, CHECKLIST & HISTÓRICO */}
      <DetalhesAtendimentoModal
        isOpen={!!viewingAgendamento}
        onClose={() => setViewingAgendamento(null)}
        agendamento={viewingAgendamento}
        onAlterarStatus={(id, status) => handleAlterarStatus(id, status)}
        onAbrirCancelar={(ag) => setCancellingAgendamento(ag)}
      />

      {/* 7. MODAL CANCELAR COM MOTIVO */}
      <CancelarAtendimentoModal
        isOpen={!!cancellingAgendamento}
        onClose={() => setCancellingAgendamento(null)}
        agendamento={cancellingAgendamento}
        onConfirmarCancelamento={handleConfirmarCancelamento}
      />

      {/* 8. MODAL REGISTRAR PAGAMENTO (ETAPA 6) */}
      <RegistrarPagamentoModal
        isOpen={!!payingAgendamento}
        onClose={() => setPayingAgendamento(null)}
        agendamento={payingAgendamento}
      />

      {/* 9. MODAL FICHA DE CHECK-IN / VISTORIA (ETAPA 10) */}
      <FichaCheckinModal
        isOpen={!!viewingCheckin}
        onClose={() => setViewingCheckin(null)}
        checkin={viewingCheckin?.checkin || null}
        agendamento={viewingCheckin?.agendamento}
      />

      {/* 10. MODAL CONCLUIR SERVIÇO (ETAPA 11) */}
      {concluindoAgendamento && (
        <ConcluirServicoModal
          isOpen={!!concluindoAgendamento}
          onClose={() => setConcluindoAgendamento(null)}
          agendamento={concluindoAgendamento}
        />
      )}

      {/* 11. MODAL CONFERÊNCIA FINAL (ETAPA 11) */}
      {conferindoAgendamento && (
        <ConferenciaFinalModal
          isOpen={!!conferindoAgendamento}
          onClose={() => setConferindoAgendamento(null)}
          agendamento={conferindoAgendamento}
        />
      )}

      {/* 12. MODAL ENTREGA DO VEÍCULO (ETAPA 11) */}
      {entregandoAgendamento && (
        <EntregaVeiculoModal
          isOpen={!!entregandoAgendamento}
          onClose={() => setEntregandoAgendamento(null)}
          agendamento={entregandoAgendamento}
          onOpenPagamento={() => {
            setPayingAgendamento(entregandoAgendamento);
          }}
          onOpenComprovante={() => {
            setComprovanteAgendamento(entregandoAgendamento);
          }}
          onSuccess={() => {
            setComprovanteAgendamento(entregandoAgendamento);
          }}
        />
      )}

      {/* 13. MODAL COMPROVANTE DE ENTREGA (ETAPA 11) */}
      {comprovanteAgendamento && (
        <ComprovanteEntregaModal
          isOpen={!!comprovanteAgendamento}
          onClose={() => setComprovanteAgendamento(null)}
          agendamento={comprovanteAgendamento}
        />
      )}
    </div>
  );
}

