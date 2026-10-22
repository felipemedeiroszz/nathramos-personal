-- ============================================================================
-- Nath Ramos Personal Trainer — Migration 000018
-- Objetivo:
--   Criar a tabela public.social_links para gerenciar as redes sociais
--   (Instagram, YouTube, TikTok, Facebook, WhatsApp, etc.) exibidas no site.
--   Idempotente (pode ser reexecutada sem erro).
-- Depende de: 000001 (helpers public.is_admin / public.is_coach / set_updated_at)
-- Como usar: Copie 100% deste conteúdo no Supabase > SQL Editor > RUN
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. TABELA
-- ============================================================================
create table if not exists public.social_links (
  id            uuid primary key default gen_random_uuid(),
  platform      text not null default 'other',
  label_pt      text,
  label_en      text,
  handle        text,
  url           text not null,
  sort_order    integer not null default 0,
  is_active     boolean not null default true,
  created_by_id uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists social_links_sort_idx
  on public.social_links (sort_order asc, created_at asc);

-- ============================================================================
-- 2. TRIGGER updated_at
-- ============================================================================
drop trigger if exists social_links_updated_at on public.social_links;
create trigger social_links_updated_at
  before update on public.social_links
  for each row execute procedure public.set_updated_at();

-- ============================================================================
-- 3. RLS
-- ============================================================================
alter table public.social_links enable row level security;

-- leitura pública (site) apenas dos links ativos
drop policy if exists social_links_public_read on public.social_links;
create policy social_links_public_read on public.social_links
  for select using (is_active = true);

-- admin/coach gerenciam tudo
drop policy if exists social_links_admin_all on public.social_links;
create policy social_links_admin_all on public.social_links
  for all using (public.is_admin() or public.is_coach())
  with check (public.is_admin() or public.is_coach());

-- ============================================================================
-- 4. GRANTS
-- ============================================================================
grant select on public.social_links to anon, authenticated;
grant all on public.social_links to authenticated;
