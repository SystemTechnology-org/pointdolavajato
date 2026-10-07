"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Car,
  Plus,
  Edit3,
  Calendar,
  Eye,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Search } from "@/components/ui/Search";
import { useToast } from "@/components/ui/Toast";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Dialog } from "@/components/ui/Dialog";
import { NovoVeiculoModal } from "@/components/modals/NovoVeiculoModal";
import { EditarVeiculoModal } from "@/components/modals/EditarVeiculoModal";
import { NovoAgendamentoModal } from "@/components/modals/NovoAgendamentoModal";
import { useAppStore } from "@/lib/store";
import { TIPOS_VEICULO, Veiculo } from "@/types";

const ITEMS_PER_PAGE = 25;

export default function VeiculosPage() {
  const {
    veiculos,
    clientes,
    deactivateVeiculo,
    activateVeiculo,
  } = useAppStore();
  const { success } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTipo, setSelectedTipo] = useState<string>("todos");
  const [statusFilter, setStatusFilter] = useState<"ativos" | "inativos" | "todos">("ativos");
  const [currentPage, setCurrentPage] = useState(1);

  // Modais
  const [isNovoVeiculoOpen, setIsNovoVeiculoOpen] = useState(false);
  const [editingVeiculo, setEditingVeiculo] = useState<Veiculo | null>(null);
  const [agendandoVeiculo, setAgendandoVeiculo] = useState<Veiculo | null>(null);
  const [veiculoToToggle, setVeiculoToToggle] = useState<Veiculo | null>(null);

  // Filtragem
  const filteredVeiculos = useMemo(() => {
    return veiculos.filter((v) => {
      // Filtro de status (Requisito 15)
      if (statusFilter === "ativos" && v.ativo === false) return false;
      if (statusFilter === "inativos" && v.ativo !== false) return false;

      // Filtro de tipo
      if (selectedTipo !== "todos" && v.tipo !== selectedTipo) return false;

      // Busca textual
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const matchModel = v.modelo.toLowerCase().includes(term);
      const matchPlate = v.placa.toLowerCase().includes(term);
      const matchBrand = v.marca.toLowerCase().includes(term);
      const matchClient = (v.cliente_nome || "").toLowerCase().includes(term);

      return matchModel || matchPlate || matchBrand || matchClient;
    });
  }, [veiculos, searchTerm, selectedTipo, statusFilter]);

  // Paginação
  const totalPages = Math.ceil(filteredVeiculos.length / ITEMS_PER_PAGE) || 1;
  const paginatedVeiculos = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredVeiculos.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredVeiculos, currentPage]);

  const handleToggleVeiculoConfirm = () => {
    if (!veiculoToToggle) return;

    if (veiculoToToggle.ativo !== false) {
      deactivateVeiculo(veiculoToToggle.id);
      success("Veículo desativado com sucesso. O histórico foi preservado.");
    } else {
      activateVeiculo(veiculoToToggle.id);
      success("Veículo reativado com sucesso.");
    }

    setVeiculoToToggle(null);
  };

  return (
    <div className="space-y-5">
      {/* 1. TOPO DA PÁGINA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-border/60">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Veículos
          </h2>
          <p className="text-xs text-muted-foreground">
            Gerencie os veículos cadastrados e seus históricos de atendimento.
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={() => setIsNovoVeiculoOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Novo veículo
        </Button>
      </div>

      {/* 2. FILTROS E PESQUISA */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <Search
            value={searchTerm}
            onChange={(val) => {
              setSearchTerm(val);
              setCurrentPage(1);
            }}
            placeholder="Buscar por placa, modelo, marca ou cliente..."
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro por Categoria */}
          <div className="flex items-center gap-1 overflow-x-auto p-1 bg-surface rounded-xl border border-surface-border text-xs">
            {["todos", ...TIPOS_VEICULO].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setSelectedTipo(t);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg capitalize whitespace-nowrap transition-colors ${
                  selectedTipo === t
                    ? "bg-surface-elevated text-brand-green font-semibold"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Filtro por Status */}
          <div className="flex items-center gap-1 p-1 bg-surface rounded-xl border border-surface-border text-xs">
            <button
              onClick={() => {
                setStatusFilter("ativos");
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                statusFilter === "ativos"
                  ? "bg-surface-elevated text-brand-green font-semibold"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              Ativos
            </button>
            <button
              onClick={() => {
                setStatusFilter("inativos");
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                statusFilter === "inativos"
                  ? "bg-surface-elevated text-amber-400 font-semibold"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              Inativos
            </button>
            <button
              onClick={() => {
                setStatusFilter("todos");
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                statusFilter === "todos"
                  ? "bg-surface-elevated text-white font-semibold"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              Todos
            </button>
          </div>
        </div>
      </div>

      {/* 3. LISTAGEM PRINCIPAL */}
      {filteredVeiculos.length === 0 ? (
        <EmptyState
          icon={<Car className="w-8 h-8 text-muted" />}
          title="Nenhum veículo encontrado"
          description={
            searchTerm
              ? `Nenhum resultado para "${searchTerm}".`
              : "Cadastre seu primeiro veículo para gerenciar atendimentos."
          }
          action={
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsNovoVeiculoOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Adicionar veículo
            </Button>
          }
        />
      ) : (
        <>
          {/* TABELA DESKTOP */}
          <div className="hidden md:block rounded-2xl border border-surface-border bg-surface overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Proprietário</TableHead>
                  <TableHead>Cor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedVeiculos.map((veiculo) => {
                  const isVehAtivo = veiculo.ativo !== false;
                  const owner = clientes.find((c) => c.id === veiculo.cliente_id);

                  return (
                    <TableRow key={veiculo.id} className="hover:bg-surface-elevated/40 transition-colors">
                      {/* Modelo e Marca */}
                      <TableCell>
                        <Link
                          href={`/veiculos/${veiculo.id}`}
                          className="group block"
                        >
                          <div className="font-semibold text-white group-hover:text-brand-green-text transition-colors">
                            {veiculo.modelo}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {veiculo.marca || "Marca genérica"}
                          </div>
                        </Link>
                      </TableCell>

                      {/* Categoria */}
                      <TableCell>
                        <span className="px-2 py-0.5 rounded bg-surface-elevated border border-surface-border text-xs text-slate-300">
                          {veiculo.tipo}
                        </span>
                      </TableCell>

                      {/* Placa */}
                      <TableCell>
                        <span className="font-mono font-bold text-xs text-brand-yellow-text">
                          {veiculo.placa && veiculo.placa !== "---" ? veiculo.placa : "Sem placa"}
                        </span>
                      </TableCell>

                      {/* Proprietário */}
                      <TableCell>
                        {owner ? (
                          <Link
                            href={`/clientes/${owner.id}`}
                            className="inline-flex items-center gap-1.5 text-xs text-slate-200 hover:text-brand-green-text font-medium"
                          >
                            <User className="w-3 h-3 text-muted-foreground" />
                            <span>{owner.nome}</span>
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">Cliente não identificado</span>
                        )}
                      </TableCell>

                      {/* Cor */}
                      <TableCell className="text-xs text-slate-300">
                        {veiculo.cor || "Não informada"}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                            isVehAtivo
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isVehAtivo ? "bg-emerald-400" : "bg-slate-400"}`} />
                          <span>{isVehAtivo ? "Ativo" : "Inativo"}</span>
                        </span>
                      </TableCell>

                      {/* Ações */}
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link href={`/veiculos/${veiculo.id}`}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-xs text-slate-300 hover:text-white"
                              title="Visualizar histórico do veículo"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Histórico
                            </Button>
                          </Link>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-xs text-brand-green-text hover:bg-brand-green/10"
                            onClick={() => setAgendandoVeiculo(veiculo)}
                            title="Novo agendamento com este veículo"
                          >
                            <Calendar className="w-3.5 h-3.5 mr-1" />
                            Agendar
                          </Button>

                          <button
                            onClick={() => setEditingVeiculo(veiculo)}
                            className="p-1.5 rounded text-muted hover:text-brand-yellow hover:bg-surface-elevated transition-colors"
                            title="Editar veículo"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setVeiculoToToggle(veiculo)}
                            className={`p-1.5 rounded transition-colors ${
                              isVehAtivo
                                ? "text-muted hover:text-amber-400 hover:bg-amber-500/10"
                                : "text-muted hover:text-emerald-400 hover:bg-emerald-500/10"
                            }`}
                            title={isVehAtivo ? "Desativar veículo" : "Reativar veículo"}
                          >
                            {isVehAtivo ? (
                              <ShieldAlert className="w-3.5 h-3.5" />
                            ) : (
                              <ShieldCheck className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* LISTA DE CARDS MOBILE (< 768px) */}
          <div className="md:hidden space-y-3">
            {paginatedVeiculos.map((veiculo) => {
              const isVehAtivo = veiculo.ativo !== false;
              const owner = clientes.find((c) => c.id === veiculo.cliente_id);

              return (
                <div
                  key={veiculo.id}
                  className="p-4 rounded-2xl bg-surface border border-surface-border space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/veiculos/${veiculo.id}`}
                        className="font-bold text-white text-sm hover:text-brand-green-text flex items-center gap-1.5"
                      >
                        <Car className="w-4 h-4 text-brand-green shrink-0" />
                        <span>{veiculo.modelo}</span>
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {veiculo.marca} • {veiculo.tipo}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        isVehAtivo
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                      }`}
                    >
                      {isVehAtivo ? "Ativo" : "Inativo"}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Placa:</span>
                      <span className="font-mono font-bold text-brand-yellow-text">
                        {veiculo.placa && veiculo.placa !== "---" ? veiculo.placa : "Sem placa"}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Proprietário:</span>
                      {owner ? (
                        <Link
                          href={`/clientes/${owner.id}`}
                          className="text-slate-200 hover:text-brand-green-text font-medium"
                        >
                          {owner.nome}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Não identificado</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-surface-border flex items-center justify-between gap-2">
                    <Link href={`/veiculos/${veiculo.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full text-xs h-8">
                        <Eye className="w-3 h-3 mr-1" />
                        Ver histórico
                      </Button>
                    </Link>

                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1 text-xs h-8"
                      onClick={() => setAgendandoVeiculo(veiculo)}
                    >
                      <Calendar className="w-3 h-3 mr-1" />
                      Agendar
                    </Button>

                    <button
                      onClick={() => setEditingVeiculo(veiculo)}
                      className="p-2 rounded-lg bg-surface-elevated text-muted hover:text-brand-yellow border border-surface-border"
                      title="Editar veículo"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CONTROLES DE PAGINAÇÃO */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
              <div>
                Página <strong className="text-white">{currentPage}</strong> de{" "}
                <strong className="text-white">{totalPages}</strong> ({filteredVeiculos.length} veículos)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-2.5"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  Anterior
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 px-2.5"
                >
                  Próximo
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAIS */}
      <NovoVeiculoModal
        isOpen={isNovoVeiculoOpen}
        onClose={() => setIsNovoVeiculoOpen(false)}
      />

      <EditarVeiculoModal
        isOpen={!!editingVeiculo}
        onClose={() => setEditingVeiculo(null)}
        veiculo={editingVeiculo}
      />

      <NovoAgendamentoModal
        isOpen={!!agendandoVeiculo}
        onClose={() => setAgendandoVeiculo(null)}
        initialClienteId={agendandoVeiculo?.cliente_id}
        initialVeiculoId={agendandoVeiculo?.id}
      />

      {/* Confirmação de Desativação de Veículo (Requisito 15) */}
      <Dialog
        isOpen={!!veiculoToToggle}
        onClose={() => setVeiculoToToggle(null)}
        onConfirm={handleToggleVeiculoConfirm}
        title={
          veiculoToToggle?.ativo !== false
            ? "Desativar este veículo?"
            : "Reativar este veículo?"
        }
        description={
          veiculoToToggle?.ativo !== false
            ? `Tem certeza que deseja desativar ${veiculoToToggle?.modelo}? O histórico de atendimentos continuará salvo no sistema.`
            : `Deseja reativar ${veiculoToToggle?.modelo}? Ele voltará a constar como disponível para novos agendamentos.`
        }
        confirmText={veiculoToToggle?.ativo !== false ? "Desativar" : "Reativar"}
        variant={veiculoToToggle?.ativo !== false ? "danger" : "primary"}
      />
    </div>
  );
}
