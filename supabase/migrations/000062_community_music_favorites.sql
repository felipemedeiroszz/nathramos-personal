begin;
create table public.community_music_favorites (
 user_id uuid not null references public.profiles(id) on delete cascade,
 track_id bigint not null check(track_id between 1 and 9007199254740991),
 track jsonb not null,
 created_at timestamptz not null default now(),
 primary key(user_id,track_id),
 check(jsonb_typeof(track)='object' and (track->>'id')::bigint=track_id)
);
alter table public.community_music_favorites enable row level security;
revoke all on public.community_music_favorites from public,anon,authenticated;
grant all on public.community_music_favorites to service_role;
create function public.community_music_favorite(p_actor uuid,p_action text,p_track jsonb default '{}')
returns jsonb language plpgsql security definer set search_path=public as $$
declare target bigint:=(p_track->>'id')::bigint;
begin
 perform community_actor(p_actor);
 if p_action not in ('read','save','remove') then raise exception 'Invalid favorite action';end if;
 if p_action<>'read' then
  perform pg_advisory_xact_lock(hashtextextended(p_actor::text||':music-favorites',0));
  if target is null or target<=0 then raise exception 'Invalid track';end if;
  if p_action='save' then
   if not exists(select 1 from community_music_favorites where user_id=p_actor and track_id=target)
    and (select count(*) from community_music_favorites where user_id=p_actor)>=50 then raise exception 'Favorite limit reached';end if;
   insert into community_music_favorites(user_id,track_id,track) values(p_actor,target,p_track-'preview')
   on conflict(user_id,track_id) do update set track=excluded.track;
  else delete from community_music_favorites where user_id=p_actor and track_id=target;
  end if;
 end if;
 return (select coalesce(jsonb_agg(track order by created_at desc),'[]') from community_music_favorites where user_id=p_actor);
end $$;
revoke all on function public.community_music_favorite(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.community_music_favorite(uuid,text,jsonb) to service_role;
commit;
