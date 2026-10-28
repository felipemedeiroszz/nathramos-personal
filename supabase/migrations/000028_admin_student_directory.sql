begin;
-- Immediate cancellations must end access, even when the original paid period ends later.
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


create or replace function public.admin_student_directory(p_search text default '',p_status text default '',p_limit int default 20,p_offset int default 0,p_locale text default 'pt-BR')
returns jsonb language sql stable security definer set search_path=public as $$
 with directory as (
   select p.id,p.full_name,coalesce(nullif(trim(p.email),''),u.email) as email,p.phone,p.country,p.avatar_url,p.role,p.created_at,p.is_deleted,
   case when s.id is null then null else jsonb_build_object('id',s.id,'status',case when s.status in ('active','trialing','past_due') then access.status else s.status end,'stored_status',s.status,'allowed',access.allowed,'plan_id',s.plan_id,'plan_name',case when p_locale='en-US' then pl.name_en else pl.name_pt end,'current_period_end',s.current_period_end,'provider',s.provider) end as subscription
   from public.profiles p left join auth.users u on u.id=p.id
   left join lateral(select sub.* from public.subscriptions sub where sub.user_id=p.id order by
     case sub.status when 'active' then 1 when 'trialing' then 2 when 'past_due' then 3 when 'canceled' then 4 when 'expired' then 5 when 'blocked' then 6 else 7 end,
     sub.created_at desc,sub.id desc limit 1) s on true
   left join public.plans pl on pl.id=s.plan_id
   left join lateral public.can_access_platform(p.id) access on true
   where p.role='student' and not p.is_deleted
     and (coalesce(trim(p_search),'')='' or position(lower(trim(p_search)) in lower(p.full_name||' '||coalesce(nullif(trim(p.email),''),u.email,'')))>0)
 ), filtered as (
   select * from directory where coalesce(p_status,'')='' or (p_status='no_subscription' and subscription is null)
    or (p_status='active' and subscription->>'status' in ('active','trialing'))
    or (p_status<>'active' and subscription->>'status'=p_status)
 ), bounds as (
   select count(*)::int as total,greatest(1,least(coalesce(p_limit,20),100)) as page_size from filtered
 ), paging as (
   select *,greatest(0,least(coalesce(p_offset,0),((greatest(total,1)-1)/page_size)*page_size)) as row_offset from bounds
 ), page_rows as (
   select * from filtered order by created_at desc,id desc limit(select page_size from paging) offset(select row_offset from paging)
 )
 select jsonb_build_object('students',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc,r.id desc) from page_rows r),'[]'::jsonb), 'total',total,'page',row_offset/page_size+1) from paging;
$$;
revoke all on function public.admin_student_directory(text,text,int,int,text) from public,anon,authenticated;
grant execute on function public.admin_student_directory(text,text,int,int,text) to service_role;
commit;
