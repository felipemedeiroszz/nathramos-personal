begin;

create table public.community_posts (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references public.profiles(id),
 body text not null default '' check(length(body)<=5000),
 images text[] not null default '{}' check(cardinality(images)<=3),
 request_id uuid not null unique,
 version int not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 deleted_at timestamptz,
 check(length(trim(body))>0 or cardinality(images)>0)
);
create index community_feed_idx on public.community_posts(created_at desc,id desc) where deleted_at is null;
create index community_author_idx on public.community_posts(author_id,created_at desc);
create index community_images_idx on public.community_posts using gin(images);
create table public.community_comments (
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.community_posts(id),
 author_id uuid not null references public.profiles(id),
 parent_id uuid references public.community_comments(id),
 body text not null check(length(trim(body)) between 1 and 2000),
 request_id uuid not null unique,
 created_at timestamptz not null default now(),
 deleted_at timestamptz
);
create index community_comments_post_idx on public.community_comments(post_id,created_at,id);
create index community_comments_author_idx on public.community_comments(author_id,created_at desc);
create table public.community_reactions (
 id uuid not null unique default gen_random_uuid(),
 post_id uuid not null references public.community_posts(id),
 user_id uuid not null references public.profiles(id),
 kind text not null check(kind in ('like','love','strength','congrats','motivation')),
 created_at timestamptz not null default now(),
 primary key(post_id,user_id)
);
create index community_reactions_user_idx on public.community_reactions(user_id,created_at desc);
create table public.community_restrictions (
 user_id uuid primary key references public.profiles(id),
 blocked_until timestamptz not null,
 reason text not null check(length(trim(reason)) between 1 and 500),
 updated_by uuid not null references public.profiles(id),
 updated_at timestamptz not null default now()
);
create table public.community_uploads (
 path text primary key,
 owner_id uuid not null references public.profiles(id),
 deleting boolean not null default false,
 created_at timestamptz not null default now()
);
create index community_uploads_created_idx on public.community_uploads(created_at);
create index community_notifications_idx on public.notifications(user_id,(payload->>'community_post'),created_at desc)
where read_at is null and payload ? 'community_post';
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('community-images','community-images',false,5242880,array['image/webp'])
on conflict(id) do nothing;
create policy community_images_server_only on storage.objects as restrictive
for all to anon,authenticated
using(bucket_id<>'community-images') with check(bucket_id<>'community-images');

alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_reactions enable row level security;
alter table public.community_restrictions enable row level security;
alter table public.community_uploads enable row level security;
revoke all on public.community_posts,public.community_comments,public.community_reactions,public.community_restrictions,public.community_uploads from anon,authenticated;
grant all on public.community_posts,public.community_comments,public.community_reactions,public.community_restrictions,public.community_uploads to service_role;

create function public.community_actor(p_actor uuid,p_writing boolean default false)
returns boolean language plpgsql stable security definer set search_path=public as $$
declare actor_role text; allowed boolean;
begin
 select p.role::text into actor_role from profiles p join auth.users u on u.id=p.id
 where p.id=p_actor and not p.is_deleted and (u.banned_until is null or u.banned_until<=now());
 if actor_role is null or actor_role not in ('admin','student') then raise exception 'Community access denied';end if;
 if actor_role='admin' then return true;end if;
 select a.allowed into allowed from can_access_platform(p_actor) a;
 if not coalesce(allowed,false) then raise exception 'Community access denied';end if;
 if p_writing and exists(select 1 from community_restrictions where user_id=p_actor and blocked_until>now()) then raise exception 'Community participation suspended';end if;
 return false;
end $$;

create function public.community_notify(p_actor uuid,p_post uuid,p_comment uuid default null)
returns void language plpgsql security definer set search_path=public as $$
declare recipient record; actor_name text; target uuid;
begin
 select coalesce(nullif(full_name,''),'Aluno') into actor_name from profiles where id=p_actor;
 select author_id into target from community_posts where id=p_post;
 for recipient in
  select distinct p.id,p.language from profiles p where not p.is_deleted and p.id<>p_actor and p.id in (
   select target union select author_id from community_comments where post_id=p_post and deleted_at is null and p_comment is not null
  )
 loop
  -- Coalesce repeated reactions and busy conversations into one unread alert.
  if exists(select 1 from notifications where user_id=recipient.id and read_at is null
   and payload->>'community_post'=p_post::text and created_at>now()-interval '15 minutes') then continue;end if;
  insert into notifications(user_id,type,title,body,url,payload,sent_at)
  values(recipient.id,'system',
   case when recipient.language='en-US' then 'Community' else 'Comunidade' end,
   case when recipient.language='en-US' then actor_name||' interacted with a post you follow.' else actor_name||' interagiu em uma publicação que você acompanha.' end,
   '/'||recipient.language::text||'/comunidade?post='||p_post::text,
   jsonb_build_object('community_post',p_post,'comment_id',p_comment),now());
 end loop;
end $$;

create function public.community_mutate(p_actor uuid,p_action text,p_input jsonb)
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
   insert into community_posts(author_id,body,images,request_id) values(p_actor,content,paths,request) returning id into result_id;
  else
   update community_posts set body=content,images=paths,version=version+1,updated_at=now() where id=item.id;
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

create function public.community_read(p_actor uuid,p_filter jsonb default '{}')
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare admin boolean; result jsonb; mode text:=coalesce(p_filter->>'mode','posts');
begin
 admin:=community_actor(p_actor);
 if (p_filter->>'admin')::boolean is true and not admin then raise exception 'Administrator required';end if;
 if not admin and (mode<>'posts' or p_filter->>'author' is not null or p_filter->>'q' is not null) then raise exception 'Administrator required';end if;
 if mode='posts' then
  select coalesce(jsonb_agg(row_data order by created_at desc,id desc),'[]') into result from (
   select p.created_at,p.id,jsonb_build_object(
    'id',p.id,'body',p.body,'images',p.images,'author_id',p.author_id,'name',coalesce(nullif(a.full_name,''),'Aluno'),'avatar',a.avatar_url,
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

create function public.community_thread(p_actor uuid,p_post uuid,p_mode text,p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 perform community_actor(p_actor);
 if not exists(select 1 from community_posts p join profiles a on a.id=p.author_id and not a.is_deleted where p.id=p_post and p.deleted_at is null) then raise exception 'Publication unavailable';end if;
 if p_offset<0 then raise exception 'Invalid offset';end if;
 if p_mode='comments' then
  return (select coalesce(jsonb_agg(to_jsonb(rows)),'[]') from (
   select c.id,c.post_id,c.author_id,c.parent_id,case when c.deleted_at is null then c.body else '' end body,c.created_at,
    c.deleted_at is not null deleted,a.full_name name,a.avatar_url avatar,
    (select coalesce(nullif(p.body,''),'…') from community_comments p where p.id=c.parent_id and p.deleted_at is null) reply_to
   from community_comments c join profiles a on a.id=c.author_id where c.post_id=p_post
   order by c.created_at,c.id limit 51 offset p_offset
  ) rows);
 elsif p_mode='reactions' then
  return (select coalesce(jsonb_agg(to_jsonb(rows)),'[]') from (
   select r.user_id,r.kind,r.created_at,a.full_name name,a.avatar_url avatar
   from community_reactions r join profiles a on a.id=r.user_id where r.post_id=p_post
   order by r.created_at,r.user_id limit 51 offset p_offset
  ) rows);
 end if;
 raise exception 'Invalid thread';
end $$;

create function public.community_unused_uploads()
returns setof public.community_uploads language plpgsql security definer set search_path=public as $$
declare candidate record;
begin
 for candidate in select path from community_uploads
  where created_at<now()-interval '1 day' and not deleting
  and not exists(select 1 from community_posts p where p.deleted_at is null and community_uploads.path=any(p.images))
  order by path limit 100 for update skip locked
 loop
  -- Recheck after the lock, so a concurrent publication cannot lose its photos.
  update community_uploads u set deleting=true where u.path=candidate.path
   and not exists(select 1 from community_posts p where p.deleted_at is null and u.path=any(p.images));
 end loop;
 return query select * from community_uploads where deleting order by created_at limit 100;
end $$;
revoke all on function public.community_unused_uploads() from public,anon,authenticated;
grant execute on function public.community_unused_uploads() to service_role;

create function public.community_reserve_upload(p_actor uuid,p_path text)
returns void language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text||':community',0));
 perform community_actor(p_actor,true);
 if split_part(p_path,'/',1)<>p_actor::text then raise exception 'Invalid upload owner';end if;
 if (select count(*) from community_uploads where owner_id=p_actor and created_at>now()-interval '1 hour')>=30 then raise exception 'Upload rate limit reached';end if;
 insert into community_uploads(path,owner_id) values(p_path,p_actor);
end $$;
revoke all on function public.community_reserve_upload(uuid,text) from public,anon,authenticated;
grant execute on function public.community_reserve_upload(uuid,text) to service_role;

revoke all on function public.community_actor(uuid,boolean),public.community_notify(uuid,uuid,uuid),
 public.community_mutate(uuid,text,jsonb),public.community_read(uuid,jsonb),public.community_thread(uuid,uuid,text,int)
 from public,anon,authenticated;
grant execute on function public.community_actor(uuid,boolean),public.community_mutate(uuid,text,jsonb),
 public.community_read(uuid,jsonb),public.community_thread(uuid,uuid,text,int) to service_role;
commit;
