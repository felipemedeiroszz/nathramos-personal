begin;
create table public.admin_manual_operations (
 id uuid primary key, actor_id uuid not null references profiles(id), student_id uuid not null references profiles(id),
 request jsonb not null, result jsonb not null, created_at timestamptz not null default now()
);
alter table public.admin_manual_operations enable row level security;
revoke all on public.admin_manual_operations from public,anon,authenticated;
grant all on public.admin_manual_operations to service_role;

create function public.admin_record_student_manual(
 p_actor uuid,p_student uuid,p_key uuid,p_plan uuid default null,p_expires date default null,
 p_amount int default null,p_currency text default 'BRL',p_method text default 'cash',
 p_paid_date date default null,p_notes text default ''
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
 v_plan plans; v_sub uuid; v_payment uuid; v_request jsonb; v_previous admin_manual_operations;
 v_result jsonb; v_today date:=(now() at time zone 'America/Sao_Paulo')::date;
begin
 if not exists(select 1 from profiles where id=p_actor and role='admin' and not is_deleted) then
   raise exception 'ADMIN_REQUIRED' using errcode='42501';
 end if;
 if p_key is null then raise exception 'INVALID_REQUEST';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_key::text,0));
 v_request:=jsonb_build_object('plan',p_plan,'expires',p_expires,'amount',p_amount,'currency',p_currency,'method',p_method,'paid_date',p_paid_date,'notes',p_notes);
 select * into v_previous from admin_manual_operations where id=p_key;
 if found then
   if v_previous.actor_id<>p_actor or v_previous.student_id<>p_student or v_previous.request<>v_request then raise exception 'REQUEST_CONFLICT';end if;
   return v_previous.result;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('checkout:'||p_student::text||':plan',0));
 perform 1 from profiles where id=p_student and role='student' and not is_deleted for update;
 if not found then raise exception 'STUDENT_NOT_FOUND';end if;
 if (p_plan is null and p_amount is null) or (p_plan is null and p_expires is not null) or
    p_currency is null or p_currency not in ('BRL','USD') or p_notes is null or length(p_notes)>1000 then raise exception 'INVALID_REQUEST';end if;
 if p_amount is not null and (p_amount<=0 or p_amount>100000000 or p_paid_date is null or p_paid_date>v_today or p_method is null or p_method not in ('cash','pix','bank_transfer','credit_card')) then raise exception 'INVALID_PAYMENT';end if;
 if p_plan is not null then
   select * into v_plan from plans where id=p_plan and is_active and not is_deleted for share;
   if not found then raise exception 'PLAN_NOT_FOUND';end if;
   if p_expires is null or p_expires<v_today or p_expires>v_today+3650 then raise exception 'INVALID_EXPIRY';end if;
   if v_plan.currency::text<>p_currency then raise exception 'CURRENCY_MISMATCH';end if;
   -- Do not hide a subscription that can still charge at its gateway.
   if exists(select 1 from subscriptions where user_id=p_student and provider in ('stripe','asaas')
       and not (provider='asaas' and (coalesce(source,'')='asaas_pix' or coalesce(external_id,'') like 'pay\_%' escape '\') and current_period_end<=now())
       and (ended_at is null or ended_at>now()) and
       ((status in ('active','trialing','past_due','blocked') and coalesce(external_status,'') not in ('canceled','incomplete_expired'))
         or (status='inactive' and external_id is not null and coalesce(external_status,'') not in ('canceled','incomplete_expired'))
         or (status='canceled' and current_period_end>now())))
     or exists(select 1 from billing_checkout_operations where user_id=p_student and kind='plan' and state in ('creating','ready') and expires_at>now()) then
     raise exception 'EXTERNAL_SUBSCRIPTION_EXISTS';
   end if;
   update subscriptions set status='inactive',ended_at=now() where user_id=p_student and provider is null and status in ('active','trialing','past_due','canceled');
   insert into subscriptions(user_id,plan_id,status,currency,unit_amount_cents,billing_cycle_days,current_period_start,current_period_end,source,cancel_at_period_end,last_paid_at)
   values(p_student,p_plan,'active',v_plan.currency,v_plan.price_cents,v_plan.billing_cycle_days,now(),
     (p_expires+1)::timestamp at time zone 'America/Sao_Paulo','admin_manual',true,
     case when p_amount is not null then p_paid_date::timestamp at time zone 'America/Sao_Paulo' end) returning id into v_sub;
 else
   select id into v_sub from subscriptions where user_id=p_student and currency::text=p_currency
    order by case status when 'active' then 1 when 'trialing' then 2 when 'past_due' then 3 else 4 end,created_at desc,id desc limit 1;
 end if;
 if p_amount is not null then
   insert into payments(user_id,subscription_id,provider,status,amount_cents,currency,fee_cents,method,paid_at,description_pt,description_en,idempotency_key,metadata)
   values(p_student,v_sub,'manual','paid',p_amount,p_currency::currency_t,0,p_method::payment_method_t,
     p_paid_date::timestamp at time zone 'America/Sao_Paulo','Pagamento manual recebido','Manual payment received',
     'admin-manual:'||p_key::text,jsonb_build_object('recorded_by',p_actor,'notes',p_notes,'operation_id',p_key)) returning id into v_payment;
 end if;
 v_result:=jsonb_build_object('subscription_id',v_sub,'payment_id',v_payment);
 insert into audit_logs(admin_id,user_id,action,entity_type,entity_id,details,table_name,operation)
 values(p_actor,p_student,'student.manual_billing','profiles',p_student::text,v_request||v_result,'profiles','UPDATE');
 insert into admin_manual_operations(id,actor_id,student_id,request,result) values(p_key,p_actor,p_student,v_request,v_result);
 return v_result;
end $$;
revoke all on function public.admin_record_student_manual(uuid,uuid,uuid,uuid,date,int,text,text,date,text) from public,anon,authenticated;
grant execute on function public.admin_record_student_manual(uuid,uuid,uuid,uuid,date,int,text,text,date,text) to service_role;

-- Manual access is prepaid and stops at the chosen expiration, without gateway grace days.
do $$ declare definition text; begin
 select pg_get_functiondef('public.can_access_platform(uuid)'::regprocedure) into definition;
 if position('-- PIX avulso libera' in definition)=0 then raise exception 'Access function does not match migration 000043';end if;
 definition:=replace(definition,'-- PIX avulso libera',
   E'if v_sub.source=''admin_manual'' and v_sub.current_period_end<=v_now then\n return query select false, ''blocked''::subscription_status_t, ''manual_period_expired'';\n return;\n end if;\n -- PIX avulso libera');
 execute definition;
 select pg_get_functiondef('public.admin_analytics_report(uuid,date,date,text,text,uuid,uuid,text,text,integer,integer)'::regprocedure) into definition;
 definition:=replace(definition, 'p_provider not in (''stripe'',''asaas'')', 'p_provider not in (''stripe'',''asaas'',''manual'')');
 execute replace(definition, 'coalesce(source,'''')<>''asaas_pix''', 'coalesce(source,'''') not in (''asaas_pix'',''admin_manual'')');
end $$;
commit;
