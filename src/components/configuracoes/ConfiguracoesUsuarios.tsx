"use client";

import React, { useState } from "react";
import { Users, UserPlus, Shield, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { NovoUsuarioModal } from "@/components/modals/NovoUsuarioModal";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { UserRole, ROLE_LABELS, Profile } from "@/types";
import { isLastActiveAdmin } from "@/lib/services/permissions";

export function ConfiguracoesUsuarios() {
  const {
    profiles,
    currentRole,
    setCurrentRole,
    updateUserRole,
    toggleUserActive,
    isCurrentUserAdmin,
  } = useAppStore();
  const { success, error: toastError } = useToast();

  const [isNovoUsuarioOpen, setIsNovoUsuarioOpen] = useState(false);
  const [userToToggle, setUserToToggle] = useState<Profile | null>(null);
  const [roleChangeModal, setRoleChangeModal] = useState<{ user: Profile; newRole: UserRole } | null>(null);

  const handleToggleActiveConfirm = async () => {
    if (!userToToggle) return;
    try {
      await toggleUserActive(userToToggle.id);
      success(
        userToToggle.active
          ? `Usuário ${userToToggle.full_name} desativado com sucesso.`
          : `Usuário ${userToToggle.full_name} reativado com sucesso.`
      );
      setUserToToggle(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao alterar status do usuário.";
      toastError(message);
    }
  };

  const handleRoleChangeConfirm = async () => {
    if (!roleChangeModal) return;
    try {
      await updateUserRole(roleChangeModal.user.id, roleChangeModal.newRole);
      success(
        `Função de ${roleChangeModal.user.full_name} alterada para ${ROLE_LABELS[roleChangeModal.newRole]} com sucesso!`
      );
      setRoleChangeModal(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao alterar função do usuário.";
      toastError(message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Bloco de Simulação de Papel / Testes */}
      <div className="p-4 rounded-xl bg-surface-elevated/40 border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-brand-yellow" />
            <span className="text-xs font-bold text-white">Simulador de Nível de Acesso Ativo</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Alterne o papel da sua sessão atual para testar visualmente permissões e bloqueios de tela.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-surface border border-surface-border rounded-lg">
          {(["admin", "manager", "employee"] as UserRole[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setCurrentRole(r)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                currentRole === r
                  ? "bg-brand-green text-black shadow font-bold"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Usuários */}
      <div className="p-5 rounded-xl bg-surface border border-surface-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-border/50">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-green" />
              <span>Membros da Equipe e Funções</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gerencie quem tem acesso ao painel do lava-jato, papéis atribuídos e status de login.
            </p>
          </div>

          {isCurrentUserAdmin && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsNovoUsuarioOpen(true)}
              leftIcon={<UserPlus className="w-4 h-4" />}
            >
              Novo Usuário
            </Button>
          )}
        </div>

        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-border text-[11px] font-semibold text-muted uppercase tracking-wider">
                <th className="py-2.5 px-3">Nome / Usuário</th>
                <th className="py-2.5 px-3">E-mail</th>
                <th className="py-2.5 px-3">Função (Role)</th>
                <th className="py-2.5 px-3">Status</th>
                {isCurrentUserAdmin && <th className="py-2.5 px-3 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/40 text-xs">
              {profiles.map((profile) => {
                const isOnlyAdmin = isLastActiveAdmin(profiles, profile.id);

                return (
                  <tr
                    key={profile.id}
                    className={`hover:bg-surface-elevated/20 transition-colors ${
                      !profile.active ? "opacity-60 bg-red-950/10" : ""
                    }`}
                  >
                    {/* Nome */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-surface-elevated border border-surface-border flex items-center justify-center font-bold text-xs text-white shrink-0">
                          {profile.full_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-white block">
                            {profile.full_name}
                          </span>
                          {profile.phone && (
                            <span className="text-[11px] text-muted-foreground">
                              {profile.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3 px-3 text-slate-300 font-mono text-[11px]">
                      {profile.email}
                    </td>

                    {/* Role */}
                    <td className="py-3 px-3">
                      {isCurrentUserAdmin ? (
                        <select
                          value={profile.role}
                          onChange={(e) => {
                            const newRole = e.target.value as UserRole;
                            if (newRole !== profile.role) {
                              setRoleChangeModal({ user: profile, newRole });
                            }
                          }}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-semibold bg-surface cursor-pointer focus:outline-none ${
                            profile.role === "admin" || profile.role === "owner"
                              ? "border-brand-green/40 text-brand-green-text"
                              : profile.role === "manager"
                              ? "border-brand-yellow/40 text-brand-yellow-text"
                              : "border-slate-600 text-slate-300"
                          }`}
                        >
                          <option value="admin">Administrador</option>
                          <option value="manager">Gerente</option>
                          <option value="employee">Funcionário</option>
                        </select>
                      ) : (
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            profile.role === "admin" || profile.role === "owner"
                              ? "bg-brand-green/15 text-brand-green-text border border-brand-green/30"
                              : profile.role === "manager"
                              ? "bg-brand-yellow/15 text-brand-yellow-text border border-brand-yellow/30"
                              : "bg-surface-border text-slate-300"
                          }`}
                        >
                          {ROLE_LABELS[profile.role]}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          profile.active
                            ? "bg-brand-green/15 text-brand-green-text"
                            : "bg-red-500/15 text-red-400"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            profile.active ? "bg-brand-green" : "bg-red-400"
                          }`}
                        />
                        {profile.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>

                    {/* Ações */}
                    {isCurrentUserAdmin && (
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setUserToToggle(profile)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                            profile.active
                              ? "text-red-400 border-red-500/30 hover:bg-red-500/10"
                              : "text-brand-green border-brand-green/30 hover:bg-brand-green/10"
                          }`}
                          title={
                            isOnlyAdmin
                              ? "Não é possível desativar o único administrador ativo"
                              : profile.active
                              ? "Desativar usuário"
                              : "Reativar usuário"
                          }
                        >
                          {profile.active ? "Desativar" : "Reativar"}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Regra de Proteção do Último Administrador */}
      <div className="p-3.5 rounded-xl bg-brand-yellow/10 border border-brand-yellow/20 flex items-start gap-2.5 text-xs text-brand-yellow-text">
        <Shield className="w-4 h-4 shrink-0 text-brand-yellow mt-0.5" />
        <span>
          <strong>Proteção do Último Administrador:</strong> O sistema impede a desativação ou alteração de função caso reste apenas um administrador ativo no lava-jato, garantindo que o acesso administrativo nunca seja perdido.
        </span>
      </div>

      {/* Modal de Criação */}
      <NovoUsuarioModal
        isOpen={isNovoUsuarioOpen}
        onClose={() => setIsNovoUsuarioOpen(false)}
      />

      {/* Diálogo de Confirmação de Desativação/Reativação */}
      <Dialog
        isOpen={!!userToToggle}
        onClose={() => setUserToToggle(null)}
        onConfirm={handleToggleActiveConfirm}
        title={
          userToToggle?.active
            ? `Desativar ${userToToggle?.full_name}?`
            : `Reativar ${userToToggle?.full_name}?`
        }
        description={
          userToToggle?.active
            ? "O usuário não poderá mais acessar o sistema. O histórico e registros passados criados por ele permanecerão salvos."
            : "O usuário voltará a ter acesso imediato às áreas permitidas pela sua função."
        }
        confirmText={userToToggle?.active ? "Desativar Usuário" : "Reativar Usuário"}
        variant={userToToggle?.active ? "danger" : "primary"}
      />

      {/* Diálogo de Confirmação de Alteração de Role */}
      <Dialog
        isOpen={!!roleChangeModal}
        onClose={() => setRoleChangeModal(null)}
        onConfirm={handleRoleChangeConfirm}
        title={`Alterar função de ${roleChangeModal?.user.full_name}?`}
        description={
          roleChangeModal
            ? `A função será alterada de "${ROLE_LABELS[roleChangeModal.user.role]}" para "${ROLE_LABELS[roleChangeModal.newRole]}". Essa ação será registrada na auditoria.`
            : ""
        }
        confirmText="Confirmar Alteração"
        variant="primary"
      />
    </div>
  );
}
