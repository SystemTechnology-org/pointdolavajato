"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Phone,
  Search as SearchIcon,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import {
  CommunicationType,
  CommunicationStatus,
  COMMUNICATION_TYPE_LABELS,
} from "@/types/database";
import { formatPhoneFriendlyDisplay } from "@/lib/services/whatsapp";
import { EmptyState } from "@/components/ui/EmptyState";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";

export default function CentralComunicacaoPage() {
  const { communicationLogs, businessSettings } = useAppStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("todos");
  const [selectedStatus, setSelectedStatus] = useState<string>("todos");

  // Filtros aplicados sobre a lista de logs
  const filteredLogs = useMemo(() => {
    return communicationLogs.filter((log) => {
      // 1. Busca textual (nome do cliente, telefone, agendamento ou prévia)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = log.customer_name?.toLowerCase().includes(term);
        const matchPhone = log.customer_phone?.includes(term);
        const matchCode = log.appointment_code?.toLowerCase().includes(term);
        const matchPreview = log.message_preview.toLowerCase().includes(term);
        if (!matchName && !matchPhone && !matchCode && !matchPreview) {
          return false;
        }
      }

      // 2. Filtro por tipo de mensagem
      if (selectedType !== "todos" && log.type !== selectedType) {
        return false;
      }

      // 3. Filtro por status
      if (selectedStatus !== "todos" && log.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [communicationLogs, searchTerm, selectedType, selectedStatus]);

  // Contagens para badges de filtro
  const countsByType = useMemo(() => {
    const counts: Record<string, number> = { todos: communicationLogs.length };
    communicationLogs.forEach((l) => {
      counts[l.type] = (counts[l.type] || 0) + 1;
    });
    return counts;
  }, [communicationLogs]);

  // Badge de status formatada
  const renderStatusBadge = (status: CommunicationStatus) => {
    switch (status) {
      case "opened":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            WhatsApp aberto
          </span>
        );
      case "prepared":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Mensagem preparada
          </span>
        );
      case "sent":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Enviada (externo)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-surface-elevated text-slate-400 border border-surface-border">
            {status}
          </span>
        );
    }
  };

  // Badge do tipo de mensagem
  const renderTypeBadge = (type: CommunicationType) => {
    const label = COMMUNICATION_TYPE_LABELS[type] || type;
    const styles: Record<CommunicationType, string> = {
      confirmation: "bg-brand-green/10 text-brand-green-text border-brand-green/20",
      reminder: "bg-brand-yellow/10 text-brand-yellow-text border-brand-yellow/20",
      waiting: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      in_progress: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      completed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      payment_pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      vehicle_ready: "bg-teal-500/15 text-teal-300 border-teal-500/30",
      vehicle_delivered: "bg-green-500/15 text-green-300 border-green-500/30",
      customer_retention: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
      feedback_followup: "bg-orange-500/15 text-orange-300 border-orange-500/30",
      general: "bg-slate-500/10 text-slate-300 border-slate-500/20",
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${styles[type] || styles.general}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. TOPO DA PÁGINA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-brand-green" />
              <span>Central de Comunicação & WhatsApp</span>
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Histórico de contatos preparados e disparos manuais via WhatsApp para clientes do Point do Coco.
          </p>
        </div>

        {/* Informação sobre WhatsApp Manual */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-elevated/60 border border-surface-border text-xs text-slate-300">
          <Phone className="w-3.5 h-3.5 text-brand-green" />
          <span>WhatsApp Oficial: <strong>{businessSettings?.whatsapp || "(71) 9 9288-7645"}</strong></span>
        </div>
      </div>

      {/* AVISO IMPORTANTE DE ARQUITETURA TRANSPARENTE (Requisitos 20, 21 e 35) */}
      <div className="p-4 rounded-xl bg-surface border border-surface-border/80 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
          <CheckCircle2 className="w-4 h-4" />
        </div>
        <div className="text-xs space-y-1">
          <p className="font-semibold text-white">
            Comunicação prática e direta com o cliente via WhatsApp
          </p>
          <p className="text-muted-foreground">
            O sistema gera mensagens contextuais prontas e abre o aplicativo oficial do WhatsApp com um clique. Por transparência operacional, o status indica <strong>&quot;WhatsApp aberto&quot;</strong> para que o funcionário revise e realize o envio manual.
          </p>
        </div>
      </div>

      {/* 2. BARRA DE BUSCA E FILTROS */}
      <div className="p-4 rounded-xl bg-surface border border-surface-border space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Busca textual */}
          <div className="relative flex-1">
            <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Buscar por cliente, telefone, protocolo ou mensagem..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-elevated border border-surface-border rounded-lg text-xs text-white placeholder:text-muted focus:outline-none focus:border-brand-green transition-colors"
            />
          </div>

          {/* Filtro de Status */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-surface-elevated border border-surface-border rounded-lg text-xs text-white px-3 py-2 focus:outline-none focus:border-brand-green"
            >
              <option value="todos">Todos os status</option>
              <option value="opened">WhatsApp aberto</option>
              <option value="prepared">Mensagem preparada</option>
              <option value="sent">Enviada</option>
            </select>
          </div>
        </div>

        {/* Abas de Tipos de Comunicação */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
          {[
            { id: "todos", label: "Todos" },
            { id: "confirmation", label: "Confirmações" },
            { id: "reminder", label: "Lembretes" },
            { id: "waiting", label: "Fila/Espera" },
            { id: "in_progress", label: "Em Atendimento" },
            { id: "completed", label: "Veículo Pronto" },
            { id: "payment_pending", label: "Cobrança" },
            { id: "general", label: "Geral" },
          ].map((tab) => {
            const count = countsByType[tab.id] || 0;
            const isActive = selectedType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedType(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? "bg-brand-green/20 text-brand-green-text border border-brand-green/30 font-semibold"
                    : "bg-surface-elevated text-slate-300 hover:text-white hover:bg-surface-hover border border-surface-border"
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 text-slate-300 font-mono">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. LISTAGEM DE LOGS DE COMUNICAÇÃO */}
      {filteredLogs.length === 0 ? (
        <EmptyState
          title="Nenhuma comunicação encontrada"
          description={
            searchTerm || selectedType !== "todos" || selectedStatus !== "todos"
              ? "Tente remover os filtros ou buscar por outro termo."
              : "As ações de envio pelo WhatsApp serão registradas automaticamente aqui."
          }
          icon={<MessageSquare className="w-8 h-8 text-muted" />}
        />
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="p-4 rounded-xl bg-surface border border-surface-border hover:border-slate-700 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                {/* Linha 1: Tipo e Status */}
                <div className="flex items-center gap-2 flex-wrap">
                  {renderTypeBadge(log.type)}
                  {renderStatusBadge(log.status)}
                  {log.appointment_code && (
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-elevated text-brand-yellow-text border border-surface-border">
                      {log.appointment_code}
                    </span>
                  )}
                </div>

                {/* Data e Hora */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                  <Clock className="w-3.5 h-3.5 text-muted" />
                  <span>{new Date(log.created_at).toLocaleString("pt-BR")}</span>
                </div>
              </div>

              {/* Linha 2: Cliente e Telefone */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-surface-border/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">
                      {log.customer_name || "Cliente"}
                    </span>
                    {log.customer_phone && (
                      <span className="text-xs text-slate-400">
                        {formatPhoneFriendlyDisplay(log.customer_phone)}
                      </span>
                    )}
                  </div>
                  {/* Prévia da mensagem */}
                  <p className="text-xs text-slate-300 bg-surface-elevated/60 p-2.5 rounded-lg border border-surface-border font-mono leading-relaxed whitespace-pre-wrap">
                    &quot;{log.message_preview}&quot;
                  </p>
                </div>

                {/* Ação rápida para reabrir WhatsApp */}
                <div className="shrink-0 flex items-center gap-2 sm:self-center">
                  {log.customer_phone && (
                    <WhatsAppButton
                      phone={log.customer_phone}
                      message={log.message_preview}
                      customerId={log.customer_id || undefined}
                      appointmentId={log.appointment_id || undefined}
                      label="Reabrir WhatsApp"
                      size="sm"
                      variant="secondary"
                    />
                  )}
                  {log.customer_id && (
                    <Link
                      href={`/clientes/${log.customer_id}`}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-surface-elevated hover:bg-surface-hover border border-surface-border inline-flex items-center gap-1"
                    >
                      <span>Ver cliente</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
