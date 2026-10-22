-- ============================================================================
-- Nath Ramos Personal Trainer — Migration 000010
-- Objetivo:
--   1. Catálogo de ALIMENTOS (diet_foods)
--   2. KITS DE DIETA (diet_kits) montados a partir do catálogo de alimentos
--   3. Itens do kit (diet_kit_items): alimento + quantidade + refeição + horário
--   4. Vínculo aluno × kit de dieta (student_diet_kits)
-- Depende de: 000001 (meal_type_t, set_updated_at, current_user_role)
-- Como usar: Copie 100% deste conteúdo no Supabase > SQL Editor > RUN
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CATÁLOGO DE ALIMENTOS
-- ----------------------------------------------------------------------------
create table if not exists public.diet_foods (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid references public.profiles (id) on delete set null,

  name_pt       text not null,
  name_en       text not null,
  category_pt   text not null default '',
  category_en   text not null default '',
  description_pt text,
  description_en text,

  serving_size  numeric(8,2) not null default 100,
  serving_unit  text not null default 'g',

  calories_kcal numeric(8,2) not null default 0,
  protein_g     numeric(8,2) not null default 0,
  carbs_g       numeric(8,2) not null default 0,
  fats_g        numeric(8,2) not null default 0,
  fiber_g       numeric(8,2) not null default 0,

  brand     text,
  image_url text,

  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists df_active_idx on public.diet_foods (is_active);
create index if not exists df_category_idx on public.diet_foods (category_pt, category_en);
drop trigger if exists df_updated_at on public.diet_foods;
create trigger df_updated_at before update on public.diet_foods
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. KITS DE DIETA
-- ----------------------------------------------------------------------------
create table if not exists public.diet_kits (
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
create index if not exists dk_published_idx on public.diet_kits (is_published, is_featured) where is_deleted = false;
drop trigger if exists dk_updated_at on public.diet_kits;
create trigger dk_updated_at before update on public.diet_kits
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. ITENS DO KIT DE DIETA
-- ----------------------------------------------------------------------------
create table if not exists public.diet_kit_items (
  id uuid primary key default gen_random_uuid(),
  kit_id  uuid not null references public.diet_kits (id) on delete cascade,
  food_id uuid references public.diet_foods (id) on delete set null,

  quantity    numeric(8,2),
  unit        text,
  meal_type   meal_type_t not null default 'other',
  time_of_day text,
  notes_pt    text,
  notes_en    text,
  order_index smallint not null default 0,

  created_at timestamptz not null default now()
);
create index if not exists dki_kit_idx on public.diet_kit_items (kit_id, order_index);

-- ----------------------------------------------------------------------------
-- 4. VÍNCULO ALUNO × KIT DE DIETA
-- ----------------------------------------------------------------------------
create table if not exists public.student_diet_kits (
  id uuid primary key default gen_random_uuid(),

  student_id     uuid not null references public.profiles (id) on delete cascade,
  kit_id         uuid not null references public.diet_kits (id) on delete cascade,
  assigned_by_id uuid references public.profiles (id) on delete set null,

  start_date date not null default current_date,
  end_date   date,
  status     text not null default 'active'
             check (status in ('active', 'archived', 'completed')),

  notes text,

  assigned_at timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists sdk_active_uniq_idx
  on public.student_diet_kits (student_id, kit_id) where status = 'active';
create index if not exists sdk_student_idx on public.student_diet_kits (student_id, status);
create index if not exists sdk_kit_idx     on public.student_diet_kits (kit_id, status);
drop trigger if exists sdk_updated_at on public.student_diet_kits;
create trigger sdk_updated_at before update on public.student_diet_kits
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. RLS
-- ----------------------------------------------------------------------------
alter table public.diet_foods       enable row level security;
alter table public.diet_kits        enable row level security;
alter table public.diet_kit_items   enable row level security;
alter table public.student_diet_kits enable row level security;

-- 5.1 Alimentos: aluno lê ativos; staff faz tudo
drop policy if exists df_public_read on public.diet_foods;
create policy df_public_read on public.diet_foods for select
  using (is_active = true);

drop policy if exists df_staff_all on public.diet_foods;
create policy df_staff_all on public.diet_foods for all
  using (public.current_user_role() in ('admin','coach'))
  with check (public.current_user_role() in ('admin','coach'));

-- 5.2 Kits: aluno lê kits publicados; staff faz tudo
drop policy if exists dk_public_read on public.diet_kits;
create policy dk_public_read on public.diet_kits for select
  using (is_published = true and is_deleted = false);

drop policy if exists dk_staff_all on public.diet_kits;
create policy dk_staff_all on public.diet_kits for all
  using (public.current_user_role() in ('admin','coach'))
  with check (public.current_user_role() in ('admin','coach'));

-- 5.3 Itens: leitura herdada do kit publicado; staff faz tudo
drop policy if exists dki_public_read on public.diet_kit_items;
create policy dki_public_read on public.diet_kit_items for select
  using (
    exists (
      select 1 from public.diet_kits k
      where k.id = diet_kit_items.kit_id
        and k.is_published = true
        and k.is_deleted = false
    )
  );

drop policy if exists dki_staff_all on public.diet_kit_items;
create policy dki_staff_all on public.diet_kit_items for all
  using (public.current_user_role() in ('admin','coach'))
  with check (public.current_user_role() in ('admin','coach'));

-- 5.4 Vínculos: aluno lê apenas os seus; staff gerencia todos
drop policy if exists sdk_self_read on public.student_diet_kits;
create policy sdk_self_read on public.student_diet_kits for select
  using (
    student_id = auth.uid()
    or public.current_user_role() in ('admin','coach')
  );

drop policy if exists sdk_staff_write on public.student_diet_kits;
create policy sdk_staff_write on public.student_diet_kits for all
  using (public.current_user_role() in ('admin','coach'))
  with check (public.current_user_role() in ('admin','coach'));
