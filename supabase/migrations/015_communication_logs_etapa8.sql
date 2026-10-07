-- ==============================================================================
-- 015_communication_logs_etapa8.sql: Registro de Comunicação e WhatsApp
-- ETAPA 8 — Point do Coco Lava Jato
-- ==============================================================================

-- 1. TABELA DE LOGS DE COMUNICAÇÃO
CREATE TABLE IF NOT EXISTS public.communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'sms', 'email')),
  type TEXT NOT NULL CHECK (type IN (
    'general',
    'confirmation',
    'reminder',
    'waiting',
    'in_progress',
    'completed',
    'payment_pending'
  )),
  message_preview TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'opened' CHECK (status IN ('prepared', 'opened', 'sent', 'failed')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW())
);

-- Índices para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_communication_logs_customer ON public.communication_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_appointment ON public.communication_logs(appointment_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_created_at ON public.communication_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_communication_logs_type ON public.communication_logs(type);
CREATE INDEX IF NOT EXISTS idx_communication_logs_status ON public.communication_logs(status);

-- 2. POLÍTICAS DE RLS
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados (equipe do lava jato) podem visualizar os logs
DROP POLICY IF EXISTS "Staff can view communication logs" ON public.communication_logs;
CREATE POLICY "Staff can view communication logs"
  ON public.communication_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Usuários autenticados podem inserir novos logs
DROP POLICY IF EXISTS "Staff can insert communication logs" ON public.communication_logs;
CREATE POLICY "Staff can insert communication logs"
  ON public.communication_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. PREPARAÇÃO PARA AUTOMAÇÕES FUTURAS EM BUSINESS_SETTINGS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_settings' AND column_name = 'whatsapp_enabled'
  ) THEN
    ALTER TABLE public.business_settings ADD COLUMN whatsapp_enabled BOOLEAN NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_settings' AND column_name = 'automatic_confirmation'
  ) THEN
    ALTER TABLE public.business_settings ADD COLUMN automatic_confirmation BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_settings' AND column_name = 'automatic_reminder'
  ) THEN
    ALTER TABLE public.business_settings ADD COLUMN automatic_reminder BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_settings' AND column_name = 'automatic_completion_message'
  ) THEN
    ALTER TABLE public.business_settings ADD COLUMN automatic_completion_message BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_settings' AND column_name = 'automatic_payment_reminder'
  ) THEN
    ALTER TABLE public.business_settings ADD COLUMN automatic_payment_reminder BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_settings' AND column_name = 'instagram_url'
  ) THEN
    ALTER TABLE public.business_settings ADD COLUMN instagram_url TEXT DEFAULT 'https://instagram.com/pointdococolavajato';
  END IF;
END $$;
