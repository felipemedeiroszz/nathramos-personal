begin;

-- Restore the deleted-account check lost in the legacy account migration.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and not is_deleted);
$$;
-- Account deletion already goes through a password-verified server action.
-- The legacy RPC had a NULL-sensitive authorization condition; clients cannot call it.
revoke all on function public.delete_user_account(uuid) from public, anon, authenticated;
grant execute on function public.delete_user_account(uuid) to service_role;


create or replace function public.protect_profile_privileges()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- SQL migrations and service-role operations are trusted; JWT users are not.
  if coalesce(auth.role(), '') = 'service_role' or (auth.uid() is null and session_user in ('postgres','supabase_admin')) or public.is_admin() then return new; end if;
  if new.role is distinct from old.role or new.is_deleted is distinct from old.is_deleted
     or new.stripe_customer_id is distinct from old.stripe_customer_id
     or new.asaas_customer_id is distinct from old.asaas_customer_id or new.id is distinct from old.id then
    raise exception 'Administrative profile fields cannot be changed' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists profiles_protect_privileges on public.profiles;
create trigger profiles_protect_privileges before update on public.profiles for each row execute function public.protect_profile_privileges();

create table if not exists public.student_routine_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('diet','supplement')),
  assignment_id uuid not null, item_id uuid not null, slot text not null default '', logged_date date not null,
  calories_kcal numeric not null default 0, protein_g numeric not null default 0,
  carbs_g numeric not null default 0, fats_g numeric not null default 0,
  created_at timestamptz not null default now(),
  unique(user_id, kind, assignment_id, item_id, slot, logged_date)
);
create index if not exists student_routine_date_idx on public.student_routine_logs(user_id, logged_date);
alter table public.student_routine_logs enable row level security;
create policy routine_read on public.student_routine_logs for select to authenticated using (user_id = auth.uid() or public.current_user_role() in ('admin','coach'));
grant select on public.student_routine_logs to authenticated;
revoke insert, update, delete on public.student_routine_logs from anon, authenticated;
grant all on public.student_routine_logs to service_role;

create table if not exists public.student_shopping_checks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  food_id uuid not null references public.diet_foods(id) on delete cascade,
  week_start date not null, created_at timestamptz not null default now(), primary key(user_id, food_id, week_start)
);
alter table public.student_shopping_checks enable row level security;
create policy shopping_checks_read on public.student_shopping_checks for select to authenticated using (user_id = auth.uid() or public.current_user_role() in ('admin','coach'));
grant select on public.student_shopping_checks to authenticated;
revoke insert, update, delete on public.student_shopping_checks from anon, authenticated;
grant all on public.student_shopping_checks to service_role;

create table if not exists public.student_routine_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  hydration_reminders boolean not null default true,
  hydration_silent boolean not null default true,
  hydration_frequency_minutes int not null default 60 check (hydration_frequency_minutes in (30,45,60,90,120)),
  updated_at timestamptz not null default now()
);
alter table public.student_routine_settings enable row level security;
create policy routine_settings_read on public.student_routine_settings for select to authenticated using (user_id = auth.uid() or public.current_user_role() in ('admin','coach'));
grant select on public.student_routine_settings to authenticated;
revoke insert, update, delete on public.student_routine_settings from anon, authenticated;
grant all on public.student_routine_settings to service_role;

create or replace function public.save_student_hydration(p_user_id uuid, p_date date, p_goal int, p_reminders boolean, p_frequency int, p_silent boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.hydration_goals(user_id, daily_target_ml, active_from) values(p_user_id, p_goal, p_date)
  on conflict (user_id) where active_until is null do update set daily_target_ml = excluded.daily_target_ml,
    active_from = least(hydration_goals.active_from, excluded.active_from);
  insert into public.student_routine_settings(user_id, hydration_reminders, hydration_frequency_minutes, hydration_silent) values(p_user_id, p_reminders, p_frequency, p_silent)
  on conflict(user_id) do update set hydration_reminders = excluded.hydration_reminders, hydration_frequency_minutes = excluded.hydration_frequency_minutes, hydration_silent = excluded.hydration_silent, updated_at = now();

end $$;
revoke all on function public.save_student_hydration(uuid,date,int,boolean,int,boolean) from public, anon, authenticated;
grant execute on function public.save_student_hydration(uuid,date,int,boolean,int,boolean) to service_role;
-- Profiles are private; only the auth trigger/service may create a profile.
drop policy if exists "Profiles - Public Select" on public.profiles;
drop policy if exists "Profiles - Owner Insert" on public.profiles;
revoke insert, delete on public.profiles from anon, authenticated;
revoke insert, update, delete on public.workout_sessions, public.exercise_sets_log from anon, authenticated;

-- Direct client writes cannot impersonate a sender or reassign a private room.
drop policy if exists rooms_participant on public.mentorship_rooms;
create policy rooms_participant on public.mentorship_rooms for select to authenticated
using (public.is_admin() or user_id = auth.uid() or coach_id = auth.uid());
drop policy if exists chat_participant on public.chat_messages;
create policy chat_participant on public.chat_messages for select to authenticated
using (public.is_admin() or exists(select 1 from public.mentorship_rooms r where r.id = room_id and (r.user_id = auth.uid() or r.coach_id = auth.uid())));
drop policy if exists meetings_participant on public.meetings;
create policy meetings_participant on public.meetings for select to authenticated
using (public.is_admin() or user_id = auth.uid() or coach_id = auth.uid());
revoke insert, update, delete on public.mentorship_rooms, public.chat_messages, public.meetings from anon, authenticated;

-- A restrictive gate complements (AND) each table's existing owner/staff policies.
create or replace function public.student_platform_allowed()
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_role text; v_allowed boolean;
begin
  select role::text into v_role from public.profiles where id = auth.uid() and not is_deleted;
  if v_role is null then return false; end if;
  if v_role in ('admin','coach') then return true; end if;
  select allowed into v_allowed from public.can_access_platform(auth.uid()) limit 1;
  if not coalesce(v_allowed, false) then return false; end if;
  if exists(select 1 from public.platform_settings where key = 'maintenance_mode' and value_json = 'true'::jsonb)
    and not exists(select 1 from public.platform_settings where key = 'maintenance_until' and nullif(value_pt,'')::timestamptz <= now()) then return false; end if;
  return true;
end $$;
revoke all on function public.student_platform_allowed() from public, anon;
grant execute on function public.student_platform_allowed() to authenticated;
do $$
declare t text;
begin
  foreach t in array array['student_routine_logs','student_shopping_checks','student_routine_settings','workout_sessions','exercise_sets_log','student_workout_kits','student_workout_overrides','student_diet_kits','student_supplement_kits','water_intake_logs','hydration_goals','sleep_logs','weight_logs','body_measurements','meal_logs','supplement_logs','mentorship_rooms','chat_messages','meetings','exams'] loop
    if to_regclass('public.' || t) is not null then
      execute format('create policy platform_access_gate on public.%I as restrictive for all to authenticated using (public.student_platform_allowed()) with check (public.student_platform_allowed())',t);
    end if;
  end loop;
end $$;
-- Preserve notifications while disarming duplicate legacy dedupe keys.
with ranked as (select id, row_number() over(partition by user_id, payload->>'dedupe_key' order by created_at,id) as n from public.notifications where payload->>'dedupe_key' is not null)
update public.notifications n set payload = (n.payload - 'dedupe_key') || '{"dedupe_superseded":true}'::jsonb from ranked r where n.id=r.id and r.n > 1;
create unique index if not exists notifications_routine_dedupe_idx on public.notifications(user_id, (payload->>'dedupe_key')) where payload->>'dedupe_key' is not null;
commit;
