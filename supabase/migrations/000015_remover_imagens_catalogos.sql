-- ============================================================================
-- Nath Ramos Personal Trainer — Migration 000015
-- Objetivo:
--   Remover as imagens (image_url) dos itens de exemplo do catálogo de
--   SUPLEMENTOS e ALIMENTOS criados nas migrations 000013 e 000014.
--   Não afeta itens cadastrados manualmente pelo admin.
-- Como usar: Copie 100% deste conteúdo no Supabase > SQL Editor > RUN
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Suplementos (migration 000013)
-- ----------------------------------------------------------------------------
update public.supplements
set image_url = null
where name_pt in (
  'Whey Protein Concentrado',
  'Creatina Monohidratada',
  'Cafeína Anidra',
  'Beta-Alanina',
  'Glutamina',
  'BCAA 2:1:1',
  'Multivitamínico',
  'Ômega 3 (EPA/DHA)',
  'Maltodextrina',
  'ZMA (Zinco, Magnésio e B6)'
);

-- ----------------------------------------------------------------------------
-- 2. Alimentos (migration 000014)
-- ----------------------------------------------------------------------------
update public.diet_foods
set image_url = null
where name_pt in (
  'Arroz Branco Cozido',
  'Peito de Frango Grelhado',
  'Ovo de Galinha Cozido',
  'Aveia em Flocos',
  'Batata-doce Cozida',
  'Azeite de Oliva Extra Virgem',
  'Banana Prata',
  'Brócolis Cozido',
  'Iogurte Natural Desnatado',
  'Feijão Carioca Cozido'
);
