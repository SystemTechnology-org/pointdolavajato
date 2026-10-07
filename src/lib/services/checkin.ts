import {
  VehicleCheckin,
  VehicleChecklistItem,
  VehicleDamage,
  VehicleCheckinPhoto,
  DamageType,
  DamageLocation,
  DamageSeverity,
  FuelLevel,
  VehicleCondition,
  CheckinPhotoType,
} from "@/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

// ==============================================================================
// 1. CATÁLOGOS E TEMPLATES DE VISTORIA
// ==============================================================================

export interface ChecklistTemplateItem {
  key: string;
  label: string;
  category: "exterior" | "interior" | "accessories";
}

export const CHECKLIST_TEMPLATE: ChecklistTemplateItem[] = [
  // PARTE EXTERNA
  { key: "para_choque_dianteiro", label: "Para-choque dianteiro", category: "exterior" },
  { key: "para_choque_traseiro", label: "Para-choque traseiro", category: "exterior" },
  { key: "capo", label: "Capô", category: "exterior" },
  { key: "teto", label: "Teto", category: "exterior" },
  { key: "porta_dianteira_esq", label: "Porta dianteira esquerda", category: "exterior" },
  { key: "porta_dianteira_dir", label: "Porta dianteira direita", category: "exterior" },
  { key: "porta_traseira_esq", label: "Porta traseira esquerda", category: "exterior" },
  { key: "porta_traseira_dir", label: "Porta traseira direita", category: "exterior" },
  { key: "retrovisor_esq", label: "Retrovisor esquerdo", category: "exterior" },
  { key: "retrovisor_dir", label: "Retrovisor direito", category: "exterior" },
  { key: "farois", label: "Faróis dianteiros", category: "exterior" },
  { key: "lanternas", label: "Lanternas traseiras", category: "exterior" },
  { key: "vidros", label: "Vidros e Parabrisa", category: "exterior" },
  { key: "rodas", label: "Rodas e Calotas", category: "exterior" },
  { key: "pneus", label: "Pneus e calibragem", category: "exterior" },

  // PARTE INTERNA
  { key: "bancos", label: "Bancos e Estofamento", category: "interior" },
  { key: "painel", label: "Painel e Multimídia", category: "interior" },
  { key: "tapetes", label: "Tapetes", category: "interior" },
  { key: "porta_luvas", label: "Porta-luvas", category: "interior" },
  { key: "console", label: "Console central", category: "interior" },
  { key: "porta_malas", label: "Porta-malas", category: "interior" },

  // ACESSÓRIOS
  { key: "estepe", label: "Estepe", category: "accessories" },
  { key: "macaco", label: "Macaco", category: "accessories" },
  { key: "chave_roda", label: "Chave de roda", category: "accessories" },
  { key: "triangulo", label: "Triângulo de segurança", category: "accessories" },
  { key: "outros_objetos", label: "Pertences no interior", category: "accessories" },
];

export const DAMAGE_TYPES: { value: DamageType; label: string }[] = [
  { value: "risco", label: "Risco / Arranhão" },
  { value: "amassado", label: "Amassado" },
  { value: "trinca", label: "Trinca / Quebrado" },
  { value: "peca_quebrada", label: "Peça quebrada ou solta" },
  { value: "pintura_danificada", label: "Pintura manchada / descascada" },
  { value: "vidro_danificado", label: "Vidro lascado / trincado" },
  { value: "retrovisor_danificado", label: "Retrovisor avariado" },
  { value: "roda_danificada", label: "Roda ralada / amassada" },
  { value: "pneu_danificado", label: "Pneu cortado / bolha" },
  { value: "outro", label: "Outro defeito" },
];

export const DAMAGE_LOCATIONS: { value: DamageLocation; label: string; partDefault: string }[] = [
  { value: "dianteira", label: "Frente / Dianteira", partDefault: "Para-choque / Grade dianteira" },
  { value: "lateral_esquerda", label: "Lateral Esquerda (Motorista)", partDefault: "Porta dianteira esquerda" },
  { value: "lateral_direita", label: "Lateral Direita (Passageiro)", partDefault: "Porta dianteira direita" },
  { value: "traseira", label: "Traseira", partDefault: "Para-choque traseiro / Tampa" },
  { value: "teto", label: "Teto", partDefault: "Teto" },
  { value: "interior", label: "Interior / Cabine", partDefault: "Painel / Bancos" },
  { value: "porta_malas", label: "Porta-malas", partDefault: "Interior da mala" },
  { value: "rodas", label: "Rodas e Pneus", partDefault: "Roda dianteira esquerda" },
  { value: "outro", label: "Outra região", partDefault: "Outra área" },
];

export const DAMAGE_SEVERITIES: {
  value: DamageSeverity;
  label: string;
  badgeClass: string;
}[] = [
  {
    value: "leve",
    label: "Leve (Superficial)",
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  {
    value: "media",
    label: "Média (Visível)",
    badgeClass: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  },
  {
    value: "grave",
    label: "Grave (Profundo / Danificado)",
    badgeClass: "bg-red-500/20 text-red-300 border-red-500/40 font-semibold",
  },
];

export const FUEL_LEVELS: { value: FuelLevel; label: string; percent: number }[] = [
  { value: "vazio", label: "Vazio (0%)", percent: 0 },
  { value: "reserva", label: "Reserva (~10%)", percent: 10 },
  { value: "1/4", label: "1/4 (25%)", percent: 25 },
  { value: "1/2", label: "1/2 (50%)", percent: 50 },
  { value: "3/4", label: "3/4 (75%)", percent: 75 },
  { value: "cheio", label: "Cheio (100%)", percent: 100 },
];

export const VEHICLE_CONDITIONS: { value: VehicleCondition; label: string }[] = [
  { value: "otimo", label: "Ótimo (Muito bem conservado)" },
  { value: "bom", label: "Bom (Normal)" },
  { value: "regular", label: "Regular (Desgaste aparente)" },
  { value: "ruim", label: "Ruim (Desgastado)" },
  { value: "muito_sujo", label: "Excessivamente sujo / barro" },
];

export const PHOTO_TYPES: { value: CheckinPhotoType; label: string }[] = [
  { value: "front", label: "Frente" },
  { value: "rear", label: "Traseira" },
  { value: "left_side", label: "Lateral Esquerda" },
  { value: "right_side", label: "Lateral Direita" },
  { value: "interior", label: "Interior" },
  { value: "damage", label: "Avaria Específica" },
  { value: "other", label: "Outro Ângulo" },
];

// Formatadores amigáveis
export function getFuelLevelLabel(value?: string | null): string {
  const match = FUEL_LEVELS.find((f) => f.value === value);
  return match ? match.label : value || "Não informado";
}

export function getConditionLabel(value?: string | null): string {
  const match = VEHICLE_CONDITIONS.find((c) => c.value === value);
  return match ? match.label : value || "Não informado";
}

export function getDamageTypeLabel(value: DamageType): string {
  const match = DAMAGE_TYPES.find((d) => d.value === value);
  return match ? match.label : value;
}

export function getDamageLocationLabel(value: DamageLocation): string {
  const match = DAMAGE_LOCATIONS.find((l) => l.value === value);
  return match ? match.label : value;
}

export function getDamageSeverityInfo(severity: DamageSeverity) {
  return (
    DAMAGE_SEVERITIES.find((s) => s.value === severity) || {
      value: severity,
      label: severity,
      badgeClass: "bg-surface-elevated text-slate-300 border-surface-border",
    }
  );
}

// ==============================================================================
// 2. UTILITÁRIO DE COMPRESSÃO DE IMAGENS NO CLIENTE
// ==============================================================================

/**
 * Comprime uma imagem no cliente usando HTML5 Canvas antes de enviar
 * Reduz resolução para max 1280px e salva em JPEG 0.82 (geralmente < 250KB)
 */
export async function compressImageFile(
  file: File,
  maxDimension = 1280,
  quality = 0.82
): Promise<{ dataUrl: string; blob: Blob; originalSize: number; compressedSize: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Não foi possível inicializar canvas 2D"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Falha ao gerar blob comprimido"));
              return;
            }
            resolve({
              dataUrl,
              blob,
              originalSize: file.size,
              compressedSize: blob.size,
            });
          },
          "image/jpeg",
          quality
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// ==============================================================================
// 3. PERSISTÊNCIA NO SUPABASE (Com Fallback e Tratamento de Erros)
// ==============================================================================

export async function fetchCheckinsFromSupabase(): Promise<VehicleCheckin[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  try {
    const { data, error } = await supabase
      .from("vehicle_checkins")
      .select(`
        *,
        checklist_items:vehicle_checklist_items(*),
        damages:vehicle_damages(*),
        photos:vehicle_checkin_photos(*)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Erro ao buscar vehicle_checkins no Supabase:", error.message);
      return [];
    }

    return (data || []) as VehicleCheckin[];
  } catch (err) {
    console.error("Falha ao carregar check-ins do Supabase:", err);
    return [];
  }
}

export async function insertCheckinInSupabase(
  payload: Omit<VehicleCheckin, "id" | "created_at" | "updated_at">,
  items: Omit<VehicleChecklistItem, "id" | "checkin_id">[],
  damages: Omit<VehicleDamage, "id" | "checkin_id" | "vehicle_id" | "created_at">[],
  photos: Omit<VehicleCheckinPhoto, "id" | "checkin_id" | "vehicle_id" | "created_at">[]
): Promise<VehicleCheckin | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  try {
    // 1. Inserir cabeçalho do check-in
    const { data: checkin, error: checkinErr } = await supabase
      .from("vehicle_checkins")
      .insert({
        appointment_id: payload.appointment_id,
        vehicle_id: payload.vehicle_id,
        customer_id: payload.customer_id,
        mileage: payload.mileage,
        fuel_level: payload.fuel_level,
        interior_condition: payload.interior_condition,
        exterior_condition: payload.exterior_condition,
        objects_left_in_vehicle: payload.objects_left_in_vehicle,
        general_notes: payload.general_notes,
        confirmed_by: payload.confirmed_by,
        confirmed_by_name: payload.confirmed_by_name,
        confirmed_at: payload.confirmed_at,
        status: payload.status,
      })
      .select()
      .single();

    if (checkinErr || !checkin) {
      console.warn("Erro ao inserir vehicle_checkin:", checkinErr?.message);
      return null;
    }

    const checkinId = checkin.id;

    // 2. Inserir itens de checklist
    let insertedItems: VehicleChecklistItem[] = [];
    if (items.length > 0) {
      const itemsPayload = items.map((it) => ({
        ...it,
        checkin_id: checkinId,
      }));
      const { data: itemsData } = await supabase
        .from("vehicle_checklist_items")
        .insert(itemsPayload)
        .select();
      insertedItems = (itemsData || []) as VehicleChecklistItem[];
    }

    // 3. Inserir avarias
    let insertedDamages: VehicleDamage[] = [];
    if (damages.length > 0) {
      const damagesPayload = damages.map((d) => ({
        ...d,
        checkin_id: checkinId,
        vehicle_id: payload.vehicle_id,
      }));
      const { data: damagesData } = await supabase
        .from("vehicle_damages")
        .insert(damagesPayload)
        .select();
      insertedDamages = (damagesData || []) as VehicleDamage[];
    }

    // 4. Inserir fotos
    let insertedPhotos: VehicleCheckinPhoto[] = [];
    if (photos.length > 0) {
      const photosPayload = photos.map((p) => ({
        ...p,
        checkin_id: checkinId,
        vehicle_id: payload.vehicle_id,
      }));
      const { data: photosData } = await supabase
        .from("vehicle_checkin_photos")
        .insert(photosPayload)
        .select();
      insertedPhotos = (photosData || []) as VehicleCheckinPhoto[];
    }

    return {
      ...checkin,
      checklist_items: insertedItems,
      damages: insertedDamages,
      photos: insertedPhotos,
    } as VehicleCheckin;
  } catch (err) {
    console.error("Falha ao persistir check-in completo no Supabase:", err);
    return null;
  }
}

export async function uploadCheckinPhotoToSupabase(
  blob: Blob,
  fileName: string,
  bucket = "vehicle-inspections"
): Promise<{ storagePath: string; publicUrl: string } | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  try {
    const filePath = `inspections/${Date.now()}_${fileName}`;
    const { error: uploadErr } = await supabase.storage
      .from(bucket)
      .upload(filePath, blob, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadErr) {
      console.warn("Erro ao fazer upload da foto para Supabase Storage:", uploadErr.message);
      return null;
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return {
      storagePath: filePath,
      publicUrl: urlData.publicUrl,
    };
  } catch (err) {
    console.error("Falha no upload da foto de vistoria:", err);
    return null;
  }
}
