import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  Payment,
  CashRegister,
  CashMovement,
  AppointmentPaymentSummary,
  PaymentMethod,
  PaymentStatus,
} from "@/types";

/**
 * Calcula o resumo financeiro consolidado de um agendamento com base no snapshot de preço
 * e no histórico de pagamentos registrados (suporte a pagamentos parciais 1:N).
 */
export function calculateAppointmentPaymentSummary(
  appointmentId: string,
  appointmentPrice: number,
  allPayments: Payment[]
): AppointmentPaymentSummary {
  const appointmentPayments = allPayments.filter(
    (p) => p.appointment_id === appointmentId
  );

  const validPayments = appointmentPayments.filter((p) => p.status === "paid");
  const totalPaid = validPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const remainingBalance = Math.max(0, Number(appointmentPrice) - totalPaid);

  let status: "pending" | "partial" | "paid" = "pending";
  if (totalPaid >= Number(appointmentPrice) && Number(appointmentPrice) > 0) {
    status = "paid";
  } else if (totalPaid > 0) {
    status = "partial";
  }

  return {
    appointmentId,
    totalPrice: Number(appointmentPrice),
    totalPaid,
    remainingBalance,
    status,
    paymentsCount: validPayments.length,
    payments: appointmentPayments,
  };
}

// ==============================================================================
// SUPABASE SERVICES PARA PAGAMENTOS
// ==============================================================================

export async function fetchPaymentsFromSupabase(): Promise<Payment[]> {
  if (!supabase || !isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .order("paid_at", { ascending: false });

    if (error) {
      console.warn("Aviso ao buscar pagamentos do Supabase:", error.message);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      appointment_id: row.appointment_id,
      amount: Number(row.amount),
      payment_method: row.payment_method as PaymentMethod,
      status: row.status as PaymentStatus,
      paid_at: row.paid_at,
      notes: row.notes,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } catch (err) {
    console.error("Erro inesperado ao consultar pagamentos:", err);
    return [];
  }
}

export async function insertPaymentInSupabase(
  payment: Omit<Payment, "created_at" | "updated_at">
): Promise<Payment | null> {
  if (!supabase || !isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from("payments")
      .insert({
        id: payment.id,
        appointment_id: payment.appointment_id,
        amount: payment.amount,
        payment_method: payment.payment_method,
        status: payment.status,
        paid_at: payment.paid_at,
        notes: payment.notes || null,
        created_by: payment.created_by || null,
      })
      .select()
      .single();

    if (error) {
      console.warn("Aviso ao inserir pagamento no Supabase:", error.message);
      return null;
    }

    return {
      id: data.id,
      appointment_id: data.appointment_id,
      amount: Number(data.amount),
      payment_method: data.payment_method as PaymentMethod,
      status: data.status as PaymentStatus,
      paid_at: data.paid_at,
      notes: data.notes,
      created_by: data.created_by,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (err) {
    console.error("Erro inesperado ao inserir pagamento:", err);
    return null;
  }
}

export async function updatePaymentStatusInSupabase(
  id: string,
  status: PaymentStatus,
  notes?: string
): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured()) return false;

  try {
    const updatePayload: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (notes !== undefined) {
      updatePayload.notes = notes;
    }

    const { error } = await supabase
      .from("payments")
      .update(updatePayload)
      .eq("id", id);

    if (error) {
      console.warn("Aviso ao atualizar status do pagamento no Supabase:", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Erro ao atualizar status do pagamento:", err);
    return false;
  }
}

// ==============================================================================
// SUPABASE SERVICES PARA CAIXA DIÁRIO (CASH REGISTERS)
// ==============================================================================

export async function fetchCashRegistersFromSupabase(): Promise<CashRegister[]> {
  if (!supabase || !isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from("cash_registers")
      .select("*")
      .order("opened_at", { ascending: false });

    if (error) {
      console.warn("Aviso ao buscar caixas do Supabase:", error.message);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      opened_at: row.opened_at,
      closed_at: row.closed_at,
      opening_balance: Number(row.opening_balance),
      closing_balance: row.closing_balance !== null ? Number(row.closing_balance) : null,
      counted_balance: row.counted_balance !== null ? Number(row.counted_balance) : null,
      difference: row.difference !== null ? Number(row.difference) : null,
      status: row.status,
      opened_by: row.opened_by,
      closed_by: row.closed_by,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } catch (err) {
    console.error("Erro ao consultar caixas do Supabase:", err);
    return [];
  }
}

export async function insertCashRegisterInSupabase(
  register: Omit<CashRegister, "created_at" | "updated_at">
): Promise<CashRegister | null> {
  if (!supabase || !isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from("cash_registers")
      .insert({
        id: register.id,
        opened_at: register.opened_at,
        opening_balance: register.opening_balance,
        status: register.status,
        notes: register.notes || null,
        opened_by: register.opened_by || null,
      })
      .select()
      .single();

    if (error) {
      console.warn("Aviso ao abrir caixa no Supabase:", error.message);
      return null;
    }

    return {
      id: data.id,
      opened_at: data.opened_at,
      closed_at: data.closed_at,
      opening_balance: Number(data.opening_balance),
      closing_balance: data.closing_balance !== null ? Number(data.closing_balance) : null,
      counted_balance: data.counted_balance !== null ? Number(data.counted_balance) : null,
      difference: data.difference !== null ? Number(data.difference) : null,
      status: data.status,
      opened_by: data.opened_by,
      closed_by: data.closed_by,
      notes: data.notes,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (err) {
    console.error("Erro ao inserir caixa:", err);
    return null;
  }
}

export async function closeCashRegisterInSupabase(
  id: string,
  payload: {
    closed_at: string;
    closing_balance: number;
    counted_balance: number;
    difference: number;
    closed_by?: string | null;
    notes?: string | null;
  }
): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from("cash_registers")
      .update({
        status: "closed",
        closed_at: payload.closed_at,
        closing_balance: payload.closing_balance,
        counted_balance: payload.counted_balance,
        difference: payload.difference,
        closed_by: payload.closed_by || null,
        notes: payload.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.warn("Aviso ao fechar caixa no Supabase:", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Erro ao fechar caixa:", err);
    return false;
  }
}

// ==============================================================================
// SUPABASE SERVICES PARA MOVIMENTAÇÕES DE CAIXA
// ==============================================================================

export async function fetchCashMovementsFromSupabase(): Promise<CashMovement[]> {
  if (!supabase || !isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from("cash_movements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Aviso ao buscar movimentações de caixa do Supabase:", error.message);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      cash_register_id: row.cash_register_id,
      appointment_id: row.appointment_id,
      payment_id: row.payment_id,
      type: row.type,
      category: row.category,
      amount: Number(row.amount),
      payment_method: row.payment_method as PaymentMethod,
      description: row.description,
      created_by: row.created_by,
      created_at: row.created_at,
    }));
  } catch (err) {
    console.error("Erro ao consultar movimentações:", err);
    return [];
  }
}

export async function insertCashMovementInSupabase(
  movement: CashMovement
): Promise<CashMovement | null> {
  if (!supabase || !isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from("cash_movements")
      .insert({
        id: movement.id,
        cash_register_id: movement.cash_register_id,
        appointment_id: movement.appointment_id || null,
        payment_id: movement.payment_id || null,
        type: movement.type,
        category: movement.category,
        amount: movement.amount,
        payment_method: movement.payment_method,
        description: movement.description || null,
        created_by: movement.created_by || null,
      })
      .select()
      .single();

    if (error) {
      console.warn("Aviso ao inserir movimentação no Supabase:", error.message);
      return null;
    }

    return {
      id: data.id,
      cash_register_id: data.cash_register_id,
      appointment_id: data.appointment_id,
      payment_id: data.payment_id,
      type: data.type,
      category: data.category,
      amount: Number(data.amount),
      payment_method: data.payment_method as PaymentMethod,
      description: data.description,
      created_by: data.created_by,
      created_at: data.created_at,
    };
  } catch (err) {
    console.error("Erro ao registrar movimentação de caixa:", err);
    return null;
  }
}
