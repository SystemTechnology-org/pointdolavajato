"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Filter,
  Eye,
  Edit2,
  CheckCircle2,
  Play,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { NovoAgendamentoModal } from "@/components/modals/NovoAgendamentoModal";
import { EditarAgendamentoModal } from "@/components/modals/EditarAgendamentoModal";
import { DetalhesAgendamentoModal } from "@/components/modals/DetalhesAgendamentoModal";
import { useAppStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import {
  STATUS_AGENDAMENTO,
  TIPOS_VEICULO,
  Agendamento,
} from "@/types";
import { getTodayDateString } from "@/lib/initialData";

export default function AgendaPage() {
  const {
    agendamentos,
    servicos,
    businessHours,
    updateAgendamentoStatus,
  } = useAppStore();

  const todayStr = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Filtros (Requisito 21)
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [veiculoTipoFilter, setVeiculoTipoFilter] = useState<string>("todos");
  const [servicoFilter, setServicoFilter] = useState<string>("todos");
  const [searchTerm, setSearchTerm] = useState("");

  // Modais
  const [isNovoModalOpen, setIsNovoModalOpen] = useState(false);
  const [prefilledTime, setPrefilledTime] = useState("09:00");
  const [editingAgendamento, setEditingAgendamento] = useState<Agendamento | null>(null);
  const [viewingAgendamento, setViewingAgendamento] = useState<Agendamento | null>(null);

  // Datas de atalho: Hoje, Amanhã, Próximos dias (Requisito 19)
  const tomorrowStr = useMemo(() => {
    const d = new Date(todayStr + "T12:00:00");
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, [todayStr]);

  const changeDate = (days: number) => {
    const current = new Date(selectedDate + "T12:00:00");
    current.setDate(current.getDate() + days);
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    const d = String(current.getDate()).padStart(2, "0");
    setSelectedDate(`${y}-${m}-${d}`);
  };

  // Formatação legível da data
  const dateObj = new Date(selectedDate + "T12:00:00");
  const readableDate = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dateObj);

  // Horários de funcionamento do dia selecionado
  const dayOfWeek = dateObj.getDay();
  const hourCfg = businessHours.find((h) => h.day_of_week === dayOfWeek);
  const isDayOpen = hourCfg ? hourCfg.is_open : dayOfWeek !== 0;

  // Gerar slots horários para visualização vertical no desktop
  const daySlots = useMemo(() => {
    if (!hourCfg || !hourCfg.is_open) return [];

    const [openH, openM] = hourCfg.opening_time.split(":").map(Number);
    const [closeH, closeM] = hourCfg.closing_time.split(":").map(Number);
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    const slots: string[] = [];
    for (let m = openMinutes; m < closeMinutes; m += 30) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      slots.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
    }
    return slots;
  }, [hourCfg]);

  // Agendamentos filtrados
  const filteredAppointments = useMemo(() => {
    return agendamentos.filter((a) => {
      if (a.data !== selectedDate) return false;
      if (statusFilter !== "todos" && a.status !== statusFilter) return false;
      if (veiculoTipoFilter !== "todos" && a.veiculo_tipo !== veiculoTipoFilter) return false;
      if (servicoFilter !== "todos" && a.servico_id !== servicoFilter) return false;

      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        const matchesClient = a.cliente_nome.toLowerCase().includes(s);
        const matchesPhone = a.cliente_whatsapp.includes(s);
        const matchesPlate = a.veiculo_placa.toLowerCase().includes(s);
        const matchesModel = a.veiculo_modelo.toLowerCase().includes(s);
        const matchesProtocol = a.code?.toLowerCase().includes(s);
        return matchesClient || matchesPhone || matchesPlate || matchesModel || matchesProtocol;
      }

      return true;
    });
  }, [agendamentos, selectedDate, statusFilter, veiculoTipoFilter, servicoFilter, searchTerm]);

  const handleBookSlot = (time: string) => {
    setPrefilledTime(time);
    setIsNovoModalOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Topo da Agenda */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-border/60">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Agenda do Lava Jato
          </h2>
          <p className="text-xs text-muted-foreground">
            Controle de horários, capacidade e status de atendimentos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={() => handleBookSlot("09:00")}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            + Novo agendamento
          </Button>
        </div>
      </div>

      {/* Barra de Navegação de Datas: Hoje, Amanhã, Navegador (Requisito 19) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-xl bg-surface border border-surface-border">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => changeDate(-1)}
            aria-label="Dia anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant={selectedDate === todayStr ? "primary" : "outline"}
            onClick={() => setSelectedDate(todayStr)}
          >
            Hoje
          </Button>

          <Button
            size="sm"
            variant={selectedDate === tomorrowStr ? "primary" : "outline"}
            onClick={() => setSelectedDate(tomorrowStr)}
          >
            Amanhã
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => changeDate(1)}
            aria-label="Próximo dia"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          <div className="ml-1">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-surface-elevated border border-surface-border text-xs text-white px-2.5 py-1.5 rounded-lg [color-scheme:dark] cursor-pointer"
            />
          </div>
        </div>

        <div className="text-xs capitalize font-medium text-slate-200 flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-brand-green" />
          <span>{readableDate}</span>
          <span className="text-muted-foreground">
            • {filteredAppointments.length} agendamento(s)
          </span>
        </div>
      </div>

      {/* Barra de Filtros (Requisito 21) */}
      <div className="p-3.5 rounded-xl bg-surface border border-surface-border space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Filter className="w-3.5 h-3.5 text-brand-yellow" />
          <span>Filtros da Agenda</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Busca por texto */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar cliente, placa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-8 pr-3 text-xs rounded-lg bg-surface-elevated border border-surface-border text-white placeholder:text-muted-foreground"
            />
          </div>

          {/* Filtro Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 text-xs px-2.5 rounded-lg bg-surface-elevated border border-surface-border text-slate-200 cursor-pointer"
          >
            <option value="todos">Todos os status</option>
            {STATUS_AGENDAMENTO.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          {/* Filtro Categoria Veículo */}
          <select
            value={veiculoTipoFilter}
            onChange={(e) => setVeiculoTipoFilter(e.target.value)}
            className="h-9 text-xs px-2.5 rounded-lg bg-surface-elevated border border-surface-border text-slate-200 cursor-pointer"
          >
            <option value="todos">Todas as categorias</option>
            {TIPOS_VEICULO.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Filtro Serviço */}
          <select
            value={servicoFilter}
            onChange={(e) => setServicoFilter(e.target.value)}
            className="h-9 text-xs px-2.5 rounded-lg bg-surface-elevated border border-surface-border text-slate-200 cursor-pointer truncate"
          >
            <option value="todos">Todos os serviços</option>
            {servicos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Visualização de Fechado se aplicável */}
      {!isDayOpen && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center text-xs text-amber-200">
          <p className="font-semibold text-white">Estabelecimento fechado nesta data.</p>
          <p className="text-[11px] text-amber-200/80 mt-0.5">
            Conforme configurado nos horários de funcionamento, o lava-jato não opera neste dia da semana.
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. VISUALIZAÇÃO DESKTOP: VERTICALMENTE (Requisito 20)                       */}
      {/* ========================================================================= */}
      <div className="hidden lg:block space-y-2">
        {daySlots.length === 0 && isDayOpen && (
          <div className="p-6 rounded-xl bg-surface text-center text-xs text-muted-foreground">
            Nenhum horário de funcionamento configurado para este dia.
          </div>
        )}

        {daySlots.map((slot) => {
          const slotAppointments = filteredAppointments.filter((a) => a.horario === slot);
          const activeBookings = slotAppointments.filter((a) => a.status !== "Cancelado" && a.status !== "Não compareceu");
          const isOccupied = activeBookings.length > 0;
          const hasAppointments = slotAppointments.length > 0;

          return (
            <div
              key={slot}
              className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                isOccupied
                  ? "bg-surface border-surface-border hover:border-slate-600"
                  : "bg-surface/30 border-surface-border/40 hover:bg-surface/60"
              }`}
            >
              {/* Horário Vertical */}
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-16 py-1.5 rounded-lg text-center text-xs font-bold shrink-0 ${
                    isOccupied
                      ? "bg-brand-green/15 text-brand-green-text border border-brand-green/30"
                      : "bg-surface-elevated text-muted-foreground border border-surface-border"
                  }`}
                >
                  {slot}
                </div>

                {/* Conteúdo do Horário */}
                {hasAppointments ? (
                  <div className="space-y-2">
                    {slotAppointments.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 flex-wrap">
                        <span className="font-semibold text-white text-xs">
                          {item.cliente_nome}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          • {item.veiculo_modelo} {item.veiculo_placa && item.veiculo_placa !== "---" ? `(${item.veiculo_placa})` : ""}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-surface-elevated text-slate-300 border border-surface-border">
                          {item.veiculo_tipo}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-slate-200">{item.servico_nome}</span>
                        <span className="text-xs font-bold text-brand-green-text">
                          {formatCurrency(item.valor)}
                        </span>
                        {item.code && (
                          <span className="text-[10px] font-mono text-brand-yellow-text">
                            #{item.code}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-muted" />
                    <span>[ Livre ]</span>
                  </div>
                )}
              </div>

              {/* Status e Ações Rápidas (Requisito 25) */}
              <div className="flex items-center gap-2 shrink-0">
                {slotAppointments.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <StatusBadge status={item.status} size="sm" />

                    {/* Ações rápidas dinâmicas conforme status */}
                    {item.status === "Agendado" && (
                      <Button
                        size="sm"
                        variant="primary"
                        className="h-7 text-[11px] px-2"
                        onClick={() => updateAgendamentoStatus(item.id, "Confirmado")}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Confirmar
                      </Button>
                    )}

                    {["Agendado", "Confirmado", "Aguardando"].includes(item.status) && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 text-[11px] px-2"
                        onClick={() => updateAgendamentoStatus(item.id, "Em atendimento")}
                      >
                        <Play className="w-3 h-3 mr-1 fill-current" />
                        Iniciar
                      </Button>
                    )}

                    {item.status === "Em atendimento" && (
                      <Button
                        size="sm"
                        variant="primary"
                        className="h-7 text-[11px] px-2 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => updateAgendamentoStatus(item.id, "Finalizado")}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Finalizar
                      </Button>
                    )}

                    {/* Botões de Ver e Editar */}
                    <button
                      type="button"
                      onClick={() => setViewingAgendamento(item)}
                      className="p-1 rounded text-slate-400 hover:text-white"
                      title="Visualizar detalhes"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingAgendamento(item)}
                      className="p-1 rounded text-slate-400 hover:text-white"
                      title="Editar agendamento"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {!isOccupied && isDayOpen && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-brand-green-text hover:bg-brand-green/10"
                    onClick={() => handleBookSlot(slot)}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Agendar
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 2. VISUALIZAÇÃO MOBILE: LISTA CRONOLÓGICA (Requisito 20)                   */}
      {/* ========================================================================= */}
      <div className="block lg:hidden space-y-3">
        {filteredAppointments.length === 0 ? (
          <div className="p-6 rounded-2xl bg-surface border border-surface-border text-center space-y-3">
            <Clock className="w-6 h-6 text-muted-foreground mx-auto" />
            <p className="text-xs font-semibold text-white">Nenhum atendimento agendado para esta data.</p>
            <p className="text-[11px] text-muted-foreground">
              Utilize o botão abaixo para criar um novo agendamento manualmente.
            </p>
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleBookSlot("09:00")}
              className="text-xs"
            >
              + Novo agendamento
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAppointments
              .sort((a, b) => a.horario.localeCompare(b.horario))
              .map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-surface border border-surface-border space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-surface-border/60">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-brand-yellow-text">
                        {item.horario}
                      </span>
                      {item.code && (
                        <span className="text-[10px] font-mono text-muted-foreground">
                          #{item.code}
                        </span>
                      )}
                    </div>
                    <StatusBadge status={item.status} size="sm" />
                  </div>

                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-white text-sm">{item.cliente_nome}</p>
                    <p className="text-muted-foreground">
                      {item.veiculo_modelo} {item.veiculo_placa && item.veiculo_placa !== "---" ? `(${item.veiculo_placa})` : ""} • <span className="text-slate-300">{item.veiculo_tipo}</span>
                    </p>
                    <p className="text-slate-300 flex items-center justify-between pt-1">
                      <span>{item.servico_nome}</span>
                      <span className="font-bold text-brand-green-text">
                        {formatCurrency(item.valor)}
                      </span>
                    </p>
                  </div>

                  {/* Ações Rápidas no Mobile */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-surface-border/60 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.status === "Agendado" && (
                        <Button
                          size="sm"
                          variant="primary"
                          className="h-8 text-[11px] px-2.5"
                          onClick={() => updateAgendamentoStatus(item.id, "Confirmado")}
                        >
                          Confirmar
                        </Button>
                      )}

                      {["Agendado", "Confirmado", "Aguardando"].includes(item.status) && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 text-[11px] px-2.5"
                          onClick={() => updateAgendamentoStatus(item.id, "Em atendimento")}
                        >
                          Iniciar
                        </Button>
                      )}

                      {item.status === "Em atendimento" && (
                        <Button
                          size="sm"
                          variant="primary"
                          className="h-8 text-[11px] px-2.5 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => updateAgendamentoStatus(item.id, "Finalizado")}
                        >
                          Finalizar
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-[11px] px-2"
                        onClick={() => setViewingAgendamento(item)}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Ver
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-[11px] px-2"
                        onClick={() => setEditingAgendamento(item)}
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" />
                        Editar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Modais Administrativos */}
      <NovoAgendamentoModal
        isOpen={isNovoModalOpen}
        onClose={() => setIsNovoModalOpen(false)}
        defaultData={selectedDate}
        defaultHorario={prefilledTime}
      />

      <EditarAgendamentoModal
        isOpen={Boolean(editingAgendamento)}
        onClose={() => setEditingAgendamento(null)}
        agendamento={editingAgendamento}
      />

      <DetalhesAgendamentoModal
        isOpen={Boolean(viewingAgendamento)}
        onClose={() => setViewingAgendamento(null)}
        agendamento={viewingAgendamento}
        onEditar={(agd) => setEditingAgendamento(agd)}
        onConfirmar={(id) => updateAgendamentoStatus(id, "Confirmado")}
        onIniciarAtendimento={(id) => updateAgendamentoStatus(id, "Em atendimento")}
        onFinalizar={(id) => updateAgendamentoStatus(id, "Finalizado")}
        onCancelar={(id) => updateAgendamentoStatus(id, "Cancelado")}
      />
    </div>
  );
}
