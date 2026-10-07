-- ==============================================================================
-- 008_schedule_blocks.sql: Bloqueios de Agenda (Feriados, Manutenções, Folgas)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL CHECK (end_datetime > start_datetime),
  reason TEXT NOT NULL CHECK (char_length(trim(reason)) > 1),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW())
);

CREATE INDEX IF NOT EXISTS idx_schedule_blocks_range ON public.schedule_blocks(start_datetime, end_datetime);
