"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { TipoVeiculo, TIPOS_VEICULO } from "@/types";
import { AlertCircle } from "lucide-react";

interface NovoVeiculoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialClienteId?: string;
  onVeiculoCriado?: (veiculoId: string) => void;
}

export function NovoVeiculoModal({
  isOpen,
  onClose,
  initialClienteId,
  onVeiculoCriado,
}: NovoVeiculoModalProps) {
  const { clientes, addVeiculo, checkVehicleDuplicate } = useAppStore();
  const { success, error } = useToast();

  const [clienteId, setClienteId] = useState(initialClienteId || "");
  const [tipo, setTipo] = useState<TipoVeiculo>("Carro pequeno");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [placa, setPlaca] = useState("");
  const [cor, setCor] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [plateWarning, setPlateWarning] = useState<string | null>(null);

  useEffect(() => {
    if (initialClienteId) {
      setClienteId(initialClienteId);
    } else if (clientes.length > 0 && !clienteId) {
      setClienteId(clientes[0].id);
    }
  }, [initialClienteId, clientes, isOpen, clienteId]);

  const handlePlacaChange = (val: string) => {
    const clean = val.toUpperCase();
    setPlaca(clean);

    if (clean.length >= 4) {
      const dup = checkVehicleDuplicate(clean);
      if (dup.exists) {
        setPlateWarning(`Este veículo com placa ${clean} já está cadastrado para o cliente ${dup.clienteNome || "outro cliente"}.`);
      } else {
        setPlateWarning(null);
      }
    } else {
      setPlateWarning(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!clienteId) {
      error("Selecione o cliente proprietário do veículo.");
      return;
    }

    if (!modelo.trim()) {
      error("Informe o modelo do veículo.");
      return;
    }

    // Verificar duplicidade de placa se preenchida (Requisito 24)
    if (placa.trim()) {
      const dup = checkVehicleDuplicate(placa);
      if (dup.exists) {
        error(`Este veículo já está cadastrado para o cliente ${dup.clienteNome || "outro proprietário"}.`);
        return;
      }
    }

    try {
      const created = addVeiculo({
        cliente_id: clienteId,
        tipo,
        marca: marca.trim() || "Genérico",
        modelo: modelo.trim(),
        placa: placa.trim().toUpperCase() || "---",
        cor: cor.trim() || "Não informada",
        observacoes: observacoes.trim() || undefined,
        ativo,
      });

      success("Veículo cadastrado com sucesso!");
      if (onVeiculoCriado) {
        onVeiculoCriado(created.id);
      }
      onClose();

      // Reset
      setMarca("");
      setModelo("");
      setPlaca("");
      setCor("");
      setObservacoes("");
      setAtivo(true);
      setPlateWarning(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao cadastrar veículo";
      error(msg);
    }
  };

  const selectedClienteObj = clientes.find((c) => c.id === clienteId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Novo Veículo"
      description="Cadastre um novo veículo vinculado ao cliente."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Alerta de duplicidade de Placa */}
        {plateWarning && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs text-amber-300">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{plateWarning}</span>
          </div>
        )}

        {/* Cliente Proprietário */}
        {initialClienteId && selectedClienteObj ? (
          <div className="p-3 rounded-xl bg-surface-elevated/60 border border-surface-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Proprietário:</span>
            <span className="font-semibold text-white">{selectedClienteObj.nome}</span>
          </div>
        ) : (
          <Select
            label="Cliente Proprietário *"
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            options={clientes.map((c) => ({
              label: `${c.nome} (${c.whatsapp})`,
              value: c.id,
            }))}
            required
          />
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
            label="Modelo *"
            placeholder="Ex: Corolla, Civic, Compass"
            value={modelo}
            onChange={(e) => setModelo(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Cor"
            placeholder="Ex: Preto, Prata, Branco"
            value={cor}
            onChange={(e) => setCor(e.target.value)}
          />
          <Select
            label="Status do Veículo"
            value={ativo ? "true" : "false"}
            onChange={(e) => setAtivo(e.target.value === "true")}
            options={[
              { label: "Ativo", value: "true" },
              { label: "Inativo", value: "false" },
            ]}
          />
        </div>

        <Input
          label="Observações"
          placeholder="Ex: Cuidado com o escapamento, aerofólio"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
        />

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary">
            Cadastrar Veículo
          </Button>
        </div>
      </form>
    </Modal>
  );
}
