"use client";

import React, { useRef } from "react";
import { Printer } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store";
import { Agendamento } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface ComprovanteEntregaModalProps {
  isOpen: boolean;
  onClose: () => void;
  agendamento: Agendamento;
}

export function ComprovanteEntregaModal({
  isOpen,
  onClose,
  agendamento,
}: ComprovanteEntregaModalProps) {
  const { businessSettings, getAppointmentPaymentSummary } = useAppStore();
  const printRef = useRef<HTMLDivElement>(null);

  const paySummary = getAppointmentPaymentSummary(agendamento.id);

  const handlePrint = () => {
    window.print();
  };

  const dataEntregaFormatada = agendamento.delivered_at
    ? new Date(agendamento.delivered_at).toLocaleString("pt-BR")
    : new Date().toLocaleString("pt-BR");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Comprovante de Entrega do Veículo"
      size="md"
    >
      <div className="space-y-5">
        {/* ÁREA IMPRIMÍVEL (Folha de entrega) */}
        <div
          ref={printRef}
          id="comprovante-print-area"
          className="p-6 rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-sm print:p-0 print:border-none print:shadow-none space-y-4"
        >
          {/* Cabeçalho da Empresa */}
          <div className="text-center border-b border-slate-300 pb-3">
            <h2 className="text-base font-black tracking-wider uppercase text-slate-900">
              {businessSettings.commercial_name || businessSettings.business_name || "Point do Coco Lava Jato"}
            </h2>
            <p className="text-[11px] text-slate-600 font-medium mt-0.5">
              {businessSettings.address
                ? `${businessSettings.address}, ${businessSettings.address_number || "S/N"} - ${businessSettings.neighborhood || ""}, ${businessSettings.city || "Salvador"}`
                : "Avenida Principal - Point do Coco"}
            </p>
            <p className="text-[11px] text-slate-600">
              WhatsApp: {businessSettings.whatsapp || "(71) 99999-9999"}
            </p>
            <div className="inline-block mt-2 px-3 py-1 rounded bg-slate-100 text-slate-900 font-bold text-xs uppercase tracking-wide border border-slate-300">
              Comprovante de Retirada & Entrega
            </div>
          </div>

          {/* Dados do Atendimento */}
          <div className="grid grid-cols-2 gap-2 text-xs border-b border-slate-300 pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Ordem / Atendimento</span>
              <span className="font-mono font-bold text-slate-900">
                #{agendamento.code || agendamento.id.slice(-6).toUpperCase()}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Data/Hora da Entrega</span>
              <span className="font-semibold text-slate-900">{dataEntregaFormatada}</span>
            </div>
          </div>

          {/* Dados do Cliente e Veículo */}
          <div className="space-y-2 text-xs border-b border-slate-300 pb-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Cliente:</span>
              <span className="font-bold text-slate-900">{agendamento.cliente_nome}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Contato:</span>
              <span className="font-mono text-slate-800">{agendamento.cliente_whatsapp}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Veículo / Modelo:</span>
              <span className="font-bold text-slate-900">{agendamento.veiculo_modelo}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Placa:</span>
              <span className="font-mono font-bold text-slate-900">
                {agendamento.veiculo_placa && agendamento.veiculo_placa !== "---" ? agendamento.veiculo_placa : "Sem placa"}
              </span>
            </div>
          </div>

          {/* Serviço e Financeiro */}
          <div className="space-y-2 text-xs border-b border-slate-300 pb-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Serviço Realizado:</span>
              <span className="font-bold text-slate-900">{agendamento.servico_nome}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Valor Total:</span>
              <span className="font-bold text-slate-900">{formatCurrency(agendamento.valor)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Total Pago:</span>
              <span className="font-bold text-emerald-700">{formatCurrency(paySummary.totalPaid)}</span>
            </div>
            <div className="flex items-center justify-between font-bold">
              <span className="text-slate-800">Saldo Pendente:</span>
              <span className={paySummary.remainingBalance > 0.01 ? "text-rose-600" : "text-emerald-700"}>
                {formatCurrency(paySummary.remainingBalance)}
              </span>
            </div>
          </div>

          {/* Termo e Assinaturas */}
          <div className="pt-2 text-[11px] text-slate-600 space-y-4">
            <p className="leading-snug text-center italic">
              Declaro que conferi o veículo e os pertences deixados em seu interior, recebendo-o em perfeitas condições conforme o serviço executado.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-6 text-center">
              <div>
                <div className="border-t border-slate-400 w-4/5 mx-auto mb-1"></div>
                <span className="text-[10px] text-slate-700 font-semibold block">{agendamento.cliente_nome}</span>
                <span className="text-[9px] text-slate-500 block">Cliente</span>
              </div>
              <div>
                <div className="border-t border-slate-400 w-4/5 mx-auto mb-1"></div>
                <span className="text-[10px] text-slate-700 font-semibold block">
                  {agendamento.delivered_by_name || "Responsável do Lava-Jato"}
                </span>
                <span className="text-[9px] text-slate-500 block">Point do Coco Lava Jato</span>
              </div>
            </div>
          </div>
        </div>

        {/* Estilo CSS Exclusivo para Impressão */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #comprovante-print-area, #comprovante-print-area * {
              visibility: visible;
            }
            #comprovante-print-area {
              position: fixed;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 20px;
              background: white !important;
              color: black !important;
            }
          }
        `}</style>

        {/* Ações */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-surface-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            Fechar
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4" />}
            className="bg-brand-green hover:bg-emerald-600 text-black font-bold"
          >
            Imprimir Comprovante
          </Button>
        </div>
      </div>
    </Modal>
  );
}
