begin;
create table public.student_daily_rules (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references profiles(id),
 kind text not null check(kind in ('diet','supplement','workout')), assignment_id uuid not null,
 effective_from date not null, rule jsonb not null check(jsonb_typeof(rule)='object'),
 revision int not null default 1, updated_by uuid not null references profiles(id), updated_at timestamptz not null default now(),
 unique(student_id,kind,assignment_id,effective_from)
);
create table public.student_day_prescriptions (
 user_id uuid not null references profiles(id), prescribed_date date not null, payload jsonb not null,
 updated_at timestamptz not null default now(), primary key(user_id,prescribed_date)
);
create table public.student_prescription_history (
 id bigint generated always as identity primary key, user_id uuid not null references profiles(id),
 prescribed_date date not null, payload jsonb not null, archived_at timestamptz not null default now()
);
create index on public.student_prescription_history(user_id,prescribed_date,id);
create table public.student_rule_history (
 id bigint generated always as identity primary key, student_id uuid not null references profiles(id),
 rule_version jsonb not null, archived_at timestamptz not null default now()
);
-- Trusted server access only. Browsers use authorized server actions.
alter table public.student_daily_rules enable row level security;
alter table public.student_day_prescriptions enable row level security;
alter table public.student_prescription_history enable row level security;
alter table public.student_rule_history enable row level security;
revoke all on public.student_daily_rules,public.student_day_prescriptions,public.student_prescription_history,public.student_rule_history from anon,authenticated;
grant all on public.student_daily_rules,public.student_day_prescriptions,public.student_prescription_history,public.student_rule_history to service_role;
grant usage,select on sequence public.student_prescription_history_id_seq,public.student_rule_history_id_seq to service_role;
create function public.save_student_daily_rule(p_actor uuid,p_student uuid,p_kind text,p_assignment uuid,p_effective date,p_rule jsonb,p_revision int) returns void
language plpgsql security definer set search_path=public as $$
declare existing student_daily_rules; target uuid; local_date date; kind_table text;
begin
 if not can_manage_student(p_student,p_actor) then raise exception 'Aluno fora da sua carteira'; end if;
 select (now() at time zone coalesce(timezone,'America/Sao_Paulo'))::date into local_date from profiles where id=p_student;
 if p_effective<local_date then raise exception 'Não é possível alterar dias passados';end if;
 kind_table:=case p_kind when 'diet' then 'student_diet_kits' when 'supplement' then 'student_supplement_kits' when 'workout' then 'student_workout_kits' end;
 if kind_table is null then raise exception 'Tipo inválido';end if;
 execute format('select student_id from %I where id=$1 and status=''active'' for share',kind_table) into target using p_assignment;
 if target is distinct from p_student then raise exception 'Vínculo indisponível';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_student::text||p_kind||p_assignment::text||p_effective::text,0));
 select * into existing from student_daily_rules where student_id=p_student and kind=p_kind and assignment_id=p_assignment and effective_from=p_effective for update;
 if coalesce(existing.revision,0)<>p_revision then raise exception 'Programação alterada. Atualize antes de salvar.';end if;
 if existing.id is not null then insert into student_rule_history(student_id,rule_version) values(p_student,to_jsonb(existing));end if;
 insert into student_daily_rules(student_id,kind,assignment_id,effective_from,rule,updated_by)
 values(p_student,p_kind,p_assignment,p_effective,p_rule,p_actor)
 on conflict(student_id,kind,assignment_id,effective_from) do update set rule=excluded.rule,revision=student_daily_rules.revision+1,updated_by=p_actor,updated_at=now();
end $$;
create function public.store_student_day(p_user uuid,p_date date,p_payload jsonb) returns void
language plpgsql security definer set search_path=public as $$
declare local_date date; previous jsonb;
begin
 select (now() at time zone coalesce(timezone,'America/Sao_Paulo'))::date into local_date from profiles where id=p_user;
 if p_date<>local_date then raise exception 'Only the current day can be materialized';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text||':prescription:'||p_date::text,0));
 select payload into previous from student_day_prescriptions where user_id=p_user and prescribed_date=p_date for update;
 if previous is not null and previous is distinct from p_payload then
 insert into student_prescription_history(user_id,prescribed_date,payload) values(p_user,p_date,previous);
 end if;
 insert into student_day_prescriptions(user_id,prescribed_date,payload) values(p_user,p_date,p_payload)
 on conflict(user_id,prescribed_date) do update set payload=excluded.payload,updated_at=now() where student_day_prescriptions.payload is distinct from excluded.payload;
end $$;
-- Keep the legacy validator for internal consumers without a materialized day.
alter function public.set_student_routine(uuid,text,uuid,uuid,text,boolean,date) rename to set_student_routine_legacy;
create function public.set_student_routine(p_user_id uuid,p_kind text,p_assignment_id uuid,p_item_id uuid,p_slot text,p_done boolean,p_date date)
returns void language plpgsql security definer set search_path=public as $$
declare plan jsonb; item jsonb; local_date date;
begin
 select (now() at time zone coalesce(timezone,'America/Sao_Paulo'))::date into local_date from profiles where id=p_user_id;
 select payload into plan from student_day_prescriptions where user_id=p_user_id and prescribed_date=p_date;
 if plan is null then
   perform set_student_routine_legacy(p_user_id,p_kind,p_assignment_id,p_item_id,p_slot,p_done,p_date);return;
 end if;
 if p_date<>local_date then raise exception 'Registro permitido apenas para hoje';end if;
 if p_kind not in ('diet','supplement') then raise exception 'Invalid routine kind';end if;
 select value into item from jsonb_array_elements(plan->case when p_kind='diet' then 'diet' else 'supplements' end)
 where value->>'assignmentId'=p_assignment_id::text and value->>'itemId'=p_item_id::text and value->>'slot'=p_slot;
 if item is null then raise exception 'Item não prescrito para hoje';end if;
 if p_done then
 insert into student_routine_logs(user_id,kind,assignment_id,item_id,slot,logged_date,calories_kcal,protein_g,carbs_g,fats_g)
 values(p_user_id,p_kind,p_assignment_id,p_item_id,p_slot,p_date,
 coalesce((item->'nutrition'->>'calories_kcal')::numeric,0),coalesce((item->'nutrition'->>'protein_g')::numeric,0),coalesce((item->'nutrition'->>'carbs_g')::numeric,0),coalesce((item->'nutrition'->>'fats_g')::numeric,0))
 on conflict(user_id,kind,assignment_id,item_id,slot,logged_date) do nothing;
 else delete from student_routine_logs where user_id=p_user_id and kind=p_kind and assignment_id=p_assignment_id and item_id=p_item_id and slot=p_slot and logged_date=p_date;end if;
end $$;
revoke all on function public.save_student_daily_rule(uuid,uuid,text,uuid,date,jsonb,int),public.store_student_day(uuid,date,jsonb),public.set_student_routine(uuid,text,uuid,uuid,text,boolean,date) from public,anon,authenticated;
grant execute on function public.save_student_daily_rule(uuid,uuid,text,uuid,date,jsonb,int),public.store_student_day(uuid,date,jsonb),public.set_student_routine(uuid,text,uuid,uuid,text,boolean,date) to service_role;
create trigger site_live_update after insert or update or delete on public.student_daily_rules for each row execute function public.site_signal_live_update();
commit;
