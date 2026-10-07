import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { calculateAvailableSlots } from "@/lib/services/appointments";
import { INITIAL_BUSINESS_HOURS, INITIAL_BUSINESS_SETTINGS } from "@/lib/initialData";
import { Appointment } from "@/types/database";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const durationStr = searchParams.get("duration");
    const duration = durationStr ? parseInt(durationStr, 10) : 45;

    if (!date) {
      return NextResponse.json({ error: "Data não informada." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      // Retornar cálculo com dados padrão
      const result = calculateAvailableSlots({
        date,
        serviceDuration: duration,
        businessHours: INITIAL_BUSINESS_HOURS,
        intervalMinutes: INITIAL_BUSINESS_SETTINGS.appointment_interval,
        existingAppointments: [],
        scheduleBlocks: [],
      });
      return NextResponse.json(result);
    }

    // Buscar configurações, horários, agendamentos do dia e bloqueios
    const [settingsRes, hoursRes, appsRes, blocksRes] = await Promise.all([
      supabase.from("business_settings").select("appointment_interval, minimum_advance_minutes, maximum_advance_days, allow_same_day_booking").limit(1).maybeSingle(),
      supabase.from("business_hours").select("*"),
      supabase
        .from("appointments")
        .select("id, scheduled_date, start_time, end_time, status")
        .eq("scheduled_date", date)
        .in("status", ["scheduled", "confirmed", "waiting", "in_progress"]),
      supabase.from("schedule_blocks").select("*"),
    ]);

    const businessHours = (hoursRes.data && hoursRes.data.length > 0)
      ? hoursRes.data
      : INITIAL_BUSINESS_HOURS;
    const intervalMinutes = settingsRes.data?.appointment_interval || 30;
    const minimumAdvanceMinutes = settingsRes.data?.minimum_advance_minutes ?? 30;
    const maximumAdvanceDays = settingsRes.data?.maximum_advance_days ?? 30;
    const allowSameDayBooking = settingsRes.data?.allow_same_day_booking ?? true;
    const existingAppointments = appsRes.data || [];
    const scheduleBlocks = blocksRes.data || [];

    const availability = calculateAvailableSlots({
      date,
      serviceDuration: duration,
      businessHours,
      intervalMinutes,
      minimumAdvanceMinutes,
      maximumAdvanceDays,
      allowSameDayBooking,
      existingAppointments: existingAppointments as unknown as Appointment[],
      scheduleBlocks,
      maxCapacity: 1,
    });

    return NextResponse.json(availability);
  } catch (err: unknown) {
    console.error("Erro ao calcular horários disponíveis:", err);
    return NextResponse.json(
      { error: "Erro ao processar consulta de horários disponíveis." },
      { status: 500 }
    );
  }
}
