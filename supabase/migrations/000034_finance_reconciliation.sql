begin;
create function public.admin_finance_checks(p_actor uuid,p_currency text,p_from date,p_to date) returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not exists(select 1 from profiles where id=p_actor and role='admin' and not is_deleted) then raise exception 'Administrador obrigatório';end if;
 if p_currency not in ('BRL','USD') or p_to<p_from then raise exception 'Período ou moeda inválidos';end if;
 return jsonb_build_object(
 'paid_cents',(select coalesce(sum(amount_cents),0) from payments where currency::text=p_currency and status='paid' and paid_at>=p_from::timestamp at time zone 'America/Sao_Paulo' and paid_at<(p_to+1)::timestamp at time zone 'America/Sao_Paulo'),
 'failed_webhooks',(select count(*) from webhook_events where error_text is not null and created_at>=p_from::timestamp at time zone 'America/Sao_Paulo' and created_at<(p_to+1)::timestamp at time zone 'America/Sao_Paulo'),
 'pending_webhooks',(select count(*) from webhook_events where processed_at is null and created_at<now()-interval '5 minutes' and created_at>=p_from::timestamp at time zone 'America/Sao_Paulo' and created_at<(p_to+1)::timestamp at time zone 'America/Sao_Paulo'),
 'expired_active',(select count(*) from subscriptions where currency::text=p_currency and status='active' and current_period_end<now()),
 'missing_external_ids',(select count(*) from subscriptions where currency::text=p_currency and provider is not null and external_id is null),
 'paid_without_active_subscription',(select count(*) from payments pay where pay.currency::text=p_currency and pay.status='paid' and pay.subscription_id is not null and pay.paid_at>=p_from::timestamp at time zone 'America/Sao_Paulo' and pay.paid_at<(p_to+1)::timestamp at time zone 'America/Sao_Paulo' and not exists(select 1 from subscriptions s where s.id=pay.subscription_id and s.status in ('active','trialing')))
 );
end $$;
revoke all on function public.admin_finance_checks(uuid,text,date,date) from public,anon,authenticated;
grant execute on function public.admin_finance_checks(uuid,text,date,date) to service_role;
commit;
