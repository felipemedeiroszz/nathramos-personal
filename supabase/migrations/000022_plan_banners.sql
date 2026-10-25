-- ============================================================================
-- 000022 - BANNERS DA PÁGINA DE PLANOS
-- ----------------------------------------------------------------------------
-- Adiciona a coluna "banners" (jsonb) na tabela de planos. Cada item da lista
-- representa um banner exibido em destaque na página pública /planos.
-- Estrutura de cada item:
--   { id, image_url, title_pt, title_en, subtitle_pt, subtitle_en,
--     cta_label_pt, cta_label_en, cta_href, badge_pt, badge_en, is_active }
-- Idempotente: pode ser executada múltiplas vezes sem efeitos colaterais.
-- ============================================================================

alter table public.plans
  add column if not exists banners jsonb not null default '[]'::jsonb;

comment on column public.plans.banners is
  'Lista de banners exibidos na página pública de planos (jsonb array).';
