"use client";

import React, { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Car,
  User,
  Phone,
  Calendar,
  Clock,
  DollarSign,
  Edit3,
  ShieldAlert,
  ShieldCheck,
  XCircle,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Printer,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Dialog } from "@/components/ui/Dialog";
import { EditarVeiculoModal } from "@/components/modals/EditarVeiculoModal";
import { NovoAgendamentoModal } from "@/components/modals/NovoAgendamentoModal";
import { DetalhesAgendamentoModal } from "@/components/modals/DetalhesAgendamentoModal";
import { FichaCheckinModal } from "@/components/modals/FichaCheckinModal";
import { useAppStore } from "@/lib/store";
import { formatPhoneFriendly } from "@/lib/services/customers";
import { formatCurrency, formatDateBR } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { Agendamento, VehicleCheckin } from "@/types";

export default function VeiculoDetalhesPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";

  const {
    getVeiculoDetails,
    deactivateVeiculo,
    activateVeiculo,
    getCheckinsByVehicleId,
  } = useAppStore();
  const { success } = useToast();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNovoAgendamentoOpen, setIsNovoAgendamentoOpen] = useState(false);
  const [viewingAgendamento, setViewingAgendamento] = useState<Agendamento | null>(null);
  const [showToggleStatusModal, setShowToggleStatusModal] = useState(false);
  const [viewingCheckin, setViewingCheckin] = useState<VehicleCheckin | null>(null);

  const details = useMemo(() => {
    return getVeiculoDetails(id);
  }, [getVeiculoDetails, id]);

  const vehicleCheckins = useMemo(() => {
    return getCheckinsByVehicleId(id);
  }, [getCheckinsByVehicleId, id]);

  const { veiculo, cliente, agendamentos, totalAtendimentos, concluidos, totalGasto, ultimoAtendimento } = details;

  if (!veiculo) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-surface border border-surface-border flex items-center justify-center mx-auto text-muted">
          <XCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">Veículo não encontrado</h2>
        <p className="text-xs text-muted-foreground">
          O veículo solicitado não consta na base de dados ou foi removido.
        </p>
        <Link href="/veiculos">
          <Button variant="outline" size="sm" className="mt-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para lista de veículos
          </Button>
        </Link>
      </div>
    );
  }

  const isVehAtivo = veiculo.ativo !== false;

  const handleToggleStatus = () => {
    if (isVehAtivo) {
      deactivateVeiculo(veiculo.id);
      success("Veículo desativado com sucesso. O histórico foi mantido.");
    } else {
      activateVeiculo(veiculo.id);
      success("Veículo reativado com sucesso.");
    }
    setShowToggleStatusModal(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* NAVEGAÇÃO SUPERIOR */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/veiculos" className="hover:text-white flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Veículos</span>
        </Link>
        <span>/</span>
        <span className="text-slate-300 font-medium">{veiculo.modelo} ({veiculo.placa})</span>
      </div>

      {/* 1. TOPO: DADOS DO VEÍCULO E AÇÕES (Requisito 16) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-surface-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Car className="w-6 h-6 text-brand-green" />
              <span>{veiculo.modelo}</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-lg bg-brand-yellow/10 text-brand-yellow-text border border-brand-yellow/20 font-mono font-bold text-sm">
              {veiculo.placa && veiculo.placa !== "---" ? veiculo.placa : "SEM PLACA"}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                isVehAtivo
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-slate-500/10 text-slate-400 border-slate-500/20"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isVehAtivo ? "bg-emerald-400" : "bg-slate-400"}`} />
              <span>{isVehAtivo ? "Veículo Ativo" : "Veículo Inativo"}</span>
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            {veiculo.marca || "Marca não especificada"} • Categoria: <strong className="text-slate-300">{veiculo.tipo}</strong>
            {veiculo.cor ? ` • Cor: ${veiculo.cor}` : ""}
          </p>

          {/* Proprietário */}
          {cliente && (
            <div className="flex items-center gap-3 text-xs pt-1">
              <span className="text-muted-foreground">Proprietário:</span>
              <Link
                href={`/clientes/${cliente.id}`}
                className="font-semibold text-white hover:text-brand-green-text flex items-center gap-1.5 underline underline-offset-4"
              >
                <User className="w-3.5 h-3.5 text-brand-green" />
                <span>{cliente.nome}</span>
              </Link>

              <a
                href={`https://wa.me/55${cliente.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-brand-green-text hover:underline"
              >
                <Phone className="w-3 h-3" />
                <span>{formatPhoneFriendly(cliente.whatsapp)}</span>
              </a>
            </div>
          )}
        </div>

        {/* Ações (Requisitos 16 e 20) */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsNovoAgendamentoOpen(true)}
            leftIcon={<Calendar className="w-4 h-4" />}
          >
            Novo agendamento
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditModalOpen(true)}
            leftIcon={<Edit3 className="w-4 h-4 text-brand-yellow" />}
          >
            Editar veículo
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowToggleStatusModal(true)}
            className={isVehAtivo ? "text-amber-400 hover:text-amber-300" : "text-emerald-400 hover:text-emerald-300"}
            title={isVehAtivo ? "Desativar veículo" : "Reativar veículo"}
          >
            {isVehAtivo ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* 2. RESUMO DO VEÍCULO (Requisito 16) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total de Atendimentos */}
        <div className="p-4 rounded-xl bg-surface border border-surface-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Total de atendimentos</span>
            <Calendar className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-bold text-white">
            {totalAtendimentos}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Registrados no sistema
          </p>
        </div>

        {/* Concluídos */}
        <div className="p-4 rounded-xl bg-surface border border-surface-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Serviços concluídos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-brand-green-text">
            {concluidos}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Entregues com sucesso
          </p>
        </div>

        {/* Último Atendimento */}
        <div className="p-4 rounded-xl bg-surface border border-surface-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Último atendimento</span>
            <Clock className="w-4 h-4 text-brand-yellow" />
          </div>
          <div className="text-sm font-bold text-slate-200 truncate">
            {ultimoAtendimento ? formatDateBR(ultimoAtendimento.data) : "Nenhum"}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {ultimoAtendimento ? `às ${ultimoAtendimento.horario}` : "Sem histórico"}
          </p>
        </div>

        {/* Total Investido */}
        <div className="p-4 rounded-xl bg-surface border border-surface-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Total investido</span>
            <DollarSign className="w-4 h-4 text-brand-green" />
          </div>
          <div className="text-xl font-bold text-brand-green-text">
            {formatCurrency(totalGasto)}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Em serviços realizados
          </p>
        </div>
      </div>

      {/* 3. DADOS ESPECÍFICOS DO VEÍCULO */}
      <section className="p-5 rounded-2xl bg-surface border border-surface-border space-y-4">
        <h2 className="text-sm font-bold text-white tracking-tight uppercase tracking-wider text-muted">
          Ficha do veículo
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground block mb-0.5">Modelo:</span>
            <span className="font-semibold text-white">{veiculo.modelo}</span>
          </div>

          <div>
            <span className="text-muted-foreground block mb-0.5">Marca / Fabricante:</span>
            <span className="text-slate-300">{veiculo.marca || "Não informada"}</span>
          </div>

          <div>
            <span className="text-muted-foreground block mb-0.5">Placa:</span>
            <span className="font-mono font-bold text-brand-yellow-text">
              {veiculo.placa && veiculo.placa !== "---" ? veiculo.placa : "Não informada"}
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block mb-0.5">Cor:</span>
            <span className="text-slate-300">{veiculo.cor || "Não informada"}</span>
          </div>
        </div>

        {veiculo.observacoes && (
          <div className="pt-2 border-t border-surface-border/50 text-xs">
            <span className="text-muted-foreground block mb-1">Observações do veículo:</span>
            <p className="p-3 rounded-xl bg-surface-elevated/50 text-slate-300 italic border border-surface-border/40">
              {veiculo.observacoes}
            </p>
          </div>
        )}
      </section>

      {/* 4. HISTÓRICO DO VEÍCULO (TIMELINE / LISTA CRONOLÓGICA) (Requisito 17) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
            <span>Histórico de atendimentos do veículo</span>
            <span className="text-xs font-normal text-muted-foreground">
              ({agendamentos.length} registros)
            </span>
          </h2>
        </div>

        {agendamentos.length === 0 ? (
          <div className="p-6 rounded-2xl bg-surface border border-surface-border text-center space-y-2">
            <Calendar className="w-8 h-8 text-muted mx-auto" />
            <p className="text-xs text-muted-foreground">
              Este veículo ainda não possui serviços ou agendamentos realizados.
            </p>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsNovoAgendamentoOpen(true)}
              className="text-xs"
            >
              Criar primeiro agendamento
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-surface-border bg-surface overflow-hidden">
            <div className="hidden md:block">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-elevated/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-surface-border">
                  <tr>
                    <th className="p-3">Data e Horário</th>
                    <th className="p-3">Serviço Realizado</th>
                    <th className="p-3">Valor</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/50 text-slate-300">
                  {agendamentos.map((app) => (
                    <tr key={app.id} className="hover:bg-surface-elevated/40 transition-colors">
                      <td className="p-3 font-semibold text-white whitespace-nowrap">
                        {formatDateBR(app.data)} às {app.horario}
                      </td>
                      <td className="p-3">
                        <span className="font-medium text-white">{app.servico_nome}</span>
                        {app.observacoes && (
                          <span className="block text-[10px] text-muted-foreground italic truncate max-w-sm">
                            Obs: {app.observacoes}
                          </span>
                        )}
                      </td>
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
                          <Eye className="w-3 h-3 mr-1" />
                          Detalhes
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile History Cards */}
            <div className="md:hidden divide-y divide-surface-border/50">
              {agendamentos.map((app) => (
                <div key={app.id} className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">
                      {formatDateBR(app.data)} às {app.horario}
                    </span>
                    <StatusBadge status={app.status} size="sm" />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white font-medium">{app.servico_nome}</span>
                    <span className="font-bold text-brand-green-text">
                      {formatCurrency(app.valor)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                    <span>Protocolo: #{app.code || app.id}</span>
                    <button
                      onClick={() => setViewingAgendamento(app)}
                      className="text-brand-green-text font-medium text-xs flex items-center gap-1"
                    >
                      Ver detalhes
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 5. HISTÓRICO DE INSPEÇÕES E CHECK-INS (ETAPA 10 - Requisito 17) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-green" />
            <span>Histórico de Inspeções / Check-ins</span>
            <span className="text-xs font-normal text-muted-foreground">
              ({vehicleCheckins.length} inspeções)
            </span>
          </h2>
        </div>

        {vehicleCheckins.length === 0 ? (
          <div className="p-6 rounded-2xl bg-surface border border-surface-border text-center space-y-2">
            <ShieldCheck className="w-8 h-8 text-muted mx-auto" />
            <p className="text-xs text-muted-foreground">
              Nenhuma vistoria ou check-in formal registrado para este veículo ainda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {vehicleCheckins.map((chk) => {
              const inspectionDate = chk.confirmed_at || chk.created_at;
              const dateStr = inspectionDate
                ? new Date(inspectionDate).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—";
              const damagesCount = chk.damages?.length || 0;
              const photosCount = chk.photos?.length || 0;

              return (
                <div
                  key={chk.id}
                  className="p-4 rounded-xl bg-surface border border-surface-border hover:border-surface-border/80 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-xs">
                          {dateStr}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-green/20 text-brand-green border border-brand-green/30 font-semibold">
                          Vistoriado
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground block mt-0.5">
                        Inspetor: {chk.confirmed_by_name || chk.confirmed_by || "Funcionário"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2 text-brand-yellow hover:text-white border-brand-yellow/30"
                        onClick={() => setViewingCheckin(chk)}
                        title="Ver ficha de entrada"
                      >
                        <Printer className="w-3.5 h-3.5 mr-1" />
                        Ficha
                      </Button>
                      <Link href={`/atendimentos/${chk.appointment_id}`}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs px-2 text-slate-300 hover:text-white"
                          title="Abrir detalhes do atendimento"
                        >
                          <ExternalLink className="w-3.5 h-3.5 mr-1" />
                          Atendimento
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Resumo da Vistoria */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] p-2.5 rounded-lg bg-surface-elevated/60 border border-surface-border/60">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">KM:</span>
                      <span className="font-semibold text-white">
                        {chk.mileage != null ? `${chk.mileage.toLocaleString("pt-BR")} km` : "Não inf."}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Combustível:</span>
                      <span className="font-semibold text-white capitalize">
                        {chk.fuel_level || "Não inf."}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Avarias:</span>
                      <span className={damagesCount > 0 ? "text-amber-400 font-bold" : "text-emerald-400 font-semibold"}>
                        {damagesCount > 0 ? `${damagesCount} detectada(s)` : "Nenhuma"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Fotos:</span>
                      <span className="font-semibold text-white flex items-center gap-1">
                        <Camera className="w-3 h-3 text-muted-foreground" />
                        {photosCount} foto(s)
                      </span>
                    </div>
                  </div>

                  {/* Detalhe das Avarias se houver */}
                  {damagesCount > 0 && chk.damages && (
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-amber-400/90 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        Avarias apontadas:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {chk.damages.map((dmg, idx) => (
                          <span
                            key={dmg.id || idx}
                            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-surface-elevated border border-amber-500/30 text-slate-200"
                          >
                            <span className="text-amber-400 font-medium capitalize">{dmg.location}:</span>
                            <span>{dmg.description || dmg.type}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {chk.objects_left_in_vehicle && (
                    <p className="text-[11px] text-muted-foreground italic">
                      Pertences: {chk.objects_left_in_vehicle}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 6. MODAIS */}
      <EditarVeiculoModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        veiculo={veiculo}
      />

      {/* Novo agendamento já com cliente e veículo pré-selecionados (Requisito 20) */}
      <NovoAgendamentoModal
        isOpen={isNovoAgendamentoOpen}
        onClose={() => setIsNovoAgendamentoOpen(false)}
        initialClienteId={veiculo.cliente_id}
        initialVeiculoId={veiculo.id}
      />

      <DetalhesAgendamentoModal
        isOpen={!!viewingAgendamento}
        onClose={() => setViewingAgendamento(null)}
        agendamento={viewingAgendamento}
      />

      {/* Modal Ficha de Check-in */}
      <FichaCheckinModal
        isOpen={!!viewingCheckin}
        onClose={() => setViewingCheckin(null)}
        checkin={viewingCheckin}
      />

      <Dialog
        isOpen={showToggleStatusModal}
        onClose={() => setShowToggleStatusModal(false)}
        onConfirm={handleToggleStatus}
        title={isVehAtivo ? "Desativar este veículo?" : "Reativar este veículo?"}
        description={
          isVehAtivo
            ? `Tem certeza que deseja desativar o veículo ${veiculo.modelo} (${veiculo.placa})? O histórico de serviços permanecerá registrado.`
            : `Deseja reativar o veículo ${veiculo.modelo}?`
        }
        confirmText={isVehAtivo ? "Desativar" : "Reativar"}
        variant={isVehAtivo ? "danger" : "primary"}
      />
    </div>
  );
}
