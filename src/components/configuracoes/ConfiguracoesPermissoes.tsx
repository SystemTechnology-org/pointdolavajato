"use client";

import React from "react";
import { ShieldCheck, Check, Minus, Lock } from "lucide-react";
import { PERMISSION_DEFINITIONS, hasPermission } from "@/lib/services/permissions";
import { UserRole, ROLE_LABELS } from "@/types";

export function ConfiguracoesPermissoes() {
  const roles: UserRole[] = ["admin", "manager", "employee"];

  // Agrupar permissões por categoria
  const categories = ["Cadastros", "Operacional", "Financeiro", "Administração"] as const;

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-xl bg-surface border border-surface-border space-y-4">
        <div className="pb-3 border-b border-surface-border/50">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-green" />
            <span>Matriz Granular de Permissões por Papel</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Mapeamento de acessos operacionais e administrativos. As regras são aplicadas no painel e reforçadas pelo banco de dados (Row Level Security).
          </p>
        </div>

        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-border text-[11px] font-semibold text-muted uppercase tracking-wider">
                <th className="py-2.5 px-3 w-1/2">Permissão & Escopo</th>
                {roles.map((r) => (
                  <th key={r} className="py-2.5 px-3 text-center">
                    <span className="block text-white font-bold">{ROLE_LABELS[r]}</span>
                    <span className="text-[10px] text-muted-foreground font-normal">
                      {r === "admin" ? "Total" : r === "manager" ? "Operacional Amplo" : "Atendimento"}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/40 text-xs">
              {categories.map((cat) => {
                const perms = PERMISSION_DEFINITIONS.filter((p) => p.category === cat);
                if (perms.length === 0) return null;

                return (
                  <React.Fragment key={cat}>
                    <tr className="bg-surface-elevated/40">
                      <td
                        colSpan={4}
                        className="py-2 px-3 text-[11px] font-bold text-brand-yellow uppercase tracking-wider"
                      >
                        {cat}
                      </td>
                    </tr>
                    {perms.map((p) => (
                      <tr key={p.key} className="hover:bg-surface-elevated/20 transition-colors">
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-white block">{p.label}</span>
                          <span className="text-[11px] text-muted-foreground">{p.description}</span>
                        </td>
                        {roles.map((r) => {
                          const allowed = hasPermission(r, p.key);
                          return (
                            <td key={r} className="py-2.5 px-3 text-center">
                              {allowed ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-green/20 text-brand-green border border-brand-green/30">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-surface-border/30 text-slate-500">
                                  <Minus className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-surface border border-surface-border flex items-start gap-3 text-xs text-muted-foreground">
        <Lock className="w-4 h-4 shrink-0 text-brand-green mt-0.5" />
        <div className="space-y-1">
          <span className="text-white font-semibold block">Segurança em Camadas (Frontend + RLS)</span>
          <p>
            O sistema nunca confia exclusivamente em checagens visuais. Usuários com papéis restritos têm o acesso negado também no nível da API e nas políticas do Supabase, garantindo que mesmo requisições diretas não acessem dados protegidos.
          </p>
        </div>
      </div>
    </div>
  );
}
