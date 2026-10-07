"use client";

import React, { useState } from "react";
import { Phone, AlertCircle } from "lucide-react";
import {
  formatWhatsAppNumber,
  generateWhatsAppLink,
  whatsappTemplates,
  WhatsAppTemplateVariables,
  RAW_TEMPLATES,
} from "@/lib/services/whatsapp";
import { CommunicationType } from "@/types/database";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";

export interface WhatsAppButtonProps {
  phone?: string | null;
  message?: string;
  templateType?: keyof typeof RAW_TEMPLATES;
  templateVars?: WhatsAppTemplateVariables;
  label?: string;
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "green" | "outline" | "ghost" | "secondary";
  showIcon?: boolean;
  customerId?: string;
  appointmentId?: string;
  fullWidth?: boolean;
  className?: string;
  onBeforeOpen?: () => void;
  onAfterOpen?: () => void;
}

export function WhatsAppButton({
  phone,
  message,
  templateType,
  templateVars = {},
  label,
  size = "sm",
  variant = "green",
  showIcon = true,
  customerId,
  appointmentId,
  fullWidth = false,
  className = "",
  onBeforeOpen,
  onAfterOpen,
}: WhatsAppButtonProps) {
  const { logCommunication, businessSettings } = useAppStore();
  const { info, error } = useToast();
  const [isOpening, setIsOpening] = useState(false);

  const formattedPhone = formatWhatsAppNumber(phone);
  const isAvailable = Boolean(formattedPhone);

  // Computa a mensagem pronta caso tenha templateType
  const resolvedMessage = React.useMemo(() => {
    if (message) return message;
    if (templateType && whatsappTemplates[templateType]) {
      const varsWithCompany = {
        empresa: businessSettings?.business_name || "Point do Coco Lava Jato",
        ...templateVars,
      };
      return whatsappTemplates[templateType](varsWithCompany);
    }
    return "";
  }, [message, templateType, templateVars, businessSettings?.business_name]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isAvailable) {
      error("WhatsApp não disponível ou número inválido.");
      return;
    }

    if (onBeforeOpen) {
      onBeforeOpen();
    }

    setIsOpening(true);

    try {
      const link = generateWhatsAppLink(phone, resolvedMessage);
      if (!link) {
        error("Não foi possível preparar o link do WhatsApp.");
        return;
      }

      // 1. Abrir o WhatsApp em nova aba (Requisito 2 e 35)
      window.open(link, "_blank", "noopener,noreferrer");

      // 2. Registrar no histórico de comunicação com status "opened" (Requisito 20 e 21)
      const commType: CommunicationType =
        (templateType as CommunicationType) || (appointmentId ? "general" : "general");

      const preview = resolvedMessage
        ? resolvedMessage.slice(0, 160)
        : `Contato iniciado com o cliente via WhatsApp`;

      logCommunication({
        customer_id: customerId || null,
        appointment_id: appointmentId || null,
        channel: "whatsapp",
        type: commType,
        message_preview: preview,
        status: "opened", // IMPORTANTE: "opened", NUNCA "sent"
      });

      // 3. Feedback transparente ao usuário (Requisito 21 e 35)
      info("WhatsApp aberto! Revise a mensagem no aplicativo e clique em enviar.");

      if (onAfterOpen) {
        onAfterOpen();
      }
    } catch (err) {
      console.error("Erro ao abrir WhatsApp:", err);
      error("Não foi possível preparar a mensagem.");
    } finally {
      setIsOpening(false);
    }
  };

  // Estilização por tamanho
  const sizeClasses = {
    xs: "px-2 py-1 text-[10px] gap-1 rounded",
    sm: "px-2.5 py-1.5 text-xs gap-1.5 rounded-lg",
    md: "px-3.5 py-2 text-xs font-semibold gap-2 rounded-lg",
    lg: "px-4 py-2.5 text-sm font-semibold gap-2.5 rounded-xl",
  }[size];

  // Estilização por variante
  const variantClasses = {
    green:
      "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-900/30 border border-emerald-500/40",
    outline:
      "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    ghost:
      "bg-transparent hover:bg-emerald-500/10 text-emerald-400",
    secondary:
      "bg-surface-elevated hover:bg-surface-hover text-slate-200 border border-surface-border hover:border-emerald-500/40",
  }[variant];

  // Botão desabilitado para cliente sem WhatsApp (Requisito 10)
  if (!isAvailable) {
    return (
      <button
        type="button"
        disabled
        title="Cliente sem WhatsApp cadastrado ou telefone inválido"
        className={`inline-flex items-center justify-center font-medium opacity-50 cursor-not-allowed bg-surface-elevated/50 text-slate-500 border border-surface-border ${sizeClasses} ${
          fullWidth ? "w-full" : ""
        } ${className}`}
      >
        <AlertCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span>{label || "WhatsApp não disponível"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isOpening}
      className={`inline-flex items-center justify-center font-medium transition-all active:scale-98 ${sizeClasses} ${variantClasses} ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      title={label || "Abrir WhatsApp com mensagem preparada"}
    >
      {showIcon && (
        <Phone className="w-3.5 h-3.5 shrink-0 fill-current opacity-90" />
      )}
      <span>{label || "WhatsApp"}</span>
    </button>
  );
}
