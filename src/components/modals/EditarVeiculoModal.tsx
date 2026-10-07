"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { TipoVeiculo, TIPOS_VEICULO, Veiculo } from "@/types";
import { AlertCircle } from "lucide-react";

interface EditarVeiculoModalProps {
  isOpen: boolean;
  onClose: () => void;
  veiculo: Veiculo | null;
  onVeiculoAtualizado?: () => void;
}

export function EditarVeiculoModal({
  isOpen,
  onClose,
  veiculo,
  onVeiculoAtualizado,
}: EditarVeiculoModalProps) {
  const { updateVeiculo, checkVehicleDuplicate } = useAppStore();
  const { success, error } = useToast();

  const [tipo, setTipo] = useState<TipoVeiculo>("Carro pequeno");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [placa, setPlaca] = useState("");
  const [cor, setCor] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [plateWarning, setPlateWarning] = useState<string | null>(null);

  useEffect(() => {
    if (veiculo) {
      setTipo(veiculo.tipo);
      setMarca(veiculo.marca || "");
      setModelo(veiculo.modelo);
      setPlaca(veiculo.placa && veiculo.placa !== "---" ? veiculo.placa : "");
      setCor(veiculo.cor || "");
      setObservacoes(veiculo.observacoes || "");
      setAtivo(veiculo.ativo !== false);
      setPlateWarning(null);
    }
  }, [veiculo, isOpen]);

  const handlePlacaChange = (val: string) => {
    const clean = val.toUpperCase();
    setPlaca(clean);

    if (clean.length >= 4 && veiculo) {
      const dup = checkVehicleDuplicate(clean, veiculo.id);
      if (dup.exists) {
        setPlateWarning(`Esta placa já está cadastrada para o cliente ${dup.clienteNome || "outro cliente"}.`);
      } else {
        setPlateWarning(null);
      }
    } else {
      setPlateWarning(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!veiculo) return;

    if (!modelo.trim()) {
      error("Informe o modelo do veículo.");
      return;
    }

    if (placa.trim()) {
      const dup = checkVehicleDuplicate(placa, veiculo.id);
      if (dup.exists) {
        error(`Esta placa já está vinculada ao cliente ${dup.clienteNome || "outro cliente"}.`);
        return;
      }
    }

    try {
      updateVeiculo(veiculo.id, {
        tipo,
        marca: marca.trim() || "Genérico",
        modelo: modelo.trim(),
        placa: placa.trim().toUpperCase() || "---",
        cor: cor.trim() || "Não informada",
        observacoes: observacoes.trim() || undefined,
        ativo,
      });

      success("Veículo atualizado com sucesso!");
      if (onVeiculoAtualizado) {
        onVeiculoAtualizado();
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao atualizar veículo";
      error(msg);
    }
  };

  if (!veiculo) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Veículo"
      description="Atualize as informações do veículo e o status de atividade."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {plateWarning && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs text-amber-300">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{plateWarning}</span>
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
          placeholder="Ex: Cuidado com o escapamento"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
        />

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary">
            Salvar Alterações
          </Button>
        </div>
      </form>
    </Modal>
  );
}
