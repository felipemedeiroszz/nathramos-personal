-- Archive preserves history; delete hides history for both participants (soft deletion).
create or replace function public.manage_mentorship_conversation(p_actor uuid, p_room uuid, p_action text)
returns void language plpgsql security definer set search_path = public as $$
declare actor_role text; room public.mentorship_rooms%rowtype;
begin
  select role::text into actor_role from public.profiles where id=p_actor and not is_deleted;
  if actor_role is null or actor_role not in ('admin','coach') then raise exception 'Acesso negado'; end if;
  if p_action is null or p_action not in ('archive','reopen','delete') then raise exception 'Ação inválida'; end if;
  if p_action='delete' and actor_role <> 'admin' then raise exception 'Acesso negado'; end if;
  select * into room from public.mentorship_rooms where id=p_room for update;
  if not found or (actor_role='coach' and room.coach_id is distinct from p_actor) then raise exception 'Conversa indisponível'; end if;
  if p_action='delete' then
    update public.chat_messages set is_deleted=true, deleted_at=now() where room_id=p_room and not is_deleted;
    update public.mentorship_rooms set is_active=false, unread_count_user=0, unread_count_coach=0, last_message_at=null where id=p_room;
  else
    update public.mentorship_rooms set is_active=(p_action='reopen') where id=p_room;
  end if;
  insert into public.audit_logs(admin_id,user_id,action,entity_type,entity_id,table_name,operation,details)
    values(p_actor,room.user_id,'mentorship_room.'||p_action,'mentorship_room',p_room::text,'mentorship_rooms','UPDATE',jsonb_build_object('history_hidden',p_action='delete'));
end $$;
revoke all on function public.manage_mentorship_conversation(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.manage_mentorship_conversation(uuid,uuid,text) to service_role;

-- Serialize new messages with archive/delete, so an in-flight send cannot recreate a cleared history.
create or replace function public.guard_open_mentorship_room() returns trigger
language plpgsql security definer set search_path=public as $$
declare room_active boolean;
begin
  select is_active into room_active from public.mentorship_rooms where id=new.room_id for update;
  if room_active is distinct from true then raise exception 'Esta conversa está arquivada.'; end if;
  return new;
end $$;
revoke all on function public.guard_open_mentorship_room() from public,anon,authenticated;
drop trigger if exists guard_open_mentorship_room on public.chat_messages;
create trigger guard_open_mentorship_room before insert on public.chat_messages for each row execute function public.guard_open_mentorship_room();
