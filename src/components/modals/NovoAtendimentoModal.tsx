"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { TipoVeiculo, TIPOS_VEICULO } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { getTodayDateString } from "@/lib/initialData";

interface NovoAtendimentoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NovoAtendimentoModal({
  isOpen,
  onClose,
}: NovoAtendimentoModalProps) {
  const { servicos, addAgendamento } = useAppStore();
  const { success, error } = useToast();

  const [clienteNome, setClienteNome] = useState("");
  const [clienteWhatsapp, setClienteWhatsapp] = useState("");
  const [veiculoTipo, setVeiculoTipo] = useState<TipoVeiculo>("Carro pequeno");
  const [veiculoModelo, setVeiculoModelo] = useState("");
  const [veiculoPlaca, setVeiculoPlaca] = useState("");
  const [servicoId, setServicoId] = useState("");
  const [status, setStatus] = useState<"Em atendimento" | "Aguardando">("Em atendimento");
  const [box, setBox] = useState("Box 1");

  const servicosDisponiveis = servicos.filter(
    (s) => s.ativo && s.tipo_veiculo === veiculoTipo
  );

  const selectedServico =
    servicosDisponiveis.find((s) => s.id === servicoId) ||
    servicosDisponiveis[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!clienteNome.trim()) {
      error("Informe o nome do cliente");
      return;
    }

    if (!selectedServico) {
      error("Selecione um serviço");
      return;
    }

    const now = new Date();
    const currentHour = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    try {
      addAgendamento({
        cliente_nome: clienteNome.trim(),
        cliente_whatsapp: clienteWhatsapp.trim(),
        veiculo_tipo: veiculoTipo,
        veiculo_modelo: veiculoModelo.trim() || `${veiculoTipo}`,
        veiculo_placa: veiculoPlaca.trim().toUpperCase() || "---",
        servico_id: selectedServico.id,
        servico_nome: selectedServico.nome,
        valor: selectedServico.preco, // Snapshot
        data: getTodayDateString(),
        horario: currentHour,
        status: status,
        observacoes: `Iniciado no ${box}`,
      });

      success(`Atendimento iniciado com sucesso no ${box}!`);
      onClose();

      // Resetar
      setClienteNome("");
      setClienteWhatsapp("");
      setVeiculoModelo("");
      setVeiculoPlaca("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao iniciar atendimento";
      error(msg);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Iniciar Novo Atendimento"
      description="Carro chegou no Point do Coco? Registre a entrada imediata."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Nome do Cliente *"
            placeholder="Ex: João Silva"
            value={clienteNome}
            onChange={(e) => setClienteNome(e.target.value)}
            required
          />
          <Input
            label="WhatsApp"
            placeholder="Ex: 71 99999-9999"
            value={clienteWhatsapp}
            onChange={(e) => setClienteWhatsapp(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Tipo de Veículo *"
            value={veiculoTipo}
            onChange={(e) => {
              setVeiculoTipo(e.target.value as TipoVeiculo);
              setServicoId("");
            }}
            options={TIPOS_VEICULO.map((t) => ({ label: t, value: t }))}
          />
          <Input
            label="Modelo do Veículo"
            placeholder="Ex: Civic, Compass"
            value={veiculoModelo}
            onChange={(e) => setVeiculoModelo(e.target.value)}
          />
          <Input
            label="Placa *"
            placeholder="Ex: BRA2E19"
            value={veiculoPlaca}
            onChange={(e) => setVeiculoPlaca(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Box / Pista"
            value={box}
            onChange={(e) => setBox(e.target.value)}
            options={[
              { label: "Box 1 (Lavagem)", value: "Box 1" },
              { label: "Box 2 (Lavagem)", value: "Box 2" },
              { label: "Box 3 (Secagem/Cera)", value: "Box 3" },
              { label: "Área de Espera", value: "Área de Espera" },
            ]}
          />
          <Select
            label="Situação Inicial"
            value={status}
            onChange={(e) => setStatus(e.target.value as "Em atendimento" | "Aguardando")}
            options={[
              { label: "Em atendimento (Iniciando agora)", value: "Em atendimento" },
              { label: "Aguardando na fila", value: "Aguardando" },
            ]}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-300 block mb-1.5">
            Serviço ({veiculoTipo}) *
          </label>
          <div className="space-y-2">
            {servicosDisponiveis.map((srv) => (
              <label
                key={srv.id}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                  (selectedServico && selectedServico.id === srv.id)
                    ? "bg-brand-green/10 border-brand-green text-white"
                    : "bg-surface border-surface-border text-slate-300 hover:border-slate-600"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="servicoAtendimento"
                    checked={selectedServico?.id === srv.id}
                    onChange={() => setServicoId(srv.id)}
                    className="accent-brand-green"
                  />
                  <div>
                    <p className="text-xs font-medium">{srv.nome}</p>
                    <p className="text-[11px] text-muted-foreground">{srv.duracao_minutos} min</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-brand-green-text">
                  {formatCurrency(srv.preco)}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated border border-surface-border">
          <span className="text-xs text-muted-foreground">Total a cobrar:</span>
          <span className="text-sm font-bold text-brand-green-text">
            {selectedServico ? formatCurrency(selectedServico.preco) : "R$ 0,00"}
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="secondary">
            Iniciar Atendimento
          </Button>
        </div>
      </form>
    </Modal>
  );
}
