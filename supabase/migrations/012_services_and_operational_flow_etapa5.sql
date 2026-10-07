-- ==============================================================================
-- 012_services_and_operational_flow_etapa5.sql: ETAPA 5 — Gestão de Serviços e Fluxo de Atendimento
-- Adiciona timestamps operacionais, motivo de cancelamento, checklist e histórico
-- de status para os agendamentos do Point do Coco Lava Jato.
-- ==============================================================================

-- 1. ADICIONAR CAMPOS OPERACIONAIS EM APPOINTMENTS
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS no_show_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS vehicle_photos JSONB DEFAULT '[]'::jsonb;

-- 2. TABELA DE HISTÓRICO DE MUDANÇAS DE STATUS (Requisito 20)
CREATE TABLE IF NOT EXISTS public.appointment_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  old_status appointment_status,
  new_status appointment_status NOT NULL,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW()),
  notes TEXT
);

-- 3. ÍNDICES DE PERFORMANCE PARA FLUXO OPERACIONAL
CREATE INDEX IF NOT EXISTS idx_status_history_appointment
  ON public.appointment_status_history(appointment_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_appointments_started_completed
  ON public.appointments(started_at, completed_at);

CREATE INDEX IF NOT EXISTS idx_appointments_today_flow
  ON public.appointments(scheduled_date, status, start_time);

-- 4. TRIGGER PARA REGISTRO AUTOMÁTICO DE TIMESTAMPS E HISTÓRICO
CREATE OR REPLACE FUNCTION public.handle_appointment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o status mudou ou se é uma nova inserção
  IF (TG_OP = 'INSERT') OR (OLD.status IS DISTINCT FROM NEW.status) THEN
    
    -- Atualizar timestamps de acordo com o novo status caso ainda não estejam definidos
    IF NEW.status = 'confirmed' AND NEW.confirmed_at IS NULL THEN
      NEW.confirmed_at := TIMEZONE('America/Bahia', NOW());
    ELSIF NEW.status = 'in_progress' AND NEW.started_at IS NULL THEN
      NEW.started_at := TIMEZONE('America/Bahia', NOW());
    ELSIF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN
      NEW.completed_at := TIMEZONE('America/Bahia', NOW());
    ELSIF NEW.status = 'cancelled' AND NEW.cancelled_at IS NULL THEN
      NEW.cancelled_at := TIMEZONE('America/Bahia', NOW());
    ELSIF NEW.status = 'no_show' AND NEW.no_show_at IS NULL THEN
      NEW.no_show_at := TIMEZONE('America/Bahia', NOW());
    END IF;

    -- Registrar histórico de transição
    INSERT INTO public.appointment_status_history (
      appointment_id,
      old_status,
      new_status,
      changed_by,
      changed_at,
      notes
    ) VALUES (
      NEW.id,
      CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
      NEW.status,
      NEW.created_by,
      TIMEZONE('America/Bahia', NOW()),
      CASE 
        WHEN NEW.status = 'cancelled' AND NEW.cancellation_reason IS NOT NULL 
          THEN 'Cancelado: ' || NEW.cancellation_reason
        ELSE NULL
      END
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_appointment_status_change ON public.appointments;
CREATE TRIGGER trigger_appointment_status_change
  BEFORE INSERT OR UPDATE OF status ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_appointment_status_change();

-- 5. POLÍTICAS DE SEGURANÇA (RLS) PARA O HISTÓRICO DE STATUS
ALTER TABLE public.appointment_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Equipe visualiza historico de status" ON public.appointment_status_history;
CREATE POLICY "Equipe visualiza historico de status"
  ON public.appointment_status_history FOR SELECT
  USING (public.is_staff());

DROP POLICY IF EXISTS "Equipe insere historico de status" ON public.appointment_status_history;
CREATE POLICY "Equipe insere historico de status"
  ON public.appointment_status_history FOR INSERT
  WITH CHECK (public.is_staff());
