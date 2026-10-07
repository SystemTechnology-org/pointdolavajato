"use client";

import React, { useState, useRef } from "react";
import {
  CheckSquare,
  Square,
  Camera,
  Sparkles,
  Upload,
  X,
  FileText,
  User,
  ShieldCheck,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAppStore } from "@/lib/store";
import { Agendamento, CheckinPhotoType } from "@/types";
import { compressImageFile } from "@/lib/services/checkin";

interface ConferenciaFinalModalProps {
  isOpen: boolean;
  onClose: () => void;
  agendamento: Agendamento;
  onSuccess?: () => void;
}

const CHECKLIST_ITEMS = [
  { key: "servico_realizado", label: "Serviço contratado realizado integralmente" },
  { key: "interior_conferido", label: "Interior conferido, limpo e aspirado" },
  { key: "exterior_conferido", label: "Exterior seco, sem marcas de sabão ou manchas" },
  { key: "vidros_conferidos", label: "Vidros limpos e translúcidos por dentro e por fora" },
  { key: "rodas_conferidas", label: "Rodas e caixas limpas, pneus pretinhos" },
  { key: "objetos_conferidos", label: "Objetos e pertences do cliente conferidos no veículo" },
  { key: "pronto_entrega", label: "Veículo inspecionado e pronto para entrega ao cliente" },
];

const FINAL_PHOTO_SLOTS: Array<{ type: CheckinPhotoType; label: string }> = [
  { type: "final_front", label: "Frente Limpa" },
  { type: "final_rear", label: "Traseira Limpa" },
  { type: "final_left", label: "Lateral Esquerda" },
  { type: "final_right", label: "Lateral Direita" },
  { type: "final_interior", label: "Interior Higienizado" },
  { type: "final_other", label: "Detalhe Extra" },
];

export function ConferenciaFinalModal({
  isOpen,
  onClose,
  agendamento,
  onSuccess,
}: ConferenciaFinalModalProps) {
  const { salvarConferenciaFinal } = useAppStore();
  const { success, error, info } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [responsavel, setResponsavel] = useState<string>("Conferente");
  const [finalNotes, setFinalNotes] = useState<string>(agendamento.final_notes || "");

  // Estado dos 7 itens do checklist
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    if (agendamento.checkout_checklist) {
      return { ...agendamento.checkout_checklist };
    }
    const initial: Record<string, boolean> = {};
    CHECKLIST_ITEMS.forEach((item) => {
      initial[item.key] = false;
    });
    return initial;
  });

  // Fotos de saída capturadas/selecionadas
  const [photos, setPhotos] = useState<
    Array<{
      type: CheckinPhotoType;
      dataUrl: string;
      storagePath: string;
      description?: string;
    }>
  >([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeSlotType, setActiveSlotType] = useState<CheckinPhotoType>("final_front");

  const toggleItem = (key: string) => {
    setChecklist((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleMarcarTodos = () => {
    const allChecked: Record<string, boolean> = {};
    CHECKLIST_ITEMS.forEach((item) => {
      allChecked[item.key] = true;
    });
    setChecklist(allChecked);
  };

  const handleTriggerUpload = (type: CheckinPhotoType) => {
    setActiveSlotType(type);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { dataUrl } = await compressImageFile(file, 1280, 0.82);
      const storagePath = `checkout/${agendamento.id}/${activeSlotType}_${Date.now()}.jpg`;

      setPhotos((prev) => [
        ...prev.filter((p) => p.type !== activeSlotType),
        {
          type: activeSlotType,
          dataUrl,
          storagePath,
          description: `Foto de saída: ${activeSlotType}`,
        },
      ]);
      success("Foto anexada com sucesso!");
    } catch {
      error("Erro ao processar imagem.");
    }
  };

  const handleRemoverFoto = (type: CheckinPhotoType) => {
    setPhotos((prev) => prev.filter((p) => p.type !== type));
  };

  const handleSalvar = async (markAsReady: boolean) => {
    const checkedCount = Object.values(checklist).filter(Boolean).length;
    if (markAsReady && checkedCount < CHECKLIST_ITEMS.length) {
      info("Recomendamos marcar todos os itens de inspeção antes de sinalizar como pronto.");
    }

    try {
      setIsLoading(true);

      const finalPhotosPayload = photos.map((p) => ({
        storage_path: p.storagePath,
        photo_url: p.dataUrl,
        photo_type: p.type,
        description: p.description,
      }));

      await salvarConferenciaFinal(agendamento.id, {
        checkout_checklist: checklist,
        final_notes: finalNotes.trim() || undefined,
        markAsReady,
        ready_by_name: responsavel.trim() || "Conferente",
        final_photos: finalPhotosPayload,
      });

      if (markAsReady) {
        success("Veículo marcado como PRONTO para retirada!");
      } else {
        success("Conferência salva com sucesso!");
      }

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar conferência.";
      error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const totalConferidos = Object.values(checklist).filter(Boolean).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Conferência Final de Saída"
      size="lg"
    >
      <div className="space-y-6">
        {/* Cabeçalho do Atendimento */}
        <div className="p-3.5 rounded-xl bg-surface-elevated/40 border border-surface-border flex items-center justify-between text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px]">Veículo a inspecionar</span>
            <span className="font-bold text-white text-sm">
              {agendamento.veiculo_modelo} {agendamento.veiculo_placa && agendamento.veiculo_placa !== "---" && `(${agendamento.veiculo_placa})`}
            </span>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground block text-[11px]">Cliente</span>
            <span className="font-semibold text-brand-yellow">{agendamento.cliente_nome}</span>
          </div>
        </div>

        {/* 1. CHECKLIST DE SAÍDA (7 ITENS) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-green" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Itens de Inspeção Final ({totalConferidos}/{CHECKLIST_ITEMS.length})
              </h4>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleMarcarTodos}
              className="text-[11px] h-7 px-2.5"
            >
              Marcar todos como OK
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CHECKLIST_ITEMS.map((item) => {
              const checked = !!checklist[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggleItem(item.key)}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                    checked
                      ? "bg-brand-green/10 border-brand-green/40 text-white"
                      : "bg-surface-elevated/30 border-surface-border text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-brand-green" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                  <span className={`text-xs ${checked ? "font-semibold text-white" : ""}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. FOTOS DO VEÍCULO PRONTO (OPCIONAIS) */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-brand-yellow" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Fotos do Veículo Pronto (Opcional)
            </h4>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {FINAL_PHOTO_SLOTS.map((slot) => {
              const attached = photos.find((p) => p.type === slot.type);
              return (
                <div
                  key={slot.type}
                  className="relative aspect-video rounded-xl border border-surface-border bg-surface-elevated/40 overflow-hidden group flex flex-col items-center justify-center text-center p-2"
                >
                  {attached ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={attached.dataUrl}
                        alt={slot.label}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoverFoto(slot.type)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/80 text-rose-400 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <span className="absolute bottom-1 left-2 text-[10px] bg-black/75 px-1.5 py-0.5 rounded text-white font-medium">
                        {slot.label}
                      </span>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleTriggerUpload(slot.type)}
                      className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-brand-green transition-colors"
                    >
                      <Upload className="w-4 h-4 text-muted-foreground group-hover:text-brand-green" />
                      <span className="text-[11px] font-medium">{slot.label}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. RESPONSÁVEL E OBSERVAÇÕES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Responsável pela Inspeção:
            </label>
            <input
              type="text"
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              placeholder="Nome do conferente"
              className="w-full h-9 px-3 rounded-xl bg-surface-elevated border border-surface-border text-white placeholder:text-muted focus:border-brand-green focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Observações da Finalização:
            </label>
            <input
              type="text"
              value={finalNotes}
              onChange={(e) => setFinalNotes(e.target.value)}
              placeholder="Ex: Veículo perfumado, tapetes limpos..."
              className="w-full h-9 px-3 rounded-xl bg-surface-elevated border border-surface-border text-white placeholder:text-muted focus:border-brand-green focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* 4. AÇÕES */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-surface-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            Fechar
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSalvar(false)}
              disabled={isLoading}
              className="flex-1 sm:flex-none"
            >
              Salvar Apenas
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => handleSalvar(true)}
              isLoading={isLoading}
              leftIcon={<Sparkles className="w-4 h-4 fill-current" />}
              className="flex-1 sm:flex-none bg-brand-green hover:bg-emerald-600 text-black font-bold shadow-lg shadow-brand-green/20"
            >
              Marcar como PRONTO
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
