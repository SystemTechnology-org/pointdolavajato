"use client";

import React, { useState } from "react";
import { Server, Database, Globe, DollarSign, RotateCcw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";

export function ConfiguracoesSistema() {
  const { businessSettings, resetToDefaults, isCurrentUserAdmin, isSupabaseActive } = useAppStore();
  const { success } = useToast();

  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const handleConfirmReset = () => {
    resetToDefaults();
    setIsResetDialogOpen(false);
    success("Dados restaurados para os padrões de demonstração do Point do Coco.");
  };

  return (
    <div className="space-y-6">
      {/* Bloco 1: Localização e Moeda */}
      <div className="p-5 rounded-xl bg-surface border border-surface-border space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Globe className="w-4 h-4 text-brand-green" />
          <span>Fuso Horário e Moeda Oficial</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-lg bg-surface-elevated/40 border border-surface-border space-y-1">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-brand-yellow" />
              <span>Fuso Horário (Timezone)</span>
            </span>
            <div className="flex items-center justify-between pt-1">
              <span className="font-mono text-xs text-brand-green font-bold">
                {businessSettings.timezone || "America/Bahia"}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface border text-muted-foreground">
                UTC-03:00 (Brasília/Bahia)
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground pt-1">
              Fixo para a região do Litoral Norte da Bahia. Garante que agendamentos e registros de caixa ocorram no mesmo horário.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-surface-elevated/40 border border-surface-border space-y-1">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-brand-green" />
              <span>Moeda Operacional</span>
            </span>
            <div className="flex items-center justify-between pt-1">
              <span className="font-mono text-xs text-brand-green font-bold">
                Real Brasileiro (BRL - R$)
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface border text-muted-foreground">
                Padronizado
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground pt-1">
              Todos os valores de serviços, pagamentos e caixa são tratados numericamente com 2 casas decimais.
            </p>
          </div>
        </div>
      </div>

      {/* Bloco 2: Banco de Dados & Backups da Infraestrutura (Requisito 33) */}
      <div className="p-5 rounded-xl bg-surface border border-surface-border space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-brand-blue" />
          <span>Infraestrutura e Backups do Banco</span>
        </h3>

        <div className="p-4 rounded-xl bg-surface-elevated/30 border border-surface-border space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-brand-green" />
              <span>Provedor de Dados Supabase (PostgreSQL 15+)</span>
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                isSupabaseActive
                  ? "bg-brand-green/20 text-brand-green"
                  : "bg-brand-yellow/20 text-brand-yellow"
              }`}
            >
              {isSupabaseActive ? "Conectado à Nuvem" : "Modo Armazenamento Local"}
            </span>
          </div>

          <p className="text-muted-foreground leading-relaxed">
            A integridade e segurança dos dados do Point do Coco são mantidas via infraestrutura em nuvem do Supabase. Backups completos do banco de dados são realizados automaticamente todos os dias com replicação e snapshots redundantes.
          </p>
          <p className="text-[11px] text-slate-400">
            Conforme as diretrizes de segurança, o sistema não expõe rotinas locais manuais de backup que possam corromper o banco. Restaurações de desastre (Point-in-time recovery) são gerenciadas diretamente no painel do Supabase.
          </p>
        </div>
      </div>

      {/* Bloco 3: Restauração de Demonstração */}
      {isCurrentUserAdmin && (
        <div className="p-5 rounded-xl bg-red-950/20 border border-red-500/20 space-y-3">
          <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>Zona Administrativa de Redefinição</span>
          </h3>

          <p className="text-xs text-muted-foreground">
            Restaura todos os registros de clientes, agendamentos, serviços, caixa e usuários para o conjunto de demonstração inicial do lava-jato.
          </p>

          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs border-red-500/40 text-red-400 hover:bg-red-500/10"
              onClick={() => setIsResetDialogOpen(true)}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Restaurar Dados Iniciais de Demonstração
            </Button>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Reset */}
      <Dialog
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        onConfirm={handleConfirmReset}
        title="Restaurar dados de demonstração?"
        description="Esta ação substituirá os registros locais pelos dados iniciais de demonstração do Point do Coco. Deseja continuar?"
        confirmText="Confirmar Restauração"
        variant="danger"
      />
    </div>
  );
}
