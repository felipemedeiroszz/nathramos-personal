-- ============================================================================
-- Nath Ramos Personal Trainer — Migration 000008
-- Objetivo:
--   1. Exames: parecer/comentário do professor + marcação de revisado
--   2. Kits de suplementos (montados a partir do catálogo de suplementos)
-- Como usar: Copie 100% deste conteúdo no Supabase > SQL Editor > RUN
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXAMES — parecer do professor
-- ----------------------------------------------------------------------------
alter table public.exams add column if not exists coach_feedback text;
alter table public.exams add column if not exists reviewed_by_id uuid references public.profiles (id) on delete set null;
alter table public.exams add column if not exists reviewed_at timestamptz;

-- ----------------------------------------------------------------------------
-- 2. KITS DE SUPLEMENTOS
-- ----------------------------------------------------------------------------
create table if not exists public.supplement_kits (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid references public.profiles (id) on delete set null,

  name_pt        text not null,
  name_en        text not null,
  slug           text not null unique,
  description_pt text not null default '',
  description_en text not null default '',
  short_desc_pt  text not null default '',
  short_desc_en  text not null default '',

  cover_image_url text,
  goal_pt         text,
  goal_en         text,
  tags            text[] not null default '{}',

  is_published boolean not null default true,
  is_featured  boolean not null default false,
  is_deleted   boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sk_published_idx on public.supplement_kits (is_published, is_featured) where is_deleted = false;
drop trigger if exists sk_updated_at on public.supplement_kits;
create trigger sk_updated_at before update on public.supplement_kits
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. ITENS DO KIT DE SUPLEMENTOS
-- ----------------------------------------------------------------------------
create table if not exists public.supplement_kit_items (
  id uuid primary key default gen_random_uuid(),
  kit_id        uuid not null references public.supplement_kits (id) on delete cascade,
  supplement_id uuid references public.supplements (id) on delete set null,

  dosage            numeric(8,2),
  dosage_unit       text,
  frequency_per_day smallint not null default 1 check (frequency_per_day >= 1),
  times_of_day      text[] not null default '{}',
  notes_pt          text,
  notes_en          text,
  order_index       smallint not null default 0,

  created_at timestamptz not null default now()
);
create unique index if not exists ski_uniq_idx on public.supplement_kit_items (kit_id, supplement_id) where supplement_id is not null;
create index if not exists ski_kit_idx on public.supplement_kit_items (kit_id, order_index);

-- ----------------------------------------------------------------------------
-- 4. RLS
-- ----------------------------------------------------------------------------
alter table public.supplement_kits      enable row level security;
alter table public.supplement_kit_items enable row level security;

-- 4.1 Kits: aluno lê kits publicados; staff faz tudo
drop policy if exists sk_public_read on public.supplement_kits;
create policy sk_public_read on public.supplement_kits for select
  using (is_published = true and is_deleted = false);

drop policy if exists sk_staff_all on public.supplement_kits;
create policy sk_staff_all on public.supplement_kits for all
  using (public.current_user_role() in ('admin','coach'))
  with check (public.current_user_role() in ('admin','coach'));

-- 4.2 Itens: leitura herdada do kit publicado; staff faz tudo
drop policy if exists ski_public_read on public.supplement_kit_items;
create policy ski_public_read on public.supplement_kit_items for select
  using (
    exists (
      select 1 from public.supplement_kits k
      where k.id = supplement_kit_items.kit_id
        and k.is_published = true
        and k.is_deleted = false
    )
  );

drop policy if exists ski_staff_all on public.supplement_kit_items;
create policy ski_staff_all on public.supplement_kit_items for all
  using (public.current_user_role() in ('admin','coach'))
  with check (public.current_user_role() in ('admin','coach'));
