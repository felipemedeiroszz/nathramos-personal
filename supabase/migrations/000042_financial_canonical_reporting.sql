begin;
create or replace function public.admin_data_page(p_actor uuid,p_kind text,p_filters jsonb default '{}'::jsonb,p_page int default 1,p_size int default 30)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare actor_role text; source text; result jsonb; total int; size int:=greatest(1,least(p_size,100)); page int; sql text; snapshot timestamptz:=coalesce((p_filters->>'_snapshot')::timestamptz,now());
begin
 select role::text into actor_role from profiles where id=p_actor and not is_deleted;
 if actor_role is null or actor_role not in ('admin','coach') or (actor_role='coach' and p_kind not in ('diet_kits','supplement_kits','workout_kits','exams','exercises')) then raise exception 'Administrador obrigatório';end if;
 if p_kind not in ('payments','subscriptions','diet_foods','supplements','ebooks','diet_kits','supplement_kits','workout_kits','exams','exercises') then raise exception 'Catálogo inválido';end if;
 source:=format('select to_jsonb(t) as row from public.%I t',p_kind);
 if p_kind in ('payments','subscriptions') then
 source:=format('select to_jsonb(t)||jsonb_build_object(''student_name'',p.full_name%s) as row from public.%I t left join profiles p on p.id=t.user_id %s',case when p_kind='subscriptions' then ',''plan_name'',pl.name_pt' else '' end,p_kind,case when p_kind='subscriptions' then 'left join plans pl on pl.id=t.plan_id' else '' end);
 end if;
 if p_kind='payments' then source:=source||' where not t.is_duplicate';end if;
 if actor_role='coach' then
 if p_kind='exams' then source:=source||format(' where can_manage_student(t.user_id,%L::uuid)',p_actor);
 else source:=source||format(' where t.created_by_id=%L::uuid',p_actor);end if;
 end if;
 if p_kind in ('diet_kits','supplement_kits') then source:=replace(source,'to_jsonb(t) as row',format('to_jsonb(t)||jsonb_build_object(''assignment_fingerprint'',admin_assignment_fingerprint(%L::uuid,%L,''kit'',t.id)) as row',p_actor,case p_kind when 'diet_kits' then 'diet' else 'supplement' end));end if;
 sql:='with source as ('||source||'), filtered as (select row from source where (row->>''created_at'')::timestamptz<=($1->>''_snapshot'')::timestamptz and coalesce(row->>''is_deleted'',''false'')<>''true'' and ($1->>''q'' is null or position(lower($1->>''q'') in lower(concat_ws('' '',row->>''name_pt'',row->>''name_en'',row->>''title_pt'',row->>''title_en'',row->>''student_name'',row->>''description_pt'',row->>''external_id'',row->>''title'')))>0) and not exists(select 1 from jsonb_each_text($1) f where f.key in (''status'',''provider'',''currency'',''category'',''category_id'',''language'',''source'',''difficulty'',''equipment'',''is_active'',''is_published'',''is_free'') and row->>f.key is distinct from f.value) and ($1->>''from'' is null or (row->>''created_at'')::timestamptz>=($1->>''from'')::date::timestamp at time zone ''America/Sao_Paulo'') and ($1->>''to'' is null or (row->>''created_at'')::timestamptz<(($1->>''to'')::date+1)::timestamp at time zone ''America/Sao_Paulo''))';
 execute sql||' select count(*)::int from filtered' into total using p_filters||jsonb_build_object('_snapshot',snapshot);
 page:=greatest(1,least(coalesce(p_page,1),greatest(1,(total+size-1)/size)));
 execute sql||' select coalesce(jsonb_agg(row),''[]''::jsonb) from (select row from filtered order by row->>''created_at'' desc,row->>''id'' limit $2 offset $3) r' into result using p_filters||jsonb_build_object('_snapshot',snapshot),size,(page-1)*size;
 return jsonb_build_object('rows',result,'total',total,'page',page,'size',size,'snapshot',snapshot);
end $$;

create or replace function public.admin_analytics_report(
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
  where not pay.is_duplicate and v_role='admin' and pay.currency::text=p_currency and pay.created_at<=v_now
  and ((pay.paid_at>=v_previous and pay.paid_at<v_end) or (pay.created_at>=v_start and pay.created_at<v_end) or (pay.refunded_at>=v_start and pay.refunded_at<v_end) or exists(select 1 from payment_refunds r where r.payment_id=pay.id and r.occurred_at>=v_start and r.occurred_at<v_end))
  and (p_provider is null or pay.provider::text=p_provider) and (p_plan is null or sub.plan_id=p_plan)
 ), paid as materialized (
  select * from payments_scope where status in ('paid','refunded','partially_refunded') and paid_at>=v_previous and paid_at<v_end and paid_at<=v_now
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
  'refunded_cents',(select coalesce(sum(r.amount_cents),0) from payment_refunds r join payments_scope pay on pay.id=r.payment_id where r.status='succeeded' and r.occurred_at>=v_start and r.occurred_at<v_end and r.occurred_at<=v_now),
 'paid_cents',(select coalesce(sum(amount_cents),0) from paid where paid_at>=v_start),
  'previous_paid_cents',(select coalesce(sum(amount_cents),0) from paid where paid_at<v_start),
  'paid_count',(select count(*) from paid where paid_at>=v_start),
  'pending_count',(select count(*) from payments_scope where status in ('pending','processing') and created_at>=v_start and created_at<v_end),
  'failed_count',(select count(*) from payments_scope where status='failed' and created_at>=v_start and created_at<v_end),
  'refund_count',(select count(distinct r.payment_id) from payment_refunds r join payments_scope pay on pay.id=r.payment_id where r.status='succeeded' and r.occurred_at>=v_start and r.occurred_at<v_end and r.occurred_at<=v_now),
  'mrr_cents',(select coalesce(round(sum(unit_amount_cents*30.0/nullif(billing_cycle_days,0))),0) from subs where effective_status='active' and not cancel_at_period_end and coalesce(source,'')<>'asaas_pix'),
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

create or replace function public.admin_finance_checks(p_actor uuid,p_currency text,p_from date,p_to date) returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not exists(select 1 from profiles where id=p_actor and role='admin' and not is_deleted) then raise exception 'Administrador obrigatório';end if;
 if p_currency not in ('BRL','USD') or p_to<p_from then raise exception 'Período ou moeda inválidos';end if;
 return jsonb_build_object(
 'paid_cents',(select coalesce(sum(amount_cents),0) from payments where not is_duplicate and currency::text=p_currency and status in ('paid','refunded','partially_refunded') and paid_at>=p_from::timestamp at time zone 'America/Sao_Paulo' and paid_at<(p_to+1)::timestamp at time zone 'America/Sao_Paulo'),
 'failed_webhooks',(select count(*) from webhook_events where error_text is not null and created_at>=p_from::timestamp at time zone 'America/Sao_Paulo' and created_at<(p_to+1)::timestamp at time zone 'America/Sao_Paulo'),
 'pending_webhooks',(select count(*) from webhook_events where processed_at is null and created_at<now()-interval '5 minutes' and created_at>=p_from::timestamp at time zone 'America/Sao_Paulo' and created_at<(p_to+1)::timestamp at time zone 'America/Sao_Paulo'),
 'expired_active',(select count(*) from subscriptions where currency::text=p_currency and status='active' and current_period_end<now()),
 'missing_external_ids',(select count(*) from subscriptions where currency::text=p_currency and provider is not null and external_id is null),
 'paid_without_active_subscription',(select count(*) from payments pay where not pay.is_duplicate and pay.currency::text=p_currency and pay.status='paid' and pay.subscription_id is not null and pay.paid_at>=p_from::timestamp at time zone 'America/Sao_Paulo' and pay.paid_at<(p_to+1)::timestamp at time zone 'America/Sao_Paulo' and not exists(select 1 from subscriptions s where s.id=pay.subscription_id and s.status in ('active','trialing')))
 );
end $$;

do $$ declare definition text;begin
 select pg_get_expr(polqual,polrelid) into definition from pg_policy where polname='ebooks_read' and polrelid='public.ebooks'::regclass;
 definition:=replace(definition,'ep.status = ''paid''::payment_status_t','ep.status = ANY (ARRAY[''paid''::payment_status_t,''partially_refunded''::payment_status_t])');
 execute 'alter policy ebooks_read on public.ebooks using ('||definition||')';
end $$;
commit;
