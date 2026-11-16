begin;

create table public.challenges (
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(trim(title)) between 1 and 150),
 description text not null default '' check(length(description)<=10000),
 objective text not null default '' check(length(objective)<=2000),
 category text not null default 'custom',
 cover_image text,
 rules text not null default '' check(length(rules)<=10000),
 instructions text not null default '' check(length(instructions)<=5000),
 requirements text not null default '' check(length(requirements)<=2000),
 start_date timestamptz not null,
 end_date timestamptz not null check(end_date>start_date),
 timezone text not null default 'America/Sao_Paulo',
 status text not null default 'draft' check(status in ('draft','published','paused','cancelled','review','completed')),
 max_participants int check(max_participants between 1 and 100000),
 visibility text not null default 'public' check(visibility in ('public','exclusive')),
 allow_late_entry boolean not null default false,
 allow_exit boolean not null default true,
 approval_entry boolean not null default false,
 winner_type text not null default 'single' check(winner_type in ('single','top3','custom')),
 winner_count int not null default 1 check(winner_count between 1 and 100),
 tie_breakers text[] not null default array['goals','primary','earliest']
   check(tie_breakers<@array['goals','primary','earliest']::text[] and cardinality(tie_breakers)<=3),
 tie_policy text not null default 'manual' check(tie_policy in ('manual','shared')),
 pending_policy text not null default 'review' check(pending_policy in ('review','reject')),
 max_backdate_hours int not null default 24 check(max_backdate_hours between 0 and 168),
 version int not null default 1,
 result_revision int not null default 0,
 result_dirty boolean not null default true,
 score_revision bigint not null default 0,
 created_by uuid not null references public.profiles(id),
 create_request_id uuid unique,
 cloned_from uuid references public.challenges(id),
 last_processed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index challenges_period_idx on public.challenges(status,end_date,start_date);
create table public.challenge_audience (
 challenge_id uuid not null references public.challenges(id) on delete cascade,
 user_id uuid not null references public.profiles(id),
 primary key(challenge_id,user_id)
);
create table public.challenge_goals (
 id uuid primary key default gen_random_uuid(),
 challenge_id uuid not null references public.challenges(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 150),
 description text not null default '' check(length(description)<=2000),
 goal_type text not null check(goal_type in ('workout','cardio','water','nutrition','steps','measurements','progress','custom')),
 target_value numeric not null check(target_value>0 and target_value<=100000000),
 unit text not null check(length(trim(unit)) between 1 and 40),
 frequency text not null check(frequency in ('daily','weekly','total')),
 points int not null check(points between 0 and 100000),
 max_points int not null check(max_points between 0 and 100000000),
 proof_type text not null default 'none' check(proof_type in ('none','photo','document')),
 requires_approval boolean not null default true,
 is_primary boolean not null default false
);
create index challenge_goals_challenge_idx on public.challenge_goals(challenge_id);
create table public.challenge_prizes (
 id uuid primary key default gen_random_uuid(),
 challenge_id uuid not null references public.challenges(id) on delete cascade,
 placement int not null check(placement between 1 and 100),
 name text not null check(length(trim(name)) between 1 and 150),
 description text not null default '',
 image text,
 estimated_value numeric check(estimated_value>=0),
 notes text not null default '',
 delivery_instructions text not null default '',
 unique(challenge_id,placement)
);
create table public.challenge_participants (
 id uuid primary key default gen_random_uuid(),
 challenge_id uuid not null references public.challenges(id),
 user_id uuid not null references public.profiles(id),
 joined_at timestamptz not null default now(),
 accepted_rules text not null,
 accepted_version int not null,
 status text not null check(status in ('pending','active','left','rejected')),
 total_points bigint not null default 0,
 final_position int,
 unique(challenge_id,user_id),
 unique(id,challenge_id)
);
create index challenge_participants_user_idx on public.challenge_participants(user_id,challenge_id);
create table public.challenge_uploads (
 path text primary key,
 challenge_id uuid not null references public.challenges(id),
 owner_id uuid not null references public.profiles(id),
 kind text not null check(kind in ('cover','prize','proof')),
 content_type text not null check(content_type in ('image/webp','application/pdf')),
 deleting boolean not null default false,
 created_at timestamptz not null default now()
);
create index challenge_uploads_owner_idx on public.challenge_uploads(owner_id,created_at);
create table public.challenge_activities (
 id uuid primary key default gen_random_uuid(),
 challenge_id uuid not null references public.challenges(id),
 participant_id uuid not null,
 goal_id uuid not null references public.challenge_goals(id),
 recorded_value numeric not null check(recorded_value>0 and recorded_value<=100000000),
 proof_image text references public.challenge_uploads(path),
 notes text not null default '' check(length(notes)<=2000),
 activity_date timestamptz not null,
 activity_day date not null,
 period_key date not null,
 request_id uuid not null unique,
 validation_status text not null check(validation_status in ('pending','approved','rejected')),
 validation_reason text,
 validated_by uuid references public.profiles(id),
 validated_at timestamptz,
 created_at timestamptz not null default now(),
 foreign key(participant_id,challenge_id) references public.challenge_participants(id,challenge_id)
);
create unique index challenge_activities_daily_unique on public.challenge_activities(participant_id,goal_id,activity_day)
where validation_status<>'rejected';
create index challenge_activities_pending_idx on public.challenge_activities(challenge_id,validation_status,created_at);
create index challenge_activities_goal_idx on public.challenge_activities(participant_id,goal_id,period_key,validation_status);
create table public.challenge_points (
 id uuid primary key default gen_random_uuid(),
 challenge_id uuid not null references public.challenges(id),
 participant_id uuid not null references public.challenge_participants(id),
 activity_id uuid references public.challenge_activities(id),
 goal_id uuid references public.challenge_goals(id),
 period_key date,
 points bigint not null,
 description text not null,
 created_at timestamptz not null default now(),
 unique(participant_id,goal_id,period_key)
);
create index challenge_points_participant_idx on public.challenge_points(challenge_id,participant_id);
create table public.challenge_results (
 challenge_id uuid not null references public.challenges(id),
 revision int not null,
 snapshot jsonb not null,
 reason text not null,
 created_by uuid references public.profiles(id),
 created_at timestamptz not null default now(),
 published_at timestamptz,
 primary key(challenge_id,revision)
);
create table public.challenge_winners (
 id uuid primary key default gen_random_uuid(),
 challenge_id uuid not null references public.challenges(id),
 revision int not null,
 user_id uuid not null references public.profiles(id),
 placement int not null,
 prize_id uuid references public.challenge_prizes(id),
 final_points bigint not null,
 confirmed_at timestamptz not null default now(),
 delivery_status text not null default 'pending' check(delivery_status in ('pending','contacted','delivered')),
 delivery_notes text not null default '',
 unique(challenge_id,revision,user_id),
 foreign key(challenge_id,revision) references public.challenge_results(challenge_id,revision)
);
create table public.challenge_audit_logs (
 id bigint generated always as identity primary key,
 challenge_id uuid not null references public.challenges(id),
 admin_id uuid references public.profiles(id),
 action text not null,
 description text not null,
 previous_value jsonb,
 new_value jsonb,
 created_at timestamptz not null default now()
);
create index challenge_audit_idx on public.challenge_audit_logs(challenge_id,created_at desc);
create table public.challenge_notification_events (
 challenge_id uuid not null references public.challenges(id),
 user_id uuid not null references public.profiles(id),
 event_key text not null,
 created_at timestamptz not null default now(),
 primary key(challenge_id,user_id,event_key)
);

do $$
declare name text;
begin
 foreach name in array array['challenges','challenge_audience','challenge_goals','challenge_prizes','challenge_participants',
 'challenge_uploads','challenge_activities','challenge_points','challenge_results','challenge_winners','challenge_audit_logs','challenge_notification_events']
 loop
  execute format('alter table public.%I enable row level security',name);
  execute format('revoke all on public.%I from anon,authenticated',name);
  execute format('grant all on public.%I to service_role',name);
 end loop;
end $$;
grant usage,select on sequence public.challenge_audit_logs_id_seq to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('challenge-assets','challenge-assets',false,5242880,array['image/webp','application/pdf']) on conflict(id) do nothing;
create policy challenge_assets_server_only on storage.objects as restrictive for all to anon,authenticated
using(bucket_id<>'challenge-assets') with check(bucket_id<>'challenge-assets');

create function public.challenge_actor(p_actor uuid,p_challenge uuid default null)
returns boolean language plpgsql stable security definer set search_path=public as $$
declare admin boolean; c challenges;
begin
 admin:=community_actor(p_actor);
 if p_challenge is null then return admin;end if;
 select * into c from challenges where id=p_challenge;
 if not found then raise exception 'Challenge unavailable';end if;
 if admin then return true;end if;
 if c.status='draft' or (c.visibility='exclusive' and not exists(select 1 from challenge_audience where challenge_id=c.id and user_id=p_actor)
  and not exists(select 1 from challenge_participants where challenge_id=c.id and user_id=p_actor)) then raise exception 'Challenge access denied';end if;
 return false;
end $$;

create function public.challenge_notify(p_challenge uuid,p_user uuid,p_key text,p_pt text,p_en text)
returns void language plpgsql security definer set search_path=public as $$
declare lang text;
begin
 insert into challenge_notification_events(challenge_id,user_id,event_key) values(p_challenge,p_user,p_key) on conflict do nothing;
 if not found then return;end if;
 select language::text into lang from profiles where id=p_user and not is_deleted;
 if not found then return;end if;
 insert into notifications(user_id,type,title,body,url,payload,sent_at)
 select p_user,'system',case when lang='en-US' then 'Challenges' else 'Desafios' end,
 case when lang='en-US' then p_en else p_pt end,'/'||lang||'/desafios/'||p_challenge,
 jsonb_build_object('challenge_id',p_challenge),now();
end $$;

create function public.challenge_goal_progress(p_challenge uuid,p_user uuid)
returns table(goal_id uuid,goal jsonb,current_value numeric,completed_periods bigint,required_periods bigint,earned_points bigint,progress numeric)
language sql stable security definer set search_path=public as $$
 with totals as (
  select a.goal_id,a.period_key,sum(a.recorded_value) amount from challenge_activities a
  join challenge_participants p on p.id=a.participant_id
  where a.challenge_id=p_challenge and p.user_id=p_user and a.validation_status='approved'
  group by a.goal_id,a.period_key
 )
 select g.id,to_jsonb(g),
 coalesce(sum(t.amount),0),
 count(*) filter(where coalesce(t.amount,0)>=g.target_value),
 case g.frequency when 'daily' then
  (c.end_date at time zone c.timezone - interval '1 microsecond')::date-(c.start_date at time zone c.timezone)::date+1
 when 'weekly' then
  (date_trunc('week',c.end_date at time zone c.timezone - interval '1 microsecond')::date-date_trunc('week',c.start_date at time zone c.timezone)::date)/7+1
 else 1 end::bigint,
 coalesce((select sum(points) from challenge_points cp join challenge_participants p on p.id=cp.participant_id
  where cp.goal_id=g.id and p.user_id=p_user),0)::bigint,
 round(100*coalesce(sum(least(1,coalesce(t.amount,0)/g.target_value)),0)/greatest(
 case g.frequency when 'daily' then (c.end_date at time zone c.timezone - interval '1 microsecond')::date-(c.start_date at time zone c.timezone)::date+1
 when 'weekly' then (date_trunc('week',c.end_date at time zone c.timezone - interval '1 microsecond')::date-date_trunc('week',c.start_date at time zone c.timezone)::date)/7+1
 else 1 end,1),1)
 from challenge_goals g join challenges c on c.id=g.challenge_id left join totals t on t.goal_id=g.id
 where g.challenge_id=p_challenge group by g.id,c.id;
$$;

create function public.challenge_ranking(p_challenge uuid)
returns table(user_id uuid,name text,avatar text,total_points bigint,completed_goals bigint,primary_goals bigint,
 reached_at timestamptz,progress numeric,rank_position bigint)
language plpgsql stable security definer set search_path=public as $$
declare ordering text:='s.total_points desc'; criterion text;
begin
 foreach criterion in array (select tie_breakers from challenges where id=p_challenge) loop
  ordering:=ordering||case criterion when 'goals' then ',s.completed_goals desc' when 'primary' then ',s.primary_goals desc' when 'earliest' then ',s.reached_at asc nulls last' else '' end;
 end loop;
 return query execute '
 with scores as (
  select p.user_id,a.full_name::text name,a.avatar_url::text avatar,p.total_points,
   gp.completed_goals,gp.primary_goals,
   (select max(cp.created_at) from challenge_points cp where cp.participant_id=p.id and cp.points>0) reached_at,
   coalesce(gp.progress,0) progress
  from challenge_participants p join profiles a on a.id=p.user_id
  cross join lateral (
    select count(*) filter(where v.completed_periods>=v.required_periods) completed_goals,
    count(*) filter(where v.completed_periods>=v.required_periods and (v.goal->>''is_primary'')::boolean) primary_goals,
    round(avg(v.progress),1) progress from challenge_goal_progress(p.challenge_id,p.user_id) v
  ) gp where p.challenge_id=$1 and p.status=''active'' and not a.is_deleted
 )
 select s.*,rank() over(order by '||ordering||') from scores s order by '||ordering||',s.user_id'
 using p_challenge;
end $$;

create function public.challenge_recalculate(p_participant uuid,p_previous jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare p challenge_participants; old_score bigint; new_score bigint; completed_count bigint; previous_ranks jsonb; r record; previous_position bigint; event_revision bigint;
begin
 select * into p from challenge_participants where id=p_participant for update;
 old_score:=p.total_points;
 previous_ranks:=p_previous;
 delete from challenge_points where participant_id=p.id and goal_id is not null;
 insert into challenge_points(challenge_id,participant_id,goal_id,period_key,activity_id,points,description,created_at)
 with cumulative as (
  select a.*,g.target_value,g.points,g.max_points,g.title,
   sum(a.recorded_value) over(partition by a.goal_id,a.period_key order by coalesce(a.validated_at,a.created_at),a.id) running_value
  from challenge_activities a join challenge_goals g on g.id=a.goal_id
  where a.participant_id=p.id and a.validation_status='approved'
 ), completed as (
  select distinct on(goal_id,period_key) * from cumulative where running_value>=target_value
  order by goal_id,period_key,coalesce(validated_at,created_at),id
 ), awards as (
  select *,row_number() over(partition by goal_id order by coalesce(validated_at,created_at),id)-1 previous_count from completed
 )
 select p.challenge_id,p.id,goal_id,period_key,id,least(points,greatest(0,max_points-points*previous_count)),
 title,coalesce(validated_at,created_at) from awards;
 select coalesce(sum(points),0) into new_score from challenge_points where participant_id=p.id;
 if new_score<0 then raise exception 'Score cannot be negative';end if;
 update challenge_participants set total_points=new_score where id=p.id;
 update challenges set score_revision=score_revision+1 where id=p.challenge_id returning score_revision into event_revision;
 select count(*) into completed_count from challenge_goal_progress(p.challenge_id,p.user_id) where completed_periods>=required_periods;
 if new_score>old_score then
  perform challenge_notify(p.challenge_id,p.user_id,'score:v'||event_revision,'Sua pontuação no desafio foi atualizada para '||new_score||'.','Your challenge score is now '||new_score||'.');
 end if;
 for r in select * from challenge_ranking(p.challenge_id) loop
  previous_position:=(previous_ranks->>r.user_id::text)::bigint;
  if previous_position is distinct from r.rank_position then
   perform challenge_notify(p.challenge_id,r.user_id,'rank:v'||event_revision,'Sua posição no desafio mudou para '||r.rank_position||'.','Your challenge position is now '||r.rank_position||'.');
  end if;
  if r.rank_position<=3 and r.total_points>0 and (previous_position is null or previous_position>3 or r.user_id=p.user_id and old_score=0) then
   perform challenge_notify(p.challenge_id,r.user_id,'top3:v'||event_revision,'Você entrou no Top 3 do desafio!','You reached the challenge Top 3!');
  end if;
 end loop;
 for r in select goal_id,period_key from challenge_points where participant_id=p.id and goal_id is not null loop
  perform challenge_notify(p.challenge_id,p.user_id,'goal-period:'||r.goal_id||':'||r.period_key,'Você cumpriu uma meta do desafio!','You completed a challenge goal!');
 end loop;
 if completed_count>0 then perform challenge_notify(p.challenge_id,p.user_id,'goals:'||completed_count,'Você concluiu uma meta do desafio!','You completed a challenge goal!');end if;
end $$;

create function public.challenge_freeze(p_challenge uuid,p_actor uuid,p_reason text)
returns void language plpgsql security definer set search_path=public as $$
declare c challenges; snapshot jsonb; next_revision int;
begin
 select * into c from challenges where id=p_challenge for update;
 if c.status not in ('published','paused','review','completed') then raise exception 'Challenge cannot be settled';end if;
 if c.status='review' and not c.result_dirty then return;end if;
 if c.pending_policy='reject' then
  update challenge_activities set validation_status='rejected',validation_reason='Encerramento conforme regra publicada',validated_at=now(),validated_by=p_actor
   where challenge_id=c.id and validation_status='pending';
 end if;
 if exists(select 1 from challenge_activities where challenge_id=c.id and validation_status='pending') then
  update challenges set status='review' where id=c.id;
  if c.status<>'review' then
   insert into challenge_audit_logs(challenge_id,admin_id,action,description,new_value)
   values(c.id,p_actor,'settlement_pending',p_reason,jsonb_build_object('status','review'));
  end if;
  return;
 end if;
 select jsonb_build_object('challenge',to_jsonb(c),'goals',(select coalesce(jsonb_agg(to_jsonb(g)),'[]') from challenge_goals g where challenge_id=c.id),
  'prizes',(select coalesce(jsonb_agg(to_jsonb(p)),'[]') from challenge_prizes p where challenge_id=c.id),
  'ranking',(select coalesce(jsonb_agg(to_jsonb(r) order by rank_position,user_id),'[]') from challenge_ranking(c.id) r)) into snapshot;
 select coalesce(max(revision),0)+1 into next_revision from challenge_results where challenge_id=c.id;
 insert into challenge_results(challenge_id,revision,snapshot,reason,created_by) values(c.id,next_revision,snapshot,p_reason,p_actor);
 update challenges set status='review',result_revision=next_revision,result_dirty=false,updated_at=now() where id=c.id;
 insert into challenge_audit_logs(challenge_id,admin_id,action,description,new_value)
 values(c.id,p_actor,'settled',p_reason,jsonb_build_object('revision',next_revision));
end $$;

create function public.challenge_mutate(p_actor uuid,p_action text,p_input jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare admin boolean; c challenges; old challenges; g challenge_goals; part challenge_participants; activity challenge_activities; audit_previous jsonb; rank_before jsonb; rank_row record; event_revision bigint;
 result_id uuid; item jsonb; target uuid; asset_path text; until_time timestamptz; request uuid; period date; snapshot jsonb; revisions int; selected_count int; winner record;
begin
 admin:=challenge_actor(p_actor);
 if p_action='create' then
  if not admin then raise exception 'Administrator required';end if;
  perform pg_advisory_xact_lock(hashtextextended(p_actor::text||':challenge-create',0));
  select id into result_id from challenges where create_request_id=(p_input->>'request_id')::uuid and created_by=p_actor;
  if found then return result_id;end if;
  insert into challenges(title,start_date,end_date,created_by,create_request_id)
  values(trim(p_input->>'title'),(p_input->>'start_date')::timestamptz,(p_input->>'end_date')::timestamptz,p_actor,(p_input->>'request_id')::uuid) returning id into result_id;
  insert into challenge_audit_logs(challenge_id,admin_id,action,description,new_value) values(result_id,p_actor,'create','Desafio criado',p_input);
  return result_id;
 end if;
 target:=(p_input->>'challenge_id')::uuid;
 perform challenge_actor(p_actor,target);
 select * into c from challenges where id=target for update;
 old:=c; result_id:=c.id;
 if p_action in ('save','publish','duplicate','pause','resume','cancel','close','review','approve_entry','adjust','confirm','correct','delivery') and not admin then raise exception 'Administrator required';end if;

 if p_action='save' then
  if c.status not in ('draft','published','paused') then raise exception 'Challenge configuration is closed';end if;
  if c.version is distinct from (p_input->>'version')::int then raise exception 'Challenge changed. Reload';end if;
  if c.status<>'draft' and now()>=c.start_date then
   if length(trim(coalesce(p_input->>'reason','')))=0 then raise exception 'Rule change reason required';end if;
   update challenges set title=p_input->>'title',description=p_input->>'description',objective=p_input->>'objective',
    rules=p_input->>'rules',instructions=p_input->>'instructions',version=version+1,updated_at=now() where id=c.id;
  else
   if not exists(select 1 from pg_timezone_names where name=p_input->>'timezone') then raise exception 'Invalid timezone';end if;
   update challenges set title=p_input->>'title',description=p_input->>'description',objective=p_input->>'objective',category=p_input->>'category',
    rules=p_input->>'rules',instructions=p_input->>'instructions',requirements=p_input->>'requirements',
    start_date=(p_input->>'start_date')::timestamptz,end_date=(p_input->>'end_date')::timestamptz,timezone=p_input->>'timezone',
    max_participants=(p_input->>'max_participants')::int,visibility=p_input->>'visibility',allow_late_entry=(p_input->>'allow_late_entry')::boolean,
    allow_exit=(p_input->>'allow_exit')::boolean,approval_entry=(p_input->>'approval_entry')::boolean,
    winner_type=p_input->>'winner_type',winner_count=(p_input->>'winner_count')::int,tie_policy=p_input->>'tie_policy',
    tie_breakers=array(select jsonb_array_elements_text(p_input->'tie_breakers')),
    pending_policy=p_input->>'pending_policy',max_backdate_hours=(p_input->>'max_backdate_hours')::int,
    version=version+1,updated_at=now() where id=c.id returning * into c;
   if c.end_date>c.start_date+interval '366 days' then raise exception 'Challenge duration must be at most one year';end if;
   if c.winner_type='single' and c.winner_count<>1 or c.winner_type='top3' and c.winner_count<>3 then raise exception 'Invalid winner count';end if;
   if c.max_participants is not null and c.max_participants<(select count(*) from challenge_participants where challenge_id=c.id and status in ('active','pending')) then raise exception 'Participant limit below current enrollment';end if;
   if exists(select 1 from challenge_activities where challenge_id=c.id) then raise exception 'Goals already have activities';end if;
   delete from challenge_goals where challenge_id=c.id;
   for item in select * from jsonb_array_elements(p_input->'goals') loop
    insert into challenge_goals(challenge_id,title,description,goal_type,target_value,unit,frequency,points,max_points,proof_type,requires_approval,is_primary)
    values(c.id,item->>'title',item->>'description',item->>'goal_type',(item->>'target_value')::numeric,item->>'unit',item->>'frequency',
     (item->>'points')::int,(item->>'max_points')::int,item->>'proof_type',(item->>'requires_approval')::boolean,(item->>'is_primary')::boolean);
   end loop;
   delete from challenge_prizes where challenge_id=c.id;
   for item in select * from jsonb_array_elements(p_input->'prizes') loop
    asset_path:=nullif(item->>'image','');
    if asset_path is not null then
     perform 1 from challenge_uploads where challenge_id=c.id and kind='prize' and not deleting and challenge_uploads.path=asset_path for update;
     if not found then raise exception 'Invalid prize image';end if;
    end if;
    insert into challenge_prizes(challenge_id,placement,name,description,image,estimated_value,notes,delivery_instructions)
    values(c.id,(item->>'placement')::int,item->>'name',item->>'description',asset_path,(item->>'estimated_value')::numeric,item->>'notes',item->>'delivery_instructions');
   end loop;
   delete from challenge_audience where challenge_id=c.id;
   insert into challenge_audience(challenge_id,user_id) select c.id,value::uuid from jsonb_array_elements_text(p_input->'audience');
  end if;
  asset_path:=nullif(p_input->>'cover_image','');
  if asset_path is not null then
   perform 1 from challenge_uploads where challenge_id=c.id and kind='cover' and not deleting and challenge_uploads.path=asset_path for update;
   if not found then raise exception 'Invalid cover image';end if;
  end if;
  update challenges set cover_image=asset_path where id=c.id;
  for part in select * from challenge_participants where challenge_id=c.id and status in ('active','pending') loop
   perform challenge_notify(c.id,part.user_id,'rules:'||(old.version+1),'As informações do desafio foram atualizadas. Confira as regras.','Challenge information has changed. Review the rules.');
  end loop;
 elsif p_action='publish' then
  if c.status<>'draft' or now()>=c.end_date then raise exception 'Invalid publication';end if;
  if trim(c.rules)='' or trim(c.description)='' or not exists(select 1 from challenge_goals where challenge_id=c.id)
   or (select count(*) from challenge_prizes where challenge_id=c.id)<>c.winner_count
   or exists(select 1 from generate_series(1,c.winner_count) n where not exists(select 1 from challenge_prizes where challenge_id=c.id and placement=n))
   or c.visibility='exclusive' and not exists(select 1 from challenge_audience where challenge_id=c.id)
  then raise exception 'Configure rules, goals, audience and all prizes before publishing';end if;
  update challenges set status='published',version=version+1 where id=c.id;
  for target in select p.id from profiles p where p.role='student' and not p.is_deleted and
   (c.visibility='public' or exists(select 1 from challenge_audience where challenge_id=c.id and user_id=p.id))
  loop perform challenge_notify(c.id,target,'published','Novo desafio disponível: '||c.title,'New challenge: '||c.title);end loop;
 elsif p_action='duplicate' then
  select id into result_id from challenges where create_request_id=(p_input->>'request_id')::uuid and created_by=p_actor;
  if found then return result_id;end if;
  c.id:=gen_random_uuid(); c.title:=left(c.title||' · cópia',150);c.status:='draft';c.start_date:=now()+interval '1 day';c.end_date:=c.start_date+(old.end_date-old.start_date);
  c.created_by:=p_actor;c.created_at:=now();c.updated_at:=now();c.version:=1;c.result_revision:=0;c.result_dirty:=true;c.score_revision:=0;
  c.create_request_id:=(p_input->>'request_id')::uuid;c.cloned_from:=old.id;c.last_processed_at:=null;
  -- Upload rows are challenge-scoped. Copying references requires a separate upload.
  c.cover_image:=null;
  insert into challenges select c.*;
  insert into challenge_goals(challenge_id,title,description,goal_type,target_value,unit,frequency,points,max_points,proof_type,requires_approval,is_primary)
  select c.id,title,description,goal_type,target_value,unit,frequency,points,max_points,proof_type,requires_approval,is_primary from challenge_goals where challenge_id=old.id;
  insert into challenge_prizes(challenge_id,placement,name,description,estimated_value,notes,delivery_instructions)
  select c.id,placement,name,description,estimated_value,notes,delivery_instructions from challenge_prizes where challenge_id=old.id;
  insert into challenge_audience select c.id,user_id from challenge_audience where challenge_id=old.id;
  result_id:=c.id;
 elsif p_action in ('pause','resume','cancel') then
  if c.status not in ('published','paused') or now()>=c.end_date then raise exception 'Challenge cannot change status';end if;
  if trim(coalesce(p_input->>'reason',''))='' then raise exception 'Reason required';end if;
  update challenges set status=case p_action when 'pause' then 'paused' when 'resume' then 'published' else 'cancelled' end,version=version+1 where id=c.id;
  for part in select * from challenge_participants where challenge_id=c.id and status in ('active','pending') loop
   perform challenge_notify(c.id,part.user_id,p_action||':'||(c.version+1),'O status do desafio foi atualizado.','The challenge status has changed.');
  end loop;
 elsif p_action='join' then
  select * into part from challenge_participants where challenge_id=c.id and user_id=p_actor;
  if found then
   if part.status in ('active','pending') then return part.id;end if;
   raise exception 'Enrollment already ended';
  end if;
  if admin or c.status<>'published' or now()>=c.end_date or (now()>=c.start_date and not c.allow_late_entry) then raise exception 'Enrollment unavailable';end if;
  if (p_input->>'accept_rules')::boolean is distinct from true or (p_input->>'version')::int is distinct from c.version then raise exception 'Accept current rules';end if;
  if c.max_participants is not null and (select count(*) from challenge_participants where challenge_id=c.id and status in ('active','pending'))>=c.max_participants then raise exception 'Challenge is full';end if;
  insert into challenge_participants(challenge_id,user_id,accepted_rules,accepted_version,status)
  values(c.id,p_actor,c.rules,c.version,case when c.approval_entry then 'pending' else 'active' end) returning id into result_id;
  perform challenge_notify(c.id,p_actor,'joined','Inscrição recebida para '||c.title||'.','Enrollment received for '||c.title||'.');
 elsif p_action='leave' then
  if not c.allow_exit or c.status not in ('published','paused') or now()>=c.end_date then raise exception 'Leaving is not allowed';end if;
  select coalesce(jsonb_object_agg(user_id,rank_position),'{}') into rank_before from challenge_ranking(c.id);
  update challenge_participants set status='left' where challenge_id=c.id and user_id=p_actor and status in ('active','pending') returning * into part;
  if found then
   update challenges set score_revision=score_revision+1 where id=c.id returning score_revision into event_revision;
   for rank_row in select * from challenge_ranking(c.id) loop
    if (rank_before->>rank_row.user_id::text)::bigint is distinct from rank_row.rank_position then
     perform challenge_notify(c.id,rank_row.user_id,'rank:v'||event_revision,'Sua posição no desafio mudou para '||rank_row.rank_position||'.','Your challenge position is now '||rank_row.rank_position||'.');
     if rank_row.rank_position<=3 and (rank_before->>rank_row.user_id::text)::bigint>3 then
      perform challenge_notify(c.id,rank_row.user_id,'top3:v'||event_revision,'Você entrou no Top 3 do desafio!','You reached the challenge Top 3!');
     end if;
    end if;
   end loop;
  end if;
 elsif p_action='approve_entry' then
  if c.status not in ('published','paused') or now()>=c.end_date then raise exception 'Enrollment closed';end if;
  update challenge_participants set status=case when (p_input->>'approved')::boolean then 'active' else 'rejected' end
  where id=(p_input->>'participant_id')::uuid and challenge_id=c.id and status='pending' returning * into part;
  if not found then raise exception 'Pending enrollment unavailable';end if;
  perform challenge_notify(c.id,part.user_id,'entry-reviewed','Sua inscrição no desafio foi analisada.','Your challenge enrollment was reviewed.');
 elsif p_action='activity' then
  select * into part from challenge_participants where challenge_id=c.id and user_id=p_actor for update;
  if not found then raise exception 'Active participant required';end if;
  request:=(p_input->>'request_id')::uuid;
  select id into result_id from challenge_activities where request_id=request and participant_id=part.id;
  if found then return result_id;end if;
  if part.status<>'active' then raise exception 'Active participant required';end if;
  if c.status<>'published' or now()<c.start_date or now()>=c.end_date then raise exception 'Activity window closed';end if;
  select * into g from challenge_goals where id=(p_input->>'goal_id')::uuid and challenge_id=c.id;
  if not found then raise exception 'Goal unavailable';end if;
  until_time:=case when c.max_backdate_hours=0 then now() else coalesce((p_input->>'activity_date')::timestamptz,now()) end;
  if until_time<c.start_date or until_time<part.joined_at or until_time>=c.end_date or until_time>now()
   or c.max_backdate_hours>0 and until_time<now()-make_interval(hours=>c.max_backdate_hours) then raise exception 'Activity date outside allowed window';end if;
  asset_path:=nullif(p_input->>'proof_image','');
  if g.proof_type<>'none' and asset_path is null then raise exception 'Proof required';end if;
  if asset_path is not null then
   perform 1 from challenge_uploads u where u.path=asset_path and u.challenge_id=c.id and u.owner_id=p_actor and u.kind='proof' and not u.deleting
    and (g.proof_type<>'photo' or u.content_type='image/webp') for update;
   if not found or exists(select 1 from challenge_activities where proof_image=asset_path) then raise exception 'Invalid or reused proof';end if;
  end if;
  period:=case g.frequency when 'daily' then (until_time at time zone c.timezone)::date
   when 'weekly' then date_trunc('week',until_time at time zone c.timezone)::date else (c.start_date at time zone c.timezone)::date end;
  -- One consolidated entry per goal, participant and local date prevents repeated submissions.
  if exists(select 1 from challenge_activities where participant_id=part.id and goal_id=g.id and (activity_date at time zone c.timezone)::date=(until_time at time zone c.timezone)::date and validation_status<>'rejected')
   then raise exception 'This goal already has a record for this date';end if;
  if not g.requires_approval then select coalesce(jsonb_object_agg(user_id,rank_position),'{}') into rank_before from challenge_ranking(c.id);end if;
  insert into challenge_activities(challenge_id,participant_id,goal_id,recorded_value,proof_image,notes,activity_date,activity_day,period_key,request_id,validation_status,validated_at)
  values(c.id,part.id,g.id,(p_input->>'recorded_value')::numeric,asset_path,coalesce(p_input->>'notes',''),until_time,(until_time at time zone c.timezone)::date,period,request,
   case when g.requires_approval then 'pending' else 'approved' end,case when g.requires_approval then null else now() end) returning id into result_id;
  if not g.requires_approval then perform challenge_recalculate(part.id,rank_before);end if;
 elsif p_action='review' then
  if c.status not in ('published','paused','review') then raise exception 'Validation is closed';end if;
  select * into activity from challenge_activities where id=(p_input->>'activity_id')::uuid and challenge_id=c.id for update;
  if not found then raise exception 'Activity unavailable';end if;
  if trim(coalesce(p_input->>'reason',''))='' then raise exception 'Validation reason required';end if;
  audit_previous:=to_jsonb(activity);
  if activity.validation_status=(case when (p_input->>'approved')::boolean then 'approved' else 'rejected' end) then return activity.id;end if;
  select coalesce(jsonb_object_agg(user_id,rank_position),'{}') into rank_before from challenge_ranking(c.id);
  update challenge_activities set validation_status=case when (p_input->>'approved')::boolean then 'approved' else 'rejected' end,
   validation_reason=p_input->>'reason',validated_by=p_actor,validated_at=now() where id=activity.id;
  perform challenge_recalculate(activity.participant_id,rank_before);
  update challenges set result_dirty=true where id=c.id;
  if c.status='review' and not exists(select 1 from challenge_activities where challenge_id=c.id and validation_status='pending') then perform challenge_freeze(c.id,p_actor,'Apuração após validação');end if;
 elsif p_action='adjust' then
  if c.status not in ('published','paused','review') then raise exception 'Score adjustment is closed';end if;
  if trim(coalesce(p_input->>'reason',''))='' or (p_input->>'points')::int=0 then raise exception 'Adjustment reason required';end if;
  select * into part from challenge_participants where id=(p_input->>'participant_id')::uuid and challenge_id=c.id and status='active' for update;
  if not found then raise exception 'Participant unavailable';end if;
  audit_previous:=to_jsonb(part);
  if exists(select 1 from challenge_audit_logs where challenge_id=c.id and action='adjust' and new_value->>'request_id'=p_input->>'request_id') then return part.id;end if;
  select coalesce(jsonb_object_agg(user_id,rank_position),'{}') into rank_before from challenge_ranking(c.id);
  insert into challenge_points(challenge_id,participant_id,points,description) values(c.id,part.id,(p_input->>'points')::int,p_input->>'reason');
  perform challenge_recalculate(part.id,rank_before);
  update challenges set result_dirty=true where id=c.id;
  if c.status='review' and not exists(select 1 from challenge_activities where challenge_id=c.id and validation_status='pending') then perform challenge_freeze(c.id,p_actor,'Apuração após ajuste');end if;
 elsif p_action='close' then
  if c.status not in ('published','paused') then raise exception 'Challenge already closed';end if;
  if now()<c.start_date then raise exception 'Challenge has not started';end if;
  if trim(coalesce(p_input->>'reason',''))='' then raise exception 'Closing reason required';end if;
  if now()<c.end_date then update challenges set end_date=now() where id=c.id;end if;
  perform challenge_freeze(c.id,p_actor,p_input->>'reason');
  for part in select * from challenge_participants where challenge_id=c.id and status='active' loop
   perform challenge_notify(c.id,part.user_id,'ended','O desafio foi encerrado. A classificação aguarda revisão.','The challenge ended. Results are awaiting review.');
  end loop;
 elsif p_action='correct' then
  if c.status<>'completed' or trim(coalesce(p_input->>'reason',''))='' then raise exception 'Correction requires a published result and justification';end if;
  update challenges set status='review',result_dirty=true where id=c.id;
 elsif p_action='confirm' then
  if c.status<>'review' then raise exception 'Result not ready for review';end if;
  if exists(select 1 from challenge_activities where challenge_id=c.id and validation_status='pending') then raise exception 'Resolve pending validations';end if;
  if c.result_revision=0 or c.result_dirty then
   perform challenge_freeze(c.id,p_actor,coalesce(nullif(p_input->>'reason',''),'Apuração final'));
   select * into c from challenges where id=c.id;
  end if;
  select r.snapshot into snapshot from challenge_results r where r.challenge_id=c.id and revision=c.result_revision;
  if jsonb_array_length(coalesce(p_input->'winners','[]'))>0 then
   if trim(coalesce(p_input->>'reason',''))='' then raise exception 'Winner override requires justification';end if;
   -- Keep the algorithmic draft immutable and publish a new version containing
   -- the justified administrative tie-break and resulting final positions.
    with original as (
     select value, value->>'user_id' uid,(value->>'rank_position')::int old_position
     from jsonb_array_elements(snapshot->'ranking')
    ), chosen as (
     select value->>'user_id' uid,(value->>'placement')::int placement from jsonb_array_elements(p_input->'winners')
    ), remaining as (
     select o.uid,row_number() over(order by o.old_position,o.uid)+(select count(*) from chosen) placement
     from original o where not exists(select 1 from chosen w where w.uid=o.uid)
    ), ordered as (
     select o.value,coalesce(w.placement,r.placement) placement from original o left join chosen w on w.uid=o.uid left join remaining r on r.uid=o.uid
    )
    select snapshot||jsonb_build_object('algorithm_ranking',snapshot->'ranking',
     'ranking',(select jsonb_agg(jsonb_set(value,'{rank_position}',to_jsonb(placement)) order by placement,value->>'user_id') from ordered),
     'administrative_decision',p_input->'winners','decision_reason',p_input->>'reason') into snapshot;
   select coalesce(max(revision),0)+1 into revisions from challenge_results where challenge_id=c.id;
   insert into challenge_results(challenge_id,revision,snapshot,reason,created_by) values(c.id,revisions,snapshot,p_input->>'reason',p_actor);
   c.result_revision:=revisions;
   update challenges set result_revision=revisions where id=c.id;
   for item in select * from jsonb_array_elements(p_input->'winners') loop
    if not exists(select 1 from challenge_participants where challenge_id=c.id and user_id=(item->>'user_id')::uuid and status='active') then raise exception 'Winner must be an active participant';end if;
    if (item->>'placement')::int not between 1 and c.winner_count then raise exception 'Invalid placement';end if;
    insert into challenge_winners(challenge_id,revision,user_id,placement,prize_id,final_points)
    select c.id,c.result_revision,r.user_id,(item->>'placement')::int,p.id,r.total_points from challenge_ranking(c.id) r
    join challenge_prizes p on p.challenge_id=c.id and p.placement=(item->>'placement')::int where r.user_id=(item->>'user_id')::uuid;
   end loop;
   select count(*) into selected_count from challenge_winners where challenge_id=c.id and revision=c.result_revision;
   if selected_count<least(c.winner_count,(select count(*) from challenge_participants where challenge_id=c.id and status='active')) then raise exception 'Select all winning placements';end if;
   if exists(select 1 from generate_series(1,least(c.winner_count,(select count(*)::int from challenge_participants where challenge_id=c.id and status='active'))) n
    where not exists(select 1 from challenge_winners where challenge_id=c.id and revision=c.result_revision and placement=n))
    then raise exception 'Select all winning placements';end if;
  else
   if c.tie_policy='manual' and exists(select 1 from challenge_ranking(c.id) where rank_position<=c.winner_count group by rank_position having count(*)>1) then raise exception 'Resolve tied placements manually before publication';end if;
   insert into challenge_winners(challenge_id,revision,user_id,placement,prize_id,final_points)
   select c.id,c.result_revision,r.user_id,r.rank_position,p.id,r.total_points from challenge_ranking(c.id) r
   join challenge_prizes p on p.challenge_id=c.id and p.placement=r.rank_position where r.rank_position<=c.winner_count;
  end if;
  if exists(select 1 from challenge_winners where challenge_id=c.id and revision=c.result_revision group by placement having count(*)>1) and c.tie_policy<>'shared' then raise exception 'Shared prizes are disabled';end if;
  update challenge_results set published_at=now() where challenge_id=c.id and revision=c.result_revision and published_at is null;
  update challenges set status='completed',updated_at=now() where id=c.id;
  update challenge_participants p set final_position=(r.value->>'rank_position')::int
  from jsonb_array_elements(snapshot->'ranking') r(value) where p.challenge_id=c.id and p.user_id=(r.value->>'user_id')::uuid;
  for part in select * from challenge_participants where challenge_id=c.id and status='active' loop
   perform challenge_notify(c.id,part.user_id,'result:'||c.result_revision,'Resultado oficial publicado: '||c.title,'Official results: '||c.title);
  end loop;
  for winner in select * from challenge_winners where challenge_id=c.id and revision=c.result_revision loop
   perform challenge_notify(c.id,winner.user_id,'winner:'||c.result_revision,'Parabéns! Você está entre os ganhadores de '||c.title||'.','Congratulations! You won a prize in '||c.title||'.');
  end loop;
 elsif p_action='delivery' then
  update challenge_winners set delivery_status=p_input->>'status',delivery_notes=coalesce(p_input->>'notes','')
  where id=(p_input->>'winner_id')::uuid and challenge_id=c.id;
 else raise exception 'Unknown challenge action';end if;

 if admin then
  insert into challenge_audit_logs(challenge_id,admin_id,action,description,previous_value,new_value)
  values(result_id,p_actor,p_action,coalesce(nullif(p_input->>'reason',''),'Ação administrativa: '||p_action),coalesce(audit_previous,to_jsonb(old)),p_input);
 end if;
 return result_id;
end $$;

create function public.challenge_result_immutable()
returns trigger language plpgsql set search_path=public as $$
begin
 if tg_op='DELETE' then raise exception 'Final result history is immutable';end if;
 if new.snapshot is distinct from old.snapshot or new.reason is distinct from old.reason or new.revision<>old.revision
  or new.challenge_id<>old.challenge_id or new.created_by is distinct from old.created_by or new.created_at<>old.created_at
  or old.published_at is not null and new.published_at is distinct from old.published_at then raise exception 'Final result history is immutable';end if;
 return new;
end $$;
create trigger challenge_result_immutable before update or delete on public.challenge_results
for each row execute function public.challenge_result_immutable();
revoke all on function public.challenge_result_immutable() from public,anon,authenticated;
create function public.challenge_winner_immutable()
returns trigger language plpgsql set search_path=public as $$
begin
 if tg_op='DELETE' then raise exception 'Winner history is immutable';end if;
 if (to_jsonb(new)-'delivery_status'-'delivery_notes') is distinct from (to_jsonb(old)-'delivery_status'-'delivery_notes')
  then raise exception 'Winner history is immutable';end if;
 return new;
end $$;
create trigger challenge_winner_immutable before update or delete on public.challenge_winners
for each row execute function public.challenge_winner_immutable();
revoke all on function public.challenge_winner_immutable() from public,anon,authenticated;

create function public.challenge_attach_asset(p_actor uuid,p_challenge uuid,p_path text,p_placement int default null)
returns void language plpgsql security definer set search_path=public as $$
declare c challenges;
begin
 if not challenge_actor(p_actor,p_challenge) then raise exception 'Administrator required';end if;
 select * into c from challenges where id=p_challenge for update;
 if c.status<>'draft' then raise exception 'Draft required';end if;
 perform 1 from challenge_uploads where path=p_path and challenge_id=c.id and not deleting
  and kind=case when p_placement is null then 'cover' else 'prize' end for update;
 if not found then raise exception 'Invalid asset';end if;
 if p_placement is null then update challenges set cover_image=p_path where id=c.id;
 else update challenge_prizes set image=p_path where challenge_id=c.id and placement=p_placement;end if;
end $$;
revoke all on function public.challenge_attach_asset(uuid,uuid,text,int) from public,anon,authenticated;
grant execute on function public.challenge_attach_asset(uuid,uuid,text,int) to service_role;

create function public.challenge_read(p_actor uuid,p_filter jsonb default '{}')
returns jsonb language plpgsql security definer set search_path=public as $$
declare admin boolean; current_challenge challenges; part challenge_participants; ranking jsonb; result jsonb;
 offset_value int:=coalesce((p_filter->>'offset')::int,0); rank_offset int:=coalesce((p_filter->>'rank_offset')::int,0);
begin
 admin:=challenge_actor(p_actor);
 if offset_value<0 or rank_offset<0 then raise exception 'Invalid pagination';end if;
 if p_filter->>'students' is not null then
  if not admin then raise exception 'Administrator required';end if;
  return (select coalesce(jsonb_agg(to_jsonb(rows)),'[]') from (
   select id,full_name name from profiles where role='student' and not is_deleted and full_name ilike '%'||(p_filter->>'students')||'%'
   order by full_name,id limit 50
  ) rows);
 end if;
 if p_filter->>'id' is null then
  select coalesce(jsonb_agg(to_jsonb(rows) order by start_date desc,id desc),'[]') into result from (
   select c.*,(select count(*) from challenge_participants where challenge_id=c.id and status in ('active','pending')) participant_count,
    case when p_filter->>'view'='mine' then case when c.status='completed' then
     (select value from challenge_results r cross join lateral jsonb_array_elements(r.snapshot->'ranking') v(value)
      where r.challenge_id=c.id and r.revision=c.result_revision and value->>'user_id'=p_actor::text)
     else (select to_jsonb(r) from challenge_ranking(c.id) r where user_id=p_actor) end else null end my_rank,
    (select count(*) from challenge_goals where challenge_id=c.id) goal_count,
    (select status from challenge_participants where challenge_id=c.id and user_id=p_actor) my_status,
    (select coalesce(jsonb_agg(to_jsonb(p) order by placement),'[]') from challenge_prizes p where challenge_id=c.id) prizes
   from challenges c where (admin or c.status<>'draft' and (c.visibility='public' or exists(select 1 from challenge_audience where challenge_id=c.id and user_id=p_actor)
    or exists(select 1 from challenge_participants where challenge_id=c.id and user_id=p_actor)))
    and (p_filter->>'from' is null or c.created_at>=(p_filter->>'from')::timestamptz)
    and (p_filter->>'to' is null or c.created_at<(p_filter->>'to')::timestamptz)
    and (p_filter->>'q' is null or c.title ilike '%'||(p_filter->>'q')||'%')
    and (coalesce(p_filter->>'view','all')<>'mine' or exists(select 1 from challenge_participants where challenge_id=c.id and user_id=p_actor and status in ('active','pending')))
    and (coalesce(p_filter->>'view','all')<>'future' or c.status='published' and c.start_date>now())
    and (coalesce(p_filter->>'view','all')<>'ongoing' or c.status='published' and c.start_date<=now() and c.end_date>now())
    and (coalesce(p_filter->>'view','all')<>'completed' or c.status in ('review','completed','cancelled') or c.end_date<=now() and c.status<>'draft')
   order by c.start_date desc,c.id desc limit 21 offset offset_value
  ) rows;
  return jsonb_build_object('items',result,'metrics',case when admin then (
   select jsonb_build_object('total',count(*),'active',count(*) filter(where status='published' and start_date<=now() and end_date>now()),
    'ended',count(*) filter(where status in ('review','completed')),
    'participants',(select count(*) from challenge_participants p where p.challenge_id in (
      select id from challenges where (p_filter->>'from' is null or created_at>=(p_filter->>'from')::timestamptz) and (p_filter->>'to' is null or created_at<(p_filter->>'to')::timestamptz))),
    'completed_goals',(select count(*) from challenge_points p where goal_id is not null and p.challenge_id in (
      select id from challenges where (p_filter->>'from' is null or created_at>=(p_filter->>'from')::timestamptz) and (p_filter->>'to' is null or created_at<(p_filter->>'to')::timestamptz)))
   ) from challenges where (p_filter->>'from' is null or created_at>=(p_filter->>'from')::timestamptz) and (p_filter->>'to' is null or created_at<(p_filter->>'to')::timestamptz)
  ) else null end,
  'engagement',case when admin then (select coalesce(jsonb_agg(to_jsonb(rows)),'[]') from (
   select c.id,c.title,count(p.id) participants from challenges c left join challenge_participants p on p.challenge_id=c.id
   where (p_filter->>'from' is null or c.created_at>=(p_filter->>'from')::timestamptz) and (p_filter->>'to' is null or c.created_at<(p_filter->>'to')::timestamptz)
   group by c.id order by participants desc,c.id limit 5) rows) else null end,
  'most_active',case when admin then (select coalesce(jsonb_agg(to_jsonb(rows)),'[]') from (
   select p.user_id,a.full_name name,count(v.id) activities from challenge_participants p join profiles a on a.id=p.user_id
   join challenge_activities v on v.participant_id=p.id and v.validation_status='approved' join challenges c on c.id=p.challenge_id
   where (p_filter->>'from' is null or c.created_at>=(p_filter->>'from')::timestamptz) and (p_filter->>'to' is null or c.created_at<(p_filter->>'to')::timestamptz)
   group by p.user_id,a.full_name order by activities desc,p.user_id limit 5) rows) else null end,
  'recent_winners',case when admin then (select coalesce(jsonb_agg(to_jsonb(rows)),'[]') from (
   select w.user_id,a.full_name name,c.title,w.placement,w.confirmed_at from challenge_winners w join profiles a on a.id=w.user_id
   join challenges c on c.id=w.challenge_id and c.result_revision=w.revision and c.status='completed'
   where (p_filter->>'from' is null or w.confirmed_at>=(p_filter->>'from')::timestamptz) and (p_filter->>'to' is null or w.confirmed_at<(p_filter->>'to')::timestamptz)
   order by w.confirmed_at desc limit 5) rows) else null end);
 end if;
 perform challenge_actor(p_actor,(p_filter->>'id')::uuid);
 select * into current_challenge from challenges where id=(p_filter->>'id')::uuid;
 select * into part from challenge_participants where challenge_id=current_challenge.id and user_id=p_actor;
 if current_challenge.status='completed' then
  select snapshot->'ranking' into ranking from challenge_results where challenge_id=current_challenge.id and revision=current_challenge.result_revision and published_at is not null;
 else
  select coalesce(jsonb_agg(to_jsonb(r) order by rank_position,user_id),'[]') into ranking from challenge_ranking(current_challenge.id) r;
 end if;
 ranking:=coalesce(ranking,'[]');
 return jsonb_build_object('challenge',to_jsonb(current_challenge),
  'goals',(select coalesce(jsonb_agg(to_jsonb(g) order by id),'[]') from challenge_goals g where challenge_id=current_challenge.id),
  'prizes',(select coalesce(jsonb_agg(to_jsonb(p) order by placement),'[]') from challenge_prizes p where challenge_id=current_challenge.id),
  'audience',case when admin then (select coalesce(jsonb_agg(user_id),'[]') from challenge_audience where challenge_id=current_challenge.id) else null end,
  'participant',case when part.id is null then null else to_jsonb(part) end,'participant_count',(select count(*) from challenge_participants where challenge_id=current_challenge.id and status in ('active','pending')),
  'progress',(select coalesce(jsonb_agg(to_jsonb(g)),'[]') from challenge_goal_progress(current_challenge.id,p_actor) g),
  'ranking',(select coalesce(jsonb_agg(value order by ord),'[]') from jsonb_array_elements(ranking) with ordinality rows(value,ord) where ord>rank_offset and ord<=rank_offset+50),
  'ranking_count',jsonb_array_length(ranking),'my_rank',(select value from jsonb_array_elements(ranking) where value->>'user_id'=p_actor::text),
  'activities',(select coalesce(jsonb_agg(to_jsonb(rows) order by created_at desc,id desc),'[]') from (
   select v.*,g.title goal_title,a.full_name name from challenge_activities v join challenge_goals g on g.id=v.goal_id
   join challenge_participants p on p.id=v.participant_id join profiles a on a.id=p.user_id
   where v.challenge_id=current_challenge.id and (admin or p.user_id=p_actor) and (p_filter->>'validation' is null or v.validation_status=p_filter->>'validation')
   order by v.created_at desc,v.id desc limit 51 offset offset_value) rows),
  'participants',case when admin then (select coalesce(jsonb_agg(to_jsonb(rows) order by joined_at),'[]') from (
   select p.*,a.full_name name,a.avatar_url avatar from challenge_participants p join profiles a on a.id=p.user_id
   where p.challenge_id=current_challenge.id order by joined_at,id limit 51 offset coalesce((p_filter->>'participant_offset')::int,0)) rows) else null end,
  'points',(select coalesce(jsonb_agg(to_jsonb(rows) order by created_at desc),'[]') from (
   select cp.* from challenge_points cp join challenge_participants p on p.id=cp.participant_id
   where cp.challenge_id=current_challenge.id and (admin or p.user_id=p_actor) order by created_at desc limit 50) rows),
  'result',case when admin then (select to_jsonb(r) from challenge_results r where challenge_id=current_challenge.id and revision=coalesce((p_filter->>'result_revision')::int,current_challenge.result_revision))
   else (select to_jsonb(r) from challenge_results r where challenge_id=current_challenge.id and published_at is not null order by revision desc limit 1) end,
  'winners',(select coalesce(jsonb_agg(to_jsonb(rows) order by placement,user_id),'[]') from (
   select w.*,a.full_name name,a.avatar_url avatar,p.name prize_name,p.image prize_image,p.delivery_instructions
   from challenge_winners w join profiles a on a.id=w.user_id left join challenge_prizes p on p.id=w.prize_id
   where w.challenge_id=current_challenge.id and w.revision=(select revision from challenge_results where challenge_id=current_challenge.id and published_at is not null order by revision desc limit 1)
  ) rows),
  'result_history',case when admin then (select coalesce(jsonb_agg(to_jsonb(rows) order by revision desc),'[]') from (
   select revision,reason,created_at,published_at from challenge_results where challenge_id=current_challenge.id order by revision desc limit 50) rows) else null end,
  'audit',case when admin then (select coalesce(jsonb_agg(to_jsonb(rows) order by created_at desc),'[]') from (
   select l.*,a.full_name admin_name from challenge_audit_logs l left join profiles a on a.id=l.admin_id where challenge_id=current_challenge.id order by created_at desc limit 50) rows) else null end);
end $$;

create function public.challenge_process()
returns jsonb language plpgsql security definer set search_path=public as $$
declare c challenges; p challenge_participants; failed int:=0; processed int:=0;
begin
 for c in select * from challenges where status in ('published','paused') and start_date<=now()
  order by last_processed_at nulls first,end_date,id limit 200 for update skip locked loop
  begin
   if now()>=c.end_date then
    perform challenge_freeze(c.id,null,'Encerramento automático');
    for p in select * from challenge_participants where challenge_id=c.id and status='active' loop
     perform challenge_notify(c.id,p.user_id,'ended','O desafio foi encerrado. A classificação aguarda revisão.','The challenge ended. Results are awaiting review.');
    end loop;
   elsif c.status='published' and now()>=c.start_date then
    for p in select * from challenge_participants where challenge_id=c.id and status='active' loop
     perform challenge_notify(c.id,p.user_id,'started','O desafio começou: '||c.title,'The challenge started: '||c.title);
     if exists(select 1 from challenge_goals g where g.challenge_id=c.id and
       coalesce((select sum(a.recorded_value) from challenge_activities a where a.participant_id=p.id and a.goal_id=g.id and a.validation_status='approved'
        and a.period_key=case g.frequency when 'daily' then (now() at time zone c.timezone)::date
         when 'weekly' then date_trunc('week',now() at time zone c.timezone)::date else (c.start_date at time zone c.timezone)::date end),0)<g.target_value)
     then perform challenge_notify(c.id,p.user_id,'reminder:'||(now() at time zone c.timezone)::date,'Confira suas metas do dia em '||c.title||'.','Check today’s goals in '||c.title||'.');end if;
     if c.end_date<=now()+interval '3 days' then perform challenge_notify(c.id,p.user_id,'last-days','Últimos dias do desafio!','The challenge is ending soon!');end if;
    end loop;
   end if;
   update challenges set last_processed_at=now() where id=c.id;
   processed:=processed+1;
  exception when others then failed:=failed+1;
  end;
 end loop;
 return jsonb_build_object('processed',processed,'failed',failed);
end $$;

create function public.challenge_reserve_upload(p_actor uuid,p_challenge uuid,p_path text,p_kind text,p_type text)
returns void language plpgsql security definer set search_path=public as $$
declare admin boolean; c challenges;
begin
 admin:=challenge_actor(p_actor,p_challenge);
 select * into c from challenges where id=p_challenge for update;
 if p_kind in ('cover','prize') and (not admin or c.status in ('cancelled','review','completed')) then raise exception 'Asset upload denied';end if;
 if p_kind='proof' and (c.status<>'published' or now()<c.start_date or now()>=c.end_date or not exists(
  select 1 from challenge_participants where challenge_id=c.id and user_id=p_actor and status='active'
 )) then raise exception 'Proof upload denied';end if;
 if p_kind<>'proof' and p_type<>'image/webp' then raise exception 'Image required';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text||':challenge-upload',0));
 if (select count(*) from challenge_uploads where owner_id=p_actor and created_at>now()-interval '1 hour')>=(case when admin then 200 else 30 end) then raise exception 'Upload rate limit reached';end if;
 insert into challenge_uploads(path,challenge_id,owner_id,kind,content_type) values(p_path,p_challenge,p_actor,p_kind,p_type);
end $$;

create function public.challenge_asset(p_actor uuid,p_path text)
returns text language plpgsql stable security definer set search_path=public as $$
declare u challenge_uploads; admin boolean; visible boolean;
begin
 select * into u from challenge_uploads where path=p_path and not deleting;
 if not found then raise exception 'Asset unavailable';end if;
 admin:=challenge_actor(p_actor,u.challenge_id);
 if u.kind='proof' and not admin and u.owner_id<>p_actor then raise exception 'Private proof';end if;
 if u.kind<>'proof' and not admin then
  select exists(select 1 from challenges where id=u.challenge_id and cover_image=p_path) or exists(select 1 from challenge_prizes where challenge_id=u.challenge_id and image=p_path) into visible;
  if not visible then raise exception 'Unpublished image';end if;
 end if;
 return u.content_type;
end $$;

create function public.challenge_unused_uploads()
returns setof public.challenge_uploads language plpgsql security definer set search_path=public as $$
declare candidate record;
begin
 for candidate in select path from challenge_uploads u where created_at<now()-interval '1 day' and not deleting
  and not exists(select 1 from challenges where cover_image=u.path)
  and not exists(select 1 from challenge_prizes where image=u.path)
  and not exists(select 1 from challenge_activities where proof_image=u.path)
  order by path limit 100 for update skip locked
 loop
  update challenge_uploads u set deleting=true where path=candidate.path
   and not exists(select 1 from challenges where cover_image=u.path)
   and not exists(select 1 from challenge_prizes where image=u.path)
   and not exists(select 1 from challenge_activities where proof_image=u.path);
 end loop;
 return query select * from challenge_uploads where deleting order by created_at limit 100;
end $$;

-- Internal functions and all writes are server-only.
revoke all on function public.challenge_actor(uuid,uuid),public.challenge_notify(uuid,uuid,text,text,text),
 public.challenge_goal_progress(uuid,uuid),public.challenge_ranking(uuid),public.challenge_recalculate(uuid,jsonb),
 public.challenge_freeze(uuid,uuid,text),public.challenge_mutate(uuid,text,jsonb),public.challenge_read(uuid,jsonb),
 public.challenge_process(),public.challenge_reserve_upload(uuid,uuid,text,text,text),public.challenge_asset(uuid,text),
 public.challenge_unused_uploads() from public,anon,authenticated;
grant execute on function public.challenge_actor(uuid,uuid),public.challenge_mutate(uuid,text,jsonb),public.challenge_read(uuid,jsonb),
 public.challenge_process(),public.challenge_reserve_upload(uuid,uuid,text,text,text),public.challenge_asset(uuid,text),
 public.challenge_unused_uploads() to service_role;
commit;
