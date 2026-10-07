"use client";

import React, { useState } from "react";
import { CheckCircle2, AlertTriangle, Clock, User } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAppStore } from "@/lib/store";
import { Agendamento } from "@/types";

interface ConcluirServicoModalProps {
  isOpen: boolean;
  onClose: () => void;
  agendamento: Agendamento;
  onSuccess?: () => void;
}

export function ConcluirServicoModal({
  isOpen,
  onClose,
  agendamento,
  onSuccess,
}: ConcluirServicoModalProps) {
  const { concluirServico } = useAppStore();
  const { success, error } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [responsavel, setResponsavel] = useState<string>("Equipe do Box");
  const [observacoes, setObservacoes] = useState<string>("");

  // Calcular tempo decorrido no box
  const tempoExecucaoMinutos = agendamento.started_at
    ? Math.max(1, Math.round((Date.now() - new Date(agendamento.started_at).getTime()) / 60000))
    : null;

  const handleConfirmar = async () => {
    try {
      setIsLoading(true);
      await concluirServico(agendamento.id, {
        completed_by_name: responsavel.trim() || "Equipe do Box",
        notes: observacoes.trim() ? observacoes.trim() : agendamento.observacoes,
      });

      success("Lavagem concluída! Veículo encaminhado para conferência final.");
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao concluir serviço.";
      error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Concluir Lavagem / Serviço"
      size="md"
    >
      <div className="space-y-5">
        {/* ALERTA VISUAL ESSENCIAL (Requisito 3) */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-amber-300">
              Serviço concluído ≠ Veículo entregue!
            </p>
            <p className="text-slate-300 leading-relaxed">
              Marcar o serviço como concluído indica que a lavagem técnica terminou no box.
              O veículo passará pela conferência final e ficará aguardando retirada pelo cliente.
            </p>
          </div>
        </div>

        {/* Resumo do Atendimento */}
        <div className="p-4 rounded-xl bg-surface-elevated/40 border border-surface-border space-y-2.5 text-xs">
          <div className="flex items-center justify-between border-b border-surface-border/60 pb-2">
            <span className="text-muted-foreground">Código:</span>
            <span className="font-mono font-bold text-brand-yellow">
              #{agendamento.code || agendamento.id.slice(-6).toUpperCase()}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-surface-border/60 pb-2">
            <span className="text-muted-foreground">Veículo:</span>
            <span className="font-bold text-white">
              {agendamento.veiculo_modelo} {agendamento.veiculo_placa && agendamento.veiculo_placa !== "---" && `(${agendamento.veiculo_placa})`}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-surface-border/60 pb-2">
            <span className="text-muted-foreground">Cliente:</span>
            <span className="font-semibold text-white">{agendamento.cliente_nome}</span>
          </div>

          <div className="flex items-center justify-between border-b border-surface-border/60 pb-2">
            <span className="text-muted-foreground">Serviço:</span>
            <span className="font-semibold text-brand-green-text">{agendamento.servico_nome}</span>
          </div>

          {tempoExecucaoMinutos !== null && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Tempo de Execução no Box:
              </span>
              <span className="font-bold text-white">
                {tempoExecucaoMinutos} {tempoExecucaoMinutos === 1 ? "minuto" : "minutos"}
              </span>
            </div>
          )}
        </div>

        {/* Responsável pela Finalização */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            Profissional / Lavador Responsável:
          </label>
          <input
            type="text"
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
            placeholder="Nome do lavador ou equipe do box"
            className="w-full h-10 px-3 rounded-xl bg-surface-elevated border border-surface-border text-white text-xs placeholder:text-muted focus:border-brand-green focus:outline-none transition-colors"
          />
        </div>

        {/* Observações finais da execução */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">
            Observações Técnicas do Serviço (Opcional):
          </label>
          <textarea
            rows={2}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Ex: Cera aplicada com sucesso, interior bem higienizado..."
            className="w-full p-2.5 rounded-xl bg-surface-elevated border border-surface-border text-white text-xs placeholder:text-muted focus:border-brand-green focus:outline-none transition-colors resize-none"
          />
        </div>

        {/* Ações */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-surface-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleConfirmar}
            isLoading={isLoading}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold"
          >
            Confirmar Conclusão do Serviço
          </Button>
        </div>
      </div>
    </Modal>
  );
}
