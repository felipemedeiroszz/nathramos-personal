begin;
create index if not exists analytics_sessions_completed_idx on public.workout_sessions(user_id,completed_at desc) where completed_at is not null;
create index if not exists analytics_paid_period_idx on public.payments(currency,paid_at,user_id) where status='paid';
create index if not exists analytics_pending_exams_idx on public.exams(user_id) where not is_deleted and reviewed_at is null;

create function public.admin_analytics_report(
 p_actor uuid,p_from date,p_to date,p_grain text default 'week',p_currency text default 'BRL',
 p_coach uuid default null,p_plan uuid default null,p_provider text default null,p_search text default '',p_page int default 1,p_size int default 25)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_role text; v_now timestamptz:=now(); v_start timestamptz;v_end timestamptz;v_previous timestamptz;v_previous_date date;v_result jsonb;v_size int:=greatest(1,least(coalesce(p_size,25),5000));
begin
 select role::text into v_role from profiles where id=p_actor and not is_deleted;
 if v_role is null or v_role not in ('admin','coach') then raise exception 'Access denied' using errcode='42501';end if;
 if p_from is null or p_to is null or p_to<p_from or p_to-p_from>730 or p_grain not in ('day','week','month') or p_currency not in ('BRL','USD') then raise exception 'Invalid reporting period or filters';end if;
 if p_grain='day' and p_to-p_from>92 then raise exception 'Daily reports support up to 93 days';end if;
 if p_provider is not null and p_provider not in ('stripe','asaas') then raise exception 'Invalid provider';end if;
 if v_role='coach' and ((p_coach is not null and p_coach<>p_actor) or p_plan is not null or p_provider is not null) then raise exception 'Access denied' using errcode='42501';end if;
 v_start:=p_from::timestamp at time zone 'America/Sao_Paulo';
 v_end:=(p_to+1)::timestamp at time zone 'America/Sao_Paulo';
 v_previous_date:=p_from-(p_to-p_from+1);
 v_previous:=v_previous_date::timestamp at time zone 'America/Sao_Paulo';
 with scope as materialized (
  select p.id,p.full_name,p.created_at,r.coach_id,c.full_name as coach_name,r.unread_count_coach
  from profiles p left join mentorship_rooms r on r.user_id=p.id left join profiles c on c.id=r.coach_id and not c.is_deleted
  where can_manage_student(p.id,p_actor) and p.created_at<=v_now
  and (p_coach is null or r.coach_id=p_coach)
  and (coalesce(trim(p_search),'')='' or position(lower(left(trim(p_search),200)) in lower(p.full_name))>0)
 ), sessions as materialized (
  select s.user_id,s.started_at,s.completed_at,s.duration_min,s.created_at from workout_sessions s join scope p on p.id=s.user_id
  where s.created_at<=v_now and ((s.completed_at>=v_previous and s.completed_at<v_end) or (coalesce(s.started_at,s.created_at)>=v_start and coalesce(s.started_at,s.created_at)<v_end))
 ), activity as (
  select user_id,
   count(*) filter(where completed_at>=v_start and completed_at<v_end and completed_at<=v_now)::int as completed,
   coalesce(sum(greatest(duration_min,0)) filter(where completed_at>=v_start and completed_at<v_end and completed_at<=v_now),0) as minutes,
   max(completed_at) filter(where completed_at<v_end and completed_at<=v_now) as last_workout
  from sessions group by user_id
 ), pending_exams as (
  select e.user_id,count(*)::int as count from exams e join scope p on p.id=e.user_id where not e.is_deleted and e.reviewed_at is null group by e.user_id
 ), detail as materialized (
  select p.id,p.full_name as name,p.coach_name,coalesce(a.completed,0) as completed,coalesce(a.minutes,0) as minutes,(select max(last.completed_at) from workout_sessions last where last.user_id=p.id and last.completed_at<v_end and last.completed_at<=v_now) as last_workout,
  exists(select 1 from student_workout_kits k where k.student_id=p.id and k.status='active' and (k.start_date is null or k.start_date<=(v_now at time zone 'America/Sao_Paulo')::date) and (k.end_date is null or k.end_date>=(v_now at time zone 'America/Sao_Paulo')::date)) as workout,
  exists(select 1 from student_diet_kits k where k.student_id=p.id and k.status='active' and (k.start_date is null or k.start_date<=(v_now at time zone 'America/Sao_Paulo')::date) and (k.end_date is null or k.end_date>=(v_now at time zone 'America/Sao_Paulo')::date)) as diet,
  coalesce(e.count,0) as pending_exams,coalesce(p.unread_count_coach,0) as unread
  from scope p left join activity a on a.user_id=p.id left join pending_exams e on e.user_id=p.id
 ), subs as materialized (
  select s.*,coalesce(ac.status,s.status) as effective_status,pl.name_pt as plan_name_pt,pl.name_en as plan_name_en
  from scope p join lateral(select sub.* from subscriptions sub where sub.user_id=p.id order by case sub.status when 'active' then 1 when 'trialing' then 2 when 'past_due' then 3 when 'canceled' then 4 when 'expired' then 5 when 'blocked' then 6 else 7 end,sub.created_at desc,sub.id desc limit 1) s on true
  left join plans pl on pl.id=s.plan_id left join lateral can_access_platform(p.id) ac on true
  where v_role='admin' and s.currency::text=p_currency and (p_plan is null or s.plan_id=p_plan) and (p_provider is null or s.provider::text=p_provider)
 ), payments_scope as materialized (
  select pay.*,pl.name_pt as plan_name_pt,pl.name_en as plan_name_en
  from payments pay join scope p on p.id=pay.user_id left join subscriptions sub on sub.id=pay.subscription_id left join plans pl on pl.id=sub.plan_id
  where v_role='admin' and pay.currency::text=p_currency and pay.created_at<=v_now
  and ((pay.paid_at>=v_previous and pay.paid_at<v_end) or (pay.created_at>=v_start and pay.created_at<v_end) or (pay.refunded_at>=v_start and pay.refunded_at<v_end))
  and (p_provider is null or pay.provider::text=p_provider) and (p_plan is null or sub.plan_id=p_plan)
 ), paid as materialized (
  select * from payments_scope where status='paid' and paid_at>=v_previous and paid_at<v_end and paid_at<=v_now
 ), buckets as (
  select generate_series(date_trunc(p_grain,p_from::timestamp),date_trunc(p_grain,p_to::timestamp),case p_grain when 'day' then interval '1 day' when 'week' then interval '1 week' else interval '1 month' end)::date as bucket
 ), session_trend as (
  select date_trunc(p_grain,completed_at at time zone 'America/Sao_Paulo')::date as bucket,count(*)::int as count from sessions where completed_at>=v_start and completed_at<v_end and completed_at<=v_now group by 1
 ), student_trend as (
  select date_trunc(p_grain,created_at at time zone 'America/Sao_Paulo')::date as bucket,count(*)::int as count from scope where created_at>=v_start and created_at<v_end group by 1
 ), paid_trend as (
  select date_trunc(p_grain,paid_at at time zone 'America/Sao_Paulo')::date as bucket,sum(amount_cents) as cents from paid where paid_at>=v_start group by 1
 ), trend as (
  select b.bucket::text as key,coalesce(s.count,0) as completed,coalesce(n.count,0) as new_students,
  case when v_role='admin' then coalesce(pay.cents,0) else null end as revenue_cents
  from buckets b left join session_trend s using(bucket) left join student_trend n using(bucket) left join paid_trend pay using(bucket) order by b.bucket
 ), bounds as (
  select count(*)::int as total,greatest(1,least(coalesce(p_page,1),greatest(1,(count(*)::int+v_size-1)/v_size))) as page from detail
 ), detail_page as (
  select * from detail order by name,id limit v_size offset ((select page from bounds)-1)*v_size
 )
 select jsonb_build_object(
 'meta',jsonb_build_object('from',p_from,'to',p_to,'previous_from',v_previous_date,'previous_to',p_from-1,'grain',p_grain,'currency',p_currency,'role',v_role,'generated_at',v_now,'timezone','America/Sao_Paulo','coach_id',p_coach,'plan_id',p_plan,'provider',p_provider,'search',left(coalesce(p_search,''),200)),
 'summary',jsonb_build_object(
  'students',(select count(*) from scope),
  'new_students',(select count(*) from scope where created_at>=v_start and created_at<v_end),
  'previous_new_students',(select count(*) from scope where created_at>=v_previous and created_at<v_start),
  'completed_sessions',(select count(*) from sessions where completed_at>=v_start and completed_at<v_end and completed_at<=v_now),
  'previous_completed_sessions',(select count(*) from sessions where completed_at>=v_previous and completed_at<v_start and completed_at<=v_now),
  'started_sessions',(select count(*) from sessions where coalesce(started_at,created_at)>=v_start and coalesce(started_at,created_at)<v_end and coalesce(started_at,created_at)<=v_now),
  'cohort_completed',(select count(*) from sessions where coalesce(started_at,created_at)>=v_start and coalesce(started_at,created_at)<v_end and completed_at<v_end and completed_at<=v_now),
  'active_students',(select count(*) from detail where completed>0),
  'minutes',(select coalesce(sum(minutes),0) from detail),
  'workout_coverage',(select count(*) from detail where workout),
  'diet_coverage',(select count(*) from detail where diet),
  'exams_pending',(select coalesce(sum(pending_exams),0) from detail),
  'unread_conversations',(select count(*) from detail where unread>0),
  'upcoming_meetings',(select count(*) from meetings m join scope p on p.id=m.user_id where m.status='scheduled' and m.start_at>=v_now and m.start_at<v_now+interval '7 days')
 ),
 'financial',case when v_role='admin' then jsonb_build_object(
  'paid_cents',(select coalesce(sum(amount_cents),0) from paid where paid_at>=v_start),
  'previous_paid_cents',(select coalesce(sum(amount_cents),0) from paid where paid_at<v_start),
  'paid_count',(select count(*) from paid where paid_at>=v_start),
  'pending_count',(select count(*) from payments_scope where status in ('pending','processing') and created_at>=v_start and created_at<v_end),
  'failed_count',(select count(*) from payments_scope where status='failed' and created_at>=v_start and created_at<v_end),
  'refund_count',(select count(*) from payments_scope where status in ('refunded','partially_refunded') and coalesce(refunded_at,created_at)>=v_start and coalesce(refunded_at,created_at)<v_end),
  'mrr_cents',(select coalesce(round(sum(unit_amount_cents*30.0/nullif(billing_cycle_days,0))),0) from subs where effective_status in ('active','trialing') and not cancel_at_period_end),
  'subscriptions',(select count(*) from subs),
  'statuses',coalesce((select jsonb_agg(to_jsonb(s)) from (select effective_status::text as name,count(*)::int as value from subs group by effective_status order by value desc) s),'[]'::jsonb),
  'methods',coalesce((select jsonb_agg(to_jsonb(m)) from (select method::text as name,count(*)::int as value,sum(amount_cents) as cents from paid where paid_at>=v_start group by method order by cents desc) m),'[]'::jsonb),
  'plans',coalesce((select jsonb_agg(to_jsonb(pl)) from (select coalesce(plan_name_pt,'Sem plano / avulso') as name_pt,coalesce(plan_name_en,'No plan / one-off') as name_en,count(*)::int as payments,sum(amount_cents) as cents from paid where paid_at>=v_start group by plan_name_pt,plan_name_en order by cents desc limit 10) pl),'[]'::jsonb)
 ) else null end,
 'trend',coalesce((select jsonb_agg(to_jsonb(t) order by key) from trend t),'[]'::jsonb),
 'students',coalesce((select jsonb_agg(to_jsonb(d) order by name,id) from detail_page d),'[]'::jsonb),
 'details',(select jsonb_build_object('total',total,'page',page,'size',v_size) from bounds),
 'options',jsonb_build_object(
  'coaches',case when v_role='admin' then coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',full_name) order by full_name) from profiles where role in ('coach','admin') and not is_deleted),'[]'::jsonb) else '[]'::jsonb end,
  'plans',case when v_role='admin' then coalesce((select jsonb_agg(jsonb_build_object('id',id,'name_pt',name_pt,'name_en',name_en) order by name_pt) from plans),'[]'::jsonb) else '[]'::jsonb end
 )) into v_result;
 return v_result;
end $$;
revoke all on function public.admin_analytics_report(uuid,date,date,text,text,uuid,uuid,text,text,int,int) from public,anon,authenticated;
grant execute on function public.admin_analytics_report(uuid,date,date,text,text,uuid,uuid,text,text,int,int) to service_role;
commit;
