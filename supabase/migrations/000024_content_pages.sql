-- ============================================================================
-- Nath Ramos Personal Trainer — Migration 000024
-- Objetivo:
--   Criar a tabela public.content_pages para gerenciar, pelo painel admin, o
--   conteúdo das páginas institucionais (Termos, Privacidade e FAQ).
--   Cada página possui cabeçalho (título, subtítulo, imagem e botão) e uma
--   lista de blocos (título, subtítulo, texto, imagem e botão) com PT e EN.
--   Idempotente (pode ser reexecutada sem erro).
-- Depende de: 000001 (helpers public.is_admin / public.is_coach / set_updated_at)
-- Como usar: Copie 100% deste conteúdo no Supabase > SQL Editor > RUN
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. TABELA
-- ============================================================================
create table if not exists public.content_pages (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  title_pt       text,
  title_en       text,
  subtitle_pt    text,
  subtitle_en    text,
  image_url      text,
  cta_label_pt   text,
  cta_label_en   text,
  cta_url        text,
  blocks         jsonb not null default '[]'::jsonb,
  is_active      boolean not null default true,
  updated_by_id  uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists content_pages_slug_idx on public.content_pages (slug);

-- ============================================================================
-- 2. TRIGGER updated_at
-- ============================================================================
drop trigger if exists content_pages_updated_at on public.content_pages;
create trigger content_pages_updated_at
  before update on public.content_pages
  for each row execute procedure public.set_updated_at();

-- ============================================================================
-- 3. RLS
-- ============================================================================
alter table public.content_pages enable row level security;

-- leitura pública (site) apenas das páginas ativas
drop policy if exists content_pages_public_read on public.content_pages;
create policy content_pages_public_read on public.content_pages
  for select using (is_active = true);

-- admin/coach gerenciam tudo
drop policy if exists content_pages_admin_all on public.content_pages;
create policy content_pages_admin_all on public.content_pages
  for all using (public.is_admin() or public.is_coach())
  with check (public.is_admin() or public.is_coach());

-- ============================================================================
-- 4. GRANTS
-- ============================================================================
grant select on public.content_pages to anon, authenticated;
grant all on public.content_pages to authenticated;

-- ============================================================================
-- 5. SEED — garante que as três páginas existam para edição no painel.
--    O conteúdo inicial (padrão) é aplicado na primeira renderização pública
--    e pode ser editado/substituído pelo painel administrativo.
-- ============================================================================
insert into public.content_pages (slug) values
  ('termos'),
  ('privacidade'),
  ('faq')
on conflict (slug) do nothing;
