"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Car,
  ShieldCheck,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Gauge,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useAppStore } from "@/lib/store";
import {
  Agendamento,
  VehicleCheckin,
  VehicleDamage,
  VehicleChecklistItem,
  VehicleCheckinPhoto,
  DamageLocation,
  DamageType,
  DamageSeverity,
  FuelLevel,
  VehicleCondition,
  ChecklistItemStatus,
} from "@/types";
import {
  CHECKLIST_TEMPLATE,
  FUEL_LEVELS,
  VEHICLE_CONDITIONS,
  compressImageFile,
  getDamageTypeLabel,
  getDamageSeverityInfo,
  uploadCheckinPhotoToSupabase,
} from "@/lib/services/checkin";
import { MapaVisualVeiculo } from "./MapaVisualVeiculo";
import { NovaAvariaModal } from "@/components/modals/NovaAvariaModal";

interface CheckinFormWizardProps {
  agendamento: Agendamento;
  onSuccess?: (checkin: VehicleCheckin) => void;
  onCancel?: () => void;
}

export function CheckinFormWizard({
  agendamento,
  onSuccess,
  onCancel,
}: CheckinFormWizardProps) {
  const router = useRouter();
  const { createVehicleCheckin, profiles, currentRole } = useAppStore();
  const { success, error } = useToast();

  // Etapa ativa do wizard (1 a 5)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // 1. Dados do Veículo
  const [mileage, setMileage] = useState<string>("");
  const [fuelLevel, setFuelLevel] = useState<FuelLevel>("1/2");
  const [interiorCondition, setInteriorCondition] = useState<VehicleCondition>("bom");
  const [exteriorCondition, setExteriorCondition] = useState<VehicleCondition>("bom");
  const [objectsLeft, setObjectsLeft] = useState<string>("");
  const [generalNotes, setGeneralNotes] = useState<string>(agendamento.observacoes || "");

  // 2. Checklist de Itens
  const [checklistState, setChecklistState] = useState<
    Record<string, { status: ChecklistItemStatus; notes: string }>
  >(() => {
    const initial: Record<string, { status: ChecklistItemStatus; notes: string }> = {};
    CHECKLIST_TEMPLATE.forEach((item) => {
      initial[item.key] = { status: "ok", notes: "" };
    });
    return initial;
  });

  // 3. Avarias
  const [damages, setDamages] = useState<
    Omit<VehicleDamage, "id" | "checkin_id" | "vehicle_id" | "created_at">[]
  >([]);
  const [isAvariaModalOpen, setIsAvariaModalOpen] = useState(false);
  const [selectedZoneLocation, setSelectedZoneLocation] = useState<DamageLocation | null>(null);
  const [selectedZonePart, setSelectedZonePart] = useState<string | null>(null);

  // 4. Fotos
  const [photos, setPhotos] = useState<
    Omit<VehicleCheckinPhoto, "id" | "checkin_id" | "vehicle_id" | "created_at">[]
  >([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // 5. Estado de Salvamento
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Operador responsável
  const activeProfile = profiles.find((p) => p.role === currentRole);
  const operatorName = activeProfile?.full_name || (currentRole === "admin" ? "Administrador" : "Operador");

  // Manipular alteração de status do checklist
  const handleChecklistStatusChange = (key: string, status: ChecklistItemStatus) => {
    setChecklistState((prev) => ({
      ...prev,
      [key]: { ...prev[key], status },
    }));
  };

  // Abrir modal de avaria ao clicar em setor do mapa
  const handleSelectZone = (location: DamageLocation, partName: string) => {
    setSelectedZoneLocation(location);
    setSelectedZonePart(partName);
    setIsAvariaModalOpen(true);
  };

  // Confirmar adição de avaria
  const handleAddDamage = (damage: {
    type: DamageType;
    location: DamageLocation;
    specific_part?: string | null;
    severity: DamageSeverity;
    description: string;
    photo_url?: string | null;
  }) => {
    setDamages((prev) => [
      ...prev,
      {
        type: damage.type,
        location: damage.location,
        specific_part: damage.specific_part,
        severity: damage.severity,
        description: damage.description,
        photo_url: damage.photo_url || null,
      },
    ]);
    success("Avaria registrada no mapa!");
  };

  const handleRemoveDamage = (index: number) => {
    setDamages((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload e compressão de foto
  const handlePhotoCapture = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "front" | "rear" | "left_side" | "right_side" | "interior" | "other"
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPhoto(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressed = await compressImageFile(file, 1280, 0.82);

        // Upload no Supabase Storage se configurado
        let photoUrl = compressed.dataUrl;
        let storagePath = `inspections/${Date.now()}_${file.name}`;

        const uploadResult = await uploadCheckinPhotoToSupabase(
          compressed.blob,
          file.name
        );
        if (uploadResult) {
          photoUrl = uploadResult.publicUrl;
          storagePath = uploadResult.storagePath;
        }

        setPhotos((prev) => [
          ...prev,
          {
            storage_path: storagePath,
            photo_url: photoUrl,
            photo_type: type,
            description: `Foto do ângulo: ${type}`,
          },
        ]);
      }
      success("Foto adicionada à vistoria!");
    } catch (err) {
      console.error("Falha no upload da foto:", err);
      error("Erro ao processar imagem.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Finalizar e salvar Check-in
  const handleFinalizarCheckin = async () => {
    setIsSubmitting(true);
    try {
      const itemsPayload: Omit<VehicleChecklistItem, "id" | "checkin_id">[] =
        CHECKLIST_TEMPLATE.map((tpl) => ({
          category: tpl.category,
          item_key: tpl.key,
          item_label: tpl.label,
          status: checklistState[tpl.key]?.status || "ok",
          notes: checklistState[tpl.key]?.notes || null,
        }));

      const newCheckin = await createVehicleCheckin({
        appointment_id: agendamento.id,
        vehicle_id: agendamento.veiculo_id || "veic-1",
        customer_id: agendamento.cliente_id || "cli-1",
        mileage: mileage ? parseInt(mileage, 10) : null,
        fuel_level: fuelLevel,
        interior_condition: interiorCondition,
        exterior_condition: exteriorCondition,
        objects_left_in_vehicle: objectsLeft.trim() || null,
        general_notes: generalNotes.trim() || null,
        confirmed_by: activeProfile?.id || null,
        confirmed_by_name: operatorName,
        checklist_items: itemsPayload,
        damages,
        photos,
      });

      success("Check-in do veículo concluído com sucesso!");
      if (onSuccess) {
        onSuccess(newCheckin);
      } else {
        router.push("/atendimentos");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao finalizar check-in.";
      error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { num: 1, label: "Condições & KM" },
    { num: 2, label: "Checklist" },
    { num: 3, label: "Avarias" },
    { num: 4, label: "Fotos" },
    { num: 5, label: "Revisão" },
  ];

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* 1. Header do Atendimento */}
      <div className="p-4 rounded-2xl bg-surface border border-surface-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-green/20 border border-brand-green/40 flex items-center justify-center text-brand-green shrink-0">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-brand-yellow">
                  #{agendamento.code || agendamento.id.slice(-6).toUpperCase()}
                </span>
                <span className="text-sm font-bold text-white">
                  {agendamento.veiculo_modelo}
                </span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-surface-elevated text-brand-yellow-text border border-surface-border font-bold">
                  {agendamento.veiculo_placa && agendamento.veiculo_placa !== "---"
                    ? agendamento.veiculo_placa
                    : "Sem placa"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cliente: <strong className="text-slate-300">{agendamento.cliente_nome}</strong> • Serviço:{" "}
                <span className="text-brand-green-text font-medium">{agendamento.servico_nome}</span>
              </p>
            </div>
          </div>

          <div className="text-right text-xs text-muted-foreground">
            <span>Conferente: </span>
            <strong className="text-white">{operatorName}</strong>
          </div>
        </div>

        {/* Stepper horizontal (Mobile-Friendly) */}
        <div className="flex items-center justify-between gap-1 mt-4 pt-3 border-t border-surface-border/60 overflow-x-auto">
          {steps.map((st) => {
            const isActive = currentStep === st.num;
            const isCompleted = currentStep > st.num;
            return (
              <button
                key={st.num}
                type="button"
                onClick={() => setCurrentStep(st.num)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-brand-green/20 text-brand-green-text border border-brand-green/40"
                    : isCompleted
                    ? "text-brand-green hover:bg-surface-elevated"
                    : "text-muted hover:text-slate-300"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    isActive
                      ? "bg-brand-green text-black font-bold"
                      : isCompleted
                      ? "bg-brand-green/40 text-white"
                      : "bg-surface-elevated text-muted"
                  }`}
                >
                  {isCompleted ? "✓" : st.num}
                </span>
                <span>{st.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Conteúdo da Etapa Atual */}
      {/* ETAPA 1: Dados do Veículo & Condições */}
      {currentStep === 1 && (
        <div className="p-4 sm:p-6 rounded-2xl bg-surface border border-surface-border space-y-5 animate-in fade-in duration-200">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Gauge className="w-5 h-5 text-brand-yellow" />
            <span>Dados de Entrada & Estado Geral</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Quilometragem (KM)
              </label>
              <Input
                type="number"
                placeholder="Ex: 58430"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                className="h-10 text-sm"
              />
              <span className="text-[10px] text-muted-foreground mt-1 block">
                Deixe em branco caso não consiga verificar o odômetro.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nível de Combustível
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-0.5">
                {FUEL_LEVELS.map((fuel) => {
                  const isSelected = fuelLevel === fuel.value;
                  return (
                    <button
                      key={fuel.value}
                      type="button"
                      onClick={() => setFuelLevel(fuel.value)}
                      className={`py-2 px-1 text-center rounded-lg border text-xs font-semibold transition-all ${
                        isSelected
                          ? "bg-brand-yellow/20 border-brand-yellow text-brand-yellow-text"
                          : "bg-surface-elevated border-surface-border text-slate-400 hover:text-white"
                      }`}
                    >
                      {fuel.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-surface-border/60">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Condição da Pintura / Exterior
              </label>
              <select
                value={exteriorCondition}
                onChange={(e) => setExteriorCondition(e.target.value as VehicleCondition)}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-elevated border border-surface-border text-white text-xs focus:outline-none focus:border-brand-green"
              >
                {VEHICLE_CONDITIONS.map((cond) => (
                  <option key={cond.value} value={cond.value}>
                    {cond.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Condição do Interior / Estofado
              </label>
              <select
                value={interiorCondition}
                onChange={(e) => setInteriorCondition(e.target.value as VehicleCondition)}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-elevated border border-surface-border text-white text-xs focus:outline-none focus:border-brand-green"
              >
                {VEHICLE_CONDITIONS.map((cond) => (
                  <option key={cond.value} value={cond.value}>
                    {cond.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-surface-border/60 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-brand-yellow mb-1">
                Objetos / Pertences Deixados no Veículo
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Óculos escuros no painel, cadeirinha infantil, guarda-chuva no banco traseiro..."
                value={objectsLeft}
                onChange={(e) => setObjectsLeft(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl bg-surface-elevated border border-surface-border text-white placeholder-muted-foreground focus:outline-none focus:border-brand-green"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Observações de Entrada
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Cliente tem pressa, atenção ao retrovisor elétrico..."
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl bg-surface-elevated border border-surface-border text-white placeholder-muted-foreground focus:outline-none focus:border-brand-green"
              />
            </div>
          </div>
        </div>
      )}

      {/* ETAPA 2: Checklist Visual dos Itens */}
      {currentStep === 2 && (
        <div className="p-4 sm:p-6 rounded-2xl bg-surface border border-surface-border space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border/60 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-brand-green" />
                <span>Checklist de Inspeção Inicial</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Confira os itens externos, internos e acessórios de bordo.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  const allOk: Record<string, { status: ChecklistItemStatus; notes: string }> = {};
                  CHECKLIST_TEMPLATE.forEach((it) => {
                    allOk[it.key] = { status: "ok", notes: "" };
                  });
                  setChecklistState(allOk);
                }}
              >
                Marcar Todos como OK
              </Button>
            </div>
          </div>

          <div className="space-y-5">
            {/* Categoria: Exterior */}
            <div>
              <span className="text-[11px] uppercase font-bold text-brand-yellow tracking-wider block mb-2">
                Parte Externa (Lataria & Vidros)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CHECKLIST_TEMPLATE.filter((i) => i.category === "exterior").map((item) => {
                  const cur = checklistState[item.key] || { status: "ok", notes: "" };
                  return (
                    <div
                      key={item.key}
                      className="p-2.5 rounded-xl bg-surface-elevated/40 border border-surface-border flex items-center justify-between gap-2"
                    >
                      <span className="text-xs text-slate-200 truncate">{item.label}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleChecklistStatusChange(item.key, "ok")}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                            cur.status === "ok"
                              ? "bg-brand-green text-black"
                              : "bg-surface-elevated text-muted hover:text-white"
                          }`}
                        >
                          OK
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChecklistStatusChange(item.key, "damaged")}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                            cur.status === "damaged"
                              ? "bg-amber-500 text-black"
                              : "bg-surface-elevated text-muted hover:text-white"
                          }`}
                        >
                          Avariado
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChecklistStatusChange(item.key, "not_checked")}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                            cur.status === "not_checked"
                              ? "bg-slate-600 text-white"
                              : "bg-surface-elevated text-muted hover:text-white"
                          }`}
                        >
                          N/V
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Categoria: Interior */}
            <div>
              <span className="text-[11px] uppercase font-bold text-brand-yellow tracking-wider block mb-2">
                Parte Interna (Cabine)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CHECKLIST_TEMPLATE.filter((i) => i.category === "interior").map((item) => {
                  const cur = checklistState[item.key] || { status: "ok", notes: "" };
                  return (
                    <div
                      key={item.key}
                      className="p-2.5 rounded-xl bg-surface-elevated/40 border border-surface-border flex items-center justify-between gap-2"
                    >
                      <span className="text-xs text-slate-200 truncate">{item.label}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleChecklistStatusChange(item.key, "ok")}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                            cur.status === "ok"
                              ? "bg-brand-green text-black"
                              : "bg-surface-elevated text-muted hover:text-white"
                          }`}
                        >
                          OK
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChecklistStatusChange(item.key, "damaged")}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                            cur.status === "damaged"
                              ? "bg-amber-500 text-black"
                              : "bg-surface-elevated text-muted hover:text-white"
                          }`}
                        >
                          Avariado
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChecklistStatusChange(item.key, "not_checked")}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                            cur.status === "not_checked"
                              ? "bg-slate-600 text-white"
                              : "bg-surface-elevated text-muted hover:text-white"
                          }`}
                        >
                          N/V
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Categoria: Acessórios */}
            <div>
              <span className="text-[11px] uppercase font-bold text-brand-yellow tracking-wider block mb-2">
                Acessórios & Ferramentas de Bordo
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CHECKLIST_TEMPLATE.filter((i) => i.category === "accessories").map((item) => {
                  const cur = checklistState[item.key] || { status: "ok", notes: "" };
                  return (
                    <div
                      key={item.key}
                      className="p-2.5 rounded-xl bg-surface-elevated/40 border border-surface-border flex items-center justify-between gap-2"
                    >
                      <span className="text-xs text-slate-200 truncate">{item.label}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleChecklistStatusChange(item.key, "ok")}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                            cur.status === "ok"
                              ? "bg-brand-green text-black"
                              : "bg-surface-elevated text-muted hover:text-white"
                          }`}
                        >
                          OK
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChecklistStatusChange(item.key, "missing")}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                            cur.status === "missing"
                              ? "bg-red-500 text-white"
                              : "bg-surface-elevated text-muted hover:text-white"
                          }`}
                        >
                          Ausente
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChecklistStatusChange(item.key, "not_checked")}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                            cur.status === "not_checked"
                              ? "bg-slate-600 text-white"
                              : "bg-surface-elevated text-muted hover:text-white"
                          }`}
                        >
                          N/V
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ETAPA 3: Mapa Visual de Avarias */}
      {currentStep === 3 && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <MapaVisualVeiculo
            damages={damages}
            onSelectZone={handleSelectZone}
            selectedLocation={selectedZoneLocation}
          />

          {/* Lista de Avarias Registradas nesta vistoria */}
          <div className="p-4 rounded-2xl bg-surface border border-surface-border space-y-3">
            <div className="flex items-center justify-between border-b border-surface-border/60 pb-2">
              <h4 className="text-xs uppercase font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Avarias Adicionadas ({damages.length})</span>
              </h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setSelectedZoneLocation("lateral_direita");
                  setSelectedZonePart("Porta dianteira direita");
                  setIsAvariaModalOpen(true);
                }}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                + Nova Avaria
              </Button>
            </div>

            {damages.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-3 text-center">
                Nenhuma avaria apontada até o momento. Toque no mapa acima caso encontre riscos, amassados ou peças quebradas.
              </p>
            ) : (
              <div className="space-y-2">
                {damages.map((dmg, idx) => {
                  const sev = getDamageSeverityInfo(dmg.severity);
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-surface-elevated border border-surface-border flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-semibold text-white text-xs">
                          <span>{dmg.specific_part || dmg.location}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-brand-yellow font-normal">{getDamageTypeLabel(dmg.type)}</span>
                          <span className={`text-[10px] px-2 py-0.2 rounded-full border ${sev.badgeClass}`}>
                            {sev.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{dmg.description}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveDamage(idx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-surface transition-colors"
                        title="Remover avaria"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ETAPA 4: Fotos do Veículo */}
      {currentStep === 4 && (
        <div className="p-4 sm:p-6 rounded-2xl bg-surface border border-surface-border space-y-4 animate-in fade-in duration-200">
          <div className="border-b border-surface-border/60 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-brand-yellow" />
              <span>Fotos da Vistoria do Veículo</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tire fotos dos 4 ângulos do veículo e de avarias específicas para resguardo do lava-jato e do cliente.
            </p>
          </div>

          {/* Botões de Ação para Câmera / Galeria */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { type: "front", label: "Frente" },
              { type: "rear", label: "Traseira" },
              { type: "left_side", label: "Lateral Esq." },
              { type: "right_side", label: "Lateral Dir." },
            ].map((ang) => (
              <label
                key={ang.type}
                className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-dashed border-surface-border hover:border-brand-green/60 bg-surface-elevated/40 cursor-pointer transition-colors text-center"
              >
                <Camera className="w-5 h-5 text-brand-green mb-1" />
                <span className="text-xs text-white font-semibold">{ang.label}</span>
                <span className="text-[10px] text-muted-foreground">Tirar foto</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) =>
                    handlePhotoCapture(
                      e,
                      ang.type as "front" | "rear" | "left_side" | "right_side"
                    )
                  }
                  className="hidden"
                  disabled={isUploadingPhoto}
                />
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-elevated border border-surface-border text-xs text-white cursor-pointer hover:border-slate-500 transition-colors">
              <Camera className="w-4 h-4 text-brand-yellow" />
              <span>Adicionar Foto Geral / Avaria</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handlePhotoCapture(e, "other")}
                className="hidden"
                disabled={isUploadingPhoto}
              />
            </label>
            {isUploadingPhoto && (
              <span className="text-xs text-brand-yellow animate-pulse">
                Comprimindo e enviando foto...
              </span>
            )}
          </div>

          {/* Galeria de Fotos Registradas */}
          <div>
            <h4 className="text-xs uppercase font-bold text-muted-foreground mb-2">
              Fotos Capturadas ({photos.length})
            </h4>

            {photos.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-3 text-center">
                Nenhuma foto registrada nesta vistoria. As fotos são opcionais mas altamente recomendadas.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {photos.map((ph, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-video rounded-xl overflow-hidden border border-surface-border group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ph.photo_url}
                      alt={ph.description || "Foto"}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="p-1.5 rounded-lg bg-red-600 text-white"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ETAPA 5: Revisão e Confirmação */}
      {currentStep === 5 && (
        <div className="p-4 sm:p-6 rounded-2xl bg-surface border border-surface-border space-y-5 animate-in fade-in duration-200">
          <div className="border-b border-surface-border/60 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-brand-green" />
              <span>Resumo & Confirmação de Check-in</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Revise as informações antes de confirmar a entrada do veículo e liberar o atendimento.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-surface-elevated border border-surface-border space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Veículo & Odômetro</span>
              <p className="font-semibold text-white">{agendamento.veiculo_modelo}</p>
              <p className="text-muted-foreground">KM: {mileage ? `${parseInt(mileage).toLocaleString()} km` : "Não informado"}</p>
              <p className="text-muted-foreground">Combustível: {fuelLevel}</p>
            </div>

            <div className="p-3 rounded-xl bg-surface-elevated border border-surface-border space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Estado Geral</span>
              <p className="text-slate-300">Exterior: <strong>{exteriorCondition}</strong></p>
              <p className="text-slate-300">Interior: <strong>{interiorCondition}</strong></p>
              <p className="text-amber-400 font-semibold">{damages.length} avarias registradas</p>
            </div>

            <div className="p-3 rounded-xl bg-surface-elevated border border-surface-border space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Mídia & Pertences</span>
              <p className="text-slate-300">{photos.length} fotos anexadas</p>
              <p className="text-muted-foreground truncate" title={objectsLeft || "Nenhum"}>
                Pertences: {objectsLeft || "Nenhum informado"}
              </p>
            </div>
          </div>

          {damages.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1.5">
              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Avarias apontadas que serão vinculadas ao agendamento:
              </span>
              <ul className="list-disc list-inside text-slate-300 space-y-0.5 pl-2">
                {damages.map((d, i) => (
                  <li key={i}>
                    <strong>{d.specific_part || d.location}</strong>: {getDamageTypeLabel(d.type)} ({d.severity}) - &quot;{d.description}&quot;
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="p-3 rounded-xl bg-brand-green/10 border border-brand-green/30 text-xs text-slate-300">
            <span className="font-semibold text-brand-green-text block mb-1">
              Declaração do Operador:
            </span>
            Ao confirmar, este check-in será registrado permanentemente com o conferente{" "}
            <strong>{operatorName}</strong> e o atendimento poderá ser iniciado no pátio.
          </div>
        </div>
      )}

      {/* 3. Rodapé de Navegação entre Etapas */}
      <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-surface border border-surface-border">
        <div>
          {currentStep > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep((prev) => prev - 1)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Voltar
            </Button>
          ) : (
            onCancel && (
              <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                Cancelar
              </Button>
            )
          )}
        </div>

        <div className="flex items-center gap-2">
          {currentStep < 5 ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setCurrentStep((prev) => prev + 1)}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="bg-brand-green hover:bg-emerald-600 text-black font-bold"
            >
              Próximo: {steps[currentStep]?.label}
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              onClick={handleFinalizarCheckin}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
              className="bg-brand-green hover:bg-emerald-600 text-black font-extrabold shadow-lg shadow-brand-green/20"
            >
              Confirmar & Finalizar Check-in
            </Button>
          )}
        </div>
      </div>

      {/* Modal de Nova Avaria */}
      <NovaAvariaModal
        isOpen={isAvariaModalOpen}
        onClose={() => setIsAvariaModalOpen(false)}
        onConfirm={handleAddDamage}
        initialLocation={selectedZoneLocation}
        initialPartName={selectedZonePart}
      />
    </div>
  );
}
