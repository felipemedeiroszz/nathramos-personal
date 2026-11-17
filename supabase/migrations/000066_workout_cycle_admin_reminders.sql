begin;
create or replace function public.workout_cycle_remind(p_now timestamptz default now(),p_student uuid default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare created_count int; cancelled_count int;
begin
 -- If a future kit is added before delivery, cancel the obsolete queued reminder.
 update notifications n set sent_at=p_now,read_at=coalesce(n.read_at,p_now),error_text='Ciclo atualizado; lembrete cancelado.'
 where n.sent_at is null and n.payload->>'event'='workout_cycle_update' and (p_student is null or n.payload->>'student_id'=p_student::text)
 and (not exists(select 1 from profiles admin join auth.users u on u.id=admin.id where admin.id=n.user_id and admin.role='admin' and not admin.is_deleted and (u.banned_until is null or u.banned_until<=p_now))
 or not exists(
  select 1 from student_workout_kits a join profiles s on s.id=a.student_id join auth.users u on u.id=s.id
  where a.id::text=n.payload->>'assignment_id' and a.status='active' and a.kit_id is not null and s.role='student' and not s.is_deleted and (u.banned_until is null or u.banned_until<=p_now)
  and a.start_date <= (p_now at time zone case when exists(select 1 from pg_timezone_names where name=s.timezone) then s.timezone else 'America/Sao_Paulo' end)::date
  and (a.end_date is null or a.end_date >= (p_now at time zone case when exists(select 1 from pg_timezone_names where name=s.timezone) then s.timezone else 'America/Sao_Paulo' end)::date)
  and not exists(select 1 from student_workout_kits future where future.student_id=a.student_id and future.status='active' and future.start_date>a.start_date)
 ));
 get diagnostics cancelled_count=row_count;
 with current_last as (
  select distinct on(a.student_id) a.id,a.student_id,a.start_date,a.end_date,s.full_name
  from student_workout_kits a join profiles s on s.id=a.student_id join auth.users u on u.id=s.id
  join workout_kits kit on kit.id=a.kit_id and not kit.is_deleted
  where (p_student is null or a.student_id=p_student) and a.status='active' and s.role='student' and not s.is_deleted and (u.banned_until is null or u.banned_until<=p_now)
  and a.start_date <= (p_now at time zone case when exists(select 1 from pg_timezone_names where name=s.timezone) then s.timezone else 'America/Sao_Paulo' end)::date
  and (a.end_date is null or a.end_date >= (p_now at time zone case when exists(select 1 from pg_timezone_names where name=s.timezone) then s.timezone else 'America/Sao_Paulo' end)::date)
  and not exists(select 1 from student_workout_kits future where future.student_id=a.student_id and future.status='active' and future.start_date>a.start_date)
  order by a.student_id,a.start_date desc,a.id
 ), inserted as (
  insert into notifications(user_id,type,title,body,url,payload,scheduled_for)
  select admin.id,'system',case when admin.language='en-US' then 'Workout cycle needs updating' else 'Ciclo de treinos precisa ser atualizado' end,
  case when admin.language='en-US' then coalesce(c.full_name,'The student')||' has entered the last scheduled workout kit. Prepare the next cycle.' else coalesce(c.full_name,'O aluno')||' entrou no último kit programado. Prepare a próxima sequência de treinos.' end,
  '/'||case when admin.language='en-US' then 'en-US' else 'pt-BR' end||'/admin/alunos/'||c.student_id::text||'?tab=workouts#ficha-aluno',
  jsonb_build_object('event','workout_cycle_update','assignment_id',c.id,'student_id',c.student_id,'kit_start',c.start_date,'kit_end',c.end_date,'dedupe_key','workout-cycle:'||c.id::text),p_now
  from current_last c cross join profiles admin join auth.users admin_auth on admin_auth.id=admin.id
  where admin.role='admin' and not admin.is_deleted and (admin_auth.banned_until is null or admin_auth.banned_until<=p_now)
  on conflict do nothing returning id
 ) select count(*) into created_count from inserted;
 return jsonb_build_object('created',created_count,'cancelled',cancelled_count,'failed',0);
end $$;
revoke all on function public.workout_cycle_remind(timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.workout_cycle_remind(timestamptz,uuid) to service_role;
commit;
