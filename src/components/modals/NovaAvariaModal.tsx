"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AlertTriangle, Camera, Trash2, X } from "lucide-react";
import {
  DamageType,
  DamageLocation,
  DamageSeverity,
} from "@/types";
import {
  DAMAGE_TYPES,
  DAMAGE_LOCATIONS,
  DAMAGE_SEVERITIES,
  compressImageFile,
} from "@/lib/services/checkin";

interface NovaAvariaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (damage: {
    type: DamageType;
    location: DamageLocation;
    specific_part?: string | null;
    severity: DamageSeverity;
    description: string;
    photo_url?: string | null;
  }) => void;
  initialLocation?: DamageLocation | null;
  initialPartName?: string | null;
}

export function NovaAvariaModal({
  isOpen,
  onClose,
  onConfirm,
  initialLocation,
  initialPartName,
}: NovaAvariaModalProps) {
  const [type, setType] = useState<DamageType>("risco");
  const [location, setLocation] = useState<DamageLocation>("lateral_direita");
  const [specificPart, setSpecificPart] = useState("");
  const [severity, setSeverity] = useState<DamageSeverity>("leve");
  const [description, setDescription] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialLocation) setLocation(initialLocation);
      if (initialPartName) setSpecificPart(initialPartName);
      else {
        const found = DAMAGE_LOCATIONS.find((l) => l.value === (initialLocation || "lateral_direita"));
        setSpecificPart(found?.partDefault || "");
      }
      setType("risco");
      setSeverity("leve");
      setDescription("");
      setPhotoPreview(null);
    }
  }, [isOpen, initialLocation, initialPartName]);

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const res = await compressImageFile(file, 1024, 0.8);
      setPhotoPreview(res.dataUrl);
    } catch (err) {
      console.warn("Erro ao comprimir imagem da avaria:", err);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      alert("Por favor, preencha uma breve descrição da avaria.");
      return;
    }

    onConfirm({
      type,
      location,
      specific_part: specificPart.trim() || null,
      severity,
      description: description.trim(),
      photo_url: photoPreview,
    });

    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Apontar Avaria no Veículo</h3>
              <p className="text-xs text-muted-foreground">Registre dano pré-existente antes da lavagem.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Localização e Peça */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Região do Carro
            </label>
            <select
              value={location}
              onChange={(e) => {
                const loc = e.target.value as DamageLocation;
                setLocation(loc);
                const found = DAMAGE_LOCATIONS.find((l) => l.value === loc);
                if (found) setSpecificPart(found.partDefault);
              }}
              className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-surface-border text-white text-xs focus:outline-none focus:border-brand-green"
            >
              {DAMAGE_LOCATIONS.map((loc) => (
                <option key={loc.value} value={loc.value}>
                  {loc.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Peça / Componente
            </label>
            <Input
              value={specificPart}
              onChange={(e) => setSpecificPart(e.target.value)}
              placeholder="Ex: Porta dianteira direita"
              className="h-9 text-xs"
              required
            />
          </div>
        </div>

        {/* Tipo de Dano e Gravidade */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Tipo de Avaria
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as DamageType)}
              className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-surface-border text-white text-xs focus:outline-none focus:border-brand-green"
            >
              {DAMAGE_TYPES.map((dt) => (
                <option key={dt.value} value={dt.value}>
                  {dt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Gravidade do Dano
            </label>
            <div className="grid grid-cols-3 gap-1.5 pt-0.5">
              {DAMAGE_SEVERITIES.map((sev) => {
                const isSelected = severity === sev.value;
                return (
                  <button
                    key={sev.value}
                    type="button"
                    onClick={() => setSeverity(sev.value)}
                    className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold text-center transition-all ${
                      isSelected
                        ? sev.badgeClass + " ring-1 ring-current"
                        : "bg-surface-elevated border-surface-border text-slate-400 hover:text-white"
                    }`}
                  >
                    {sev.value === "leve" ? "Leve" : sev.value === "media" ? "Média" : "Grave"}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Descrição Detalhada */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Descrição / Detalhes da Avaria *
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Risco superficial próximo à maçaneta, com cerca de 5cm..."
            className="w-full p-2.5 text-xs rounded-xl bg-surface-elevated border border-surface-border text-white placeholder-muted-foreground focus:outline-none focus:border-brand-green"
            required
          />
        </div>

        {/* Foto da Avaria (Opcional) */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Foto do Detalhe (Opcional)
          </label>
          {photoPreview ? (
            <div className="relative w-full h-36 rounded-xl overflow-hidden border border-surface-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt="Preview da avaria"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setPhotoPreview(null)}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-red-400 hover:text-white hover:bg-red-600 transition-colors"
                title="Remover foto"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-dashed border-surface-border hover:border-slate-500 bg-surface-elevated/40 cursor-pointer transition-colors text-center">
              <Camera className="w-5 h-5 text-brand-yellow mb-1" />
              <span className="text-xs text-white font-medium">
                {isCompressing ? "Processando imagem..." : "Tirar foto ou escolher arquivo"}
              </span>
              <span className="text-[10px] text-muted-foreground">Celular ou galeria</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                className="hidden"
                disabled={isCompressing}
              />
            </label>
          )}
        </div>

        {/* Botões */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border/60">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            className="bg-brand-green hover:bg-emerald-600 text-black font-bold"
          >
            Adicionar Avaria
          </Button>
        </div>
      </form>
    </Modal>
  );
}
