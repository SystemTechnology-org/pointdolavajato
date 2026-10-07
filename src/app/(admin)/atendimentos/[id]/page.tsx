"use client";

import React, { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  ShieldCheck,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Printer,
  Play,
  History,
  XCircle,
  Eye,
  DollarSign,
  Sparkles,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { useAppStore } from "@/lib/store";
import { formatCurrency, formatDateBR } from "@/lib/utils";
import { FichaCheckinModal } from "@/components/modals/FichaCheckinModal";
import { RegistrarPagamentoModal } from "@/components/modals/RegistrarPagamentoModal";
import { ConcluirServicoModal } from "@/components/checkout/ConcluirServicoModal";
import { ConferenciaFinalModal } from "@/components/checkout/ConferenciaFinalModal";
import { EntregaVeiculoModal } from "@/components/checkout/EntregaVeiculoModal";
import { ComprovanteEntregaModal } from "@/components/checkout/ComprovanteEntregaModal";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import {
  getDamageTypeLabel,
  getDamageSeverityInfo,
  getFuelLevelLabel,
} from "@/lib/services/checkin";
import {
  computeRealDurationMinutes,
  computeWaitingForPickupMinutes,
} from "@/lib/services/appointments";

export default function AtendimentoDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";

  const {
    agendamentos,
    getCheckinByAppointmentId,
    getStatusHistory,
    getAppointmentPaymentSummary,
    updateAgendamentoStatus,
    canStartAppointment,
  } = useAppStore();

  const { success, error } = useToast();
  const [isFichaOpen, setIsFichaOpen] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  // Modais Etapa 11
  const [isConcluirOpen, setIsConcluirOpen] = useState(false);
  const [isConferenciaOpen, setIsConferenciaOpen] = useState(false);
  const [isEntregaOpen, setIsEntregaOpen] = useState(false);
  const [isComprovanteOpen, setIsComprovanteOpen] = useState(false);
  const [isPagamentoOpen, setIsPagamentoOpen] = useState(false);

  const agendamento = useMemo(() => {
    return agendamentos.find((a) => a.id === id);
  }, [agendamentos, id]);

  const checkin = useMemo(() => {
    return id ? getCheckinByAppointmentId(id) : undefined;
  }, [getCheckinByAppointmentId, id]);

  const history = useMemo(() => {
    return id ? getStatusHistory(id) : [];
  }, [getStatusHistory, id]);

  const paySummary = useMemo(() => {
    return id ? getAppointmentPaymentSummary(id) : undefined;
  }, [getAppointmentPaymentSummary, id]);

  if (!agendamento) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-surface border border-surface-border flex items-center justify-center mx-auto text-muted">
          <XCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">Atendimento não encontrado</h3>
        <p className="text-xs text-muted-foreground">
          O código ou ID informado não corresponde a nenhum agendamento.
        </p>
        <Link href="/atendimentos">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Voltar para Atendimentos
          </Button>
        </Link>
      </div>
    );
  }

  const handleIniciarAtendimento = () => {
    const check = canStartAppointment(agendamento.id);
    if (!check.canStart) {
      error(check.reason || "Check-in do veículo obrigatório antes de iniciar o atendimento!");
      router.push(`/atendimentos/${agendamento.id}/checkin`);
      return;
    }

    try {
      updateAgendamentoStatus(agendamento.id, "Em atendimento");
      success("Atendimento iniciado! Veículo no box.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao alterar status.";
      error(msg);
    }
  };

  const damages = checkin?.damages || [];
  const photos = checkin?.photos || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Header com Navegação e Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-border/60">
        <div className="flex items-center gap-3">
          <Link href="/atendimentos">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <ArrowLeft className="w-4 h-4 text-muted-foreground hover:text-white" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-brand-yellow">
                #{agendamento.code || agendamento.id.slice(-6).toUpperCase()}
              </span>
              <StatusBadge status={agendamento.status} />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
              {agendamento.veiculo_modelo} — {agendamento.servico_nome}
            </h2>
          </div>
        </div>

        {/* Botões Operacionais Rápidos */}
        <div className="flex items-center gap-2 flex-wrap">
          {["Agendado", "Confirmado", "Aguardando"].includes(agendamento.status) && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleIniciarAtendimento}
              leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
              className="bg-brand-green hover:bg-emerald-600 text-black font-bold"
            >
              Iniciar Atendimento
            </Button>
          )}

          {agendamento.status === "Em atendimento" && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsConcluirOpen(true)}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold"
            >
              Concluir Lavagem
            </Button>
          )}

          {agendamento.status === "Concluído" && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsConferenciaOpen(true)}
              leftIcon={<Sparkles className="w-3.5 h-3.5 fill-current" />}
              className="bg-brand-green hover:bg-emerald-600 text-black font-bold shadow-lg shadow-brand-green/20"
            >
              Fazer Conferência / Pronto
            </Button>
          )}

          {(agendamento.status === "Pronto" || agendamento.status === "Aguardando retirada" || agendamento.status === "Aguardando pagamento") && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsEntregaOpen(true)}
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                className="bg-brand-green hover:bg-emerald-600 text-black font-bold shadow-lg shadow-brand-green/20"
              >
                Entregar Veículo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConferenciaOpen(true)}
                leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
              >
                Revisar Inspeção
              </Button>
            </>
          )}

          {(agendamento.status === "Entregue" || agendamento.status === "Finalizado") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsComprovanteOpen(true)}
              leftIcon={<Printer className="w-3.5 h-3.5" />}
            >
              Comprovante de Retirada
            </Button>
          )}

          {checkin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFichaOpen(true)}
              leftIcon={<Printer className="w-3.5 h-3.5" />}
            >
              Ficha de Entrada
            </Button>
          )}
        </div>
      </div>

      {/* 2. SEÇÃO DE CHECK-IN DO VEÍCULO (Requisito 14 & 15) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-surface-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-green/20 border border-brand-green/40 flex items-center justify-center text-brand-green shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Vistoria de Entrada / Check-in</h3>
                {checkin ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-green/20 text-brand-green-text font-bold">
                    ✓ Check-in realizado
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                    Pendente
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {checkin
                  ? `Registrado em ${new Date(checkin.confirmed_at).toLocaleString("pt-BR")} por ${checkin.confirmed_by_name}`
                  : "Nenhum check-in registrado para este agendamento."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!checkin ? (
              <Link href={`/atendimentos/${agendamento.id}/checkin`}>
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-brand-green hover:bg-emerald-600 text-black font-bold"
                  leftIcon={<ShieldCheck className="w-4 h-4" />}
                >
                  Fazer Check-in Agora
                </Button>
              </Link>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFichaOpen(true)}
                  leftIcon={<Eye className="w-3.5 h-3.5" />}
                >
                  Ver Check-in
                </Button>
                {photos.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPhotoIndex(0)}
                    leftIcon={<Camera className="w-3.5 h-3.5" />}
                  >
                    Ver Fotos ({photos.length})
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Detalhes do Check-in se existente */}
        {checkin && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-surface-elevated/40 border border-surface-border">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Quilometragem</span>
                <p className="text-sm font-semibold text-white mt-0.5">
                  {checkin.mileage ? `${checkin.mileage.toLocaleString("pt-BR")} km` : "Não anotado"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-surface-elevated/40 border border-surface-border">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Combustível</span>
                <p className="text-sm font-semibold text-white mt-0.5">
                  {getFuelLevelLabel(checkin.fuel_level)}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-surface-elevated/40 border border-surface-border">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Avarias Apontadas</span>
                <p className="text-sm font-semibold text-amber-400 mt-0.5 flex items-center gap-1">
                  {damages.length > 0 && <AlertTriangle className="w-3.5 h-3.5" />}
                  {damages.length} {damages.length === 1 ? "avaria" : "avarias"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-surface-elevated/40 border border-surface-border">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Fotos Anexadas</span>
                <p className="text-sm font-semibold text-brand-green-text mt-0.5">
                  {photos.length} fotos
                </p>
              </div>
            </div>

            {/* Pertences declarados */}
            {checkin.objects_left_in_vehicle && (
              <div className="p-3 rounded-xl bg-surface-elevated/30 border border-surface-border text-xs">
                <span className="font-semibold text-brand-yellow text-[11px] block mb-0.5">
                  Pertences declarados no veículo:
                </span>
                <p className="text-slate-300 italic">
                  &quot;{checkin.objects_left_in_vehicle}&quot;
                </p>
              </div>
            )}

            {/* Lista resumida de Avarias com Badges */}
            {damages.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs uppercase font-bold text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  Avarias pré-existentes identificadas:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {damages.map((dmg, idx) => {
                    const sev = getDamageSeverityInfo(dmg.severity);
                    return (
                      <div
                        key={dmg.id || idx}
                        className="p-2.5 rounded-xl bg-surface-elevated border border-surface-border text-xs flex items-start justify-between gap-2"
                      >
                        <div className="space-y-0.5">
                          <span className="font-semibold text-white block">
                            {dmg.specific_part || dmg.location} ({getDamageTypeLabel(dmg.type)})
                          </span>
                          <p className="text-[11px] text-muted-foreground">{dmg.description}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${sev.badgeClass}`}>
                          {sev.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mini Galeria de Fotos */}
            {photos.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-slate-300" />
                  Galeria da Vistoria:
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {photos.map((ph, idx) => (
                    <button
                      key={ph.id || idx}
                      type="button"
                      onClick={() => setSelectedPhotoIndex(idx)}
                      className="aspect-video rounded-xl overflow-hidden border border-surface-border hover:border-brand-green transition-all"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ph.photo_url} alt="Vistoria" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Detalhes do Cliente & Veículo & Pagamento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card Cliente & Veículo */}
        <div className="p-4 rounded-2xl bg-surface border border-surface-border space-y-3">
          <h4 className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-300" />
            Dados do Atendimento
          </h4>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-surface-border/60">
              <span className="text-muted-foreground">Cliente:</span>
              <span className="font-semibold text-white">{agendamento.cliente_nome}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-surface-border/60">
              <span className="text-muted-foreground">WhatsApp:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-slate-300">{agendamento.cliente_whatsapp}</span>
                <WhatsAppButton
                  phone={agendamento.cliente_whatsapp}
                  label="Abrir"
                  size="sm"
                  variant="ghost"
                  className="h-6 px-1.5 text-[11px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-surface-border/60">
              <span className="text-muted-foreground">Veículo:</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">{agendamento.veiculo_modelo}</span>
                {agendamento.veiculo_id && (
                  <Link href={`/veiculos/${agendamento.veiculo_id}`} className="text-brand-yellow hover:underline text-[11px]">
                    (Ver Histórico)
                  </Link>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-surface-border/60">
              <span className="text-muted-foreground">Placa:</span>
              <span className="font-mono text-brand-yellow font-bold">
                {agendamento.veiculo_placa && agendamento.veiculo_placa !== "---" ? agendamento.veiculo_placa : "Sem placa"}
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">Horário Agendado:</span>
              <span className="text-slate-300 font-medium">
                {formatDateBR(agendamento.data)} às {agendamento.horario}
              </span>
            </div>
          </div>
        </div>

        {/* Card Financeiro */}
        <div className="p-4 rounded-2xl bg-surface border border-surface-border space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-brand-green" />
              Resumo Financeiro
            </h4>
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-[11px]"
              onClick={() => setIsPagamentoOpen(true)}
            >
              {paySummary && paySummary.remainingBalance > 0 ? "Pagar" : "Ver pagamentos"}
            </Button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-surface-border/60">
              <span className="text-muted-foreground">Serviço Contratado:</span>
              <span className="font-semibold text-white">{agendamento.servico_nome}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-surface-border/60">
              <span className="text-muted-foreground">Valor Total:</span>
              <span className="font-bold text-brand-green-text">{formatCurrency(agendamento.valor)}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-surface-border/60">
              <span className="text-muted-foreground">Total Pago:</span>
              <span className="font-semibold text-white">
                {paySummary ? formatCurrency(paySummary.totalPaid) : "R$ 0,00"}
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">Saldo Pendente:</span>
              <span
                className={`font-bold ${
                  paySummary && paySummary.remainingBalance > 0 ? "text-amber-400" : "text-brand-green-text"
                }`}
              >
                {paySummary ? formatCurrency(paySummary.remainingBalance) : formatCurrency(agendamento.valor)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. SEÇÃO DE CONFERÊNCIA FINAL E ENTREGA DO VEÍCULO (ETAPA 11) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-surface-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Conferência Final & Entrega do Veículo</h3>
                {agendamento.status === "Entregue" ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 font-bold">
                    ✓ Veículo Entregue
                  </span>
                ) : agendamento.status === "Pronto" ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                    ✓ Veículo Pronto
                  </span>
                ) : agendamento.status === "Concluído" ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-bold">
                    Lavagem Concluída
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-400 font-bold">
                    Em execução
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Inspeção de qualidade de saída e registro operacional de devolução ao cliente.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsConferenciaOpen(true)}
              leftIcon={<ShieldCheck className="w-3.5 h-3.5 text-teal-400" />}
            >
              {agendamento.checkout_checklist ? "Ver/Editar Inspeção" : "Fazer Inspeção"}
            </Button>

            {["Pronto", "Aguardando retirada", "Aguardando pagamento"].includes(agendamento.status) && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsEntregaOpen(true)}
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                className="bg-brand-green hover:bg-emerald-600 text-black font-bold"
              >
                Entregar Veículo
              </Button>
            )}

            {["Entregue", "Finalizado"].includes(agendamento.status) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsComprovanteOpen(true)}
                leftIcon={<Printer className="w-3.5 h-3.5" />}
              >
                Comprovante
              </Button>
            )}
          </div>
        </div>

        {/* Detalhes da Conferência & Entrega */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Card Inspeção de Saída */}
          <div className="p-3.5 rounded-xl bg-surface-elevated/40 border border-surface-border space-y-2.5">
            <h5 className="font-bold text-slate-200 flex items-center justify-between">
              <span>Inspeção Técnica de Saída</span>
              <span className="text-[11px] font-mono text-teal-400">
                {agendamento.checkout_checklist
                  ? `${Object.values(agendamento.checkout_checklist).filter(Boolean).length}/7 itens OK`
                  : "Não preenchida"}
              </span>
            </h5>

            {agendamento.final_notes && (
              <p className="text-slate-300 italic p-2 rounded bg-surface/40 border border-surface-border/40 text-[11px]">
                &quot;{agendamento.final_notes}&quot;
              </p>
            )}

            {agendamento.ready_by_name && (
              <p className="text-[11px] text-muted-foreground">
                Inspecionado por: <span className="font-semibold text-white">{agendamento.ready_by_name}</span>
                {agendamento.ready_at && ` em ${new Date(agendamento.ready_at).toLocaleTimeString("pt-BR")}`}
              </p>
            )}
          </div>

          {/* Card Dados da Entrega */}
          <div className="p-3.5 rounded-xl bg-surface-elevated/40 border border-surface-border space-y-2.5">
            <h5 className="font-bold text-slate-200 flex items-center justify-between">
              <span>Entrega ao Cliente</span>
              {agendamento.delivered_at ? (
                <span className="text-[11px] font-mono text-green-400 font-bold">
                  Concluída
                </span>
              ) : (
                <span className="text-[11px] text-amber-300 font-bold">
                  Pendente
                </span>
              )}
            </h5>

            {agendamento.delivered_at ? (
              <div className="space-y-1.5 text-[11px]">
                <p className="text-slate-300">
                  Entregue por: <span className="font-semibold text-white">{agendamento.delivered_by_name || "Equipe"}</span>
                  {` em ${new Date(agendamento.delivered_at).toLocaleString("pt-BR")}`}
                </p>

                {agendamento.final_rating && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-muted-foreground">Avaliação:</span>
                    <span className="text-brand-yellow font-bold">
                      {"★".repeat(agendamento.final_rating)} ({agendamento.final_rating}/5)
                    </span>
                    {agendamento.final_feedback && (
                      <span className="text-slate-300 italic">
                        - &quot;{agendamento.final_feedback}&quot;
                      </span>
                    )}
                  </div>
                )}

                {agendamento.delivery_override_reason && (
                  <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300">
                    <span className="font-bold block text-[10px]">LIBERAÇÃO COM PENDÊNCIA:</span>
                    {agendamento.delivery_override_reason}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground italic">
                O veículo será entregue após conferência técnica e confirmação financeira.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 5. MÉTRICAS OPERACIONAIS E TEMPOS REAIS (ETAPA 11, Requisito 10) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-surface-border space-y-3">
        <h4 className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-brand-green" />
          Métricas de Tempos Operacionais do Atendimento
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* 1. Tempo de Execução no Box */}
          <div className="p-3 rounded-xl bg-surface-elevated/40 border border-surface-border">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">1. Lavagem no Box</span>
            <p className="text-base font-bold text-white mt-1">
              {computeRealDurationMinutes(agendamento.started_at, agendamento.completed_at) !== null
                ? `${computeRealDurationMinutes(agendamento.started_at, agendamento.completed_at)} min`
                : agendamento.started_at
                ? "Em lavagem..."
                : "Não iniciado"}
            </p>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Início até término da lavagem
            </span>
          </div>

          {/* 2. Tempo de Conferência */}
          <div className="p-3 rounded-xl bg-surface-elevated/40 border border-surface-border">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">2. Conferência / Preparação</span>
            <p className="text-base font-bold text-teal-300 mt-1">
              {computeRealDurationMinutes(agendamento.completed_at, agendamento.ready_at) !== null
                ? `${computeRealDurationMinutes(agendamento.completed_at, agendamento.ready_at)} min`
                : agendamento.completed_at
                ? "Em conferência..."
                : "---"}
            </p>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Término até marcar pronto
            </span>
          </div>

          {/* 3. Tempo até Retirada */}
          <div className="p-3 rounded-xl bg-surface-elevated/40 border border-surface-border">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">3. Espera até Retirada</span>
            <p className="text-base font-bold text-cyan-300 mt-1">
              {computeWaitingForPickupMinutes(agendamento.ready_at, agendamento.delivered_at) !== null
                ? `${computeWaitingForPickupMinutes(agendamento.ready_at, agendamento.delivered_at)} min`
                : "---"}
            </p>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Pronto até saída do cliente
            </span>
          </div>

          {/* 4. Tempo Total */}
          <div className="p-3 rounded-xl bg-surface-elevated/40 border border-surface-border">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">4. Tempo Total no Lava-Jato</span>
            <p className="text-base font-bold text-brand-green-text mt-1">
              {computeRealDurationMinutes(agendamento.started_at, agendamento.delivered_at) !== null
                ? `${computeRealDurationMinutes(agendamento.started_at, agendamento.delivered_at)} min`
                : agendamento.started_at
                ? `${Math.max(1, Math.round((Date.now() - new Date(agendamento.started_at).getTime()) / 60000))} min (ativo)`
                : "---"}
            </p>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Tempo integral no estabelecimento
            </span>
          </div>
        </div>
      </div>

      {/* 6. Linha do Tempo / Histórico Operacional */}
      <div className="p-4 rounded-2xl bg-surface border border-surface-border space-y-3">
        <h4 className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-slate-300" />
          Histórico de Alterações de Status
        </h4>

        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-1">
            Criado em {new Date(agendamento.created_at).toLocaleString("pt-BR")}. Nenhuma alteração registrada.
          </p>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div
                key={h.id}
                className="p-2.5 rounded-xl bg-surface-elevated/40 border border-surface-border text-xs flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{new Date(h.changed_at).toLocaleString("pt-BR")}:</span>
                  <span className="font-semibold text-white">{h.new_status}</span>
                  {h.notes && <span className="italic text-slate-400">({h.notes})</span>}
                </div>
                <span className="text-[11px] text-muted-foreground">{h.changed_by || "Sistema"}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modais Operacionais */}
      {checkin && (
        <FichaCheckinModal
          isOpen={isFichaOpen}
          onClose={() => setIsFichaOpen(false)}
          checkin={checkin}
          agendamento={agendamento}
        />
      )}

      {/* Modal Pagamento */}
      {isPagamentoOpen && (
        <RegistrarPagamentoModal
          isOpen={isPagamentoOpen}
          onClose={() => setIsPagamentoOpen(false)}
          agendamento={agendamento}
        />
      )}

      {/* Modal Concluir Serviço */}
      {isConcluirOpen && (
        <ConcluirServicoModal
          isOpen={isConcluirOpen}
          onClose={() => setIsConcluirOpen(false)}
          agendamento={agendamento}
        />
      )}

      {/* Modal Conferência Final */}
      {isConferenciaOpen && (
        <ConferenciaFinalModal
          isOpen={isConferenciaOpen}
          onClose={() => setIsConferenciaOpen(false)}
          agendamento={agendamento}
        />
      )}

      {/* Modal Entrega do Veículo */}
      {isEntregaOpen && (
        <EntregaVeiculoModal
          isOpen={isEntregaOpen}
          onClose={() => setIsEntregaOpen(false)}
          agendamento={agendamento}
          onOpenPagamento={() => setIsPagamentoOpen(true)}
          onOpenComprovante={() => setIsComprovanteOpen(true)}
          onSuccess={() => setIsComprovanteOpen(true)}
        />
      )}

      {/* Modal Comprovante de Entrega */}
      {isComprovanteOpen && (
        <ComprovanteEntregaModal
          isOpen={isComprovanteOpen}
          onClose={() => setIsComprovanteOpen(false)}
          agendamento={agendamento}
        />
      )}

      {/* Modal Lightbox de Foto */}
      {selectedPhotoIndex !== null && photos[selectedPhotoIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
          onClick={() => setSelectedPhotoIndex(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden border border-surface-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[selectedPhotoIndex].photo_url}
              alt="Foto ampliada"
              className="max-h-[80vh] w-auto object-contain"
            />
          </div>
          <p className="text-xs text-slate-300 mt-2">
            Foto {selectedPhotoIndex + 1} de {photos.length} • Toque para fechar
          </p>
        </div>
      )}
    </div>
  );
}
