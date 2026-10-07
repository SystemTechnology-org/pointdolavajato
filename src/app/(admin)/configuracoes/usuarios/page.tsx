"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { ConfiguracoesUsuarios } from "@/components/configuracoes/ConfiguracoesUsuarios";

export default function UsuariosPage() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-3 pb-3 border-b border-surface-border/60">
        <Link
          href="/configuracoes?tab=usuarios"
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-surface-elevated transition-colors"
          title="Voltar para configurações"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-green" />
            <span>Gestão de Usuários e Funções</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Área administrativa para membros da equipe, papéis e permissões no Point do Coco
          </p>
        </div>
      </div>

      <ConfiguracoesUsuarios />
    </div>
  );
}
