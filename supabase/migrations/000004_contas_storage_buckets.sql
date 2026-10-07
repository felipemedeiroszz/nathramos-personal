-- ============================================================================
-- Nath Ramos Personal Trainer — Migration 000004: Contas e Storage Buckets
-- Objetivo: Configuração completa de buckets de storage com políticas RLS
--          para upload de avatares e gerenciamento de contas
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 01. ADICIONAR COLUNAS FALTANTES NA TABELA PROFILES
-- ----------------------------------------------------------------------------
do $$ begin
  -- Adicionar coluna country se não existir
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'country'
  ) then
    alter table public.profiles add column country text;
  end if;

  -- Adicionar coluna first_name se não existir
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'first_name'
  ) then
    alter table public.profiles add column first_name text;
  end if;

  -- Adicionar coluna last_name se não existir
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'last_name'
  ) then
    alter table public.profiles add column last_name text;
  end if;

  -- Adicionar coluna email se não existir
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'email'
  ) then
    alter table public.profiles add column email text;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 02. CRIAR BUCKETS DE STORAGE (se não existirem)
-- ----------------------------------------------------------------------------
do $$ begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
      values
        ('avatars',          'avatars',          true,  false, 5242880,  array['image/png','image/jpeg','image/webp']),
        ('workout-images',   'workout-images',   true,  false, 10485760, array['image/png','image/jpeg','image/webp','image/gif']),
        ('exercise-assets',  'exercise-assets',  true,  false, 20971520, array['image/png','image/jpeg','image/webp','image/gif','video/mp4']),
        ('diet-photos',      'diet-photos',      false, false, 10485760, array['image/png','image/jpeg','image/webp']),
        ('exam-files',       'exam-files',       false, false, 52428800, array['application/pdf','image/png','image/jpeg','image/webp']),
        ('ebook-files',      'ebook-files',      false, false, 104857600, array['application/pdf','application/epub+zip']),
        ('chat-attachments', 'chat-attachments', false, false, 20971520, array['image/png','image/jpeg','image/webp','application/pdf'])
      on conflict (id) do nothing;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 02. POLÍTICAS RLS PARA BUCKET DE AVATARES
-- ----------------------------------------------------------------------------
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
    perform set_config('search_path','storage,public', true);

    -- DROP políticas existentes
    drop policy if exists "Avatars - Public Read" on objects;
    drop policy if exists "Avatars - Authenticated Upload" on objects;
    drop policy if exists "Avatars - Owner Update" on objects;
    drop policy if exists "Avatars - Owner Delete" on objects;

    -- Políticas de avatares
    create policy "Avatars - Public Read"
      on objects for select
      to public
      using (bucket_id = 'avatars');

    create policy "Avatars - Authenticated Upload"
      on objects for insert
      to authenticated
      with check (
        bucket_id = 'avatars' and
        auth.uid()::text = (storage.foldername(name))[1]
      );

    create policy "Avatars - Owner Update"
      on objects for update
      to authenticated
      using (
        bucket_id = 'avatars' and
        auth.uid()::text = (storage.foldername(name))[1]
      )
      with check (
        bucket_id = 'avatars' and
        auth.uid()::text = (storage.foldername(name))[1]
      );

    create policy "Avatars - Owner Delete"
      on objects for delete
      to authenticated
      using (
        bucket_id = 'avatars' and
        auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 03. POLÍTICAS RLS PARA BUCKET DE WORKOUT IMAGES
-- ----------------------------------------------------------------------------
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
    perform set_config('search_path','storage,public', true);

    -- DROP políticas existentes
    drop policy if exists "Workout Images - Public Read" on objects;
    drop policy if exists "Workout Images - Authenticated Upload" on objects;
    drop policy if exists "Workout Images - Owner Update" on objects;
    drop policy if exists "Workout Images - Owner Delete" on objects;

    -- Políticas de workout images
    create policy "Workout Images - Public Read"
      on objects for select
      to public
      using (bucket_id = 'workout-images');

    create policy "Workout Images - Authenticated Upload"
      on objects for insert
      to authenticated
      with check (bucket_id = 'workout-images');

    create policy "Workout Images - Owner Update"
      on objects for update
      to authenticated
      using (bucket_id = 'workout-images')
      with check (bucket_id = 'workout-images');

    create policy "Workout Images - Owner Delete"
      on objects for delete
      to authenticated
      using (bucket_id = 'workout-images');
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 04. POLÍTICAS RLS PARA BUCKET DE EXERCISE ASSETS
-- ----------------------------------------------------------------------------
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
    perform set_config('search_path','storage,public', true);

    -- DROP políticas existentes
    drop policy if exists "Exercise Assets - Public Read" on objects;
    drop policy if exists "Exercise Assets - Authenticated Upload" on objects;
    drop policy if exists "Exercise Assets - Owner Update" on objects;
    drop policy if exists "Exercise Assets - Owner Delete" on objects;

    -- Políticas de exercise assets
    create policy "Exercise Assets - Public Read"
      on objects for select
      to public
      using (bucket_id = 'exercise-assets');

    create policy "Exercise Assets - Authenticated Upload"
      on objects for insert
      to authenticated
      with check (bucket_id = 'exercise-assets');

    create policy "Exercise Assets - Owner Update"
      on objects for update
      to authenticated
      using (bucket_id = 'exercise-assets')
      with check (bucket_id = 'exercise-assets');

    create policy "Exercise Assets - Owner Delete"
      on objects for delete
      to authenticated
      using (bucket_id = 'exercise-assets');
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 05. POLÍTICAS RLS PARA BUCKETS PRIVADOS (diet-photos, exam-files, ebook-files, chat-attachments)
-- ----------------------------------------------------------------------------
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
    perform set_config('search_path','storage,public', true);

    -- DROP políticas existentes
    drop policy if exists "Private Buckets - Owner Read" on objects;
    drop policy if exists "Private Buckets - Owner Upload" on objects;
    drop policy if exists "Private Buckets - Owner Update" on objects;
    drop policy if exists "Private Buckets - Owner Delete" on objects;

    -- Políticas para buckets privados
    create policy "Private Buckets - Owner Read"
      on objects for select
      to authenticated
      using (
        bucket_id in ('diet-photos','exam-files','ebook-files','chat-attachments') and
        auth.uid()::text = (storage.foldername(name))[1]
      );

    create policy "Private Buckets - Owner Upload"
      on objects for insert
      to authenticated
      with check (
        bucket_id in ('diet-photos','exam-files','ebook-files','chat-attachments') and
        auth.uid()::text = (storage.foldername(name))[1]
      );

    create policy "Private Buckets - Owner Update"
      on objects for update
      to authenticated
      using (
        bucket_id in ('diet-photos','exam-files','ebook-files','chat-attachments') and
        auth.uid()::text = (storage.foldername(name))[1]
      )
      with check (
        bucket_id in ('diet-photos','exam-files','ebook-files','chat-attachments') and
        auth.uid()::text = (storage.foldername(name))[1]
      );

    create policy "Private Buckets - Owner Delete"
      on objects for delete
      to authenticated
      using (
        bucket_id in ('diet-photos','exam-files','ebook-files','chat-attachments') and
        auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 06. RLS PARA TABELA PROFILES (garantir que usuários só podem ver/editar seu próprio perfil)
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- DROP políticas existentes
drop policy if exists "Profiles - Public Select" on public.profiles;
drop policy if exists "Profiles - Owner Update" on public.profiles;
drop policy if exists "Profiles - Owner Insert" on public.profiles;
drop policy if exists "Profiles - Admin Select" on public.profiles;
drop policy if exists "Profiles - Admin Update" on public.profiles;

-- Políticas de profiles
create policy "Profiles - Public Select"
  on public.profiles for select
  to public
  using (true);

create policy "Profiles - Owner Update"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Profiles - Owner Insert"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

-- Políticas de admin (sem recursão - usa função auxiliar)
create policy "Profiles - Admin Select"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

create policy "Profiles - Admin Update"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- 07. TRIGGER PARA AUTOMATICAMENTE CRIAR PROFILE AO CRIAR USUÁRIO NO AUTH
-- ----------------------------------------------------------------------------
drop function if exists public.handle_new_user cascade;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  full_name text;
  first_name text;
  last_name text;
begin
  full_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  first_name := coalesce(new.raw_user_meta_data->>'first_name', split_part(full_name, ' ', 1));
  last_name := coalesce(new.raw_user_meta_data->>'last_name', regexp_replace(full_name, '^[^ ]+ ', ''));

  insert into public.profiles (
    id, full_name, display_name, first_name, last_name,
    email_notifs_enabled, push_enabled, has_accepted_terms,
    accepted_terms_at, signup_completed_at, onboarding_step
  )
  values (
    new.id, full_name, full_name, first_name, last_name,
    true, true, true,
    now(), now(), 0
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 08. FUNÇÃO PARA VERIFICAR SE USUÁRIO É ADMIN (segurança definer para evitar recursão)
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
$$;

-- ----------------------------------------------------------------------------
-- 09. FUNÇÃO AUXILIAR PARA OBTER DADOS DO PERFIL DO USUÁRIO AUTENTICADO
-- ----------------------------------------------------------------------------
create or replace function public.get_current_user_profile()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select to_jsonb(p)
  from public.profiles p
  where p.id = auth.uid()
$$;

-- ----------------------------------------------------------------------------
-- 10. FUNÇÃO PARA DELETAR CONTA COMPLETA (CASCADE)
-- ----------------------------------------------------------------------------
create or replace function public.delete_user_account(user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin_user boolean;
begin
  -- Verificar se o usuário solicitante é admin
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) into is_admin_user;

  -- Só admin pode deletar contas de outros, ou o próprio usuário pode se deletar
  if not is_admin_user and auth.uid() != user_id then
    raise exception 'Unauthorized: only admins can delete other users accounts';
  end if;

  -- Não permitir deletar o próprio admin
  if user_id = auth.uid() and is_admin_user then
    raise exception 'Cannot delete your own admin account';
  end if;

  -- Deletar do auth (isso vai cascade para as tabelas com foreign key on delete cascade)
  delete from auth.users where id = user_id;

  return true;
end;
$$;

-- ----------------------------------------------------------------------------
-- FIM DA MIGRATION 000004
-- Verificações pós-execução:
--   1. Storage → Buckets: Verificar se todos os buckets foram criados
--   2. Storage → Policies: Verificar se as políticas estão ativas
--   3. Database → Profiles: Verificar RLS policies
--   4. Testar upload de avatar na aplicação
-- ============================================================================
