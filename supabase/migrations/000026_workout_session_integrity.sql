begin;

-- Materialize direct exercises from workout kits into executable days. The source
-- item identity is stable, so edits preserve per-student overrides and set logs.
alter table public.workout_kits add column if not exists generated_program_id uuid references public.workout_programs(id) on delete set null;
alter table public.workout_exercises add column if not exists source_kit_item_id uuid unique references public.workout_kit_items(id) on delete cascade;
create or replace function public.sync_kit_exercise_program(p_kit_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare k public.workout_kits; v_program uuid; v_owner uuid; v_day uuid; item record;
begin
  select * into k from public.workout_kits where id=p_kit_id for update;
  if not found then return; end if;
  v_program := k.generated_program_id;
  if v_program is null then
    if not exists(select 1 from public.workout_kit_items where kit_id=p_kit_id and exercise_id is not null and day_of_week is not null) then return; end if;
    v_owner := k.created_by_id;
    if v_owner is null then select id into v_owner from public.profiles where role in ('admin','coach') and not is_deleted order by created_at limit 1; end if;
    if v_owner is null then raise exception 'Workout kit requires a staff owner'; end if;
    insert into public.workout_programs(owner_id,title_pt,title_en,difficulty,total_weeks,days_per_week,est_minutes_per_session,is_template)
    values(v_owner,k.name_pt,k.name_en,k.difficulty,k.total_weeks,k.days_per_week,k.est_minutes_per_session,true) returning id into v_program;
    update public.workout_kits set generated_program_id=v_program where id=p_kit_id;
  end if;
  update public.workout_programs set title_pt=k.name_pt,title_en=k.name_en,difficulty=k.difficulty,total_weeks=k.total_weeks,days_per_week=k.days_per_week,est_minutes_per_session=k.est_minutes_per_session where id=v_program;
  for item in select * from public.workout_kit_items where kit_id=p_kit_id and exercise_id is not null and day_of_week is not null order by order_index,id loop
    insert into public.workout_days(program_id,week_number,day_of_week,order_index,name_pt,name_en,est_minutes)
    values(v_program,1,item.day_of_week,0,k.name_pt,k.name_en,k.est_minutes_per_session)
    on conflict(program_id,week_number,day_of_week,order_index) do update set name_pt=excluded.name_pt,name_en=excluded.name_en,est_minutes=excluded.est_minutes returning id into v_day;
    insert into public.workout_exercises(day_id,exercise_id,order_index,source_kit_item_id,notes_pt,notes_en)
    values(v_day,item.exercise_id,item.order_index,item.id,item.notes_pt,item.notes_en)
    on conflict(source_kit_item_id) do update set day_id=excluded.day_id,exercise_id=excluded.exercise_id,order_index=excluded.order_index,notes_pt=excluded.notes_pt,notes_en=excluded.notes_en;
  end loop;
  delete from public.workout_exercises where day_id in(select id from public.workout_days where program_id=v_program)
    and source_kit_item_id not in(select id from public.workout_kit_items where kit_id=p_kit_id and exercise_id is not null and day_of_week is not null);
  delete from public.workout_days where program_id=v_program and not exists(select 1 from public.workout_exercises e where e.day_id=workout_days.id);
end $$;
revoke all on function public.sync_kit_exercise_program(uuid) from public,anon,authenticated;
grant execute on function public.sync_kit_exercise_program(uuid) to service_role;
create or replace function public.on_kit_exercise_change() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op in ('UPDATE','DELETE') then perform public.sync_kit_exercise_program(old.kit_id); end if;
 if tg_op in ('INSERT','UPDATE') then perform public.sync_kit_exercise_program(new.kit_id); end if;
 return null;
end $$;
create trigger kit_items_sync_exercises after insert or update or delete on public.workout_kit_items for each row execute function public.on_kit_exercise_change();
create or replace function public.on_kit_metadata_change() returns trigger language plpgsql security definer set search_path=public as $$
begin perform public.sync_kit_exercise_program(new.id); return null; end $$;
create trigger kit_metadata_sync_exercises after update of name_pt,name_en,difficulty,total_weeks,days_per_week,est_minutes_per_session on public.workout_kits for each row execute function public.on_kit_metadata_change();
do $$ declare k record; begin for k in select distinct kit_id from public.workout_kit_items where exercise_id is not null loop perform public.sync_kit_exercise_program(k.kit_id); end loop; end $$;

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
    and (a.program_id=p_program_id or exists(select 1 from public.workout_kit_items i where i.kit_id=a.kit_id and i.program_id=p_program_id and (i.day_of_week is null or i.day_of_week=v_dow))
      or exists(select 1 from public.workout_kits k where k.id=a.kit_id and k.generated_program_id=p_program_id and not k.is_deleted))
  ) then raise exception 'Workout not assigned'; end if;
  select * into v_session from public.workout_sessions where user_id=p_user_id and day_id=p_day_id and scheduled_date=p_date order by started_at desc nulls last limit 1;
  if found then return next v_session; return; end if;
  insert into public.workout_sessions(user_id,day_id,program_id,scheduled_date,started_at) values(p_user_id,p_day_id,p_program_id,p_date,now()) returning * into v_session;
  return next v_session;
end $$;

create or replace function public.log_student_workout_set(p_user_id uuid, p_input jsonb)
returns setof public.exercise_sets_log language plpgsql security definer set search_path = public as $$
declare v_session public.workout_sessions; v_item public.workout_exercises; v_log public.exercise_sets_log; v_id bigint; v_sets int;
begin
  select * into v_session from public.workout_sessions where id=(p_input->>'session_id')::uuid and user_id=p_user_id for update;
  if not found or v_session.completed_at is not null then raise exception 'Session unavailable'; end if;
  select * into v_item from public.workout_exercises where id=(p_input->>'workout_exercise_id')::uuid and day_id=v_session.day_id and exercise_id=(p_input->>'exercise_id')::uuid;
  if not found then raise exception 'Exercise not prescribed'; end if;
  select sets into v_sets from public.student_workout_overrides where student_id=p_user_id and workout_exercise_id=v_item.id and is_active;
  v_sets := coalesce(v_sets,v_item.sets);
  if (p_input->>'set_number')::int < 1 or (p_input->>'set_number')::int > v_sets then raise exception 'Set not prescribed'; end if;
  select id into v_id from public.exercise_sets_log where session_id=v_session.id and workout_exercise_id=v_item.id and set_number=(p_input->>'set_number')::int order by id limit 1;
  if v_id is null then
    insert into public.exercise_sets_log(session_id,workout_exercise_id,exercise_id,set_number,reps_done,weight_kg,rpe,duration_sec,distance_km,completed,failure_at_end)
    values(v_session.id,v_item.id,v_item.exercise_id,(p_input->>'set_number')::int,(p_input->>'reps_done')::int,(p_input->>'weight_kg')::numeric,(p_input->>'rpe')::numeric,(p_input->>'duration_sec')::int,(p_input->>'distance_km')::numeric,coalesce((p_input->>'completed')::boolean,true),coalesce((p_input->>'failure_at_end')::boolean,false)) returning * into v_log;
  else
    update public.exercise_sets_log set reps_done=(p_input->>'reps_done')::int,weight_kg=(p_input->>'weight_kg')::numeric,completed=coalesce((p_input->>'completed')::boolean,true),failure_at_end=coalesce((p_input->>'failure_at_end')::boolean,false),logged_at=now() where id=v_id returning * into v_log;
  end if;
  return next v_log;
end $$;

create or replace function public.complete_student_workout(p_user_id uuid, p_session_id uuid, p_input jsonb)
returns setof public.workout_sessions language plpgsql security definer set search_path = public as $$
declare v_session public.workout_sessions; v_volume numeric;
begin
  select * into v_session from public.workout_sessions where id=p_session_id and user_id=p_user_id for update;
  if not found then raise exception 'Session unavailable'; end if;
  if v_session.completed_at is not null then return next v_session; return; end if;
  select coalesce(sum(coalesce(weight_kg,0)*reps_done) filter(where completed),0) into v_volume from public.exercise_sets_log where session_id=p_session_id;
  update public.workout_sessions set completed_at=now(),is_paused=false,total_volume_kg=v_volume,
    feeling_scale=(p_input->>'feeling')::smallint,rpe_avg=(p_input->>'rpe')::numeric,
    notes=p_input->>'notes',duration_min=coalesce((p_input->>'duration_min')::int,greatest(0,round(extract(epoch from now()-v_session.started_at)/60)::int))
  where id=p_session_id and user_id=p_user_id returning * into v_session;
  return next v_session;
end $$;
revoke all on function public.start_student_workout(uuid,uuid,uuid,date), public.log_student_workout_set(uuid,jsonb), public.complete_student_workout(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.start_student_workout(uuid,uuid,uuid,date), public.log_student_workout_set(uuid,jsonb), public.complete_student_workout(uuid,uuid,jsonb) to service_role;
commit;
