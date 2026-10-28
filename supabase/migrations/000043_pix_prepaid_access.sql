begin;
create or replace function public.can_access_platform(p_user_id uuid)
returns table (
  allowed boolean,
  status subscription_status_t,
  reason text
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_role       user_role_t;
  v_sub        public.subscriptions%rowtype;
  v_now        timestamptz := now();
  v_plan_grace int;
begin
  -- ADMIN e COACH sempre acessam (a menos que deleted)
  select p.role into v_role from public.profiles p where p.id = p_user_id and not p.is_deleted;

  if v_role is null then
    return query select false, 'inactive'::subscription_status_t, 'profile_not_found';
    return;
  end if;

  if v_role in ('admin','coach') then
    return query select true, 'active'::subscription_status_t, 'staff_' || lower(v_role::text);
    return;
  end if;

  -- Busca a assinatura do aluno (prioriza status mais permissivo)
  select s.* into v_sub
    from public.subscriptions s
    where s.user_id = p_user_id
    order by
      case s.status
        when 'active'    then 1
        when 'trialing'  then 2
        when 'past_due'  then 3
        when 'canceled'  then 4
        when 'expired'   then 5
        when 'blocked'   then 6
        else 7
      end, s.created_at desc, s.id desc
    limit 1;

  -- Nenhuma assinatura
  if v_sub.id is null then
    return query select false, 'inactive'::subscription_status_t, 'no_subscription';
    return;
  end if;

  select coalesce(p.grace_days, 3) into v_plan_grace
    from public.plans p where p.id = v_sub.plan_id;

  -- PIX avulso libera somente o período já pago, sem tolerância após vencer.
  if v_sub.provider='asaas' and (v_sub.source='asaas_pix' or v_sub.external_id like 'pay\_%' escape '\')
     and v_sub.current_period_end<=v_now then
    return query select false, 'blocked'::subscription_status_t, 'pix_period_expired_payment_required';
    return;
  end if;

  -- Trialing ativo
  if v_sub.status = 'trialing' and v_sub.trial_ends_at > v_now then
    return query select true, v_sub.status, 'trial_active_until_' || v_sub.trial_ends_at::date::text;
    return;
  end if;

  -- Trialing expirado -> inactive
  if v_sub.status = 'trialing' and v_sub.trial_ends_at <= v_now then
    return query select false, 'inactive'::subscription_status_t, 'trial_expired';
    return;
  end if;

  -- Active (dentro do período)
  if v_sub.status = 'active' and v_sub.current_period_end > v_now then
    return query select true, v_sub.status, 'active_until_' || v_sub.current_period_end::date::text;
    return;
  end if;

  -- Active expirou — cai em past_due + apply grace period
  if v_sub.status = 'active' and v_sub.current_period_end <= v_now then
    -- Tem grace permitido?
    if (v_sub.current_period_end + (v_plan_grace || ' days')::interval) > v_now then
      return query select true, 'past_due'::subscription_status_t,
        'grace_period_until_' || (v_sub.current_period_end + (v_plan_grace || ' days')::interval)::date::text;
    else
      return query select false, 'blocked'::subscription_status_t, 'grace_period_expired_blocked';
    end if;
    return;
  end if;

  -- Past due (já marcado no banco)
  if v_sub.status = 'past_due' then
    if (v_sub.current_period_end + (v_plan_grace || ' days')::interval) > v_now then
      return query select true, v_sub.status,
        'grace_period_until_' || (v_sub.current_period_end + (v_plan_grace || ' days')::interval)::date::text;
    else
      return query select false, 'blocked'::subscription_status_t, 'grace_period_expired_blocked';
    end if;
    return;
  end if;

  if v_sub.status = 'canceled' and v_sub.ended_at is not null and v_sub.ended_at <= v_now then
    return query select false, 'inactive'::subscription_status_t, 'canceled_ended';
    return;
  end if;

  -- Canceled (cancelado mas ainda no período?)
  if v_sub.status = 'canceled' then
    if v_sub.current_period_end > v_now then
      return query select true, v_sub.status, 'access_until_end_' || v_sub.current_period_end::date::text;
    else
      return query select false, 'inactive'::subscription_status_t, 'canceled_ended';
    end if;
    return;
  end if;

  -- Blocked, Expired, Inactive — bloqueia
  return query select false, v_sub.status, 'status_' || lower(v_sub.status::text);
end;
$$;


commit;
