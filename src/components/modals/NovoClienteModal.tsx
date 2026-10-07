"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { TipoVeiculo, TIPOS_VEICULO } from "@/types";
import { AlertCircle, ExternalLink } from "lucide-react";

interface NovoClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClienteCriado?: (clienteId: string) => void;
}

export function NovoClienteModal({ isOpen, onClose, onClienteCriado }: NovoClienteModalProps) {
  const { addCliente, addVeiculo, checkCustomerDuplicate, checkVehicleDuplicate } = useAppStore();
  const { success, error } = useToast();

  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [ativo, setAtivo] = useState(true);

  // Duplicidade detectada
  const [duplicateCustomer, setDuplicateCustomer] = useState<{ id: string; nome: string } | null>(null);
  const [duplicatePlateInfo, setDuplicatePlateInfo] = useState<{ clienteNome?: string } | null>(null);

  // Dados opcionais do primeiro veículo
  const [adicionarVeiculo, setAdicionarVeiculo] = useState(true);
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [placa, setPlaca] = useState("");
  const [cor, setCor] = useState("");
  const [tipo, setTipo] = useState<TipoVeiculo>("Carro pequeno");

  // Formatação amigável do WhatsApp no input
  const handleWhatsappChange = (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 11);
    let formatted = raw;
    if (raw.length > 2) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    }
    if (raw.length > 7) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
    }
    setWhatsapp(formatted);

    // Verificar duplicidade se tiver número suficiente (Requisito 23)
    if (raw.length >= 10) {
      const dup = checkCustomerDuplicate(raw);
      if (dup.exists && dup.customer) {
        setDuplicateCustomer({ id: dup.customer.id, nome: dup.customer.nome });
      } else {
        setDuplicateCustomer(null);
      }
    } else {
      setDuplicateCustomer(null);
    }
  };

  const handlePlacaChange = (val: string) => {
    const clean = val.toUpperCase();
    setPlaca(clean);

    if (clean.length >= 5) {
      const dup = checkVehicleDuplicate(clean);
      if (dup.exists) {
        setDuplicatePlateInfo({ clienteNome: dup.clienteNome });
      } else {
        setDuplicatePlateInfo(null);
      }
    } else {
      setDuplicatePlateInfo(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      error("Informe o nome do cliente");
      return;
    }

    if (!whatsapp.trim()) {
      error("Informe o WhatsApp do cliente");
      return;
    }

    // Validação estrita de duplicidade (Requisito 23)
    const dupCheck = checkCustomerDuplicate(whatsapp);
    if (dupCheck.exists && dupCheck.customer) {
      setDuplicateCustomer({ id: dupCheck.customer.id, nome: dupCheck.customer.nome });
      error(`Já existe um cliente cadastrado com este WhatsApp: ${dupCheck.customer.nome}`);
      return;
    }

    // Validação de duplicidade de placa se informada (Requisito 24)
    if (adicionarVeiculo && placa.trim()) {
      const plateDup = checkVehicleDuplicate(placa);
      if (plateDup.exists) {
        setDuplicatePlateInfo({ clienteNome: plateDup.clienteNome });
        error(`Este veículo já está cadastrado para o cliente ${plateDup.clienteNome || "outro cliente"}.`);
        return;
      }
    }

    try {
      const novoCliente = addCliente({
        nome: nome.trim(),
        whatsapp: whatsapp.trim(),
        email: email.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
        ativo,
      });

      if (adicionarVeiculo && (modelo.trim() || placa.trim())) {
        addVeiculo({
          cliente_id: novoCliente.id,
          marca: marca.trim() || "Genérico",
          modelo: modelo.trim() || `${tipo}`,
          placa: placa.trim().toUpperCase() || "---",
          cor: cor.trim() || "Não informada",
          tipo: tipo,
          ativo: true,
        });
      }

      success("Cliente cadastrado com sucesso!");
      if (onClienteCriado) {
        onClienteCriado(novoCliente.id);
      }
      onClose();

      // Resetar form
      setNome("");
      setWhatsapp("");
      setEmail("");
      setObservacoes("");
      setAtivo(true);
      setDuplicateCustomer(null);
      setDuplicatePlateInfo(null);
      setMarca("");
      setModelo("");
      setPlaca("");
      setCor("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao cadastrar cliente";
      error(msg);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Novo Cliente"
      description="Cadastre um cliente e opcionalmente vincule seu veículo."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Alerta de duplicidade de WhatsApp (Requisito 23) */}
        {duplicateCustomer && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-3 text-xs">
            <div className="flex items-start gap-2 text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <p className="font-semibold">Já existe um cliente cadastrado com este WhatsApp:</p>
                <p className="text-white mt-0.5 font-medium">{duplicateCustomer.nome}</p>
              </div>
            </div>
            <Link
              href={`/clientes/${duplicateCustomer.id}`}
              onClick={onClose}
              className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 font-semibold inline-flex items-center gap-1 shrink-0 transition-colors"
            >
              <span>Visualizar cliente</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        )}

        <Input
          label="Nome completo *"
          placeholder="Ex: Carlos Eduardo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="WhatsApp *"
            placeholder="Ex: (71) 9 9999-9999"
            value={whatsapp}
            onChange={(e) => handleWhatsappChange(e.target.value)}
            required
          />
          <Input
            label="Email (opcional)"
            placeholder="cliente@email.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Status do Cliente"
            value={ativo ? "true" : "false"}
            onChange={(e) => setAtivo(e.target.value === "true")}
            options={[
              { label: "Ativo", value: "true" },
              { label: "Inativo", value: "false" },
            ]}
          />
          <Input
            label="Observações"
            placeholder="Ex: Prefere produtos neutros"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
        </div>

        {/* Seção Veículo Opcional (Requisito 6) */}
        <div className="p-3.5 rounded-xl bg-surface-elevated/50 border border-surface-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white">
              Veículo do Cliente
            </span>
            <label className="text-[11px] text-muted-foreground flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={adicionarVeiculo}
                onChange={(e) => setAdicionarVeiculo(e.target.checked)}
                className="accent-brand-green"
              />
              <span>Vincular veículo agora</span>
            </label>
          </div>

          {adicionarVeiculo && (
            <div className="space-y-3 pt-1">
              {/* Alerta de duplicidade de Placa (Requisito 24) */}
              {duplicatePlateInfo && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>
                    Este veículo já está cadastrado para o cliente <strong>{duplicatePlateInfo.clienteNome || "outro proprietário"}</strong>.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  label="Tipo de Veículo *"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoVeiculo)}
                  options={TIPOS_VEICULO.map((t) => ({ label: t, value: t }))}
                />
                <Input
                  label="Placa (opcional)"
                  placeholder="Ex: BRA2E19"
                  value={placa}
                  onChange={(e) => handlePlacaChange(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Marca"
                  placeholder="Ex: Toyota, Honda, Jeep"
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                />
                <Input
                  label="Modelo"
                  placeholder="Ex: Corolla, Civic, Compass"
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                />
              </div>

              <Input
                label="Cor"
                placeholder="Ex: Preto, Prata, Branco"
                value={cor}
                onChange={(e) => setCor(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary">
            Salvar Cliente
          </Button>
        </div>
      </form>
    </Modal>
  );
}
