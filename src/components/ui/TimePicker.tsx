import React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TimePickerProps {
  label?: string;
  value: string; // HH:mm
  onChange: (val: string) => void;
  className?: string;
  error?: string;
  slots?: string[];
}

export const DEFAULT_TIME_SLOTS = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
];

export function TimePicker({
  label,
  value,
  onChange,
  className,
  error,
  slots = DEFAULT_TIME_SLOTS,
}: TimePickerProps) {
  return (
    <div className={cn("w-full flex flex-col gap-1.5 text-left", className)}>
      {label && (
        <label className="text-xs font-medium text-slate-300">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <div className="absolute left-3 text-muted-foreground pointer-events-none flex items-center">
          <Clock className="w-4 h-4 text-brand-yellow" />
        </div>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full h-10 pl-10 pr-4 rounded-lg bg-surface border border-surface-border text-slate-100 text-sm transition-all focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/30 cursor-pointer appearance-none",
            error && "border-red-500",
            className
          )}
        >
          <option value="" disabled className="bg-surface text-muted-foreground">
            Selecione um horário
          </option>
          {slots.map((time) => (
            <option key={time} value={time} className="bg-surface text-slate-100">
              {time}
            </option>
          ))}
        </select>
      </div>
      {error && <span className="text-xs text-red-400 font-medium">{error}</span>}
    </div>
  );
}
