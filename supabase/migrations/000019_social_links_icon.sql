-- ============================================================================
-- Nath Ramos Personal Trainer — Migration 000019
-- Objetivo:
--   Adicionar a coluna icon_url em public.social_links, permitindo que cada
--   rede social tenha um ícone/imagem customizada (upload ou URL).
--   As imagens são armazenadas no bucket público "product-images".
--   Idempotente (pode ser reexecutada sem erro).
-- Depende de: 000018 (social_links), 000011 (bucket product-images)
-- Como usar: Copie 100% deste conteúdo no Supabase > SQL Editor > RUN
-- ============================================================================

alter table public.social_links
  add column if not exists icon_url text;
