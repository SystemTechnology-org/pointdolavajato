-- ==============================================================================
-- seed.sql: Dados Iniciais Oficiais do Point do Coco Lava Jato
-- Apenas: Serviços Reais, Configurações Básicas e Horários Iniciais
-- ==============================================================================

-- 1. SERVIÇOS OFICIAIS DO POINT DO COCO (Com preços e durações razoáveis)
INSERT INTO public.services (id, name, description, vehicle_type, price, duration_minutes, active)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Lavagem simples de moto',
    'Limpeza técnica da lataria, rodas, motor e secagem especializada.',
    'moto',
    30.00,
    35,
    TRUE
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Lavagem + aspiração de carro pequeno simples',
    'Lavagem técnica da lataria, secagem, limpeza de vidros e aspiração interna.',
    'car_small',
    40.00,
    45,
    TRUE
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'Lavagem + aspiração + cera líquida + hidratação de carro pequeno',
    'Tratamento completo com cera líquida de alto brilho e hidratação de plásticos/painel.',
    'car_small',
    60.00,
    60,
    TRUE
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'Lavagem + aspiração de carro SUV simples',
    'Lavagem da carroceria, rodas, caixas de roda e aspiração interna detalhada.',
    'suv',
    60.00,
    50,
    TRUE
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    'Lavagem + aspiração + cera líquida + hidratação de carro SUV',
    'Lavagem premium, cera líquida protetora, hidratação de plásticos e acabamentos.',
    'suv',
    80.00,
    75,
    TRUE
  ),
  (
    '00000000-0000-0000-0000-000000000006',
    'Lavagem + aspiração de caminhonete simples',
    'Limpeza pesada externa, caçamba, rodas e aspiração interna completa.',
    'pickup',
    80.00,
    60,
    TRUE
  ),
  (
    '00000000-0000-0000-0000-000000000007',
    'Lavagem + aspiração + cera líquida + hidratação de caminhonete',
    'Serviço master com proteção de pintura em cera líquida e hidratação de plásticos/borrachas.',
    'pickup',
    100.00,
    90,
    TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  vehicle_type = EXCLUDED.vehicle_type,
  price = EXCLUDED.price,
  duration_minutes = EXCLUDED.duration_minutes,
  active = EXCLUDED.active;

-- 2. CONFIGURAÇÕES BÁSICAS DO ESTABELECIMENTO
INSERT INTO public.business_settings (id, business_name, whatsapp, address, logo_url, timezone, appointment_interval)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  'Point do Coco Lava Jato',
  '(71) 9 9288-7645',
  NULL, -- Endereço vazio inicialmente conforme regra da Etapa 2
  '/images/logo.png',
  'America/Bahia',
  30
)
ON CONFLICT (id) DO NOTHING;

-- 3. HORÁRIOS DE FUNCIONAMENTO (Segunda a Sábado abertos, Domingo fechado)
INSERT INTO public.business_hours (day_of_week, is_open, opening_time, closing_time)
VALUES
  (0, FALSE, '08:00', '12:00'), -- Domingo (fechado)
  (1, TRUE,  '08:00', '18:00'), -- Segunda
  (2, TRUE,  '08:00', '18:00'), -- Terça
  (3, TRUE,  '08:00', '18:00'), -- Quarta
  (4, TRUE,  '08:00', '18:00'), -- Quinta
  (5, TRUE,  '08:00', '18:00'), -- Sexta
  (6, TRUE,  '08:00', '18:00')  -- Sábado
ON CONFLICT (day_of_week) DO UPDATE SET
  is_open = EXCLUDED.is_open,
  opening_time = EXCLUDED.opening_time,
  closing_time = EXCLUDED.closing_time;
