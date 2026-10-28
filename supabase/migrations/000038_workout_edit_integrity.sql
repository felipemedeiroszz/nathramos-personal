begin;
create function public.admin_mutate_workout_items(p_actor uuid,p_kit uuid,p_revision int,p_operation text,p_items jsonb) returns void language plpgsql security definer set search_path=public as $$
declare owner uuid; version int; item jsonb; affected int;
begin
 select created_by_id,revision into owner,version from workout_kits where id=p_kit and not is_deleted for update;
 if version is null or not exists(select 1 from profiles where id=p_actor and not is_deleted and (role='admin' or (role='coach' and owner=p_actor))) then raise exception 'Acesso negado';end if;
 if p_revision is null or p_revision<>version then raise exception 'Kit alterado. Recarregue antes de salvar.';end if;
 perform set_config('app.prescription_actor',p_actor::text,true);
 if p_operation='remove' then
  delete from workout_kit_items where kit_id=p_kit and id=(p_items->>0)::uuid;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'Item indisponível';end if;
 elsif p_operation='reorder' then
  if jsonb_array_length(p_items)<>(select count(*) from workout_kit_items where kit_id=p_kit)
  or (select count(distinct value->>'id') from jsonb_array_elements(p_items))<>jsonb_array_length(p_items)
  or (select count(distinct value->>'order_index') from jsonb_array_elements(p_items))<>jsonb_array_length(p_items)
  then raise exception 'Lista de itens inválida';end if;
  for item in select value from jsonb_array_elements(p_items) loop
   if (item->>'order_index')::int<0 then raise exception 'Ordem inválida';end if;
   update workout_kit_items set order_index=(item->>'order_index')::int where id=(item->>'id')::uuid and kit_id=p_kit;
   get diagnostics affected=row_count;
   if affected<>1 then raise exception 'Item de outro kit';end if;
  end loop;
 else raise exception 'Operação inválida';end if;
end $$;
revoke all on function public.admin_mutate_workout_items(uuid,uuid,int,text,jsonb) from public,anon,authenticated;
grant execute on function public.admin_mutate_workout_items(uuid,uuid,int,text,jsonb) to service_role;
-- Nested program rows inherit ownership for direct authenticated writes.
create policy coach_own_days on public.workout_days as restrictive for all to authenticated
 using(not public.is_coach() or exists(select 1 from workout_programs p where p.id=program_id and (p.owner_id=auth.uid() or can_manage_student(p.owner_id))))
 with check(not public.is_coach() or exists(select 1 from workout_programs p where p.id=program_id and p.owner_id=auth.uid()));
create policy coach_own_exercises on public.workout_exercises as restrictive for all to authenticated
 using(not public.is_coach() or exists(select 1 from workout_days d join workout_programs p on p.id=d.program_id where d.id=day_id and (p.owner_id=auth.uid() or can_manage_student(p.owner_id))))
 with check(not public.is_coach() or exists(select 1 from workout_days d join workout_programs p on p.id=d.program_id where d.id=day_id and p.owner_id=auth.uid()));
commit;
