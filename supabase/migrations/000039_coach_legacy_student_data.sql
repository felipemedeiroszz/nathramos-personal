begin;
do $$ declare t text;begin
 foreach t in array array['diet_programs','personal_records','shopping_lists','hydration_goals'] loop
 execute format('create policy coach_portfolio on public.%I as restrictive for all to authenticated using (not public.is_coach() or can_manage_student(user_id)) with check (not public.is_coach() or can_manage_student(user_id))',t);
 end loop;
end $$;
create policy coach_portfolio on public.exercise_sets_log as restrictive for all to authenticated
 using(not public.is_coach() or exists(select 1 from workout_sessions s where s.id=session_id and can_manage_student(s.user_id)))
 with check(not public.is_coach() or exists(select 1 from workout_sessions s where s.id=session_id and can_manage_student(s.user_id)));
create policy coach_portfolio on public.diet_meals as restrictive for all to authenticated
 using(not public.is_coach() or exists(select 1 from diet_programs p where p.id=diet_id and can_manage_student(p.user_id)))
 with check(not public.is_coach() or exists(select 1 from diet_programs p where p.id=diet_id and can_manage_student(p.user_id)));
create policy coach_portfolio on public.diet_meal_items as restrictive for all to authenticated
 using(not public.is_coach() or exists(select 1 from diet_meals m join diet_programs p on p.id=m.diet_id where m.id=meal_id and can_manage_student(p.user_id)))
 with check(not public.is_coach() or exists(select 1 from diet_meals m join diet_programs p on p.id=m.diet_id where m.id=meal_id and can_manage_student(p.user_id)));
create policy coach_portfolio on public.shopping_list_items as restrictive for all to authenticated
 using(not public.is_coach() or exists(select 1 from shopping_lists s where s.id=shopping_list_id and can_manage_student(s.user_id)))
 with check(not public.is_coach() or exists(select 1 from shopping_lists s where s.id=shopping_list_id and can_manage_student(s.user_id)));
create policy coach_private_programs on public.workout_programs as restrictive for select to authenticated
 using(not public.is_coach() or owner_id=auth.uid() or is_template or can_manage_student(owner_id) or exists(select 1 from student_workout_kits a where a.program_id=workout_programs.id and can_manage_student(a.student_id)));
commit;
