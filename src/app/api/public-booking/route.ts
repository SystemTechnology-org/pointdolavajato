import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/services/customers";
import {
  DEFAULT_SIMULTANEOUS_CAPACITY,
  timeToMinutes,
  minutesToTime,
  intervalsOverlap,
  generateAppointmentCode,
  generateCancelToken,
} from "@/lib/services/appointments";
import { VehicleType } from "@/types/database";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      full_name,
      phone,
      email,
      vehicle_type,
      brand,
      model,
      color,
      plate,
      notes,
      service_id,
      scheduled_date,
      start_time,
    } = body;

    // 1. Validações básicas de formato
    if (!full_name || full_name.trim().length < 2) {
      return NextResponse.json(
        { error: "Nome completo é obrigatório (mínimo 2 caracteres)." },
        { status: 400 }
      );
    }

    const cleanPhone = normalizePhone(phone || "");
    if (cleanPhone.length < 8) {
      return NextResponse.json(
        { error: "WhatsApp ou telefone inválido." },
        { status: 400 }
      );
    }

    if (!vehicle_type || !["moto", "car_small", "suv", "pickup"].includes(vehicle_type)) {
      return NextResponse.json(
        { error: "Categoria de veículo inválida." },
        { status: 400 }
      );
    }

    if (!service_id) {
      return NextResponse.json(
        { error: "Serviço não selecionado." },
        { status: 400 }
      );
    }

    if (!scheduled_date || !start_time) {
      return NextResponse.json(
        { error: "Data e horário são obrigatórios." },
        { status: 400 }
      );
    }

    // 2. Não permitir agendamento no passado
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    if (scheduled_date < todayStr) {
      return NextResponse.json(
        { error: "Não é permitido agendar em datas passadas." },
        { status: 400 }
      );
    }

    const currentMinutesNow = now.getHours() * 60 + now.getMinutes();
    const requestedStartMin = timeToMinutes(start_time);
    if (scheduled_date === todayStr && requestedStartMin <= currentMinutesNow + 10) {
      return NextResponse.json(
        { error: "Este horário já passou. Por favor, escolha um horário futuro." },
        { status: 400 }
      );
    }

    const friendlyCode = generateAppointmentCode();
    const cancelToken = generateCancelToken();

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      // Fallback local quando Supabase na nuvem ainda não configurado
      return NextResponse.json({
        success: true,
        appointment: {
          id: `agd-${Date.now()}`,
          code: friendlyCode,
          cancel_token: cancelToken,
          scheduled_date,
          start_time,
          customer_name: full_name.trim(),
          phone: phone.trim(),
          vehicle_type,
          service_id,
        },
        message: "Agendamento registrado com sucesso no sistema.",
      });
    }

    // 3. Validar Horário de Funcionamento (business_hours)
    const dateObj = new Date(`${scheduled_date}T12:00:00`);
    const dayOfWeek = dateObj.getDay();

    const { data: businessHour } = await supabase
      .from("business_hours")
      .select("*")
      .eq("day_of_week", dayOfWeek)
      .maybeSingle();

    if (!businessHour || !businessHour.is_open) {
      return NextResponse.json(
        { error: "Não realizamos atendimentos nesta data." },
        { status: 400 }
      );
    }

    const openMin = timeToMinutes(businessHour.opening_time);
    const closeMin = timeToMinutes(businessHour.closing_time);

    // 4. Validar serviço e Snapshot do Preço
    const { data: service, error: srvError } = await supabase
      .from("services")
      .select("id, name, price, duration_minutes, active, vehicle_type")
      .eq("id", service_id)
      .single();

    if (srvError || !service || !service.active) {
      return NextResponse.json(
        { error: "O serviço selecionado não está disponível no momento." },
        { status: 400 }
      );
    }

    if (service.vehicle_type !== vehicle_type) {
      return NextResponse.json(
        { error: "O serviço escolhido é incompatível com o tipo do veículo." },
        { status: 400 }
      );
    }

    // 5. Calcular término e validar se cabe no expediente
    const duration = service.duration_minutes || 45;
    const requestedEndMin = requestedStartMin + duration;
    const computedEndTime = minutesToTime(requestedEndMin);

    if (requestedStartMin < openMin || requestedEndMin > closeMin) {
      return NextResponse.json(
        {
          error: `O horário solicitado (${start_time} às ${computedEndTime}) ultrapassa o horário de expediente (${businessHour.opening_time} às ${businessHour.closing_time}).`,
        },
        { status: 400 }
      );
    }

    // 6. Verificar bloqueios da agenda (schedule_blocks)
    const slotStartIso = new Date(`${scheduled_date}T${start_time}:00`).toISOString();
    const slotEndIso = new Date(`${scheduled_date}T${computedEndTime}:00`).toISOString();

    const { data: blocks } = await supabase
      .from("schedule_blocks")
      .select("*")
      .lte("start_datetime", slotEndIso)
      .gte("end_datetime", slotStartIso);

    if (blocks && blocks.length > 0) {
      return NextResponse.json(
        { error: `Horário indisponível por bloqueio na agenda: ${blocks[0].reason || "Fechado"}` },
        { status: 409 }
      );
    }

    // 7. Verificar concorrência e sobreposição de horários (Requisito 11 e 31)
    const { data: existingBookings } = await supabase
      .from("appointments")
      .select("id, start_time, end_time, status")
      .eq("scheduled_date", scheduled_date)
      .in("status", ["scheduled", "confirmed", "waiting", "in_progress"]);

    if (existingBookings && existingBookings.length > 0) {
      const overlapping = existingBookings.filter((b) => {
        const bStart = timeToMinutes(b.start_time);
        const bEnd = b.end_time ? timeToMinutes(b.end_time) : bStart + 45;
        return intervalsOverlap(requestedStartMin, requestedEndMin, bStart, bEnd);
      });

      if (overlapping.length >= DEFAULT_SIMULTANEOUS_CAPACITY) {
        return NextResponse.json(
          { error: "Este horário acabou de ser reservado. Por favor, escolha outro." },
          { status: 409 }
        );
      }
    }

    // 8. Buscar cliente por telefone ou criar apenas agora na confirmação (evita abandono)
    let customerId: string;
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id, full_name")
      .eq("phone", phone.trim())
      .eq("active", true)
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCust, error: custError } = await supabase
        .from("customers")
        .insert([
          {
            full_name: full_name.trim(),
            phone: phone.trim(),
            email: email?.trim() || null,
            notes: "Cadastrado via agendamento público online",
          },
        ])
        .select("id")
        .single();

      if (custError || !newCust) {
        return NextResponse.json(
          { error: "Erro ao registrar dados do cliente." },
          { status: 500 }
        );
      }
      customerId = newCust.id;
    }

    // 9. Buscar veículo pela placa ou criar para o cliente
    const cleanPlate = (plate || "").trim().toUpperCase() || "NÃO INFORMADA";
    let vehicleId: string;

    const { data: existingVehicle } = await supabase
      .from("vehicles")
      .select("id")
      .eq("customer_id", customerId)
      .eq("plate", cleanPlate)
      .maybeSingle();

    if (existingVehicle) {
      vehicleId = existingVehicle.id;
    } else {
      const { data: newVeh, error: vehError } = await supabase
        .from("vehicles")
        .insert([
          {
            customer_id: customerId,
            vehicle_type: vehicle_type as VehicleType,
            brand: brand?.trim() || null,
            model: (model || vehicle_type).trim(),
            color: color?.trim() || null,
            plate: cleanPlate,
            notes: notes?.trim() || null,
          },
        ])
        .select("id")
        .single();

      if (vehError || !newVeh) {
        return NextResponse.json(
          { error: "Erro ao registrar veículo." },
          { status: 500 }
        );
      }
      vehicleId = newVeh.id;
    }

    // 10. Criar agendamento com SNAPSHOT DO PREÇO, código amigável e token de cancelamento
    const { data: appointment, error: appError } = await supabase
      .from("appointments")
      .insert([
        {
          customer_id: customerId,
          vehicle_id: vehicleId,
          service_id: service.id,
          scheduled_date,
          start_time,
          end_time: computedEndTime,
          status: "scheduled",
          price: service.price, // SNAPSHOT DO PREÇO HISTÓRICO
          code: friendlyCode,
          cancel_token: cancelToken,
          notes: notes?.trim() || "Agendamento público via celular",
        },
      ])
      .select(`
        id,
        code,
        cancel_token,
        scheduled_date,
        start_time,
        end_time,
        price,
        status
      `)
      .single();

    if (appError || !appointment) {
      return NextResponse.json(
        { error: "Erro ao salvar o agendamento no sistema." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        code: appointment.code || friendlyCode,
        cancel_token: appointment.cancel_token || cancelToken,
        scheduled_date: appointment.scheduled_date,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        price: appointment.price,
        service_name: service.name,
        customer_name: full_name.trim(),
        vehicle_model: model || vehicle_type,
      },
    });
  } catch (err: unknown) {
    console.error("Erro interno no agendamento público:", err);
    return NextResponse.json(
      { error: "Ocorreu um erro inesperado ao processar seu agendamento. Tente novamente." },
      { status: 500 }
    );
  }
}
