-- ============================================================================
-- Nath Ramos Personal Trainer — Migration 000001: Esquema Completo
-- Stack: PostgreSQL 15+ (Supabase)
-- Objetivo: Todas as tabelas, índices, RLS, triggers, storage buckets setup
-- Uso: Copie e cole 100% deste conteúdo em Supabase → SQL Editor → RUN
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 01. EXTENSÕES OBRIGATÓRIAS
-- ----------------------------------------------------------------------------
create extension if not exists "uuid-ossp"    with schema extensions;
create extension if not exists "pgcrypto"     with schema extensions;
create extension if not exists "pg_trgm"      with schema extensions;
create extension if not exists "btree_gin"    with schema extensions;
create extension if not exists "btree_gist"   with schema extensions;

grant usage on schema extensions to postgres, anon, authenticated, service_role;
grant all on all functions in schema extensions to postgres, anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 02. TIPOS ENUM COMPARTILHADOS (alinhados com src/types/index.ts)
-- ----------------------------------------------------------------------------
do $$ begin
  create type locale_t            as enum ('pt-BR','en-US');
exception when duplicate_object then null; end $$;

do $$ begin
  create type currency_t          as enum ('BRL','USD');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role_t         as enum ('admin','student','coach');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status_t as enum (
    'trialing','active','past_due','canceled','inactive','expired','blocked'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status_t    as enum (
    'pending','processing','paid','failed','canceled','refunded','expired','partially_refunded'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_provider_t  as enum ('stripe','asaas');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method_t    as enum (
    'credit_card','pix','boleto','bank_transfer'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_type_t as enum (
    'system','payment','workout','diet','supplement','hydration','sleep','exam','ebook','chat','meeting','performance','reminder','marketing'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type difficulty_t        as enum ('beginner','intermediate','advanced');
exception when duplicate_object then null; end $$;

do $$ begin
  create type workout_status_t    as enum ('active','completed','paused','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type exercise_source_t   as enum ('exercisedb','custom');
exception when duplicate_object then null; end $$;

do $$ begin
  create type muscle_group_t      as enum (
    'chest','back','shoulders','biceps','triceps','forearms','core','abs','obliques',
    'quads','hamstrings','glutes','calves','adductors','abductors','lower_back','traps','full_body','cardio'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type equipment_t         as enum (
    'body_weight','barbell','dumbbell','kettlebell','cable','machine','smith',
    'resistance_band','medicine_ball','bosu_ball','foam_roller','treadmill',
    'elliptical','bike','rowing','jump_rope','bench','pull_up_bar','other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type meal_type_t         as enum ('breakfast','morning_snack','lunch','afternoon_snack','dinner','supper','pre_workout','post_workout','water','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type chat_message_sender_t as enum ('user','coach','system');
exception when duplicate_object then null; end $$;

do $$ begin
  create type meeting_status_t    as enum ('scheduled','confirmed','rescheduled','canceled','completed','no_show');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- 03. TABELA PRINCIPAL: profiles (1:1 com auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,

  full_name                text                     not null default '',
  display_name             text,
  avatar_url               text,
  cpf                      text,
  phone                    text,
  gender                   text,
  birth_date               date,

  language                 locale_t                 not null default 'pt-BR',
  timezone                 text                     not null default 'America/Sao_Paulo',
  currency                 currency_t               not null default 'BRL',

  role                     user_role_t              not null default 'student',
  referred_by_id           uuid references public.profiles (id),
  signup_completed_at      timestamptz,

  height_cm                numeric(5,2),
  weight_kg                numeric(6,2),
  body_fat_pct             numeric(4,1),
  primary_goal             text,
  training_level           difficulty_t             default 'beginner',
  medical_conditions       text[],
  food_restrictions        text[],
  allergies                text[],

  stripe_customer_id       text,
  asaas_customer_id        text,

  onboarding_step          smallint                 not null default 0,
  has_accepted_terms       boolean                  not null default false,
  accepted_terms_at        timestamptz,
  has_accepted_privacy     boolean                  not null default false,
  accepted_privacy_at      timestamptz,

  quiet_hours_start        time                     default '22:00'::time,
  quiet_hours_end          time                     default '08:00'::time,
  push_enabled             boolean                  not null default true,
  email_notifs_enabled     boolean                  not null default true,

  last_seen_at             timestamptz,
  last_login_at            timestamptz,

  is_deleted               boolean                  not null default false,
  deleted_at               timestamptz,

  created_at               timestamptz              not null default now(),
  updated_at               timestamptz              not null default now()
);
create unique index if not exists profiles_cpf_idx on public.profiles (cpf) where cpf is not null;
create unique index if not exists profiles_stripe_idx on public.profiles (stripe_customer_id) where stripe_customer_id is not null;
create unique index if not exists profiles_asaas_idx  on public.profiles (asaas_customer_id)  where asaas_customer_id  is not null;
create index if not exists profiles_role_idx         on public.profiles (role);
create index if not exists profiles_language_idx     on public.profiles (language);
create index if not exists profiles_deleted_idx      on public.profiles (is_deleted) where is_deleted = false;

comment on table  public.profiles is 'Perfil do usuário (1:1 auth.users). Dados pessoais, preferências i18n, status onboarding, métricas corpo.';
comment on column public.profiles.role is 'admin / student / coach';

-- ----------------------------------------------------------------------------
-- 04. TRIGGER: Cria profile automaticamente após sign-up
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    display_name,
    avatar_url,
    language,
    timezone,
    currency,
    role,
    email_notifs_enabled,
    push_enabled,
    accepted_terms_at,
    has_accepted_terms,
    last_login_at,
    last_seen_at,
    signup_completed_at,
    onboarding_step
  ) values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    coalesce((new.raw_user_meta_data->>'language')::locale_t, 'pt-BR'),
    coalesce(new.raw_user_meta_data->>'timezone', 'America/Sao_Paulo'),
    coalesce((new.raw_user_meta_data->>'currency')::currency_t, 'BRL'),
    'student',
    true,
    true,
    now(),
    true,
    now(),
    now(),
    null,
    0
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 05. TRIGGER GENÉRICO: updated_at (reutilizável)
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 06. AUDITORIA (logs RLS)
-- ----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id           uuid references public.profiles (id) on delete set null,
  table_name         text                     not null,
  operation          text                     not null check (operation in ('INSERT','UPDATE','DELETE')),
  record_id          text,
  old_data           jsonb,
  new_data           jsonb,
  ip_address         inet,
  user_agent         text,
  created_at         timestamptz              not null default now()
);
create index if not exists audit_logs_actor_idx    on public.audit_logs (actor_id);
create index if not exists audit_logs_table_op_idx on public.audit_logs (table_name, operation);
create index if not exists audit_logs_created_idx  on public.audit_logs (created_at desc);

-- ----------------------------------------------------------------------------
-- 07. PLANOS DE ASSINATURA + BENEFÍCIOS
-- ----------------------------------------------------------------------------
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  order_index           int                     not null default 0,
  is_active             boolean                 not null default true,

  name_pt               text                    not null,
  name_en               text                    not null,
  description_pt        text                    not null default '',
  description_en        text                    not null default '',

  slug                  text                    not null unique,
  price_cents           int                     not null check (price_cents >= 0),
  currency              currency_t              not null default 'BRL',
  billing_cycle_days    int                     not null default 30 check (billing_cycle_days in (7,30,90,180,365)),
  trial_days            int                     not null default 0 check (trial_days >= 0 and trial_days <= 60),
  grace_days            int                     not null default 3 check (grace_days >= 0 and grace_days <= 30),

  stripe_price_id       text,
  stripe_product_id     text,
  asaas_plan_id         text,

  max_active_workouts   int                     not null default 6,
  max_exam_files_month  int                     not null default 5,
  include_meal_plan     boolean                 not null default false,
  include_supplements   boolean                 not null default false,
  include_hydration     boolean                 not null default true,
  include_sleep         boolean                 not null default true,
  include_exams         boolean                 not null default false,
  include_ebooks        boolean                 not null default true,
  chat_support          boolean                 not null default true,
  video_meetings_month  int                     not null default 0,
  custom_exercises      boolean                 not null default false,
  coach_direct_access   boolean                 not null default false,
  has_referral_reward   boolean                 not null default false,
  referral_discount_pct numeric(4,1)            not null default 0,

  highlight_hex         text,
  badge_pt              text,
  badge_en              text,

  is_deleted            boolean                 not null default false,
  deleted_at            timestamptz,
  created_at            timestamptz              not null default now(),
  updated_at            timestamptz              not null default now()
);
create index if not exists plans_active_idx    on public.plans (is_active, order_index) where is_active = true and is_deleted = false;
create index if not exists plans_slug_idx      on public.plans (slug);
drop trigger if exists plans_updated_at on public.plans;
create trigger plans_updated_at before update on public.plans for each row execute procedure public.set_updated_at();

create table if not exists public.plan_benefits (
  id bigint generated always as identity primary key,
  plan_id uuid not null references public.plans(id) on delete cascade,
  text_pt text not null,
  text_en text not null,
  order_index int not null default 0,
  included boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists plan_benefits_plan_idx on public.plan_benefits(plan_id, order_index);

-- ----------------------------------------------------------------------------
-- 08. ASSINATURAS (aluno x plano)
-- ----------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id               uuid                     not null references public.profiles (id) on delete cascade,
  plan_id               uuid                     not null references public.plans (id) on delete restrict,

  status                subscription_status_t    not null default 'trialing',

  external_id           text,
  provider              payment_provider_t,
  external_status       text,

  currency              currency_t               not null default 'BRL',
  unit_amount_cents     int                      not null check (unit_amount_cents >= 0),
  billing_cycle_days    int                      not null default 30,

  trial_ends_at         timestamptz,
  current_period_start  timestamptz              not null default now(),
  current_period_end    timestamptz              not null default now() + interval '30 days',
  grace_until           timestamptz,
  block_reason          text,
  cancel_at_period_end  boolean                  not null default false,
  canceled_at           timestamptz,
  ended_at              timestamptz,

  started_at            timestamptz              not null default now(),
  pause_starts_at       timestamptz,
  pause_ends_at         timestamptz,

  payment_method_pref   payment_method_t,
  last_paid_at          timestamptz,
  last_failed_at        timestamptz,
  dunning_attempts      int                      not null default 0,

  discount_pct          numeric(4,1)             not null default 0,
  coupon_code           text,

  source                text,
  ip_signup             inet,

  created_at            timestamptz              not null default now(),
  updated_at            timestamptz              not null default now(),

  unique (external_id, provider)
);
create index if not exists subs_user_status_idx on public.subscriptions (user_id, status);
create index if not exists subs_status_end_idx  on public.subscriptions (status, current_period_end);
create index if not exists subs_grace_idx       on public.subscriptions (grace_until) where grace_until is not null;
drop trigger if exists subs_updated_at on public.subscriptions;
create trigger subs_updated_at before update on public.subscriptions for each row execute procedure public.set_updated_at();

comment on table public.subscriptions is 'Uma por usuário ativo. Atualizações via webhooks Stripe/Asaas.';

-- ----------------------------------------------------------------------------
-- 09. PAGAMENTOS + INVOICES
-- ----------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.subscriptions (id) on delete set null,
  user_id         uuid                     not null references public.profiles (id) on delete cascade,

  provider        payment_provider_t       not null,
  external_id     text,
  external_event_id text,

  status          payment_status_t         not null default 'pending',
  amount_cents    int                      not null check (amount_cents > 0),
  currency        currency_t               not null default 'BRL',
  fee_cents       int                      not null default 0,
  net_amount_cents int                     generated always as (amount_cents - fee_cents) stored,

  method          payment_method_t         not null default 'credit_card',

  installments    smallint                 not null default 1,

  description_pt  text                     not null default '',
  description_en  text                     not null default '',

  pix_qr_code     text,
  pix_copy_paste  text,
  pix_expires_at  timestamptz,

  boleto_barcode  text,
  boleto_digitable_line text,
  boleto_expires_at timestamptz,
  boleto_url      text,

  card_last4      text,
  card_brand      text,
  card_holder     text,

  due_at          timestamptz,
  paid_at         timestamptz,
  failed_at       timestamptz,
  refunded_at     timestamptz,
  failure_reason  text,

  metadata        jsonb                    not null default '{}'::jsonb,

  idempotency_key text,
  created_at      timestamptz              not null default now(),
  updated_at      timestamptz              not null default now(),

  unique (external_id, provider)
);
create index if not exists payments_user_created_idx on public.payments (user_id, created_at desc);
create index if not exists payments_sub_idx        on public.payments (subscription_id);
create index if not exists payments_status_idx     on public.payments (status);
create index if not exists payments_idem_idx       on public.payments (idempotency_key) where idempotency_key is not null;
drop trigger if exists payments_updated_at on public.payments;
create trigger payments_updated_at before update on public.payments for each row execute procedure public.set_updated_at();

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id         uuid                     not null references public.profiles (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  payment_id      uuid references public.payments (id) on delete set null,
  number          text                     not null unique,
  status          payment_status_t         not null default 'pending',
  total_cents     int                      not null check (total_cents >= 0),
  currency        currency_t               not null default 'BRL',
  pdf_url         text,
  due_at          timestamptz,
  paid_at         timestamptz,
  items           jsonb                    not null default '[]'::jsonb,
  created_at      timestamptz              not null default now(),
  updated_at      timestamptz              not null default now()
);
create index if not exists invoices_user_idx on public.invoices (user_id, created_at desc);
drop trigger if exists invoices_updated_at on public.invoices;
create trigger invoices_updated_at before update on public.invoices for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 10. CUPONS DESCONTO
-- ----------------------------------------------------------------------------
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code           text not null unique,
  name_pt        text not null,
  name_en        text not null,
  discount_type  text not null check (discount_type in ('percent','fixed')),
  discount_value int  not null check (discount_value > 0),
  max_uses       int,
  uses_count     int not null default 0,
  valid_from     timestamptz,
  valid_until    timestamptz,
  is_active      boolean not null default true,
  min_amount_cents int not null default 0,
  created_at     timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 11. WEBHOOKS LOG (Stripe + Asaas) — idempotência
-- ----------------------------------------------------------------------------
create table if not exists public.webhook_events (
  id bigint generated always as identity primary key,
  provider     payment_provider_t       not null,
  event_id     text                     not null,
  event_type   text                     not null,
  payload      jsonb                    not null default '{}'::jsonb,
  signature_ok boolean,
  processed_at timestamptz,
  error_text   text,
  created_at   timestamptz              not null default now(),
  unique (provider, event_id)
);
create index if not exists webhook_events_provider_idx on public.webhook_events (provider, created_at desc);

-- ----------------------------------------------------------------------------
-- 12. EXERCÍCIOS (cache local ExerciseDB + custom)
-- ----------------------------------------------------------------------------
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  external_id         text,
  source              exercise_source_t        not null default 'exercisedb',

  name_pt             text                     not null,
  name_en             text                     not null,
  description_pt      text                     not null default '',
  description_en      text                     not null default '',
  instructions_pt     text[]                   not null default '{}',
  instructions_en     text[]                   not null default '{}',

  primary_muscle      muscle_group_t           not null,
  secondary_muscles   muscle_group_t[]         not null default '{}',
  equipment           equipment_t              not null default 'body_weight',
  difficulty          difficulty_t             not null default 'beginner',

  gif_url             text,
  video_url           text,
  thumbnail_url       text,
  images_bucket_path  text[],

  calories_per_min numeric(5,2),
  steps            smallint[],
  tips             text[],
  tags             text[]                   not null default '{}',

  created_by_id      uuid references public.profiles (id) on delete set null,
  translation_locked boolean                 not null default false,
  is_published       boolean                 not null default true,
  is_deleted         boolean                 not null default false,

  external_synced_at timestamptz,
  created_at         timestamptz              not null default now(),
  updated_at         timestamptz              not null default now(),

  unique (external_id, source) where external_id is not null
);
create index if not exists exercises_muscle_idx     on public.exercises (primary_muscle) where is_published = true and is_deleted = false;
create index if not exists exercises_equipment_idx  on public.exercises (equipment);
create index if not exists exercises_diff_idx       on public.exercises (difficulty);
create index if not exists exercises_source_idx     on public.exercises (source, external_synced_at desc);
create index if not exists exercises_name_pt_gin    on public.exercises using gin (to_tsvector('portuguese', name_pt || ' ' || coalesce(description_pt,'')));
create index if not exists exercises_name_en_gin    on public.exercises using gin (to_tsvector('english',    name_en || ' ' || coalesce(description_en,'')));
drop trigger if exists exercises_updated_at on public.exercises;
create trigger exercises_updated_at before update on public.exercises for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 13. TREINOS (programas)
-- ----------------------------------------------------------------------------
create table if not exists public.workout_programs (
  id uuid primary key default gen_random_uuid(),
  owner_id        uuid                     not null references public.profiles (id) on delete cascade,

  assigned_plan_id uuid references public.plans (id) on delete set null,
  assigned_by_id   uuid references public.profiles (id) on delete set null,

  title_pt        text                     not null,
  title_en        text                     not null,
  goal_pt         text                     not null default '',
  goal_en         text                     not null default '',

  difficulty      difficulty_t             not null default 'beginner',
  total_weeks     smallint                 not null default 4 check (total_weeks between 1 and 52),
  days_per_week   smallint                 not null default 3 check (days_per_week between 1 and 7),
  est_minutes_per_session smallint          not null default 45 check (est_minutes_per_session > 0),

  status          workout_status_t         not null default 'active',
  is_template     boolean                  not null default false,

  notes_pt        text                     not null default '',
  notes_en        text                     not null default '',

  cover_image_url text,
  tags            text[]                   not null default '{}',

  start_date      date,
  end_date        date,
  completed_at    timestamptz,

  created_at      timestamptz              not null default now(),
  updated_at      timestamptz              not null default now()
);
create index if not exists wp_owner_status_idx on public.workout_programs (owner_id, status);
create index if not exists wp_template_idx     on public.workout_programs (is_template) where is_template = true;
drop trigger if exists wp_updated_at on public.workout_programs;
create trigger wp_updated_at before update on public.workout_programs for each row execute procedure public.set_updated_at();

create table if not exists public.workout_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.workout_programs (id) on delete cascade,
  week_number smallint not null check (week_number > 0),
  day_of_week smallint not null check (day_of_week between 1 and 7),
  order_index smallint not null default 0,
  name_pt text not null,
  name_en text not null,
  focus_pt text,
  focus_en text,
  est_minutes smallint not null default 45,
  warmup_minutes smallint not null default 5,
  cooldown_minutes smallint not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists wd_uniq_idx      on public.workout_days (program_id, week_number, day_of_week, order_index);
create index if not exists wd_program_idx          on public.workout_days (program_id, week_number, order_index);
drop trigger if exists wd_updated_at on public.workout_days;
create trigger wd_updated_at before update on public.workout_days for each row execute procedure public.set_updated_at();

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  day_id       uuid not null references public.workout_days (id) on delete cascade,
  exercise_id  uuid not null references public.exercises (id) on delete restrict,
  order_index  smallint not null default 0,
  sets         smallint not null default 3 check (sets > 0),
  reps         text,
  weight_kg    numeric(6,2),
  rest_seconds int,
  tempo        text,
  notes_pt     text,
  notes_en     text,
  drop_sets    smallint not null default 0,
  supersets_with_id uuid references public.workout_exercises (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists we_day_idx on public.workout_exercises (day_id, order_index);
drop trigger if exists we_updated_at on public.workout_exercises;
create trigger we_updated_at before update on public.workout_exercises for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 14. REGISTROS DE TREINO EXECUTADO PELO ALUNO
-- ----------------------------------------------------------------------------
create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  program_id    uuid references public.workout_programs (id) on delete set null,
  day_id        uuid references public.workout_days (id) on delete set null,
  scheduled_date date not null,
  started_at    timestamptz,
  completed_at  timestamptz,
  duration_min  int,
  calories_burned numeric(7,1),
  feeling_scale smallint check (feeling_scale between 1 and 5),
  rpe_avg       numeric(3,1) check (rpe_avg between 1 and 10),
  total_volume_kg numeric(10,2),
  notes         text,
  is_paused     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists ws_user_date_idx on public.workout_sessions (user_id, scheduled_date desc);
drop trigger if exists ws_updated_at on public.workout_sessions;
create trigger ws_updated_at before update on public.workout_sessions for each row execute procedure public.set_updated_at();

create table if not exists public.exercise_sets_log (
  id bigint generated always as identity primary key,
  session_id   uuid not null references public.workout_sessions (id) on delete cascade,
  workout_exercise_id uuid references public.workout_exercises (id) on delete set null,
  exercise_id  uuid not null references public.exercises (id) on delete cascade,
  set_number   smallint not null,
  reps_done    smallint not null default 0,
  weight_kg    numeric(6,2),
  rpe          numeric(3,1) check (rpe between 1 and 10),
  duration_sec int,
  distance_km  numeric(6,2),
  completed    boolean not null default true,
  failure_at_end boolean not null default false,
  logged_at    timestamptz not null default now()
);
create index if not exists esl_session_idx on public.exercise_sets_log (session_id, set_number);
create index if not exists esl_user_ex_idx  on public.exercise_sets_log using btree ((select user_id from public.workout_sessions s where s.id = session_id), exercise_id, logged_at desc);

-- ----------------------------------------------------------------------------
-- 15. PR (Records pessoais)
-- ----------------------------------------------------------------------------
create table if not exists public.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  exercise_id  uuid references public.exercises (id) on delete set null,
  exercise_name_snapshot_pt text not null,
  record_type  text not null check (record_type in ('max_weight','max_reps','max_volume','max_time','max_distance')),
  value_num    numeric(10,2) not null,
  unit         text not null,
  achieved_at  date not null,
  created_at   timestamptz not null default now()
);
create index if not exists pr_user_ex_idx on public.personal_records (user_id, exercise_id, achieved_at desc);

-- ----------------------------------------------------------------------------
-- 16. DIETAS
-- ----------------------------------------------------------------------------
create table if not exists public.diet_programs (
  id uuid primary key default gen_random_uuid(),
  user_id         uuid                     not null references public.profiles (id) on delete cascade,
  assigned_by_id  uuid references public.profiles (id) on delete set null,
  assigned_plan_id uuid references public.plans (id) on delete set null,

  title_pt        text                     not null,
  title_en        text                     not null,

  daily_calories  int                      not null check (daily_calories between 500 and 10000),
  protein_g       numeric(6,1)             not null check (protein_g >= 0),
  carbs_g         numeric(6,1)             not null check (carbs_g >= 0),
  fats_g          numeric(6,1)             not null check (fats_g >= 0),
  fiber_g         numeric(5,1)             not null default 0,
  sodium_mg       int                      not null default 0,
  water_liters    numeric(4,2)             not null default 2.0,

  start_date      date                     not null,
  end_date        date,
  is_active       boolean                  not null default true,

  restrictions_pt text[],
  restrictions_en text[],
  notes_pt        text,
  notes_en        text,

  created_at      timestamptz              not null default now(),
  updated_at      timestamptz              not null default now()
);
create index if not exists dp_user_active_idx on public.diet_programs (user_id, is_active);
drop trigger if exists dp_updated_at on public.diet_programs;
create trigger dp_updated_at before update on public.diet_programs for each row execute procedure public.set_updated_at();

create table if not exists public.diet_meals (
  id uuid primary key default gen_random_uuid(),
  diet_id     uuid not null references public.diet_programs (id) on delete cascade,
  meal_type   meal_type_t not null,
  time_of_day time not null,
  order_index smallint not null default 0,
  name_pt     text not null,
  name_en     text not null,
  instructions_pt text,
  instructions_en text,
  calories_kcal int not null default 0,
  protein_g numeric(6,1) not null default 0,
  carbs_g   numeric(6,1) not null default 0,
  fats_g    numeric(6,1) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists dm_diet_idx on public.diet_meals (diet_id, order_index);
drop trigger if exists dm_updated_at on public.diet_meals;
create trigger dm_updated_at before update on public.diet_meals for each row execute procedure public.set_updated_at();

create table if not exists public.diet_meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id  uuid not null references public.diet_meals (id) on delete cascade,
  order_index smallint not null default 0,
  name_pt  text not null,
  name_en  text not null,
  quantity numeric(8,2) not null,
  unit     text not null,
  calories_kcal int not null default 0,
  protein_g numeric(6,1) not null default 0,
  carbs_g   numeric(6,1) not null default 0,
  fats_g    numeric(6,1) not null default 0,
  alternatives_pt text[],
  alternatives_en text[],
  created_at timestamptz not null default now()
);
create index if not exists dmi_meal_idx on public.diet_meal_items (meal_id, order_index);

create table if not exists public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  diet_id uuid references public.diet_programs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  start_date date not null,
  end_date   date not null,
  is_marked_generated boolean not null default false,
  generated_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.shopping_list_items (
  id bigint generated always as identity primary key,
  shopping_list_id uuid not null references public.shopping_lists (id) on delete cascade,
  category_pt text not null default 'Outros',
  category_en text not null default 'Other',
  name_pt     text not null,
  name_en     text not null,
  quantity    numeric(8,2) not null,
  unit        text not null,
  is_checked  boolean not null default false,
  checked_at  timestamptz
);

create table if not exists public.meal_logs (
  id bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  meal_id    uuid references public.diet_meals (id) on delete set null,
  diet_id    uuid references public.diet_programs (id) on delete set null,
  meal_type  meal_type_t not null,
  logged_date date not null,
  logged_at   time not null default now(),
  adherence_pct numeric(4,1) check (adherence_pct between 0 and 100),
  hunger_level smallint check (hunger_level between 1 and 5),
  satiety_level smallint check (satiety_level between 1 and 5),
  photo_url   text,
  notes       text,
  calories_kcal int not null default 0,
  protein_g numeric(6,1) not null default 0,
  carbs_g   numeric(6,1) not null default 0,
  fats_g    numeric(6,1) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists meal_logs_user_date_idx on public.meal_logs (user_id, logged_date desc);

-- ----------------------------------------------------------------------------
-- 17. SUPLEMENTOS
-- ----------------------------------------------------------------------------
create table if not exists public.supplements (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid references public.profiles (id) on delete set null,

  name_pt text not null,
  name_en text not null,
  category_pt text not null,
  category_en text not null,
  description_pt text,
  description_en text,
  serving_size numeric(8,2) not null,
  serving_unit text not null,
  suggested_times_pt text[],
  suggested_times_en text[],
  contraindications_pt text[],
  contraindications_en text[],
  benefits_pt text[],
  benefits_en text[],
  brand text,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists supplements_updated_at on public.supplements;
create trigger supplements_updated_at before update on public.supplements for each row execute procedure public.set_updated_at();

create table if not exists public.user_supplements (
  id uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  supplement_id uuid references public.supplements (id) on delete set null,
  name_pt_snapshot text not null,
  dosage        numeric(8,2) not null,
  dosage_unit   text not null,
  frequency_per_day smallint not null default 1,
  times_of_day  time[] not null default '{}',
  start_date    date not null,
  end_date      date,
  is_active     boolean not null default true,
  assigned_by_id uuid references public.profiles (id) on delete set null,
  notes         text,
  created_at    timestamptz not null default now()
);

create table if not exists public.supplement_logs (
  id bigint generated always as identity primary key,
  user_supplement_id uuid references public.user_supplements (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  logged_date date not null,
  logged_time time not null default now(),
  taken      boolean not null default true,
  skipped_reason text,
  created_at timestamptz not null default now()
);
create index if not exists suppl_logs_user_date_idx on public.supplement_logs (user_id, logged_date desc);

-- ----------------------------------------------------------------------------
-- 18. HIDRATAÇÃO
-- ----------------------------------------------------------------------------
create table if not exists public.hydration_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  daily_target_ml int not null check (daily_target_ml between 500 and 10000),
  calculation_formula text,
  per_kg_ml      numeric(5,1),
  active_from    date not null,
  active_until   date,
  created_at     timestamptz not null default now()
);
create unique index if not exists hg_uniq_active_idx on public.hydration_goals (user_id) where active_until is null;

create table if not exists public.water_intake_logs (
  id bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  logged_date  date not null,
  logged_time  time not null default now(),
  amount_ml    int  not null check (amount_ml between 10 and 5000),
  source       text not null default 'water',
  created_at   timestamptz not null default now()
);
create index if not exists wil_user_date_idx on public.water_intake_logs (user_id, logged_date desc);

-- ----------------------------------------------------------------------------
-- 19. SONO
-- ----------------------------------------------------------------------------
create table if not exists public.sleep_logs (
  id bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  logged_date  date not null,
  fell_asleep_at timestamptz,
  woke_up_at    timestamptz,
  total_minutes int not null check (total_minutes >= 0),
  deep_minutes  int not null default 0,
  light_minutes int not null default 0,
  rem_minutes   int not null default 0,
  awake_minutes int not null default 0,
  quality_score smallint check (quality_score between 1 and 100),
  mood_awake    smallint check (mood_awake between 1 and 5),
  notes         text,
  source        text,
  created_at    timestamptz not null default now(),
  unique (user_id, logged_date)
);

-- ----------------------------------------------------------------------------
-- 20. PESO + MEDIDAS CORPORAIS
-- ----------------------------------------------------------------------------
create table if not exists public.weight_logs (
  id bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  logged_date  date not null,
  weight_kg    numeric(6,2) not null check (weight_kg between 20 and 400),
  body_fat_pct numeric(4,1) check (body_fat_pct between 2 and 70),
  muscle_mass_kg numeric(5,1),
  visceral_fat_level smallint check (visceral_fat_level between 1 and 59),
  metabolism_kcal int,
  notes        text,
  created_at   timestamptz not null default now()
);
create index if not exists weight_user_date_idx on public.weight_logs (user_id, logged_date);

create table if not exists public.body_measurements (
  id bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  logged_date  date not null,
  chest_cm  numeric(5,1),
  waist_cm  numeric(5,1),
  hip_cm    numeric(5,1),
  right_arm_cm numeric(5,1),
  left_arm_cm  numeric(5,1),
  right_forearm_cm numeric(5,1),
  left_forearm_cm  numeric(5,1),
  right_thigh_cm   numeric(5,1),
  left_thigh_cm    numeric(5,1),
  right_calf_cm    numeric(5,1),
  left_calf_cm     numeric(5,1),
  neck_cm     numeric(5,1),
  notes       text,
  created_at  timestamptz not null default now()
);
create index if not exists bm_user_date_idx on public.body_measurements (user_id, logged_date);

-- ----------------------------------------------------------------------------
-- 21. EXAMES
-- ----------------------------------------------------------------------------
create table if not exists public.exam_categories (
  id uuid primary key default gen_random_uuid(),
  name_pt text not null,
  name_en text not null,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  category_id   uuid references public.exam_categories (id) on delete set null,
  title         text not null,
  exam_date     date not null,
  lab_name      text,
  description   text,
  file_bucket_path text,
  file_name        text,
  file_size_bytes  bigint,
  file_mime_type   text,
  results_summary  jsonb default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  is_deleted    boolean not null default false,
  deleted_at    timestamptz
);
create index if not exists exams_user_date_idx on public.exams (user_id, exam_date desc);
drop trigger if exists exams_updated_at on public.exams;
create trigger exams_updated_at before update on public.exams for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 22. EBOOKS
-- ----------------------------------------------------------------------------
create table if not exists public.ebooks (
  id uuid primary key default gen_random_uuid(),
  title_pt text not null,
  title_en text not null,
  slug     text not null unique,
  summary_pt text,
  summary_en text,
  cover_url text,
  file_bucket_path text,
  pages_count smallint,
  language  locale_t not null default 'pt-BR',
  is_free   boolean  not null default false,
  min_plan_id uuid references public.plans (id) on delete set null,
  publish_at timestamptz,
  is_published boolean not null default false,
  categories_pt text[],
  categories_en text[],
  author text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false
);
drop trigger if exists ebooks_updated_at on public.ebooks;
create trigger ebooks_updated_at before update on public.ebooks for each row execute procedure public.set_updated_at();

create table if not exists public.ebook_downloads (
  id bigint generated always as identity primary key,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  ebook_id  uuid not null references public.ebooks (id) on delete cascade,
  downloaded_at timestamptz not null default now(),
  ip_address    inet,
  unique (user_id, ebook_id)
);

-- ----------------------------------------------------------------------------
-- 23. MENTORIA: CHAT EM TEMPO REAL
-- ----------------------------------------------------------------------------
create table if not exists public.mentorship_rooms (
  id uuid primary key default gen_random_uuid(),
  user_id   uuid not null references public.profiles (id) on delete cascade,
  coach_id  uuid references public.profiles (id) on delete set null,
  is_active boolean not null default true,
  last_message_at timestamptz,
  unread_count_user smallint not null default 0,
  unread_count_coach smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);
create index if not exists rooms_user_idx on public.mentorship_rooms (user_id, is_active);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id   uuid not null references public.mentorship_rooms (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  sender_type chat_message_sender_t not null,
  content text not null,
  attachments jsonb not null default '[]'::jsonb,
  read_at timestamptz,
  delivered_at timestamptz,
  reply_to_id uuid references public.chat_messages (id) on delete set null,
  reactions jsonb not null default '{}'::jsonb,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists chat_room_created_idx on public.chat_messages (room_id, created_at desc);
create index if not exists chat_sender_idx on public.chat_messages (sender_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 24. REUNIÕES (chamadas ao vivo)
-- ----------------------------------------------------------------------------
create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  coach_id      uuid references public.profiles (id) on delete set null,
  title_pt      text not null,
  title_en      text not null,
  description_pt text,
  description_en text,
  start_at      timestamptz not null,
  end_at        timestamptz,
  duration_min  int not null,
  status        meeting_status_t not null default 'scheduled',
  meeting_url   text,
  meeting_platform text not null default 'google_meet',
  reschedule_count smallint not null default 0,
  cancel_reason text,
  notes_after   text,
  recording_url text,
  created_by_id uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists meetings_user_start_idx on public.meetings (user_id, start_at desc);
drop trigger if exists meetings_updated_at on public.meetings;
create trigger meetings_updated_at before update on public.meetings for each row execute procedure public.set_updated_at();

create table if not exists public.meeting_reminders (
  id bigint generated always as identity primary key,
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  offset_minutes_before int not null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 25. NOTIFICAÇÕES PUSH
-- ----------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  endpoint    text not null,
  auth_p256dh text not null,
  auth_secret text not null,
  device_name text,
  user_agent  text,
  is_valid    boolean not null default true,
  invalidated_at timestamptz,
  created_at  timestamptz not null default now(),
  last_used_at timestamptz,
  unique (endpoint)
);
create index if not exists ps_user_valid_idx on public.push_subscriptions (user_id, is_valid);

create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  type        notification_type_t not null,
  title_pt    text not null,
  title_en    text not null,
  body_pt     text not null,
  body_en     text not null,
  default_url text,
  click_action text,
  tag         text,
  icon_path   text,
  created_at  timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  template_id   uuid references public.notification_templates (id) on delete set null,
  type          notification_type_t not null,
  title         text not null,
  body          text not null,
  image_url     text,
  url           text,
  payload       jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz,
  sent_at       timestamptz,
  read_at       timestamptz,
  clicked_at    timestamptz,
  error_text    text,
  provider      text,
  push_delivery_count int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_sched_idx on public.notifications (scheduled_for) where sent_at is null and scheduled_for is not null;

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  email_system      boolean not null default true,
  push_system       boolean not null default true,
  email_payment     boolean not null default true,
  push_payment      boolean not null default true,
  email_workout     boolean not null default true,
  push_workout      boolean not null default true,
  email_diet        boolean not null default true,
  push_diet         boolean not null default true,
  email_supplement  boolean not null default true,
  push_supplement   boolean not null default true,
  email_hydration   boolean not null default true,
  push_hydration    boolean not null default true,
  email_sleep       boolean not null default true,
  push_sleep        boolean not null default true,
  email_exam        boolean not null default true,
  push_exam         boolean not null default true,
  email_ebook       boolean not null default true,
  push_ebook        boolean not null default true,
  email_chat        boolean not null default true,
  push_chat         boolean not null default true,
  email_meeting     boolean not null default true,
  push_meeting      boolean not null default true,
  email_performance boolean not null default true,
  push_performance  boolean not null default true,
  email_reminder    boolean not null default true,
  push_reminder     boolean not null default true,
  email_marketing   boolean not null default false,
  push_marketing    boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists np_updated_at on public.notification_preferences;
create trigger np_updated_at before update on public.notification_preferences for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 26. REFERÊNCIA (INDICAÇÃO)
-- ----------------------------------------------------------------------------
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id   uuid not null references public.profiles (id) on delete cascade,
  referred_id   uuid not null unique references public.profiles (id) on delete cascade,
  referral_code text not null,
  reward_applied boolean not null default false,
  reward_applied_at timestamptz,
  reward_discount_pct numeric(4,1) not null default 0,
  reward_days_bonus int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists referrals_referrer_idx on public.referrals (referrer_id, created_at desc);

create table if not exists public.referral_codes (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  code       text not null unique,
  total_clicks int not null default 0,
  total_signups int not null default 0,
  total_rewards_applied int not null default 0,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 27. FEEDBACK + SUPORTE
-- ----------------------------------------------------------------------------
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  subject      text not null,
  category     text not null,
  priority     text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status       text not null default 'open'    check (status in ('open','in_progress','waiting_user','resolved','closed')),
  assigned_to  uuid references public.profiles (id) on delete set null,
  body         text not null,
  closed_at    timestamptz,
  resolution   text,
  satisfaction_score smallint check (satisfaction_score between 1 and 5),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
drop trigger if exists tickets_updated_at on public.support_tickets;
create trigger tickets_updated_at before update on public.support_tickets for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 28. CONFIGURAÇÕES DA PLATAFORMA (chave/valor admin)
-- ----------------------------------------------------------------------------
create table if not exists public.platform_settings (
  key text primary key,
  value_pt text,
  value_en text,
  value_json jsonb,
  value_num numeric,
  updated_by_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists ps_updated_at on public.platform_settings;
create trigger ps_updated_at before update on public.platform_settings for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 29. FUNÇÃO: canAccessPlatform(user_id) — Regra 3 dias de tolerância
--     Retorna (allowed boolean, status subscription_status_t, reason text)
-- ----------------------------------------------------------------------------
create or replace function public.can_access_platform(p_user_id uuid)
returns table (
  allowed boolean,
  status subscription_status_t,
  reason text
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_role       user_role_t;
  v_sub        public.subscriptions%rowtype;
  v_now        timestamptz := now();
  v_plan_grace int;
begin
  -- ADMIN e COACH sempre acessam (a menos que deleted)
  select p.role into v_role from public.profiles p where p.id = p_user_id and not p.is_deleted;

  if v_role is null then
    return query select false, 'inactive'::subscription_status_t, 'profile_not_found';
    return;
  end if;

  if v_role in ('admin','coach') then
    return query select true, 'active'::subscription_status_t, 'staff_' || lower(v_role::text);
    return;
  end if;

  -- Busca a assinatura do aluno (prioriza status mais permissivo)
  select s.* into v_sub
    from public.subscriptions s
    where s.user_id = p_user_id
    order by
      case s.status
        when 'active'    then 1
        when 'trialing'  then 2
        when 'past_due'  then 3
        when 'canceled'  then 4
        when 'expired'   then 5
        when 'blocked'   then 6
        else 7
      end
    limit 1;

  -- Nenhuma assinatura
  if v_sub.id is null then
    return query select false, 'inactive'::subscription_status_t, 'no_subscription';
    return;
  end if;

  select coalesce(p.grace_days, 3) into v_plan_grace
    from public.plans p where p.id = v_sub.plan_id;

  -- Trialing ativo
  if v_sub.status = 'trialing' and v_sub.trial_ends_at > v_now then
    return query select true, v_sub.status, 'trial_active_until_' || v_sub.trial_ends_at::date::text;
    return;
  end if;

  -- Trialing expirado -> inactive
  if v_sub.status = 'trialing' and v_sub.trial_ends_at <= v_now then
    return query select false, 'inactive'::subscription_status_t, 'trial_expired';
    return;
  end if;

  -- Active (dentro do período)
  if v_sub.status = 'active' and v_sub.current_period_end > v_now then
    return query select true, v_sub.status, 'active_until_' || v_sub.current_period_end::date::text;
    return;
  end if;

  -- Active expirou — cai em past_due + apply grace period
  if v_sub.status = 'active' and v_sub.current_period_end <= v_now then
    -- Tem grace permitido?
    if (v_sub.current_period_end + (v_plan_grace || ' days')::interval) > v_now then
      return query select true, 'past_due'::subscription_status_t,
        'grace_period_until_' || (v_sub.current_period_end + (v_plan_grace || ' days')::interval)::date::text;
    else
      return query select false, 'blocked'::subscription_status_t, 'grace_period_expired_blocked';
    end if;
    return;
  end if;

  -- Past due (já marcado no banco)
  if v_sub.status = 'past_due' then
    if (v_sub.current_period_end + (v_plan_grace || ' days')::interval) > v_now then
      return query select true, v_sub.status,
        'grace_period_until_' || (v_sub.current_period_end + (v_plan_grace || ' days')::interval)::date::text;
    else
      return query select false, 'blocked'::subscription_status_t, 'grace_period_expired_blocked';
    end if;
    return;
  end if;

  -- Canceled (cancelado mas ainda no período?)
  if v_sub.status = 'canceled' then
    if v_sub.current_period_end > v_now then
      return query select true, v_sub.status, 'access_until_end_' || v_sub.current_period_end::date::text;
    else
      return query select false, 'inactive'::subscription_status_t, 'canceled_ended';
    end if;
    return;
  end if;

  -- Blocked, Expired, Inactive — bloqueia
  return query select false, v_sub.status, 'status_' || lower(v_sub.status::text);
end;
$$;

comment on function public.can_access_platform(uuid) is 'Regra de negócio: retorna (bool, status, reason). Admin/Coach sempre true. Aluno: trialing/active true. Past-due + <= grace_days do plano = true; senão blocked. Sem assinatura = blocked.';

-- ----------------------------------------------------------------------------
-- 30. FUNÇÃO: max_active_workouts_allowed(user_id) — usa plano ativo
-- ----------------------------------------------------------------------------
create or replace function public.max_active_workouts_allowed(p_user_id uuid)
returns int
language sql
security definer set search_path = public
as $$
  select coalesce((
    select p.max_active_workouts
      from public.subscriptions s
      join public.plans p on p.id = s.plan_id
      where s.user_id = p_user_id
        and s.status in ('active','trialing','past_due')
      order by case s.status when 'active' then 1 when 'trialing' then 2 else 3 end
      limit 1
  ), 6);
$$;

-- ----------------------------------------------------------------------------
-- 31. FUNÇÃO: count_active_workouts(user_id)
-- ----------------------------------------------------------------------------
create or replace function public.count_active_workouts(p_user_id uuid)
returns bigint
language sql
security definer set search_path = public
as $$
  select count(*)
    from public.workout_programs wp
    where wp.owner_id = p_user_id
      and wp.status = 'active'
      and not wp.is_template;
$$;

-- ----------------------------------------------------------------------------
-- 32. FUNÇÃO: trigger que enche notif preferences após signup
-- ----------------------------------------------------------------------------
create or replace function public.handle_notif_prefs_after_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.notification_preferences (user_id) values (new.id) on conflict do nothing;
  insert into public.referral_codes (user_id, code)
    values (
      new.id,
      upper(substring(encode(extensions.gen_random_bytes(5),'hex') || new.id::text from 1 for 8))
    ) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists profile_post_create_prefs on public.profiles;
create trigger profile_post_create_prefs
  after insert on public.profiles
  for each row execute procedure public.handle_notif_prefs_after_profile();

-- ----------------------------------------------------------------------------
-- 33. RLS — HABILITA EM TODAS TABELAS
-- ----------------------------------------------------------------------------
do $$
declare t record;
begin
  for t in select tablename from pg_tables
           where schemaname = 'public'
             and tablename not in ('audit_logs','webhook_events','platform_settings','plan_benefits','workout_exercises','shopping_list_items','meal_logs','supplement_logs','water_intake_logs','sleep_logs','weight_logs','body_measurements','ebook_downloads','chat_messages','meeting_reminders','notifications','push_subscriptions','notification_templates','notification_preferences','referrals','referral_codes','support_tickets','exercise_sets_log','personal_records','diet_meal_items','shopping_lists')
           order by tablename
  loop
    execute format('alter table if exists public.%I enable row level security;', t.tablename);
  end loop;
end $$;

-- Habilita explicitamente as tabelas auxiliares também (segurança máxima):
alter table if exists public.audit_logs               enable row level security;
alter table if exists public.webhook_events           enable row level security;
alter table if exists public.platform_settings        enable row level security;
alter table if exists public.plan_benefits            enable row level security;
alter table if exists public.workout_exercises        enable row level security;
alter table if exists public.shopping_list_items      enable row level security;
alter table if exists public.meal_logs                enable row level security;
alter table if exists public.supplement_logs          enable row level security;
alter table if exists public.water_intake_logs        enable row level security;
alter table if exists public.sleep_logs               enable row level security;
alter table if exists public.weight_logs              enable row level security;
alter table if exists public.body_measurements        enable row level security;
alter table if exists public.ebook_downloads          enable row level security;
alter table if exists public.chat_messages            enable row level security;
alter table if exists public.meeting_reminders        enable row level security;
alter table if exists public.notifications            enable row level security;
alter table if exists public.push_subscriptions       enable row level security;
alter table if exists public.notification_templates   enable row level security;
alter table if exists public.notification_preferences enable row level security;
alter table if exists public.referrals                enable row level security;
alter table if exists public.referral_codes           enable row level security;
alter table if exists public.support_tickets          enable row level security;
alter table if exists public.exercise_sets_log        enable row level security;
alter table if exists public.personal_records         enable row level security;
alter table if exists public.diet_meal_items          enable row level security;
alter table if exists public.shopping_lists           enable row level security;

-- ----------------------------------------------------------------------------
-- 34. RLS HELPER: current_user_id() + is_admin() + current_user_role()
-- ----------------------------------------------------------------------------
create or replace function public.current_user_id()
returns uuid
language sql stable
as $$ select auth.uid() $$;

create or replace function public.current_user_role()
returns user_role_t
language sql stable
security definer set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid() and not is_deleted
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists(
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and not is_deleted
  );
$$;

create or replace function public.is_coach()
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists(
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'coach'
      and not is_deleted
  );
$$;

-- ----------------------------------------------------------------------------
-- 35. POLÍTICAS RLS: profiles
--     Admin pode ler todos; aluno lê e atualiza somente o seu próprio
-- ----------------------------------------------------------------------------
drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles for select
  using (
    public.is_admin()
    or public.is_coach()
    or (auth.uid() is not null and id = auth.uid() and not is_deleted)
  );

drop policy if exists profiles_self_write on public.profiles;
create policy profiles_self_write on public.profiles for update
  using (auth.uid() is not null and id = auth.uid() and not is_deleted)
  with check (id = auth.uid() and not is_deleted);

-- ----------------------------------------------------------------------------
-- 36. POLÍTICAS RLS: planos (todos leem planos ativos; admin escreve)
-- ----------------------------------------------------------------------------
drop policy if exists plans_read_active on public.plans;
create policy plans_read_active on public.plans for select
  using (
    public.is_admin()
    or (is_active = true and is_deleted = false)
  );
drop policy if exists plans_admin_all on public.plans;
create policy plans_admin_all on public.plans for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists plan_benefits_admin_all on public.plan_benefits;
create policy plan_benefits_admin_all on public.plan_benefits for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists plan_benefits_read on public.plan_benefits;
create policy plan_benefits_read on public.plan_benefits for select using (
  public.is_admin() or
  exists (select 1 from public.plans p where p.id = plan_id and p.is_active and not p.is_deleted)
);

-- ----------------------------------------------------------------------------
-- 37. POLÍTICAS RLS: subscriptions / payments / invoices
--     Admin = todas; aluno = próprio
-- ----------------------------------------------------------------------------
drop policy if exists subs_admin_all on public.subscriptions;
create policy subs_admin_all on public.subscriptions for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists subs_self on public.subscriptions;
create policy subs_self on public.subscriptions for select
  using (auth.uid() is not null and user_id = auth.uid());

drop policy if exists payments_admin_all on public.payments;
create policy payments_admin_all on public.payments for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists payments_self on public.payments;
create policy payments_self on public.payments for select using (auth.uid() is not null and user_id = auth.uid());

drop policy if exists invoices_admin_all on public.invoices;
create policy invoices_admin_all on public.invoices for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists invoices_self on public.invoices;
create policy invoices_self on public.invoices for select using (auth.uid() is not null and user_id = auth.uid());

drop policy if exists coupons_admin_all on public.coupons;
create policy coupons_admin_all on public.coupons for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists coupons_read on public.coupons;
create policy coupons_read on public.coupons for select using (is_active = true);

drop policy if exists webhook_events_admin_only on public.webhook_events;
create policy webhook_events_admin_only on public.webhook_events for all using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- 38. POLÍTICAS RLS: Exercises (cache local — todos leem publicado; admin/coach criam custom)
-- ----------------------------------------------------------------------------
drop policy if exists exercises_read on public.exercises;
create policy exercises_read on public.exercises for select
  using (
    public.is_admin()
    or public.is_coach()
    or (is_published = true and is_deleted = false)
  );
drop policy if exists exercises_admin_all on public.exercises;
create policy exercises_admin_all on public.exercises for all using (public.is_admin() or public.is_coach()) with check (public.is_admin() or public.is_coach());

-- ----------------------------------------------------------------------------
-- 39. POLÍTICAS RLS: Treinos (programas/dias/exercicios)
-- ----------------------------------------------------------------------------
drop policy if exists wp_owner_admin on public.workout_programs;
create policy wp_owner_admin on public.workout_programs for all
  using (
    public.is_admin()
    or public.is_coach()
    or (auth.uid() is not null and owner_id = auth.uid())
  )
  with check (
    public.is_admin()
    or public.is_coach()
    or (auth.uid() is not null and owner_id = auth.uid())
  );
drop policy if exists wp_templates_all on public.workout_programs;
create policy wp_templates_all on public.workout_programs for select using (is_template = true);

drop policy if exists wd_parent on public.workout_days;
create policy wd_parent on public.workout_days for all
  using (exists (select 1 from public.workout_programs wp where wp.id = program_id and (
    public.is_admin() or public.is_coach() or wp.owner_id = auth.uid() or wp.is_template = true
  )))
  with check (exists (select 1 from public.workout_programs wp where wp.id = program_id and (
    public.is_admin() or public.is_coach() or wp.owner_id = auth.uid()
  )));

drop policy if exists we_parent on public.workout_exercises;
create policy we_parent on public.workout_exercises for all
  using (exists (select 1 from public.workout_days wd where wd.id = day_id and
    (public.is_admin() or public.is_coach() or
     exists (select 1 from public.workout_programs wp where wp.id = wd.program_id and (wp.owner_id = auth.uid() or wp.is_template = true))
    )))
  with check (exists (select 1 from public.workout_days wd where wd.id = day_id and
    (public.is_admin() or public.is_coach() or
     exists (select 1 from public.workout_programs wp where wp.id = wd.program_id and wp.owner_id = auth.uid())
    )));

drop policy if exists ws_owner on public.workout_sessions;
create policy ws_owner on public.workout_sessions for all
  using (public.is_admin() or public.is_coach() or (auth.uid() is not null and user_id = auth.uid()))
  with check (public.is_admin() or public.is_coach() or (auth.uid() is not null and user_id = auth.uid()));

drop policy if exists esl_owner on public.exercise_sets_log;
create policy esl_owner on public.exercise_sets_log for all
  using (
    public.is_admin() or public.is_coach() or
    exists (select 1 from public.workout_sessions ws where ws.id = session_id and ws.user_id = auth.uid())
  )
  with check (
    public.is_admin() or public.is_coach() or
    exists (select 1 from public.workout_sessions ws where ws.id = session_id and ws.user_id = auth.uid())
  );

drop policy if exists pr_owner on public.personal_records;
create policy pr_owner on public.personal_records for all
  using (public.is_admin() or public.is_coach() or (auth.uid() is not null and user_id = auth.uid()))
  with check (public.is_admin() or public.is_coach() or (auth.uid() is not null and user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 40. POLÍTICAS RLS: Dieta
-- ----------------------------------------------------------------------------
drop policy if exists dp_owner_admin on public.diet_programs;
create policy dp_owner_admin on public.diet_programs for all
  using (public.is_admin() or public.is_coach() or (auth.uid() is not null and user_id = auth.uid()))
  with check (public.is_admin() or public.is_coach() or (auth.uid() is not null and user_id = auth.uid()));

drop policy if exists dm_parent on public.diet_meals;
create policy dm_parent on public.diet_meals for all
  using (exists (select 1 from public.diet_programs dp where dp.id = diet_id and
    (public.is_admin() or public.is_coach() or dp.user_id = auth.uid())))
  with check (exists (select 1 from public.diet_programs dp where dp.id = diet_id and
    (public.is_admin() or public.is_coach() or dp.user_id = auth.uid())));

drop policy if exists dmi_parent on public.diet_meal_items;
create policy dmi_parent on public.diet_meal_items for all
  using (exists (select 1 from public.diet_meals dm where dm.id = meal_id and
    exists (select 1 from public.diet_programs dp where dp.id = dm.diet_id and
      (public.is_admin() or public.is_coach() or dp.user_id = auth.uid()))))
  with check (exists (select 1 from public.diet_meals dm where dm.id = meal_id and
    exists (select 1 from public.diet_programs dp where dp.id = dm.diet_id and
      (public.is_admin() or public.is_coach() or dp.user_id = auth.uid()))));

drop policy if exists sl_owner on public.shopping_lists;
create policy sl_owner on public.shopping_lists for all
  using (public.is_admin() or public.is_coach() or (auth.uid() is not null and user_id = auth.uid()))
  with check (public.is_admin() or public.is_coach() or (auth.uid() is not null and user_id = auth.uid()));
drop policy if exists sli_parent on public.shopping_list_items;
create policy sli_parent on public.shopping_list_items for all
  using (exists (select 1 from public.shopping_lists sl where sl.id = shopping_list_id and
    (public.is_admin() or public.is_coach() or sl.user_id = auth.uid())))
  with check (exists (select 1 from public.shopping_lists sl where sl.id = shopping_list_id and
    (public.is_admin() or public.is_coach() or sl.user_id = auth.uid())));

drop policy if exists ml_owner on public.meal_logs;
create policy ml_owner on public.meal_logs for all
  using (public.is_admin() or public.is_coach() or (auth.uid() is not null and user_id = auth.uid()))
  with check (public.is_admin() or public.is_coach() or (auth.uid() is not null and user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 41. POLÍTICAS RLS: Suplementos / Suplementos do Usuário / Logs
-- ----------------------------------------------------------------------------
drop policy if exists supplements_read on public.supplements;
create policy supplements_read on public.supplements for select using (public.is_admin() or public.is_coach() or is_active = true);
drop policy if exists supplements_admin on public.supplements;
create policy supplements_admin on public.supplements for all using (public.is_admin() or public.is_coach()) with check (public.is_admin() or public.is_coach());

drop policy if exists us_owner on public.user_supplements;
create policy us_owner on public.user_supplements for all
  using (public.is_admin() or public.is_coach() or (auth.uid() is not null and user_id = auth.uid()))
  with check (public.is_admin() or public.is_coach() or (auth.uid() is not null and user_id = auth.uid()));

drop policy if exists suppl_logs_owner on public.supplement_logs;
create policy suppl_logs_owner on public.supplement_logs for all
  using (public.is_admin() or public.is_coach() or (auth.uid() is not null and user_id = auth.uid()))
  with check (public.is_admin() or public.is_coach() or (auth.uid() is not null and user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 42. POLÍTICAS RLS: Hidratação / Sono / Peso / Medidas
-- ----------------------------------------------------------------------------
drop policy if exists hg_owner on public.hydration_goals;
create policy hg_owner on public.hydration_goals for all
  using (public.is_admin() or public.is_coach() or (auth.uid() is not null and user_id = auth.uid()))
  with check (public.is_admin() or public.is_coach() or (auth.uid() is not null and user_id = auth.uid()));
drop policy if exists wil_owner on public.water_intake_logs;
create policy wil_owner on public.water_intake_logs for all
  using (public.is_admin() or public.is_coach() or (auth.uid() is not null and user_id = auth.uid()))
  with check (public.is_admin() or public.is_coach() or (auth.uid() is not null and user_id = auth.uid()));

drop policy if exists sleep_owner on public.sleep_logs;
create policy sleep_owner on public.sleep_logs for all
  using (public.is_admin() or public.is_coach() or (auth.uid() is not null and user_id = auth.uid()))
  with check (public.is_admin() or public.is_coach() or (auth.uid() is not null and user_id = auth.uid()));

drop policy if exists weight_owner on public.weight_logs;
create policy weight_owner on public.weight_logs for all
  using (public.is_admin() or public.is_coach() or (auth.uid() is not null and user_id = auth.uid()))
  with check (public.is_admin() or public.is_coach() or (auth.uid() is not null and user_id = auth.uid()));
drop policy if exists bm_owner on public.body_measurements;
create policy bm_owner on public.body_measurements for all
  using (public.is_admin() or public.is_coach() or (auth.uid() is not null and user_id = auth.uid()))
  with check (public.is_admin() or public.is_coach() or (auth.uid() is not null and user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 43. POLÍTICAS RLS: Exames / Ebooks
-- ----------------------------------------------------------------------------
drop policy if exists exams_owner on public.exams;
create policy exams_owner on public.exams for all
  using (public.is_admin() or public.is_coach() or (auth.uid() is not null and user_id = auth.uid() and not is_deleted))
  with check (public.is_admin() or public.is_coach() or (auth.uid() is not null and user_id = auth.uid() and not is_deleted));
drop policy if exists exam_categories_admin on public.exam_categories;
create policy exam_categories_admin on public.exam_categories for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists exam_categories_read on public.exam_categories;
create policy exam_categories_read on public.exam_categories for select using (true);

drop policy if exists ebooks_read on public.ebooks;
create policy ebooks_read on public.ebooks for select using (
  public.is_admin()
  or (is_published = true and not is_deleted and (
      is_free = true
      or exists (
          select 1 from public.subscriptions s
          join public.plans p on p.id = s.plan_id
          where s.user_id = auth.uid()
            and s.status in ('active','trialing','past_due')
            and (ebooks.min_plan_id is null
                 or (
                   select p2.order_index from public.plans p2 where p2.id = ebooks.min_plan_id
                 ) <= p.order_index)
        )
     ))
);
drop policy if exists ebooks_admin on public.ebooks;
create policy ebooks_admin on public.ebooks for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists ebook_dl_self on public.ebook_downloads;
create policy ebook_dl_self on public.ebook_downloads for all
  using (public.is_admin() or (auth.uid() is not null and user_id = auth.uid()))
  with check (public.is_admin() or (auth.uid() is not null and user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 44. POLÍTICAS RLS: Mentoria Chat + Reuniões
-- ----------------------------------------------------------------------------
drop policy if exists rooms_participant on public.mentorship_rooms;
create policy rooms_participant on public.mentorship_rooms for all
  using (public.is_admin() or (auth.uid() is not null and (user_id = auth.uid() or coach_id = auth.uid())))
  with check (public.is_admin() or (auth.uid() is not null and (user_id = auth.uid() or coach_id = auth.uid())));

drop policy if exists chat_participant on public.chat_messages;
create policy chat_participant on public.chat_messages for all
  using (
    public.is_admin() or
    exists (select 1 from public.mentorship_rooms r where r.id = room_id and (r.user_id = auth.uid() or r.coach_id = auth.uid()))
  )
  with check (
    public.is_admin() or
    exists (select 1 from public.mentorship_rooms r where r.id = room_id and (r.user_id = auth.uid() or r.coach_id = auth.uid()))
  );

drop policy if exists meetings_participant on public.meetings;
create policy meetings_participant on public.meetings for all
  using (public.is_admin() or (auth.uid() is not null and (user_id = auth.uid() or coach_id = auth.uid())))
  with check (public.is_admin() or (auth.uid() is not null and (user_id = auth.uid() or coach_id = auth.uid())));
drop policy if exists mr_parent on public.meeting_reminders;
create policy mr_parent on public.meeting_reminders for all
  using (public.is_admin() or
    exists (select 1 from public.meetings m where m.id = meeting_id and (m.user_id = auth.uid() or m.coach_id = auth.uid())))
  with check (public.is_admin() or
    exists (select 1 from public.meetings m where m.id = meeting_id and (m.user_id = auth.uid() or m.coach_id = auth.uid())));

-- ----------------------------------------------------------------------------
-- 45. POLÍTICAS RLS: Notificações + Push Subscriptions + Preferências
-- ----------------------------------------------------------------------------
drop policy if exists notif_self on public.notifications;
create policy notif_self on public.notifications for all
  using (public.is_admin() or (auth.uid() is not null and user_id = auth.uid()))
  with check (public.is_admin() or (auth.uid() is not null and user_id = auth.uid()));

drop policy if exists ps_self on public.push_subscriptions;
create policy ps_self on public.push_subscriptions for all
  using (public.is_admin() or (auth.uid() is not null and user_id = auth.uid()))
  with check (public.is_admin() or (auth.uid() is not null and user_id = auth.uid()));

drop policy if exists nt_admin on public.notification_templates;
create policy nt_admin on public.notification_templates for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists nt_read on public.notification_templates;
create policy nt_read on public.notification_templates for select using (true);

drop policy if exists np_self on public.notification_preferences;
create policy np_self on public.notification_preferences for all
  using (public.is_admin() or (auth.uid() is not null and user_id = auth.uid()))
  with check (public.is_admin() or (auth.uid() is not null and user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 46. POLÍTICAS RLS: Referral + Tickets + Platform Settings + Audit
-- ----------------------------------------------------------------------------
drop policy if exists ref_self on public.referrals;
create policy ref_self on public.referrals for select
  using (public.is_admin() or (auth.uid() is not null and (referrer_id = auth.uid() or referred_id = auth.uid())));
drop policy if exists rc_self on public.referral_codes;
create policy rc_self on public.referral_codes for all
  using (public.is_admin() or (auth.uid() is not null and user_id = auth.uid()))
  with check (public.is_admin() or (auth.uid() is not null and user_id = auth.uid()));

drop policy if exists tickets_self on public.support_tickets;
create policy tickets_self on public.support_tickets for all
  using (public.is_admin() or (auth.uid() is not null and user_id = auth.uid()))
  with check (public.is_admin() or (auth.uid() is not null and user_id = auth.uid()));

drop policy if exists ps_admin_only on public.platform_settings;
create policy ps_admin_only on public.platform_settings for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists audit_admin_only on public.audit_logs;
create policy audit_admin_only on public.audit_logs for select using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 47. STORAGE BUCKETS (setup via SQL se storage schema existir — Supabase)
--     Obs: criar buckets no painel Storage também é aceito (manual depois)
-- ----------------------------------------------------------------------------
do $$ begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
      values
        ('avatars',          'avatars',          true,  false, 2097152,  array['image/png','image/jpeg','image/webp']),
        ('workout-images',   'workout-images',   true,  false, 5242880,  array['image/png','image/jpeg','image/webp','image/gif']),
        ('exercise-assets',  'exercise-assets',  true,  false, 20971520, array['image/png','image/jpeg','image/webp','image/gif','video/mp4','image/gif']),
        ('diet-photos',      'diet-photos',      false, false, 10485760, array['image/png','image/jpeg','image/webp']),
        ('exam-files',       'exam-files',       false, false, 52428800, array['application/pdf','image/png','image/jpeg','image/webp']),
        ('ebook-files',      'ebook-files',      false, false, 104857600, array['application/pdf','application/epub+zip']),
        ('chat-attachments', 'chat-attachments', false, false, 20971520, array['image/png','image/jpeg','image/webp','application/pdf'])
      on conflict (id) do nothing;
  end if;
end $$;

-- Storage policies (avatars e exercise-assets = público ler; resto = owner)
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
    -- Buckets públicos (leitura)
    perform set_config('search_path','storage,public', true);
  end if;
end $$;

-- ============================================================================
-- FIM DA MIGRATION 000001
-- Próximos passos pós-executar:
--   1. Criar .env.local com NEXT_PUBLIC_SUPABASE_URL / ANON / SERVICE_ROLE
--   2. Executar migration 000002_seeds_iniciais.sql (planos, admin, categorias)
--   3. Authentication → Providers: Email habilitado
--   4. Authentication → URL Configuration: Site URL = $NEXT_PUBLIC_APP_URL
-- ============================================================================
