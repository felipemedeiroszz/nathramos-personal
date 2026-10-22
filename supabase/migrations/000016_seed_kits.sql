-- ============================================================================
-- Nath Ramos Personal Trainer — Migration 000016
-- Objetivo:
--   Criar KITS DE SUPLEMENTOS e KITS DE DIETA de exemplo, vinculando os itens
--   dos catálogos criados nas migrations 000013 (supplements) e
--   000014 (diet_foods).
--   Idempotente: kits por slug (on conflict) e itens com guarda "not exists".
-- Depende de: 000008 (supplement_kits/items), 000010 (diet_kits/items)
-- Como usar: Copie 100% deste conteúdo no Supabase > SQL Editor > RUN
-- ============================================================================

-- ============================================================================
-- 1. KITS DE SUPLEMENTOS
-- ============================================================================
insert into public.supplement_kits (
  name_pt, name_en, slug,
  description_pt, description_en,
  short_desc_pt, short_desc_en,
  goal_pt, goal_en, tags, is_published, is_featured
)
values
  (
    'Kit Hipertrofia', 'Hypertrophy Kit', 'kit-hipertrofia',
    'Combinação de suplementos para ganho de massa muscular e força.',
    'Supplement combo for muscle mass and strength gains.',
    'Whey, creatina, beta-alanina e multivitamínico.',
    'Whey, creatine, beta-alanine and multivitamin.',
    'Hipertrofia', 'Hypertrophy',
    array['hipertrofia', 'forca']::text[], true, true
  ),
  (
    'Kit Emagrecimento', 'Fat Loss Kit', 'kit-emagrecimento',
    'Suplementos de suporte para definição e emagrecimento.',
    'Support supplements for definition and fat loss.',
    'Cafeína, ômega 3, ZMA e multivitamínico.',
    'Caffeine, omega 3, ZMA and multivitamin.',
    'Emagrecimento', 'Fat loss',
    array['emagrecimento', 'definicao']::text[], true, false
  )
on conflict (slug) do nothing;

-- Itens — Kit Hipertrofia
insert into public.supplement_kit_items (
  kit_id, supplement_id,
  dosage, dosage_unit, frequency_per_day, times_of_day,
  notes_pt, notes_en, order_index
)
select
  k.id, s.id,
  v.dosage, v.dosage_unit, v.freq, v.times,
  v.notes_pt, v.notes_en, v.ord
from public.supplement_kits k
join (values
  ('Whey Protein Concentrado', 30.00, 'g',       1::smallint, array['Pós-treino']::text[],
   'Tomar imediatamente após o treino.', 'Take right after training.', 0::smallint),
  ('Creatina Monohidratada',   5.00,  'g',       1::smallint, array['Qualquer horário']::text[],
   'Uso diário, inclusive em dias sem treino.', 'Daily use, including rest days.', 1::smallint),
  ('Beta-Alanina',             3.20,  'g',       1::smallint, array['Qualquer horário']::text[],
   null, null, 2::smallint),
  ('Multivitamínico',          1.00,  'cápsula', 1::smallint, array['Café da manhã']::text[],
   null, null, 3::smallint)
) as v(name_pt, dosage, dosage_unit, freq, times, notes_pt, notes_en, ord) on true
join public.supplements s on s.name_pt = v.name_pt
where k.slug = 'kit-hipertrofia'
  and not exists (
    select 1 from public.supplement_kit_items i
    where i.kit_id = k.id and i.supplement_id = s.id
  );

-- Itens — Kit Emagrecimento
insert into public.supplement_kit_items (
  kit_id, supplement_id,
  dosage, dosage_unit, frequency_per_day, times_of_day,
  notes_pt, notes_en, order_index
)
select
  k.id, s.id,
  v.dosage, v.dosage_unit, v.freq, v.times,
  v.notes_pt, v.notes_en, v.ord
from public.supplement_kits k
join (values
  ('Cafeína Anidra',      200.00, 'mg',      1::smallint, array['30 a 40 minutos antes do treino']::text[],
   'Evitar após as 17h para não prejudicar o sono.', 'Avoid after 5pm to protect sleep.', 0::smallint),
  ('Ômega 3 (EPA/DHA)',   1000.00, 'mg',     2::smallint, array['Almoço', 'Jantar']::text[],
   null, null, 1::smallint),
  ('ZMA (Zinco, Magnésio e B6)', 1.00, 'cápsula', 1::smallint, array['Antes de dormir']::text[],
   null, null, 2::smallint),
  ('Multivitamínico',     1.00, 'cápsula', 1::smallint, array['Café da manhã']::text[],
   null, null, 3::smallint)
) as v(name_pt, dosage, dosage_unit, freq, times, notes_pt, notes_en, ord) on true
join public.supplements s on s.name_pt = v.name_pt
where k.slug = 'kit-emagrecimento'
  and not exists (
    select 1 from public.supplement_kit_items i
    where i.kit_id = k.id and i.supplement_id = s.id
  );

-- ============================================================================
-- 2. KITS DE DIETA
-- ============================================================================
insert into public.diet_kits (
  name_pt, name_en, slug,
  description_pt, description_en,
  short_desc_pt, short_desc_en,
  goal_pt, goal_en, tags, is_published, is_featured
)
values
  (
    'Kit Cutting', 'Cutting Meal Kit', 'kit-cutting',
    'Plano alimentar com refeições fracionadas para definição e perda de gordura.',
    'Meal plan with balanced meals for definition and fat loss.',
    'Refeições equilibradas com déficit calórico.',
    'Balanced meals with a caloric deficit.',
    'Emagrecimento', 'Fat loss',
    array['cutting', 'emagrecimento']::text[], true, true
  ),
  (
    'Kit Bulking', 'Bulking Meal Kit', 'kit-bulking',
    'Plano alimentar com refeições reforçadas para ganho de massa muscular.',
    'Meal plan with larger meals for muscle mass gain.',
    'Refeições reforçadas com superávit calórico.',
    'Larger meals with a caloric surplus.',
    'Hipertrofia', 'Hypertrophy',
    array['bulking', 'hipertrofia']::text[], true, false
  )
on conflict (slug) do nothing;

-- Itens — Kit Cutting
insert into public.diet_kit_items (
  kit_id, food_id,
  quantity, unit, meal_type, time_of_day,
  notes_pt, notes_en, order_index
)
select
  k.id, f.id,
  v.quantity, v.unit, v.meal_type::meal_type_t, v.time_of_day,
  v.notes_pt, v.notes_en, v.ord
from public.diet_kits k
join (values
  ('Ovo de Galinha Cozido',            2.00,   'unidade', 'breakfast',        '07:00', null, null, 0::smallint),
  ('Aveia em Flocos',                  40.00,  'g',       'breakfast',        '07:00', null, null, 1::smallint),
  ('Arroz Branco Cozido',              100.00, 'g',       'lunch',            '12:30', null, null, 2::smallint),
  ('Peito de Frango Grelhado',         150.00, 'g',       'lunch',            '12:30', null, null, 3::smallint),
  ('Brócolis Cozido',                  100.00, 'g',       'lunch',            '12:30', null, null, 4::smallint),
  ('Azeite de Oliva Extra Virgem',     13.00,  'g',       'lunch',            '12:30', null, null, 5::smallint),
  ('Iogurte Natural Desnatado',        170.00, 'g',       'afternoon_snack',  '16:00', null, null, 6::smallint),
  ('Banana Prata',                     100.00, 'g',       'afternoon_snack',  '16:00', null, null, 7::smallint),
  ('Feijão Carioca Cozido',            100.00, 'g',       'dinner',           '20:00', null, null, 8::smallint),
  ('Peito de Frango Grelhado',         150.00, 'g',       'dinner',           '20:00', null, null, 9::smallint),
  ('Batata-doce Cozida',               100.00, 'g',       'dinner',           '20:00', null, null, 10::smallint)
) as v(name_pt, quantity, unit, meal_type, time_of_day, notes_pt, notes_en, ord) on true
join public.diet_foods f on f.name_pt = v.name_pt
where k.slug = 'kit-cutting'
  and not exists (
    select 1 from public.diet_kit_items i
    where i.kit_id = k.id and i.food_id = f.id
      and i.meal_type = v.meal_type::meal_type_t and i.order_index = v.ord
  );

-- Itens — Kit Bulking
insert into public.diet_kit_items (
  kit_id, food_id,
  quantity, unit, meal_type, time_of_day,
  notes_pt, notes_en, order_index
)
select
  k.id, f.id,
  v.quantity, v.unit, v.meal_type::meal_type_t, v.time_of_day,
  v.notes_pt, v.notes_en, v.ord
from public.diet_kits k
join (values
  ('Aveia em Flocos',                  60.00,  'g',       'breakfast',        '07:00', null, null, 0::smallint),
  ('Banana Prata',                     150.00, 'g',       'breakfast',        '07:00', null, null, 1::smallint),
  ('Ovo de Galinha Cozido',            3.00,   'unidade', 'breakfast',        '07:00', null, null, 2::smallint),
  ('Arroz Branco Cozido',              200.00, 'g',       'lunch',            '12:30', null, null, 3::smallint),
  ('Feijão Carioca Cozido',            150.00, 'g',       'lunch',            '12:30', null, null, 4::smallint),
  ('Peito de Frango Grelhado',         200.00, 'g',       'lunch',            '12:30', null, null, 5::smallint),
  ('Azeite de Oliva Extra Virgem',     13.00,  'g',       'lunch',            '12:30', null, null, 6::smallint),
  ('Iogurte Natural Desnatado',        200.00, 'g',       'afternoon_snack',  '16:00', null, null, 7::smallint),
  ('Aveia em Flocos',                  40.00,  'g',       'afternoon_snack',  '16:00', null, null, 8::smallint),
  ('Batata-doce Cozida',               200.00, 'g',       'dinner',           '20:00', null, null, 9::smallint),
  ('Peito de Frango Grelhado',         200.00, 'g',       'dinner',           '20:00', null, null, 10::smallint),
  ('Brócolis Cozido',                  150.00, 'g',       'dinner',           '20:00', null, null, 11::smallint)
) as v(name_pt, quantity, unit, meal_type, time_of_day, notes_pt, notes_en, ord) on true
join public.diet_foods f on f.name_pt = v.name_pt
where k.slug = 'kit-bulking'
  and not exists (
    select 1 from public.diet_kit_items i
    where i.kit_id = k.id and i.food_id = f.id
      and i.meal_type = v.meal_type::meal_type_t and i.order_index = v.ord
  );
