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
  TipoVeiculo,
  TIPOS_VEICULO,
  StatusAgendamento,
  STATUS_AGENDAMENTO,
} from "@/types";
import { formatCurrency } from "@/lib/utils";
import { getTodayDateString } from "@/lib/initialData";

interface NovoAgendamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStatus?: StatusAgendamento;
  defaultHorario?: string;
  defaultData?: string;
  initialClienteId?: string;
  initialVeiculoId?: string;
}

export function NovoAgendamentoModal({
  isOpen,
  onClose,
  defaultStatus = "Agendado",
  defaultHorario = "09:00",
  defaultData,
  initialClienteId,
  initialVeiculoId,
}: NovoAgendamentoModalProps) {
  const { servicos, clientes, veiculos, addAgendamento, addCliente } = useAppStore();
  const { success, error } = useToast();

  const [selectedClienteId, setSelectedClienteId] = useState<string>("novo");
  const [clienteNome, setClienteNome] = useState("");
  const [clienteWhatsapp, setClienteWhatsapp] = useState("");

  const [selectedVeiculoId, setSelectedVeiculoId] = useState<string>("novo");
  const [veiculoTipo, setVeiculoTipo] = useState<TipoVeiculo>("Carro pequeno");
  const [veiculoModelo, setVeiculoModelo] = useState("");
  const [veiculoPlaca, setVeiculoPlaca] = useState("");

  const [servicoId, setServicoId] = useState("");
  const [precoManual, setPrecoManual] = useState<string>("");
  const [isEditingPreco, setIsEditingPreco] = useState(false);

  const [data, setData] = useState(defaultData || getTodayDateString());
  const [horario, setHorario] = useState(defaultHorario);
  const [status, setStatus] = useState<StatusAgendamento>(defaultStatus);
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    if (defaultData) setData(defaultData);
    if (defaultHorario) setHorario(defaultHorario);
    if (defaultStatus) setStatus(defaultStatus);

    if (initialClienteId) {
      setSelectedClienteId(initialClienteId);
      const cli = clientes.find((c) => c.id === initialClienteId);
      if (cli) {
        setClienteNome(cli.nome);
        setClienteWhatsapp(cli.whatsapp);
      }
    }

    if (initialVeiculoId) {
      setSelectedVeiculoId(initialVeiculoId);
      const veh = veiculos.find((v) => v.id === initialVeiculoId);
      if (veh) {
        setVeiculoTipo(veh.tipo);
        setVeiculoModelo(veh.modelo);
        setVeiculoPlaca(veh.placa && veh.placa !== "---" ? veh.placa : "");
      }
    }
  }, [defaultData, defaultHorario, defaultStatus, initialClienteId, initialVeiculoId, isOpen, clientes, veiculos]);

  // Atualizar dados quando seleciona cliente existente
  const handleClienteChange = (cId: string) => {
    setSelectedClienteId(cId);
    if (cId === "novo") {
      setClienteNome("");
      setClienteWhatsapp("");
      setSelectedVeiculoId("novo");
      return;
    }

    const c = clientes.find((item) => item.id === cId);
    if (c) {
      setClienteNome(c.nome);
      setClienteWhatsapp(c.whatsapp);

      // Veículos desse cliente
      const clientVehicles = veiculos.filter((v) => v.cliente_id === cId);
      if (clientVehicles.length > 0) {
        const v = clientVehicles[0];
        setSelectedVeiculoId(v.id);
        setVeiculoTipo(v.tipo);
        setVeiculoModelo(v.modelo);
        setVeiculoPlaca(v.placa);
      } else {
        setSelectedVeiculoId("novo");
      }
    }
  };

  // Atualizar quando seleciona veículo existente do cliente
  const handleVeiculoChange = (vId: string) => {
    setSelectedVeiculoId(vId);
    if (vId === "novo") {
      setVeiculoModelo("");
      setVeiculoPlaca("");
      return;
    }

    const v = veiculos.find((item) => item.id === vId);
    if (v) {
      setVeiculoTipo(v.tipo);
      setVeiculoModelo(v.modelo);
      setVeiculoPlaca(v.placa);
    }
  };

  // Veículos pertencentes ao cliente selecionado
  const clienteVeiculos = selectedClienteId !== "novo"
    ? veiculos.filter((v) => v.cliente_id === selectedClienteId)
    : [];

  // Serviços filtrados pelo tipo de veículo
  const servicosDisponiveis = servicos.filter(
    (s) => s.ativo && s.tipo_veiculo === veiculoTipo
  );

  const selectedServico =
    servicosDisponiveis.find((s) => s.id === servicoId) ||
    servicosDisponiveis[0];

  // Preço efetivo (manual ou automático do serviço)
  const precoEfetivo = isEditingPreco && precoManual !== ""
    ? parseFloat(precoManual.replace(",", ".")) || 0
    : selectedServico?.preco || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!clienteNome.trim()) {
      error("Informe o nome do cliente");
      return;
    }

    if (!selectedServico) {
      error("Selecione um serviço compatível");
      return;
    }

    try {
      addAgendamento({
        cliente_id: selectedClienteId !== "novo" ? selectedClienteId : undefined,
        cliente_nome: clienteNome.trim(),
        cliente_whatsapp: clienteWhatsapp.trim(),
        veiculo_id: selectedVeiculoId !== "novo" ? selectedVeiculoId : undefined,
        veiculo_tipo: veiculoTipo,
        veiculo_modelo: veiculoModelo.trim() || `${veiculoTipo}`,
        veiculo_placa: veiculoPlaca.trim().toUpperCase() || "---",
        servico_id: selectedServico.id,
        servico_nome: selectedServico.nome,
        valor: precoEfetivo,
        data,
        horario,
        status,
        observacoes: observacoes.trim(),
      });

      // Cadastrar cliente se for novo
      if (selectedClienteId === "novo" && clienteNome.trim()) {
        const clienteExistente = clientes.find(
          (c) =>
            c.nome.toLowerCase() === clienteNome.trim().toLowerCase() ||
            (clienteWhatsapp && c.whatsapp.replace(/\D/g, "") === clienteWhatsapp.replace(/\D/g, ""))
        );

        if (!clienteExistente) {
          try {
            addCliente({
              nome: clienteNome.trim(),
              whatsapp: clienteWhatsapp.trim(),
              observacoes: "Cadastrado no novo agendamento administrativo",
            });
          } catch {}
        }
      }

      success("Agendamento criado com sucesso!");
      onClose();

      // Reset
      setSelectedClienteId("novo");
      setClienteNome("");
      setClienteWhatsapp("");
      setVeiculoModelo("");
      setVeiculoPlaca("");
      setObservacoes("");
      setIsEditingPreco(false);
      setPrecoManual("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao registrar agendamento";
      error(msg);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Novo Agendamento"
      description="Preencha os detalhes do atendimento do Point do Coco."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Seleção de Cliente Existente ou Novo */}
        <div className="space-y-2">
          <Select
            label="Cliente Cadastrado ou Novo"
            value={selectedClienteId}
            onChange={(e) => handleClienteChange(e.target.value)}
            options={[
              { label: "+ Cadastrar Novo Cliente", value: "novo" },
              ...clientes.map((c) => ({
                label: `${c.nome} (${c.whatsapp})`,
                value: c.id,
              })),
            ]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nome do Cliente *"
              placeholder="Ex: João da Silva"
              value={clienteNome}
              onChange={(e) => setClienteNome(e.target.value)}
              required
            />
            <Input
              label="WhatsApp *"
              placeholder="Ex: (71) 99999-9999"
              value={clienteWhatsapp}
              onChange={(e) => setClienteWhatsapp(e.target.value)}
            />
          </div>
        </div>

        {/* Veículo */}
        <div className="space-y-2 pt-1 border-t border-surface-border">
          {clienteVeiculos.length > 0 && (
            <Select
              label="Veículo do Cliente"
              value={selectedVeiculoId}
              onChange={(e) => handleVeiculoChange(e.target.value)}
              options={[
                ...clienteVeiculos.map((v) => ({
                  label: `${v.modelo} (${v.placa}) - ${v.tipo}`,
                  value: v.id,
                })),
                { label: "+ Cadastrar outro veículo", value: "novo" },
              ]}
            />
          )}

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
              placeholder="Ex: Civic, Corolla, Hilux"
              value={veiculoModelo}
              onChange={(e) => setVeiculoModelo(e.target.value)}
            />
            <Input
              label="Placa (opcional)"
              placeholder="Ex: BRA2E19"
              value={veiculoPlaca}
              onChange={(e) => setVeiculoPlaca(e.target.value)}
            />
          </div>
        </div>

        {/* Serviço compatível */}
        <div className="pt-1 border-t border-surface-border">
          <label className="text-xs font-medium text-slate-300 block mb-1.5">
            Serviço ({veiculoTipo}) *
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {servicosDisponiveis.map((srv) => {
              const isSelected = selectedServico && selectedServico.id === srv.id;
              return (
                <label
                  key={srv.id}
                  className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-brand-green/10 border-brand-green text-white"
                      : "bg-surface border-surface-border text-slate-300 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="servicoModalAdmin"
                      checked={isSelected}
                      onChange={() => {
                        setServicoId(srv.id);
                        if (!isEditingPreco) setPrecoManual("");
                      }}
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
              );
            })}
          </div>
        </div>

        {/* Data, Horário e Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-surface-border">
          <DatePicker label="Data *" value={data} onChange={setData} />
          <TimePicker label="Horário *" value={horario} onChange={setHorario} />
          <Select
            label="Status Inicial"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusAgendamento)}
            options={STATUS_AGENDAMENTO.map((st) => ({ label: st, value: st }))}
          />
        </div>

        {/* Observações */}
        <Input
          label="Observações (opcional)"
          placeholder="Ex: Cliente aguarda na recepção, lavagem detalhada"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
        />

        {/* Preço (Automático com permissão de edição manual - Requisito 22) */}
        <div className="p-3 rounded-lg bg-surface-elevated border border-surface-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Valor do serviço:</span>
            <div className="flex items-center gap-2">
              {!isEditingPreco ? (
                <>
                  <span className="text-sm font-bold text-brand-green-text">
                    {formatCurrency(precoEfetivo)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingPreco(true);
                      setPrecoManual(precoEfetivo.toString());
                    }}
                    className="text-[11px] text-brand-yellow hover:underline ml-1"
                  >
                    Alterar manual
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-300">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={precoManual}
                    onChange={(e) => setPrecoManual(e.target.value)}
                    className="w-24 h-7 px-2 text-xs rounded bg-surface border border-surface-border text-white text-right font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setIsEditingPreco(false)}
                    className="text-[10px] text-muted-foreground hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary">
            Salvar Agendamento
          </Button>
        </div>
      </form>
    </Modal>
  );
}
