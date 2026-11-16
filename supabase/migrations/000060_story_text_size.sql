begin;
alter table public.community_stories add column text_scale numeric not null default 1 check(text_scale between 0.5 and 2);
create or replace function public.community_story_mutate(p_actor uuid,p_action text,p_input jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare admin boolean; result uuid; v_path text:=nullif(p_input->>'image_path',''); previous community_stories;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text||':community',0));
 admin:=community_actor(p_actor,p_action='create');
 if p_action='delete' then
  update community_stories set deleted_at=coalesce(deleted_at,now())
  where id=(p_input->>'id')::uuid and (author_id=p_actor or admin) returning id into result;
  if result is null then raise exception 'Story unavailable';end if;
  return result;
 end if;
 if p_action<>'create' or p_input->>'request_id' is null then raise exception 'Invalid action';end if;
 select * into previous from community_stories where request_id=(p_input->>'request_id')::uuid;
 if found then
  if previous.author_id<>p_actor then raise exception 'Request conflict';end if;
  return previous.id;
 end if;
 if (select count(*) from community_stories where author_id=p_actor and created_at>now()-interval '24 hours')>=20 then raise exception 'Story daily limit';end if;
 if v_path is not null then
  perform 1 from community_uploads where community_uploads.path=v_path and owner_id=p_actor and not deleting for update;
  if not found then raise exception 'Invalid story image';end if;
 end if;
 insert into community_stories(author_id,request_id,image_path,caption,theme,text_position,text_x,text_y,text_scale)
 values(p_actor,(p_input->>'request_id')::uuid,v_path,coalesce(p_input->>'caption',''),coalesce(p_input->>'theme','gold'),coalesce(p_input->>'text_position','center'),(p_input->>'text_x')::numeric,(p_input->>'text_y')::numeric,coalesce((p_input->>'text_scale')::numeric,1)) returning id into result;
 return result;
end $$;

create or replace function public.community_story_read(p_actor uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 perform community_actor(p_actor);
 return (select coalesce(jsonb_agg(item order by created_at desc),'[]') from (
  select s.created_at,jsonb_build_object('id',s.id,'author_id',s.author_id,'name',coalesce(nullif(p.full_name,''),'Aluno'),'avatar',p.avatar_url,'image_path',s.image_path,'caption',s.caption,'theme',s.theme,'text_position',s.text_position,'text_x',s.text_x,'text_y',s.text_y,'text_scale',s.text_scale,'created_at',s.created_at,'expires_at',s.expires_at) item
  from community_stories s join profiles p on p.id=s.author_id join auth.users u on u.id=p.id
  where s.deleted_at is null and s.expires_at>now() and not p.is_deleted and (u.banned_until is null or u.banned_until<=now())
  order by s.created_at desc limit 200
 ) active);
end $$;

revoke all on function public.community_story_mutate(uuid,text,jsonb),public.community_story_read(uuid) from public,anon,authenticated;
grant execute on function public.community_story_mutate(uuid,text,jsonb),public.community_story_read(uuid) to service_role;
commit;
