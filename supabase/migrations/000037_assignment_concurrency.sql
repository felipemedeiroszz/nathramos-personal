begin;
create function public.admin_assignment_fingerprint(p_actor uuid,p_kind text,p_scope text,p_id uuid)
returns text language plpgsql stable security definer set search_path=public as $$
declare target text; key text; result text;
begin
 if not exists(select 1 from profiles where id=p_actor and role in ('admin','coach') and not is_deleted) or p_kind not in ('diet','supplement') or p_scope not in ('student','kit') then raise exception 'Acesso negado';end if;
 target:=case p_kind when 'diet' then 'student_diet_kits' else 'student_supplement_kits' end;
 key:=case p_scope when 'student' then 'student_id' else 'kit_id' end;
 execute format('select md5(coalesce(jsonb_agg(to_jsonb(a) order by a.id)::text,''[]'')) from public.%I a where a.%I=$1 and a.status=''active'' and can_manage_student(a.student_id,$2)',target,key) into result using p_id,p_actor;
 return result;
end $$;
revoke all on function public.admin_assignment_fingerprint(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.admin_assignment_fingerprint(uuid,text,text,uuid) to service_role;
create function public.admin_sync_content_assignments(p_kind text,p_scope text,p_id uuid,p_ids uuid[],p_start date,p_end date,p_notes text,p_actor uuid,p_expected text)
returns void language plpgsql security definer set search_path=public as $$
declare target text;begin
 target:=case p_kind when 'diet' then 'student_diet_kits' else 'student_supplement_kits' end;
 perform pg_advisory_xact_lock(hashtextextended(target,0));
 if p_expected is null or p_expected<>admin_assignment_fingerprint(p_actor,p_kind,p_scope,p_id) then raise exception 'Atribuições alteradas por outro profissional. Recarregue antes de salvar.';end if;
 perform set_config('app.prescription_actor',p_actor::text,true);
 perform admin_sync_content_assignments(p_kind,p_scope,p_id,p_ids,p_start,p_end,p_notes,p_actor);
end $$;
revoke all on function public.admin_sync_content_assignments(text,text,uuid,uuid[],date,date,text,uuid,text) from public,anon,authenticated;
grant execute on function public.admin_sync_content_assignments(text,text,uuid,uuid[],date,date,text,uuid,text) to service_role;

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
revoke all on function public.admin_data_page(uuid,text,jsonb,int,int) from public,anon,authenticated;
grant execute on function public.admin_data_page(uuid,text,jsonb,int,int) to service_role;

commit;
