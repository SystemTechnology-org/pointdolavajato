"use client";

import React, { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store";
import { CheckinFormWizard } from "@/components/checkin/CheckinFormWizard";
import { FichaCheckinModal } from "@/components/modals/FichaCheckinModal";

export default function CheckinPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";

  const { agendamentos, getCheckinByAppointmentId } = useAppStore();
  const [showFicha, setShowFicha] = React.useState(false);

  const agendamento = useMemo(() => {
    return agendamentos.find((a) => a.id === id);
  }, [agendamentos, id]);

  const existingCheckin = useMemo(() => {
    return id ? getCheckinByAppointmentId(id) : undefined;
  }, [getCheckinByAppointmentId, id]);

  if (!agendamento) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-surface border border-surface-border flex items-center justify-center mx-auto text-muted">
          <XCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">Atendimento não encontrado</h3>
        <p className="text-xs text-muted-foreground">
          O código ou ID informado não corresponde a nenhum agendamento ativo.
        </p>
        <Link href="/atendimentos">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Voltar para Atendimentos
          </Button>
        </Link>
      </div>
    );
  }

  if (agendamento.status === "Cancelado") {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
          <XCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">Atendimento Cancelado</h3>
        <p className="text-xs text-muted-foreground">
          Não é possível realizar o check-in ou vistoria de um agendamento cancelado.
        </p>
        <Link href="/atendimentos">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Voltar para Atendimentos
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barra de Navegação Superior */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-surface-border/60">
        <div className="flex items-center gap-3">
          <Link href="/atendimentos">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <ArrowLeft className="w-4 h-4 text-muted-foreground hover:text-white" />
            </Button>
          </Link>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Recepção & Check-in do Veículo</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-green/20 text-brand-green-text font-semibold">
                Etapa Operacional
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Vistoria de entrada para {agendamento.veiculo_modelo} ({agendamento.veiculo_placa})
            </p>
          </div>
        </div>

        {existingCheckin && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFicha(true)}
            leftIcon={<ShieldCheck className="w-4 h-4 text-brand-green" />}
          >
            Ver Ficha Concluída
          </Button>
        )}
      </div>

      {/* Se já possuir check-in concluído */}
      {existingCheckin ? (
        <div className="max-w-xl mx-auto p-6 rounded-2xl bg-surface border border-surface-border text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-brand-green/20 border border-brand-green/30 flex items-center justify-center mx-auto text-brand-green">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Check-in já realizado!</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            A vistoria de entrada deste veículo foi registrada por{" "}
            <strong className="text-slate-300">{existingCheckin.confirmed_by_name}</strong> em{" "}
            {new Date(existingCheckin.confirmed_at).toLocaleString("pt-BR")}.
          </p>

          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowFicha(true)}
              className="bg-brand-green hover:bg-emerald-600 text-black font-bold"
            >
              Visualizar Ficha de Entrada
            </Button>
            <Link href="/atendimentos">
              <Button variant="outline" size="sm">
                Ir para Pátio / Atendimentos
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <CheckinFormWizard
          agendamento={agendamento}
          onSuccess={() => {
            router.push(`/atendimentos/${id}`);
          }}
          onCancel={() => router.push("/atendimentos")}
        />
      )}

      {/* Modal Ficha de Check-in */}
      {existingCheckin && (
        <FichaCheckinModal
          isOpen={showFicha}
          onClose={() => setShowFicha(false)}
          checkin={existingCheckin}
          agendamento={agendamento}
        />
      )}
    </div>
  );
}
