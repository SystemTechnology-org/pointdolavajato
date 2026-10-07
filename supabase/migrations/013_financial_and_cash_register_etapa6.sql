-- ==============================================================================
-- 013_financial_and_cash_register_etapa6.sql: ETAPA 6 — Financeiro e Caixa
-- Point do Coco Lava Jato Litoral
-- Adiciona tabelas de pagamentos, controle diário de caixa e movimentações de caixa
-- com suporte a pagamentos parciais, rastreamento de saldo, conciliação e fechamento cego.
-- ==============================================================================

-- 1. TIPOS ENUM PARA O MÓDULO FINANCEIRO
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE payment_method AS ENUM ('dinheiro', 'pix', 'debito', 'credito');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cash_register_status') THEN
    CREATE TYPE cash_register_status AS ENUM ('open', 'closed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cash_movement_type') THEN
    CREATE TYPE cash_movement_type AS ENUM ('income', 'expense', 'reversal');
  END IF;
END $$;

-- 2. TABELA PAYMENTS (PAGAMENTOS VINCULADOS A AGENDAMENTOS 1:N)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  payment_method payment_method NOT NULL,
  status payment_status NOT NULL DEFAULT 'paid',
  paid_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW()),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW())
);

-- Trigger de updated_at para payments
DROP TRIGGER IF EXISTS trigger_payments_updated_at ON public.payments;
CREATE TRIGGER trigger_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 3. TABELA CASH_REGISTERS (CONTROLE DIÁRIO DE ABERTURA E FECHAMENTO DE CAIXA)
CREATE TABLE IF NOT EXISTS public.cash_registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW()),
  closed_at TIMESTAMPTZ,
  opening_balance NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (opening_balance >= 0),
  closing_balance NUMERIC(10,2),
  counted_balance NUMERIC(10,2),
  difference NUMERIC(10,2),
  status cash_register_status NOT NULL DEFAULT 'open',
  opened_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  closed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW())
);

-- Trigger de updated_at para cash_registers
DROP TRIGGER IF EXISTS trigger_cash_registers_updated_at ON public.cash_registers;
CREATE TRIGGER trigger_cash_registers_updated_at
  BEFORE UPDATE ON public.cash_registers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Regra de negócio: Apenas UM caixa aberto por vez
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_open_cash_register
  ON public.cash_registers (status)
  WHERE status = 'open';

-- 4. TABELA CASH_MOVEMENTS (MOVIMENTAÇÕES DE ENTRADA, SAÍDA E ESTORNO NO CAIXA)
CREATE TABLE IF NOT EXISTS public.cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id UUID NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  type cash_movement_type NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  payment_method payment_method NOT NULL DEFAULT 'dinheiro',
  description TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW())
);

-- Idempotência: Cada pagamento só pode gerar UMA movimentação direta de entrada no caixa
CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_movements_payment_id
  ON public.cash_movements (payment_id)
  WHERE payment_id IS NOT NULL;

-- 5. ÍNDICES DE PERFORMANCE PARA CONSULTAS FINANCEIRAS
CREATE INDEX IF NOT EXISTS idx_payments_appointment_id
  ON public.payments (appointment_id);

CREATE INDEX IF NOT EXISTS idx_payments_paid_at
  ON public.payments (paid_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_status_method
  ON public.payments (status, payment_method);

CREATE INDEX IF NOT EXISTS idx_cash_movements_register_created
  ON public.cash_movements (cash_register_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cash_movements_type_category
  ON public.cash_movements (type, category);

CREATE INDEX IF NOT EXISTS idx_cash_registers_opened_at
  ON public.cash_registers (opened_at DESC);

-- 6. POLÍTICAS DE SEGURANÇA (RLS)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Equipe gerencia pagamentos" ON public.payments;
CREATE POLICY "Equipe gerencia pagamentos" ON public.payments
  FOR ALL USING (public.is_staff());

DROP POLICY IF EXISTS "Equipe gerencia caixas" ON public.cash_registers;
CREATE POLICY "Equipe gerencia caixas" ON public.cash_registers
  FOR ALL USING (public.is_staff());

DROP POLICY IF EXISTS "Equipe gerencia movimentacoes de caixa" ON public.cash_movements;
CREATE POLICY "Equipe gerencia movimentacoes de caixa" ON public.cash_movements
  FOR ALL USING (public.is_staff());
