begin;
create table public.prescription_revisions (
 id bigint generated always as identity primary key,
 table_name text not null,record_id uuid not null,student_id uuid,actor_id uuid,
 operation text not null,before_data jsonb,after_data jsonb,created_at timestamptz not null default now()
);
create index prescription_revisions_record_idx on public.prescription_revisions(table_name,record_id,id desc);
alter table public.prescription_revisions enable row level security;
create policy revisions_admin_read on public.prescription_revisions for select to authenticated using(public.is_admin() or (student_id is not null and public.can_manage_student(student_id)));
revoke all on public.prescription_revisions from anon,authenticated;
grant select on public.prescription_revisions to authenticated;
create function public.capture_prescription_revision() returns trigger language plpgsql security definer set search_path=public as $$
declare previous jsonb; current_row jsonb; record uuid; student uuid; actor uuid;
begin
 previous:=case when tg_op='INSERT' then null else to_jsonb(old) end;
 current_row:=case when tg_op='DELETE' then null else to_jsonb(new) end;
 record:=coalesce(current_row->>'id',previous->>'id')::uuid;
 student:=coalesce(current_row->>'student_id',previous->>'student_id')::uuid;
 actor:=coalesce(auth.uid(),nullif(current_setting('app.prescription_actor',true),'')::uuid);
 insert into prescription_revisions(table_name,record_id,student_id,actor_id,operation,before_data,after_data) values(tg_table_name,record,student,actor,tg_op,previous,current_row);
 return coalesce(new,old);
end $$;
create function public.bump_prescription_revision() returns trigger language plpgsql as $$begin new.revision:=old.revision+1;return new;end $$;
create function public.bump_kit_after_item() returns trigger language plpgsql security definer set search_path=public as $$
declare kit uuid; parent text;
begin
 kit:=case when tg_op='DELETE' then old.kit_id else new.kit_id end;
 parent:=replace(tg_table_name,'_kit_items','_kits');
 execute format('update public.%I set revision=revision where id=$1',parent) using kit;
 return coalesce(new,old);
end $$;
do $$ declare t text;begin
 foreach t in array array['diet_kits','supplement_kits','workout_kits'] loop
 execute format('alter table public.%I add column revision int not null default 1',t);
 execute format('create trigger bump_revision before update on public.%I for each row execute function bump_prescription_revision()',t);
 end loop;
 foreach t in array array['diet_kits','supplement_kits','workout_kits','diet_kit_items','supplement_kit_items','workout_kit_items','student_diet_kits','student_supplement_kits','student_workout_kits','student_workout_overrides'] loop
 execute format('create trigger capture_revision after insert or update or delete on public.%I for each row execute function capture_prescription_revision()',t);
 end loop;
 foreach t in array array['diet_kit_items','supplement_kit_items','workout_kit_items'] loop
 execute format('create trigger bump_parent_revision after insert or update or delete on public.%I for each row execute function bump_kit_after_item()',t);
 end loop;
end $$;
create or replace function public.admin_save_content_kit(p_kind text,p_kit jsonb,p_items jsonb,p_actor uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_table text;v_items text;v_id uuid:=coalesce((p_kit->>'id')::uuid,gen_random_uuid());v_item jsonb;v_item_id uuid;v_existing uuid;v_product uuid;v_previous uuid;v_kept uuid[]:=array[]::uuid[];v_index int:=0;v_result jsonb;v_owner uuid;v_revision int;
begin
 if not exists(select 1 from public.profiles where id=p_actor and role in ('admin','coach') and not is_deleted) then raise exception 'Staff required';end if;
 if p_kind not in ('diet','supplement') then raise exception 'Invalid kit kind';end if;
 v_table:=case when p_kind='diet' then 'diet_kits' else 'supplement_kits' end;
 v_items:=case when p_kind='diet' then 'diet_kit_items' else 'supplement_kit_items' end;
 perform pg_advisory_xact_lock(hashtextextended(v_table||':'||v_id::text,0));
 perform set_config('app.prescription_actor',p_actor::text,true);
 if p_kit->>'id' is not null then
  execute format('select revision from public.%I where id=$1',v_table) into v_revision using v_id;
  if p_kit ? 'revision' and (p_kit->>'revision')::int is distinct from v_revision then raise exception 'Esta prescrição foi alterada. Recarregue antes de salvar.';end if;
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

commit;
