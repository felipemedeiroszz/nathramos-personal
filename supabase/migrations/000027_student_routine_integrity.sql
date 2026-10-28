begin;
create or replace function public.record_student_health(p_user_id uuid,p_date date,p_weight numeric default null,p_sleep int default null)
returns void language plpgsql security definer set search_path=public as $$
declare v_id bigint;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':health:' || p_date::text,0));
 if p_weight is not null then
   select id into v_id from public.weight_logs where user_id=p_user_id and logged_date=p_date order by id desc limit 1;
   if v_id is null then insert into public.weight_logs(user_id,logged_date,weight_kg) values(p_user_id,p_date,p_weight);
   else update public.weight_logs set weight_kg=p_weight where id=v_id; end if;
   update public.profiles set weight_kg=p_weight where id=p_user_id;
 end if;
 if p_sleep is not null then
   if p_sleep<0 or p_sleep>1440 then raise exception 'Invalid sleep duration'; end if;
   insert into public.sleep_logs(user_id,logged_date,total_minutes) values(p_user_id,p_date,p_sleep)
   on conflict(user_id,logged_date) do update set total_minutes=excluded.total_minutes;
 end if;
end $$;

create or replace function public.set_student_routine(p_user_id uuid,p_kind text,p_assignment_id uuid,p_item_id uuid,p_slot text,p_done boolean,p_date date)
returns void language plpgsql security definer set search_path=public as $$
declare v_valid boolean; v_item record; v_factor numeric:=0; v_times text[]; v_doses int; v_cal numeric:=0; v_protein numeric:=0; v_carbs numeric:=0; v_fats numeric:=0;
begin
 if p_kind='diet' then
   select true into v_valid from public.student_diet_kits a join public.diet_kits k on k.id=a.kit_id where a.id=p_assignment_id and a.student_id=p_user_id and a.status='active' and a.start_date<=p_date and (a.end_date is null or a.end_date>=p_date) and not k.is_deleted for share of a;
   if not coalesce(v_valid,false) then raise exception 'Diet assignment unavailable'; end if;
   select i.*,f.serving_size,f.serving_unit,f.calories_kcal,f.protein_g,f.carbs_g,f.fats_g into v_item
   from public.diet_kit_items i join public.diet_foods f on f.id=i.food_id join public.student_diet_kits a on a.kit_id=i.kit_id where i.id=p_item_id and a.id=p_assignment_id and f.is_active;
   if not found or coalesce(v_item.time_of_day,'')<>p_slot then raise exception 'Diet item unavailable'; end if;
   if lower(trim(coalesce(nullif(v_item.unit,''),v_item.serving_unit)))=lower(trim(v_item.serving_unit)) and v_item.serving_size>0 then
     v_factor:=coalesce(v_item.quantity,v_item.serving_size)/v_item.serving_size;
     v_cal:=round(v_item.calories_kcal*v_factor,1); v_protein:=round(v_item.protein_g*v_factor,1);
     v_carbs:=round(v_item.carbs_g*v_factor,1);v_fats:=round(v_item.fats_g*v_factor,1);
   end if;
 elsif p_kind='supplement' then
   select true into v_valid from public.student_supplement_kits a join public.supplement_kits k on k.id=a.kit_id where a.id=p_assignment_id and a.student_id=p_user_id and a.status='active' and a.start_date<=p_date and (a.end_date is null or a.end_date>=p_date) and not k.is_deleted for share of a;
   if not coalesce(v_valid,false) then raise exception 'Supplement assignment unavailable'; end if;
   select i.* into v_item from public.supplement_kit_items i join public.supplements s on s.id=i.supplement_id join public.student_supplement_kits a on a.kit_id=i.kit_id where i.id=p_item_id and a.id=p_assignment_id and s.is_active;
   if not found then raise exception 'Supplement item unavailable'; end if;
   select coalesce(array_agg(distinct left(t,5)),array[]::text[]) into v_times from unnest(v_item.times_of_day) t where t ~ '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$';
   v_doses:=greatest(0,v_item.frequency_per_day-cardinality(v_times));
   if not(p_slot=any(v_times)) and not exists(select 1 from generate_series(1,v_doses) n where p_slot='dose-'||n) then raise exception 'Dose unavailable'; end if;
 else raise exception 'Invalid routine kind'; end if;
 if p_done then
   insert into public.student_routine_logs(user_id,kind,assignment_id,item_id,slot,logged_date,calories_kcal,protein_g,carbs_g,fats_g)
   values(p_user_id,p_kind,p_assignment_id,p_item_id,p_slot,p_date,v_cal,v_protein,v_carbs,v_fats)
   on conflict(user_id,kind,assignment_id,item_id,slot,logged_date) do nothing;
 else
   delete from public.student_routine_logs where user_id=p_user_id and kind=p_kind and assignment_id=p_assignment_id and item_id=p_item_id and slot=p_slot and logged_date=p_date;
 end if;
end $$;
revoke all on function public.record_student_health(uuid,date,numeric,int),public.set_student_routine(uuid,text,uuid,uuid,text,boolean,date) from public,anon,authenticated;
grant execute on function public.record_student_health(uuid,date,numeric,int),public.set_student_routine(uuid,text,uuid,uuid,text,boolean,date) to service_role;
commit;
