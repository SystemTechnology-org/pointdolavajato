"use client";

import React, { useState } from "react";
import { MessageSquare, ExternalLink, CheckCircle2, Save, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { generateWhatsAppLink } from "@/lib/services/whatsapp";

interface ConfiguracoesComunicacaoProps {
  onDirtyChange?: (isDirty: boolean) => void;
}

export function ConfiguracoesComunicacao({ onDirtyChange }: ConfiguracoesComunicacaoProps) {
  const { businessSettings, updateBusinessSettings, isCurrentUserAdmin } = useAppStore();
  const { success, error: toastError } = useToast();

  const [whatsappEnabled, setWhatsappEnabled] = useState(businessSettings.whatsapp_enabled ?? true);
  const [whatsappNumber, setWhatsappNumber] = useState(businessSettings.whatsapp || "(71) 9 9288-7645");
  const [isSaving, setIsSaving] = useState(false);

  const markDirty = () => {
    if (onDirtyChange) onDirtyChange(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCurrentUserAdmin) {
      toastError("Apenas administradores podem alterar as configurações de comunicação.");
      return;
    }

    setIsSaving(true);
    try {
      await updateBusinessSettings({
        whatsapp_enabled: whatsappEnabled,
        whatsapp: whatsappNumber.trim(),
      });

      if (onDirtyChange) onDirtyChange(false);
      success("Configurações de comunicação salvas com sucesso!");
    } catch (err: unknown) {
      console.error(err);
      toastError("Não foi possível salvar as configurações.");
    } finally {
      setIsSaving(false);
    }
  };

  const templatesList = [
    { key: "generalContact", label: "Contato Geral", desc: "Abertura de conversa padrão com o cliente." },
    { key: "appointmentConfirmation", label: "Confirmação de Agendamento", desc: "Data, horário, veículo e serviço contratado." },
    { key: "appointmentReminder", label: "Lembrete de Horário", desc: "Lembrete cortês antes do atendimento." },
    { key: "queueWaiting", label: "Veículo na Fila", desc: "Aviso de recepção e veículo aguardando box." },
    { key: "appointmentInProgress", label: "Em Atendimento", desc: "Aviso de início de lavagem no veículo." },
    { key: "appointmentCompleted", label: "Veículo Pronto", desc: "Aviso de finalização e convite para retirada com valor." },
    { key: "paymentPending", label: "Cobrança / Saldo Pendente", desc: "Detalhamento de total, valor pago e saldo em aberto." },
  ];

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Bloco 1: WhatsApp Principal */}
      <div className="p-5 rounded-xl bg-surface border border-surface-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-surface-border/50">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-brand-green" />
              <span>Canais de WhatsApp do Lava Jato</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configuração do número oficial para contato direto e disparo de links pré-formatados.
            </p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-brand-green/20 text-brand-green font-semibold w-fit">
            wa.me Integrado
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <Input
            label="Número Oficial do WhatsApp *"
            value={whatsappNumber}
            onChange={(e) => {
              setWhatsappNumber(e.target.value);
              markDirty();
            }}
            disabled={!isCurrentUserAdmin}
            helperText="Número que clientes verão nas mensagens e página pública."
          />

          <div className="p-3 rounded-lg bg-surface-elevated/40 border border-surface-border flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-white block">
                Habilitar Botões de WhatsApp
              </span>
              <span className="text-[11px] text-muted-foreground">
                Exibir atalhos nos clientes, agendamentos e atendimentos.
              </span>
            </div>
            <input
              type="checkbox"
              checked={whatsappEnabled}
              onChange={(e) => {
                setWhatsappEnabled(e.target.checked);
                markDirty();
              }}
              disabled={!isCurrentUserAdmin}
              className="accent-brand-green w-4 h-4 cursor-pointer"
            />
          </div>
        </div>

        {whatsappNumber && (
          <div className="pt-1 flex items-center gap-2">
            <a
              href={generateWhatsAppLink(whatsappNumber, "Olá! Teste de comunicação do Point do Coco.") || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-green hover:underline inline-flex items-center gap-1 font-semibold"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Testar link do WhatsApp oficial</span>
            </a>
          </div>
        )}
      </div>

      {/* Bloco 2: Automações Futuras (Requisito 24) */}
      <div className="p-5 rounded-xl bg-surface border border-surface-border space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-brand-yellow" />
            <span>Automações de Mensagens (Preparado para API)</span>
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded bg-surface-border text-slate-400 font-semibold">
            Etapas Futuras
          </span>
        </div>

        <p className="text-xs text-muted-foreground">
          Nesta etapa todas as mensagens são abertas manualmente pelo atendente via link wa.me para garantir revisão humana. A infraestrutura de banco já possui os campos necessários para habilitar disparos automáticos via WhatsApp Business API quando configurada.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded-lg bg-surface-elevated/20 border border-surface-border flex items-center justify-between opacity-75">
            <div>
              <span className="text-xs font-semibold text-white block">Confirmação Automática</span>
              <span className="text-[11px] text-muted-foreground">Disparo imediato após agendamento</span>
            </div>
            <span className="text-[11px] text-slate-400 bg-surface px-2 py-0.5 rounded">Manual</span>
          </div>

          <div className="p-3 rounded-lg bg-surface-elevated/20 border border-surface-border flex items-center justify-between opacity-75">
            <div>
              <span className="text-xs font-semibold text-white block">Lembrete Automático</span>
              <span className="text-[11px] text-muted-foreground">Disparo horas antes do agendamento</span>
            </div>
            <span className="text-[11px] text-slate-400 bg-surface px-2 py-0.5 rounded">Manual</span>
          </div>

          <div className="p-3 rounded-lg bg-surface-elevated/20 border border-surface-border flex items-center justify-between opacity-75">
            <div>
              <span className="text-xs font-semibold text-white block">Aviso de Veículo Pronto</span>
              <span className="text-[11px] text-muted-foreground">Disparo ao finalizar lavagem</span>
            </div>
            <span className="text-[11px] text-slate-400 bg-surface px-2 py-0.5 rounded">Manual</span>
          </div>

          <div className="p-3 rounded-lg bg-surface-elevated/20 border border-surface-border flex items-center justify-between opacity-75">
            <div>
              <span className="text-xs font-semibold text-white block">Lembrete de Cobrança</span>
              <span className="text-[11px] text-muted-foreground">Disparo em caso de saldo pendente</span>
            </div>
            <span className="text-[11px] text-slate-400 bg-surface px-2 py-0.5 rounded">Manual</span>
          </div>
        </div>
      </div>

      {/* Bloco 3: Templates Disponíveis */}
      <div className="p-5 rounded-xl bg-surface border border-surface-border space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-brand-blue" />
          <span>Modelos de Mensagens do Sistema (7 Templates)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {templatesList.map((tpl) => (
            <div
              key={tpl.key}
              className="p-3 rounded-lg bg-surface-elevated/40 border border-surface-border text-xs space-y-1"
            >
              <span className="font-bold text-white block">{tpl.label}</span>
              <p className="text-[11px] text-muted-foreground">{tpl.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {isCurrentUserAdmin && (
        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            variant="primary"
            isLoading={isSaving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            {isSaving ? "Salvando..." : "Salvar Comunicação"}
          </Button>
        </div>
      )}
    </form>
  );
}
