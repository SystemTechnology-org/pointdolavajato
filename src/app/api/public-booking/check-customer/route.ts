import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/services/customers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json({ exists: false, error: "Telefone não informado." }, { status: 400 });
    }

    const cleanPhone = normalizePhone(phone);
    if (cleanPhone.length < 8) {
      return NextResponse.json({ exists: false, error: "Telefone inválido." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      // Quando Supabase não está configurado na nuvem, informa que não encontrou para prosseguir localmente
      return NextResponse.json({ exists: false });
    }

    const { data: customer, error } = await supabase
      .from("customers")
      .select(`
        id,
        full_name,
        phone,
        vehicles:vehicles(
          id,
          vehicle_type,
          brand,
          model,
          color,
          plate,
          notes
        )
      `)
      .eq("phone", phone.trim())
      .eq("active", true)
      .maybeSingle();

    if (error || !customer) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: true,
      customer: {
        id: customer.id,
        full_name: customer.full_name,
        phone: customer.phone,
        vehicles: customer.vehicles || [],
      },
    });
  } catch (err: unknown) {
    console.error("Erro ao verificar cliente por telefone:", err);
    return NextResponse.json({ exists: false });
  }
}
