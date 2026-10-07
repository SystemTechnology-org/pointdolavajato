"use client";

import React from "react";
import { Menu, Plus } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

interface NavbarProps {
  onOpenMobileMenu?: () => void;
  onOpenNewAgendamento?: () => void;
  title?: string;
}

export function Navbar({
  onOpenMobileMenu,
  onOpenNewAgendamento,
  title,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 w-full h-14 bg-surface/90 backdrop-blur-md border-b border-surface-border flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-surface-hover transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile Logo */}
        <div className="lg:hidden flex items-center">
          <Logo size="sm" showText={false} />
          <span className="ml-2 font-bold text-sm text-white">Point do Coco</span>
        </div>

        {/* Desktop Title */}
        {title && (
          <div className="hidden lg:flex items-center gap-2">
            <h1 className="text-sm font-semibold text-white tracking-tight">
              {title}
            </h1>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        <Link href="/agendar" target="_blank" className="hidden sm:inline-flex">
          <Button variant="ghost" size="sm" className="text-xs text-brand-yellow hover:text-brand-yellow-text">
            Página de Agendamento
          </Button>
        </Link>

        {onOpenNewAgendamento && (
          <Button
            size="sm"
            variant="primary"
            onClick={onOpenNewAgendamento}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            <span className="hidden sm:inline">Novo Agendamento</span>
            <span className="sm:hidden">Agendar</span>
          </Button>
        )}
      </div>
    </header>
  );
}
