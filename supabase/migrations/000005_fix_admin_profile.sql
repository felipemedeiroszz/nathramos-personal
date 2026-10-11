-- ============================================================================
-- Migration 000005: Criar profile para usuário admin existente
-- ============================================================================
-- Este script cria o profile para o usuário admin que foi criado manualmente
-- no Supabase sem passar pelo trigger de criação automática.

-- Inserir profile para o usuário admin
insert into public.profiles (
  id,
  full_name,
  display_name,
  first_name,
  last_name,
  email,
  role,
  language,
  timezone,
  currency,
  email_notifs_enabled,
  push_enabled,
  has_accepted_terms,
  accepted_terms_at,
  signup_completed_at,
  onboarding_step
)
values (
  '81ab4bb4-4bdb-4f9c-be3c-7977e2efe58e',
  'Admin',
  'Admin',
  'Admin',
  'User',
  'admin@admin.com',
  'admin',
  'pt-BR',
  'America/Sao_Paulo',
  'BRL',
  true,
  true,
  true,
  now(),
  now(),
  0
)
on conflict (id) do update set
  role = 'admin',
  email = 'admin@admin.com',
  full_name = 'Admin',
  display_name = 'Admin',
  first_name = 'Admin',
  last_name = 'User';
