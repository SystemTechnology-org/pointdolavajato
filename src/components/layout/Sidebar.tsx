"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Sparkles,
  Users,
  Car,
  Wrench,
  DollarSign,
  Wallet,
  BarChart3,
  MessageSquare,
  Settings,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { ROLE_LABELS } from "@/types";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const MENU_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Agenda", href: "/agenda", icon: Calendar },
  { label: "Atendimentos", href: "/atendimentos", icon: Sparkles },
  { label: "Clientes", href: "/clientes", icon: Users },
  { label: "Veículos", href: "/veiculos", icon: Car },
  { label: "Serviços", href: "/servicos", icon: Wrench },
  { label: "Financeiro", href: "/financeiro", icon: DollarSign },
  { label: "Caixa Diário", href: "/caixa", icon: Wallet },
  { label: "Relatórios", href: "/relatorios", icon: BarChart3 },
  { label: "Comunicação", href: "/comunicacao", icon: MessageSquare },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
];


export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { currentRole } = useAppStore();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 w-64 bg-surface border-r border-surface-border flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Top: Logo */}
        <div className="p-5 border-b border-surface-border/60 flex items-center justify-between">
          <Logo size="md" subtitle="Gestão do lava-jato" />
        </div>

        {/* Navigation Items */}
        <div className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
            Menu Principal
          </div>
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all group",
                  isActive
                    ? "bg-brand-green/15 text-brand-green-text font-semibold border border-brand-green/25"
                    : "text-slate-300 hover:text-white hover:bg-surface-hover"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 transition-colors",
                    isActive
                      ? "text-brand-green"
                      : "text-muted group-hover:text-slate-200"
                  )}
                />
                <span className="flex-1">{item.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-green" />
                )}
              </Link>
            );
          })}

          <div className="pt-4 px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
            Público & Cliente
          </div>
          <Link
            href="/agendar"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-brand-yellow hover:text-white hover:bg-brand-yellow/10 border border-brand-yellow/20 transition-all group"
          >
            <span className="flex items-center gap-3">
              <ExternalLink className="w-4 h-4 text-brand-yellow" />
              <span>Página de Agendamento</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-yellow/20 text-brand-yellow-text">
              Público
            </span>
          </Link>
        </div>

        {/* Footer: User profile */}
        <div className="p-4 border-t border-surface-border/60 bg-surface-elevated/30">
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs ${
                currentRole === "admin" || currentRole === "owner"
                  ? "bg-brand-green/20 border-brand-green/30 text-brand-green-text"
                  : currentRole === "manager"
                  ? "bg-brand-yellow/20 border-brand-yellow/30 text-brand-yellow-text"
                  : "bg-surface-elevated border-surface-border text-slate-300"
              }`}
            >
              {currentRole === "admin" || currentRole === "owner" ? "AD" : currentRole === "manager" ? "GR" : "OP"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">
                {ROLE_LABELS[currentRole] || "Administrador"}
              </p>
              <div className="flex items-center gap-1 text-[11px] text-muted">
                <ShieldCheck className="w-3 h-3 text-brand-green" />
                <span>Point do Coco</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
