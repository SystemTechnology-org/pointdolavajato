-- ==============================================================================
-- 009_rls_and_policies.sql: Políticas de Segurança (Row Level Security)
-- ==============================================================================

-- 1. Ativar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;

-- 2. Funções auxiliares de checagem de autorização
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() AND active = TRUE;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(public.current_user_role() = 'admin'::user_role, FALSE);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(public.current_user_role() IN ('admin'::user_role, 'employee'::user_role, 'owner'::user_role, 'manager'::user_role), FALSE);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. POLÍTICAS: PROFILES
DROP POLICY IF EXISTS "Usuarios visualizam proprio perfil" ON public.profiles;
CREATE POLICY "Usuarios visualizam proprio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Usuarios atualizam proprio perfil" ON public.profiles;
CREATE POLICY "Usuarios atualizam proprio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Apenas admin gerencia perfis completos" ON public.profiles;
CREATE POLICY "Apenas admin gerencia perfis completos"
  ON public.profiles FOR ALL
  USING (public.is_admin());

-- 4. POLÍTICAS: SERVICES (Leitura pública para catálogo, escrita restrita)
DROP POLICY IF EXISTS "Qualquer um visualiza servicos ativos" ON public.services;
CREATE POLICY "Qualquer um visualiza servicos ativos"
  ON public.services FOR SELECT
  USING (active = TRUE OR public.is_staff());

DROP POLICY IF EXISTS "Equipe autenticada gerencia servicos" ON public.services;
CREATE POLICY "Equipe autenticada gerencia servicos"
  ON public.services FOR ALL
  USING (public.is_staff());

-- 5. POLÍTICAS: BUSINESS_SETTINGS & BUSINESS_HOURS (Leitura pública, escrita admin)
DROP POLICY IF EXISTS "Configuracoes publicas para leitura" ON public.business_settings;
CREATE POLICY "Configuracoes publicas para leitura"
  ON public.business_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Apenas admin atualiza configuracoes" ON public.business_settings;
CREATE POLICY "Apenas admin atualiza configuracoes"
  ON public.business_settings FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Horarios publicos para leitura" ON public.business_hours;
CREATE POLICY "Horarios publicos para leitura"
  ON public.business_hours FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Apenas admin atualiza horarios" ON public.business_hours;
CREATE POLICY "Apenas admin atualiza horarios"
  ON public.business_hours FOR ALL
  USING (public.is_admin());

-- 6. POLÍTICAS: SCHEDULE_BLOCKS (Leitura pública para bloqueio de agenda)
DROP POLICY IF EXISTS "Visualizacao publica de bloqueios" ON public.schedule_blocks;
CREATE POLICY "Visualizacao publica de bloqueios"
  ON public.schedule_blocks FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Equipe gerencia bloqueios" ON public.schedule_blocks;
CREATE POLICY "Equipe gerencia bloqueios"
  ON public.schedule_blocks FOR ALL
  USING (public.is_staff());

-- 7. POLÍTICAS: CUSTOMERS & VEHICLES (Apenas equipe autenticada no painel)
DROP POLICY IF EXISTS "Equipe gerencia clientes" ON public.customers;
CREATE POLICY "Equipe gerencia clientes"
  ON public.customers FOR ALL
  USING (public.is_staff());

DROP POLICY IF EXISTS "Equipe gerencia veiculos" ON public.vehicles;
CREATE POLICY "Equipe gerencia veiculos"
  ON public.vehicles FOR ALL
  USING (public.is_staff());

-- 8. POLÍTICAS: APPOINTMENTS
DROP POLICY IF EXISTS "Equipe gerencia agendamentos" ON public.appointments;
CREATE POLICY "Equipe gerencia agendamentos"
  ON public.appointments FOR ALL
  USING (public.is_staff());
