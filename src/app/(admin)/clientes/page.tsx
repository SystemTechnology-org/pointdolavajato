"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Users,
  Car,
  Calendar,
  Edit3,
  Eye,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Search } from "@/components/ui/Search";
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
import { NovoClienteModal } from "@/components/modals/NovoClienteModal";
import { EditarClienteModal } from "@/components/modals/EditarClienteModal";
import { NovoAgendamentoModal } from "@/components/modals/NovoAgendamentoModal";
import { useAppStore } from "@/lib/store";
import { formatPhoneFriendlyDisplay } from "@/lib/services/whatsapp";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { useToast } from "@/components/ui/Toast";
import { Cliente } from "@/types";

const ITEMS_PER_PAGE = 25;

export default function ClientesPage() {
  const {
    clientes,
    veiculos,
    deactivateCliente,
    activateCliente,
  } = useAppStore();
  const { success } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "ativos" | "inativos">("ativos");
  const [currentPage, setCurrentPage] = useState(1);

  // Modais
  const [isNovoClienteOpen, setIsNovoClienteOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [agendandoClienteId, setAgendandoClienteId] = useState<string | null>(null);
  const [clienteToToggleStatus, setClienteToToggleStatus] = useState<Cliente | null>(null);

  // Filtragem e busca por Nome, WhatsApp e Email (Requisito 3)
  const filteredClientes = useMemo(() => {
    return clientes.filter((c) => {
      // Filtro de status (Requisito 5)
      if (statusFilter === "ativos" && c.ativo === false) return false;
      if (statusFilter === "inativos" && c.ativo !== false) return false;

      // Busca textual
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const matchName = c.nome.toLowerCase().includes(term);
      const matchPhone = c.whatsapp.includes(term);
      const matchEmail = c.email ? c.email.toLowerCase().includes(term) : false;
      return matchName || matchPhone || matchEmail;
    });
  }, [clientes, searchTerm, statusFilter]);

  // Paginação (Requisito 27)
  const totalPages = Math.ceil(filteredClientes.length / ITEMS_PER_PAGE) || 1;
  const paginatedClientes = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredClientes.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredClientes, currentPage]);

  const handleToggleStatusConfirm = () => {
    if (!clienteToToggleStatus) return;

    if (clienteToToggleStatus.ativo !== false) {
      deactivateCliente(clienteToToggleStatus.id);
      success("Cliente desativado. Seu histórico foi preservado.");
    } else {
      activateCliente(clienteToToggleStatus.id);
      success("Cliente ativado com sucesso.");
    }

    setClienteToToggleStatus(null);
  };

  return (
    <div className="space-y-5">
      {/* 1. TOPO DA PÁGINA (Requisito 2) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-border/60">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Clientes
          </h2>
          <p className="text-xs text-muted-foreground">
            Gerencie os clientes e o histórico de atendimentos.
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={() => setIsNovoClienteOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Novo cliente
        </Button>
      </div>

      {/* 2. BARRA DE PESQUISA, FILTROS E PAGINAÇÃO (Requisitos 3, 5, 27) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <Search
            value={searchTerm}
            onChange={(val) => {
              setSearchTerm(val);
              setCurrentPage(1);
            }}
            placeholder="Buscar cliente por nome, WhatsApp ou email..."
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Filtro de Status */}
          <div className="flex items-center gap-1 p-1 bg-surface rounded-xl border border-surface-border text-xs">
            <button
              onClick={() => {
                setStatusFilter("ativos");
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg transition-colors ${
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
              className={`px-3 py-1 rounded-lg transition-colors ${
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
              className={`px-3 py-1 rounded-lg transition-colors ${
                statusFilter === "todos"
                  ? "bg-surface-elevated text-white font-semibold"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              Todos
            </button>
          </div>

          <div className="text-xs text-muted-foreground whitespace-nowrap pl-2 hidden sm:block">
            <strong className="text-white">{filteredClientes.length}</strong> encontrados
          </div>
        </div>
      </div>

      {/* 3. LISTAGEM PRINCIPAL (Requisitos 4, 32, 34) */}
      {filteredClientes.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8 text-muted" />}
          title="Nenhum cliente cadastrado ainda"
          description={
            searchTerm
              ? `Nenhum resultado encontrado para "${searchTerm}".`
              : "Cadastre seu primeiro cliente para iniciar o gerenciamento completo."
          }
          action={
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsNovoClienteOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Cadastrar primeiro cliente
            </Button>
          }
        />
      ) : (
        <>
          {/* TABELA DESKTOP (>= 768px) */}
          <div className="hidden md:block rounded-2xl border border-surface-border bg-surface overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Veículos</TableHead>
                  <TableHead>Último Atendimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedClientes.map((cliente) => {
                  const clientVehicles = veiculos.filter(
                    (v) => v.cliente_id === cliente.id && v.ativo !== false
                  );
                  const isAtivo = cliente.ativo !== false;

                  return (
                    <TableRow key={cliente.id} className="hover:bg-surface-elevated/40 transition-colors">
                      {/* Nome e info */}
                      <TableCell>
                        <Link
                          href={`/clientes/${cliente.id}`}
                          className="group block"
                        >
                          <div className="font-semibold text-white group-hover:text-brand-green-text transition-colors">
                            {cliente.nome}
                          </div>
                          {cliente.email && (
                            <div className="text-[11px] text-muted-foreground">
                              {cliente.email}
                            </div>
                          )}
                          {cliente.observacoes && (
                            <div className="text-[10px] text-slate-400 truncate max-w-xs italic">
                              {cliente.observacoes}
                            </div>
                          )}
                        </Link>
                      </TableCell>

                      {/* WhatsApp com ação rápida centralizada */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-300 font-medium">
                            {formatPhoneFriendlyDisplay(cliente.whatsapp)}
                          </span>
                          <WhatsAppButton
                            phone={cliente.whatsapp}
                            templateType="generalContact"
                            templateVars={{ cliente: cliente.nome }}
                            customerId={cliente.id}
                            label="WhatsApp"
                            size="xs"
                            variant="outline"
                          />
                        </div>
                      </TableCell>

                      {/* Veículos vinculados */}
                      <TableCell>
                        {clientVehicles.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {clientVehicles.map((v) => (
                              <Link
                                key={v.id}
                                href={`/veiculos/${v.id}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-elevated text-slate-200 border border-surface-border text-xs hover:border-brand-green/60 transition-colors"
                              >
                                <Car className="w-3 h-3 text-brand-green shrink-0" />
                                <span>{v.modelo}</span>
                                {v.placa && v.placa !== "---" && (
                                  <span className="text-muted-foreground font-mono text-[10px]">
                                    ({v.placa})
                                  </span>
                                )}
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            Nenhum veículo ativo
                          </span>
                        )}
                      </TableCell>

                      {/* Último atendimento */}
                      <TableCell className="text-xs text-slate-300">
                        {cliente.ultimo_atendimento || "Sem atendimentos"}
                      </TableCell>

                      {/* Status Ativo / Inativo (Requisito 5) */}
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                            isAtivo
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isAtivo ? "bg-emerald-400" : "bg-slate-400"}`} />
                          <span>{isAtivo ? "Ativo" : "Inativo"}</span>
                        </span>
                      </TableCell>

                      {/* Ações */}
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link href={`/clientes/${cliente.id}`}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-xs text-slate-300 hover:text-white"
                              title="Visualizar detalhes do cliente"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Ver
                            </Button>
                          </Link>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-xs text-brand-green-text hover:bg-brand-green/10"
                            onClick={() => setAgendandoClienteId(cliente.id)}
                            title="Novo agendamento para este cliente"
                          >
                            <Calendar className="w-3.5 h-3.5 mr-1" />
                            Agendar
                          </Button>

                          <button
                            onClick={() => setEditingCliente(cliente)}
                            className="p-1.5 rounded-md text-muted hover:text-brand-yellow hover:bg-surface-elevated transition-colors"
                            title="Editar cliente"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setClienteToToggleStatus(cliente)}
                            className={`p-1.5 rounded-md transition-colors ${
                              isAtivo
                                ? "text-muted hover:text-amber-400 hover:bg-amber-500/10"
                                : "text-muted hover:text-emerald-400 hover:bg-emerald-500/10"
                            }`}
                            title={isAtivo ? "Desativar cliente" : "Ativar cliente"}
                          >
                            {isAtivo ? (
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

          {/* LISTA DE CARDS MOBILE (< 768px) (Requisitos 4 e 34) */}
          <div className="md:hidden space-y-3">
            {paginatedClientes.map((cliente) => {
              const clientVehicles = veiculos.filter(
                (v) => v.cliente_id === cliente.id && v.ativo !== false
              );
              const isAtivo = cliente.ativo !== false;

              return (
                <div
                  key={cliente.id}
                  className="p-4 rounded-2xl bg-surface border border-surface-border space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/clientes/${cliente.id}`}
                        className="font-bold text-white text-sm hover:text-brand-green-text"
                      >
                        {cliente.nome}
                      </Link>
                      {cliente.email && (
                        <p className="text-[11px] text-muted-foreground">{cliente.email}</p>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        isAtivo
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isAtivo ? "bg-emerald-400" : "bg-slate-400"}`} />
                      <span>{isAtivo ? "Ativo" : "Inativo"}</span>
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">WhatsApp:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-300 font-medium">
                          {formatPhoneFriendlyDisplay(cliente.whatsapp)}
                        </span>
                        <WhatsAppButton
                          phone={cliente.whatsapp}
                          templateType="generalContact"
                          templateVars={{ cliente: cliente.nome }}
                          customerId={cliente.id}
                          label="Chamar"
                          size="xs"
                          variant="outline"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Veículos:</span>
                      <span className="text-slate-200">
                        {clientVehicles.length > 0
                          ? `${clientVehicles.length} veículo(s)`
                          : "Nenhum veículo"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Último atendimento:</span>
                      <span className="text-slate-300">
                        {cliente.ultimo_atendimento || "Sem atendimentos"}
                      </span>
                    </div>
                  </div>

                  {/* Ações Mobile */}
                  <div className="pt-2 border-t border-surface-border flex items-center justify-between gap-2">
                    <Link href={`/clientes/${cliente.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full text-xs h-8">
                        <Eye className="w-3 h-3 mr-1" />
                        Ver detalhes
                      </Button>
                    </Link>

                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1 text-xs h-8"
                      onClick={() => setAgendandoClienteId(cliente.id)}
                    >
                      <Calendar className="w-3 h-3 mr-1" />
                      Agendar
                    </Button>

                    <button
                      onClick={() => setEditingCliente(cliente)}
                      className="p-2 rounded-lg bg-surface-elevated text-muted hover:text-brand-yellow border border-surface-border"
                      title="Editar"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 4. CONTROLES DE PAGINAÇÃO (Requisito 27) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
              <div>
                Página <strong className="text-white">{currentPage}</strong> de{" "}
                <strong className="text-white">{totalPages}</strong> ({filteredClientes.length} clientes)
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

      {/* 5. MODAIS */}
      <NovoClienteModal
        isOpen={isNovoClienteOpen}
        onClose={() => setIsNovoClienteOpen(false)}
      />

      <EditarClienteModal
        isOpen={!!editingCliente}
        onClose={() => setEditingCliente(null)}
        cliente={editingCliente}
      />

      <NovoAgendamentoModal
        isOpen={!!agendandoClienteId}
        onClose={() => setAgendandoClienteId(null)}
        initialClienteId={agendandoClienteId || undefined}
      />

      {/* Confirmação de Desativação / Ativação (Requisitos 8 e 29) */}
      <Dialog
        isOpen={!!clienteToToggleStatus}
        onClose={() => setClienteToToggleStatus(null)}
        onConfirm={handleToggleStatusConfirm}
        title={
          clienteToToggleStatus?.ativo !== false
            ? "Desativar este cliente?"
            : "Reativar este cliente?"
        }
        description={
          clienteToToggleStatus?.ativo !== false
            ? `Tem certeza que deseja desativar ${clienteToToggleStatus?.nome}? O histórico de atendimentos e veículos cadastrados será preservado integralmente.`
            : `Deseja reativar ${clienteToToggleStatus?.nome}? O cliente voltará a aparecer na listagem ativa.`
        }
        confirmText={
          clienteToToggleStatus?.ativo !== false ? "Desativar cliente" : "Reativar cliente"
        }
        variant={clienteToToggleStatus?.ativo !== false ? "danger" : "primary"}
      />
    </div>
  );
}
