-- ============================================================================
-- Nath Ramos Personal Trainer — Migration 000009
-- Objetivo:
--   Vincular KITS DE SUPLEMENTOS aos alunos (student_supplement_kits),
--   permitindo atribuir um kit a um ou vários alunos pelo painel admin.
-- Depende de: 000008 (cria supplement_kits / supplement_kit_items).
-- Como usar: Copie 100% deste conteúdo no Supabase > SQL Editor > RUN
-- ============================================================================

create table if not exists public.student_supplement_kits (
  id uuid primary key default gen_random_uuid(),

  student_id     uuid not null references public.profiles (id) on delete cascade,
  kit_id         uuid not null references public.supplement_kits (id) on delete cascade,
  assigned_by_id uuid references public.profiles (id) on delete set null,

  start_date date not null default current_date,
  end_date   date,
  status     text not null default 'active'
             check (status in ('active', 'archived', 'completed')),

  notes text,

  assigned_at timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Um mesmo kit não pode ficar ativo duas vezes para o mesmo aluno
create unique index if not exists ssk_active_uniq_idx
  on public.student_supplement_kits (student_id, kit_id)
  where status = 'active';
create index if not exists ssk_student_idx on public.student_supplement_kits (student_id, status);
create index if not exists ssk_kit_idx     on public.student_supplement_kits (kit_id, status);

drop trigger if exists ssk_updated_at on public.student_supplement_kits;
create trigger ssk_updated_at before update on public.student_supplement_kits
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS: aluno lê apenas os seus vínculos; staff gerencia todos
-- ----------------------------------------------------------------------------
alter table public.student_supplement_kits enable row level security;

drop policy if exists ssk_self_read on public.student_supplement_kits;
create policy ssk_self_read on public.student_supplement_kits for select
  using (
    student_id = auth.uid()
    or public.current_user_role() in ('admin','coach')
  );

drop policy if exists ssk_staff_write on public.student_supplement_kits;
create policy ssk_staff_write on public.student_supplement_kits for all
  using (public.current_user_role() in ('admin','coach'))
  with check (public.current_user_role() in ('admin','coach'));
