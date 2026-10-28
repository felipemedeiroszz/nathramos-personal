begin;
create function public.admin_work_queue(p_actor uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
 if not exists(select 1 from profiles where id=p_actor and role in ('admin','coach') and not is_deleted) then raise exception 'Acesso negado';end if;
 with tasks as (
 select 'exam' as kind,e.id::text as id,p.id as student_id,p.full_name as student,e.title as label,e.created_at as due from exams e join profiles p on p.id=e.user_id where not e.is_deleted and e.reviewed_at is null and can_manage_student(p.id,p_actor)
 union all select 'chat',r.id::text,p.id,p.full_name,r.unread_count_coach::text,r.last_message_at from mentorship_rooms r join profiles p on p.id=r.user_id where r.is_active and r.unread_count_coach>0 and can_manage_student(p.id,p_actor)
 union all select 'workout',p.id::text,p.id,p.full_name,''::text,p.created_at from profiles p where can_manage_student(p.id,p_actor) and not exists(select 1 from student_workout_kits a where a.student_id=p.id and a.status='active' and (a.start_date is null or a.start_date<=current_date) and (a.end_date is null or a.end_date>=current_date))
 union all select 'diet',p.id::text,p.id,p.full_name,''::text,p.created_at from profiles p where can_manage_student(p.id,p_actor) and not exists(select 1 from student_diet_kits a where a.student_id=p.id and a.status='active' and (a.start_date is null or a.start_date<=current_date) and (a.end_date is null or a.end_date>=current_date))
 union all select 'meeting',m.id::text,p.id,p.full_name,m.title_pt,m.start_at from meetings m join profiles p on p.id=m.user_id where m.status='scheduled' and m.start_at>=now() and m.start_at<now()+interval '7 days' and can_manage_student(p.id,p_actor)
 ), totals as (select kind,count(*) as total from tasks group by kind), upcoming as (select * from tasks order by due nulls last,kind,id limit 30)
 select jsonb_build_object('counts',coalesce((select jsonb_object_agg(kind,total) from totals),'{}'::jsonb),'items',coalesce((select jsonb_agg(to_jsonb(t)) from upcoming t),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.admin_work_queue(uuid) from public,anon,authenticated;
grant execute on function public.admin_work_queue(uuid) to service_role;

create function public.admin_assign_coach(p_actor uuid,p_student uuid,p_coach uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from profiles where id=p_actor and role='admin' and not is_deleted) then raise exception 'Administrador obrigatório';end if;
 if not exists(select 1 from profiles where id=p_student and role='student' and not is_deleted) or not exists(select 1 from profiles where id=p_coach and role in ('coach','admin') and not is_deleted) then raise exception 'Aluno ou responsável inválido';end if;
 insert into mentorship_rooms(user_id,coach_id,is_active) values(p_student,p_coach,true) on conflict(user_id) do update set coach_id=excluded.coach_id;
 update meetings set coach_id=p_coach where user_id=p_student and status='scheduled';
 insert into audit_logs(actor_id,admin_id,table_name,operation,action,entity_type,entity_id,details) values(p_actor,p_actor,'mentorship_rooms','UPDATE','student.assign_coach','profiles',p_student::text,jsonb_build_object('coach_id',p_coach));
end $$;
revoke all on function public.admin_assign_coach(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.admin_assign_coach(uuid,uuid,uuid) to service_role;
commit;
