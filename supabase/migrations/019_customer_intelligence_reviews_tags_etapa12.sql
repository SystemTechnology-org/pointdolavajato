-- ==============================================================================
-- ETAPA 12: AVALIAÇÕES, RETENÇÃO, FIDELIZAÇÃO E INTELIGÊNCIA DE CLIENTES
-- Migration 019: Tabelas de avaliações, tags de clientes e configurações de retenção/VIP
-- Point do Coco Lava Jato
-- ==============================================================================

-- 1. TABELA DE AVALIAÇÕES DE ATENDIMENTO (SERVICE_REVIEWS)
CREATE TABLE IF NOT EXISTS public.service_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL UNIQUE REFERENCES public.appointments(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW())
);

-- Trigger de updated_at para service_reviews
DROP TRIGGER IF EXISTS trigger_service_reviews_updated_at ON public.service_reviews;
CREATE TRIGGER trigger_service_reviews_updated_at
  BEFORE UPDATE ON public.service_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Índices de performance para service_reviews
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON public.service_reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.service_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.service_reviews(created_at);

-- 2. TABELA DE TAGS DISPONÍVEIS (CUSTOMER_TAGS)
CREATE TABLE IF NOT EXISTS public.customer_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE CHECK (char_length(trim(name)) > 0),
  color TEXT NOT NULL DEFAULT '#10B981',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW())
);

-- Inserir tags padrão iniciais se não existirem
INSERT INTO public.customer_tags (name, color, description)
VALUES
  ('VIP', '#EAB308', 'Cliente de alto valor ou alta frequência'),
  ('Recorrente', '#10B981', 'Cliente frequente com múltiplos atendimentos'),
  ('Novo', '#38BDF8', 'Cliente em seu primeiro atendimento'),
  ('Inativo', '#94A3B8', 'Cliente sem retorno há mais de 60 dias'),
  ('Frotista / Empresa', '#A855F7', 'Atendimento corporativo ou frotas'),
  ('Indicado', '#F97316', 'Cliente indicado por parceiro ou amigo')
ON CONFLICT (name) DO NOTHING;

-- 3. TABELA DE VINCULAÇÃO DE TAGS AOS CLIENTES (CUSTOMER_TAG_ASSIGNMENTS)
CREATE TABLE IF NOT EXISTS public.customer_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW()),
  UNIQUE (customer_id, tag_name)
);

CREATE INDEX IF NOT EXISTS idx_tag_assignments_customer ON public.customer_tag_assignments(customer_id);
CREATE INDEX IF NOT EXISTS idx_tag_assignments_tag ON public.customer_tag_assignments(tag_name);

-- 4. ADICIONAR PARÂMETROS VIP E DE INATIVIDADE EM BUSINESS_SETTINGS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_settings' AND column_name = 'vip_min_spent'
  ) THEN
    ALTER TABLE public.business_settings ADD COLUMN vip_min_spent NUMERIC(10,2) NOT NULL DEFAULT 500.00;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_settings' AND column_name = 'vip_min_visits'
  ) THEN
    ALTER TABLE public.business_settings ADD COLUMN vip_min_visits INTEGER NOT NULL DEFAULT 10;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_settings' AND column_name = 'inactive_threshold_days'
  ) THEN
    ALTER TABLE public.business_settings ADD COLUMN inactive_threshold_days INTEGER NOT NULL DEFAULT 60;
  END IF;
END $$;

-- 5. ÍNDICES DE BUSCA E PERFORMANCE PARA ANÁLISE DE CLIENTES E ATENDIMENTOS (Requisito 30)
CREATE INDEX IF NOT EXISTS idx_appointments_customer_status
  ON public.appointments(customer_id, status);

CREATE INDEX IF NOT EXISTS idx_appointments_vehicle_status
  ON public.appointments(vehicle_id, status);

CREATE INDEX IF NOT EXISTS idx_payments_app_status
  ON public.payments(appointment_id, status);

-- 6. POLÍTICAS DE RLS (ROW LEVEL SECURITY)
ALTER TABLE public.service_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_tag_assignments ENABLE ROW LEVEL SECURITY;

-- Service Reviews: Leitura para usuários autenticados, Escrita conforme permissão
DROP POLICY IF EXISTS "service_reviews_read_policy" ON public.service_reviews;
CREATE POLICY "service_reviews_read_policy"
  ON public.service_reviews
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "service_reviews_write_policy" ON public.service_reviews;
CREATE POLICY "service_reviews_write_policy"
  ON public.service_reviews
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Customer Tags: Leitura para todos, edição para autenticados
DROP POLICY IF EXISTS "customer_tags_read_policy" ON public.customer_tags;
CREATE POLICY "customer_tags_read_policy"
  ON public.customer_tags
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "customer_tag_assignments_policy" ON public.customer_tag_assignments;
CREATE POLICY "customer_tag_assignments_policy"
  ON public.customer_tag_assignments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
