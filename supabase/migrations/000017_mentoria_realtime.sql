-- ============================================================================
-- Nath Ramos Personal Trainer — Migration 000017
-- Objetivo:
--   1. Habilitar Supabase Realtime nas tabelas de mentoria (chat_messages e
--      mentorship_rooms) para mensagens em tempo real.
--   2. Garantir que todo aluno tenha uma sala de mentoria (mentorship_rooms),
--      vinculando o coach (admin/coach) quando existir.
-- Depende de: 000001 (mentorship_rooms, chat_messages)
-- Como usar: Copie 100% deste conteúdo no Supabase > SQL Editor > RUN
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. REALTIME
--    Adiciona as tabelas à publicação supabase_realtime (idempotente).
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'mentorship_rooms'
  ) then
    alter publication supabase_realtime add table public.mentorship_rooms;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'meetings'
  ) then
    alter publication supabase_realtime add table public.meetings;
  end if;
end $$;

-- Necessário para que eventos de UPDATE tragam a linha completa.
alter table public.chat_messages replica identity full;
alter table public.mentorship_rooms replica identity full;
alter table public.meetings replica identity full;

-- ----------------------------------------------------------------------------
-- 2. SALAS DE MENTORIA PARA ALUNOS EXISTENTES
-- ----------------------------------------------------------------------------
do $$
declare
  v_coach_id uuid;
begin
  select id into v_coach_id
  from public.profiles
  where role in ('admin', 'coach')
  order by case when role = 'coach' then 0 else 1 end, created_at
  limit 1;

  insert into public.mentorship_rooms (user_id, coach_id, is_active)
  select p.id, v_coach_id, true
  from public.profiles p
  where p.role = 'student'
    and not exists (
      select 1 from public.mentorship_rooms r where r.user_id = p.id
    );
end $$;

-- ----------------------------------------------------------------------------
-- 3. NOVAS SALAS AUTOMÁTICAS
--    Sempre que um novo perfil de aluno for criado sem sala, cria uma.
-- ----------------------------------------------------------------------------
create or replace function public.ensure_mentorship_room()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach_id uuid;
begin
  if new.role <> 'student' then
    return new;
  end if;

  if exists (select 1 from public.mentorship_rooms r where r.user_id = new.id) then
    return new;
  end if;

  select id into v_coach_id
  from public.profiles
  where role in ('admin', 'coach') and id <> new.id
  order by case when role = 'coach' then 0 else 1 end, created_at
  limit 1;

  insert into public.mentorship_rooms (user_id, coach_id, is_active)
  values (new.id, v_coach_id, true)
  on conflict (user_id) do nothing;

  return new;
end $$;

drop trigger if exists profiles_ensure_mentorship_room on public.profiles;
create trigger profiles_ensure_mentorship_room
after insert on public.profiles
for each row execute procedure public.ensure_mentorship_room();
