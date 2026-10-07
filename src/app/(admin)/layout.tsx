"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { MobileNavigation } from "@/components/layout/MobileNavigation";
import { NovoAgendamentoModal } from "@/components/modals/NovoAgendamentoModal";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNovoAgendamentoOpen, setIsNovoAgendamentoOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas flex flex-col lg:flex-row text-slate-100">
      {/* Sidebar for Desktop & Drawer for Mobile */}
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        {/* Top Navbar */}
        <Navbar
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenNewAgendamento={() => setIsNovoAgendamentoOpen(true)}
        />

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileNavigation onOpenMenu={() => setIsMobileMenuOpen(true)} />
      </div>

      {/* Global Quick Action Modal */}
      <NovoAgendamentoModal
        isOpen={isNovoAgendamentoOpen}
        onClose={() => setIsNovoAgendamentoOpen(false)}
      />
    </div>
  );
}
