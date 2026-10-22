-- ============================================================================
-- Nath Ramos Personal Trainer — Migration 000013
-- Objetivo:
--   Popular o catálogo de SUPLEMENTOS (public.supplements) com dados de exemplo
--   bilíngues (pt/en) e imagens ilustrativas. Idempotente: ignora registros cujo
--   name_pt já existe.
-- Depende de: 000001 (tabela supplements, set_updated_at)
-- Como usar: Copie 100% deste conteúdo no Supabase > SQL Editor > RUN
-- ============================================================================

insert into public.supplements (
  name_pt, name_en, category_pt, category_en,
  description_pt, description_en,
  serving_size, serving_unit,
  suggested_times_pt, suggested_times_en,
  benefits_pt, benefits_en,
  contraindications_pt, contraindications_en,
  brand, image_url, is_active
)
select
  v.name_pt, v.name_en, v.category_pt, v.category_en,
  v.description_pt, v.description_en,
  v.serving_size, v.serving_unit,
  v.suggested_times_pt, v.suggested_times_en,
  v.benefits_pt, v.benefits_en,
  v.contraindications_pt, v.contraindications_en,
  v.brand, v.image_url, true
from (values
  (
    'Whey Protein Concentrado',
    'Whey Protein Concentrate',
    'Proteínas', 'Proteins',
    'Proteína do soro do leite de rápida absorção, ideal para recuperação muscular.',
    'Fast-absorbing milk protein, ideal for muscle recovery.',
    30.00, 'g',
    array['Café da manhã', 'Pós-treino']::text[],
    array['Breakfast', 'Post-workout']::text[],
    array['Recuperação muscular', 'Aumento da massa magra', 'Saciedade']::text[],
    array['Muscle recovery', 'Lean mass gain', 'Satiety']::text[],
    array['Intolerantes à lactose', 'Alergia à proteína do leite']::text[],
    array['Lactose intolerant', 'Milk protein allergy']::text[],
    'Growth',
    'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=whey%20protein%20concentrate%20powder%20tub%20product%20photo%20dark%20background&image_size=square'
  ),
  (
    'Creatina Monohidratada',
    'Creatine Monohydrate',
    'Performance', 'Performance',
    'Suplemento mais estudado para força e potência muscular. Uso diário contínuo.',
    'The most studied supplement for strength and power. Continuous daily use.',
    5.00, 'g',
    array['Qualquer horário']::text[],
    array['Any time']::text[],
    array['Ganho de força', 'Mais volume muscular', 'Melhora em exercícios intensos']::text[],
    array['Strength gains', 'Muscle volume', 'Better intense exercise performance']::text[],
    array['Doença renal pré-existente (consultar médico)']::text[],
    array['Pre-existing kidney disease (consult a doctor)']::text[],
    'Growth',
    'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=creatine%20monohydrate%20powder%20jar%20product%20photo%20dark%20background&image_size=square'
  ),
  (
    'Cafeína Anidra',
    'Anhydrous Caffeine',
    'Pré-treino', 'Pre-workout',
    'Estimulante que aumenta o foco, a disposição e o desempenho no treino.',
    'Stimulant that boosts focus, alertness and workout performance.',
    200.00, 'mg',
    array['30 a 40 minutos antes do treino']::text[],
    array['30 to 40 minutes before training']::text[],
    array['Mais foco', 'Menor percepção de esforço', 'Mais energia']::text[],
    array['Increased focus', 'Lower perceived effort', 'More energy']::text[],
    array['Hipertensão', 'Arritmias', 'Insônia', 'Sensibilidade à cafeína']::text[],
    array['Hypertension', 'Arrhythmia', 'Insomnia', 'Caffeine sensitivity']::text[],
    'Integralmédica',
    'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=caffeine%20capsules%20supplement%20bottle%20product%20photo%20dark%20background&image_size=square'
  ),
  (
    'Beta-Alanina',
    'Beta-Alanine',
    'Performance', 'Performance',
    'Precursor de carnosina, auxilia na resistência em esforços de alta intensidade.',
    'Carnosine precursor, helps endurance in high-intensity efforts.',
    3.20, 'g',
    array['Qualquer horário']::text[],
    array['Any time']::text[],
    array['Mais resistência muscular', 'Menos fadiga em séries longas']::text[],
    array['Muscular endurance', 'Less fatigue in long sets']::text[],
    array['Parestesia (formigamento) em doses altas']::text[],
    array['Paresthesia (tingling) at high doses']::text[],
    'Max Titanium',
    'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=beta%20alanine%20supplement%20powder%20container%20product%20photo%20dark%20background&image_size=square'
  ),
  (
    'Glutamina',
    'Glutamine',
    'Aminoácidos', 'Amino Acids',
    'Aminoácido condicionalmente essencial, apoio à recuperação e à saúde intestinal.',
    'Conditionally essential amino acid, supports recovery and gut health.',
    5.00, 'g',
    array['Pós-treino', 'Antes de dormir']::text[],
    array['Post-workout', 'Before bed']::text[],
    array['Recuperação muscular', 'Saúde intestinal', 'Suporte imunológico']::text[],
    array['Muscle recovery', 'Gut health', 'Immune support']::text[],
    array['Sem contraindicações conhecidas em doses usuais']::text[],
    array['No known contraindications at usual doses']::text[],
    'Growth',
    'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=glutamine%20amino%20acid%20supplement%20powder%20container%20product%20photo%20dark%20background&image_size=square'
  ),
  (
    'BCAA 2:1:1',
    'BCAA 2:1:1',
    'Aminoácidos', 'Amino Acids',
    'Aminoácidos de cadeia ramificada (leucina, isoleucina e valina) para recuperação.',
    'Branched-chain amino acids (leucine, isoleucine, valine) for recovery.',
    5.00, 'g',
    array['Pré-treino', 'Durante o treino', 'Pós-treino']::text[],
    array['Pre-workout', 'During training', 'Post-workout']::text[],
    array['Menos catabolismo', 'Recuperação mais rápida', 'Aporte de aminoácidos essenciais']::text[],
    array['Less catabolism', 'Faster recovery', 'Essential amino acid intake']::text[],
    array['Doença hepática ou renal (consultar médico)']::text[],
    array['Liver or kidney disease (consult a doctor)']::text[],
    'Max Titanium',
    'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=bcaa%20amino%20acid%20supplement%20powder%20container%20product%20photo%20dark%20background&image_size=square'
  ),
  (
    'Multivitamínico',
    'Multivitamin',
    'Vitaminas', 'Vitamins',
    'Concentrado de vitaminas e minerais essenciais para o funcionamento do organismo.',
    'Blend of essential vitamins and minerals for overall body function.',
    1.00, 'cápsula',
    array['Café da manhã']::text[],
    array['Breakfast']::text[],
    array['Suporte imunológico', 'Reposição de micronutrientes', 'Mais disposição']::text[],
    array['Immune support', 'Micronutrient replenishment', 'More energy']::text[],
    array['Excesso de ferro em exames alterados']::text[],
    array['Iron overload on altered lab tests']::text[],
    'Centrum',
    'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=multivitamin%20capsules%20bottle%20product%20photo%20dark%20background&image_size=square'
  ),
  (
    'Ômega 3 (EPA/DHA)',
    'Omega 3 (EPA/DHA)',
    'Ácidos graxos', 'Fatty Acids',
    'Ácidos graxos essenciais com ação anti-inflamatória e cardiovascular.',
    'Essential fatty acids with anti-inflammatory and cardiovascular action.',
    1000.00, 'mg',
    array['Almoço', 'Jantar']::text[],
    array['Lunch', 'Dinner']::text[],
    array['Ação anti-inflamatória', 'Saúde cardiovascular', 'Suporte cognitivo']::text[],
    array['Anti-inflammatory action', 'Cardiovascular health', 'Cognitive support']::text[],
    array['Uso de anticoagulantes (consultar médico)', 'Alergia a peixes']::text[],
    array['Use of anticoagulants (consult a doctor)', 'Fish allergy']::text[],
    'Vitafor',
    'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=omega%203%20fish%20oil%20softgel%20capsules%20bottle%20product%20photo%20dark%20background&image_size=square'
  ),
  (
    'Maltodextrina',
    'Maltodextrin',
    'Carboidratos', 'Carbohydrates',
    'Carboidrato de rápida absorção para reposição de energia e glicogênio.',
    'Fast-absorbing carbohydrate for energy and glycogen replenishment.',
    30.00, 'g',
    array['Pré-treino', 'Durante o treino', 'Pós-treino']::text[],
    array['Pre-workout', 'During training', 'Post-workout']::text[],
    array['Reposição de glicogênio', 'Mais energia no treino', 'Ajuda no ganho de peso']::text[],
    array['Glycogen replenishment', 'More training energy', 'Helps with weight gain']::text[],
    array['Diabetes', 'Resistência à insulina']::text[],
    array['Diabetes', 'Insulin resistance']::text[],
    'Growth',
    'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=maltodextrin%20carbohydrate%20powder%20container%20product%20photo%20dark%20background&image_size=square'
  ),
  (
    'ZMA (Zinco, Magnésio e B6)',
    'ZMA (Zinc, Magnesium and B6)',
    'Minerais', 'Minerals',
    'Combinação de minerais que auxilia na recuperação e na qualidade do sono.',
    'Mineral blend that supports recovery and sleep quality.',
    1.00, 'cápsula',
    array['Antes de dormir']::text[],
    array['Before bed']::text[],
    array['Melhora do sono', 'Recuperação muscular', 'Suporte hormonal natural']::text[],
    array['Better sleep', 'Muscle recovery', 'Natural hormonal support']::text[],
    array['Excesso de zinco em exames alterados']::text[],
    array['Zinc overload on altered lab tests']::text[],
    'Max Titanium',
    'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=zma%20zinc%20magnesium%20capsules%20bottle%20product%20photo%20dark%20background&image_size=square'
  )
) as v(
  name_pt, name_en, category_pt, category_en,
  description_pt, description_en,
  serving_size, serving_unit,
  suggested_times_pt, suggested_times_en,
  benefits_pt, benefits_en,
  contraindications_pt, contraindications_en,
  brand, image_url
)
where not exists (
  select 1 from public.supplements s where s.name_pt = v.name_pt
);
