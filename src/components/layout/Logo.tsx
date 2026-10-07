import React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  href?: string;
  className?: string;
  subtitle?: string;
}

export function Logo({
  size = "md",
  showText = true,
  href = "/",
  className,
  subtitle = "Gestão do lava-jato",
}: LogoProps) {
  const sizeMap = {
    sm: { imgWidth: 36, imgHeight: 29, textClass: "text-sm", subClass: "text-[10px]" },
    md: { imgWidth: 46, imgHeight: 37, textClass: "text-base font-semibold", subClass: "text-xs" },
    lg: { imgWidth: 68, imgHeight: 54, textClass: "text-lg font-bold", subClass: "text-xs" },
    xl: { imgWidth: 92, imgHeight: 73, textClass: "text-xl font-bold", subClass: "text-sm" },
  };

  const currentSize = sizeMap[size];

  const content = (
    <div className={cn("inline-flex items-center gap-3 select-none", className)}>
      <div className="relative shrink-0 flex items-center justify-center">
        <Image
          src="/images/logo.png"
          alt="Point do Coco Lava Jato Litoral"
          width={currentSize.imgWidth}
          height={currentSize.imgHeight}
          priority
          className="object-contain"
        />
      </div>

      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={cn("tracking-tight text-white font-bold flex items-center gap-1.5", currentSize.textClass)}>
            <span>Point do Coco</span>
            <span className="w-1.5 h-1.5 rounded-full bg-brand-yellow inline-block"></span>
          </span>
          {subtitle && (
            <span className={cn("text-muted-foreground font-normal tracking-normal", currentSize.subClass)}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
