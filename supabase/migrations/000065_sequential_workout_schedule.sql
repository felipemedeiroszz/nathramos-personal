begin;
create or replace function public.guard_workout_schedule() returns trigger language plpgsql security definer set search_path=public as $$
declare today date; queued int;
begin
 if new.status <> 'active' then return new; end if;
 if TG_OP='UPDATE' then
   if new.student_id=old.student_id and new.status=old.status and new.start_date=old.start_date and new.end_date is not distinct from old.end_date then return new; end if;
 end if;
 perform 1 from profiles where id=new.student_id for update;
 select (now() at time zone coalesce(nullif(timezone,''),'America/Sao_Paulo'))::date into today from profiles where id=new.student_id;
 if new.end_date is null or new.end_date<new.start_date then raise exception 'Informe datas de início e fim válidas para o kit.'; end if;
 if exists(select 1 from student_workout_kits a where a.student_id=new.student_id and a.id<>new.id and a.status='active' and daterange(a.start_date,a.end_date,'[]') && daterange(new.start_date,new.end_date,'[]')) then raise exception 'Este período se sobrepõe a outro treino. Ajuste as datas do período existente.'; end if;
 select count(*) into queued from student_workout_kits where student_id=new.student_id and id<>new.id and status='active' and (end_date is null or end_date>=today);
 if new.end_date>=today and queued>=6 then raise exception 'Limite de seis kits em andamento ou agendados atingido.'; end if;
 return new;
end $$;
revoke all on function public.guard_workout_schedule() from public,anon,authenticated;
drop trigger if exists guard_workout_schedule on public.student_workout_kits;
create trigger guard_workout_schedule before insert or update of start_date,end_date,status,student_id on public.student_workout_kits for each row execute function public.guard_workout_schedule();

create or replace function public.schedule_student_workout_kits(p_actor uuid,p_student uuid,p_entries jsonb,p_edit uuid default null) returns void language plpgsql security definer set search_path=public as $$
declare actor_role text; entry jsonb; previous_end date; starts date; ends date; kit uuid; today date; old_assignment student_workout_kits; result_id uuid;
begin
 select role::text into actor_role from profiles where id=p_actor and not is_deleted;
 if actor_role is null or actor_role not in ('admin','coach') or not can_manage_student(p_student,p_actor) then raise exception 'Acesso negado.'; end if;
 if not exists(select 1 from profiles where id=p_student and role='student' and not is_deleted) then raise exception 'Aluno indisponível.'; end if;
 if jsonb_typeof(p_entries) is distinct from 'array' then raise exception 'Sequência inválida.'; end if;
 if jsonb_array_length(p_entries) not between 1 and 6 or (p_edit is not null and jsonb_array_length(p_entries)<>1) then raise exception 'Informe de um a seis kits.'; end if;
 perform 1 from profiles where id=p_student for update;
 select (now() at time zone coalesce(nullif(timezone,''),'America/Sao_Paulo'))::date into today from profiles where id=p_student;
 if p_edit is not null then
   select * into old_assignment from student_workout_kits where id=p_edit and student_id=p_student and status='active' for update;
   if not found or old_assignment.end_date<today then raise exception 'Períodos encerrados não podem ser alterados.'; end if;
 end if;
 for entry in select * from jsonb_array_elements(p_entries) loop
   starts:=(entry->>'start_date')::date; ends:=(entry->>'end_date')::date; kit:=(entry->>'kit_id')::uuid;
   if starts is null or ends is null or ends<starts or ends<today then raise exception 'Informe um período válido, atual ou futuro.'; end if;
   if p_edit is null and starts<today then raise exception 'Novos kits devem começar hoje ou em uma data futura.'; end if;
   if p_edit is not null and (kit is distinct from old_assignment.kit_id or (old_assignment.start_date<today and starts<>old_assignment.start_date)) then raise exception 'Preserve o kit e o início de um período já iniciado.'; end if;
   if previous_end is not null and starts<=previous_end then raise exception 'Os períodos devem estar em sequência, sem sobreposição.'; end if;
   if not exists(select 1 from workout_kits where id=kit and not is_deleted and is_published) then raise exception 'Kit indisponível.'; end if;
   if p_edit is null then
     insert into student_workout_kits(student_id,kit_id,assigned_by_id,start_date,end_date,status) values(p_student,kit,p_actor,starts,ends,'active') returning id into result_id;
   else
     update student_workout_kits set start_date=starts,end_date=ends where id=p_edit returning id into result_id;
   end if;
   insert into audit_logs(admin_id,user_id,action,entity_type,entity_id,table_name,operation,details) values(p_actor,p_student,case when p_edit is null then 'workout.schedule' else 'workout.schedule.edit' end,'student_workout_kits',result_id::text,'student_workout_kits',case when p_edit is null then 'INSERT' else 'UPDATE' end,jsonb_build_object('start_date',starts,'end_date',ends,'kit_id',kit));
   previous_end:=ends;
 end loop;
end $$;
revoke all on function public.schedule_student_workout_kits(uuid,uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.schedule_student_workout_kits(uuid,uuid,jsonb,uuid) to service_role;

create or replace function public.can_assign_workout_kit(p_student_id uuid,p_extra_assignments int default 1) returns table(allowed boolean,current_active int,max_allowed int,reason text) language sql stable security definer set search_path=public as $$
 select n+greatest(p_extra_assignments,0)<=6,n,6,case when n+greatest(p_extra_assignments,0)<=6 then 'ok' else 'max_scheduled_kits_exceeded' end from (select count(*)::int n from student_workout_kits a join profiles p on p.id=a.student_id where a.student_id=p_student_id and a.status='active' and (a.end_date is null or a.end_date>=(now() at time zone coalesce(nullif(p.timezone,''),'America/Sao_Paulo'))::date)) s;
$$;
revoke all on function public.can_assign_workout_kit(uuid,int) from public,anon,authenticated;
grant execute on function public.can_assign_workout_kit(uuid,int) to service_role;
commit;
