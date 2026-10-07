import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/services/customers";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const { token, phone, reason } = body;

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      // Retorna sucesso simulado para modo local
      return NextResponse.json({
        success: true,
        message: "Agendamento cancelado com sucesso.",
      });
    }

    // Buscar agendamento com dados do cliente e token
    const { data: appointment, error: fetchErr } = await supabase
      .from("appointments")
      .select("id, status, cancel_token, customer:customers(phone)")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !appointment) {
      return NextResponse.json({ error: "Agendamento não encontrado." }, { status: 404 });
    }

    // Validar segurança (Requisito 18: Não permitir que qualquer pessoa cancele apenas conhecendo um ID)
    const tokenMatches = token && appointment.cancel_token && appointment.cancel_token === token;
    const custPhone = (appointment.customer as unknown as { phone?: string })?.phone || "";
    const phoneMatches = phone && custPhone && normalizePhone(custPhone) === normalizePhone(phone);

    if (!tokenMatches && !phoneMatches) {
      return NextResponse.json(
        { error: "Acesso negado: forneça o link seguro com token ou confirme o WhatsApp cadastrado." },
        { status: 403 }
      );
    }

    // Validar se status permite cancelamento
    if (["completed", "in_progress"].includes(appointment.status)) {
      return NextResponse.json(
        { error: "Não é possível cancelar um atendimento que já está em andamento ou finalizado." },
        { status: 400 }
      );
    }

    // Buscar configurações de prazo de cancelamento e agendamento
    const { data: settings } = await supabase
      .from("business_settings")
      .select("cancellation_deadline_minutes")
      .limit(1)
      .maybeSingle();

    const cancellationDeadlineMinutes = settings?.cancellation_deadline_minutes ?? 120;

    // Verificar se o agendamento já ultrapassou o prazo limite para cancelamento online
    const { data: appointmentDetails } = await supabase
      .from("appointments")
      .select("scheduled_date, start_time")
      .eq("id", id)
      .maybeSingle();

    if (appointmentDetails?.scheduled_date && appointmentDetails?.start_time) {
      const appDateTime = new Date(`${appointmentDetails.scheduled_date}T${appointmentDetails.start_time}:00`);
      const now = new Date();
      const diffMinutes = (appDateTime.getTime() - now.getTime()) / (1000 * 60);

      if (diffMinutes < cancellationDeadlineMinutes) {
        return NextResponse.json(
          { error: "Este agendamento não pode mais ser cancelado online." },
          { status: 400 }
        );
      }
    }

    if (appointment.status === "cancelled") {
      return NextResponse.json(
        { error: "Este agendamento já se encontra cancelado." },
        { status: 400 }
      );
    }

    // Atualizar status para cancelado
    const { error: updateErr } = await supabase
      .from("appointments")
      .update({
        status: "cancelled",
        notes: reason ? `Cancelado pelo cliente: ${reason}` : "Cancelado pelo cliente via página segura",
      })
      .eq("id", id);

    if (updateErr) {
      return NextResponse.json({ error: "Erro ao processar o cancelamento." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Agendamento cancelado com sucesso.",
    });
  } catch (err: unknown) {
    console.error("Erro ao cancelar agendamento:", err);
    return NextResponse.json(
      { error: "Erro inesperado ao processar cancelamento." },
      { status: 500 }
    );
  }
}
