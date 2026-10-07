-- ==============================================================================
-- 014_dashboard_and_reports_etapa7.sql: ETAPA 7 — Dashboard e Relatórios
-- Point do Coco Lava Jato Litoral
-- Adiciona funções de verificação de permissão financeira, políticas refinadas de RLS
-- e índices de alta performance para agregações analíticas de datas, status e clientes.
-- ==============================================================================

-- 1. FUNÇÃO DE PERMISSÃO FINANCEIRA (Requisito 33 & 34)
-- Apenas usuários com papel 'owner', 'admin' ou 'manager' têm acesso aos dados financeiros.
CREATE OR REPLACE FUNCTION public.is_financial_manager()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    public.current_user_role() IN ('admin'::user_role, 'owner'::user_role, 'manager'::user_role),
    FALSE
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. REFINAMENTO DAS POLÍTICAS DE RLS PARA DADOS FINANCEIROS
DROP POLICY IF EXISTS "Equipe gerencia pagamentos" ON public.payments;
CREATE POLICY "Gestores financeiros gerenciam pagamentos"
  ON public.payments
  FOR ALL
  USING (public.is_financial_manager());

DROP POLICY IF EXISTS "Equipe gerencia caixas" ON public.cash_registers;
CREATE POLICY "Gestores financeiros gerenciam caixas"
  ON public.cash_registers
  FOR ALL
  USING (public.is_financial_manager());

DROP POLICY IF EXISTS "Equipe gerencia movimentacoes de caixa" ON public.cash_movements;
CREATE POLICY "Gestores financeiros gerenciam movimentacoes de caixa"
  ON public.cash_movements
  FOR ALL
  USING (public.is_financial_manager());

-- 3. ÍNDICES DE PERFORMANCE PARA AGREGAÇÕES DE DASHBOARD E RELATÓRIOS (Requisito 25)
CREATE INDEX IF NOT EXISTS idx_appointments_date_status_price
  ON public.appointments(scheduled_date, status, price);

CREATE INDEX IF NOT EXISTS idx_appointments_customer_date_status
  ON public.appointments(customer_id, scheduled_date, status);

CREATE INDEX IF NOT EXISTS idx_appointments_service_date_status
  ON public.appointments(service_id, scheduled_date, status);

CREATE INDEX IF NOT EXISTS idx_payments_paid_at_status_method
  ON public.payments(paid_at, status, payment_method);

CREATE INDEX IF NOT EXISTS idx_cash_movements_created_type_amount
  ON public.cash_movements(created_at, type, amount);

CREATE INDEX IF NOT EXISTS idx_customers_active_created
  ON public.customers(active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vehicles_customer_active
  ON public.vehicles(customer_id, active);
