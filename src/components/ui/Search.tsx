import React from "react";
import { Search as SearchIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export function Search({
  value,
  onChange,
  placeholder = "Pesquisar...",
  className,
}: SearchProps) {
  return (
    <div className={cn("relative flex items-center w-full max-w-sm", className)}>
      <SearchIcon className="absolute left-3 w-4 h-4 text-muted pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 pl-9 pr-8 rounded-lg bg-surface border border-surface-border text-slate-100 placeholder:text-muted text-xs transition-all focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/30"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2.5 text-muted hover:text-slate-200 transition-colors p-0.5"
          aria-label="Limpar pesquisa"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
