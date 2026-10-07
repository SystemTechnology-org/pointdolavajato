"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, Sparkles, Users, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavigationProps {
  onOpenMenu: () => void;
}

export function MobileNavigation({ onOpenMenu }: MobileNavigationProps) {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Agenda", href: "/agenda", icon: Calendar },
    { label: "Atendimento", href: "/atendimentos", icon: Sparkles },
    { label: "Clientes", href: "/clientes", icon: Users },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur-md border-t border-surface-border px-2 py-1.5 flex items-center justify-around safe-bottom">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors",
              isActive
                ? "text-brand-green font-semibold"
                : "text-muted-foreground hover:text-slate-200"
            )}
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span>{item.label}</span>
          </Link>
        );
      })}

      <button
        type="button"
        onClick={onOpenMenu}
        className="flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-medium text-muted-foreground hover:text-slate-200 transition-colors"
      >
        <Menu className="w-5 h-5 mb-0.5" />
        <span>Mais</span>
      </button>
    </nav>
  );
}
