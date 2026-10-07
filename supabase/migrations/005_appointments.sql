-- ==============================================================================
-- 005_appointments.sql: Tabela de Agendamentos e Snapshot de Preço
-- ==============================================================================

DO $$
BEGIN
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

CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  scheduled_date DATE NOT NULL,
  start_time VARCHAR(5) NOT NULL, -- Formato '08:00', '09:30'
  end_time VARCHAR(5) NOT NULL,   -- Formato '08:45', '10:30'
  status appointment_status NOT NULL DEFAULT 'scheduled'::appointment_status,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0), -- SNAPSHOT DO PREÇO NO MOMENTO DO AGENDAMENTO
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW())
);

-- Trigger de updated_at
DROP TRIGGER IF EXISTS trigger_appointments_updated_at ON public.appointments;
CREATE TRIGGER trigger_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para garantir que o preço seja preenchido com snapshot do serviço caso não venha explícito
CREATE OR REPLACE FUNCTION public.handle_appointment_price_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.price IS NULL OR NEW.price = 0 THEN
    SELECT price INTO NEW.price FROM public.services WHERE id = NEW.service_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_price_snapshot ON public.appointments;
CREATE TRIGGER trigger_price_snapshot
  BEFORE INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_appointment_price_snapshot();

-- Índices para buscas rápidas e detecção de conflitos de horário
CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON public.appointments(scheduled_date, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON public.appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_vehicle ON public.appointments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_appointments_service ON public.appointments(service_id);
