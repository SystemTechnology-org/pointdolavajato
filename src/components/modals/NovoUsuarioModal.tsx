"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { UserRole, ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/types";
import { UserCheck, Mail, Phone, Shield } from "lucide-react";

interface NovoUsuarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUsuarioCriado?: () => void;
}

export function NovoUsuarioModal({ isOpen, onClose, onUsuarioCriado }: NovoUsuarioModalProps) {
  const { addUserProfile } = useAppStore();
  const { success, error: toastError } = useToast();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [role, setRole] = useState<UserRole>("employee");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim() || nome.trim().length < 3) {
      toastError("Informe o nome completo do membro da equipe.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      toastError("Informe um endereço de e-mail válido.");
      return;
    }

    setIsSubmitting(true);
    try {
      await addUserProfile({
        full_name: nome.trim(),
        email: email.trim().toLowerCase(),
        phone: telefone.trim() || undefined,
        role,
      });

      success(`Usuário ${nome.trim()} cadastrado com sucesso como ${ROLE_LABELS[role]}!`);
      setNome("");
      setEmail("");
      setTelefone("");
      setRole("employee");
      onClose();
      if (onUsuarioCriado) onUsuarioCriado();
    } catch (err: unknown) {
      console.error(err);
      toastError("Não foi possível cadastrar o usuário.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Novo Membro da Equipe"
      description="Cadastre um novo usuário administrativo ou operacional no sistema."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nome Completo *"
          placeholder="Ex: Pedro Henrique"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />

        <Input
          label="E-mail de Acesso *"
          type="email"
          placeholder="Ex: pedro@pointdococo.com.br"
          leftIcon={<Mail className="w-4 h-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          label="WhatsApp / Telefone"
          placeholder="Ex: (71) 9 9999-8888"
          leftIcon={<Phone className="w-4 h-4" />}
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-brand-yellow" />
            <span>Função no Sistema *</span>
          </label>
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            options={[
              { value: "employee", label: "Funcionário (Operação & Atendimento)" },
              { value: "manager", label: "Gerente (Operação Ampla & Clientes)" },
              { value: "admin", label: "Administrador (Acesso Total)" },
            ]}
          />
          <p className="text-[11px] text-muted-foreground pt-1">
            {ROLE_DESCRIPTIONS[role]}
          </p>
        </div>

        <div className="pt-4 flex items-center justify-end gap-2 border-t border-surface-border/60">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            leftIcon={<UserCheck className="w-4 h-4" />}
          >
            Cadastrar Usuário
          </Button>
        </div>
      </form>
    </Modal>
  );
}
