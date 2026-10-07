-- ==============================================================================
-- 016_settings_users_audit_etapa9.sql: Configurações, Usuários, Permissões e Auditoria
-- ETAPA 9 — Point do Coco Lava Jato
-- ==============================================================================

-- 1. EXPANSÃO DA TABELA BUSINESS_SETTINGS
DO $$
BEGIN
  -- Dados Cadastrais da Empresa
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'commercial_name') THEN
    ALTER TABLE public.business_settings ADD COLUMN commercial_name TEXT DEFAULT 'Point do Coco';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'email') THEN
    ALTER TABLE public.business_settings ADD COLUMN email TEXT DEFAULT 'contato@pointdococo.com.br';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'address_number') THEN
    ALTER TABLE public.business_settings ADD COLUMN address_number TEXT DEFAULT 'S/N';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'address_complement') THEN
    ALTER TABLE public.business_settings ADD COLUMN address_complement TEXT DEFAULT 'Entrada do bosque';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'neighborhood') THEN
    ALTER TABLE public.business_settings ADD COLUMN neighborhood TEXT DEFAULT 'Guaraípe';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'city') THEN
    ALTER TABLE public.business_settings ADD COLUMN city TEXT DEFAULT 'Litoral Norte';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'state') THEN
    ALTER TABLE public.business_settings ADD COLUMN state TEXT DEFAULT 'BA';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'postal_code') THEN
    ALTER TABLE public.business_settings ADD COLUMN postal_code TEXT DEFAULT '42840-000';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'description') THEN
    ALTER TABLE public.business_settings ADD COLUMN description TEXT DEFAULT 'Lava Jato especializado em cuidados automotivos de alto padrão no Litoral Norte.';
  END IF;

  -- Regras e Intervalos de Agendamento
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'minimum_advance_minutes') THEN
    ALTER TABLE public.business_settings ADD COLUMN minimum_advance_minutes INTEGER NOT NULL DEFAULT 30;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'maximum_advance_days') THEN
    ALTER TABLE public.business_settings ADD COLUMN maximum_advance_days INTEGER NOT NULL DEFAULT 30;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'cancellation_deadline_minutes') THEN
    ALTER TABLE public.business_settings ADD COLUMN cancellation_deadline_minutes INTEGER NOT NULL DEFAULT 120;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'allow_rescheduling') THEN
    ALTER TABLE public.business_settings ADD COLUMN allow_rescheduling BOOLEAN NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'reschedule_deadline_minutes') THEN
    ALTER TABLE public.business_settings ADD COLUMN reschedule_deadline_minutes INTEGER NOT NULL DEFAULT 120;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'buffer_between_services_minutes') THEN
    ALTER TABLE public.business_settings ADD COLUMN buffer_between_services_minutes INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'allow_overbooking') THEN
    ALTER TABLE public.business_settings ADD COLUMN allow_overbooking BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'allow_same_day_booking') THEN
    ALTER TABLE public.business_settings ADD COLUMN allow_same_day_booking BOOLEAN NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'allow_booking_without_plate') THEN
    ALTER TABLE public.business_settings ADD COLUMN allow_booking_without_plate BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'require_phone') THEN
    ALTER TABLE public.business_settings ADD COLUMN require_phone BOOLEAN NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'require_name') THEN
    ALTER TABLE public.business_settings ADD COLUMN require_name BOOLEAN NOT NULL DEFAULT true;
  END IF;

  -- Preferências de Sistema
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'currency') THEN
    ALTER TABLE public.business_settings ADD COLUMN currency TEXT NOT NULL DEFAULT 'BRL';
  END IF;
END $$;


-- 2. TABELA DE AUDITORIA (AUDIT LOGS)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW())
);

-- Índices da Tabela de Auditoria
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);


-- 3. TRIGGER DE PROTEÇÃO DO ÚLTIMO ADMINISTRADOR ATIVO
CREATE OR REPLACE FUNCTION public.check_last_admin_protection()
RETURNS TRIGGER AS $$
DECLARE
  active_admin_count INTEGER;
BEGIN
  -- Se o registro atual for admin/owner e estiver ativo
  IF (OLD.role IN ('admin'::user_role, 'owner'::user_role) AND OLD.active = TRUE) THEN
    -- E a alteração desativá-lo ou remover o papel administrativo
    IF (NEW.active = FALSE OR NEW.role NOT IN ('admin'::user_role, 'owner'::user_role)) THEN
      SELECT COUNT(*) INTO active_admin_count
      FROM public.profiles
      WHERE role IN ('admin'::user_role, 'owner'::user_role)
        AND active = TRUE
        AND id <> OLD.id;

      IF active_admin_count = 0 THEN
        RAISE EXCEPTION 'É necessário manter pelo menos um administrador ativo.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_last_admin ON public.profiles;
CREATE TRIGGER trigger_check_last_admin
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_last_admin_protection();


-- 4. POLÍTICAS DE RLS PARA AUDIT_LOGS E ROLES
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Usuários autorizados da equipe podem registrar logs de auditoria
DROP POLICY IF EXISTS "Staff can insert audit logs" ON public.audit_logs;
CREATE POLICY "Staff can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Apenas administradores podem ler os logs de auditoria
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Bloqueio estrito de UPDATE e DELETE em audit_logs (Tabela estritamente imutável)
-- Nenhuma policy de UPDATE ou DELETE é criada, garantindo integridade forense.
