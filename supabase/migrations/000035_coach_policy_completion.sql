begin;
-- The remaining student data must obey the same portfolio boundary.
do $$ declare t text; col text; command text;begin
 for t,col in select * from (values ('student_routine_logs','user_id'),('student_shopping_checks','user_id'),('student_routine_settings','user_id'),('student_workout_overrides','student_id'),('workout_sessions','user_id'),('water_intake_logs','user_id'),('sleep_logs','user_id'),('weight_logs','user_id'),('body_measurements','user_id'),('meal_logs','user_id'),('supplement_logs','user_id'),('user_supplements','user_id')) targets(t,c) loop
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name=col) then
 execute format('create policy coach_portfolio on public.%I as restrictive for all to authenticated using (not public.is_coach() or public.can_manage_student(%I)) with check (not public.is_coach() or public.can_manage_student(%I))',t,col,col);
 end if;
 end loop;
 foreach t in array array['diet_foods','supplements','ebooks','exam_categories','notification_templates','platform_settings','social_links','content_pages'] loop
 if to_regclass('public.'||t) is not null then
 foreach command in array array['insert','update','delete'] loop
 execute format('create policy coach_no_%s on public.%I as restrictive for %s to authenticated %s',command,t,command,case command when 'insert' then 'with check (not public.is_coach())' when 'delete' then 'using (not public.is_coach())' else 'using (not public.is_coach()) with check (not public.is_coach())' end);
 end loop;
 end if;
 end loop;
 foreach t in array array['diet_kits','supplement_kits','workout_kits','exercises','workout_programs'] loop
 col:=case when t='workout_programs' then 'owner_id' else 'created_by_id' end;
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name=col) then
 foreach command in array array['insert','update','delete'] loop
 execute format('create policy coach_own_%s on public.%I as restrictive for %s to authenticated %s',command,t,command,case command when 'insert' then format('with check (not public.is_coach() or %I=auth.uid())',col) when 'delete' then format('using (not public.is_coach() or %I=auth.uid())',col) else format('using (not public.is_coach() or %I=auth.uid()) with check (not public.is_coach() or %I=auth.uid())',col,col) end);
 end loop;
 end if;
 end loop;
end $$;
-- Child prescriptions cannot be edited by changing only an item ID.
do $$ declare t text; parent text; command text; rule text;begin
 foreach t in array array['diet_kit_items','supplement_kit_items','workout_kit_items'] loop
 parent:=replace(t,'_kit_items','_kits');
 rule:=format('(not public.is_coach() or exists(select 1 from public.%I p where p.id=kit_id and p.created_by_id=auth.uid()))',parent);
 foreach command in array array['insert','update','delete'] loop
 execute format('create policy coach_own_%s on public.%I as restrictive for %s to authenticated %s',command,t,command,case command when 'insert' then 'with check '||rule when 'delete' then 'using '||rule else 'using '||rule||' with check '||rule end);
 end loop;
 end loop;
end $$;
commit;
