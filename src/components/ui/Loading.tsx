import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LoadingProps {
  text?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Loading({
  text = "Carregando...",
  className,
  size = "md",
}: LoadingProps) {
  const sizeMap = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 gap-3 text-muted-foreground",
        className
      )}
    >
      <Loader2
        className={cn("animate-spin text-brand-green", sizeMap[size])}
      />
      {text && <span className="text-xs font-medium">{text}</span>}
    </div>
  );
}
