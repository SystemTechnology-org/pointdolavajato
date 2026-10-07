import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/services/customers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        { error: "Telefone ou WhatsApp é obrigatório." },
        { status: 400 }
      );
    }

    const cleanPhone = normalizePhone(phone);
    if (cleanPhone.length < 8) {
      return NextResponse.json(
        { error: "Número de telefone inválido." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      // Quando Supabase não está configurado, sinaliza para fallback no store do cliente
      return NextResponse.json({
        offline: true,
        customer: null,
        appointments: [],
      });
    }

    // 1. Buscar o cliente pelo telefone
    const { data: customer, error: custError } = await supabase
      .from("customers")
      .select("id, full_name, phone, email, created_at")
      .eq("phone", cleanPhone)
      .eq("active", true)
      .maybeSingle();

    if (custError) {
      console.error("Erro ao buscar cliente por telefone:", custError);
      return NextResponse.json(
        { error: "Erro ao consultar base de clientes." },
        { status: 500 }
      );
    }

    if (!customer) {
      return NextResponse.json({
        exists: false,
        customer: null,
        appointments: [],
      });
    }

    // 2. Buscar agendamentos vinculados ao cliente
    const { data: appointments, error: appError } = await supabase
      .from("appointments")
      .select(`
        id,
        code,
        cancel_token,
        scheduled_date,
        start_time,
        end_time,
        price,
        status,
        notes,
        created_at,
        vehicle:vehicles(id, vehicle_type, brand, model, color, plate),
        service:services(id, name, duration_minutes, price)
      `)
      .eq("customer_id", customer.id)
      .order("scheduled_date", { ascending: false })
      .order("start_time", { ascending: false });

    if (appError) {
      console.error("Erro ao buscar agendamentos do cliente:", appError);
      return NextResponse.json(
        { error: "Erro ao buscar histórico de agendamentos." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      exists: true,
      customer: {
        id: customer.id,
        full_name: customer.full_name,
        phone: customer.phone,
        email: customer.email,
      },
      appointments: appointments || [],
    });
  } catch (err: unknown) {
    console.error("Erro inesperado na rota /api/customer/appointments:", err);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
