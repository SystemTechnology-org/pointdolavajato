-- ==============================================================================
-- ETAPA 10: CHECK-IN DO VEÍCULO + CHECKLIST + AVARIAS + FOTOS
-- Migration 017: Estrutura completa de recepção, inspeção e histórico de vistorias
-- ==============================================================================

-- 1. ADICIONAR CONFIGURAÇÃO OPERACIONAL NA TABELA BUSINESS_SETTINGS
ALTER TABLE business_settings
  ADD COLUMN IF NOT EXISTS require_checkin_to_start BOOLEAN DEFAULT true;

-- 2. TABELA PRINCIPAL DE CHECK-IN DO VEÍCULO
CREATE TABLE IF NOT EXISTS vehicle_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  mileage INTEGER, -- Quilometragem na entrada
  fuel_level TEXT, -- 'vazio', 'reserva', '1/4', '1/2', '3/4', 'cheio'
  interior_condition TEXT, -- 'otimo', 'bom', 'regular', 'ruim', 'muito_sujo'
  exterior_condition TEXT, -- 'otimo', 'bom', 'regular', 'ruim', 'muito_sujo'
  objects_left_in_vehicle TEXT, -- Objetos/pertences declarados
  general_notes TEXT, -- Observações gerais do operador
  confirmed_by UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Funcionário responsável
  confirmed_by_name TEXT, -- Snapshot do nome do conferente
  confirmed_at TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para buscas rápidas e consultas de histórico
CREATE INDEX IF NOT EXISTS idx_vehicle_checkins_appointment ON vehicle_checkins(appointment_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_checkins_vehicle ON vehicle_checkins(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_checkins_customer ON vehicle_checkins(customer_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_checkins_created_at ON vehicle_checkins(created_at DESC);

-- 3. TABELA DE ITENS DO CHECKLIST VISUAL
CREATE TABLE IF NOT EXISTS vehicle_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID NOT NULL REFERENCES vehicle_checkins(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('exterior', 'interior', 'accessories')),
  item_key TEXT NOT NULL,
  item_label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'damaged', 'missing', 'not_checked')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checklist_items_checkin ON vehicle_checklist_items(checkin_id);

-- 4. TABELA DE AVARIAS DO VEÍCULO
CREATE TABLE IF NOT EXISTS vehicle_damages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID NOT NULL REFERENCES vehicle_checkins(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'risco', 'amassado', 'trinca', 'peca_quebrada', 
    'pintura_danificada', 'vidro_danificado', 'retrovisor_danificado', 
    'roda_danificada', 'pneu_danificado', 'outro'
  )),
  location TEXT NOT NULL CHECK (location IN (
    'dianteira', 'traseira', 'lateral_esquerda', 'lateral_direita', 
    'teto', 'interior', 'porta_malas', 'rodas', 'outro'
  )),
  specific_part TEXT, -- Ex: "Porta dianteira direita", "Para-choque traseiro"
  severity TEXT NOT NULL DEFAULT 'leve' CHECK (severity IN ('leve', 'media', 'grave')),
  description TEXT NOT NULL,
  photo_url TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_damages_checkin ON vehicle_damages(checkin_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_damages_vehicle ON vehicle_damages(vehicle_id);

-- 5. TABELA DE FOTOS DE INSPEÇÃO DO VEÍCULO
CREATE TABLE IF NOT EXISTS vehicle_checkin_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID NOT NULL REFERENCES vehicle_checkins(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  photo_type TEXT NOT NULL DEFAULT 'other' CHECK (photo_type IN (
    'front', 'rear', 'left_side', 'right_side', 'interior', 'damage', 'other'
  )),
  description TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkin_photos_checkin ON vehicle_checkin_photos(checkin_id);
CREATE INDEX IF NOT EXISTS idx_checkin_photos_vehicle ON vehicle_checkin_photos(vehicle_id);

-- 6. CRIAR BUCKET DE STORAGE NO SUPABASE SE O SCHEMA STORAGE EXISTIR
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('vehicle-inspections', 'vehicle-inspections', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- 7. REGRAS DE RLS (ROW LEVEL SECURITY)
ALTER TABLE vehicle_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_damages ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_checkin_photos ENABLE ROW LEVEL SECURITY;

-- vehicle_checkins
CREATE POLICY "Leitura de check-ins para usuarios autenticados e publico"
  ON vehicle_checkins FOR SELECT
  USING (true);

CREATE POLICY "Criacao de check-ins por equipe"
  ON vehicle_checkins FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Atualizacao de check-ins por gerentes e administradores"
  ON vehicle_checkins FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'owner', 'manager')
    ) OR auth.role() = 'anon'
  );

CREATE POLICY "Remocao de check-ins somente por administradores"
  ON vehicle_checkins FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'owner')
    )
  );

-- vehicle_checklist_items
CREATE POLICY "Leitura de itens do checklist"
  ON vehicle_checklist_items FOR SELECT USING (true);

CREATE POLICY "Insercao de itens do checklist"
  ON vehicle_checklist_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Atualizacao de itens do checklist"
  ON vehicle_checklist_items FOR UPDATE USING (true);

CREATE POLICY "Remocao de itens do checklist por gerentes e administradores"
  ON vehicle_checklist_items FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'owner', 'manager')
    ) OR auth.role() = 'anon'
  );

-- vehicle_damages
CREATE POLICY "Leitura de avarias"
  ON vehicle_damages FOR SELECT USING (true);

CREATE POLICY "Insercao de avarias"
  ON vehicle_damages FOR INSERT WITH CHECK (true);

CREATE POLICY "Atualizacao de avarias por gerentes e administradores"
  ON vehicle_damages FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'owner', 'manager')
    ) OR auth.role() = 'anon'
  );

CREATE POLICY "Remocao de avarias por gerentes e administradores"
  ON vehicle_damages FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'owner', 'manager')
    ) OR auth.role() = 'anon'
  );

-- vehicle_checkin_photos
CREATE POLICY "Leitura de fotos de inspecao"
  ON vehicle_checkin_photos FOR SELECT USING (true);

CREATE POLICY "Insercao de fotos de inspecao"
  ON vehicle_checkin_photos FOR INSERT WITH CHECK (true);

CREATE POLICY "Remocao de fotos por gerentes e administradores"
  ON vehicle_checkin_photos FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'owner', 'manager')
    ) OR auth.role() = 'anon'
  );
