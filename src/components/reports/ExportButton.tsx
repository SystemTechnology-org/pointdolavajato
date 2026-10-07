"use client";

import React, { useState } from "react";
import { Download, Printer, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExportButtonProps {
  onExportCsv: () => void;
  onPrint?: () => void;
  label?: string;
  className?: string;
  showPrint?: boolean;
}

export function ExportButton({
  onExportCsv,
  onPrint,
  label = "Exportar CSV",
  className,
  showPrint = true,
}: ExportButtonProps) {
  const [downloaded, setDownloaded] = useState(false);

  const handleCsv = () => {
    onExportCsv();
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        type="button"
        onClick={handleCsv}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
          downloaded
            ? "bg-brand-green/20 text-brand-green-text border-brand-green/40"
            : "bg-surface-elevated hover:bg-surface-hover text-slate-200 hover:text-white border-surface-border hover:border-slate-700"
        )}
        title="Baixar planilha CSV com os dados filtrados"
      >
        {downloaded ? (
          <Check className="w-3.5 h-3.5 text-brand-green" />
        ) : (
          <Download className="w-3.5 h-3.5 text-brand-green" />
        )}
        <span>{downloaded ? "Baixado!" : label}</span>
      </button>

      {showPrint && (
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-elevated hover:bg-surface-hover text-slate-300 hover:text-white border border-surface-border transition-all"
          title="Imprimir relatório"
        >
          <Printer className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline">Imprimir</span>
        </button>
      )}
    </div>
  );
}
