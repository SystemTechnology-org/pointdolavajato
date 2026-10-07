"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Building2,
  Clock,
  CalendarRange,
  CalendarX,
  Users,
  ShieldCheck,
  MessageSquare,
  Settings as SettingsIcon,
  History,
  AlertCircle,
} from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { useAppStore } from "@/lib/store";
import { ConfiguracoesEmpresa } from "@/components/configuracoes/ConfiguracoesEmpresa";
import { ConfiguracoesHorarios } from "@/components/configuracoes/ConfiguracoesHorarios";
import { ConfiguracoesAgendamentos } from "@/components/configuracoes/ConfiguracoesAgendamentos";
import { ConfiguracoesBloqueios } from "@/components/configuracoes/ConfiguracoesBloqueios";
import { ConfiguracoesUsuarios } from "@/components/configuracoes/ConfiguracoesUsuarios";
import { ConfiguracoesPermissoes } from "@/components/configuracoes/ConfiguracoesPermissoes";
import { ConfiguracoesComunicacao } from "@/components/configuracoes/ConfiguracoesComunicacao";
import { ConfiguracoesSistema } from "@/components/configuracoes/ConfiguracoesSistema";
import { ConfiguracoesAuditoria } from "@/components/configuracoes/ConfiguracoesAuditoria";

type TabId =
  | "empresa"
  | "horarios"
  | "agendamentos"
  | "bloqueios"
  | "usuarios"
  | "permissoes"
  | "comunicacao"
  | "sistema"
  | "auditoria";

interface TabItem {
  id: TabId;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const TABS: TabItem[] = [
  { id: "empresa", label: "Empresa", icon: Building2 },
  { id: "horarios", label: "Horários & Intervalos", icon: Clock },
  { id: "agendamentos", label: "Agendamentos & Regras", icon: CalendarRange },
  { id: "bloqueios", label: "Dias Bloqueados", icon: CalendarX },
  { id: "usuarios", label: "Usuários", icon: Users },
  { id: "permissoes", label: "Permissões", icon: ShieldCheck },
  { id: "comunicacao", label: "Comunicação", icon: MessageSquare },
  { id: "sistema", label: "Sistema & Backup", icon: SettingsIcon },
  { id: "auditoria", label: "Auditoria", icon: History, adminOnly: true },
];

function ConfiguracoesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isCurrentUserAdmin } = useAppStore();

  const initialTab = (searchParams.get("tab") as TabId) || "empresa";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [pendingTab, setPendingTab] = useState<TabId | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  // Sincronizar tab se query param mudar
  useEffect(() => {
    const tabParam = searchParams.get("tab") as TabId;
    if (tabParam && TABS.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Navegação entre abas com proteção de alterações não salvas (Requisito 37)
  const handleSelectTab = (tabId: TabId) => {
    if (tabId === activeTab) return;

    if (isDirty) {
      setPendingTab(tabId);
      setShowUnsavedDialog(true);
    } else {
      setActiveTab(tabId);
      router.push(`/configuracoes?tab=${tabId}`, { scroll: false });
    }
  };

  const handleLeaveWithoutSaving = () => {
    setIsDirty(false);
    setShowUnsavedDialog(false);
    if (pendingTab) {
      setActiveTab(pendingTab);
      router.push(`/configuracoes?tab=${pendingTab}`, { scroll: false });
      setPendingTab(null);
    }
  };

  const handleContinueEditing = () => {
    setShowUnsavedDialog(false);
    setPendingTab(null);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-border/60">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Configurações do Lava Jato</span>
            {!isCurrentUserAdmin && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-yellow/15 text-brand-yellow font-semibold">
                Modo Operacional
              </span>
            )}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gerencie dados do estabelecimento, expediente, regras de agendamento, equipe e permissões.
          </p>
        </div>

        {isDirty && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-yellow/15 border border-brand-yellow/30 text-xs text-brand-yellow-text animate-pulse">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Existem alterações não salvas nesta aba</span>
          </div>
        )}
      </div>

      {/* Navegação por Abas (Horizontal com rolagem suave no mobile e wrapping responsivo) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-surface-border/40">
        {TABS.map((tab) => {
          if (tab.adminOnly && !isCurrentUserAdmin) return null;
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelectTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-brand-green/20 text-brand-green-text border border-brand-green/40 shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-surface-elevated/40 border border-transparent"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-brand-green" : "text-muted"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Conteúdo da Aba Ativa */}
      <div className="pt-1">
        {activeTab === "empresa" && (
          <ConfiguracoesEmpresa onDirtyChange={setIsDirty} />
        )}
        {activeTab === "horarios" && (
          <ConfiguracoesHorarios onDirtyChange={setIsDirty} />
        )}
        {activeTab === "agendamentos" && (
          <ConfiguracoesAgendamentos onDirtyChange={setIsDirty} />
        )}
        {activeTab === "bloqueios" && <ConfiguracoesBloqueios />}
        {activeTab === "usuarios" && <ConfiguracoesUsuarios />}
        {activeTab === "permissoes" && <ConfiguracoesPermissoes />}
        {activeTab === "comunicacao" && (
          <ConfiguracoesComunicacao onDirtyChange={setIsDirty} />
        )}
        {activeTab === "sistema" && <ConfiguracoesSistema />}
        {activeTab === "auditoria" && <ConfiguracoesAuditoria />}
      </div>

      {/* Diálogo de Confirmação de Alterações Não Salvas (Requisito 37) */}
      <Dialog
        isOpen={showUnsavedDialog}
        onClose={handleContinueEditing}
        onConfirm={handleLeaveWithoutSaving}
        title="Existem alterações não salvas"
        description="Você realizou modificações no formulário que ainda não foram salvas. Se trocar de aba agora, essas alterações serão descartadas."
        confirmText="Sair sem salvar"
        cancelText="Continuar editando"
        variant="danger"
      />
    </div>
  );
}

export default function ConfiguracoesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[300px] text-muted-foreground text-sm">
          Carregando configurações...
        </div>
      }
    >
      <ConfiguracoesContent />
    </Suspense>
  );
}
