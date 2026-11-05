begin;

-- Auth bans prevent new logins. This policy also rejects an already issued
-- token at the database boundary while its account is suspended.
create function public.current_account_is_available()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from auth.users
    where id = auth.uid() and (banned_until is null or banned_until <= now())
  );
$$;

revoke all on function public.current_account_is_available() from public;
grant execute on function public.current_account_is_available() to authenticated;

do $$
declare target record;
begin
  for target in
    select schemaname, tablename from pg_tables
    where rowsecurity and (schemaname = 'public' or (schemaname = 'storage' and tablename = 'objects'))
  loop
    execute format(
      'create policy authenticated_account_available on %I.%I as restrictive for all to authenticated using ((select public.current_account_is_available())) with check ((select public.current_account_is_available()))',
      target.schemaname, target.tablename
    );
  end loop;
end $$;

create function public.update_account_profile(p_actor uuid, p_target uuid, p_changes jsonb)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  previous public.profiles;
  updated public.profiles;
  weight_date date;
begin
  if not exists (
    select 1 from public.profiles p join auth.users u on u.id = p.id
    where p.id = p_actor and not p.is_deleted
      and (u.banned_until is null or u.banned_until <= now())
      and (p_actor = p_target or p.role = 'admin')
  ) then raise exception 'Account edit denied'; end if;

  if p_changes ->> 'weight_kg' is not null then
    select (now() at time zone coalesce(z.name, 'America/Sao_Paulo'))::date into weight_date
    from public.profiles p left join pg_timezone_names z on z.name = p.timezone
    where p.id = p_target;
    -- Follow the same lock order as record_student_health.
    perform pg_advisory_xact_lock(hashtextextended(p_target::text || ':health:' || weight_date::text, 0));
  end if;

  select * into previous from public.profiles
  where id = p_target and not is_deleted and (p_actor = p_target or role = 'student')
  for update;
  if not found then raise exception 'Account unavailable'; end if;

  updated := jsonb_populate_record(previous, p_changes);
  if updated.weight_kg is not null and updated.weight_kg is distinct from previous.weight_kg then
    perform public.record_student_health(p_target, weight_date, updated.weight_kg);
  end if;

  update public.profiles set
    first_name = updated.first_name,
    last_name = updated.last_name,
    full_name = case when p_changes ?| array['first_name', 'last_name']
      then trim(concat_ws(' ', updated.first_name, updated.last_name)) else previous.full_name end,
    phone = updated.phone,
    birth_date = updated.birth_date,
    gender = updated.gender,
    height_cm = updated.height_cm,
    weight_kg = updated.weight_kg,
    country = updated.country,
    language = updated.language
  where id = p_target;

  if p_actor <> p_target then
    insert into public.audit_logs(admin_id, user_id, action, entity_type, entity_id, details, table_name, operation)
    values (p_actor, p_target, 'student.profile_updated', 'profiles', p_target::text, '{}'::jsonb, 'profiles', 'UPDATE');
  end if;
end $$;

revoke all on function public.update_account_profile(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.update_account_profile(uuid, uuid, jsonb) to service_role;

create function public.sync_account_email()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;

revoke all on function public.sync_account_email() from public, anon, authenticated;
create trigger sync_account_email after update of email on auth.users
for each row when (old.email is distinct from new.email)
execute function public.sync_account_email();

commit;
