-- ============================================================================
-- Nath Ramos Personal Trainer — Migration 000012
-- Objetivo: Kit de Treino passa a ser uma sequencia de "treinos" com:
--   - categoria (letra A..F)  → coluna category_label
--   - dia da semana           → coluna day_of_week (1 = Segunda ... 7 = Domingo)
--   - origem do treino        → program_id (programa manual) OU exercise_id (exercício)
--
-- Antes: workout_kit_items.program_id era NOT NULL (somente programas).
-- Agora: program_id passa a ser opcional e include exercise_id como alternativa.
-- Como usar: Copie 100% deste conteudo no Supabase > SQL Editor > RUN
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 01. NOVAS COLUNAS
-- ----------------------------------------------------------------------------
alter table public.workout_kit_items
  add column if not exists exercise_id    uuid references public.exercises (id) on delete set null,
  add column if not exists category_label text,
  add column if not exists day_of_week    smallint;

-- ----------------------------------------------------------------------------
-- 02. program_id deixa de ser obrigatorio (treino pode ser um exercicio)
-- ----------------------------------------------------------------------------
alter table public.workout_kit_items alter column program_id drop not null;

-- ----------------------------------------------------------------------------
-- 03. CONSTRAINTS
-- ----------------------------------------------------------------------------
do $$ begin
  alter table public.workout_kit_items
    add constraint wki_target_check
    check (program_id is not null or exercise_id is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.workout_kit_items
    add constraint wki_category_label_check
    check (category_label is null or category_label in ('A','B','C','D','E','F'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.workout_kit_items
    add constraint wki_day_of_week_check
    check (day_of_week is null or day_of_week between 1 and 7);
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- 04. INDICES
-- ----------------------------------------------------------------------------
create index if not exists wki_exercise_idx on public.workout_kit_items (exercise_id);

-- ----------------------------------------------------------------------------
-- 05. REMOVE UNICIDADE (kit_id, program_id)
--     Um mesmo treino pode aparecer em mais de um dia/letra dentro do mesmo kit.
-- ----------------------------------------------------------------------------
drop index if exists public.wki_uniq_idx;
