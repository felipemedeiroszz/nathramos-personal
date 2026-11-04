begin;
-- Realtime carries revision signals only, never the source row or private record contents.
create table public.site_live_updates (
 scope text not null check(scope in ('public','members','staff','user')),
 audience_id uuid not null default '00000000-0000-0000-0000-000000000000',
 revision bigint not null default 0,
 updated_at timestamptz not null default now(),
 primary key(scope,audience_id),
 check ((scope='user')=(audience_id<>'00000000-0000-0000-0000-000000000000'::uuid))
);
alter table public.site_live_updates enable row level security;
revoke all on public.site_live_updates from public,anon,authenticated;
grant select on public.site_live_updates to anon,authenticated;
grant all on public.site_live_updates to service_role;
create policy site_live_public on public.site_live_updates for select to anon,authenticated using(scope='public');
create policy site_live_user on public.site_live_updates for select to authenticated using(scope='user' and audience_id=auth.uid());
create policy site_live_members on public.site_live_updates for select to authenticated using(scope='members' and exists(select 1 from profiles where id=auth.uid() and not is_deleted));
create policy site_live_staff on public.site_live_updates for select to authenticated using(scope='staff' and exists(select 1 from profiles where id=auth.uid() and role in ('admin','coach') and not is_deleted));
insert into public.site_live_updates(scope) values('public'),('members'),('staff');

create function public.site_touch_live_update(p_scope text,p_audience uuid default '00000000-0000-0000-0000-000000000000')
returns void language plpgsql security definer set search_path=public as $$
begin
 -- Concurrent writers can share a pulse; never wait on a global revision lock.
 -- The visible-page polling fallback also covers coalesced/aborted pulses.
 if not pg_try_advisory_xact_lock(hashtextextended('site-live:'||p_scope||':'||p_audience::text,0)) then return;end if;
 insert into site_live_updates(scope,audience_id,revision,updated_at) values(p_scope,p_audience,1,clock_timestamp())
 on conflict(scope,audience_id) do update set revision=site_live_updates.revision+1,updated_at=clock_timestamp();
end;
$$;
revoke all on function public.site_touch_live_update(text,uuid) from public,anon,authenticated;

create function public.site_signal_live_update() returns trigger
language plpgsql security definer set search_path=public as $$
declare row_data jsonb; rows_data jsonb[]; targets uuid[]:='{}'; field text; raw_id text; target uuid;
begin
 if TG_OP='UPDATE' and (to_jsonb(new)-'updated_at'-'revision')=(to_jsonb(old)-'updated_at'-'revision') then return new;end if;
 if TG_TABLE_NAME in ('platform_settings','plans','plan_benefits','content_pages','social_links') then
   perform site_touch_live_update('public');
 elsif TG_TABLE_NAME in ('diet_foods','diet_programs','diet_meals','diet_meal_items','diet_kits','diet_kit_items','supplements','supplement_kits','supplement_kit_items','ebooks','exam_categories','exercises','workout_programs','workout_days','workout_exercises','workout_categories','workout_kits','workout_kit_items','coupons','notification_templates') then
   perform site_touch_live_update('members');
 else
   if TG_OP='UPDATE' then rows_data:=array[to_jsonb(old),to_jsonb(new)];
   elsif TG_OP='DELETE' then rows_data:=array[to_jsonb(old)];else rows_data:=array[to_jsonb(new)];end if;
   foreach row_data in array rows_data loop
     foreach field in array array['user_id','student_id','owner_id','coach_id','created_by_id'] loop
       raw_id:=row_data->>field;
       if raw_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then targets:=array_append(targets,raw_id::uuid);end if;
     end loop;
     if TG_TABLE_NAME='profiles' then targets:=array_append(targets,(row_data->>'id')::uuid);end if;
     if TG_TABLE_NAME='chat_messages' then
       select user_id into target from mentorship_rooms where id=(row_data->>'room_id')::uuid;
       if target is not null then targets:=array_append(targets,target);end if;
     end if;
     if TG_TABLE_NAME in ('payment_refunds','payment_aliases') then
       select user_id into target from payments where id=(row_data->>'payment_id')::uuid;
       if target is not null then targets:=array_append(targets,target);end if;
     end if;
   end loop;
   for target in select distinct id from unnest(targets) id where id is not null and id<>'00000000-0000-0000-0000-000000000000'::uuid loop
     perform site_touch_live_update('user',target);
   end loop;
   if coalesce(cardinality(targets),0)=0 then perform site_touch_live_update('members');end if;
   perform site_touch_live_update('staff');
 end if;
 if TG_OP='DELETE' then return old;end if;
 return new;
end $$;
revoke all on function public.site_signal_live_update() from public,anon,authenticated;

do $$ declare item record; begin
 for item in select tablename from pg_tables where schemaname='public'
   and tablename not in ('site_live_updates','audit_logs','webhook_events','admin_manual_operations','prescription_revisions') loop
   execute format('create trigger site_live_update after insert or update or delete on public.%I for each row execute function public.site_signal_live_update()',item.tablename);
 end loop;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='site_live_updates') then
   alter publication supabase_realtime add table public.site_live_updates;
 end if;
end $$;
alter table public.site_live_updates replica identity full;
commit;
