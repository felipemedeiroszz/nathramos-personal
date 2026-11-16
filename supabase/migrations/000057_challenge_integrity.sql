begin;
-- Apply the review fixes to installations that already ran migration 000056.
alter table public.challenges add column if not exists score_revision bigint not null default 0;
alter table public.challenge_activities add column if not exists activity_day date;
update public.challenge_activities a
set activity_day=(a.activity_date at time zone c.timezone)::date
from public.challenges c where c.id=a.challenge_id and a.activity_day is null;
alter table public.challenge_activities alter column activity_day set not null;
do $$
declare item record;
begin
 for item in select conname from pg_constraint
 where conrelid='public.challenge_activities'::regclass and contype='u'
 and (select array_agg(attname::text order by n) from unnest(conkey) with ordinality k(attnum,n)
      join pg_attribute a on a.attrelid=conrelid and a.attnum=k.attnum)
   =array['participant_id','goal_id','activity_date']
 loop
  execute format('alter table public.challenge_activities drop constraint %I',item.conname);
 end loop;
 if exists(select 1 from public.challenge_activities where validation_status<>'rejected'
   group by participant_id,goal_id,activity_day having count(*)>1)
 then raise exception 'Review duplicate active challenge records per day before applying migration 000057';end if;
end $$;
create unique index if not exists challenge_activities_daily_unique
on public.challenge_activities(participant_id,goal_id,activity_day) where validation_status<>'rejected';

create or replace function public.challenge_recalculate(p_participant uuid,p_previous jsonb)
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

create or replace function public.challenge_mutate(p_actor uuid,p_action text,p_input jsonb)
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

create or replace function public.challenge_read(p_actor uuid,p_filter jsonb default '{}')
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
revoke all on function public.challenge_recalculate(uuid,jsonb),
 public.challenge_mutate(uuid,text,jsonb),public.challenge_read(uuid,jsonb)
 from public,anon,authenticated;
grant execute on function public.challenge_mutate(uuid,text,jsonb),public.challenge_read(uuid,jsonb) to service_role;
commit;
