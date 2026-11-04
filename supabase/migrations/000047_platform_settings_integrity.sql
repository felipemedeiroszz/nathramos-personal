begin;
create function public.admin_save_platform_settings(p_actor uuid,p_input jsonb,p_expected timestamptz)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
 keys text[]:=array['brand_name','brand_tagline','support_email','support_whatsapp','support_hours','maintenance_mode','maintenance_duration','maintenance_duration_unit','maintenance_until','signup_open','trial_days_default'];
 latest timestamptz; total int; field text; previous_mode boolean; previous_duration int; previous_unit text;
 previous_until timestamptz; deadline timestamptz; mode boolean; duration int; unit text; result jsonb;
begin
 if not exists(select 1 from profiles where id=p_actor and role='admin' and not is_deleted) then raise exception 'ADMIN_REQUIRED' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('platform_settings',0));
 select count(*),max(updated_at) into total,latest from platform_settings where key=any(keys);
 if total<>cardinality(keys) then raise exception 'SETTINGS_INCOMPLETE';end if;
 if p_expected is null or latest is distinct from p_expected then raise exception 'SETTINGS_CONFLICT';end if;
 if p_input is null or jsonb_typeof(p_input)<>'object' then raise exception 'INVALID_SETTINGS';end if;
 foreach field in array array['brand_name_pt','brand_name_en','brand_tagline_pt','brand_tagline_en','support_email','support_whatsapp','support_hours_pt','support_hours_en'] loop
   if jsonb_typeof(p_input->field) is distinct from 'string' then raise exception 'INVALID_SETTINGS';end if;
 end loop;
 if length(trim(p_input->>'brand_name_pt')) not between 1 and 120 or length(trim(p_input->>'brand_name_en')) not between 1 and 120
   or length(p_input->>'brand_tagline_pt')>200 or length(p_input->>'brand_tagline_en')>200
   or length(p_input->>'support_email')>160 or length(p_input->>'support_hours_pt')>160 or length(p_input->>'support_hours_en')>160
   or ((p_input->>'support_whatsapp')<>'' and (p_input->>'support_whatsapp')!~'^[1-9][0-9]{7,14}$') then raise exception 'INVALID_SETTINGS';end if;
 if jsonb_typeof(p_input->'maintenance_mode') is distinct from 'boolean' or jsonb_typeof(p_input->'signup_open') is distinct from 'boolean'
   or coalesce((p_input->>'trial_days_default')::int,0)<>0 then raise exception 'INVALID_SETTINGS';end if;
 mode:=(p_input->>'maintenance_mode')::boolean;
 duration:=(p_input->>'maintenance_duration')::int;
 unit:=p_input->>'maintenance_duration_unit';
 if duration is null or duration not between 1 and 8760 or unit is null or unit not in ('hours','days') then raise exception 'INVALID_SETTINGS';end if;
 select value_json='true'::jsonb into previous_mode from platform_settings where key='maintenance_mode';
 select value_num::int into previous_duration from platform_settings where key='maintenance_duration';
 select value_pt into previous_unit from platform_settings where key='maintenance_duration_unit';
 select nullif(value_pt,'')::timestamptz into previous_until from platform_settings where key='maintenance_until';
 if mode then
   -- Expiration alone never restarts the window when unrelated fields are saved.
   if not previous_mode or duration<>previous_duration or unit<>previous_unit or coalesce((p_input->>'restart_maintenance')::boolean,false) then
     deadline:=now()+duration*case unit when 'days' then interval '1 day' else interval '1 hour' end;
   else deadline:=previous_until;end if;
 end if;
 insert into platform_settings(key,value_pt,value_en,value_json,value_num,updated_by_id)
 values
 ('brand_name',trim(p_input->>'brand_name_pt'),trim(p_input->>'brand_name_en'),null,null,p_actor),
 ('brand_tagline',p_input->>'brand_tagline_pt',p_input->>'brand_tagline_en',null,null,p_actor),
 ('support_email',p_input->>'support_email',null,null,null,p_actor),
 ('support_whatsapp',p_input->>'support_whatsapp',null,null,null,p_actor),
 ('support_hours',p_input->>'support_hours_pt',p_input->>'support_hours_en',null,null,p_actor),
 ('maintenance_mode',null,null,to_jsonb(mode),null,p_actor),
 ('maintenance_duration',null,null,null,duration,p_actor),
 ('maintenance_duration_unit',unit,null,null,null,p_actor),
 ('maintenance_until',case when deadline is not null then to_char(deadline at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') end,null,null,null,p_actor),
 ('signup_open',null,null,p_input->'signup_open',null,p_actor),
 ('trial_days_default',null,null,null,0,p_actor)
 on conflict(key) do update set value_pt=excluded.value_pt,value_en=excluded.value_en,value_json=excluded.value_json,value_num=excluded.value_num,updated_by_id=p_actor;
 insert into audit_logs(actor_id,admin_id,action,entity_type,table_name,operation,details)
 values(p_actor,p_actor,'platform_settings.update','platform_settings','platform_settings','UPDATE',
   jsonb_build_object('keys',keys,'maintenance_mode',mode,'maintenance_until',deadline,'signup_open',p_input->'signup_open','restart_maintenance',coalesce(p_input->'restart_maintenance','false'::jsonb)));
 select jsonb_agg(jsonb_build_object('key',key,'value_pt',value_pt,'value_en',value_en,'value_json',value_json,'value_num',value_num,'updated_at',updated_at) order by key)
 into result from platform_settings where key=any(keys);
 return result;
end $$;
revoke all on function public.admin_save_platform_settings(uuid,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.admin_save_platform_settings(uuid,jsonb,timestamptz) to service_role;
commit;
