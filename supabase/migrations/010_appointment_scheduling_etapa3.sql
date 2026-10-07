-- ==============================================================================
-- 010_appointment_scheduling_etapa3.sql: ETAPA 3 — Sistema de Agendamento Completo
-- Adiciona código amigável de protocolo (#PC-000123), token de cancelamento seguro,
-- e índices de alta performance para busca e verificação de conflitos.
-- ==============================================================================

-- 1. ADICIONAR CAMPOS CODE E CANCEL_TOKEN EM APPOINTMENTS
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS cancel_token TEXT;

-- 2. ÍNDICES DE PERFORMANCE (Requisito 33 da ETAPA 3)
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_date
  ON public.appointments(scheduled_date);

CREATE INDEX IF NOT EXISTS idx_appointments_start_time
  ON public.appointments(start_time);

CREATE INDEX IF NOT EXISTS idx_appointments_status
  ON public.appointments(status);

CREATE INDEX IF NOT EXISTS idx_appointments_customer_id
  ON public.appointments(customer_id);

CREATE INDEX IF NOT EXISTS idx_appointments_vehicle_id
  ON public.appointments(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_appointments_service_id
  ON public.appointments(service_id);

CREATE INDEX IF NOT EXISTS idx_appointments_code
  ON public.appointments(code);

CREATE INDEX IF NOT EXISTS idx_appointments_cancel_token
  ON public.appointments(cancel_token);

CREATE INDEX IF NOT EXISTS idx_appointments_date_status_time
  ON public.appointments(scheduled_date, status, start_time, end_time);

-- 3. ÍNDICES PARA BUSCA DE CLIENTES E VEÍCULOS
CREATE INDEX IF NOT EXISTS idx_customers_phone_normalized
  ON public.customers (regexp_replace(phone, '\D', '', 'g'))
  WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id
  ON public.vehicles (customer_id)
  WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS idx_schedule_blocks_dates
  ON public.schedule_blocks (start_datetime, end_datetime);

-- 4. FUNÇÃO TRIGGER PARA GERAR CÓDIGO AMIGÁVEL AUTOMÁTICO SE NÃO FORNECIDO
CREATE OR REPLACE FUNCTION public.handle_appointment_code_and_token()
RETURNS TRIGGER AS $$
DECLARE
  v_num TEXT;
BEGIN
  -- Se código amigável não for fornecido, gerar no padrão #PC-XXXXXX
  IF NEW.code IS NULL OR NEW.code = '' THEN
    v_num := LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
    NEW.code := 'PC-' || v_num;
  END IF;

  -- Se token de cancelamento seguro não for fornecido, gerar UUID aleatório
  IF NEW.cancel_token IS NULL OR NEW.cancel_token = '' THEN
    NEW.cancel_token := md5(random()::text || clock_timestamp()::text);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_appointment_code_and_token ON public.appointments;
CREATE TRIGGER trigger_appointment_code_and_token
  BEFORE INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_appointment_code_and_token();
