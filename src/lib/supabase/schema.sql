-- ==============================================================================
-- SCHEMA POSTGRESQL / SUPABASE: POINT DO COCO LAVA JATO LITORAL
-- Preparado para a próxima etapa (RLS, Auth, Storage e Tabelas Relacionais)
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
CREATE TYPE tipo_veiculo AS ENUM ('Moto', 'Carro pequeno', 'SUV', 'Caminhonete');
CREATE TYPE status_agendamento AS ENUM ('Agendado', 'Confirmado', 'Aguardando', 'Em atendimento', 'Finalizado', 'Cancelado');
CREATE TYPE user_role AS ENUM ('Administrador', 'Funcionário', 'Cliente');

-- 3. TABELA DE PERFIS DE USUÁRIOS
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  nome TEXT NOT NULL,
  whatsapp TEXT,
  role user_role DEFAULT 'Cliente'::user_role,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA DE CLIENTES
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA DE VEÍCULOS
CREATE TABLE IF NOT EXISTS public.veiculos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  marca TEXT,
  modelo TEXT NOT NULL,
  placa TEXT NOT NULL,
  cor TEXT,
  tipo tipo_veiculo NOT NULL DEFAULT 'Carro pequeno'::tipo_veiculo,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABELA DE SERVIÇOS (PREÇOS EDITÁVEIS PELO ADMINISTRADOR)
CREATE TABLE IF NOT EXISTS public.servicos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  numero INT NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC(10, 2) NOT NULL,
  duracao_minutos INT DEFAULT 45,
  tipo_veiculo tipo_veiculo NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABELA DE AGENDAMENTOS E ATENDIMENTOS
CREATE TABLE IF NOT EXISTS public.agendamentos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL,
  cliente_whatsapp TEXT NOT NULL,
  veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE SET NULL,
  veiculo_tipo tipo_veiculo NOT NULL,
  veiculo_modelo TEXT,
  veiculo_placa TEXT NOT NULL,
  servico_id UUID REFERENCES public.servicos(id) ON DELETE SET NULL,
  servico_nome TEXT NOT NULL,
  valor NUMERIC(10, 2) NOT NULL,
  data DATE NOT NULL,
  horario VARCHAR(5) NOT NULL, -- '08:00', '09:00', etc.
  status status_agendamento DEFAULT 'Agendado'::status_agendamento,
  box VARCHAR(50),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- POLÍTICAS DE SEGURANÇA (ROW LEVEL SECURITY - RLS)
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

-- Serviços: leitura pública para agendamento online de clientes
CREATE POLICY "Servicos sao publicos para leitura"
  ON public.servicos FOR SELECT USING (true);

-- Serviços: apenas administradores podem alterar preços
CREATE POLICY "Apenas admin edita servicos"
  ON public.servicos FOR ALL
  USING (auth.jwt() ->> 'role' = 'Administrador');

-- Agendamentos: qualquer cliente pode criar agendamento público
CREATE POLICY "Clientes podem criar agendamentos"
  ON public.agendamentos FOR INSERT WITH CHECK (true);

-- Agendamentos: equipe autenticada gerencia fila e status
CREATE POLICY "Equipe gerencia agendamentos"
  ON public.agendamentos FOR ALL
  USING (auth.role() = 'authenticated');

-- ==============================================================================
-- STORAGE BUCKETS (FUTURO: FOTOS DE CHECK-IN E VISTORIA DO CARRO)
-- ==============================================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('vistorias', 'vistorias', false);
