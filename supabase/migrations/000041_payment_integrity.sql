begin;
alter table public.payments add column if not exists is_duplicate boolean not null default false;
alter table public.payments add column if not exists canonical_payment_id uuid references public.payments(id);
alter table public.payments add column if not exists refunded_amount_cents int not null default 0 check(refunded_amount_cents>=0);
alter table public.payments add column if not exists last_provider_sync_at timestamptz;
alter table public.subscriptions add column if not exists last_provider_sync_at timestamptz;
create table public.billing_checkout_operations(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references profiles(id),kind text not null check(kind in ('plan','ebook')),target_id uuid not null,provider payment_provider_t not null,
 request_key text not null unique,subscription_id uuid references subscriptions(id),remote_id text,state text not null default 'creating' check(state in ('creating','ready','completed')),
 amount_cents int not null,currency currency_t not null,billing_cycle_days int,created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '3 days'
);
alter table public.billing_checkout_operations enable row level security;
revoke all on public.billing_checkout_operations from anon,authenticated;
create table public.payment_aliases(provider payment_provider_t not null,external_id text not null,payment_id uuid not null references payments(id),primary key(provider,external_id));
alter table public.payment_aliases enable row level security;
revoke all on public.payment_aliases from anon,authenticated;
create table public.payment_refunds(provider payment_provider_t not null,external_id text not null,payment_id uuid not null references payments(id),amount_cents int not null check(amount_cents>=0),status text not null check(status in ('pending','succeeded','failed')),occurred_at timestamptz not null,primary key(provider,external_id));
alter table public.payment_refunds enable row level security;
create policy refunds_admin_read on public.payment_refunds for select to authenticated using(is_admin());
revoke all on public.payment_refunds from anon,authenticated;grant select on public.payment_refunds to authenticated;
-- A purchase cannot be forged through the student Supabase client.
drop policy if exists ebook_purchases_self on public.ebook_purchases;
create policy ebook_purchases_self on public.ebook_purchases for select to authenticated using(is_admin() or user_id=auth.uid());
revoke insert,update,delete on public.ebook_purchases from anon,authenticated;
-- Failures remain retryable, including historical errors incorrectly marked as processed.
update webhook_events set processed_at=null where error_text is not null;
create index if not exists billing_checkout_user_idx on billing_checkout_operations(user_id,kind,created_at desc);
create index if not exists payment_refunds_date_idx on payment_refunds(occurred_at) where status='succeeded';
create function public.billing_current_subscription(p_user uuid) returns jsonb language sql stable security definer set search_path=public as $$
 select to_jsonb(s)||jsonb_build_object('plan',to_jsonb(p)) from subscriptions s left join plans p on p.id=s.plan_id where s.user_id=p_user
 order by case s.status when 'active' then 1 when 'trialing' then 2 when 'past_due' then 3 when 'canceled' then 4 when 'expired' then 5 when 'blocked' then 6 else 7 end,s.created_at desc,s.id desc limit 1;
$$;
revoke all on function public.billing_current_subscription(uuid) from public,anon,authenticated;
grant execute on function public.billing_current_subscription(uuid) to service_role;
create function public.billing_reserve_checkout(p_user uuid,p_kind text,p_target uuid,p_provider payment_provider_t,p_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare op billing_checkout_operations; price int; curr currency_t; cycle int; sub_id uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended('checkout:'||p_user::text||':'||p_kind,0));
 if not exists(select 1 from profiles where id=p_user and role='student' and not is_deleted) then raise exception 'Conta de aluno indisponível';end if;
 select * into op from billing_checkout_operations where request_key=p_key;
 if found then
  if op.user_id<>p_user or op.target_id<>p_target or op.provider<>p_provider or op.kind<>p_kind then raise exception 'Checkout incompatível';end if;
  if op.state='creating' and op.created_at>now()-interval '15 minutes' then raise exception 'Checkout em processamento. Aguarde a confirmação.';end if;
  if op.state='creating' then update billing_checkout_operations set created_at=now() where id=op.id;end if;
  return to_jsonb(op);
 end if;
 if exists(select 1 from billing_checkout_operations where user_id=p_user and kind=p_kind and state='creating' and created_at>now()-interval '15 minutes') then raise exception 'Já existe uma contratação em processamento. Reutilize a tentativa anterior.';end if;
 if p_kind='plan' then
  if exists(select 1 from billing_checkout_operations where user_id=p_user and kind='plan' and state='ready' and expires_at>now()) then raise exception 'Existe uma contratação pendente. Conclua a tentativa anterior.';end if;
  if exists(select 1 from subscriptions s where s.user_id=p_user and ((s.status='active' and s.current_period_end>now()) or (s.status='trialing' and s.trial_ends_at>now())) ) then raise exception 'Já existe uma assinatura vigente. Gerencie a assinatura atual antes de contratar outra.';end if;
  if exists(select 1 from subscriptions where user_id=p_user and provider='stripe' and external_id is not null and coalesce(external_status,'') not in ('canceled','incomplete_expired') and status in ('active','trialing','past_due','blocked')) then raise exception 'Gerencie a assinatura Stripe existente antes de contratar outra.';end if;
  select price_cents,currency,billing_cycle_days into price,curr,cycle from plans where id=p_target and is_active and not is_deleted;
 else
  select price_cents,currency into price,curr from ebooks where id=p_target and is_published and not is_deleted and not is_free;
  if exists(select 1 from ebook_purchases where user_id=p_user and ebook_id=p_target and status in ('paid','partially_refunded')) then raise exception 'E-book já adquirido';end if;
 end if;
 if price is null or price<0 then raise exception 'Produto indisponível';end if;
 if p_provider='asaas' and curr<>'BRL' then raise exception 'PIX disponível somente em BRL';end if;
 if p_kind='plan' and p_provider='asaas' then
  insert into subscriptions(user_id,plan_id,status,provider,currency,unit_amount_cents,billing_cycle_days,current_period_start,current_period_end,source)
  values(p_user,p_target,'inactive',p_provider,curr,price,cycle,now(),now(), 'asaas_pix') returning id into sub_id;
 end if;
 insert into billing_checkout_operations(user_id,kind,target_id,provider,request_key,subscription_id,amount_cents,currency,billing_cycle_days)
 values(p_user,p_kind,p_target,p_provider,p_key,sub_id,price,curr,cycle) returning * into op;
 return to_jsonb(op);
end $$;
revoke all on function public.billing_reserve_checkout(uuid,text,uuid,payment_provider_t,text) from public,anon,authenticated;
grant execute on function public.billing_reserve_checkout(uuid,text,uuid,payment_provider_t,text) to service_role;

create function public.billing_apply_event(p_provider payment_provider_t,p_event_id text,p_event_type text,p_payload jsonb,p_subscription jsonb default null,p_payment jsonb default null,p_observed timestamptz default now())
returns jsonb language plpgsql security definer set search_path=public as $$
declare sub subscriptions; pay payments; op billing_checkout_operations; uid uuid; sid uuid; pid uuid; duplicate_ids uuid[]; aliases text[]; alias text; refund jsonb; eid uuid; refund_total int; status_next payment_status_t; observed timestamptz:=coalesce(p_observed,now());
begin
 perform pg_advisory_xact_lock(hashtextextended('billing:'||p_provider::text,0));
 if exists(select 1 from webhook_events where provider=p_provider and event_id=p_event_id and processed_at is not null and error_text is null) then return jsonb_build_object('duplicate',true);end if;
 uid:=coalesce(p_subscription->>'user_id',p_payment->>'user_id')::uuid;
 if uid is not null and not exists(select 1 from profiles where id=uid) then raise exception 'Billing owner unavailable';end if;
 if p_subscription is not null then
  if p_provider='stripe' and p_subscription->>'stripe_customer_id' is not null then
   if exists(select 1 from profiles where stripe_customer_id=p_subscription->>'stripe_customer_id' and id<>uid) then raise exception 'Customer owner mismatch';end if;
   update profiles set stripe_customer_id=p_subscription->>'stripe_customer_id' where id=uid and stripe_customer_id is null;
  end if;
  select * into sub from subscriptions where provider=p_provider and external_id=p_subscription->>'external_id' for update;
  if sub.id is not null and sub.user_id<>uid then raise exception 'Subscription owner mismatch';end if;
  if sub.id is null then
   insert into subscriptions(user_id,plan_id,status,provider,external_id,currency,unit_amount_cents,billing_cycle_days,current_period_start,current_period_end,source)
   values(uid,(p_subscription->>'plan_id')::uuid,'inactive',p_provider,p_subscription->>'external_id',(p_subscription->>'currency')::currency_t,(p_subscription->>'unit_amount_cents')::int,(p_subscription->>'billing_cycle_days')::int,(p_subscription->>'current_period_start')::timestamptz,(p_subscription->>'current_period_end')::timestamptz,'stripe') returning * into sub;
  end if;
  if sub.last_provider_sync_at is null or sub.last_provider_sync_at<=observed then
   update subscriptions set plan_id=(p_subscription->>'plan_id')::uuid,status=(p_subscription->>'status')::subscription_status_t,external_status=p_subscription->>'external_status',currency=(p_subscription->>'currency')::currency_t,
   unit_amount_cents=(p_subscription->>'unit_amount_cents')::int,billing_cycle_days=(p_subscription->>'billing_cycle_days')::int,
   current_period_start=(p_subscription->>'current_period_start')::timestamptz,current_period_end=(p_subscription->>'current_period_end')::timestamptz,trial_ends_at=(p_subscription->>'trial_ends_at')::timestamptz,
   cancel_at_period_end=coalesce((p_subscription->>'cancel_at_period_end')::boolean,false),canceled_at=(p_subscription->>'canceled_at')::timestamptz,ended_at=(p_subscription->>'ended_at')::timestamptz,
   last_paid_at=coalesce((p_subscription->>'last_paid_at')::timestamptz,last_paid_at),last_provider_sync_at=observed where id=sub.id returning * into sub;
  end if;
  sid:=sub.id;
  if sub.status in ('active','trialing') then
   update subscriptions set status='expired',ended_at=coalesce(ended_at,current_period_end) where user_id=uid and id<>sid and provider is distinct from 'stripe' and ((status='active' and current_period_end<=now()) or (status='trialing' and trial_ends_at<=now()));
  end if;
  if p_subscription->>'checkout_id' is not null then
   select * into op from billing_checkout_operations where id=(p_subscription->>'checkout_id')::uuid;
   if op.id is null or op.provider<>p_provider or op.user_id<>uid or op.kind<>'plan' or op.target_id<>sub.plan_id then raise exception 'Subscription checkout mismatch';end if;
   update billing_checkout_operations set subscription_id=sid,state=case when sub.status<>'inactive' then 'completed' else state end where id=op.id;
  end if;
 end if;
 if p_payment is not null then
  if p_payment->>'checkout_id' is not null then
   select * into op from billing_checkout_operations where id=(p_payment->>'checkout_id')::uuid;
   if op.id is null or op.user_id<>uid or op.provider<>p_provider then raise exception 'Checkout binding unavailable';end if;
   if (p_provider='asaas' and op.amount_cents<>(p_payment->>'amount_cents')::int) or op.currency::text<>p_payment->>'currency' then raise exception 'Checkout amount mismatch';end if;
   sid:=coalesce(sid,op.subscription_id);
  else sid:=coalesce(sid,(p_payment->>'subscription_id')::uuid);end if;
  if sid is not null and not exists(select 1 from subscriptions where id=sid and user_id=uid) then raise exception 'Payment subscription mismatch';end if;
  aliases:=array(select distinct value from jsonb_array_elements_text(coalesce(p_payment->'aliases','[]'::jsonb)))||array[p_payment->>'external_id'];
  if exists(select 1 from payments where provider=p_provider and external_id=any(aliases) and (user_id<>uid or currency::text<>p_payment->>'currency')) then raise exception 'Payment owner or currency mismatch';end if;
  if exists(select 1 from payment_aliases a join payments p on p.id=a.payment_id where a.provider=p_provider and a.external_id=any(aliases) and (p.user_id<>uid or p.currency::text<>p_payment->>'currency')) then raise exception 'Payment alias owner or currency mismatch';end if;
  select p.* into pay from payments p where p.provider=p_provider and not p.is_duplicate and (p.external_id=any(aliases) or p.id in(select a.payment_id from payment_aliases a where a.provider=p_provider and a.external_id=any(aliases))) order by (p.external_id=p_payment->>'external_id') desc,p.created_at,p.id limit 1 for update;
  if pay.id is null then
   insert into payments(user_id,subscription_id,provider,external_id,status,amount_cents,currency,fee_cents,method,description_pt,description_en)
   values(uid,sid,p_provider,p_payment->>'external_id','pending',(p_payment->>'amount_cents')::int,(p_payment->>'currency')::currency_t,coalesce((p_payment->>'fee_cents')::int,0),coalesce(p_payment->>'method','credit_card')::payment_method_t,coalesce(p_payment->>'description_pt','Pagamento'),coalesce(p_payment->>'description_en','Payment')) returning * into pay;
  end if;
  pid:=pay.id;
  if pay.user_id<>uid then raise exception 'Payment alias owner mismatch';end if;
  select array_agg(id) into duplicate_ids from payments where provider=p_provider and external_id=any(aliases) and id<>pid and not is_duplicate;
  if duplicate_ids is not null then
   update payments set is_duplicate=true,canonical_payment_id=pid where id=any(duplicate_ids);
   update payment_aliases set payment_id=pid where payment_id=any(duplicate_ids);
   update payment_refunds set payment_id=pid where payment_id=any(duplicate_ids);
  end if;
  foreach alias in array aliases loop
   if alias is not null and alias<>'' then insert into payment_aliases(provider,external_id,payment_id) values(p_provider,alias,pid) on conflict(provider,external_id) do update set payment_id=excluded.payment_id;end if;
  end loop;
  if pay.last_provider_sync_at is null or pay.last_provider_sync_at<=observed then
   for refund in select value from jsonb_array_elements(coalesce(p_payment->'refunds','[]'::jsonb)) loop
    if exists(select 1 from payment_refunds where provider=p_provider and external_id=refund->>'id' and payment_id<>pid) then raise exception 'Refund payment mismatch';end if;
    insert into payment_refunds(provider,external_id,payment_id,amount_cents,status,occurred_at)
    values(p_provider,refund->>'id',pid,(refund->>'amount_cents')::int,refund->>'status',(refund->>'occurred_at')::timestamptz)
    on conflict(provider,external_id) do update set amount_cents=excluded.amount_cents,status=excluded.status,occurred_at=excluded.occurred_at;
   end loop;
   select coalesce(sum(amount_cents),0)::int into refund_total from payment_refunds where payment_id=pid and status='succeeded';
   if refund_total>(p_payment->>'amount_cents')::int then raise exception 'Refund exceeds payment';end if;
   status_next:=(p_payment->>'status')::payment_status_t;
   if refund_total>0 then status_next:=case when refund_total=(p_payment->>'amount_cents')::int then 'refunded'::payment_status_t else 'partially_refunded'::payment_status_t end;end if;
   update payments set subscription_id=coalesce(sid,subscription_id),external_event_id=p_event_id,status=status_next,amount_cents=(p_payment->>'amount_cents')::int,
   fee_cents=coalesce((p_payment->>'fee_cents')::int,fee_cents),method=coalesce(p_payment->>'method',method::text)::payment_method_t,
   paid_at=coalesce(paid_at,(p_payment->>'paid_at')::timestamptz),failed_at=case when status_next='failed' then coalesce(failed_at,observed) else failed_at end,
   refunded_at=case when refund_total>0 then (select max(occurred_at) from payment_refunds where payment_id=pid and status='succeeded') else refunded_at end,
   refunded_amount_cents=refund_total,metadata=metadata||coalesce(p_payment->'metadata','{}'::jsonb),pix_qr_code=coalesce(p_payment->>'pix_qr_code',pix_qr_code),pix_copy_paste=coalesce(p_payment->>'pix_copy_paste',pix_copy_paste),pix_expires_at=coalesce((p_payment->>'pix_expires_at')::timestamptz,pix_expires_at),last_provider_sync_at=observed
   where id=pid returning * into pay;
   if p_provider='asaas' and sid is not null then
    select * into sub from subscriptions where id=sid for update;
    if pay.status in ('paid','partially_refunded') and sub.last_paid_at is null then
     if pay.paid_at is null then raise exception 'Missing paid timestamp';end if;
     update subscriptions set status='active',external_id=pay.external_id,external_status='paid',last_paid_at=pay.paid_at,current_period_start=pay.paid_at,current_period_end=pay.paid_at+(billing_cycle_days||' days')::interval,last_provider_sync_at=observed where id=sid;
    elsif pay.status='refunded' and sub.last_paid_at is not null then
     update subscriptions set status='canceled',ended_at=observed,canceled_at=observed,cancel_at_period_end=true,last_provider_sync_at=observed where id=sid;
    end if;
   end if;
   if coalesce((p_payment->>'disputed')::boolean,false) and sid is not null then update subscriptions set status='blocked',block_reason='payment_dispute' where id=sid;end if;
   eid:=coalesce(p_payment->>'ebook_id',op.target_id::text) ::uuid;
   if op.id is not null and op.kind='plan' then eid:=null;end if;
   if eid is not null then
    insert into ebook_purchases(user_id,ebook_id,provider,status,amount_cents,currency,external_id,external_event_id,paid_at,refunded_at)
    values(uid,eid,p_provider,pay.status,pay.amount_cents,pay.currency,pay.external_id,p_event_id,pay.paid_at,pay.refunded_at)
    on conflict(user_id,ebook_id) do update set status=case when ebook_purchases.status='paid' and excluded.status in ('pending','processing','failed','expired','canceled') and ebook_purchases.external_id<>excluded.external_id then ebook_purchases.status else excluded.status end,
    external_id=excluded.external_id,paid_at=coalesce(excluded.paid_at,ebook_purchases.paid_at),refunded_at=excluded.refunded_at
    where ebook_purchases.external_id=any(aliases) or ebook_purchases.status not in ('paid','partially_refunded') or excluded.status in ('paid','partially_refunded');
   end if;
   if op.id is not null then update billing_checkout_operations set subscription_id=coalesce(sid,subscription_id) where id=op.id;end if;
   if op.id is not null and pay.status in ('paid','partially_refunded','refunded') then update billing_checkout_operations set state='completed',remote_id=pay.external_id where id=op.id;end if;
  end if;
 end if;
 insert into webhook_events(provider,event_id,event_type,payload,signature_ok,processed_at,error_text)
 values(p_provider,p_event_id,p_event_type,p_payload,true,now(),null)
 on conflict(provider,event_id) do update set processed_at=excluded.processed_at,error_text=null,payload=excluded.payload;
 return jsonb_build_object('duplicate',false,'payment_id',pid,'subscription_id',sid);
end $$;
revoke all on function public.billing_apply_event(payment_provider_t,text,text,jsonb,jsonb,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.billing_apply_event(payment_provider_t,text,text,jsonb,jsonb,jsonb,timestamptz) to service_role;
create function public.billing_record_failure(p_provider payment_provider_t,p_event text,p_type text,p_payload jsonb,p_error text)
returns void language sql security definer set search_path=public as $$
 insert into webhook_events(provider,event_id,event_type,payload,signature_ok,error_text,processed_at)
 values(p_provider,p_event,p_type,p_payload,true,p_error,null)
 on conflict(provider,event_id) do update set error_text=excluded.error_text,processed_at=null where webhook_events.processed_at is null;
$$;
revoke all on function public.billing_record_failure(payment_provider_t,text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.billing_record_failure(payment_provider_t,text,text,jsonb,text) to service_role;
grant all on public.billing_checkout_operations,public.payment_aliases,public.payment_refunds to service_role;
commit;
