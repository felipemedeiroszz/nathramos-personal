-- ============================================================================
-- Nath Ramos Personal Trainer — Migration 000006
-- Objetivo: Tabela de personalização de treino por aluno (Seção 19 do spec)
--   - student_workout_overrides
-- Permite ao administrador alterar séries/reps/carga/descanso de um exercício
-- para um aluno específico, sem modificar o treino original usado por outros.
-- Como usar: Copie 100% deste conteúdo no Supabase > SQL Editor > RUN
-- ============================================================================

create table if not exists public.student_workout_overrides (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  assignment_id uuid references public.student_workout_kits (id) on delete cascade,
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,

  sets smallint,
  reps text,
  weight_kg numeric(8,2),
  rest_seconds integer,
  tempo text,
  notes_pt text,
  notes_en text,

  is_active boolean not null default true,
  created_by_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint swo_has_override check (
    sets is not null
    or reps is not null
    or weight_kg is not null
    or rest_seconds is not null
    or tempo is not null
    or notes_pt is not null
    or notes_en is not null
  )
);

-- Um aluno só pode ter um override ativo por configuração de exercício
create unique index if not exists swo_student_exercise_uniq
  on public.student_workout_overrides (student_id, workout_exercise_id)
  where is_active = true;

create index if not exists swo_student_idx on public.student_workout_overrides (student_id);
create index if not exists swo_assignment_idx on public.student_workout_overrides (assignment_id);
create index if not exists swo_exercise_idx on public.student_workout_overrides (workout_exercise_id);

drop trigger if exists swo_updated_at on public.student_workout_overrides;
create trigger swo_updated_at before update on public.student_workout_overrides
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.student_workout_overrides enable row level security;

-- Aluno pode ler seus próprios overrides; staff lê todos
drop policy if exists swo_self_read on public.student_workout_overrides;
create policy swo_self_read on public.student_workout_overrides for select
  using (
    student_id = auth.uid()
    or public.current_user_role() in ('admin','coach')
  );

-- Apenas staff pode criar/editar overrides
drop policy if exists swo_staff_write on public.student_workout_overrides;
create policy swo_staff_write on public.student_workout_overrides for all
  using (public.current_user_role() in ('admin','coach'))
  with check (public.current_user_role() in ('admin','coach'));
