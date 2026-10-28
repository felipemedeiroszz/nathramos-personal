begin;
-- A sala de mentoria é o vínculo único e explícito entre aluno e responsável.
create or replace function public.can_manage_student(p_student uuid, p_actor uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from profiles a join profiles s on s.id=p_student and s.role='student' and not s.is_deleted
 where a.id=p_actor and not a.is_deleted and (a.role='admin' or (a.role='coach' and exists(select 1 from mentorship_rooms r where r.user_id=s.id and r.coach_id=a.id))));
$$;
revoke all on function public.can_manage_student(uuid,uuid) from public,anon;
grant execute on function public.can_manage_student(uuid,uuid) to authenticated,service_role;

alter function public.admin_student_directory(text,text,int,int,text) rename to admin_student_directory_unscoped;
revoke all on function public.admin_student_directory_unscoped(text,text,int,int,text) from public,anon,authenticated;
create function public.admin_student_directory(p_search text default '',p_status text default '',p_limit int default 20,p_offset int default 0,p_locale text default 'pt-BR') returns jsonb language sql stable security definer set search_path=public as $$ select admin_student_directory_unscoped(p_search,p_status,p_limit,p_offset,p_locale) $$;
revoke all on function public.admin_student_directory(text,text,int,int,text) from public,anon,authenticated;
grant execute on function public.admin_student_directory(text,text,int,int,text) to service_role;
-- UI uses the actor-scoped overload.
create function public.admin_student_directory(p_search text,p_status text,p_limit int,p_offset int,p_locale text,p_actor uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb; actor_role text; rows jsonb; total int; page_size int; row_offset int;
begin
 select role::text into actor_role from profiles where id=p_actor and not is_deleted;
 if actor_role is null or actor_role not in ('admin','coach') then raise exception 'Acesso negado'; end if;
 if actor_role='admin' then return admin_student_directory_unscoped(p_search,p_status,p_limit,p_offset,p_locale); end if;
 page_size:=greatest(1,least(coalesce(p_limit,20),100));
 -- A coach never receives subscription/financial fields, including via search responses.
 select count(*) into total from profiles p left join auth.users u on u.id=p.id
 where can_manage_student(p.id,p_actor) and (coalesce(trim(p_search),'')='' or position(lower(trim(p_search)) in lower(p.full_name||' '||coalesce(u.email,'')))>0);
 row_offset:=greatest(0,least(coalesce(p_offset,0),((greatest(total,1)-1)/page_size)*page_size));
 select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into rows from (
 select p.id,p.full_name,u.email,p.phone,p.country,p.avatar_url,p.role,p.created_at,p.is_deleted
 from profiles p left join auth.users u on u.id=p.id where can_manage_student(p.id,p_actor)
 and (coalesce(trim(p_search),'')='' or position(lower(trim(p_search)) in lower(p.full_name||' '||coalesce(u.email,'')))>0)
 order by p.created_at desc,p.id desc limit page_size offset row_offset) r;
 return jsonb_build_object('students',rows,'total',total,'page',row_offset/page_size+1);
end; $$;
revoke all on function public.admin_student_directory(text,text,int,int,text,uuid) from public,anon,authenticated;
grant execute on function public.admin_student_directory(text,text,int,int,text,uuid) to service_role;

-- Restrictive policies narrow historical permissive coach policies.
do $$ declare t text; col text; begin
 for t,col in select * from (values ('profiles','id'),('exams','user_id'),('meetings','user_id'),('mentorship_rooms','user_id'),('student_workout_kits','student_id'),('student_diet_kits','student_id'),('student_supplement_kits','student_id')) as targets(t,c) loop
 execute format('create policy coach_scope on public.%I as restrictive for all to authenticated using (not public.is_coach() or auth.uid()=%I or public.can_manage_student(%I)) with check (not public.is_coach() or auth.uid()=%I or public.can_manage_student(%I))',t,col,col,col,col);
 end loop;
 for t in select unnest(array['payments','subscriptions','plans','audit_logs','platform_settings','notification_templates','social_links','content_pages']) loop
 if to_regclass('public.'||t) is not null then
 execute format('create policy coach_no_global_access on public.%I as restrictive for all to authenticated using (not public.is_coach()) with check (not public.is_coach())',t);
 end if;
 end loop;
end $$;
create or replace function public.admin_save_content_kit(p_kind text,p_kit jsonb,p_items jsonb,p_actor uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_table text;v_items text;v_id uuid:=coalesce((p_kit->>'id')::uuid,gen_random_uuid());v_item jsonb;v_item_id uuid;v_existing uuid;v_product uuid;v_previous uuid;v_kept uuid[]:=array[]::uuid[];v_index int:=0;v_result jsonb;v_owner uuid;
begin
 if not exists(select 1 from public.profiles where id=p_actor and role in ('admin','coach') and not is_deleted) then raise exception 'Staff required';end if;
 if p_kind not in ('diet','supplement') then raise exception 'Invalid kit kind';end if;
 v_table:=case when p_kind='diet' then 'diet_kits' else 'supplement_kits' end;
 v_items:=case when p_kind='diet' then 'diet_kit_items' else 'supplement_kit_items' end;
 perform pg_advisory_xact_lock(hashtextextended(v_table||':'||v_id::text,0));
 if p_kit->>'id' is not null then
  execute format('select created_by_id from public.%I where id=$1',v_table) into v_owner using v_id;
  if not exists(select 1 from profiles where id=p_actor and role='admin') and v_owner is distinct from p_actor then raise exception 'Kit belongs to another author';end if;
  execute format('select id from public.%I where id=$1 and not is_deleted for update',v_table) into v_existing using v_id;
  if v_existing is null then raise exception 'Kit unavailable';end if;
 end if;
 execute format($sql$insert into public.%I(id,name_pt,name_en,slug,description_pt,description_en,short_desc_pt,short_desc_en,cover_image_url,goal_pt,goal_en,tags,is_published,is_featured,created_by_id)
 values($1,$2->>'name_pt',$2->>'name_en',$2->>'slug',coalesce($2->>'description_pt',''),coalesce($2->>'description_en',''),coalesce($2->>'short_desc_pt',''),coalesce($2->>'short_desc_en',''),nullif($2->>'cover_image_url',''),$2->>'goal_pt',$2->>'goal_en',array(select jsonb_array_elements_text(coalesce($2->'tags','[]'::jsonb))),coalesce(($2->>'is_published')::boolean,true),coalesce(($2->>'is_featured')::boolean,false),$3)
 on conflict(id) do update set name_pt=excluded.name_pt,name_en=excluded.name_en,slug=excluded.slug,description_pt=excluded.description_pt,description_en=excluded.description_en,short_desc_pt=excluded.short_desc_pt,short_desc_en=excluded.short_desc_en,cover_image_url=excluded.cover_image_url,goal_pt=excluded.goal_pt,goal_en=excluded.goal_en,tags=excluded.tags,is_published=excluded.is_published,is_featured=excluded.is_featured$sql$,v_table) using v_id,p_kit,p_actor;
 for v_item in select value from jsonb_array_elements(p_items) loop
  v_item_id:=(v_item->>'id')::uuid;
  v_product:=(v_item->>case when p_kind='diet' then 'food_id' else 'supplement_id' end)::uuid;
  if p_kind='diet' then
   if not exists(select 1 from public.diet_foods where id=v_product and is_active) then raise exception 'Food unavailable';end if;
   if v_item_id is not null then
    select food_id into v_previous from public.diet_kit_items where id=v_item_id and kit_id=v_id;
    if not found then raise exception 'Item does not belong to kit';end if;
    if v_previous is distinct from v_product then v_item_id:=gen_random_uuid();end if;
   else
    select id into v_item_id from public.diet_kit_items where kit_id=v_id and food_id=v_product and meal_type=coalesce(v_item->>'meal_type','other')::meal_type_t and coalesce(time_of_day,'')=coalesce(v_item->>'time_of_day','') and not(id=any(v_kept)) order by order_index,id limit 1;
   end if;
   v_item_id:=coalesce(v_item_id,gen_random_uuid());
   if v_item_id=any(v_kept) then raise exception 'Duplicate kit item';end if;
   insert into public.diet_kit_items(id,kit_id,food_id,quantity,unit,meal_type,time_of_day,notes_pt,notes_en,order_index)
   values(v_item_id,v_id,v_product,(v_item->>'quantity')::numeric,v_item->>'unit',coalesce(v_item->>'meal_type','other')::meal_type_t,v_item->>'time_of_day',v_item->>'notes_pt',v_item->>'notes_en',v_index)
   on conflict(id) do update set food_id=excluded.food_id,quantity=excluded.quantity,unit=excluded.unit,meal_type=excluded.meal_type,time_of_day=excluded.time_of_day,notes_pt=excluded.notes_pt,notes_en=excluded.notes_en,order_index=excluded.order_index;
  else
   if not exists(select 1 from public.supplements where id=v_product and is_active) then raise exception 'Supplement unavailable';end if;
   if v_item_id is not null then
    select supplement_id into v_previous from public.supplement_kit_items where id=v_item_id and kit_id=v_id;
    if not found then raise exception 'Item does not belong to kit';end if;
    if v_previous is distinct from v_product then v_item_id:=gen_random_uuid();end if;
   else
    select id into v_item_id from public.supplement_kit_items where kit_id=v_id and supplement_id=v_product and not(id=any(v_kept)) limit 1;
   end if;
   v_item_id:=coalesce(v_item_id,gen_random_uuid());
   if v_item_id=any(v_kept) then raise exception 'Duplicate kit item';end if;
   insert into public.supplement_kit_items(id,kit_id,supplement_id,dosage,dosage_unit,frequency_per_day,times_of_day,notes_pt,notes_en,order_index)
   values(v_item_id,v_id,v_product,(v_item->>'dosage')::numeric,v_item->>'dosage_unit',coalesce((v_item->>'frequency_per_day')::int,1),array(select jsonb_array_elements_text(coalesce(v_item->'times_of_day','[]'::jsonb))),v_item->>'notes_pt',v_item->>'notes_en',v_index)
   on conflict(id) do update set supplement_id=excluded.supplement_id,dosage=excluded.dosage,dosage_unit=excluded.dosage_unit,frequency_per_day=excluded.frequency_per_day,times_of_day=excluded.times_of_day,notes_pt=excluded.notes_pt,notes_en=excluded.notes_en,order_index=excluded.order_index;
  end if;
  v_kept:=array_append(v_kept,v_item_id);v_index:=v_index+1;
 end loop;
 execute format('delete from public.%I where kit_id=$1 and not(id=any($2))',v_items) using v_id,v_kept;
 insert into public.audit_logs(actor_id,admin_id,table_name,operation,action,entity_type,entity_id,details) values(p_actor,p_actor,v_table,case when v_existing is null then 'INSERT' else 'UPDATE' end,p_kind||'_kit.save',v_table,v_id::text,jsonb_build_object('item_count',v_index));
 execute format('select to_jsonb(k) from public.%I k where id=$1',v_table) into v_result using v_id;
 return v_result;
end $$;
revoke all on function public.admin_save_content_kit(text,jsonb,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.admin_save_content_kit(text,jsonb,jsonb,uuid) to service_role;
create or replace function public.admin_sync_content_assignments(p_kind text,p_scope text,p_id uuid,p_ids uuid[],p_start date,p_end date,p_notes text,p_actor uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_table text;v_kit_table text;v_target uuid;v_found uuid;v_student uuid;v_kit uuid;v_column text;v_other text;
begin
 if not exists(select 1 from public.profiles where id=p_actor and role in ('admin','coach') and not is_deleted) then raise exception 'Staff required';end if;
 if p_kind not in ('diet','supplement') or p_scope not in ('student','kit') then raise exception 'Invalid assignment scope';end if;
 v_table:=case when p_kind='diet' then 'student_diet_kits' else 'student_supplement_kits' end;
 v_kit_table:=case when p_kind='diet' then 'diet_kits' else 'supplement_kits' end;
 v_column:=case when p_scope='student' then 'student_id' else 'kit_id' end;
 v_other:=case when p_scope='student' then 'kit_id' else 'student_id' end;
 perform pg_advisory_xact_lock(hashtextextended(v_table,0));
 p_ids:=array(select distinct unnest(coalesce(p_ids,array[]::uuid[])));
 if p_scope='student' then
  if not public.can_manage_student(p_id,p_actor) then raise exception 'Student unavailable or outside coach scope';end if;
  if not exists(select 1 from public.profiles where id=p_id and role='student' and not is_deleted) then raise exception 'Student unavailable';end if;
 else
  execute format('select id from public.%I where id=$1 and not is_deleted',v_kit_table) into v_found using p_id;
  if v_found is null then raise exception 'Kit unavailable';end if;
 end if;
 foreach v_target in array p_ids loop
  v_student:=case when p_scope='student' then p_id else v_target end;
  v_kit:=case when p_scope='student' then v_target else p_id end;
  if not public.can_manage_student(v_student,p_actor) then raise exception 'Student unavailable or outside coach scope';end if;
  if not exists(select 1 from public.profiles where id=v_student and role='student' and not is_deleted) then raise exception 'Student unavailable';end if;
  execute format('select id from public.%I where id=$1 and not is_deleted',v_kit_table) into v_found using v_kit;
  if v_found is null then raise exception 'Kit unavailable';end if;
 end loop;
 execute format('update public.%I set status=''archived'' where %I=$1 and status=''active'' and not(%I=any($2)) and public.can_manage_student(student_id,$3)',v_table,v_column,v_other) using p_id,p_ids,p_actor;
 foreach v_target in array p_ids loop
  v_student:=case when p_scope='student' then p_id else v_target end;
  v_kit:=case when p_scope='student' then v_target else p_id end;
  execute format('insert into public.%I(student_id,kit_id,assigned_by_id,start_date,end_date,notes) values($1,$2,$3,coalesce($4,current_date),$5,$6)
  on conflict(student_id,kit_id) where status=''active'' do update set start_date=coalesce($4,%I.start_date),end_date=$5,notes=$6,assigned_by_id=$3',v_table,v_table) using v_student,v_kit,p_actor,p_start,p_end,p_notes;
 end loop;
 execute format('select id from public.%I where %I=$1 and status=''active'' and end_date<start_date limit 1',v_table,v_column) into v_found using p_id;
 if v_found is not null then raise exception 'End date precedes start date';end if;
 insert into public.audit_logs(actor_id,admin_id,table_name,operation,action,entity_type,entity_id,details) values(p_actor,p_actor,v_table,'UPDATE',p_kind||'_assignments.sync',v_table,p_id::text,jsonb_build_object('scope',p_scope,'count',cardinality(p_ids)));
end $$;
revoke all on function public.admin_sync_content_assignments(text,text,uuid,uuid[],date,date,text,uuid) from public,anon,authenticated;
grant execute on function public.admin_sync_content_assignments(text,text,uuid,uuid[],date,date,text,uuid) to service_role;

commit;
