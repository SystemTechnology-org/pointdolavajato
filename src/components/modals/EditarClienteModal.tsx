"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { Cliente } from "@/types";
import { AlertCircle } from "lucide-react";

interface EditarClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: Cliente | null;
  onClienteAtualizado?: () => void;
}

export function EditarClienteModal({
  isOpen,
  onClose,
  cliente,
  onClienteAtualizado,
}: EditarClienteModalProps) {
  const { updateCliente, checkCustomerDuplicate } = useAppStore();
  const { success, error } = useToast();

  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  useEffect(() => {
    if (cliente) {
      setNome(cliente.nome);
      setWhatsapp(cliente.whatsapp);
      setEmail(cliente.email || "");
      setObservacoes(cliente.observacoes || "");
      setAtivo(cliente.ativo !== false);
      setDuplicateWarning(null);
    }
  }, [cliente, isOpen]);

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

    if (raw.length >= 10 && cliente) {
      const dup = checkCustomerDuplicate(raw, cliente.id);
      if (dup.exists && dup.customer) {
        setDuplicateWarning(`Este WhatsApp já está cadastrado para: ${dup.customer.nome}`);
      } else {
        setDuplicateWarning(null);
      }
    } else {
      setDuplicateWarning(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente) return;

    if (!nome.trim() || !whatsapp.trim()) {
      error("Nome e WhatsApp são obrigatórios.");
      return;
    }

    const dupCheck = checkCustomerDuplicate(whatsapp, cliente.id);
    if (dupCheck.exists && dupCheck.customer) {
      error(`Já existe outro cliente cadastrado com este WhatsApp: ${dupCheck.customer.nome}`);
      return;
    }

    try {
      updateCliente(cliente.id, {
        nome: nome.trim(),
        whatsapp: whatsapp.trim(),
        email: email.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
        ativo,
      });

      success("Cliente atualizado com sucesso.");
      if (onClienteAtualizado) {
        onClienteAtualizado();
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao atualizar cliente";
      error(msg);
    }
  };

  if (!cliente) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Cliente"
      description="Atualize as informações cadastrais e o status do cliente."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {duplicateWarning && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs text-amber-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{duplicateWarning}</span>
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
            placeholder="Ex: Prefere lavagem de manhã"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
        </div>

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
