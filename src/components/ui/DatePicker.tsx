import React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  label?: string;
  value: string; // YYYY-MM-DD
  onChange: (val: string) => void;
  min?: string;
  max?: string;
  className?: string;
  error?: string;
}

export function DatePicker({
  label,
  value,
  onChange,
  min,
  max,
  className,
  error,
}: DatePickerProps) {
  return (
    <div className={cn("w-full flex flex-col gap-1.5 text-left", className)}>
      {label && (
        <label className="text-xs font-medium text-slate-300">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <div className="absolute left-3 text-muted-foreground pointer-events-none flex items-center">
          <CalendarIcon className="w-4 h-4 text-brand-green" />
        </div>
        <input
          type="date"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full h-10 pl-10 pr-3.5 rounded-lg bg-surface border border-surface-border text-slate-100 text-sm transition-all focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/30 [color-scheme:dark] cursor-pointer",
            error && "border-red-500",
            className
          )}
        />
      </div>
      {error && <span className="text-xs text-red-400 font-medium">{error}</span>}
    </div>
  );
}
