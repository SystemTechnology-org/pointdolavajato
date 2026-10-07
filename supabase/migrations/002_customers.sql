-- ==============================================================================
-- 002_customers.sql: Tabela de Clientes
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL CHECK (char_length(trim(full_name)) > 1),
  phone TEXT NOT NULL CHECK (char_length(trim(phone)) >= 8),
  email TEXT CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('America/Bahia', NOW())
);

-- Trigger de updated_at
DROP TRIGGER IF EXISTS trigger_customers_updated_at ON public.customers;
CREATE TRIGGER trigger_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Impedir clientes duplicados facilmente pelo mesmo telefone (apenas números normalizados)
CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_phone_normalized
  ON public.customers (regexp_replace(phone, '\D', '', 'g'))
  WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(full_name);
CREATE INDEX IF NOT EXISTS idx_customers_active ON public.customers(active);
