"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Agendamento } from "@/types";
import { AlertTriangle, Ban } from "lucide-react";

interface CancelarAtendimentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  agendamento: Agendamento | null;
  onConfirmarCancelamento: (id: string, motivo: string) => void;
}

const MOTIVOS_SUGERIDOS = [
  "Desistência do cliente",
  "Cliente não pôde esperar",
  "Imprevisto mecânico / elétrico",
  "Condições climáticas / Chuva",
  "Erro de agendamento / duplicidade",
  "Outro motivo",
];

export function CancelarAtendimentoModal({
  isOpen,
  onClose,
  agendamento,
  onConfirmarCancelamento,
}: CancelarAtendimentoModalProps) {
  const [motivoSelecionado, setMotivoSelecionado] = useState(MOTIVOS_SUGERIDOS[0]);
  const [motivoPersonalizado, setMotivoPersonalizado] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!agendamento) return null;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const motivoFinal =
      motivoSelecionado === "Outro motivo" && motivoPersonalizado.trim()
        ? motivoPersonalizado.trim()
        : motivoSelecionado;

    try {
      onConfirmarCancelamento(agendamento.id, motivoFinal);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cancelar Atendimento"
      description={`Protocolo #${agendamento.code || agendamento.id}`}
      size="sm"
    >
      <form onSubmit={handleConfirm} className="space-y-4 text-xs">
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            O agendamento de <strong>{agendamento.cliente_nome}</strong> ({agendamento.horario} - {agendamento.veiculo_modelo}) será marcado como cancelado. O registro não será excluído do histórico.
          </p>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
            Motivo do cancelamento:
          </label>
          <div className="space-y-1.5">
            {MOTIVOS_SUGERIDOS.map((m) => (
              <label
                key={m}
                className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                  motivoSelecionado === m
                    ? "bg-surface-elevated border-red-500/50 text-white font-medium"
                    : "bg-surface border-surface-border text-muted-foreground hover:text-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="motivo"
                  value={m}
                  checked={motivoSelecionado === m}
                  onChange={() => setMotivoSelecionado(m)}
                  className="accent-red-500"
                />
                <span>{m}</span>
              </label>
            ))}
          </div>
        </div>

        {motivoSelecionado === "Outro motivo" && (
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Descreva o motivo:
            </label>
            <textarea
              rows={2}
              required
              placeholder="Explique o motivo do cancelamento..."
              value={motivoPersonalizado}
              onChange={(e) => setMotivoPersonalizado(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl bg-surface-elevated border border-surface-border text-white placeholder-muted-foreground focus:outline-none focus:border-red-500"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
          <Button type="button" variant="ghost" onClick={onClose}>
            Voltar
          </Button>
          <Button
            type="submit"
            variant="outline"
            className="text-red-400 border-red-500/40 hover:bg-red-500/10"
            isLoading={submitting}
            leftIcon={<Ban className="w-3.5 h-3.5" />}
          >
            Confirmar cancelamento
          </Button>
        </div>
      </form>
    </Modal>
  );
}
