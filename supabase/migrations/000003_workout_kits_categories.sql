-- ============================================================================
-- Nath Ramos Personal Trainer — Migration 000003
-- Objetivo: Tabelas ausentes para o Módulo Treinos (Fase 9)
--   - workout_categories          (Categorias dos programas de treino)
--   - workout_kits                (Kits / Coleções de programas reutilizáveis)
--   - workout_kit_items           (Programas dentro do kit com ordem)
--   - student_workout_kits        (Atribuição de kits/programas aos alunos)
--   - Correção da tabela audit_logs (campos que AuditLogService utiliza)
--   - RPC can_assign_workout_kit (valida MAX ativos antes da atribuição)
-- Como usar: Copie 100% deste conteúdo no Supabase > SQL Editor > RUN
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 01. WORKOUT CATEGORIES
-- ----------------------------------------------------------------------------
create table if not exists public.workout_categories (
  id uuid primary key default gen_random_uuid(),
  name_pt        text                    not null,
  name_en        text                    not null,
  slug           text                    not null unique,
  description_pt text                    not null default '',
  description_en text                    not null default '',
  icon_lucide    text,
  color_hex      text,
  order_index    int                     not null default 0,
  is_active      boolean                 not null default true,
  created_by_id  uuid references public.profiles (id) on delete set null,
  created_at     timestamptz             not null default now(),
  updated_at     timestamptz             not null default now()
);
create index if not exists wc_active_idx on public.workout_categories (is_active, order_index);
drop trigger if exists wc_updated_at on public.workout_categories;
create trigger wc_updated_at before update on public.workout_categories for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 02. WORKOUT KITS (Pacotes / Planos de treino prontos)
-- ----------------------------------------------------------------------------
create table if not exists public.workout_kits (
  id uuid primary key default gen_random_uuid(),
  category_id    uuid references public.workout_categories (id) on delete set null,
  assigned_plan_id uuid references public.plans (id) on delete set null,

  name_pt        text                    not null,
  name_en        text                    not null,
  slug           text                    not null unique,
  description_pt text                    not null default '',
  description_en text                    not null default '',
  short_desc_pt  text                    not null default '',
  short_desc_en  text                    not null default '',

  difficulty     difficulty_t            not null default 'beginner',
  total_weeks    smallint                not null default 4 check (total_weeks between 1 and 52),
  days_per_week  smallint                not null default 3 check (days_per_week between 1 and 7),
  est_minutes_per_session smallint       not null default 45 check (est_minutes_per_session > 0),

  cover_image_url text,
  tags           text[]                  not null default '{}',
  is_published   boolean                 not null default true,
  is_featured    boolean                 not null default false,
  is_deleted     boolean                 not null default false,

  created_by_id  uuid references public.profiles (id) on delete set null,
  created_at     timestamptz             not null default now(),
  updated_at     timestamptz             not null default now()
);
create index if not exists wk_published_idx on public.workout_kits (is_published, is_featured) where is_deleted = false;
create index if not exists wk_category_idx  on public.workout_kits (category_id);
drop trigger if exists wk_updated_at on public.workout_kits;
create trigger wk_updated_at before update on public.workout_kits for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 03. WORKOUT KIT ITEMS (Quais programas fazem parte do kit + ordem)
-- ----------------------------------------------------------------------------
create table if not exists public.workout_kit_items (
  id uuid primary key default gen_random_uuid(),
  kit_id         uuid not null references public.workout_kits (id) on delete cascade,
  program_id     uuid not null references public.workout_programs (id) on delete cascade,
  order_index    smallint not null default 0,
  notes_pt       text,
  notes_en       text,
  created_at     timestamptz not null default now()
);
create unique index if not exists wki_uniq_idx on public.workout_kit_items (kit_id, program_id);
create index if not exists wki_kit_idx on public.workout_kit_items (kit_id, order_index);

-- ----------------------------------------------------------------------------
-- 04. STUDENT WORKOUT KITS (Atribuição de kits/programas para um aluno)
--     Obs: suporta atribuir um kit INTEIRO ou um programa INDIVIDUAL.
--     Regra: MAX ativos por aluno = plans.max_active_workouts (default 6)
-- ----------------------------------------------------------------------------
create table if not exists public.student_workout_kits (
  id uuid primary key default gen_random_uuid(),
  student_id     uuid not null references public.profiles (id) on delete cascade,

  kit_id         uuid references public.workout_kits (id) on delete set null,
  program_id     uuid references public.workout_programs (id) on delete set null,

  assigned_by_id uuid references public.profiles (id) on delete set null,
  assigned_plan_id uuid references public.plans (id) on delete set null,

  start_date     date not null default current_date,
  end_date       date,
  status         workout_status_t not null default 'active',

  custom_title_pt text,
  custom_title_en text,
  notes          text,

  assigned_at    timestamptz not null default now(),
  activated_at   timestamptz,
  completed_at   timestamptz,
  paused_at      timestamptz,
  updated_at     timestamptz not null default now(),

  constraint swk_has_target check (
    (kit_id is not null) or (program_id is not null)
  )
);
create index if not exists swk_student_status_idx on public.student_workout_kits (student_id, status);
create index if not exists swk_student_dates_idx  on public.student_workout_kits (student_id, start_date desc);
drop trigger if exists swk_updated_at on public.student_workout_kits;
create trigger swk_updated_at before update on public.student_workout_kits for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 05. CORREÇÃO: ADICIONAR CAMPOS NA TABELA audit_logs
--     (campos esperados pelo AuditLogService em src/services/AuditLogService.ts)
-- ----------------------------------------------------------------------------
do $$ begin
  alter table public.audit_logs add column if not exists user_id    uuid references public.profiles (id) on delete set null;
  alter table public.audit_logs add column if not exists admin_id   uuid references public.profiles (id) on delete set null;
  alter table public.audit_logs add column if not exists action     text;
  alter table public.audit_logs add column if not exists entity_type text;
  alter table public.audit_logs add column if not exists entity_id  text;
  alter table public.audit_logs add column if not exists details    jsonb not null default '{}'::jsonb;
exception when others then null; end $$;

create index if not exists audit_logs_user_idx    on public.audit_logs (user_id);
create index if not exists audit_logs_admin_idx   on public.audit_logs (admin_id);
create index if not exists audit_logs_action_idx  on public.audit_logs (action);
create index if not exists audit_logs_entity_idx  on public.audit_logs (entity_type, entity_id);

-- ----------------------------------------------------------------------------
-- 06. RLS — Habilitar policies nas novas tabelas
-- ----------------------------------------------------------------------------
alter table public.workout_categories     enable row level security;
alter table public.workout_kits           enable row level security;
alter table public.workout_kit_items      enable row level security;
alter table public.student_workout_kits   enable row level security;

-- 6.1 workout_categories: público ler ativos; staff pode escrever
drop policy if exists wc_public_read on public.workout_categories;
create policy wc_public_read on public.workout_categories for select
  using (is_active = true);

drop policy if exists wc_staff_write on public.workout_categories;
create policy wc_staff_write on public.workout_categories for all
  using (public.current_user_role() in ('admin','coach'))
  with check (public.current_user_role() in ('admin','coach'));

-- 6.2 workout_kits: público ler publicados não deletados; staff tudo
drop policy if exists wk_public_read on public.workout_kits;
create policy wk_public_read on public.workout_kits for select
  using (is_published = true and is_deleted = false);

drop policy if exists wk_staff_all on public.workout_kits;
create policy wk_staff_all on public.workout_kits for all
  using (public.current_user_role() in ('admin','coach'))
  with check (public.current_user_role() in ('admin','coach'));

-- 6.3 workout_kit_items: herdado via join com wk; staff escreve
drop policy if exists wki_public_read on public.workout_kit_items;
create policy wki_public_read on public.workout_kit_items for select
  using (
    exists (
      select 1 from public.workout_kits k
      where k.id = workout_kit_items.kit_id
        and k.is_published = true
        and k.is_deleted = false
    )
  );

drop policy if exists wki_staff_all on public.workout_kit_items;
create policy wki_staff_all on public.workout_kit_items for all
  using (public.current_user_role() in ('admin','coach'))
  with check (public.current_user_role() in ('admin','coach'));

-- 6.4 student_workout_kits: aluno só vê os dele; staff vê todos os seus atribuídos
drop policy if exists swk_self_read on public.student_workout_kits;
create policy swk_self_read on public.student_workout_kits for select
  using (
    student_id = auth.uid()
    or public.current_user_role() in ('admin','coach')
  );

drop policy if exists swk_staff_write on public.student_workout_kits;
create policy swk_staff_write on public.student_workout_kits for all
  using (public.current_user_role() in ('admin','coach'))
  with check (public.current_user_role() in ('admin','coach'));

-- ----------------------------------------------------------------------------
-- 07. RPC can_assign_workout_kit(student_id, extra_count=1)
--     Retorna boolean e motivo.
--     MAX ativos = COALESCE( plans.max_active_workouts, 6 )
-- ----------------------------------------------------------------------------
create or replace function public.can_assign_workout_kit(
  p_student_id uuid,
  p_extra_assignments int default 1
)
returns table (
  allowed boolean,
  current_active int,
  max_allowed int,
  reason text
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_plan_max  int := 6;
  v_current   int := 0;
begin
  -- Busca o limite baseado na assinatura ativa do aluno (se existir)
  select coalesce(p.max_active_workouts, 6) into v_plan_max
    from public.subscriptions s
    join public.plans p on p.id = s.plan_id
    where s.user_id = p_student_id
      and s.status in ('trialing','active','past_due')
    order by case s.status when 'active' then 1 when 'trialing' then 2 when 'past_due' then 3 else 4 end
    limit 1;

  -- Conta atribuições ativas do aluno
  select count(*) into v_current
    from public.student_workout_kits
    where student_id = p_student_id
      and status = 'active';

  if v_current + p_extra_assignments > v_plan_max then
    return query select
      false,
      v_current,
      v_plan_max,
      format('max_workouts_exceeded_%s_%s', v_current + p_extra_assignments, v_plan_max);
    return;
  end if;

  return query select
    true,
    v_current,
    v_plan_max,
    'ok';
end; $$;

grant execute on function public.can_assign_workout_kit(uuid,int) to anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 08. SEEDS INICIAIS (Categorias padrão)
-- ----------------------------------------------------------------------------
insert into public.workout_categories (name_pt, name_en, slug, description_pt, description_en, icon_lucide, color_hex, order_index, is_active)
values
  ('Hipertrofia',  'Hypertrophy', 'hypertrophy',  'Ganho de massa muscular com séries focadas.',           'Muscle gain with focused sets.',                 'Dumbbell',  '#eab308', 1, true),
  ('Emagrecimento','Fat Loss',    'fat-loss',     'Combinação de força + cardio para definição.',         'Strength + cardio combo for definition.',       'Flame',     '#ef4444', 2, true),
  ('Força',       'Strength',    'strength',     'Bases de força máxima com compostos livres.',         'Maximal strength foundations with compounds.',  'Gauge',     '#3b82f6', 3, true),
  ('Funcional',   'Functional',  'functional',   'Movimentos multiarticulares para o dia a dia.',       'Multi-joint movements for daily life.',         'Activity',  '#22c55e', 4, true),
  ('Iniciante',   'Beginner',    'beginner',     'Programa introdutório para quem está começando.',     'Intro program for first-timers.',               'Baby',      '#a855f7', 5, true),
  ('Casa',        'Home Workout','home-workout', 'Treinos que usam apenas peso corporal ou halteres.',  'Bodyweight-only or dumbbell home sessions.',    'Home',      '#06b6d4', 6, true)
on conflict (slug) do nothing;
