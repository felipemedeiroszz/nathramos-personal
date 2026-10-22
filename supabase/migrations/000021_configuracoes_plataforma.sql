-- ============================================================================
-- Nath Ramos Personal Trainer — Migration 000021
-- Objetivo:
--   Popular public.platform_settings com as chaves padrão usadas pela página
--   /admin/configuracoes (Geral & Contato + Preferências do sistema).
--   Idempotente: usa "on conflict (key) do nothing", preservando valores já
--   salvos pelo administrador.
-- Depende de: 000001 (tabela platform_settings)
-- Como usar: Copie 100% deste conteúdo no Supabase > SQL Editor > RUN
-- ============================================================================

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

-- Grupo: Geral & Contato (textos localizados em value_pt / value_en)
insert into public.platform_settings (key, value_pt, value_en)
values
  ('brand_name',    'Nath Ramos',           'Nath Ramos'),
  ('brand_tagline', 'Personal Trainer',     'Personal Trainer'),
  ('support_email', '',                     null),
  ('support_whatsapp', '',                  null),
  ('support_hours', 'Seg a Sex, 8h às 18h', 'Mon to Fri, 8am to 6pm')
on conflict (key) do nothing;

-- Grupo: Preferências do sistema (booleanos em value_json)
insert into public.platform_settings (key, value_json)
values
  ('maintenance_mode', 'false'::jsonb),
  ('signup_open',      'true'::jsonb)
on conflict (key) do nothing;

-- Grupo: Modo manutenção (janela de tempo)
--   maintenance_duration      -> quantidade (value_num)
--   maintenance_duration_unit -> "hours" | "days" (value_pt)
--   maintenance_until         -> ISO do fim da janela (value_pt, null = sem prazo)
insert into public.platform_settings (key, value_num)
values
  ('maintenance_duration', 24)
on conflict (key) do nothing;

insert into public.platform_settings (key, value_pt)
values
  ('maintenance_duration_unit', 'hours'),
  ('maintenance_until', null)
on conflict (key) do nothing;

-- Grupo: Preferências do sistema (numéricos em value_num)
insert into public.platform_settings (key, value_num)
values
  ('trial_days_default', 7)
on conflict (key) do nothing;
