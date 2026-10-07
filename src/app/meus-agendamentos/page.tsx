"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Calendar,
  Car,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Phone,
  Sparkles,
  ChevronRight,
  Plus,
  RefreshCw,
  LogOut,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAppStore } from "@/lib/store";
import { formatCurrency, formatDateBR } from "@/lib/utils";
import { normalizePhone, formatPhoneFriendly } from "@/lib/services/customers";
import { StatusAgendamento } from "@/types";

interface CustomerAppointmentItem {
  id: string;
  code: string;
  cancel_token?: string;
  cliente_nome: string;
  cliente_whatsapp: string;
  veiculo_tipo: string;
  veiculo_modelo: string;
  veiculo_placa: string;
  servico_nome: string;
  valor: number;
  data: string;
  horario: string;
  status: StatusAgendamento | string;
  observacoes?: string;
}

function MeusAgendamentosContent() {
  const searchParams = useSearchParams();
  const phoneParam = searchParams.get("phone") || "";

  const { agendamentos, cancelAppointment } = useAppStore();

  const [phoneInput, setPhoneInput] = useState("");
  const [activePhone, setActivePhone] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"ativos" | "historico">("ativos");

  // Modal de cancelamento
  const [cancellingApp, setCancellingApp] = useState<CustomerAppointmentItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState<string | null>(null);

  const formatAndSetPhone = (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 11);
    let formatted = raw;
    if (raw.length > 2) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    }
    if (raw.length > 7) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
    }
    setPhoneInput(formatted);
  };

  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    formatAndSetPhone(e.target.value);
  };

  // 2. Consulta de agendamentos
  const handleBuscarAgendamentos = useCallback(
    async (cleanPhoneOverride?: string) => {
      const clean = cleanPhoneOverride || normalizePhone(phoneInput);
      if (clean.length < 10) {
        setErrorMessage("Por favor, digite seu WhatsApp com DDD completo.");
        return;
      }

      setErrorMessage(null);
      setIsLoading(true);

      try {
        // Salva no localStorage para conveniência do cliente no mesmo aparelho
        if (typeof window !== "undefined") {
          localStorage.setItem("pdc_customer_phone", clean);
        }

        // Tenta consultar rota de backend
        const res = await fetch(`/api/customer/appointments?phone=${clean}`).catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          if (data.customer?.full_name) {
            setCustomerName(data.customer.full_name);
          }
        }

        setActivePhone(clean);
      } catch {
        setActivePhone(clean);
      } finally {
        setIsLoading(false);
      }
    },
    [phoneInput]
  );

  // 1. Carregar telefone da URL ou localStorage ao montar o componente
  useEffect(() => {
    let initial = phoneParam;
    if (!initial && typeof window !== "undefined") {
      initial = localStorage.getItem("pdc_customer_phone") || "";
    }

    if (initial) {
      const clean = normalizePhone(initial);
      if (clean.length >= 10) {
        formatAndSetPhone(clean);
        handleBuscarAgendamentos(clean);
      }
    }
  }, [phoneParam, handleBuscarAgendamentos]);

  const handleLimparSessao = () => {
    setActivePhone(null);
    setCustomerName(null);
    setPhoneInput("");
    setErrorMessage(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("pdc_customer_phone");
    }
  };

  // 3. Filtrar agendamentos do cliente (reunindo dados do store local e dados de cliente)
  const clientAppointments: CustomerAppointmentItem[] = useMemo(() => {
    if (!activePhone) return [];

    const cleanActive = normalizePhone(activePhone);
    const matched = agendamentos.filter(
      (a) => normalizePhone(a.cliente_whatsapp) === cleanActive
    );

    // Se o customerName ainda não estiver preenchido, aproveita do agendamento
    if (matched.length > 0 && !customerName) {
      setCustomerName(matched[0].cliente_nome);
    }

    return matched.map((a) => ({
      id: a.id,
      code: a.code || a.id.slice(0, 8),
      cancel_token: a.cancel_token,
      cliente_nome: a.cliente_nome,
      cliente_whatsapp: a.cliente_whatsapp,
      veiculo_tipo: a.veiculo_tipo,
      veiculo_modelo: a.veiculo_modelo,
      veiculo_placa: a.veiculo_placa,
      servico_nome: a.servico_nome,
      valor: a.valor,
      data: a.data,
      horario: a.horario,
      status: a.status,
      observacoes: a.observacoes,
    }));
  }, [agendamentos, activePhone, customerName]);

  // Dividir entre agendamentos ativos e históricos
  const { ativos, historico } = useMemo(() => {
    const activeStatusList = [
      "Agendado",
      "Confirmado",
      "Aguardando",
      "Em andamento",
      "Pronto",
      "Aguardando pagamento",
      "Aguardando retirada",
      "scheduled",
      "confirmed",
      "waiting",
      "in_progress",
      "ready",
      "awaiting_payment",
      "awaiting_pickup",
    ];

    const atv: CustomerAppointmentItem[] = [];
    const hist: CustomerAppointmentItem[] = [];

    clientAppointments.forEach((item) => {
      const s = String(item.status);
      if (activeStatusList.includes(s)) {
        atv.push(item);
      } else {
        hist.push(item);
      }
    });

    // Ordenação: ativos por data ascendente (mais próximo primeiro); histórico por data descendente
    atv.sort((a, b) => `${a.data} ${a.horario}`.localeCompare(`${b.data} ${b.horario}`));
    hist.sort((a, b) => `${b.data} ${b.horario}`.localeCompare(`${a.data} ${a.horario}`));

    return { ativos: atv, historico: hist };
  }, [clientAppointments]);

  // 4. Cancelamento de agendamento pelo cliente
  const handleConfirmarCancelamento = async () => {
    if (!cancellingApp) return;

    setIsCancelling(true);
    try {
      // Chama API segura de cancelamento
      await fetch(`/api/appointments/${cancellingApp.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: cancellingApp.cancel_token,
          phone: activePhone,
          reason: cancelReason.trim() || "Cancelado pelo cliente na área Meus Agendamentos",
        }),
      }).catch(() => null);

      // Atualiza também no store local
      await cancelAppointment(cancellingApp.id, cancelReason.trim() || "Cancelado pelo cliente");

      setCancelSuccessMsg(`O agendamento #${cancellingApp.code} foi cancelado com sucesso.`);
      setCancellingApp(null);
      setCancelReason("");
    } catch {
      await cancelAppointment(cancellingApp.id, cancelReason.trim() || "Cancelado pelo cliente");
      setCancelSuccessMsg(`O agendamento #${cancellingApp.code} foi cancelado.`);
      setCancellingApp(null);
      setCancelReason("");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-slate-100 flex flex-col justify-between py-6 px-4 sm:px-6">
      <div className="max-w-xl w-full mx-auto space-y-6">
        {/* =================================================================== */}
        {/* HEADER: LOGO OFICIAL & BOTÃO NOVO AGENDAMENTO                       */}
        {/* =================================================================== */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-surface-border/60">
          <div className="flex items-center gap-3">
            <Logo size="md" showText={false} href="/agendar" />
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>Point do Coco</span>
                <span className="w-2 h-2 rounded-full bg-brand-yellow" />
              </h1>
              <p className="text-xs text-muted-foreground">
                Área do Cliente • Meus Agendamentos
              </p>
            </div>
          </div>

          <Link href="/agendar">
            <Button
              variant="primary"
              size="sm"
              className="text-xs font-semibold h-9 shadow-md shadow-brand-green/20"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Novo Agendamento
            </Button>
          </Link>
        </header>

        {/* Mensagem de sucesso ao cancelar */}
        {cancelSuccessMsg && (
          <div className="p-3.5 rounded-xl bg-brand-green/10 border border-brand-green/30 text-xs text-brand-green-text flex items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-green shrink-0" />
              <span>{cancelSuccessMsg}</span>
            </div>
            <button
              onClick={() => setCancelSuccessMsg(null)}
              className="text-muted hover:text-white text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* =================================================================== */}
        {/* ETAPA 1: SE O CLIENTE AINDA NÃO SE IDENTIFICOU                      */}
        {/* =================================================================== */}
        {!activePhone ? (
          <div className="p-6 rounded-2xl bg-surface border border-surface-border shadow-xl space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-yellow/10 border border-brand-yellow/20 flex items-center justify-center mx-auto text-brand-yellow">
              <Calendar className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">
                Consulte seus Agendamentos
              </h2>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Informe seu número de WhatsApp para acompanhar o status do seu veículo em tempo real e ver seu histórico.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleBuscarAgendamentos();
              }}
              className="space-y-3.5 max-w-sm mx-auto text-left"
            >
              <Input
                label="Seu WhatsApp"
                placeholder="(71) 99999-9999"
                value={phoneInput}
                onChange={handlePhoneInputChange}
                leftIcon={<Phone className="w-4 h-4" />}
                required
              />

              {errorMessage && (
                <p className="text-xs text-rose-400 font-medium">
                  {errorMessage}
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full text-xs h-11 font-semibold"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Acessar Meus Agendamentos
              </Button>
            </form>

            <div className="pt-2 border-t border-surface-border/50 text-[11px] text-muted">
              Não precisa de senha • Acesso seguro pelo número cadastrado
            </div>
          </div>
        ) : (
          /* =================================================================== */
          /* ETAPA 2: LISTA DE AGENDAMENTOS DO CLIENTE                           */
          /* =================================================================== */
          <div className="space-y-5">
            {/* Barra de Identificação do Cliente */}
            <div className="p-4 rounded-xl bg-surface border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-green/20 border border-brand-green/40 flex items-center justify-center text-brand-green font-bold text-sm">
                  {customerName ? customerName.slice(0, 2).toUpperCase() : "PC"}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">
                    {customerName ? `Olá, ${customerName}!` : "Seus Agendamentos"}
                  </h2>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3 text-brand-green" />
                    <span>{formatPhoneFriendly(activePhone)}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 text-slate-300"
                  onClick={() => handleBuscarAgendamentos(activePhone)}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Atualizar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-8 text-muted hover:text-white"
                  onClick={handleLimparSessao}
                  leftIcon={<LogOut className="w-3.5 h-3.5" />}
                >
                  Trocar
                </Button>
              </div>
            </div>

            {/* Abas: Ativos vs. Histórico */}
            <div className="flex items-center gap-2 border-b border-surface-border/60 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab("ativos")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "ativos"
                    ? "bg-brand-green/20 text-brand-green-text border border-brand-green/30"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                <span>Próximos / Em Andamento</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === "ativos"
                      ? "bg-brand-green text-black"
                      : "bg-surface-elevated text-slate-300"
                  }`}
                >
                  {ativos.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("historico")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "historico"
                    ? "bg-surface-elevated text-white border border-surface-border"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                <span>Histórico de Visitas</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-surface-elevated text-slate-300">
                  {historico.length}
                </span>
              </button>
            </div>

            {/* CONTEÚDO DA ABA ATIVA */}
            {activeTab === "ativos" ? (
              ativos.length === 0 ? (
                <div className="p-8 rounded-2xl bg-surface border border-surface-border text-center space-y-3">
                  <Calendar className="w-10 h-10 text-muted mx-auto opacity-50" />
                  <h3 className="text-sm font-bold text-white">
                    Nenhum agendamento ativo no momento
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Você não possui atendimentos agendados ou em lavagem para os próximos dias.
                  </p>
                  <div className="pt-2">
                    <Link href="/agendar">
                      <Button variant="primary" size="sm" className="text-xs">
                        Agendar Horário Agora
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {ativos.map((app) => {
                    const isReady =
                      app.status === "Pronto" ||
                      app.status === "ready" ||
                      app.status === "Aguardando retirada" ||
                      app.status === "awaiting_pickup";
                    const isInProgress =
                      app.status === "Em andamento" || app.status === "in_progress";

                    return (
                      <div
                        key={app.id}
                        className={`p-4 sm:p-5 rounded-2xl bg-surface border transition-all space-y-3.5 ${
                          isReady
                            ? "border-emerald-500/50 shadow-lg shadow-emerald-500/5 bg-gradient-to-b from-emerald-950/20 to-surface"
                            : isInProgress
                            ? "border-brand-green/40 bg-gradient-to-b from-brand-green/10 to-surface"
                            : "border-surface-border hover:border-surface-border/80"
                        }`}
                      >
                        {/* Alerta de Veículo Pronto */}
                        {isReady && (
                          <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2 font-semibold">
                            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>Seu veículo está PRONTO para ser retirado! 🎉</span>
                          </div>
                        )}

                        {/* Topo: Protocolo e Badge */}
                        <div className="flex items-center justify-between pb-2.5 border-b border-surface-border/60">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted block">
                              Protocolo
                            </span>
                            <span className="text-sm font-mono font-bold text-brand-yellow-text">
                              #{app.code}
                            </span>
                          </div>
                          <StatusBadge status={app.status as StatusAgendamento} />
                        </div>

                        {/* Informações Centrais */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          {/* Data e Horário */}
                          <div className="p-2.5 rounded-lg bg-surface-elevated/60 border border-surface-border/50 space-y-1">
                            <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                              <Calendar className="w-3.5 h-3.5 text-brand-yellow" />
                              <span>Data e Horário</span>
                            </span>
                            <p className="font-bold text-white text-sm">
                              {formatDateBR(app.data)} às {app.horario}
                            </p>
                          </div>

                          {/* Veículo */}
                          <div className="p-2.5 rounded-lg bg-surface-elevated/60 border border-surface-border/50 space-y-1">
                            <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                              <Car className="w-3.5 h-3.5 text-brand-green" />
                              <span>Veículo</span>
                            </span>
                            <p className="font-semibold text-white truncate">
                              {app.veiculo_modelo || app.veiculo_tipo}
                              {app.veiculo_placa && app.veiculo_placa !== "NÃO INFORMADA" && app.veiculo_placa !== "---"
                                ? ` (${app.veiculo_placa})`
                                : ""}
                            </p>
                          </div>
                        </div>

                        {/* Serviço e Valor */}
                        <div className="flex items-center justify-between text-xs py-1 border-t border-surface-border/50">
                          <span className="text-slate-300 font-medium">
                            {app.servico_nome}
                          </span>
                          <span className="font-bold text-brand-green-text text-sm">
                            {formatCurrency(app.valor)}
                          </span>
                        </div>

                        {/* Botões de Ação do Cliente */}
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          <Link
                            href={`/agendamento/${app.id}${
                              app.cancel_token ? `?token=${app.cancel_token}` : ""
                            }`}
                            className="flex-1 min-w-[140px]"
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-xs h-9 text-slate-200 hover:text-white"
                              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                            >
                              Ver Detalhes
                            </Button>
                          </Link>

                          {/* WhatsApp do Lava Jato com contexto */}
                          <a
                            href={`https://wa.me/5571992887645?text=${encodeURIComponent(
                              `Olá, Point do Coco! Gostaria de informações sobre meu agendamento (#${app.code}) do veículo ${app.veiculo_modelo} para o dia ${formatDateBR(app.data)}.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 min-w-[140px]"
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full text-xs h-9 text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20"
                              leftIcon={<Phone className="w-3.5 h-3.5" />}
                            >
                              Falar no WhatsApp
                            </Button>
                          </a>

                          {/* Cancelar se ainda não iniciado */}
                          {(app.status === "Agendado" ||
                            app.status === "Confirmado" ||
                            app.status === "scheduled" ||
                            app.status === "confirmed") && (
                            <button
                              type="button"
                              onClick={() => setCancellingApp(app)}
                              className="text-xs text-rose-400 hover:text-rose-300 hover:underline px-2 py-1"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* ABA HISTÓRICO */
              historico.length === 0 ? (
                <div className="p-8 rounded-2xl bg-surface border border-surface-border text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-muted mx-auto opacity-50" />
                  <h3 className="text-sm font-bold text-white">Nenhum atendimento anterior</h3>
                  <p className="text-xs text-muted-foreground">
                    Seus atendimentos finalizados aparecerão aqui para consulta futura.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historico.map((app) => (
                    <div
                      key={app.id}
                      className="p-4 rounded-xl bg-surface border border-surface-border/70 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-surface-border/50">
                        <span className="font-mono font-semibold text-slate-300">
                          #{app.code}
                        </span>
                        <StatusBadge status={app.status as StatusAgendamento} />
                      </div>

                      <div className="flex justify-between items-center text-slate-200">
                        <span>
                          {formatDateBR(app.data)} às {app.horario}
                        </span>
                        <span className="font-bold text-brand-green-text">
                          {formatCurrency(app.valor)}
                        </span>
                      </div>

                      <div className="text-muted-foreground">
                        {app.veiculo_modelo} • {app.servico_nome}
                      </div>

                      <div className="pt-1 flex items-center justify-between">
                        <Link
                          href={`/agendamento/${app.id}${
                            app.cancel_token ? `?token=${app.cancel_token}` : ""
                          }`}
                          className="text-brand-yellow hover:underline text-[11px] inline-flex items-center gap-1"
                        >
                          <span>Ver comprovante</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>

                        <Link
                          href={`/agendar`}
                          className="text-slate-300 hover:text-white text-[11px] font-medium"
                        >
                          Agendar novamente →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}

        {/* Modal de Confirmação de Cancelamento */}
        {cancellingApp && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-sm w-full p-5 rounded-2xl bg-surface border border-surface-border space-y-4">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5" />
                <span>Cancelar Agendamento</span>
              </div>

              <p className="text-xs text-muted-foreground">
                Tem certeza que deseja cancelar o agendamento{" "}
                <strong className="text-white">#{cancellingApp.code}</strong> para o dia{" "}
                <strong className="text-white">{formatDateBR(cancellingApp.data)}</strong>? O horário será liberado para outros clientes.
              </p>

              <Input
                label="Motivo do cancelamento (opcional)"
                placeholder="Ex: Imprevisto, reagendarei depois"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />

              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-1/2 text-xs"
                  onClick={() => setCancellingApp(null)}
                  disabled={isCancelling}
                >
                  Voltar
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  className="w-1/2 text-xs font-semibold"
                  onClick={handleConfirmarCancelamento}
                  isLoading={isCancelling}
                >
                  Confirmar Cancelamento
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center text-[11px] text-muted space-y-1 pt-6 border-t border-surface-border/40">
          <p className="flex items-center justify-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-brand-yellow" />
            <span>Entrada do bosque Guaraípe, Litoral Norte - BA</span>
          </p>
          <p>Point do Coco Lava Jato • Todos os direitos reservados</p>
        </footer>
      </div>
    </div>
  );
}

export default function MeusAgendamentosPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-brand-black flex items-center justify-center p-4">
          <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <MeusAgendamentosContent />
    </Suspense>
  );
}

