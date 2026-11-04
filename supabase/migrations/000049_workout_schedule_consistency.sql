begin;
-- Program calendars are authoritative; item weekdays apply to direct exercises.
-- NOT VALID preserves legacy undated rows for staff to review without inventing a day.
alter table public.workout_kit_items add constraint workout_direct_exercise_requires_day
 check (exercise_id is null or day_of_week is not null) not valid;
create or replace function public.start_student_workout(p_user_id uuid, p_day_id uuid, p_program_id uuid, p_date date)
returns setof public.workout_sessions language plpgsql security definer set search_path = public as $$
declare v_session public.workout_sessions; v_dow int;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_day_id::text || ':' || p_date::text, 0));
  v_dow := extract(isodow from p_date);
  if not exists(select 1 from public.workout_days d where d.id=p_day_id and d.program_id=p_program_id and d.day_of_week=v_dow) then raise exception 'Workout day unavailable'; end if;
  if not exists(
    select 1 from public.student_workout_kits a
    where a.student_id=p_user_id and a.status='active' and a.start_date<=p_date and (a.end_date is null or a.end_date>=p_date)
    and (a.program_id=p_program_id or exists(select 1 from public.workout_kit_items i where i.kit_id=a.kit_id and i.program_id=p_program_id)
      or exists(select 1 from public.workout_kits k where k.id=a.kit_id and k.generated_program_id=p_program_id and not k.is_deleted))
  ) then raise exception 'Workout not assigned'; end if;
  select * into v_session from public.workout_sessions where user_id=p_user_id and day_id=p_day_id and scheduled_date=p_date order by started_at desc nulls last limit 1;
  if found then return next v_session; return; end if;
  insert into public.workout_sessions(user_id,day_id,program_id,scheduled_date,started_at) values(p_user_id,p_day_id,p_program_id,p_date,now()) returning * into v_session;
  return next v_session;
end $$;

commit;
