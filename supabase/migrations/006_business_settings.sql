-- ==============================================================================
-- 006_business_settings.sql: Configurações Gerais do Lava Jato
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL DEFAULT 'Point do Coco Lava Jato',
  phone TEXT,
  whatsapp TEXT NOT NULL DEFAULT '(71) 9 9288-7645',
  address TEXT, -- Fica vazio inicialmente até ser configurado pelo administrador
  logo_url TEXT DEFAULT '/images/logo.png',
  timezone TEXT NOT NULL DEFAULT 'America/Bahia',
  appointment_interval INTEGER NOT NULL DEFAULT 30 CHECK (appointment_interval > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW())
);

-- Trigger de updated_at
DROP TRIGGER IF EXISTS trigger_settings_updated_at ON public.business_settings;
CREATE TRIGGER trigger_settings_updated_at
  BEFORE UPDATE ON public.business_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
