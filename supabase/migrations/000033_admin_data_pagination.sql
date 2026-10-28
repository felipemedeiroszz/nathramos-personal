begin;
create function public.admin_data_page(p_actor uuid,p_kind text,p_filters jsonb default '{}'::jsonb,p_page int default 1,p_size int default 30)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare source text; result jsonb; total int; size int:=greatest(1,least(p_size,100)); page int; sql text; snapshot timestamptz:=coalesce((p_filters->>'_snapshot')::timestamptz,now());
begin
 if not exists(select 1 from profiles where id=p_actor and role='admin' and not is_deleted) then raise exception 'Administrador obrigatório';end if;
 if p_kind not in ('payments','subscriptions','diet_foods','supplements','ebooks') then raise exception 'Catálogo inválido';end if;
 source:=format('select to_jsonb(t) as row from public.%I t',p_kind);
 if p_kind in ('payments','subscriptions') then
 source:=format('select to_jsonb(t)||jsonb_build_object(''student_name'',p.full_name%s) as row from public.%I t left join profiles p on p.id=t.user_id %s',case when p_kind='subscriptions' then ',''plan_name'',pl.name_pt' else '' end,p_kind,case when p_kind='subscriptions' then 'left join plans pl on pl.id=t.plan_id' else '' end);
 end if;
 sql:='with source as ('||source||'), filtered as (select row from source where (row->>''created_at'')::timestamptz<=($1->>''_snapshot'')::timestamptz and coalesce(row->>''is_deleted'',''false'')<>''true'' and ($1->>''q'' is null or position(lower($1->>''q'') in lower(concat_ws('' '',row->>''name_pt'',row->>''name_en'',row->>''title_pt'',row->>''title_en'',row->>''student_name'',row->>''description_pt'',row->>''external_id'')))>0) and not exists(select 1 from jsonb_each_text($1) f where f.key in (''status'',''provider'',''currency'',''category'',''category_id'',''language'',''is_active'',''is_published'',''is_free'') and row->>f.key is distinct from f.value) and ($1->>''from'' is null or (row->>''created_at'')::timestamptz>=($1->>''from'')::date::timestamp at time zone ''America/Sao_Paulo'') and ($1->>''to'' is null or (row->>''created_at'')::timestamptz<(($1->>''to'')::date+1)::timestamp at time zone ''America/Sao_Paulo''))';
 execute sql||' select count(*)::int from filtered' into total using p_filters||jsonb_build_object('_snapshot',snapshot);
 page:=greatest(1,least(coalesce(p_page,1),greatest(1,(total+size-1)/size)));
 execute sql||' select coalesce(jsonb_agg(row),''[]''::jsonb) from (select row from filtered order by row->>''created_at'' desc,row->>''id'' limit $2 offset $3) r' into result using p_filters||jsonb_build_object('_snapshot',snapshot),size,(page-1)*size;
 return jsonb_build_object('rows',result,'total',total,'page',page,'size',size,'snapshot',snapshot);
end $$;
revoke all on function public.admin_data_page(uuid,text,jsonb,int,int) from public,anon,authenticated;
grant execute on function public.admin_data_page(uuid,text,jsonb,int,int) to service_role;
commit;
