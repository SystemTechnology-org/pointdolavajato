import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "info" | "neutral" | "danger";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "default",
  size = "md",
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-surface-elevated text-slate-200 border-surface-border",
    success: "bg-brand-green/15 text-brand-green-text border-brand-green/30",
    warning: "bg-brand-yellow/15 text-brand-yellow-text border-brand-yellow/30",
    info: "bg-brand-blue/15 text-brand-blue-text border-brand-blue/30",
    neutral: "bg-slate-800 text-slate-300 border-slate-700",
    danger: "bg-red-500/15 text-red-300 border-red-500/30",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[11px]",
    md: "px-2.5 py-1 text-xs",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-full border transition-colors select-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
