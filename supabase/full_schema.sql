-- ==============================================================================
-- POINT DO COCO LAVA JATO LITORAL — FULL SCHEMA & SEED (ETAPA 2)
-- Execute este script no SQL Editor do Supabase para inicializar o banco completo.
-- ==============================================================================

-- 1. TIPOS ENUM
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'employee', 'owner', 'manager');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_type') THEN
    CREATE TYPE vehicle_type AS ENUM ('moto', 'car_small', 'suv', 'pickup');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
    CREATE TYPE appointment_status AS ENUM (
      'scheduled',
      'confirmed',
      'waiting',
      'in_progress',
      'completed',
      'cancelled',
      'no_show'
    );
  END IF;
END $$;

-- 2. FUNÇÃO TRIGGER UPDATED_AT
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('America/Bahia', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'employee'::user_role,
  avatar_url TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW())
);

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 4. CUSTOMERS
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL CHECK (char_length(trim(full_name)) > 1),
  phone TEXT NOT NULL CHECK (char_length(trim(phone)) >= 8),
  email TEXT CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW())
);

DROP TRIGGER IF EXISTS trigger_customers_updated_at ON public.customers;
CREATE TRIGGER trigger_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_phone_normalized
  ON public.customers (regexp_replace(phone, '\D', '', 'g'))
  WHERE active = TRUE;

-- 5. VEHICLES
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  vehicle_type vehicle_type NOT NULL,
  brand TEXT,
  model TEXT NOT NULL CHECK (char_length(trim(model)) > 0),
  color TEXT,
  plate TEXT CHECK (plate IS NULL OR char_length(trim(plate)) >= 3),
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW())
);

DROP TRIGGER IF EXISTS trigger_vehicles_updated_at ON public.vehicles;
CREATE TRIGGER trigger_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 6. SERVICES
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 1),
  description TEXT,
  vehicle_type vehicle_type NOT NULL,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  duration_minutes INTEGER NOT NULL DEFAULT 45 CHECK (duration_minutes > 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW())
);

DROP TRIGGER IF EXISTS trigger_services_updated_at ON public.services;
CREATE TRIGGER trigger_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 7. APPOINTMENTS
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  scheduled_date DATE NOT NULL,
  start_time VARCHAR(5) NOT NULL,
  end_time VARCHAR(5) NOT NULL,
  status appointment_status NOT NULL DEFAULT 'scheduled'::appointment_status,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  notes TEXT,
  code TEXT,
  cancel_token TEXT,
  confirmed_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  no_show_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  checklist JSONB DEFAULT '{}'::jsonb,
  vehicle_photos JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW())
);

DROP TRIGGER IF EXISTS trigger_appointments_updated_at ON public.appointments;
CREATE TRIGGER trigger_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 7.1 APPOINTMENT_STATUS_HISTORY (ETAPA 5)
CREATE TABLE IF NOT EXISTS public.appointment_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  old_status appointment_status,
  new_status appointment_status NOT NULL,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW()),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_status_history_appointment ON public.appointment_status_history(appointment_id, changed_at DESC);

-- Índices de Performance da ETAPA 3 e 5
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_date ON public.appointments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON public.appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON public.appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_vehicle_id ON public.appointments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_appointments_service_id ON public.appointments(service_id);
CREATE INDEX IF NOT EXISTS idx_appointments_code ON public.appointments(code);
CREATE INDEX IF NOT EXISTS idx_appointments_cancel_token ON public.appointments(cancel_token);
CREATE INDEX IF NOT EXISTS idx_appointments_started_completed ON public.appointments(started_at, completed_at);

-- 8. BUSINESS_SETTINGS
CREATE TABLE IF NOT EXISTS public.business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL DEFAULT 'Point do Coco Lava Jato',
  phone TEXT,
  whatsapp TEXT NOT NULL DEFAULT '(71) 9 9288-7645',
  address TEXT,
  logo_url TEXT DEFAULT '/images/logo.png',
  timezone TEXT NOT NULL DEFAULT 'America/Bahia',
  appointment_interval INTEGER NOT NULL DEFAULT 30 CHECK (appointment_interval > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW())
);

-- 9. BUSINESS_HOURS
CREATE TABLE IF NOT EXISTS public.business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week SMALLINT NOT NULL UNIQUE CHECK (day_of_week BETWEEN 0 AND 6),
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  opening_time TIME NOT NULL DEFAULT '08:00',
  closing_time TIME NOT NULL DEFAULT '18:00',
  break_start TIME,
  break_end TIME
);

-- 10. SCHEDULE_BLOCKS
CREATE TABLE IF NOT EXISTS public.schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL CHECK (end_datetime > start_datetime),
  reason TEXT NOT NULL CHECK (char_length(trim(reason)) > 1),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW())
);

-- 11. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() AND active = TRUE;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(public.current_user_role() = 'admin'::user_role, FALSE);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(public.current_user_role() IN ('admin'::user_role, 'employee'::user_role, 'owner'::user_role, 'manager'::user_role), FALSE);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Policies
DROP POLICY IF EXISTS "Usuarios visualizam proprio perfil" ON public.profiles;
CREATE POLICY "Usuarios visualizam proprio perfil" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Qualquer um visualiza servicos ativos" ON public.services;
CREATE POLICY "Qualquer um visualiza servicos ativos" ON public.services FOR SELECT USING (active = TRUE OR public.is_staff());

DROP POLICY IF EXISTS "Equipe autenticada gerencia servicos" ON public.services;
CREATE POLICY "Equipe autenticada gerencia servicos" ON public.services FOR ALL USING (public.is_staff());

DROP POLICY IF EXISTS "Configuracoes publicas para leitura" ON public.business_settings;
CREATE POLICY "Configuracoes publicas para leitura" ON public.business_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Horarios publicos para leitura" ON public.business_hours;
CREATE POLICY "Horarios publicos para leitura" ON public.business_hours FOR SELECT USING (true);

DROP POLICY IF EXISTS "Visualizacao publica de bloqueios" ON public.schedule_blocks;
CREATE POLICY "Visualizacao publica de bloqueios" ON public.schedule_blocks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Equipe gerencia clientes" ON public.customers;
CREATE POLICY "Equipe gerencia clientes" ON public.customers FOR ALL USING (public.is_staff());

DROP POLICY IF EXISTS "Equipe gerencia veiculos" ON public.vehicles;
CREATE POLICY "Equipe gerencia veiculos" ON public.vehicles FOR ALL USING (public.is_staff());

DROP POLICY IF EXISTS "Equipe gerencia agendamentos" ON public.appointments;
CREATE POLICY "Equipe gerencia agendamentos" ON public.appointments FOR ALL USING (public.is_staff());

ALTER TABLE public.appointment_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Equipe visualiza historico de status" ON public.appointment_status_history;
CREATE POLICY "Equipe visualiza historico de status" ON public.appointment_status_history FOR SELECT USING (public.is_staff());
DROP POLICY IF EXISTS "Equipe insere historico de status" ON public.appointment_status_history;
CREATE POLICY "Equipe insere historico de status" ON public.appointment_status_history FOR INSERT WITH CHECK (public.is_staff());

-- 12. SEED INICIAL DE SERVIÇOS, CONFIGURAÇÕES E HORÁRIOS
INSERT INTO public.services (id, name, description, vehicle_type, price, duration_minutes, active)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Lavagem simples de moto', 'Limpeza técnica da lataria, rodas, motor e secagem especializada.', 'moto', 30.00, 35, TRUE),
  ('00000000-0000-0000-0000-000000000002', 'Lavagem + aspiração de carro pequeno simples', 'Lavagem técnica da lataria, secagem, limpeza de vidros e aspiração interna.', 'car_small', 40.00, 45, TRUE),
  ('00000000-0000-0000-0000-000000000003', 'Lavagem + aspiração + cera líquida + hidratação de carro pequeno', 'Tratamento completo com cera líquida de alto brilho e hidratação de plásticos/painel.', 'car_small', 60.00, 60, TRUE),
  ('00000000-0000-0000-0000-000000000004', 'Lavagem + aspiração de carro SUV simples', 'Lavagem da carroceria, rodas, caixas de roda e aspiração interna detalhada.', 'suv', 60.00, 50, TRUE),
  ('00000000-0000-0000-0000-000000000005', 'Lavagem + aspiração + cera líquida + hidratação de carro SUV', 'Lavagem premium, cera líquida protetora, hidratação de plásticos e acabamentos.', 'suv', 80.00, 75, TRUE),
  ('00000000-0000-0000-0000-000000000006', 'Lavagem + aspiração de caminhonete simples', 'Limpeza pesada externa, caçamba, rodas e aspiração interna completa.', 'pickup', 80.00, 60, TRUE),
  ('00000000-0000-0000-0000-000000000007', 'Lavagem + aspiração + cera líquida + hidratação de caminhonete', 'Serviço master com proteção de pintura em cera líquida e hidratação de plásticos/borrachas.', 'pickup', 100.00, 90, TRUE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  vehicle_type = EXCLUDED.vehicle_type,
  price = EXCLUDED.price,
  duration_minutes = EXCLUDED.duration_minutes,
  active = EXCLUDED.active;

INSERT INTO public.business_settings (id, business_name, whatsapp, address, logo_url, timezone, appointment_interval)
VALUES ('00000000-0000-0000-0000-000000000010', 'Point do Coco Lava Jato', '(71) 9 9288-7645', NULL, '/images/logo.png', 'America/Bahia', 30)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.business_hours (day_of_week, is_open, opening_time, closing_time)
VALUES
  (0, FALSE, '08:00', '12:00'),
  (1, TRUE,  '08:00', '18:00'),
  (2, TRUE,  '08:00', '18:00'),
  (3, TRUE,  '08:00', '18:00'),
  (4, TRUE,  '08:00', '18:00'),
  (5, TRUE,  '08:00', '18:00'),
  (6, TRUE,  '08:00', '18:00')
ON CONFLICT (day_of_week) DO UPDATE SET
  is_open = EXCLUDED.is_open,
  opening_time = EXCLUDED.opening_time,
  closing_time = EXCLUDED.closing_time;

-- ==============================================================================
-- 13. ETAPA 6: FINANCEIRO E CONTROLE DE CAIXA
-- ==============================================================================
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

DROP TRIGGER IF EXISTS trigger_payments_updated_at ON public.payments;
CREATE TRIGGER trigger_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

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

DROP TRIGGER IF EXISTS trigger_cash_registers_updated_at ON public.cash_registers;
CREATE TRIGGER trigger_cash_registers_updated_at
  BEFORE UPDATE ON public.cash_registers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_open_cash_register
  ON public.cash_registers (status)
  WHERE status = 'open';

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

CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_movements_payment_id
  ON public.cash_movements (payment_id)
  WHERE payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_appointment_id ON public.payments (appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON public.payments (paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status_method ON public.payments (status, payment_method);
CREATE INDEX IF NOT EXISTS idx_cash_movements_register_created ON public.cash_movements (cash_register_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_registers_opened_at ON public.cash_registers (opened_at DESC);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Equipe gerencia pagamentos" ON public.payments;
CREATE POLICY "Equipe gerencia pagamentos" ON public.payments FOR ALL USING (public.is_staff());

DROP POLICY IF EXISTS "Equipe gerencia caixas" ON public.cash_registers;
CREATE POLICY "Equipe gerencia caixas" ON public.cash_registers FOR ALL USING (public.is_staff());

DROP POLICY IF EXISTS "Equipe gerencia movimentacoes de caixa" ON public.cash_movements;
CREATE POLICY "Equipe gerencia movimentacoes de caixa" ON public.cash_movements FOR ALL USING (public.is_staff());

-- ==============================================================================
-- 014_dashboard_and_reports_etapa7.sql: ETAPA 7 — Dashboard e Relatórios
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.is_financial_manager()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    public.current_user_role() IN ('admin'::user_role, 'owner'::user_role, 'manager'::user_role),
    FALSE
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

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

