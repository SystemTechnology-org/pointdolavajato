"use client";

import React, { useState } from "react";
import { Building2, MapPin, Mail, Phone, ExternalLink, ShieldCheck, Image as ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";

interface ConfiguracoesEmpresaProps {
  onDirtyChange?: (isDirty: boolean) => void;
}

export function ConfiguracoesEmpresa({ onDirtyChange }: ConfiguracoesEmpresaProps) {
  const { businessSettings, updateBusinessSettings, isCurrentUserAdmin } = useAppStore();
  const { success, error: toastError } = useToast();

  const [businessName, setBusinessName] = useState(businessSettings.business_name || "Point do Coco Lava Jato");
  const [commercialName, setCommercialName] = useState(businessSettings.commercial_name || "Point do Coco");
  const [whatsapp, setWhatsapp] = useState(businessSettings.whatsapp || "(71) 9 9288-7645");
  const [instagram, setInstagram] = useState(businessSettings.instagram_url || "https://instagram.com/pointdococolavajato");
  const [email, setEmail] = useState(businessSettings.email || "contato@pointdococo.com.br");
  const [address, setAddress] = useState(businessSettings.address || "Entrada do bosque Guaraípe, Litoral Norte - BA");
  const [addressNumber, setAddressNumber] = useState(businessSettings.address_number || "S/N");
  const [addressComplement, setAddressComplement] = useState(businessSettings.address_complement || "Entrada do bosque");
  const [neighborhood, setNeighborhood] = useState(businessSettings.neighborhood || "Guaraípe");
  const [city, setCity] = useState(businessSettings.city || "Litoral Norte");
  const [state, setState] = useState(businessSettings.state || "BA");
  const [postalCode, setPostalCode] = useState(businessSettings.postal_code || "42840-000");
  const [description, setDescription] = useState(businessSettings.description || "Lava Jato especializado em cuidados automotivos de alto padrão no Litoral Norte da Bahia.");

  const [isSaving, setIsSaving] = useState(false);

  const handleFieldChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    if (onDirtyChange) onDirtyChange(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCurrentUserAdmin) {
      toastError("Apenas administradores podem alterar os dados cadastrais da empresa.");
      return;
    }

    setIsSaving(true);
    try {
      await updateBusinessSettings({
        business_name: businessName.trim(),
        commercial_name: commercialName.trim(),
        whatsapp: whatsapp.trim(),
        instagram_url: instagram.trim(),
        email: email.trim(),
        address: address.trim(),
        address_number: addressNumber.trim(),
        address_complement: addressComplement.trim(),
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        state: state.trim(),
        postal_code: postalCode.trim(),
        description: description.trim(),
      });

      if (onDirtyChange) onDirtyChange(false);
      success("Alterações salvas com sucesso!");
    } catch (err: unknown) {
      console.error(err);
      toastError("Não foi possível salvar as alterações.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Bloco 1: Identidade da Marca & Logo */}
      <div className="p-5 rounded-xl bg-surface border border-surface-border space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-surface-border/50">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brand-green" />
            <span>Dados Oficiais e Identidade Visual</span>
          </h3>
          <span className="text-[11px] px-2 py-0.5 rounded bg-brand-green/20 text-brand-green font-semibold">
            {isCurrentUserAdmin ? "Modo Administrador" : "Somente Leitura"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Logo Visualizer */}
          <div className="p-4 rounded-xl bg-surface-elevated/40 border border-surface-border flex flex-col items-center justify-center text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-surface border border-brand-green/30 flex items-center justify-center text-brand-green shadow-lg">
              {businessSettings.logo_url ? (
                <div className="flex items-center justify-center font-bold text-lg text-white">
                  🥥 PDC
                </div>
              ) : (
                <ImageIcon className="w-8 h-8 text-muted" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-white">Logo do Point do Coco</p>
              <p className="text-[10px] text-muted-foreground">Paleta Oficial: Preto, Verde, Amarelo, Branco</p>
            </div>
            <div className="flex gap-1.5 pt-1">
              <span className="w-3.5 h-3.5 rounded-full bg-black border border-white/20" title="Preto" />
              <span className="w-3.5 h-3.5 rounded-full bg-brand-green" title="Verde (#22C55E)" />
              <span className="w-3.5 h-3.5 rounded-full bg-brand-yellow" title="Amarelo (#EAB308)" />
              <span className="w-3.5 h-3.5 rounded-full bg-white" title="Branco" />
            </div>
          </div>

          <div className="md:col-span-2 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Razão Social / Nome Oficial *"
                value={businessName}
                onChange={(e) => handleFieldChange(setBusinessName, e.target.value)}
                disabled={!isCurrentUserAdmin}
                required
              />
              <Input
                label="Nome Comercial / Fantasia *"
                value={commercialName}
                onChange={(e) => handleFieldChange(setCommercialName, e.target.value)}
                disabled={!isCurrentUserAdmin}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Descrição do Estabelecimento</label>
              <textarea
                value={description}
                onChange={(e) => handleFieldChange(setDescription, e.target.value)}
                disabled={!isCurrentUserAdmin}
                rows={2}
                className="w-full text-xs px-3 py-2 rounded-lg bg-surface-elevated/40 border border-surface-border text-slate-200 focus:outline-none focus:border-brand-green/50 disabled:opacity-60"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bloco 2: Contatos & Redes */}
      <div className="p-5 rounded-xl bg-surface border border-surface-border space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Phone className="w-4 h-4 text-brand-yellow" />
          <span>Canais Oficiais de Contato</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="WhatsApp Principal *"
            value={whatsapp}
            onChange={(e) => handleFieldChange(setWhatsapp, e.target.value)}
            disabled={!isCurrentUserAdmin}
            required
          />
          <Input
            label="E-mail Institucional"
            type="email"
            leftIcon={<Mail className="w-4 h-4" />}
            value={email}
            onChange={(e) => handleFieldChange(setEmail, e.target.value)}
            disabled={!isCurrentUserAdmin}
          />
          <div>
            <Input
              label="Instagram Oficial"
              value={instagram}
              onChange={(e) => handleFieldChange(setInstagram, e.target.value)}
              disabled={!isCurrentUserAdmin}
            />
            {instagram && (
              <div className="mt-1 flex justify-end">
                <a
                  href={instagram.startsWith("http") ? instagram : `https://instagram.com/${instagram.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-brand-yellow hover:underline inline-flex items-center gap-1 font-medium"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Acessar perfil</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bloco 3: Endereço & Localização Física */}
      <div className="p-5 rounded-xl bg-surface border border-surface-border space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <MapPin className="w-4 h-4 text-brand-green" />
          <span>Localização e Endereço do Lava Jato</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Input
              label="Logradouro / Rodovia / Entrada *"
              value={address}
              onChange={(e) => handleFieldChange(setAddress, e.target.value)}
              disabled={!isCurrentUserAdmin}
              required
            />
          </div>
          <Input
            label="Número"
            value={addressNumber}
            onChange={(e) => handleFieldChange(setAddressNumber, e.target.value)}
            disabled={!isCurrentUserAdmin}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Input
            label="Complemento"
            value={addressComplement}
            onChange={(e) => handleFieldChange(setAddressComplement, e.target.value)}
            disabled={!isCurrentUserAdmin}
          />
          <Input
            label="Bairro"
            value={neighborhood}
            onChange={(e) => handleFieldChange(setNeighborhood, e.target.value)}
            disabled={!isCurrentUserAdmin}
          />
          <Input
            label="Cidade"
            value={city}
            onChange={(e) => handleFieldChange(setCity, e.target.value)}
            disabled={!isCurrentUserAdmin}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="UF"
              value={state}
              onChange={(e) => handleFieldChange(setState, e.target.value)}
              disabled={!isCurrentUserAdmin}
            />
            <Input
              label="CEP"
              value={postalCode}
              onChange={(e) => handleFieldChange(setPostalCode, e.target.value)}
              disabled={!isCurrentUserAdmin}
            />
          </div>
        </div>
      </div>

      {/* Botão de Salvar */}
      {isCurrentUserAdmin && (
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            isLoading={isSaving}
            leftIcon={<ShieldCheck className="w-4 h-4" />}
          >
            {isSaving ? "Salvando..." : "Salvar Dados da Empresa"}
          </Button>
        </div>
      )}
    </form>
  );
}
