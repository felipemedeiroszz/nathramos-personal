-- ============================================================================
-- Nath Ramos Personal Trainer — Migration 000014
-- Objetivo:
--   Popular o catálogo de ALIMENTOS (public.diet_foods) com dados de exemplo
--   bilíngues (pt/en) e imagens ilustrativas. Idempotente: ignora registros cujo
--   name_pt já existe.
-- Depende de: 000010 (tabela diet_foods, set_updated_at)
-- Como usar: Copie 100% deste conteúdo no Supabase > SQL Editor > RUN
-- ============================================================================

insert into public.diet_foods (
  name_pt, name_en, category_pt, category_en,
  description_pt, description_en,
  serving_size, serving_unit,
  calories_kcal, protein_g, carbs_g, fats_g, fiber_g,
  brand, image_url, is_active
)
select
  v.name_pt, v.name_en, v.category_pt, v.category_en,
  v.description_pt, v.description_en,
  v.serving_size, v.serving_unit,
  v.calories_kcal, v.protein_g, v.carbs_g, v.fats_g, v.fiber_g,
  v.brand, v.image_url, true
from (values
  (
    'Arroz Branco Cozido',
    'Cooked White Rice',
    'Carboidratos', 'Carbohydrates',
    'Fonte de carboidrato de fácil digestão, principal fonte de energia nas refeições.',
    'Easy-to-digest carbohydrate source, a main energy source for meals.',
    100.00, 'g',
    128.00, 2.50, 28.10, 0.20, 1.60,
    null::text,
    'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=cooked%20white%20rice%20in%20a%20bowl%20food%20photo%20dark%20background&image_size=square'
  ),
  (
    'Peito de Frango Grelhado',
    'Grilled Chicken Breast',
    'Proteínas', 'Proteins',
    'Proteína magra de alto valor biológico, base para o ganho de massa muscular.',
    'Lean, high biological value protein, a staple for muscle gain.',
    100.00, 'g',
    165.00, 31.00, 0.00, 3.60, 0.00,
    null::text,
    'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=grilled%20chicken%20breast%20food%20photo%20dark%20background&image_size=square'
  ),
  (
    'Ovo de Galinha Cozido',
    'Boiled Chicken Egg',
    'Proteínas', 'Proteins',
    'Proteína completa e acessível, rica em vitaminas e minerais essenciais.',
    'Complete and affordable protein, rich in essential vitamins and minerals.',
    50.00, 'unidade',
    78.00, 6.30, 0.60, 5.30, 0.00,
    null::text,
    'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=boiled%20eggs%20food%20photo%20dark%20background&image_size=square'
  ),
  (
    'Aveia em Flocos',
    'Rolled Oats',
    'Carboidratos', 'Carbohydrates',
    'Carboidrato complexo rico em fibras beta-glucana, promove saciedade prolongada.',
    'Complex carbohydrate rich in beta-glucan fiber, promotes lasting satiety.',
    40.00, 'g',
    156.00, 5.60, 26.60, 2.80, 4.00,
    null::text,
    'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=oat%20flakes%20in%20a%20bowl%20food%20photo%20dark%20background&image_size=square'
  ),
  (
    'Batata-doce Cozida',
    'Cooked Sweet Potato',
    'Carboidratos', 'Carbohydrates',
    'Carboidrato de baixo índice glicêmico, ótima opção pré-treino.',
    'Low glycemic index carbohydrate, a great pre-workout option.',
    100.00, 'g',
    86.00, 1.60, 20.10, 0.10, 3.00,
    null::text,
    'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=baked%20sweet%20potato%20food%20photo%20dark%20background&image_size=square'
  ),
  (
    'Azeite de Oliva Extra Virgem',
    'Extra Virgin Olive Oil',
    'Gorduras', 'Fats',
    'Gordura boa rica em gorduras monoinsaturadas e antioxidantes.',
    'Healthy fat rich in monounsaturated fats and antioxidants.',
    13.00, 'g',
    115.00, 0.00, 0.00, 13.00, 0.00,
    null::text,
    'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=olive%20oil%20bottle%20food%20photo%20dark%20background&image_size=square'
  ),
  (
    'Banana Prata',
    'Silver Banana',
    'Frutas', 'Fruits',
    'Fruta rica em potássio e carboidratos, excelente para energia rápida.',
    'Fruit rich in potassium and carbs, excellent for quick energy.',
    100.00, 'g',
    89.00, 1.10, 22.80, 0.30, 2.60,
    null::text,
    'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=banana%20fruit%20food%20photo%20dark%20background&image_size=square'
  ),
  (
    'Brócolis Cozido',
    'Cooked Broccoli',
    'Vegetais', 'Vegetables',
    'Vegetal rico em fibras, vitamina C e compostos antioxidantes.',
    'Vegetable rich in fiber, vitamin C and antioxidant compounds.',
    100.00, 'g',
    35.00, 2.40, 7.20, 0.40, 3.30,
    null::text,
    'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=steamed%20broccoli%20food%20photo%20dark%20background&image_size=square'
  ),
  (
    'Iogurte Natural Desnatado',
    'Plain Skim Yogurt',
    'Laticínios', 'Dairy',
    'Fonte de proteína e cálcio, com baixo teor de gordura e boa digestibilidade.',
    'Source of protein and calcium, low in fat and easy to digest.',
    170.00, 'g',
    71.00, 8.50, 7.50, 0.40, 0.00,
    null::text,
    'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=plain%20greek%20yogurt%20in%20a%20bowl%20food%20photo%20dark%20background&image_size=square'
  ),
  (
    'Feijão Carioca Cozido',
    'Cooked Carioca Beans',
    'Leguminosas', 'Legumes',
    'Rica em fibras, proteínas vegetais e minerais como ferro.',
    'Rich in fiber, plant protein and minerals such as iron.',
    100.00, 'g',
    76.00, 4.80, 13.60, 0.50, 8.50,
    null::text,
    'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=cooked%20black%20beans%20in%20a%20bowl%20food%20photo%20dark%20background&image_size=square'
  )
) as v(
  name_pt, name_en, category_pt, category_en,
  description_pt, description_en,
  serving_size, serving_unit,
  calories_kcal, protein_g, carbs_g, fats_g, fiber_g,
  brand, image_url
)
where not exists (
  select 1 from public.diet_foods f where f.name_pt = v.name_pt
);
