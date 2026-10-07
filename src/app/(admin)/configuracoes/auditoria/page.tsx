"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, History } from "lucide-react";
import { ConfiguracoesAuditoria } from "@/components/configuracoes/ConfiguracoesAuditoria";

export default function AuditoriaPage() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-3 pb-3 border-b border-surface-border/60">
        <Link
          href="/configuracoes?tab=auditoria"
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-surface-elevated transition-colors"
          title="Voltar para configurações"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-brand-yellow" />
            <span>Histórico de Auditoria do Sistema</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Registro cronológico imutável de alterações críticas realizadas por administradores e operadores
          </p>
        </div>
      </div>

      <ConfiguracoesAuditoria />
    </div>
  );
}
