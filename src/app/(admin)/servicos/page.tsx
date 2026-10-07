"use client";

import React, { useState, useMemo } from "react";
import {
  Plus,
  Edit3,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  Car,
  Power,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Dialog } from "@/components/ui/Dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency } from "@/lib/utils";
import { Servico, TipoVeiculo, TIPOS_VEICULO } from "@/types";

export default function ServicosPage() {
  const {
    servicos,
    updateServico,
    addServico,
    deactivateServico,
    activateServico,
  } = useAppStore();
  const { success, error } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "ativos" | "inativos">("todos");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("todos");

  // Modais de criação e edição
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingServico, setEditingServico] = useState<Servico | null>(null);

  // Confirmação de desativação
  const [servicoParaDesativar, setServicoParaDesativar] = useState<Servico | null>(null);

  // Estados de novo serviço
  const [novoNome, setNovoNome] = useState("");
  const [novoDescricao, setNovoDescricao] = useState("");
  const [novoTipo, setNovoTipo] = useState<TipoVeiculo>("Carro pequeno");
  const [novoPreco, setNovoPreco] = useState<number | string>(40);
  const [novoDuracao, setNovoDuracao] = useState<number | string>(45);
  const [novoAtivo, setNovoAtivo] = useState(true);

  // Estados de edição de serviço
  const [editNome, setEditNome] = useState("");
  const [editDescricao, setEditDescricao] = useState("");
  const [editTipo, setEditTipo] = useState<TipoVeiculo>("Carro pequeno");
  const [editPreco, setEditPreco] = useState<number | string>(0);
  const [editDuracao, setEditDuracao] = useState<number | string>(30);
  const [editAtivo, setEditAtivo] = useState(true);

  // Filtros combinados
  const filteredServicos = useMemo(() => {
    return servicos.filter((s) => {
      // Filtro de texto
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchName = s.nome.toLowerCase().includes(query);
        const matchDesc = s.descricao ? s.descricao.toLowerCase().includes(query) : false;
        const matchTipo = s.tipo_veiculo.toLowerCase().includes(query);
        if (!matchName && !matchDesc && !matchTipo) return false;
      }

      // Filtro de status
      if (statusFilter === "ativos" && !s.ativo) return false;
      if (statusFilter === "inativos" && s.ativo) return false;

      // Filtro de categoria
      if (categoriaFilter !== "todos" && s.tipo_veiculo !== categoriaFilter) {
        return false;
      }

      return true;
    });
  }, [servicos, searchTerm, statusFilter, categoriaFilter]);

  const handleStartEdit = (s: Servico) => {
    setEditingServico(s);
    setEditNome(s.nome);
    setEditDescricao(s.descricao || "");
    setEditTipo(s.tipo_veiculo);
    setEditPreco(s.preco);
    setEditDuracao(s.duracao_minutos);
    setEditAtivo(s.ativo);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingServico) return;

    const precoNum = Number(editPreco);
    const duracaoNum = Number(editDuracao);

    if (!editNome.trim()) {
      error("Informe o nome do serviço.");
      return;
    }

    if (isNaN(precoNum) || precoNum < 0) {
      error("O preço deve ser maior ou igual a zero (>= 0).");
      return;
    }

    if (isNaN(duracaoNum) || duracaoNum <= 0) {
      error("A duração estimada deve ser maior que zero (> 0).");
      return;
    }

    try {
      updateServico(editingServico.id, {
        nome: editNome.trim(),
        descricao: editDescricao.trim() || undefined,
        tipo_veiculo: editTipo,
        preco: precoNum,
        duracao_minutos: duracaoNum,
        ativo: editAtivo,
      });

      success("Serviço atualizado com sucesso. Preços de atendimentos antigos foram preservados.");
      setEditingServico(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao atualizar serviço.";
      error(msg);
    }
  };

  const handleCreateServico = (e: React.FormEvent) => {
    e.preventDefault();

    const precoNum = Number(novoPreco);
    const duracaoNum = Number(novoDuracao);

    if (!novoNome.trim()) {
      error("Informe o nome do serviço.");
      return;
    }

    if (isNaN(precoNum) || precoNum < 0) {
      error("O preço deve ser maior ou igual a zero (>= 0).");
      return;
    }

    if (isNaN(duracaoNum) || duracaoNum <= 0) {
      error("A duração estimada deve ser maior que zero (> 0).");
      return;
    }

    try {
      addServico({
        numero: servicos.length + 1,
        nome: novoNome.trim(),
        descricao: novoDescricao.trim() || undefined,
        tipo_veiculo: novoTipo,
        preco: precoNum,
        duracao_minutos: duracaoNum,
        ativo: novoAtivo,
      });

      success("Novo serviço cadastrado com sucesso!");
      setIsAddModalOpen(false);
      setNovoNome("");
      setNovoDescricao("");
      setNovoPreco(40);
      setNovoDuracao(45);
      setNovoAtivo(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao cadastrar serviço.";
      error(msg);
    }
  };

  const handleConfirmDeactivate = () => {
    if (!servicoParaDesativar) return;
    deactivateServico(servicoParaDesativar.id);
    success(`Serviço "${servicoParaDesativar.nome}" desativado.`);
    setServicoParaDesativar(null);
  };

  const handleActivate = (s: Servico) => {
    activateServico(s.id);
    success(`Serviço "${s.nome}" reativado com sucesso.`);
  };

  return (
    <div className="space-y-6">
      {/* 1. TOPO DA PÁGINA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-border/60">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Serviços
          </h2>
          <p className="text-xs text-muted-foreground">
            Gerencie os serviços oferecidos pelo Point do Coco.
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={() => setIsAddModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Novo serviço
        </Button>
      </div>

      {/* 2. BARRA DE FILTROS & PESQUISA */}
      <div className="p-4 rounded-xl bg-surface border border-surface-border space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Busca por texto */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar serviço por nome, descrição ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-surface-elevated border border-surface-border text-white placeholder-muted-foreground focus:outline-none focus:border-brand-green"
            />
          </div>

          {/* Filtro de Status (Todos, Ativos, Inativos) */}
          <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-lg border border-surface-border shrink-0">
            {(["todos", "ativos", "inativos"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`text-xs px-3 py-1 rounded-md transition-all capitalize ${
                  statusFilter === st
                    ? "bg-brand-green/20 text-brand-green-text font-medium border border-brand-green/40"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Filtros de Categoria (Todos, Moto, Carro pequeno, SUV, Caminhonete) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-surface-border/50">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">
            Categoria:
          </span>
          {["todos", ...TIPOS_VEICULO].map((t) => (
            <button
              key={t}
              onClick={() => setCategoriaFilter(t)}
              className={`text-xs px-3 py-1 rounded-md border transition-all whitespace-nowrap ${
                categoriaFilter === t
                  ? "bg-brand-yellow/15 text-brand-yellow-text border-brand-yellow font-medium"
                  : "bg-surface text-muted-foreground border-surface-border hover:text-slate-200"
              }`}
            >
              {t === "todos" ? "Todas as categorias" : t}
            </button>
          ))}
        </div>
      </div>

      {/* 3. VISUALIZAÇÃO DESKTOP: TABELA */}
      <div className="hidden md:block rounded-xl border border-surface-border overflow-hidden bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo de Veículo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredServicos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="p-8 text-center">
                  <EmptyState
                    title="Nenhum serviço encontrado"
                    description="Tente ajustar os filtros ou cadastre um novo serviço."
                    icon={<Car className="w-6 h-6 text-muted" />}
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredServicos.map((servico, index) => (
                <TableRow
                  key={servico.id}
                  className={`hover:bg-surface-elevated/40 transition-colors ${
                    !servico.ativo ? "opacity-60 bg-surface-elevated/10" : ""
                  }`}
                >
                  <TableCell className="text-center font-mono text-xs text-muted-foreground">
                    {servico.numero || index + 1}
                  </TableCell>
                  <TableCell className="font-semibold text-white">
                    {servico.nome}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-surface-elevated border border-surface-border text-slate-300">
                      {servico.tipo_veiculo}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                    {servico.descricao || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-slate-300">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      {servico.duracao_minutos} min
                    </span>
                  </TableCell>
                  <TableCell className="font-bold text-sm text-brand-green-text whitespace-nowrap">
                    {formatCurrency(servico.preco)}
                  </TableCell>
                  <TableCell>
                    {servico.ativo ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                        <XCircle className="w-3 h-3" />
                        Inativo
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2"
                        onClick={() => handleStartEdit(servico)}
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1 text-slate-300" />
                        Editar
                      </Button>

                      {servico.ativo ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => setServicoParaDesativar(servico)}
                          title="Desativar serviço"
                        >
                          <Power className="w-3.5 h-3.5 mr-1" />
                          Desativar
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                          onClick={() => handleActivate(servico)}
                          title="Reativar serviço"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Ativar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 4. VISUALIZAÇÃO MOBILE: CARDS */}
      <div className="block md:hidden space-y-3">
        {filteredServicos.length === 0 ? (
          <EmptyState
            title="Nenhum serviço encontrado"
            description="Tente ajustar os filtros ou cadastre um novo serviço."
            icon={<Car className="w-6 h-6 text-muted" />}
          />
        ) : (
          filteredServicos.map((servico, index) => (
            <div
              key={servico.id}
              className={`p-4 rounded-xl bg-surface border border-surface-border space-y-3 transition-all ${
                !servico.ativo ? "opacity-60 bg-surface-elevated/20" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-elevated text-slate-400 border border-surface-border">
                      #{servico.numero || index + 1}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-yellow/10 text-brand-yellow-text border border-brand-yellow/30 font-medium">
                      {servico.tipo_veiculo}
                    </span>
                    {servico.ativo ? (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                        Ativo
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">
                        Inativo
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-white">
                    {servico.nome}
                  </h4>
                </div>

                <div className="text-right">
                  <span className="text-base font-bold text-brand-green-text block">
                    {formatCurrency(servico.preco)}
                  </span>
                  <span className="text-[11px] text-muted-foreground flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3" />
                    {servico.duracao_minutos} min
                  </span>
                </div>
              </div>

              {servico.descricao && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {servico.descricao}
                </p>
              )}

              <div className="pt-2 border-t border-surface-border/60 flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs px-3"
                  onClick={() => handleStartEdit(servico)}
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1" />
                  Editar
                </Button>

                {servico.ativo ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs px-3 text-red-400 border-red-500/30 hover:bg-red-500/10"
                    onClick={() => setServicoParaDesativar(servico)}
                  >
                    <Power className="w-3.5 h-3.5 mr-1" />
                    Desativar
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs px-3 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                    onClick={() => handleActivate(servico)}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Ativar
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 5. MODAL NOVO SERVIÇO */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Novo Serviço"
        description="Cadastre um novo serviço e defina preço e duração padrão."
        size="md"
      >
        <form onSubmit={handleCreateServico} className="space-y-4">
          <Input
            label="Nome do Serviço *"
            placeholder="Ex: Lavagem técnica de motor"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Tipo de Veículo *"
              value={novoTipo}
              onChange={(e) => setNovoTipo(e.target.value as TipoVeiculo)}
              options={TIPOS_VEICULO.map((t) => ({ label: t, value: t }))}
              required
            />

            <Select
              label="Status"
              value={novoAtivo ? "ativo" : "inativo"}
              onChange={(e) => setNovoAtivo(e.target.value === "ativo")}
              options={[
                { label: "Ativo", value: "ativo" },
                { label: "Inativo", value: "inativo" },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Preço (R$) *"
              type="number"
              step="5"
              min="0"
              placeholder="0.00"
              value={novoPreco}
              onChange={(e) => setNovoPreco(e.target.value)}
              required
            />

            <Input
              label="Duração Estimada (minutos) *"
              type="number"
              step="5"
              min="5"
              placeholder="45"
              value={novoDuracao}
              onChange={(e) => setNovoDuracao(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Descrição (opcional)
            </label>
            <textarea
              rows={3}
              placeholder="Detalhes sobre o que está incluso neste serviço..."
              value={novoDescricao}
              onChange={(e) => setNovoDescricao(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl bg-surface-elevated border border-surface-border text-white placeholder-muted-foreground focus:outline-none focus:border-brand-green"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Cadastrar serviço
            </Button>
          </div>
        </form>
      </Modal>

      {/* 6. MODAL EDITAR SERVIÇO */}
      <Modal
        isOpen={!!editingServico}
        onClose={() => setEditingServico(null)}
        title="Editar Serviço"
        description="Atualize as informações do serviço. Os agendamentos já realizados mantêm o preço original."
        size="md"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <Input
            label="Nome do Serviço *"
            value={editNome}
            onChange={(e) => setEditNome(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Tipo de Veículo *"
              value={editTipo}
              onChange={(e) => setEditTipo(e.target.value as TipoVeiculo)}
              options={TIPOS_VEICULO.map((t) => ({ label: t, value: t }))}
              required
            />

            <Select
              label="Status"
              value={editAtivo ? "ativo" : "inativo"}
              onChange={(e) => setEditAtivo(e.target.value === "ativo")}
              options={[
                { label: "Ativo", value: "ativo" },
                { label: "Inativo", value: "inativo" },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Preço (R$) *"
              type="number"
              step="5"
              min="0"
              value={editPreco}
              onChange={(e) => setEditPreco(e.target.value)}
              required
            />

            <Input
              label="Duração Estimada (minutos) *"
              type="number"
              step="5"
              min="5"
              value={editDuracao}
              onChange={(e) => setEditDuracao(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Descrição
            </label>
            <textarea
              rows={3}
              value={editDescricao}
              onChange={(e) => setEditDescricao(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl bg-surface-elevated border border-surface-border text-white placeholder-muted-foreground focus:outline-none focus:border-brand-green"
            />
          </div>

          <div className="p-3 rounded-lg bg-surface-elevated border border-surface-border text-[11px] text-muted-foreground flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
            <p>
              <strong>Preservação de histórico:</strong> A alteração de preço não modifica os agendamentos antigos. O valor contratado é protegido pelo snapshot histórico de faturamento.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditingServico(null)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Salvar alterações
            </Button>
          </div>
        </form>
      </Modal>

      {/* 7. DIÁLOGO DE CONFIRMAÇÃO DE DESATIVAÇÃO (Soft Delete) */}
      <Dialog
        isOpen={!!servicoParaDesativar}
        onClose={() => setServicoParaDesativar(null)}
        title="Desativar Serviço"
        description={`Tem certeza que deseja desativar "${servicoParaDesativar?.nome}"? O serviço não aparecerá para novos agendamentos, mas todos os agendamentos anteriores manterão o nome e os valores originais intactos no histórico.`}
        confirmText="Sim, desativar"
        cancelText="Cancelar"
        variant="primary"
        onConfirm={handleConfirmDeactivate}
      />
    </div>
  );
}
