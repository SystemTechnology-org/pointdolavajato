import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase não conectado." }, { status: 404 });
    }

    const { data: appointment, error } = await supabase
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
        customer:customers(id, full_name, phone),
        vehicle:vehicles(id, vehicle_type, brand, model, color, plate),
        service:services(id, name, duration_minutes, price)
      `)
      .eq("id", id)
      .maybeSingle();

    if (error || !appointment) {
      return NextResponse.json({ error: "Agendamento não encontrado." }, { status: 404 });
    }

    // Se token for fornecido e for válido, liberar acesso total para gerenciar/cancelar
    const hasValidToken = token && appointment.cancel_token && appointment.cancel_token === token;

    interface CustomerJoin {
      id?: string;
      full_name?: string;
      phone?: string;
    }
    interface VehicleJoin {
      id?: string;
      vehicle_type?: string;
      brand?: string;
      model?: string;
      color?: string;
      plate?: string;
    }
    interface ServiceJoin {
      id?: string;
      name?: string;
      duration_minutes?: number;
      price?: number;
    }

    const customer = (appointment.customer as unknown as CustomerJoin) || {};
    const vehicle = (appointment.vehicle as unknown as VehicleJoin) || {};
    const service = (appointment.service as unknown as ServiceJoin) || {};

    return NextResponse.json({
      appointment: {
        id: appointment.id,
        code: appointment.code || `PC-${appointment.id.slice(-6).toUpperCase()}`,
        scheduled_date: appointment.scheduled_date,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        price: appointment.price,
        status: appointment.status,
        notes: appointment.notes,
        created_at: appointment.created_at,
        customer_name: customer.full_name || "Cliente",
        phone: hasValidToken ? customer.phone : undefined,
        vehicle_model: vehicle.model || "Veículo",
        vehicle_plate: vehicle.plate || "",
        vehicle_type: vehicle.vehicle_type || "",
        service_name: service.name || "Serviço",
        service_duration: service.duration_minutes || 45,
        can_cancel: hasValidToken && ["scheduled", "confirmed"].includes(appointment.status),
      },
    });
  } catch (err: unknown) {
    console.error("Erro ao buscar agendamento por ID:", err);
    return NextResponse.json({ error: "Erro interno ao buscar agendamento." }, { status: 500 });
  }
}
