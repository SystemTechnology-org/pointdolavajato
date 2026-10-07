"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimePicker } from "@/components/ui/TimePicker";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import {
  Agendamento,
  TipoVeiculo,
  TIPOS_VEICULO,
  StatusAgendamento,
  STATUS_AGENDAMENTO,
} from "@/types";
import { formatCurrency } from "@/lib/utils";

interface EditarAgendamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  agendamento: Agendamento | null;
}

export function EditarAgendamentoModal({
  isOpen,
  onClose,
  agendamento,
}: EditarAgendamentoModalProps) {
  const { servicos, updateAgendamento } = useAppStore();
  const { success, error } = useToast();

  const [clienteNome, setClienteNome] = useState("");
  const [clienteWhatsapp, setClienteWhatsapp] = useState("");
  const [veiculoTipo, setVeiculoTipo] = useState<TipoVeiculo>("Carro pequeno");
  const [veiculoModelo, setVeiculoModelo] = useState("");
  const [veiculoPlaca, setVeiculoPlaca] = useState("");
  const [servicoId, setServicoId] = useState("");
  const [data, setData] = useState("");
  const [horario, setHorario] = useState("");
  const [status, setStatus] = useState<StatusAgendamento>("Agendado");
  const [observacoes, setObservacoes] = useState("");
  const [valor, setValor] = useState<number>(0);

  useEffect(() => {
    if (agendamento) {
      setClienteNome(agendamento.cliente_nome);
      setClienteWhatsapp(agendamento.cliente_whatsapp);
      setVeiculoTipo(agendamento.veiculo_tipo);
      setVeiculoModelo(agendamento.veiculo_modelo);
      setVeiculoPlaca(agendamento.veiculo_placa);
      setServicoId(agendamento.servico_id);
      setData(agendamento.data);
      setHorario(agendamento.horario);
      setStatus(agendamento.status);
      setObservacoes(agendamento.observacoes || "");
      setValor(agendamento.valor);
    }
  }, [agendamento, isOpen]);

  // Serviços compatíveis com o tipo de veículo
  const servicosDisponiveis = servicos.filter(
    (s) => s.ativo && s.tipo_veiculo === veiculoTipo
  );

  const selectedServico = servicosDisponiveis.find((s) => s.id === servicoId);

  const handleServiceChange = (sId: string) => {
    setServicoId(sId);
    const s = servicos.find((item) => item.id === sId);
    if (s) {
      setValor(s.preco);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!agendamento) return;

    if (!clienteNome.trim()) {
      error("Informe o nome do cliente.");
      return;
    }

    try {
      // updateAgendamento valida conflito de horário automaticamente
      updateAgendamento(agendamento.id, {
        cliente_nome: clienteNome.trim(),
        cliente_whatsapp: clienteWhatsapp.trim(),
        veiculo_tipo: veiculoTipo,
        veiculo_modelo: veiculoModelo.trim(),
        veiculo_placa: veiculoPlaca.trim().toUpperCase(),
        servico_id: servicoId,
        servico_nome: selectedServico?.nome || agendamento.servico_nome,
        valor,
        data,
        horario,
        status,
        observacoes: observacoes.trim(),
      });

      success("Agendamento atualizado com sucesso!");
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao atualizar agendamento.";
      error(msg);
    }
  };

  if (!agendamento) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Agendamento"
      description={`Protocolo: #${agendamento.code || agendamento.id}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Dados do Cliente */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Nome do Cliente *"
            value={clienteNome}
            onChange={(e) => setClienteNome(e.target.value)}
            required
          />
          <Input
            label="WhatsApp *"
            value={clienteWhatsapp}
            onChange={(e) => setClienteWhatsapp(e.target.value)}
          />
        </div>

        {/* Veículo */}
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
            value={veiculoModelo}
            onChange={(e) => setVeiculoModelo(e.target.value)}
          />
          <Input
            label="Placa"
            value={veiculoPlaca}
            onChange={(e) => setVeiculoPlaca(e.target.value)}
          />
        </div>

        {/* Serviço */}
        <div>
          <label className="text-xs font-medium text-slate-300 block mb-1.5">
            Serviço ({veiculoTipo}) *
          </label>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {servicosDisponiveis.map((srv) => (
              <label
                key={srv.id}
                className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                  servicoId === srv.id
                    ? "bg-brand-green/10 border-brand-green text-white"
                    : "bg-surface border-surface-border text-slate-300 hover:border-slate-600"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="servicoModalEdit"
                    checked={servicoId === srv.id}
                    onChange={() => handleServiceChange(srv.id)}
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

        {/* Data, Horário e Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <DatePicker label="Data *" value={data} onChange={setData} />
          <TimePicker label="Horário *" value={horario} onChange={setHorario} />
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusAgendamento)}
            options={STATUS_AGENDAMENTO.map((st) => ({ label: st, value: st }))}
          />
        </div>

        {/* Observações */}
        <Input
          label="Observações"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
        />

        {/* Valor */}
        <div className="p-3 rounded-lg bg-surface-elevated border border-surface-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Valor do Atendimento:</span>
          <span className="text-sm font-bold text-brand-green-text">
            {formatCurrency(valor)}
          </span>
        </div>

        {/* Botões */}
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
