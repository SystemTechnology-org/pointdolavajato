"use client";

import React from "react";
import { AlertTriangle, Plus, ShieldCheck } from "lucide-react";
import { DamageLocation } from "@/types";

export interface VehicleDamagePreview {
  id?: string;
  type?: string;
  location: DamageLocation;
  specific_part?: string | null;
  severity?: string;
  description?: string;
  photo_url?: string | null;
}

interface MapaVisualVeiculoProps {
  damages: VehicleDamagePreview[];
  onSelectZone: (location: DamageLocation, partName: string) => void;
  selectedLocation?: DamageLocation | null;
  readOnly?: boolean;
}

export function MapaVisualVeiculo({
  damages,
  onSelectZone,
  selectedLocation,
  readOnly = false,
}: MapaVisualVeiculoProps) {
  const getDamagesByLocation = (location: DamageLocation) => {
    return damages.filter((d) => d.location === location);
  };

  return (
    <div className="p-4 rounded-2xl bg-surface border border-surface-border space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border/60 pb-3">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Mapa Esquemático do Veículo</span>
            {damages.length > 0 ? (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                {damages.length} {damages.length === 1 ? "avaria" : "avarias"}
              </span>
            ) : (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand-green/20 text-brand-green-text border border-brand-green/30 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-brand-green" />
                Sem avarias
              </span>
            )}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Toque em qualquer setor do veículo para marcar ou consultar avarias pré-existentes.
          </p>
        </div>

        {!readOnly && (
          <span className="text-[11px] text-brand-yellow font-medium">
            + Toque no setor para apontar
          </span>
        )}
      </div>

      {/* Grid Interativo do Veículo (Mobile First & Visual Car Layout) */}
      <div className="max-w-lg mx-auto bg-surface-elevated/40 p-4 rounded-xl border border-surface-border/80">
        <div className="text-center text-[10px] tracking-wider uppercase font-bold text-muted-foreground mb-2 flex items-center justify-center gap-2">
          <span>▲ FRENTE DO VEÍCULO ▲</span>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          {/* Linha 1: Frente e Capô */}
          <div className="col-span-3">
            <button
              type="button"
              disabled={readOnly}
              onClick={() => onSelectZone("dianteira", "Para-choque dianteiro")}
              className={`w-full py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                getDamagesByLocation("dianteira").length > 0
                  ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                  : selectedLocation === "dianteira"
                  ? "bg-brand-green/20 border-brand-green text-white"
                  : "bg-surface-elevated border-surface-border text-slate-300 hover:border-slate-500 hover:text-white"
              }`}
            >
              <span>Frente / Para-choque</span>
              {getDamagesByLocation("dianteira").length > 0 ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {getDamagesByLocation("dianteira").length}
                </span>
              ) : (
                !readOnly && <Plus className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </button>
          </div>

          {/* Linha 2: Capô (centro) */}
          <div className="col-span-3">
            <button
              type="button"
              disabled={readOnly}
              onClick={() => onSelectZone("dianteira", "Capô")}
              className={`w-full py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-between transition-all ${
                selectedLocation === "dianteira"
                  ? "border-brand-green/60 bg-surface-elevated text-white"
                  : "bg-surface/80 border-surface-border text-slate-300 hover:text-white"
              }`}
            >
              <span className="text-center w-full">Capô</span>
            </button>
          </div>

          {/* Linha 3: Retrovisor Esq / Teto / Retrovisor Dir */}
          <button
            type="button"
            disabled={readOnly}
            onClick={() => onSelectZone("lateral_esquerda", "Retrovisor esquerdo")}
            className="py-2 px-2 rounded-lg border border-surface-border bg-surface text-[11px] text-slate-300 hover:text-white text-center"
          >
            Retrovisor Esq.
          </button>

          <button
            type="button"
            disabled={readOnly}
            onClick={() => onSelectZone("teto", "Teto")}
            className={`py-2 px-2 rounded-lg border text-xs font-semibold text-center transition-all ${
              getDamagesByLocation("teto").length > 0
                ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                : "bg-surface-elevated border-surface-border text-slate-200 hover:text-white"
            }`}
          >
            Teto
          </button>

          <button
            type="button"
            disabled={readOnly}
            onClick={() => onSelectZone("lateral_direita", "Retrovisor direito")}
            className="py-2 px-2 rounded-lg border border-surface-border bg-surface text-[11px] text-slate-300 hover:text-white text-center"
          >
            Retrovisor Dir.
          </button>

          {/* Linha 4: Lateral Esquerda / Interior / Lateral Direita */}
          <button
            type="button"
            disabled={readOnly}
            onClick={() => onSelectZone("lateral_esquerda", "Portas lado esquerdo")}
            className={`py-3 px-2 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
              getDamagesByLocation("lateral_esquerda").length > 0
                ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                : "bg-surface-elevated border-surface-border text-slate-300 hover:text-white"
            }`}
          >
            <span>Lateral Esq.</span>
            <span className="text-[10px] text-muted-foreground font-normal">(Motorista)</span>
            {getDamagesByLocation("lateral_esquerda").length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-200">
                {getDamagesByLocation("lateral_esquerda").length} avarias
              </span>
            )}
          </button>

          <button
            type="button"
            disabled={readOnly}
            onClick={() => onSelectZone("interior", "Bancos e Painel")}
            className={`py-3 px-2 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
              getDamagesByLocation("interior").length > 0
                ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                : "bg-surface-elevated/80 border-surface-border text-slate-300 hover:text-white"
            }`}
          >
            <span>Cabine</span>
            <span className="text-[10px] text-muted-foreground font-normal">(Interior)</span>
            {getDamagesByLocation("interior").length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-200">
                {getDamagesByLocation("interior").length} avarias
              </span>
            )}
          </button>

          <button
            type="button"
            disabled={readOnly}
            onClick={() => onSelectZone("lateral_direita", "Portas lado direito")}
            className={`py-3 px-2 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
              getDamagesByLocation("lateral_direita").length > 0
                ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                : "bg-surface-elevated border-surface-border text-slate-300 hover:text-white"
            }`}
          >
            <span>Lateral Dir.</span>
            <span className="text-[10px] text-muted-foreground font-normal">(Passageiro)</span>
            {getDamagesByLocation("lateral_direita").length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-200">
                {getDamagesByLocation("lateral_direita").length} avarias
              </span>
            )}
          </button>

          {/* Linha 5: Rodas & Pneus */}
          <div className="col-span-3">
            <button
              type="button"
              disabled={readOnly}
              onClick={() => onSelectZone("rodas", "Rodas e Pneus")}
              className={`w-full py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-between transition-all ${
                getDamagesByLocation("rodas").length > 0
                  ? "bg-amber-500/15 border-amber-500/50 text-amber-300 font-semibold"
                  : "bg-surface border-surface-border text-slate-300 hover:text-white"
              }`}
            >
              <span>Rodas, Pneus e Calotas</span>
              {getDamagesByLocation("rodas").length > 0 ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200">
                  {getDamagesByLocation("rodas").length}
                </span>
              ) : (
                !readOnly && <Plus className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </button>
          </div>

          {/* Linha 6: Porta-malas */}
          <div className="col-span-3">
            <button
              type="button"
              disabled={readOnly}
              onClick={() => onSelectZone("porta_malas", "Porta-malas")}
              className={`w-full py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-between transition-all ${
                getDamagesByLocation("porta_malas").length > 0
                  ? "bg-amber-500/15 border-amber-500/50 text-amber-300 font-semibold"
                  : "bg-surface border-surface-border text-slate-300 hover:text-white"
              }`}
            >
              <span>Porta-malas</span>
              {getDamagesByLocation("porta_malas").length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200">
                  {getDamagesByLocation("porta_malas").length}
                </span>
              )}
            </button>
          </div>

          {/* Linha 7: Traseira / Para-choque Traseiro */}
          <div className="col-span-3">
            <button
              type="button"
              disabled={readOnly}
              onClick={() => onSelectZone("traseira", "Para-choque traseiro")}
              className={`w-full py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                getDamagesByLocation("traseira").length > 0
                  ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                  : selectedLocation === "traseira"
                  ? "bg-brand-green/20 border-brand-green text-white"
                  : "bg-surface-elevated border-surface-border text-slate-300 hover:border-slate-500 hover:text-white"
              }`}
            >
              <span>Traseira / Para-choque</span>
              {getDamagesByLocation("traseira").length > 0 ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {getDamagesByLocation("traseira").length}
                </span>
              ) : (
                !readOnly && <Plus className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>

        <div className="text-center text-[10px] tracking-wider uppercase font-bold text-muted-foreground mt-2">
          <span>▼ TRASEIRA DO VEÍCULO ▼</span>
        </div>
      </div>
    </div>
  );
}
