begin;
alter table public.exercise_sets_log add column drop_steps jsonb not null default '[]';
create function public.valid_drop_steps(steps jsonb) returns boolean language plpgsql immutable set search_path=public as $$
declare step jsonb;
begin
 if jsonb_typeof(steps)<>'array' or jsonb_array_length(steps)>10 then return false; end if;
 for step in select value from jsonb_array_elements(steps) loop
  if jsonb_typeof(step)<>'object' or jsonb_typeof(step->'reps_done') is distinct from 'number' or jsonb_typeof(step->'weight_kg') is distinct from 'number' then return false; end if;
  if (step->>'reps_done')::numeric not between 0 and 10000 or (step->>'reps_done')::numeric<>trunc((step->>'reps_done')::numeric) or (step->>'weight_kg')::numeric not between 0 and 100000 then return false; end if;
 end loop;
 return true;
exception when others then return false;
end $$;
alter table public.exercise_sets_log add constraint valid_drop_steps check(public.valid_drop_steps(drop_steps));
create table public.cardio_activities (
 id uuid primary key default gen_random_uuid(), name_pt text not null check(length(trim(name_pt)) between 1 and 100), name_en text not null check(length(trim(name_en)) between 1 and 100),
 is_active boolean not null default true, created_by_id uuid references profiles(id), created_at timestamptz not null default now()
);
insert into public.cardio_activities(name_pt,name_en) values ('Natação','Swimming'),('Corrida','Running'),('Caminhada','Walking'),('Corda','Jump rope'),('Bicicleta','Cycling'),('Elíptico','Elliptical'),('Escada','Stair climber');
create table public.student_cardio_schedule (
 student_id uuid not null references profiles(id) on delete cascade, weekday int not null check(weekday between 1 and 7), activity_id uuid not null references cardio_activities(id), target_minutes int not null check(target_minutes between 1 and 1440), primary key(student_id,weekday)
);
create table public.student_cardio_logs (
 student_id uuid not null references profiles(id) on delete cascade, performed_on date not null, status text not null check(status in ('done','skipped')),
 activity_id uuid references cardio_activities(id), duration_min int check(duration_min between 1 and 1440), notes text not null default '' check(length(notes)<=1000),
 updated_at timestamptz not null default now(), primary key(student_id,performed_on),
 check(status<>'done' or (activity_id is not null and duration_min is not null)), check(status<>'skipped' or duration_min is null)
);
alter table public.cardio_activities enable row level security;
alter table public.student_cardio_schedule enable row level security;
alter table public.student_cardio_logs enable row level security;
revoke all on public.cardio_activities,public.student_cardio_schedule,public.student_cardio_logs from public,anon,authenticated;
grant all on public.cardio_activities,public.student_cardio_schedule,public.student_cardio_logs to service_role;
create or replace function public.start_student_workout(p_user_id uuid, p_day_id uuid, p_program_id uuid, p_date date)
returns setof public.workout_sessions language plpgsql security definer set search_path = public as $$
declare v_session public.workout_sessions; v_dow int;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_day_id::text || ':' || p_date::text, 0));

  v_dow := extract(isodow from p_date);
  if not exists(select 1 from public.workout_days d where d.id=p_day_id and d.program_id=p_program_id) then raise exception 'Workout day unavailable'; end if;
  if not exists(
    select 1 from public.student_workout_kits a
    where a.student_id=p_user_id and a.status='active' and a.start_date<=p_date and (a.end_date is null or a.end_date>=p_date)
    and exists(select 1 from workout_programs p where p.id=p_program_id and p.status='active')
    and (a.kit_id is null or exists(select 1 from workout_kits k where k.id=a.kit_id and not k.is_deleted))
    and (a.program_id=p_program_id or exists(select 1 from public.workout_kit_items i where i.kit_id=a.kit_id and i.program_id=p_program_id)
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
  update exercise_sets_log set drop_steps=coalesce(p_input->'drop_steps','[]'::jsonb) where id=v_log.id returning * into v_log;
  return next v_log;
end $$;


create or replace function public.complete_student_workout(p_user_id uuid, p_session_id uuid, p_input jsonb)
returns setof public.workout_sessions language plpgsql security definer set search_path = public as $$
declare v_session public.workout_sessions; v_volume numeric;
begin
  select * into v_session from public.workout_sessions where id=p_session_id and user_id=p_user_id for update;
  if not found then raise exception 'Session unavailable'; end if;
  if v_session.completed_at is not null then return next v_session; return; end if;
  if p_input ? 'cardio' then
    if p_input->'cardio'->>'status' is null or p_input->'cardio'->>'status' not in ('done','skipped') then raise exception 'Invalid cardio status'; end if;
    if p_input->'cardio'->>'status'='done' and not exists(select 1 from cardio_activities where id=(p_input->'cardio'->>'activity_id')::uuid and is_active) then raise exception 'Invalid cardio activity'; end if;
    insert into student_cardio_logs(student_id,performed_on,status,activity_id,duration_min)
    values(p_user_id,(now() at time zone coalesce((select timezone from profiles where id=p_user_id),'America/Sao_Paulo'))::date,p_input->'cardio'->>'status',case when p_input->'cardio'->>'status'='done' then (p_input->'cardio'->>'activity_id')::uuid end,case when p_input->'cardio'->>'status'='done' then (p_input->'cardio'->>'duration_min')::int end)
    on conflict(student_id,performed_on) do update set status=excluded.status,activity_id=excluded.activity_id,duration_min=excluded.duration_min,updated_at=now();
  end if;
  select coalesce(sum(coalesce(weight_kg,0)*reps_done + coalesce((select sum((step->>'weight_kg')::numeric*(step->>'reps_done')::int) from jsonb_array_elements(drop_steps) step),0)) filter(where completed),0) into v_volume from public.exercise_sets_log where session_id=p_session_id;
  update public.workout_sessions set completed_at=now(),is_paused=false,total_volume_kg=v_volume,
    feeling_scale=(p_input->>'feeling')::smallint,rpe_avg=(p_input->>'rpe')::numeric,
    notes=p_input->>'notes',duration_min=coalesce((p_input->>'duration_min')::int,greatest(0,round(extract(epoch from now()-v_session.started_at)/60)::int))
  where id=p_session_id and user_id=p_user_id returning * into v_session;
  return next v_session;
end $$;

commit;
