"use client";

import React, { useState } from "react";
import { Tag, Plus, X } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";

interface CustomerTagsManagerProps {
  customerId: string;
  tags: string[];
  readOnly?: boolean;
}

const TAG_STYLES: Record<string, string> = {
  VIP: "bg-amber-500/15 text-amber-300 border-amber-500/30 font-bold",
  Recorrente: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-medium",
  Novo: "bg-sky-500/15 text-sky-300 border-sky-500/30 font-medium",
  Inativo: "bg-slate-500/15 text-slate-300 border-slate-500/30 font-medium",
  "Frotista / Empresa": "bg-purple-500/15 text-purple-300 border-purple-500/30 font-medium",
  Indicado: "bg-orange-500/15 text-orange-300 border-orange-500/30 font-medium",
};

const DEFAULT_AVAILABLE_TAGS = [
  "VIP",
  "Recorrente",
  "Novo",
  "Inativo",
  "Frotista / Empresa",
  "Indicado",
];

export function CustomerTagsManager({
  customerId,
  tags = [],
  readOnly = false,
}: CustomerTagsManagerProps) {
  const {
    customerTags,
    assignCustomerTag,
    removeCustomerTag,
    isCurrentUserManager,
    hasCurrentUserPermission,
  } = useAppStore();
  const { success, error } = useToast();

  const [isOpenMenu, setIsOpenMenu] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const canManage =
    !readOnly && (isCurrentUserManager || hasCurrentUserPermission("customer_tags.manage"));

  // Lista unificada de tags disponíveis
  const allTagNames = Array.from(
    new Set([
      ...DEFAULT_AVAILABLE_TAGS,
      ...(customerTags || []).map((t) => t.name),
    ])
  );

  const unassignedTags = allTagNames.filter((t) => !tags.includes(t));

  const handleAdd = async (tagName: string) => {
    setIsProcessing(true);
    try {
      await assignCustomerTag(customerId, tagName);
      success(`Tag "${tagName}" atribuída com sucesso.`);
      setIsOpenMenu(false);
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : "Erro ao adicionar tag.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = async (tagName: string) => {
    setIsProcessing(true);
    try {
      await removeCustomerTag(customerId, tagName);
      success(`Tag "${tagName}" removida.`);
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : "Erro ao remover tag.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {tags.length === 0 && !canManage && (
        <span className="text-xs text-muted-foreground italic">Nenhuma tag atribuída</span>
      )}

      {tags.map((tag) => {
        const style = TAG_STYLES[tag] || "bg-slate-500/15 text-slate-300 border-slate-500/30";
        return (
          <span
            key={tag}
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border ${style}`}
          >
            <Tag className="w-3 h-3 shrink-0 opacity-70" />
            <span>{tag}</span>
            {canManage && (
              <button
                type="button"
                onClick={() => handleRemove(tag)}
                disabled={isProcessing}
                className="hover:text-white rounded-full p-0.5 ml-0.5 transition-colors focus:outline-none"
                title={`Remover tag ${tag}`}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </span>
        );
      })}

      {canManage && (
        <div className="relative inline-block">
          <button
            type="button"
            onClick={() => setIsOpenMenu(!isOpenMenu)}
            disabled={isProcessing}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-dashed border-surface-border text-muted-foreground hover:text-white hover:border-slate-500 transition-colors focus:outline-none"
          >
            <Plus className="w-3 h-3" />
            <span>Tag</span>
          </button>

          {isOpenMenu && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsOpenMenu(false)}
              />
              <div className="absolute left-0 mt-1.5 w-44 rounded-xl bg-surface border border-surface-border shadow-xl p-1 z-40 text-xs">
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">
                  Atribuir tag
                </div>
                {unassignedTags.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground italic">
                    Todas as tags já foram atribuídas
                  </div>
                ) : (
                  unassignedTags.map((tagName) => (
                    <button
                      key={tagName}
                      type="button"
                      onClick={() => handleAdd(tagName)}
                      disabled={isProcessing}
                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-white/5 text-slate-200 hover:text-white flex items-center justify-between transition-colors"
                    >
                      <span>{tagName}</span>
                      <Plus className="w-3 h-3 text-muted-foreground" />
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
