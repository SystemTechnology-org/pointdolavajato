"use client";

import React, { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  Car,
  Clock,
  DollarSign,
  Plus,
  Edit3,
  XCircle,
  History,
  ShieldAlert,
  ShieldCheck,
  Eye,
  Star,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Dialog } from "@/components/ui/Dialog";
import { EditarClienteModal } from "@/components/modals/EditarClienteModal";
import { NovoVeiculoModal } from "@/components/modals/NovoVeiculoModal";
import { EditarVeiculoModal } from "@/components/modals/EditarVeiculoModal";
import { NovoAgendamentoModal } from "@/components/modals/NovoAgendamentoModal";
import { DetalhesAgendamentoModal } from "@/components/modals/DetalhesAgendamentoModal";
import { RegistrarAvaliacaoModal } from "@/components/reviews/RegistrarAvaliacaoModal";
import { CustomerTagsManager } from "@/components/customers/CustomerTagsManager";
import { LinhaTempoComercial } from "@/components/customers/LinhaTempoComercial";
import { useAppStore } from "@/lib/store";
import { formatPhoneFriendly } from "@/lib/services/customers";
import { formatCurrency, formatDateBR } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { Agendamento, Veiculo } from "@/types";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { isCompletedStatus } from "@/lib/services/customerIntelligence";

export default function ClienteDetalhesPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";

  const {
    getClienteDetails,
    deactivateCliente,
    activateCliente,
    deactivateVeiculo,
    activateVeiculo,
    canViewFinancial,
  } = useAppStore();
  const { success } = useToast();

  // Modais de ação
  const [isEditClienteOpen, setIsEditClienteOpen] = useState(false);
  const [isNovoVeiculoOpen, setIsNovoVeiculoOpen] = useState(false);
  const [editingVeiculo, setEditingVeiculo] = useState<Veiculo | null>(null);
  const [isNovoAgendamentoOpen, setIsNovoAgendamentoOpen] = useState(false);
  const [selectedVeiculoForAgendamento, setSelectedVeiculoForAgendamento] = useState<string | undefined>(undefined);
  const [viewingAgendamento, setViewingAgendamento] = useState<Agendamento | null>(null);

  // Modal de Avaliação (Etapa 12)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewAppId, setReviewAppId] = useState<string | undefined>(undefined);

  // Confirmações
  const [showToggleClienteStatus, setShowToggleClienteStatus] = useState(false);
  const [veiculoToToggle, setVeiculoToToggle] = useState<Veiculo | null>(null);

  // Alternância de visão do histórico
  const [historyTab, setHistoryTab] = useState<"timeline" | "table">("timeline");

  // Filtro de Histórico de Agendamentos (Tabela)
  const [historyFilter, setHistoryFilter] = useState<"todos" | "concluidos" | "agendados" | "cancelados">("todos");

  // Dados do cliente, veículos e histórico enriquecidos (Etapa 12)
  const details = useMemo(() => {
    return getClienteDetails(id);
  }, [getClienteDetails, id]);

  const {
    cliente,
    veiculos,
    agendamentos,
    totalAgendamentos,
    concluidos,
    totalGasto,
    ultimoAtendimento,
    metrics,
    vehiclesSummary,
    timeline,
  } = details;

  // Filtragem do histórico do cliente para tabela
  const filteredAppointments = useMemo(() => {
    return agendamentos.filter((a) => {
      if (historyFilter === "concluidos") return isCompletedStatus(a.status);
      if (historyFilter === "agendados") return ["Agendado", "Confirmado", "Aguardando", "Em atendimento"].includes(a.status);
      if (historyFilter === "cancelados") return ["Cancelado", "Não compareceu"].includes(a.status);
      return true;
    });
  }, [agendamentos, historyFilter]);

  if (!cliente) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-surface border border-surface-border flex items-center justify-center mx-auto text-muted">
          <XCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">Cliente não encontrado</h2>
        <p className="text-xs text-muted-foreground">
          O cliente solicitado não consta na base de dados ou foi removido.
        </p>
        <Link href="/clientes">
          <Button variant="outline" size="sm" className="mt-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para lista de clientes
          </Button>
        </Link>
      </div>
    );
  }

  const isAtivo = cliente.ativo !== false;

  const handleToggleCliente = () => {
    if (isAtivo) {
      deactivateCliente(cliente.id);
      success("Cliente desativado com sucesso. O histórico foi preservado.");
    } else {
      activateCliente(cliente.id);
      success("Cliente reativado com sucesso.");
    }
    setShowToggleClienteStatus(false);
  };

  const handleToggleVeiculo = () => {
    if (!veiculoToToggle) return;
    if (veiculoToToggle.ativo !== false) {
      deactivateVeiculo(veiculoToToggle.id);
      success("Veículo desativado com sucesso.");
    } else {
      activateVeiculo(veiculoToToggle.id);
      success("Veículo reativado.");
    }
    setVeiculoToToggle(null);
  };

  const handleOpenAppointmentFromTimeline = (appointmentId: string) => {
    const app = agendamentos.find((a) => a.id === appointmentId);
    if (app) {
      setViewingAgendamento(app);
    }
  };

  const handleOpenReviewForApp = (appointmentId: string) => {
    setReviewAppId(appointmentId);
    setIsReviewModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* NAVEGAÇÃO SUPERIOR */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/clientes" className="hover:text-white flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Clientes</span>
        </Link>
        <span>/</span>
        <span className="text-slate-300 font-medium">{cliente.nome}</span>
      </div>

      {/* 1. TOPO: IDENTIFICAÇÃO, TAGS E AÇÕES */}
      <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-surface-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>{cliente.nome}</span>
              {metrics?.isVip && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  VIP
                </span>
              )}
            </h1>

            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                isAtivo
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-slate-500/10 text-slate-400 border-slate-500/20"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isAtivo ? "bg-emerald-400" : "bg-slate-400"}`} />
              <span>{isAtivo ? "Cliente Ativo" : "Cliente Inativo"}</span>
            </span>
          </div>

          {/* TAGS DO CLIENTE (ETAPA 12) */}
          <div className="flex items-center gap-2 pt-0.5">
            <CustomerTagsManager customerId={cliente.id} tags={metrics?.tags || []} />
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pt-1">
            {/* WhatsApp */}
            <a
              href={`https://wa.me/55${cliente.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-brand-green-text hover:underline"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{formatPhoneFriendly(cliente.whatsapp)}</span>
              <span className="text-[10px] bg-brand-green/10 text-brand-green px-1.5 py-0.2 rounded border border-brand-green/20">
                Conversar
              </span>
            </a>

            {cliente.email && (
              <span className="inline-flex items-center gap-1 text-slate-300">
                <Mail className="w-3.5 h-3.5 text-muted" />
                <span>{cliente.email}</span>
              </span>
            )}
          </div>
        </div>

        {/* Botões de Ação do Topo */}
        <div className="flex items-center gap-2 flex-wrap">
          <WhatsAppButton
            phone={cliente.whatsapp}
            templateType={metrics?.isInativo ? "customerRetention" : "generalContact"}
            templateVars={{ cliente: cliente.nome }}
            customerId={cliente.id}
            label={metrics?.isInativo ? "Reativar WhatsApp" : "WhatsApp"}
            variant="green"
            size="sm"
          />

          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setSelectedVeiculoForAgendamento(undefined);
              setIsNovoAgendamentoOpen(true);
            }}
            leftIcon={<Calendar className="w-4 h-4" />}
          >
            Novo agendamento
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setReviewAppId(undefined);
              setIsReviewModalOpen(true);
            }}
            leftIcon={<Star className="w-4 h-4 text-brand-yellow" />}
          >
            Registrar Avaliação
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsNovoVeiculoOpen(true)}
            leftIcon={<Plus className="w-4 h-4 text-brand-green" />}
          >
            Adicionar veículo
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEditClienteOpen(true)}
            leftIcon={<Edit3 className="w-4 h-4 text-brand-yellow" />}
          >
            Editar
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowToggleClienteStatus(true)}
            className={isAtivo ? "text-amber-400 hover:text-amber-300" : "text-emerald-400 hover:text-emerald-300"}
            title={isAtivo ? "Desativar cliente" : "Reativar cliente"}
          >
            {isAtivo ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* 2. RESUMO OPERACIONAL E FINANCEIRO DO CLIENTE (ETAPA 12) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Atendimentos Concluídos */}
        <div className="p-4 rounded-xl bg-surface border border-surface-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Atendimentos</span>
            <Calendar className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-white">
            {concluidos}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {totalAgendamentos} agendados no total
          </p>
        </div>

        {/* Faturamento Real Pago */}
        <div className="p-4 rounded-xl bg-surface border border-surface-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Total Pago Real</span>
            <DollarSign className="w-4 h-4 text-brand-green" />
          </div>
          <div className="text-xl font-bold text-brand-green-text truncate">
            {canViewFinancial ? formatCurrency(totalGasto) : "R$ ***"}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
            {metrics?.totalPending && metrics.totalPending > 0
              ? `Pendente: ${formatCurrency(metrics.totalPending)}`
              : "Quitado 100%"}
          </p>
        </div>

        {/* Ticket Médio */}
        <div className="p-4 rounded-xl bg-surface border border-surface-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Ticket Médio</span>
            <TrendingUp className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-bold text-white truncate">
            {canViewFinancial
              ? formatCurrency(metrics?.averageTicket || 0)
              : "R$ ***"}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Por visita concluída
          </p>
        </div>

        {/* Frequência Média de Visitas */}
        <div className="p-4 rounded-xl bg-surface border border-surface-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Frequência</span>
            <RotateCcw className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-sm font-bold text-slate-200">
            {metrics?.visitFrequencyDays !== null && metrics?.visitFrequencyDays !== undefined
              ? `A cada ${metrics.visitFrequencyDays} dias`
              : "Dados insuficientes"}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {concluidos >= 2 ? "Calculado com visitas reais" : "Requer ≥ 2 visitas"}
          </p>
        </div>

        {/* Dias Sem Retorno */}
        <div className="p-4 rounded-xl bg-surface border border-surface-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Última Visita</span>
            <Clock className="w-4 h-4 text-brand-yellow" />
          </div>
          <div className="text-sm font-bold text-slate-200">
            {metrics?.daysSinceLastVisit !== null && metrics?.daysSinceLastVisit !== undefined
              ? `${metrics.daysSinceLastVisit} dias atrás`
              : "Nunca veio"}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
            {ultimoAtendimento ? formatDateBR(ultimoAtendimento.data) : "Sem histórico"}
          </p>
        </div>

        {/* Avaliação Média do Cliente */}
        <div className="p-4 rounded-xl bg-surface border border-surface-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Avaliação Média</span>
            <Star className="w-4 h-4 text-brand-yellow fill-brand-yellow" />
          </div>
          <div className="text-lg font-bold text-brand-yellow flex items-center gap-1">
            {metrics?.averageRating !== null && metrics?.averageRating !== undefined
              ? `${metrics.averageRating.toFixed(1)} ★`
              : "Sem notas"}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {metrics?.reviewsCount || 0} avaliações registradas
          </p>
        </div>
      </div>

      {/* ALERTA DE CLIENTE INATIVO (SE APLICÁVEL) */}
      {metrics?.isInativo && (
        <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-slate-200">
                Cliente sem retorno há mais de {metrics.daysSinceLastVisit} dias
              </p>
              <p className="text-muted-foreground text-[11px] mt-0.5">
                O cliente já realizou {concluidos} atendimentos no lava-jato, mas não retorna há tempo considerável.
              </p>
            </div>
          </div>
          <WhatsAppButton
            phone={cliente.whatsapp}
            templateType="customerRetention"
            templateVars={{ cliente: cliente.nome }}
            customerId={cliente.id}
            label="Enviar lembrete de retorno"
            variant="green"
            size="sm"
          />
        </div>
      )}

      {/* 3. INFORMAÇÕES DO CLIENTE */}
      <section className="p-5 rounded-2xl bg-surface border border-surface-border space-y-4">
        <h2 className="text-sm font-bold text-white tracking-tight uppercase tracking-wider text-muted">
          Informações de Contato e Cadastro
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground block mb-0.5">Nome completo:</span>
            <span className="font-semibold text-white">{cliente.nome}</span>
          </div>

          <div>
            <span className="text-muted-foreground block mb-0.5">WhatsApp / Telefone:</span>
            <span className="font-semibold text-brand-green-text">{formatPhoneFriendly(cliente.whatsapp)}</span>
          </div>

          <div>
            <span className="text-muted-foreground block mb-0.5">Email:</span>
            <span className="text-slate-300">{cliente.email || "Não informado"}</span>
          </div>

          <div>
            <span className="text-muted-foreground block mb-0.5">Data de cadastro:</span>
            <span className="text-slate-300">{formatDateBR(cliente.created_at)}</span>
          </div>
        </div>

        {cliente.observacoes && (
          <div className="pt-2 border-t border-surface-border/50 text-xs">
            <span className="text-muted-foreground block mb-1">Observações do cliente:</span>
            <p className="p-3 rounded-xl bg-surface-elevated/50 text-slate-300 italic border border-surface-border/40">
              {cliente.observacoes}
            </p>
          </div>
        )}
      </section>

      {/* 4. VEÍCULOS DO CLIENTE COM MÉTRICAS DE RETORNO E GASTO */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
            <span>Veículos vinculados</span>
            <span className="text-xs font-normal text-muted-foreground">
              ({veiculos.length})
            </span>
          </h2>

          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8"
            onClick={() => setIsNovoVeiculoOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5 text-brand-green" />}
          >
            Adicionar veículo
          </Button>
        </div>

        {veiculos.length === 0 ? (
          <div className="p-6 rounded-2xl bg-surface border border-surface-border text-center space-y-2">
            <Car className="w-8 h-8 text-muted mx-auto" />
            <p className="text-xs text-muted-foreground">Nenhum veículo vinculado a este cliente.</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsNovoVeiculoOpen(true)}
              className="text-xs"
            >
              + Adicionar primeiro veículo
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {veiculos.map((v) => {
              const isVehAtivo = v.ativo !== false;
              const vehSummary = (vehiclesSummary || []).find((vs) => vs.vehicle_id === v.id);

              return (
                <div
                  key={v.id}
                  className="p-4 rounded-xl bg-surface border border-surface-border hover:border-slate-700/80 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Car className="w-4 h-4 text-brand-green shrink-0" />
                          <span className="font-bold text-white text-sm">
                            {v.modelo}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {v.marca || "Marca não informada"} • {v.tipo}
                        </p>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          isVehAtivo
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                        }`}
                      >
                        {isVehAtivo ? "Ativo" : "Inativo"}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Placa:</span>
                        <span className="font-mono font-semibold text-slate-200">
                          {v.placa && v.placa !== "---" ? v.placa : "Não informada"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cor:</span>
                        <span className="text-slate-300">{v.cor || "Não informada"}</span>
                      </div>
                      {/* Métricas por veículo (Etapa 12) */}
                      {vehSummary && (
                        <div className="pt-2 border-t border-surface-border/50 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Atendimentos:</span>
                            <span className="font-semibold text-white">{vehSummary.visitsCount} visitas</span>
                          </div>
                          {canViewFinancial && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total faturado:</span>
                              <span className="font-bold text-brand-green-text">
                                {formatCurrency(vehSummary.totalSpent)}
                              </span>
                            </div>
                          )}
                          {vehSummary.lastServiceName && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Último serviço:</span>
                              <span className="text-slate-300 truncate max-w-[150px]">
                                {vehSummary.lastServiceName}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações por Veículo */}
                  <div className="pt-2 border-t border-surface-border flex items-center justify-between gap-1.5">
                    <Link href={`/veiculos/${v.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full text-[11px] h-7 px-2">
                        <History className="w-3 h-3 mr-1 text-sky-400" />
                        Histórico
                      </Button>
                    </Link>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[11px] h-7 px-2 text-brand-green-text hover:bg-brand-green/10"
                      onClick={() => {
                        setSelectedVeiculoForAgendamento(v.id);
                        setIsNovoAgendamentoOpen(true);
                      }}
                      title="Agendar para este veículo"
                    >
                      <Calendar className="w-3 h-3 mr-1" />
                      Agendar
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[11px] h-7 px-2 text-brand-yellow hover:bg-brand-yellow/10"
                      onClick={() => setEditingVeiculo(v)}
                      title="Editar veículo"
                    >
                      <Edit3 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. HISTÓRICO COMERCIAL & TIMELINE DE ATENDIMENTOS */}
      <section className="space-y-4" id="historico-atendimentos">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-surface-border/60">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight uppercase tracking-wider">
              Histórico Comercial e Fidelização
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Linha do tempo dos atendimentos, valores quitados e avaliações recebidas.
            </p>
          </div>

          {/* Alternador de Abas: Linha do Tempo vs Tabela */}
          <div className="flex items-center gap-1 p-1 bg-surface rounded-xl border border-surface-border text-xs">
            <button
              type="button"
              onClick={() => setHistoryTab("timeline")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                historyTab === "timeline"
                  ? "bg-surface-elevated text-brand-green font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              Linha do Tempo
            </button>
            <button
              type="button"
              onClick={() => setHistoryTab("table")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                historyTab === "table"
                  ? "bg-surface-elevated text-brand-green font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              Tabela Detalhada
            </button>
          </div>
        </div>

        {/* ABA 1: LINHA DO TEMPO COMERCIAL */}
        {historyTab === "timeline" && (
          <LinhaTempoComercial
            timeline={timeline || []}
            onOpenAppointment={handleOpenAppointmentFromTimeline}
            onOpenReviewModal={handleOpenReviewForApp}
            canViewFinancial={canViewFinancial}
          />
        )}

        {/* ABA 2: TABELA DE AGENDAMENTOS */}
        {historyTab === "table" && (
          <div className="space-y-3">
            {/* Filtros de Histórico */}
            <div className="flex items-center gap-1 p-1 bg-surface rounded-xl border border-surface-border text-xs w-fit">
              {(["todos", "concluidos", "agendados", "cancelados"] as const).map((filterKey) => (
                <button
                  key={filterKey}
                  onClick={() => setHistoryFilter(filterKey)}
                  className={`px-2.5 py-1 rounded-lg capitalize transition-colors ${
                    historyFilter === filterKey
                      ? "bg-surface-elevated text-brand-green font-semibold"
                      : "text-muted-foreground hover:text-white"
                  }`}
                >
                  {filterKey}
                </button>
              ))}
            </div>

            {filteredAppointments.length === 0 ? (
              <div className="p-6 rounded-2xl bg-surface border border-surface-border text-center space-y-2">
                <Calendar className="w-8 h-8 text-muted mx-auto" />
                <p className="text-xs text-muted-foreground">Nenhum agendamento encontrado para este filtro.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-surface-border bg-surface overflow-hidden">
                <div className="hidden md:block">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-surface-elevated/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-surface-border">
                      <tr>
                        <th className="p-3">Data e Horário</th>
                        <th className="p-3">Veículo</th>
                        <th className="p-3">Serviço</th>
                        <th className="p-3">Valor</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border/50 text-slate-300">
                      {filteredAppointments.map((app) => (
                        <tr key={app.id} className="hover:bg-surface-elevated/40 transition-colors">
                          <td className="p-3 font-semibold text-white whitespace-nowrap">
                            {formatDateBR(app.data)} às {app.horario}
                          </td>
                          <td className="p-3">
                            <span>{app.veiculo_modelo}</span>
                            {app.veiculo_placa && app.veiculo_placa !== "---" && (
                              <span className="text-muted-foreground ml-1 font-mono text-[10px]">
                                ({app.veiculo_placa})
                              </span>
                            )}
                          </td>
                          <td className="p-3">{app.servico_nome}</td>
                          <td className="p-3 font-bold text-brand-green-text">
                            {formatCurrency(app.valor)}
                          </td>
                          <td className="p-3">
                            <StatusBadge status={app.status} size="sm" />
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs px-2"
                              onClick={() => setViewingAgendamento(app)}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Ver
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-surface-border/50">
                  {filteredAppointments.map((app) => (
                    <div key={app.id} className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">
                          {formatDateBR(app.data)} às {app.horario}
                        </span>
                        <StatusBadge status={app.status} size="sm" />
                      </div>
                      <div className="text-xs text-slate-300 flex justify-between">
                        <span>{app.servico_nome}</span>
                        <span className="font-bold text-brand-green-text">{formatCurrency(app.valor)}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground flex justify-between items-center pt-1">
                        <span>{app.veiculo_modelo} ({app.veiculo_placa})</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs px-2"
                          onClick={() => setViewingAgendamento(app)}
                        >
                          Ver detalhes
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* MODAIS DA PÁGINA */}
      <EditarClienteModal
        isOpen={isEditClienteOpen}
        onClose={() => setIsEditClienteOpen(false)}
        cliente={cliente}
      />

      <NovoVeiculoModal
        isOpen={isNovoVeiculoOpen}
        onClose={() => setIsNovoVeiculoOpen(false)}
        initialClienteId={cliente.id}
      />

      <EditarVeiculoModal
        isOpen={!!editingVeiculo}
        onClose={() => setEditingVeiculo(null)}
        veiculo={editingVeiculo}
      />

      <NovoAgendamentoModal
        isOpen={isNovoAgendamentoOpen}
        onClose={() => {
          setIsNovoAgendamentoOpen(false);
          setSelectedVeiculoForAgendamento(undefined);
        }}
        initialClienteId={cliente.id}
        initialVeiculoId={selectedVeiculoForAgendamento}
      />

      <DetalhesAgendamentoModal
        isOpen={!!viewingAgendamento}
        onClose={() => setViewingAgendamento(null)}
        agendamento={viewingAgendamento}
      />

      {/* MODAL DE REGISTRO DE AVALIAÇÃO (ETAPA 12) */}
      <RegistrarAvaliacaoModal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setReviewAppId(undefined);
        }}
        customerId={cliente.id}
        customerName={cliente.nome}
        appointments={agendamentos}
        preselectedAppointmentId={reviewAppId}
      />

      {/* Diálogo de confirmação para desativar/reativar cliente */}
      <Dialog
        isOpen={showToggleClienteStatus}
        onClose={() => setShowToggleClienteStatus(false)}
        onConfirm={handleToggleCliente}
        title={isAtivo ? "Desativar este cliente?" : "Reativar este cliente?"}
        description={
          isAtivo
            ? `Tem certeza que deseja desativar ${cliente.nome}? O histórico completo de veículos e atendimentos permanecerá protegido.`
            : `Deseja reativar ${cliente.nome}? O cliente voltará a constar como ativo no sistema.`
        }
        confirmText={isAtivo ? "Desativar" : "Reativar"}
        variant={isAtivo ? "danger" : "primary"}
      />

      {/* Diálogo de confirmação para desativar/reativar veículo */}
      <Dialog
        isOpen={!!veiculoToToggle}
        onClose={() => setVeiculoToToggle(null)}
        onConfirm={handleToggleVeiculo}
        title={
          veiculoToToggle?.ativo !== false
            ? "Desativar este veículo?"
            : "Reativar este veículo?"
        }
        description={
          veiculoToToggle?.ativo !== false
            ? `Deseja desativar ${veiculoToToggle?.modelo}? O histórico de lavagens e serviços deste veículo continuará registrado.`
            : `Deseja reativar ${veiculoToToggle?.modelo}?`
        }
        confirmText={veiculoToToggle?.ativo !== false ? "Desativar" : "Reativar"}
        variant={veiculoToToggle?.ativo !== false ? "danger" : "primary"}
      />
    </div>
  );
}
