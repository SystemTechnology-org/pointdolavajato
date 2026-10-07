"use client";

import React, { useState, useMemo } from "react";
import { History, Search, User, Eye, Lock } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useAppStore } from "@/lib/store";
import { AUDIT_ACTION_LABELS, AUDIT_ENTITY_LABELS } from "@/lib/services/audit";

export function ConfiguracoesAuditoria() {
  const { auditLogs, isCurrentUserAdmin } = useAppStore();

  const [search, setSearch] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<string>("all");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchSearch =
        search.trim() === "" ||
        (log.user_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (AUDIT_ACTION_LABELS[log.action] || log.action).toLowerCase().includes(search.toLowerCase()) ||
        log.entity.toLowerCase().includes(search.toLowerCase()) ||
        JSON.stringify(log.metadata).toLowerCase().includes(search.toLowerCase());

      const matchEntity = selectedEntity === "all" || log.entity === selectedEntity;

      return matchSearch && matchEntity;
    });
  }, [auditLogs, search, selectedEntity]);

  const formatLogDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString("pt-BR", {
        timeZone: "America/Bahia",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  if (!isCurrentUserAdmin) {
    return (
      <div className="p-8 text-center rounded-xl bg-surface border border-surface-border space-y-3">
        <Lock className="w-10 h-10 text-brand-yellow mx-auto" />
        <h3 className="text-base font-bold text-white">Acesso Restrito ao Administrador</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Os registros de auditoria do sistema contêm informações confidenciais sobre movimentações de permissões e operações críticas e só podem ser visualizados pelo administrador.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-xl bg-surface border border-surface-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-surface-border/50">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-brand-yellow" />
              <span>Trilha de Auditoria Forense</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Registro histórico imutável das ações críticas realizadas no sistema (configurações, permissões, caixa e cancelamentos).
            </p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-brand-yellow/15 text-brand-yellow font-semibold w-fit">
            Tabela Imutável
          </span>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Input
              placeholder="Buscar por usuário, ação ou detalhe..."
              leftIcon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            options={[
              { value: "all", label: "Todas as entidades" },
              { value: "settings", label: "Configurações" },
              { value: "user", label: "Usuários & Funções" },
              { value: "business_hours", label: "Horários" },
              { value: "schedule_block", label: "Bloqueios" },
              { value: "cash", label: "Caixa Diário" },
              { value: "payment", label: "Pagamentos" },
              { value: "appointment", label: "Agendamentos" },
            ]}
          />
        </div>

        {/* Tabela de Logs */}
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-surface-elevated/20 border border-dashed border-surface-border space-y-2">
            <History className="w-8 h-8 mx-auto text-muted" />
            <p className="text-xs font-semibold text-slate-300">Nenhum registro encontrado</p>
            <p className="text-[11px] text-muted-foreground">
              Não foram encontradas ações registradas com os filtros selecionados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-border text-[11px] font-semibold text-muted uppercase tracking-wider">
                  <th className="py-2.5 px-3">Data e Hora</th>
                  <th className="py-2.5 px-3">Usuário</th>
                  <th className="py-2.5 px-3">Ação</th>
                  <th className="py-2.5 px-3">Entidade</th>
                  <th className="py-2.5 px-3 text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/40 text-xs">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const labelAcao = AUDIT_ACTION_LABELS[log.action] || log.action;
                  const labelEntidade = AUDIT_ENTITY_LABELS[log.entity] || log.entity;

                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-surface-elevated/20 transition-colors">
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-300 whitespace-nowrap">
                          {formatLogDate(log.created_at)}
                        </td>

                        <td className="py-3 px-3 font-semibold text-white">
                          <span className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-muted shrink-0" />
                            <span>{log.user_name || "Sistema"}</span>
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-200 block">
                            {labelAcao}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {log.action}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-elevated border border-surface-border text-slate-300">
                            {labelEntidade}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="text-xs text-brand-yellow hover:underline inline-flex items-center gap-1 font-semibold"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{isExpanded ? "Ocultar" : "Ver"}</span>
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-surface-elevated/40">
                          <td colSpan={5} className="py-3 px-4">
                            <div className="space-y-1.5 text-xs">
                              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <span>ID do Registro: {log.id}</span>
                                {log.entity_id && <span>ID do Objeto: {log.entity_id}</span>}
                              </div>
                              <div className="p-3 rounded-lg bg-black/50 border border-surface-border font-mono text-[11px] text-emerald-400 overflow-x-auto">
                                <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
