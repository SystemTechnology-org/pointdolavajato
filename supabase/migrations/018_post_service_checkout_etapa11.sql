-- ==============================================================================
-- ETAPA 11: PÓS-ATENDIMENTO, CONFERÊNCIA FINAL, ENTREGA DO VEÍCULO E FECHAMENTO
-- Migration 018: Extensão de status, timestamps operacionais, conferência e entrega
-- ==============================================================================

-- 1. EXTENSÃO DO ENUM DE STATUS DE AGENDAMENTO NO POSTGRESQL (SE EXISTIR)
DO $$
BEGIN
  -- Adiciona os novos status operacionais ao ENUM appointment_status se o enum existir
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
    BEGIN
      ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'ready';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'awaiting_payment';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'awaiting_pickup';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'delivered';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- 2. ADICIONAR CAMPOS OPERACIONAIS DE FINALIZAÇÃO E ENTREGA EM APPOINTMENTS
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ready_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ready_by_name TEXT,
  ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS completed_by_name TEXT,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivered_by_name TEXT,
  ADD COLUMN IF NOT EXISTS checkout_checklist JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS final_notes TEXT,
  ADD COLUMN IF NOT EXISTS final_rating SMALLINT CHECK (final_rating >= 1 AND final_rating <= 5),
  ADD COLUMN IF NOT EXISTS final_feedback TEXT,
  ADD COLUMN IF NOT EXISTS delivery_override_reason TEXT;

-- 3. ÍNDICES DE PERFORMANCE PARA RETIRADA E FECHAMENTO
CREATE INDEX IF NOT EXISTS idx_appointments_ready_delivered
  ON public.appointments(ready_at, delivered_at);

CREATE INDEX IF NOT EXISTS idx_appointments_status_date
  ON public.appointments(status, scheduled_date);

-- 4. ATUALIZAR CONSTRAINT DE PHOTO_TYPE EM VEHICLE_CHECKIN_PHOTOS PARA PERMITIR FOTOS FINAIS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vehicle_checkin_photos') THEN
    -- Adicionar coluna appointment_id se ainda não existir
    ALTER TABLE public.vehicle_checkin_photos
      ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE;

    -- Atualizar check constraint de photo_type para incluir fotos de saída
    ALTER TABLE public.vehicle_checkin_photos
      DROP CONSTRAINT IF EXISTS vehicle_checkin_photos_photo_type_check;

    ALTER TABLE public.vehicle_checkin_photos
      ADD CONSTRAINT vehicle_checkin_photos_photo_type_check
      CHECK (photo_type IN (
        'front', 'rear', 'left_side', 'right_side', 'interior', 'damage', 'other',
        'final_front', 'final_rear', 'final_left', 'final_right', 'final_interior', 'final_other'
      ));

    CREATE INDEX IF NOT EXISTS idx_checkin_photos_appointment
      ON public.vehicle_checkin_photos(appointment_id);
  END IF;
END $$;

-- 5. TRIGGER DE HISTÓRICO PARA OS NOVOS STATUS
CREATE OR REPLACE FUNCTION public.handle_appointment_status_change_etapa11()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Timestamps automáticos se ainda vazios
    IF NEW.status = 'ready' AND NEW.ready_at IS NULL THEN
      NEW.ready_at := TIMEZONE('America/Bahia', NOW());
    ELSIF NEW.status = 'delivered' AND NEW.delivered_at IS NULL THEN
      NEW.delivered_at := TIMEZONE('America/Bahia', NOW());
    ELSIF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN
      NEW.completed_at := TIMEZONE('America/Bahia', NOW());
    END IF;

    -- Inserir na tabela de histórico se ela existir
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointment_status_history') THEN
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
        COALESCE(NEW.delivered_by, NEW.ready_by, NEW.completed_by),
        TIMEZONE('America/Bahia', NOW()),
        NEW.final_notes
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_appointment_status_change_etapa11 ON public.appointments;
CREATE TRIGGER trigger_appointment_status_change_etapa11
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_appointment_status_change_etapa11();
