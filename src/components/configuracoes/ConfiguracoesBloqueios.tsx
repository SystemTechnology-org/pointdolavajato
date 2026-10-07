"use client";

import React, { useState } from "react";
import { CalendarX, Plus, Trash2, Clock, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { NovoBloqueioModal } from "@/components/modals/NovoBloqueioModal";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";

export function ConfiguracoesBloqueios() {
  const { scheduleBlocks, deleteScheduleBlock, isCurrentUserAdmin, isCurrentUserManager } = useAppStore();
  const { success, error: toastError } = useToast();

  const [isNovoBloqueioOpen, setIsNovoBloqueioOpen] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState<{ id: string; reason: string } | null>(null);

  const canManageBlocks = isCurrentUserAdmin || isCurrentUserManager;

  const handleConfirmDelete = async () => {
    if (!blockToDelete) return;
    try {
      await deleteScheduleBlock(blockToDelete.id);
      success(`Bloqueio "${blockToDelete.reason}" removido com sucesso.`);
      setBlockToDelete(null);
    } catch (err: unknown) {
      console.error(err);
      toastError("Não foi possível remover o bloqueio.");
    }
  };

  const formatBlockDates = (startIso: string, endIso: string) => {
    try {
      const startDate = startIso.split("T")[0];
      const startTime = startIso.includes("T") ? startIso.split("T")[1]?.slice(0, 5) : "";
      const endTime = endIso.includes("T") ? endIso.split("T")[1]?.slice(0, 5) : "";

      const [year, month, day] = startDate.split("-");
      const dateFormatted = `${day}/${month}/${year}`;

      const isFullDay = (startTime === "00:00" && endTime === "23:59") || (!startTime && !endTime);

      return {
        dateFormatted,
        isFullDay,
        timeRange: isFullDay ? "Dia inteiro" : `${startTime} às ${endTime}`,
      };
    } catch {
      return {
        dateFormatted: startIso,
        isFullDay: false,
        timeRange: "Período personalizado",
      };
    }
  };

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-xl bg-surface border border-surface-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-border/50">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <CalendarX className="w-4 h-4 text-brand-yellow" />
              <span>Dias Bloqueados e Interrupções de Agenda</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cadastre feriados nacionais, folgas coletivas ou manutenções temporárias que impedem novos agendamentos.
            </p>
          </div>

          {canManageBlocks && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsNovoBloqueioOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Novo Bloqueio
            </Button>
          )}
        </div>

        {scheduleBlocks.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-surface-elevated/20 border border-dashed border-surface-border space-y-2">
            <Calendar className="w-8 h-8 mx-auto text-muted" />
            <p className="text-xs font-semibold text-slate-300">Nenhum bloqueio cadastrado</p>
            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
              Todos os dias úteis configurados nos horários de funcionamento estão livres para receber agendamentos.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-surface-border/40">
            {scheduleBlocks.map((block) => {
              const { dateFormatted, isFullDay, timeRange } = formatBlockDates(
                block.start_datetime,
                block.end_datetime
              );

              return (
                <div
                  key={block.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-surface-elevated/20 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isFullDay
                          ? "bg-brand-yellow/15 text-brand-yellow border border-brand-yellow/30"
                          : "bg-brand-blue/15 text-brand-blue border border-brand-blue/30"
                      }`}
                    >
                      {isFullDay ? (
                        <Calendar className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{dateFormatted}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-border text-slate-300 font-medium">
                          {timeRange}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5 font-medium">{block.reason}</p>
                    </div>
                  </div>

                  {canManageBlocks && (
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => setBlockToDelete({ id: block.id, reason: block.reason })}
                        className="text-xs text-muted hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors flex items-center gap-1"
                        title="Remover bloqueio"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="sm:hidden text-[11px]">Remover</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-3.5 rounded-xl bg-surface border border-surface-border flex items-start gap-2.5 text-xs text-muted-foreground">
        <AlertCircle className="w-4 h-4 shrink-0 text-brand-yellow mt-0.5" />
        <span>
          Bloqueios criados aqui têm prioridade absoluta sobre os horários normais da semana. Clientes que tentarem agendar na data bloqueada verão o aviso com o motivo cadastrado.
        </span>
      </div>

      {/* Modal de Criação */}
      <NovoBloqueioModal
        isOpen={isNovoBloqueioOpen}
        onClose={() => setIsNovoBloqueioOpen(false)}
      />

      {/* Diálogo de Confirmação de Exclusão */}
      <Dialog
        isOpen={!!blockToDelete}
        onClose={() => setBlockToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Remover bloqueio de agenda?"
        description={`Tem certeza que deseja remover o bloqueio "${blockToDelete?.reason}"? Os horários dessa data voltarão a ficar disponíveis para clientes.`}
        confirmText="Remover Bloqueio"
        variant="danger"
      />
    </div>
  );
}
