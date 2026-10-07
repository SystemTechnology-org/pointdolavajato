"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Car,
  Bike,
  Truck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Phone,
  Clock,
  MapPin,
  AlertCircle,
  Plus,
  Sparkles,
  Calendar,
} from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAppStore } from "@/lib/store";
import {
  TipoVeiculo,
  TIPOS_VEICULO,
  Servico,
  MAP_TIPO_TO_DB,
  MAP_DB_TO_TIPO,
} from "@/types";
import { VehicleType } from "@/types/database";
import { formatCurrency, formatDateBR } from "@/lib/utils";
import { normalizePhone } from "@/lib/services/customers";
import { getTodayDateString } from "@/lib/initialData";

interface ExistingVehicle {
  id: string;
  vehicle_type: VehicleType;
  brand?: string | null;
  model: string;
  color?: string | null;
  plate?: string | null;
}

export default function AgendamentoPublicoPage() {
  const {
    servicos,
    addAgendamento,
    getAvailableSlotsForDate,
    findCustomerByPhone,
    businessHours,
  } = useAppStore();

  // Passos: 1 = Identificação, 2 = Veículo, 3 = Serviço, 4 = Data, 5 = Horário, 6 = Resumo, 7 = Sucesso
  const [step, setStep] = useState<number>(1);

  // Identificação do Cliente
  const [phoneInput, setPhoneInput] = useState("");
  const [isSearchingPhone, setIsSearchingPhone] = useState(false);
  const [customerFound, setCustomerFound] = useState<boolean | null>(null);
  const [existingCustomerId, setExistingCustomerId] = useState<string | null>(null);
  const [existingVehicles, setExistingVehicles] = useState<ExistingVehicle[]>([]);
  const [useExistingVehicle, setUseExistingVehicle] = useState(false);
  const [selectedExistingVehicleId, setSelectedExistingVehicleId] = useState<string>("");

  // Dados do Cliente
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");

  // Dados do Veículo
  const [selectedVeiculoTipo, setSelectedVeiculoTipo] = useState<TipoVeiculo | null>(null);
  const [veiculoMarca, setVeiculoMarca] = useState("");
  const [veiculoModelo, setVeiculoModelo] = useState("");
  const [veiculoCor, setVeiculoCor] = useState("");
  const [veiculoPlaca, setVeiculoPlaca] = useState("");
  const [veiculoObservacoes, setVeiculoObservacoes] = useState("");

  // Serviço
  const [selectedServico, setSelectedServico] = useState<Servico | null>(null);

  // Data e Horário
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedHorario, setSelectedHorario] = useState<string>("");
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<{ time: string; endTime: string }[]>([]);
  const [isDayOpen, setIsDayOpen] = useState(true);
  const [closedReason, setClosedReason] = useState<string | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Estado de submissão e confirmação
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedProtocol, setConfirmedProtocol] = useState("");
  const [confirmedCancelToken, setConfirmedCancelToken] = useState("");
  const [createdAppointmentId, setCreatedAppointmentId] = useState("");

  // Formatação amigável do WhatsApp no input
  const handlePhoneChange = (val: string) => {
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

  // 1. Busca por cliente ao digitar WhatsApp
  const handleContinuarIdentificacao = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const clean = normalizePhone(phoneInput);
    if (clean.length < 10) {
      setErrorMessage("Por favor, digite seu WhatsApp com DDD completo.");
      return;
    }

    setIsSearchingPhone(true);
    setWhatsapp(phoneInput);

    try {
      // 1. Primeiro checar no store local
      const localResult = findCustomerByPhone(clean);

      if (localResult.customer) {
        setCustomerFound(true);
        setExistingCustomerId(localResult.customer.id);
        setNome(localResult.customer.full_name);
        setEmail(localResult.customer.email || "");

        const vehs = localResult.vehicles || [];
        setExistingVehicles(vehs);
        if (vehs.length > 0) {
          setUseExistingVehicle(true);
          setSelectedExistingVehicleId(vehs[0].id);
          const tipo = MAP_DB_TO_TIPO[vehs[0].vehicle_type as VehicleType] || "Carro pequeno";
          setSelectedVeiculoTipo(tipo);
          setVeiculoModelo(vehs[0].model);
          setVeiculoPlaca(vehs[0].plate || "");
          setVeiculoMarca(vehs[0].brand || "");
          setVeiculoCor(vehs[0].color || "");
        } else {
          setUseExistingVehicle(false);
        }
        setStep(2);
        return;
      }

      // 2. Se não encontrou no local, checar na API caso Supabase esteja configurado
      const res = await fetch(`/api/public-booking/check-customer?phone=${clean}`).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        if (data.exists && data.customer) {
          setCustomerFound(true);
          setExistingCustomerId(data.customer.id);
          setNome(data.customer.full_name);
          const vehs = data.customer.vehicles || [];
          setExistingVehicles(vehs);
          if (vehs.length > 0) {
            setUseExistingVehicle(true);
            setSelectedExistingVehicleId(vehs[0].id);
            const tipo = MAP_DB_TO_TIPO[vehs[0].vehicle_type as VehicleType] || "Carro pequeno";
            setSelectedVeiculoTipo(tipo);
            setVeiculoModelo(vehs[0].model);
            setVeiculoPlaca(vehs[0].plate || "");
            setVeiculoMarca(vehs[0].brand || "");
            setVeiculoCor(vehs[0].color || "");
          } else {
            setUseExistingVehicle(false);
          }
          setStep(2);
          return;
        }
      }

      // Novo cliente
      setCustomerFound(false);
      setExistingCustomerId(null);
      setExistingVehicles([]);
      setUseExistingVehicle(false);
      setStep(2);
    } catch (err) {
      console.warn("Erro ao buscar cliente, prosseguindo como novo:", err);
      setCustomerFound(false);
      setStep(2);
    } finally {
      setIsSearchingPhone(false);
    }
  };

  // Serviços compatíveis com o veículo selecionado
  const servicosCompativeis = useMemo(() => {
    if (!selectedVeiculoTipo) return [];
    return servicos.filter(
      (s) => s.ativo && s.tipo_veiculo === selectedVeiculoTipo
    );
  }, [servicos, selectedVeiculoTipo]);

  // Próximos 7 dias para seleção rápida
  const nextDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dayNum = String(d.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${dayNum}`;

      const label =
        i === 0
          ? "Hoje"
          : i === 1
          ? "Amanhã"
          : new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(d);

      const formattedDay = new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
      }).format(d);

      // Checar se o dia é aberto no business_hours
      const dayOfWeek = d.getDay();
      const hourCfg = businessHours.find((h) => h.day_of_week === dayOfWeek);
      const isOpen = hourCfg ? hourCfg.is_open : dayOfWeek !== 0;

      return { dateStr, label, formattedDay, isOpen };
    });
  }, [businessHours]);

  // Recalcular horários disponíveis sempre que a data ou duração do serviço mudar
  useEffect(() => {
    if (!selectedDate || !selectedServico) return;

    setIsLoadingSlots(true);
    setSelectedHorario("");
    setErrorMessage(null);

    const duration = selectedServico.duracao_minutos || 45;
    const availability = getAvailableSlotsForDate(selectedDate, duration);

    setIsDayOpen(availability.isOpen);
    setClosedReason(availability.reason || null);

    if (availability.isOpen && availability.slots) {
      const validSlots = availability.slots
        .filter((s) => s.available)
        .map((s) => ({ time: s.time, endTime: s.endTime }));
      setHorariosDisponiveis(validSlots);
    } else {
      setHorariosDisponiveis([]);
    }

    setIsLoadingSlots(false);
  }, [selectedDate, selectedServico, getAvailableSlotsForDate]);

  // Tratar seleção de veículo existente
  const handleSelectExistingVehicle = (vehId: string) => {
    setSelectedExistingVehicleId(vehId);
    const veh = existingVehicles.find((v) => v.id === vehId);
    if (veh) {
      const tipo = MAP_DB_TO_TIPO[veh.vehicle_type as VehicleType] || "Carro pequeno";
      setSelectedVeiculoTipo(tipo);
      setVeiculoModelo(veh.model);
      setVeiculoPlaca(veh.plate || "");
      setVeiculoMarca(veh.brand || "");
      setVeiculoCor(veh.color || "");
      setSelectedServico(null); // Resetar serviço pois o tipo de veículo pode ter mudado
    }
  };

  // Confirmação final com proteção contra duplo envio e concorrência (Requisitos 11, 17, 31)
  const handleConfirmarAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!nome.trim() || !whatsapp.trim()) {
      setErrorMessage("Por favor, preencha seus dados de identificação.");
      setStep(1);
      return;
    }

    if (!selectedVeiculoTipo) {
      setErrorMessage("Selecione a categoria do seu veículo.");
      setStep(2);
      return;
    }

    if (!selectedServico) {
      setErrorMessage("Selecione um serviço para o atendimento.");
      setStep(3);
      return;
    }

    if (!selectedDate || !selectedHorario) {
      setErrorMessage("Escolha uma data e horário disponíveis.");
      setStep(selectedDate ? 5 : 4);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Chamar rota segura do backend (re-valida concorrência e sobreposição)
      const res = await fetch("/api/public-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: existingCustomerId || undefined,
          vehicle_id: (useExistingVehicle && selectedExistingVehicleId) ? selectedExistingVehicleId : undefined,
          full_name: nome.trim(),
          phone: whatsapp.trim(),
          email: email.trim() || undefined,
          vehicle_type: MAP_TIPO_TO_DB[selectedVeiculoTipo],
          brand: veiculoMarca.trim() || undefined,
          model: veiculoModelo.trim() || selectedVeiculoTipo,
          color: veiculoCor.trim() || undefined,
          plate: veiculoPlaca.trim().toUpperCase() || undefined,
          notes: veiculoObservacoes.trim() || undefined,
          service_id: selectedServico.id,
          scheduled_date: selectedDate,
          start_time: selectedHorario,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Não foi possível confirmar este horário. Escolha outro horário.");
      }

      const protocol = data.appointment?.code || `#PC-${Date.now().toString().slice(-6)}`;
      const cancelToken = data.appointment?.cancel_token || "";
      const appointmentId = data.appointment?.id || `agd-${Date.now()}`;

      // 2. Sincronizar também no Store local
      try {
        addAgendamento({
          cliente_nome: nome.trim(),
          cliente_whatsapp: whatsapp.trim(),
          veiculo_tipo: selectedVeiculoTipo,
          veiculo_modelo: veiculoModelo.trim() || `${selectedVeiculoTipo}`,
          veiculo_placa: veiculoPlaca.trim().toUpperCase() || "NÃO INFORMADA",
          servico_id: selectedServico.id,
          servico_nome: selectedServico.nome,
          valor: selectedServico.preco, // SNAPSHOT HISTÓRICO
          data: selectedDate,
          horario: selectedHorario,
          status: "Agendado",
          code: protocol,
          cancel_token: cancelToken,
          observacoes: veiculoObservacoes.trim() || "Agendado pelo cliente via celular",
        });
      } catch (storeErr) {
        console.warn("Store local sincronizado via backend.", storeErr);
      }

      setConfirmedProtocol(protocol);
      setConfirmedCancelToken(cancelToken);
      setCreatedAppointmentId(appointmentId);
      setStep(7); // Tela de Sucesso
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao agendar horário. Por favor selecione outro horário.";
      setErrorMessage(msg);
      // Se for erro de conflito, redirecionar para seleção de horário
      if (msg.includes("reservado") || msg.includes("conflito") || msg.includes("ocupado")) {
        setStep(5);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getVehicleIcon = (tipo: TipoVeiculo) => {
    switch (tipo) {
      case "Moto":
        return <Bike className="w-6 h-6 text-brand-yellow" />;
      case "Carro pequeno":
        return <Car className="w-6 h-6 text-brand-green" />;
      case "SUV":
        return <Car className="w-7 h-7 text-sky-400" />;
      case "Caminhonete":
        return <Truck className="w-7 h-7 text-amber-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-slate-100 flex flex-col justify-between py-5 px-3.5 sm:px-6">
      <div className="max-w-md w-full mx-auto space-y-5">
        {/* Header com Logo e Acesso a Meus Agendamentos */}
        <header className="flex items-center justify-between pt-1 pb-3 border-b border-surface-border/50">
          <div className="flex items-center gap-2.5">
            <Logo size="sm" showText={false} href="/agendar" />
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>Point do Coco</span>
                <span className="w-2 h-2 rounded-full bg-brand-yellow" />
              </h1>
              <p className="text-[10px] text-muted-foreground">
                Lava Jato Litoral • Guaraípe
              </p>
            </div>
          </div>

          <Link
            href="/meus-agendamentos"
            className="text-xs text-brand-yellow hover:text-white flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-brand-yellow/30 bg-brand-yellow/10 hover:bg-brand-yellow/20 transition-all font-medium"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Meus Agendamentos</span>
          </Link>
        </header>

        {/* ========================================================================= */}
        {/* TELA DE SUCESSO / CONFIRMAÇÃO (PASSO 7)                                    */}
        {/* ========================================================================= */}
        {step === 7 ? (
          <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-brand-green/30 text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-13 h-13 rounded-full bg-brand-green/20 border border-brand-green/40 flex items-center justify-center mx-auto text-brand-green">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Agendamento Confirmado!
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Aguardamos seu veículo no Point do Coco.
              </p>
            </div>

            {/* Protocolo Amigável */}
            <div className="p-3 rounded-xl bg-surface-elevated border border-surface-border text-center">
              <span className="text-[10px] uppercase font-semibold text-muted block">
                Identificador do Agendamento
              </span>
              <span className="text-base font-mono font-bold text-brand-yellow-text">
                #{confirmedProtocol}
              </span>
            </div>

            {/* Resumo do Atendimento */}
            <div className="p-4 rounded-xl bg-surface-elevated/70 border border-surface-border text-left space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-surface-border/50">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-semibold text-white">{nome}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-surface-border/50">
                <span className="text-muted-foreground">Veículo:</span>
                <span className="font-semibold text-white">
                  {selectedVeiculoTipo} {veiculoPlaca && veiculoPlaca !== "NÃO INFORMADA" ? `(${veiculoPlaca.toUpperCase()})` : ""}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-surface-border/50">
                <span className="text-muted-foreground">Serviço:</span>
                <span className="font-semibold text-white">{selectedServico?.nome}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-surface-border/50">
                <span className="text-muted-foreground">Dia e Horário:</span>
                <span className="font-bold text-brand-yellow-text">
                  {formatDateBR(selectedDate)} às {selectedHorario}
                </span>
              </div>
              <div className="flex justify-between pt-1 text-sm">
                <span className="font-medium text-slate-300">Valor total:</span>
                <span className="font-bold text-brand-green-text">
                  {formatCurrency(selectedServico?.preco || 0)}
                </span>
              </div>
            </div>

            {/* Endereço */}
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 text-brand-yellow shrink-0" />
              <span>Entrada do bosque Guaraípe, Litoral Norte</span>
            </div>

            {/* Ações */}
            <div className="space-y-2.5 pt-2">
              <a
                href={`https://wa.me/5571992887645?text=${encodeURIComponent(
                  `Olá! Confirmei meu agendamento no Point do Coco (${confirmedProtocol}) para um(a) ${selectedServico?.nome} no dia ${formatDateBR(selectedDate)} às ${selectedHorario}. Meu nome é ${nome}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full block"
              >
                <Button variant="primary" className="w-full text-xs h-11">
                  <Phone className="w-4 h-4 mr-2" />
                  Abrir no WhatsApp do Lava Jato
                </Button>
              </a>

              <Link
                href={`/agendamento/${createdAppointmentId}?token=${confirmedCancelToken}`}
                className="w-full block"
              >
                <Button variant="outline" className="w-full text-xs h-10 text-slate-300">
                  Visualizar / Gerenciar meu Agendamento
                </Button>
              </Link>

              <Link
                href={`/meus-agendamentos${whatsapp ? `?phone=${normalizePhone(whatsapp)}` : ""}`}
                className="w-full block"
              >
                <Button variant="ghost" className="w-full text-xs h-9 text-brand-yellow hover:text-white hover:bg-brand-yellow/10">
                  Ver todos os meus agendamentos →
                </Button>
              </Link>

              <Button
                variant="ghost"
                className="w-full text-xs text-muted-foreground hover:text-white"
                onClick={() => {
                  setStep(1);
                  setSelectedHorario("");
                  setSelectedServico(null);
                  setErrorMessage(null);
                }}
              >
                Fazer outro agendamento
              </Button>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* FLUXO PASSO A PASSO (1 a 6)                                               */
          /* ========================================================================= */
          <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-surface-border space-y-4">
            {/* Barra de Progresso Superior */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">
                  Passo {step} de 6
                </span>
                <span className="text-muted-foreground text-[11px]">
                  {step === 1 && "Identificação"}
                  {step === 2 && "Veículo"}
                  {step === 3 && "Serviço"}
                  {step === 4 && "Data"}
                  {step === 5 && "Horário"}
                  {step === 6 && "Resumo"}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-surface-elevated overflow-hidden">
                <div
                  className="h-full bg-brand-green rounded-full transition-all duration-300"
                  style={{ width: `${(step / 6) * 100}%` }}
                />
              </div>
            </div>

            {/* Mensagem de Erro Global */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2 text-xs text-red-200 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* ===================================================================== */}
            {/* PASSO 1: IDENTIFICAÇÃO DO CLIENTE (Requisitos 3, 4, 5)                */}
            {/* ===================================================================== */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Agende seu atendimento
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Escolha o serviço, o veículo e o melhor horário para você.
                  </p>
                </div>

                <form onSubmit={handleContinuarIdentificacao} className="space-y-3 pt-1">
                  <Input
                    label="WhatsApp *"
                    placeholder="(71) 99999-9999"
                    value={phoneInput}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    type="tel"
                    required
                  />

                  <p className="text-[11px] text-muted-foreground">
                    Sem senhas. Se você já foi atendido aqui, recuperamos seus dados automaticamente.
                  </p>

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full h-11 text-xs font-semibold"
                    disabled={isSearchingPhone || normalizePhone(phoneInput).length < 10}
                  >
                    {isSearchingPhone ? "Buscando dados..." : "Continuar"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              </div>
            )}

            {/* ===================================================================== */}
            {/* PASSO 2: VEÍCULO & DADOS (Requisitos 4, 5, 6)                         */}
            {/* ===================================================================== */}
            {step === 2 && (
              <div className="space-y-4">
                {/* Se cliente existente */}
                {customerFound ? (
                  <div className="p-3 rounded-xl bg-brand-green/10 border border-brand-green/30 space-y-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-brand-green shrink-0" />
                      <span className="text-xs font-bold text-brand-green-text">
                        Encontramos seus dados!
                      </span>
                    </div>
                    <p className="text-xs text-slate-200">
                      Olá, <span className="font-semibold text-white">{nome}</span>. Selecione seu veículo cadastrado ou adicione um novo.
                    </p>

                    {existingVehicles.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Seus veículos cadastrados:</span>
                        </div>

                        {existingVehicles.map((veh) => {
                          const isSelected = useExistingVehicle && selectedExistingVehicleId === veh.id;
                          return (
                            <button
                              key={veh.id}
                              type="button"
                              onClick={() => {
                                setUseExistingVehicle(true);
                                handleSelectExistingVehicle(veh.id);
                              }}
                              className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between transition-all ${
                                isSelected
                                  ? "bg-brand-green/20 border-brand-green text-white"
                                  : "bg-surface-elevated/70 border-surface-border text-slate-300 hover:border-slate-600"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? "border-brand-green bg-brand-green" : "border-slate-500"}`}>
                                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                                </div>
                                <div>
                                  <p className="text-xs font-semibold">{veh.model} {veh.plate ? `(${veh.plate})` : ""}</p>
                                  <p className="text-[10px] text-muted-foreground">{MAP_DB_TO_TIPO[veh.vehicle_type as VehicleType] || veh.vehicle_type}</p>
                                </div>
                              </div>
                              <span className="text-[11px] text-slate-400 font-medium">Usar</span>
                            </button>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() => {
                            setUseExistingVehicle(false);
                            setSelectedExistingVehicleId("");
                            setSelectedVeiculoTipo("Carro pequeno");
                            setVeiculoModelo("");
                            setVeiculoPlaca("");
                          }}
                          className={`w-full p-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                            !useExistingVehicle
                              ? "bg-brand-green/15 border-brand-green text-white"
                              : "bg-surface-elevated/30 border-surface-border text-slate-400 hover:text-white"
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5 text-brand-green" />
                          <span>+ Adicionar outro veículo</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Novo Cliente: Solicitar Nome */
                  <div className="space-y-3">
                    <div className="text-center space-y-0.5">
                      <h2 className="text-base font-bold text-white">Seus dados</h2>
                      <p className="text-xs text-muted-foreground">Preencha seus dados para vincular ao agendamento</p>
                    </div>

                    <Input
                      label="Nome completo *"
                      placeholder="Ex: Maria Pereira"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      required
                    />

                    <Input
                      label="Email (opcional)"
                      placeholder="seuemail@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                    />
                  </div>
                )}

                {/* Se estiver cadastrando ou alterando veículo */}
                {(!customerFound || !useExistingVehicle || existingVehicles.length === 0) && (
                  <div className="space-y-3 pt-2 border-t border-surface-border">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Categoria do Veículo *
                    </label>

                    <div className="grid grid-cols-2 gap-2.5">
                      {TIPOS_VEICULO.map((tipo) => {
                        const isSelected = selectedVeiculoTipo === tipo;
                        return (
                          <button
                            key={tipo}
                            type="button"
                            onClick={() => {
                              setSelectedVeiculoTipo(tipo);
                              setSelectedServico(null);
                            }}
                            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-center transition-all min-h-[90px] active:scale-[0.98] ${
                              isSelected
                                ? "bg-brand-green/15 border-brand-green text-white shadow-sm"
                                : "bg-surface-elevated/40 border-surface-border text-slate-300 hover:border-slate-600"
                            }`}
                          >
                            {getVehicleIcon(tipo)}
                            <span className="text-xs font-semibold">{tipo}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Dados opcionais do veículo */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <Input
                        label="Modelo do veículo"
                        placeholder="Ex: Civic, Corolla, Hilux"
                        value={veiculoModelo}
                        onChange={(e) => setVeiculoModelo(e.target.value)}
                      />
                      <Input
                        label="Placa (opcional)"
                        placeholder="Ex: BRA2E19"
                        value={veiculoPlaca}
                        onChange={(e) => setVeiculoPlaca(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Navegação */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-1/3 text-xs h-11"
                    onClick={() => setStep(1)}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    className="w-2/3 text-xs h-11 font-semibold"
                    disabled={!nome.trim() || !selectedVeiculoTipo}
                    onClick={() => {
                      if (!nome.trim()) {
                        setErrorMessage("Informe seu nome completo.");
                        return;
                      }
                      if (!selectedVeiculoTipo) {
                        setErrorMessage("Escolha a categoria do seu veículo.");
                        return;
                      }
                      setErrorMessage(null);
                      setStep(3);
                    }}
                  >
                    Continuar para Serviços
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ===================================================================== */}
            {/* PASSO 3: SERVIÇOS COMPATÍVEIS (Requisitos 7, 8)                       */}
            {/* ===================================================================== */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="text-center space-y-0.5">
                  <h2 className="text-base font-bold text-white">Escolha o serviço</h2>
                  <p className="text-xs text-muted-foreground">
                    Serviços compatíveis para <span className="font-semibold text-brand-green-text">{selectedVeiculoTipo}</span>
                  </p>
                </div>

                {servicosCompativeis.length === 0 ? (
                  <div className="p-4 rounded-xl bg-surface-elevated text-center text-xs text-muted-foreground">
                    Nenhum serviço disponível no momento para esta categoria de veículo.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {servicosCompativeis.map((srv) => {
                      const isSelected = selectedServico?.id === srv.id;
                      return (
                        <div
                          key={srv.id}
                          onClick={() => setSelectedServico(srv)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? "bg-brand-green/10 border-brand-green shadow-sm ring-1 ring-brand-green/30"
                              : "bg-surface-elevated/40 border-surface-border text-slate-300 hover:border-slate-600 hover:bg-surface-elevated"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">{srv.nome}</span>
                              </div>
                              {srv.descricao && (
                                <p className="text-[11px] text-muted-foreground line-clamp-2">
                                  {srv.descricao}
                                </p>
                              )}
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-0.5">
                                <Clock className="w-3 h-3 text-brand-yellow" />
                                <span>Duração: ~{srv.duracao_minutos} min</span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-sm font-bold text-brand-green-text block">
                                {formatCurrency(srv.preco)}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-medium inline-block mt-1 ${
                                  isSelected
                                    ? "bg-brand-green text-black font-bold"
                                    : "bg-surface border border-surface-border text-slate-400"
                                }`}
                              >
                                {isSelected ? "Selecionado" : "Selecionar"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Destaque do serviço selecionado */}
                {selectedServico && (
                  <div className="p-3 rounded-xl bg-surface-elevated border border-brand-green/30 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Escolhido:</span>
                      <span className="font-semibold text-white">{selectedServico.nome}</span>
                    </div>
                    <span className="font-bold text-brand-green-text text-sm">
                      {formatCurrency(selectedServico.preco)}
                    </span>
                  </div>
                )}

                {/* Navegação */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-1/3 text-xs h-11"
                    onClick={() => setStep(2)}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    className="w-2/3 text-xs h-11 font-semibold"
                    disabled={!selectedServico}
                    onClick={() => {
                      setErrorMessage(null);
                      setStep(4);
                    }}
                  >
                    Continuar para Data
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ===================================================================== */}
            {/* PASSO 4: DATA DO ATENDIMENTO (Requisito 9, 14)                         */}
            {/* ===================================================================== */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="text-center space-y-0.5">
                  <h2 className="text-base font-bold text-white">Escolha o dia</h2>
                  <p className="text-xs text-muted-foreground">
                    Atendimentos de segunda a sábado (domingos fechado)
                  </p>
                </div>

                {/* Seletor rápido de dias em chips confortáveis */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {nextDays.map((d) => {
                    const isSelected = selectedDate === d.dateStr;
                    return (
                      <button
                        key={d.dateStr}
                        type="button"
                        disabled={!d.isOpen}
                        onClick={() => setSelectedDate(d.dateStr)}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          !d.isOpen
                            ? "opacity-40 bg-surface/20 border-surface-border/30 cursor-not-allowed text-muted"
                            : isSelected
                            ? "bg-brand-green/15 border-brand-green text-white shadow-sm ring-1 ring-brand-green/40"
                            : "bg-surface-elevated/40 border-surface-border text-slate-300 hover:border-slate-600 hover:bg-surface-elevated"
                        }`}
                      >
                        <span className="text-[11px] uppercase font-semibold block text-muted-foreground">
                          {d.label}
                        </span>
                        <span className="text-xs font-bold text-white block mt-0.5">
                          {d.formattedDay}
                        </span>
                        {!d.isOpen && (
                          <span className="text-[9px] text-red-400 block mt-0.5">Fechado</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Ou escolher outra data específica */}
                <div className="pt-2">
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Ou selecione outra data:
                  </label>
                  <input
                    type="date"
                    min={getTodayDateString()}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-surface-elevated border border-surface-border text-xs text-white [color-scheme:dark] cursor-pointer"
                  />
                </div>

                {/* Verificação se o dia selecionado é fechado */}
                {!isDayOpen && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>{closedReason || "Não realizamos atendimentos nesta data. Por favor, escolha outro dia."}</span>
                  </div>
                )}

                {/* Navegação */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-1/3 text-xs h-11"
                    onClick={() => setStep(3)}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    className="w-2/3 text-xs h-11 font-semibold"
                    disabled={!selectedDate || !isDayOpen}
                    onClick={() => {
                      setErrorMessage(null);
                      setStep(5);
                    }}
                  >
                    Ver Horários Disponíveis
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ===================================================================== */}
            {/* PASSO 5: HORÁRIOS DISPONÍVEIS (Requisitos 10, 11, 13)                  */}
            {/* ===================================================================== */}
            {step === 5 && (
              <div className="space-y-4">
                <div className="text-center space-y-0.5">
                  <h2 className="text-base font-bold text-white">Escolha o horário</h2>
                  <p className="text-xs text-muted-foreground">
                    Para {formatDateBR(selectedDate)} • Duração estimada: ~{selectedServico?.duracao_minutos} min
                  </p>
                </div>

                {isLoadingSlots ? (
                  <div className="p-8 rounded-xl bg-surface-elevated text-center space-y-2">
                    <div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-muted-foreground">Buscando horários disponíveis...</p>
                  </div>
                ) : !isDayOpen ? (
                  <div className="p-4 rounded-xl bg-surface-elevated text-center space-y-2">
                    <AlertCircle className="w-5 h-5 text-amber-400 mx-auto" />
                    <p className="text-xs font-semibold text-white">Não realizamos atendimentos nesta data.</p>
                    <p className="text-[11px] text-muted-foreground">Por favor, volte e escolha outro dia de funcionamento.</p>
                  </div>
                ) : horariosDisponiveis.length === 0 ? (
                  <div className="p-5 rounded-xl bg-surface-elevated text-center space-y-2">
                    <Clock className="w-5 h-5 text-muted mx-auto" />
                    <p className="text-xs font-semibold text-white">Não encontramos horários disponíveis para esta data.</p>
                    <p className="text-[11px] text-muted-foreground">Todos os horários estão ocupados ou com bloqueio. Escolha outra data.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {horariosDisponiveis.map((slot) => {
                      const isSelected = selectedHorario === slot.time;
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          onClick={() => setSelectedHorario(slot.time)}
                          className={`p-2.5 rounded-xl border text-center transition-all min-h-[50px] flex flex-col items-center justify-center ${
                            isSelected
                              ? "bg-brand-green text-black font-bold border-brand-green shadow-md shadow-brand-green/20"
                              : "bg-surface-elevated border-surface-border text-slate-200 hover:border-slate-500 hover:bg-surface-hover"
                          }`}
                        >
                          <span className="text-xs font-bold">{slot.time}</span>
                          <span className="text-[9px] opacity-75">até {slot.endTime}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Navegação */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-1/3 text-xs h-11"
                    onClick={() => setStep(4)}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    className="w-2/3 text-xs h-11 font-semibold"
                    disabled={!selectedHorario}
                    onClick={() => {
                      setErrorMessage(null);
                      setStep(6);
                    }}
                  >
                    Conferir Resumo
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ===================================================================== */}
            {/* PASSO 6: RESUMO & CONFIRMAÇÃO (Requisitos 15, 17, 31)                  */}
            {/* ===================================================================== */}
            {step === 6 && (
              <form onSubmit={handleConfirmarAgendamento} className="space-y-4">
                <div className="text-center space-y-0.5">
                  <h2 className="text-base font-bold text-white">Confira seu agendamento</h2>
                  <p className="text-xs text-muted-foreground">
                    Verifique as informações antes de confirmar
                  </p>
                </div>

                {/* Ticket de Resumo Completo */}
                <div className="p-4 rounded-xl bg-surface-elevated border border-surface-border space-y-3 text-xs">
                  {/* Cliente */}
                  <div className="space-y-1 pb-2.5 border-b border-surface-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Cliente
                    </span>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nome:</span>
                      <span className="font-semibold text-white">{nome}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">WhatsApp:</span>
                      <span className="font-semibold text-white">{whatsapp}</span>
                    </div>
                  </div>

                  {/* Veículo */}
                  <div className="space-y-1 pb-2.5 border-b border-surface-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Veículo
                    </span>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Categoria:</span>
                      <span className="font-semibold text-white">{selectedVeiculoTipo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Modelo / Placa:</span>
                      <span className="font-semibold text-white">
                        {veiculoModelo || selectedVeiculoTipo} {veiculoPlaca ? `(${veiculoPlaca.toUpperCase()})` : ""}
                      </span>
                    </div>
                  </div>

                  {/* Serviço */}
                  <div className="space-y-1 pb-2.5 border-b border-surface-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Serviço
                    </span>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Serviço:</span>
                      <span className="font-semibold text-white">{selectedServico?.nome}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duração estimada:</span>
                      <span className="font-semibold text-white">~{selectedServico?.duracao_minutos} min</span>
                    </div>
                  </div>

                  {/* Agendamento */}
                  <div className="space-y-1 pb-2.5 border-b border-surface-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Data e Horário
                    </span>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dia:</span>
                      <span className="font-bold text-brand-yellow-text">
                        {formatDateBR(selectedDate)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Horário:</span>
                      <span className="font-bold text-brand-yellow-text">
                        {selectedHorario}
                      </span>
                    </div>
                  </div>

                  {/* Valor Total */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm font-semibold text-slate-200">Valor total:</span>
                    <span className="text-lg font-bold text-brand-green-text">
                      {formatCurrency(selectedServico?.preco || 0)}
                    </span>
                  </div>
                </div>

                {/* Observações adicionais */}
                <Input
                  label="Observações para a equipe (opcional)"
                  placeholder="Ex: Carro com barro de praia, levarei no horário exato"
                  value={veiculoObservacoes}
                  onChange={(e) => setVeiculoObservacoes(e.target.value)}
                />

                {/* Botões com proteção contra duplo clique (Requisito 17) */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-1/3 text-xs h-11"
                    disabled={isSubmitting}
                    onClick={() => setStep(5)}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Voltar
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-2/3 text-xs h-11 font-semibold"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Confirmando..." : "Confirmar agendamento"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
