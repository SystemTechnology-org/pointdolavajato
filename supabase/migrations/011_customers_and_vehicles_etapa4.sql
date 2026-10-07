-- ==============================================================================
-- 011_customers_and_vehicles_etapa4.sql: ETAPA 4 — Gestão de Clientes e Veículos
-- Torna a placa opcional na tabela vehicles (permitindo motocicletas sem placa),
-- adiciona índices de busca para placa normalizada e novos clientes,
-- e reforça políticas para gestão completa.
-- ==============================================================================

-- 1. TORNAR PLACA OPCIONAL EM VEHICLES (Requisitos 6 e 14)
ALTER TABLE public.vehicles
  ALTER COLUMN plate DROP NOT NULL;

ALTER TABLE public.vehicles
  DROP CONSTRAINT IF EXISTS vehicles_plate_check;

ALTER TABLE public.vehicles
  ADD CONSTRAINT vehicles_plate_check
  CHECK (plate IS NULL OR char_length(trim(plate)) >= 3);

-- 2. ÍNDICE DE PERFORMANCE PARA BUSCA DE PLACA NORMALIZADA (Requisito 24)
CREATE INDEX IF NOT EXISTS idx_vehicles_plate_normalized
  ON public.vehicles (UPPER(REGEXP_REPLACE(plate, '\s|-', '', 'g')))
  WHERE active = TRUE AND plate IS NOT NULL;

-- 3. ÍNDICES PARA NOVOS CLIENTES E VEÍCULOS NO DASHBOARD (Requisito 25)
CREATE INDEX IF NOT EXISTS idx_customers_created_at
  ON public.customers(created_at);

CREATE INDEX IF NOT EXISTS idx_vehicles_created_at
  ON public.vehicles(created_at);

CREATE INDEX IF NOT EXISTS idx_appointments_completed_revenue
  ON public.appointments(customer_id, status, price)
  WHERE status = 'completed';
