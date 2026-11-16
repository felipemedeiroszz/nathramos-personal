begin;
alter table public.community_posts add column music_track_id bigint check(music_track_id between 1 and 9007199254740991);
alter table public.community_stories add column music_track_id bigint check(music_track_id between 1 and 9007199254740991);
create or replace function public.community_mutate(p_actor uuid,p_action text,p_input jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare admin boolean; item community_posts; comment community_comments; result_id uuid;
 target uuid; paths text[]; content text; request uuid; previous_kind text; until_time timestamptz;
begin
 -- Serializes rate limits, retries and uploads for each actor.
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text||':community',0));
 admin:=community_actor(p_actor,p_action in ('post','edit','comment'));
 if p_action in ('post','edit') then
  content:=trim(coalesce(p_input->>'body',''));
  select coalesce(array_agg(value),'{}') into paths from jsonb_array_elements_text(coalesce(p_input->'images','[]'));
  if length(content)>5000 or cardinality(paths)>3 or (content='' and cardinality(paths)=0) then raise exception 'Invalid publication';end if;
  if p_action='edit' then
   select * into item from community_posts where id=(p_input->>'id')::uuid for update;
   if not found or item.deleted_at is not null or item.author_id<>p_actor then raise exception 'Publication unavailable';end if;
   if item.version<>(p_input->>'version')::int then raise exception 'Publication changed. Reload before editing';end if;
  else
   request:=(p_input->>'request_id')::uuid;
   select id into result_id from community_posts where request_id=request and author_id=p_actor and deleted_at is null;
   if found then return result_id;end if;
  end if;
  perform 1 from community_uploads where path=any(paths) order by path for update;
  if exists(select 1 from unnest(paths) path where not exists(
   select 1 from community_uploads u where u.path=path and u.owner_id=p_actor and not u.deleting
   and not exists(select 1 from community_posts p where p.id<>coalesce(item.id,'00000000-0000-0000-0000-000000000000') and path=any(p.images))
  )) or cardinality(paths)<>(select count(distinct path) from unnest(paths) path) then raise exception 'Invalid images';end if;
  if p_action='post' then
   if (select count(*) from community_posts where author_id=p_actor and created_at>now()-interval '1 hour')>=10 then raise exception 'Publication rate limit reached';end if;
   insert into community_posts(author_id,body,images,request_id,music_track_id) values(p_actor,content,paths,request,(p_input->>'music_track_id')::bigint) returning id into result_id;
  else
   update community_posts set body=content,images=paths,music_track_id=case when p_input ? 'music_track_id' then (p_input->>'music_track_id')::bigint else music_track_id end,version=version+1,updated_at=now() where id=item.id;
   result_id:=item.id;
  end if;
 elsif p_action in ('comment','react','delete_post') then
  select * into item from community_posts where id=(p_input->>'post_id')::uuid for update;
  if not found or item.deleted_at is not null then raise exception 'Publication unavailable';end if;
  result_id:=item.id;
  if p_action='comment' then
   request:=(p_input->>'request_id')::uuid;
   select id into target from community_comments where request_id=request and author_id=p_actor and post_id=item.id;
   if found then return item.id;end if;
   if (select count(*) from community_comments where author_id=p_actor and created_at>now()-interval '10 minutes')>=30 then raise exception 'Comment rate limit reached';end if;
   if p_input->>'parent_id' is not null then
    select * into comment from community_comments where id=(p_input->>'parent_id')::uuid and post_id=item.id and deleted_at is null;
    if not found then raise exception 'Reply unavailable';end if;
   end if;
   insert into community_comments(post_id,author_id,parent_id,body,request_id)
   values(item.id,p_actor,comment.id,trim(p_input->>'body'),request) returning id into target;
   perform community_notify(p_actor,item.id,target);
  elsif p_action='react' then
   select kind into previous_kind from community_reactions where post_id=item.id and user_id=p_actor;
   if p_input->>'kind' is null then delete from community_reactions where post_id=item.id and user_id=p_actor;
   else
    insert into community_reactions(post_id,user_id,kind) values(item.id,p_actor,p_input->>'kind')
    on conflict(post_id,user_id) do update set kind=excluded.kind;
    if previous_kind is null then perform community_notify(p_actor,item.id);end if;
   end if;
  else
   if item.author_id<>p_actor and not admin then raise exception 'Delete denied';end if;
   if admin and length(trim(coalesce(p_input->>'reason','')))=0 then raise exception 'Moderation reason required';end if;
   update community_posts set deleted_at=now(),version=version+1 where id=item.id;
   if admin then
    insert into audit_logs(admin_id,user_id,action,entity_type,entity_id,details,table_name,operation)
    values(p_actor,item.author_id,'community.post_deleted','community_posts',item.id::text,jsonb_build_object('reason',p_input->>'reason'),'community_posts','DELETE');
   end if;
  end if;
 elsif p_action='delete_comment' then
  -- Match the post lock order used by comment insertion.
  select post_id into target from community_comments where id=(p_input->>'id')::uuid;
  perform 1 from community_posts where id=target for update;
  select * into comment from community_comments where id=(p_input->>'id')::uuid for update;
  if not found or (comment.author_id<>p_actor and not admin) then raise exception 'Delete denied';end if;
  if admin and length(trim(coalesce(p_input->>'reason','')))=0 then raise exception 'Moderation reason required';end if;
  if comment.deleted_at is not null then return comment.post_id;end if;
  update community_comments set deleted_at=now() where id=comment.id;
  result_id:=comment.post_id;
  if admin then
   insert into audit_logs(admin_id,user_id,action,entity_type,entity_id,details,table_name,operation)
   values(p_actor,comment.author_id,'community.comment_deleted','community_comments',comment.id::text,jsonb_build_object('reason',p_input->>'reason'),'community_comments','DELETE');
  end if;
 elsif p_action='restrict' then
  if not admin then raise exception 'Administrator required';end if;
  target:=(p_input->>'user_id')::uuid;
  if not exists(select 1 from profiles where id=target and role='student' and not is_deleted) then raise exception 'Student unavailable';end if;
  until_time:=(p_input->>'until')::timestamptz;
  if until_time>now()+interval '365 days' then raise exception 'Invalid suspension duration';end if;
  insert into community_restrictions(user_id,blocked_until,reason,updated_by)
  values(target,coalesce(until_time,now()),trim(p_input->>'reason'),p_actor)
  on conflict(user_id) do update set blocked_until=excluded.blocked_until,reason=excluded.reason,updated_by=p_actor,updated_at=now();
  insert into audit_logs(admin_id,user_id,action,entity_type,entity_id,details,table_name,operation)
  values(p_actor,target,'community.permissions_updated','community_restrictions',target::text,p_input-'user_id','community_restrictions','UPDATE');
  result_id:=target;
 else raise exception 'Unknown community action';end if;
 return result_id;
end $$;

create or replace function public.community_read(p_actor uuid,p_filter jsonb default '{}')
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare admin boolean; result jsonb; mode text:=coalesce(p_filter->>'mode','posts');
begin
 admin:=community_actor(p_actor);
 if (p_filter->>'admin')::boolean is true and not admin then raise exception 'Administrator required';end if;
 if not admin and (mode<>'posts' or p_filter->>'author' is not null or p_filter->>'q' is not null) then raise exception 'Administrator required';end if;
 if mode='posts' then
  select coalesce(jsonb_agg(row_data order by created_at desc,id desc),'[]') into result from (
   select p.created_at,p.id,jsonb_build_object(
    'id',p.id,'music_track_id',p.music_track_id,'body',p.body,'images',p.images,'author_id',p.author_id,'name',coalesce(nullif(a.full_name,''),'Aluno'),'avatar',a.avatar_url,
    'created_at',p.created_at,'updated_at',p.updated_at,'version',p.version,
    'comment_count',(select count(*) from community_comments c where c.post_id=p.id and c.deleted_at is null),
    'reaction_count',(select count(*) from community_reactions r where r.post_id=p.id),
    'my_reaction',(select kind from community_reactions r where r.post_id=p.id and r.user_id=p_actor),
    'reactions',(select coalesce(jsonb_object_agg(kind,n),'{}') from (select kind,count(*) n from community_reactions r where r.post_id=p.id group by kind) kinds)
   ) row_data
   from community_posts p join profiles a on a.id=p.author_id
   where p.deleted_at is null and not a.is_deleted
    and (p_filter->>'post' is null or p.id=(p_filter->>'post')::uuid)
    and (p_filter->>'author' is null or p.author_id=(p_filter->>'author')::uuid)
    and (p_filter->>'q' is null or a.full_name ilike '%'||(p_filter->>'q')||'%')
    and (p_filter->>'from' is null or p.created_at>=(p_filter->>'from')::timestamptz)
    and (p_filter->>'to' is null or p.created_at<(p_filter->>'to')::timestamptz)
    and (p_filter->>'cursor' is null or (p.created_at,p.id)<((p_filter->>'cursor')::timestamptz,(p_filter->>'cursor_id')::uuid))
   order by p.created_at desc,p.id desc limit 21
  ) rows;
 elsif mode='members' and admin then
  select coalesce(jsonb_agg(row_data order by created_at desc,id desc),'[]') into result from (
   select a.id,a.created_at,jsonb_build_object('id',a.id,'author_id',a.id,'name',a.full_name,'created_at',a.created_at,
    'body',case when r.blocked_until>now() then 'Participação suspensa' else 'Participação ativa' end) row_data
   from profiles a left join community_restrictions r on r.user_id=a.id where a.role='student' and not a.is_deleted
    and (p_filter->>'q' is null or a.full_name ilike '%'||(p_filter->>'q')||'%')
    and (p_filter->>'author' is null or a.id=(p_filter->>'author')::uuid)
    and (p_filter->>'cursor' is null or (a.created_at,a.id)<((p_filter->>'cursor')::timestamptz,(p_filter->>'cursor_id')::uuid))
   order by a.created_at desc,a.id desc limit 21
  ) rows;
 elsif mode in ('comments','reactions') and admin then
  select coalesce(jsonb_agg(row_data order by created_at desc,id desc),'[]') into result from (
   select c.created_at,c.id,jsonb_build_object('id',c.id,'post_id',c.post_id,'author_id',c.author_id,'name',a.full_name,'body',c.body,'created_at',c.created_at,'parent_id',c.parent_id) row_data
   from (
    select id,post_id,author_id,body,created_at,parent_id from community_comments where deleted_at is null and mode='comments'
    union all select id,post_id,user_id,kind,created_at,null::uuid from community_reactions where mode='reactions'
   ) c join profiles a on a.id=c.author_id join community_posts p on p.id=c.post_id and p.deleted_at is null
   where (p_filter->>'author' is null or c.author_id=(p_filter->>'author')::uuid)
    and (p_filter->>'q' is null or a.full_name ilike '%'||(p_filter->>'q')||'%')
    and (p_filter->>'from' is null or c.created_at>=(p_filter->>'from')::timestamptz)
    and (p_filter->>'to' is null or c.created_at<(p_filter->>'to')::timestamptz)
    and (p_filter->>'cursor' is null or (c.created_at,c.id)<((p_filter->>'cursor')::timestamptz,(p_filter->>'cursor_id')::uuid))
   order by c.created_at desc,c.id desc limit 21
  ) rows;
 else raise exception 'Invalid feed';end if;
 return jsonb_build_object('items',result,'restriction',(select to_jsonb(r) from community_restrictions r where user_id=coalesce((p_filter->>'author')::uuid,p_actor)));
end $$;

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
 insert into community_stories(author_id,request_id,image_path,caption,theme,text_position,text_x,text_y,text_scale,music_track_id)
 values(p_actor,(p_input->>'request_id')::uuid,v_path,coalesce(p_input->>'caption',''),coalesce(p_input->>'theme','gold'),coalesce(p_input->>'text_position','center'),(p_input->>'text_x')::numeric,(p_input->>'text_y')::numeric,coalesce((p_input->>'text_scale')::numeric,1),(p_input->>'music_track_id')::bigint) returning id into result;
 return result;
end $$;

create or replace function public.community_story_read(p_actor uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 perform community_actor(p_actor);
 return (select coalesce(jsonb_agg(item order by created_at desc),'[]') from (
  select s.created_at,jsonb_build_object('id',s.id,'music_track_id',s.music_track_id,'author_id',s.author_id,'name',coalesce(nullif(p.full_name,''),'Aluno'),'avatar',p.avatar_url,'image_path',s.image_path,'caption',s.caption,'theme',s.theme,'text_position',s.text_position,'text_x',s.text_x,'text_y',s.text_y,'text_scale',s.text_scale,'created_at',s.created_at,'expires_at',s.expires_at) item
  from community_stories s join profiles p on p.id=s.author_id join auth.users u on u.id=p.id
  where s.deleted_at is null and s.expires_at>now() and not p.is_deleted and (u.banned_until is null or u.banned_until<=now())
  order by s.created_at desc limit 200
 ) active);
end $$;

revoke all on function public.community_mutate(uuid,text,jsonb),public.community_read(uuid,jsonb),public.community_story_mutate(uuid,text,jsonb),public.community_story_read(uuid) from public,anon,authenticated;
grant execute on function public.community_mutate(uuid,text,jsonb),public.community_read(uuid,jsonb),public.community_story_mutate(uuid,text,jsonb),public.community_story_read(uuid) to service_role;
commit;
