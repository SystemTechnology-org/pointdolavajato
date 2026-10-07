"use client";

import React, { useState } from "react";
import { Star, AlertTriangle, MessageSquare, Check } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { Agendamento, ServiceReview } from "@/types";

interface RegistrarAvaliacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  appointments: Agendamento[];
  preselectedAppointmentId?: string;
  existingReview?: ServiceReview | null;
  onSuccess?: () => void;
}

const RATING_LABELS: Record<number, string> = {
  1: "Muito insatisfeito (1 estrela)",
  2: "Regular / Deixou a desejar (2 estrelas)",
  3: "Bom / Atendeu o esperado (3 estrelas)",
  4: "Muito bom / Satisfeito (4 estrelas)",
  5: "Excelente / Superou expectativas (5 estrelas)",
};

export function RegistrarAvaliacaoModal({
  isOpen,
  onClose,
  customerId,
  customerName,
  appointments,
  preselectedAppointmentId,
  existingReview,
  onSuccess,
}: RegistrarAvaliacaoModalProps) {
  const { addServiceReview } = useAppStore();
  const { success, error } = useToast();

  const [selectedAppId, setSelectedAppId] = useState<string>(
    preselectedAppointmentId || (appointments.length > 0 ? appointments[0].id : "")
  );
  const [rating, setRating] = useState<number>(existingReview?.rating || 5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>(existingReview?.comment || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtra agendamentos passíveis de avaliação (concluídos ou recentes)
  const availableApps = appointments;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppId) {
      error("Selecione o atendimento a ser avaliado.");
      return;
    }

    if (rating < 1 || rating > 5) {
      error("A nota de avaliação deve ser entre 1 e 5 estrelas.");
      return;
    }

    setIsSubmitting(true);
    try {
      await addServiceReview({
        appointment_id: selectedAppId,
        customer_id: customerId,
        rating,
        comment: comment.trim() || undefined,
      });

      success(
        rating <= 2
          ? "Avaliação registrada. Lembre-se de realizar acompanhamento do feedback com o cliente."
          : "Avaliação do cliente registrada com sucesso!"
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : "Erro ao registrar avaliação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar Avaliação do Cliente" size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* IDENTIFICAÇÃO DO CLIENTE */}
        <div className="p-3 bg-surface border border-surface-border rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Cliente</span>
            <p className="text-sm font-bold text-white">{customerName}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-brand-yellow/10 flex items-center justify-center text-brand-yellow">
            <Star className="w-4 h-4 fill-brand-yellow" />
          </div>
        </div>

        {/* SELEÇÃO DO ATENDIMENTO */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Atendimento Relacionado <span className="text-rose-400">*</span>
          </label>
          {availableApps.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3 rounded-lg border border-surface-border bg-surface">
              Nenhum atendimento encontrado para vincular esta avaliação.
            </p>
          ) : (
            <select
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(e.target.value)}
              className="w-full text-xs px-3 py-2.5 rounded-lg bg-surface border border-surface-border text-white focus:outline-none focus:border-brand-green"
              required
            >
              {availableApps.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.data} - {a.servico_nome} ({a.veiculo_modelo || "Veículo"} - {a.veiculo_placa})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* NOTA DE 1 A 5 ESTRELAS */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Nota do Serviço (1 a 5 estrelas) <span className="text-rose-400">*</span>
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = (hoverRating || rating) >= star;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 rounded hover:scale-110 transition-transform focus:outline-none"
                  aria-label={`${star} estrelas`}
                >
                  <Star
                    className={`w-7 h-7 transition-colors ${
                      active
                        ? "text-brand-yellow fill-brand-yellow"
                        : "text-slate-600 hover:text-slate-400"
                    }`}
                  />
                </button>
              );
            })}
          </div>
          <p className="text-xs text-brand-yellow font-medium mt-1.5">
            {RATING_LABELS[rating] || `${rating} estrelas`}
          </p>
        </div>

        {/* ALERTA SE NOTA FOR BAIXA (<= 2) */}
        {rating <= 2 && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-start gap-2.5 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div>
              <p className="font-semibold text-amber-200">Atenção ao feedback insatisfatório</p>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                Avaliações de 1 ou 2 estrelas acionam alerta na gestão de qualidade. Após salvar, utilize o WhatsApp para entender o ocorrido com o cliente.
              </p>
            </div>
          </div>
        )}

        {/* COMENTÁRIO OU OBSERVAÇÃO DO CLIENTE */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-muted" />
            <span>Comentário ou Relato do Cliente (Opcional)</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Ex: O cliente elogiou a limpeza interna, mas comentou que demorou um pouco para secar os frisos..."
            className="w-full text-xs px-3 py-2 rounded-lg bg-surface border border-surface-border text-white placeholder-muted focus:outline-none focus:border-brand-green resize-none"
          />
        </div>

        {/* BOTÕES */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting || availableApps.length === 0}
            leftIcon={<Check className="w-4 h-4" />}
          >
            {isSubmitting ? "Salvando..." : "Salvar Avaliação"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
