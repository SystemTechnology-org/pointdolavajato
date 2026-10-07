"use client";

import React from "react";
import {
  Calendar,
  Clock,
  Car,
  CheckCircle2,
  Star,
  AlertCircle,
  Eye,
  PlusCircle,
} from "lucide-react";
import { CommercialTimelineEvent } from "@/types";
import { formatCurrency, formatDateBR } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface LinhaTempoComercialProps {
  timeline: CommercialTimelineEvent[];
  onOpenAppointment: (appointmentId: string) => void;
  onOpenReviewModal?: (appointmentId: string) => void;
  canViewFinancial?: boolean;
}

export function LinhaTempoComercial({
  timeline,
  onOpenAppointment,
  onOpenReviewModal,
  canViewFinancial = true,
}: LinhaTempoComercialProps) {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="p-8 text-center rounded-xl bg-surface border border-surface-border">
        <Clock className="w-8 h-8 text-muted mx-auto mb-2 opacity-50" />
        <p className="text-sm font-semibold text-slate-300">Nenhum atendimento no histórico comercial</p>
        <p className="text-xs text-muted-foreground mt-1">
          Os atendimentos realizados e entregues aparecerão nesta linha do tempo.
        </p>
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-surface-border">
      {timeline.map((event, index) => {
        const isPaid = event.paidAmount >= event.contractedPrice - 0.01;
        const hasPendingBalance = event.contractedPrice > event.paidAmount + 0.01;

        return (
          <div key={event.appointmentId || index} className="relative group">
            {/* Ícone no eixo da linha do tempo */}
            <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-surface border-2 border-brand-green flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-green" />
            </div>

            {/* Card do Atendimento */}
            <div className="p-4 rounded-xl bg-surface border border-surface-border hover:border-surface-border/80 transition-all space-y-3">
              {/* TOPO: DATA, HORÁRIO E SERVIÇO */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-surface-border/60">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-white">
                    <Calendar className="w-3.5 h-3.5 text-brand-green" />
                    <span>{formatDateBR(event.date)}</span>
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{event.time}</span>
                  </span>
                  <span className="text-xs font-semibold text-slate-200">
                    • {event.serviceName}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                      (event.status as string) === "delivered" || (event.status as string) === "Entregue"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{event.status}</span>
                  </span>
                </div>
              </div>

              {/* CORPO: VEÍCULO E FINANCEIRO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Veículo */}
                <div className="flex items-center gap-2 text-slate-300">
                  <Car className="w-4 h-4 text-sky-400 shrink-0" />
                  <div>
                    <span className="font-semibold text-white">{event.vehicleModel}</span>
                    <span className="ml-1.5 text-muted-foreground font-mono">({event.vehiclePlate})</span>
                  </div>
                </div>

                {/* Financeiro (se tiver permissão) */}
                {canViewFinancial && (
                  <div className="flex items-center justify-start sm:justify-end gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground text-[11px]">Contratado:</span>
                      <span className="font-semibold text-white">{formatCurrency(event.contractedPrice)}</span>
                    </div>

                    <span className="text-muted-foreground">•</span>

                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground text-[11px]">Pago:</span>
                      <span
                        className={`font-bold ${
                          isPaid ? "text-brand-green-text" : "text-amber-400"
                        }`}
                      >
                        {formatCurrency(event.paidAmount)}
                      </span>
                    </div>

                    {hasPendingBalance && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/20 font-medium">
                        <AlertCircle className="w-2.5 h-2.5" />
                        Pendente R$ {(event.contractedPrice - event.paidAmount).toFixed(2).replace(".", ",")}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* AVALIAÇÃO / FEEDBACK */}
              <div className="pt-2 border-t border-surface-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                {event.review ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-muted-foreground mr-1">Avaliação do cliente:</span>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= event.review!.rating
                              ? "text-brand-yellow fill-brand-yellow"
                              : "text-slate-600"
                          }`}
                        />
                      ))}
                      <span className="text-xs font-bold text-brand-yellow ml-1">
                        {event.review.rating} / 5
                      </span>
                    </div>
                    {event.review.comment && (
                      <p className="text-xs text-slate-300 italic bg-black/20 p-2 rounded-lg border border-surface-border/50">
                        &quot;{event.review.comment}&quot;
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground italic">
                      Nenhuma avaliação registrada ainda
                    </span>
                    {onOpenReviewModal && (
                      <button
                        type="button"
                        onClick={() => onOpenReviewModal(event.appointmentId)}
                        className="text-xs text-brand-yellow hover:underline flex items-center gap-1 focus:outline-none"
                      >
                        <PlusCircle className="w-3 h-3" />
                        <span>Avaliar</span>
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs px-2"
                    onClick={() => onOpenAppointment(event.appointmentId)}
                    leftIcon={<Eye className="w-3.5 h-3.5" />}
                  >
                    Ver detalhes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
