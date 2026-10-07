-- ==============================================================================
-- 007_business_hours.sql: Horários de Funcionamento Editáveis por Dia da Semana
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week SMALLINT NOT NULL UNIQUE CHECK (day_of_week BETWEEN 0 AND 6),
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  opening_time TIME NOT NULL DEFAULT '08:00',
  closing_time TIME NOT NULL DEFAULT '18:00',
  break_start TIME,
  break_end TIME
);

CREATE INDEX IF NOT EXISTS idx_business_hours_day ON public.business_hours(day_of_week);
