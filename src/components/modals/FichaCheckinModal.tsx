"use client";

import React, { useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  Printer,
  X,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import {
  Agendamento,
  VehicleCheckin,
} from "@/types";
import { formatCurrency } from "@/lib/utils";
import {
  getFuelLevelLabel,
  getConditionLabel,
  getDamageTypeLabel,
  getDamageSeverityInfo,
} from "@/lib/services/checkin";
import { useAppStore } from "@/lib/store";

interface FichaCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkin: VehicleCheckin | null;
  agendamento?: Agendamento | null;
}

export function FichaCheckinModal({
  isOpen,
  onClose,
  checkin,
  agendamento,
}: FichaCheckinModalProps) {
  const { businessSettings } = useAppStore();
  const printRef = useRef<HTMLDivElement>(null);

  if (!checkin) return null;

  const handlePrint = () => {
    window.print();
  };

  const checklistItems = checkin.checklist_items || [];
  const damages = checkin.damages || [];
  const photos = checkin.photos || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="space-y-4">
        {/* Top Actions (Hidden on Print) */}
        <div className="flex items-center justify-between border-b border-surface-border/60 pb-3 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-green/20 border border-brand-green/30 flex items-center justify-center text-brand-green">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Ficha de Entrada & Vistoria</h3>
              <p className="text-xs text-muted-foreground">Comprovante de recebimento do veículo</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              leftIcon={<Printer className="w-4 h-4" />}
            >
              Imprimir
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="text-muted hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Document */}
        <div
          ref={printRef}
          className="p-4 sm:p-6 rounded-xl bg-surface border border-surface-border text-white space-y-4 print:p-0 print:border-0 print:bg-white print:text-black"
        >
          {/* Header da Empresa */}
          <div className="border-b border-surface-border pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 print:border-black/20">
            <div>
              <h2 className="text-lg font-black tracking-tight text-brand-green print:text-black">
                {businessSettings.commercial_name || businessSettings.business_name}
              </h2>
              <p className="text-xs text-muted-foreground print:text-slate-600">
                {businessSettings.address || "Point do Coco Lava Jato - Litoral Norte - BA"}
              </p>
              <p className="text-xs text-muted-foreground print:text-slate-600">
                WhatsApp: {businessSettings.whatsapp}
              </p>
            </div>
            <div className="sm:text-right">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-elevated border border-surface-border text-brand-yellow font-bold print:border-black/30 print:bg-slate-100 print:text-black">
                CHECK-IN #{checkin.id.slice(-6).toUpperCase()}
              </span>
              <p className="text-[11px] text-muted-foreground mt-1 print:text-slate-600">
                Data/Hora: {new Date(checkin.confirmed_at).toLocaleString("pt-BR")}
              </p>
            </div>
          </div>

          {/* Dados do Cliente e Veículo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-surface-elevated/40 border border-surface-border print:border-black/20 print:bg-slate-50 space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground print:text-slate-500">
                Cliente & Contato
              </span>
              <p className="font-semibold text-white print:text-black">
                {agendamento?.cliente_nome || "Cliente"}
              </p>
              <p className="text-muted-foreground print:text-slate-600">
                {agendamento?.cliente_whatsapp || "---"}
              </p>
              {agendamento?.servico_nome && (
                <p className="pt-1 text-brand-green print:text-slate-800 font-medium">
                  Serviço: {agendamento.servico_nome} ({formatCurrency(agendamento.valor)})
                </p>
              )}
            </div>

            <div className="p-3 rounded-xl bg-surface-elevated/40 border border-surface-border print:border-black/20 print:bg-slate-50 space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground print:text-slate-500">
                Veículo & Entrada
              </span>
              <p className="font-semibold text-white print:text-black flex items-center justify-between">
                <span>{agendamento?.veiculo_modelo || "Veículo"}</span>
                <span className="font-mono text-brand-yellow print:text-black font-bold">
                  {agendamento?.veiculo_placa || "Sem placa"}
                </span>
              </p>
              <p className="text-muted-foreground print:text-slate-600 flex items-center gap-3">
                <span>KM: <strong>{checkin.mileage ? `${checkin.mileage.toLocaleString("pt-BR")} km` : "Não anotado"}</strong></span>
                <span>Combustível: <strong>{getFuelLevelLabel(checkin.fuel_level)}</strong></span>
              </p>
              <p className="text-[11px] text-muted-foreground print:text-slate-600">
                Conferente: <strong>{checkin.confirmed_by_name || "Equipe"}</strong>
              </p>
            </div>
          </div>

          {/* Condições e Pertences */}
          <div className="p-3 rounded-xl bg-surface-elevated/40 border border-surface-border print:border-black/20 print:bg-slate-50 text-xs space-y-1.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-muted-foreground print:text-slate-500">Estado Exterior:</span>
                <p className="font-medium">{getConditionLabel(checkin.exterior_condition)}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground print:text-slate-500">Estado Interior:</span>
                <p className="font-medium">{getConditionLabel(checkin.interior_condition)}</p>
              </div>
            </div>

            {checkin.objects_left_in_vehicle && (
              <div className="pt-1 border-t border-surface-border/60 print:border-black/10">
                <span className="text-[10px] font-semibold text-brand-yellow print:text-black">
                  Pertences / Objetos Declarados:
                </span>
                <p className="italic text-slate-300 print:text-slate-800">
                  &quot;{checkin.objects_left_in_vehicle}&quot;
                </p>
              </div>
            )}

            {checkin.general_notes && (
              <div className="pt-1 border-t border-surface-border/60 print:border-black/10">
                <span className="text-[10px] font-semibold text-slate-400 print:text-slate-600">
                  Observações Gerais:
                </span>
                <p className="text-slate-300 print:text-slate-800">
                  {checkin.general_notes}
                </p>
              </div>
            )}
          </div>

          {/* Avarias Registradas */}
          <div>
            <h4 className="text-xs uppercase font-bold text-muted-foreground print:text-slate-600 mb-2 flex items-center justify-between">
              <span>Avarias Pré-existentes</span>
              <span className="text-[11px] font-semibold text-amber-400 print:text-black">
                {damages.length} registrada{damages.length === 1 ? "" : "s"}
              </span>
            </h4>

            {damages.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-1 print:text-slate-500">
                Nenhuma avaria ou dano pré-existente apontado na entrada.
              </p>
            ) : (
              <div className="space-y-1.5">
                {damages.map((dmg, idx) => {
                  const sev = getDamageSeverityInfo(dmg.severity);
                  return (
                    <div
                      key={dmg.id || idx}
                      className="p-2.5 rounded-lg bg-surface-elevated border border-surface-border text-xs flex items-start justify-between gap-2 print:border-black/20 print:bg-white"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-semibold text-white print:text-black">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 print:text-black" />
                          <span>{dmg.specific_part || dmg.location}</span>
                          <span className="text-muted-foreground font-normal">•</span>
                          <span className="text-slate-300 print:text-slate-700">{getDamageTypeLabel(dmg.type)}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground print:text-slate-600">
                          {dmg.description}
                        </p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${sev.badgeClass} print:border-black print:text-black`}>
                        {sev.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Resumo do Checklist */}
          {checklistItems.length > 0 && (
            <div>
              <h4 className="text-xs uppercase font-bold text-muted-foreground print:text-slate-600 mb-2">
                Itens do Checklist Visual
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
                {checklistItems.slice(0, 15).map((item) => (
                  <div
                    key={item.id || item.item_key}
                    className="flex items-center gap-1.5 p-1.5 rounded bg-surface-elevated/40 border border-surface-border/60 print:border-black/10 print:bg-transparent"
                  >
                    {item.status === "ok" ? (
                      <CheckCircle2 className="w-3 h-3 text-brand-green print:text-black shrink-0" />
                    ) : item.status === "damaged" ? (
                      <AlertTriangle className="w-3 h-3 text-amber-400 print:text-black shrink-0" />
                    ) : (
                      <span className="w-3 h-3 text-[10px] font-bold text-muted-foreground text-center shrink-0">-</span>
                    )}
                    <span className="truncate text-slate-300 print:text-black">{item.item_label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fotos de Vistoria (se houver) */}
          {photos.length > 0 && (
            <div className="print:hidden">
              <h4 className="text-xs uppercase font-bold text-muted-foreground mb-2">
                Fotos da Vistoria ({photos.length})
              </h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {photos.map((ph, idx) => (
                  <div key={ph.id || idx} className="aspect-video rounded-lg overflow-hidden border border-surface-border bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ph.photo_url} alt={ph.description || "Foto"} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assinatura de Entrada */}
          <div className="pt-6 border-t border-surface-border grid grid-cols-2 gap-6 text-center text-xs print:border-black/20 print:pt-8">
            <div>
              <div className="border-b border-surface-border print:border-black mb-1 w-3/4 mx-auto h-8" />
              <p className="text-muted-foreground print:text-black">Assinatura do Cliente</p>
            </div>
            <div>
              <div className="border-b border-surface-border print:border-black mb-1 w-3/4 mx-auto h-8" />
              <p className="text-muted-foreground print:text-black">{checkin.confirmed_by_name || "Conferente Responsável"}</p>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border/60 print:hidden">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4" />}
            className="bg-brand-green hover:bg-emerald-600 text-black font-bold"
          >
            Imprimir Comprovante
          </Button>
        </div>
      </div>
    </Modal>
  );
}
