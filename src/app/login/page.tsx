"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/layout/Logo";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Lock, Mail, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { success } = useToast();

  const [email, setEmail] = useState("admin@pointdococo.com.br");
  const [password, setPassword] = useState("••••••••");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      success("Login realizado com sucesso! Bem-vindo ao Point do Coco.");
      router.push("/");
    }, 600);
  };

  return (
    <div className="min-h-screen bg-canvas text-slate-100 flex flex-col justify-center items-center p-4">
      <div className="max-w-sm w-full space-y-6">
        {/* Topo com Logo Oficial */}
        <div className="flex flex-col items-center text-center space-y-3">
          <Logo size="lg" showText={false} />
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center justify-center gap-1.5">
              <span>Point do Coco</span>
              <span className="w-2 h-2 rounded-full bg-brand-yellow"></span>
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Sistema de Gestão & Lava Jato Litoral
            </p>
          </div>
        </div>

        {/* Card de Login */}
        <div className="p-6 rounded-2xl bg-surface border border-surface-border shadow-xl space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              required
            />

            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="accent-brand-green"
                />
                <span>Lembrar de mim</span>
              </label>
              <span className="hover:text-slate-300 cursor-pointer">
                Esqueceu a senha?
              </span>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full font-semibold"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Entrar no Sistema
            </Button>
          </form>

          <div className="pt-2 text-center border-t border-surface-border/50">
            <Link
              href="/agendar"
              className="text-xs text-brand-yellow hover:underline"
            >
              Ir para agendamento público de clientes →
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-muted">
          Point do Coco • Todos os direitos reservados
        </div>
      </div>
    </div>
  );
}
