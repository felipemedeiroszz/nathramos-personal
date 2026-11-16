begin;
create table public.student_monthly_progress (
 user_id uuid not null references public.profiles(id) on delete cascade,
 month date not null check(extract(day from month)=1),
 weight_kg numeric(5,2) not null check(weight_kg between 20 and 500),
 photos jsonb not null check(jsonb_typeof(photos)='object'),
 version int not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 primary key(user_id,month)
);
create table public.monthly_progress_uploads (
 path text primary key, user_id uuid not null references public.profiles(id) on delete cascade,
 month date not null,angle text not null check(angle in ('front','back','left','right')),
 ready boolean not null default false,deleting boolean not null default false,created_at timestamptz not null default now()
);
create index monthly_progress_uploads_owner on public.monthly_progress_uploads(user_id,created_at);
create table public.monthly_progress_reminders(user_id uuid not null references public.profiles(id) on delete cascade,month date not null,primary key(user_id,month));
alter table public.student_monthly_progress enable row level security;
alter table public.monthly_progress_uploads enable row level security;
alter table public.monthly_progress_reminders enable row level security;
revoke all on public.student_monthly_progress,public.monthly_progress_uploads,public.monthly_progress_reminders from public,anon,authenticated;
grant all on public.student_monthly_progress,public.monthly_progress_uploads,public.monthly_progress_reminders to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('monthly-progress','monthly-progress',false,5242880,array['image/webp']);
create policy monthly_progress_private on storage.objects as restrictive for all to anon,authenticated using(bucket_id<>'monthly-progress') with check(bucket_id<>'monthly-progress');

create function public.monthly_progress_actor(p_actor uuid) returns date language plpgsql stable security definer set search_path=public as $$
declare zone text;access boolean;
begin
 select case when exists(select 1 from pg_timezone_names where name=p.timezone) then p.timezone else 'America/Sao_Paulo' end into zone
 from profiles p join auth.users u on u.id=p.id where p.id=p_actor and p.role='student' and not p.is_deleted and (u.banned_until is null or u.banned_until<=now());
 if zone is null then raise exception 'STUDENT_REQUIRED';end if;
 select allowed into access from can_access_platform(p_actor);
 if not coalesce(access,false) then raise exception 'ACCESS_DENIED';end if;
 return (now() at time zone zone)::date;
end $$;
create function public.monthly_progress_read(p_actor uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare today date:=monthly_progress_actor(p_actor);
begin
 return jsonb_build_object('today',today,'month',date_trunc('month',today)::date,'next_due',(date_trunc('month',today)+interval '1 month')::date,
 'records',(select coalesce(jsonb_agg(to_jsonb(p)-'user_id' order by month desc),'[]') from student_monthly_progress p where user_id=p_actor));
end $$;
create function public.monthly_progress_reserve(p_actor uuid,p_month date,p_angle text,p_path text) returns void language plpgsql security definer set search_path=public as $$
declare today date:=monthly_progress_actor(p_actor);
begin
 if p_month is null or p_month<>date_trunc('month',today)::date or p_angle not in ('front','back','left','right') or p_angle is null then raise exception 'INVALID_MONTH_OR_ANGLE';end if;
 if p_path is null or p_path!~('^'||p_actor::text||'/'||p_month::text||'/'||p_angle||'/[0-9a-f-]{36}\.webp$') then raise exception 'INVALID_PATH';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text||':monthly-uploads',0));
 if (select count(*) from monthly_progress_uploads where user_id=p_actor and created_at>now()-interval '1 hour')>=20 then raise exception 'UPLOAD_LIMIT';end if;
 insert into monthly_progress_uploads(path,user_id,month,angle) values(p_path,p_actor,p_month,p_angle);
end $$;
create function public.monthly_progress_save(p_actor uuid,p_month date,p_weight numeric,p_photos jsonb,p_version int) returns jsonb language plpgsql security definer set search_path=public as $$
declare today date:=monthly_progress_actor(p_actor);previous student_monthly_progress;v_angle text;v_photo text;
begin
 if p_month is null or p_month<>date_trunc('month',today)::date or p_weight is null or p_weight<20 or p_weight>500 or p_weight<>round(p_weight,2) then raise exception 'INVALID_MONTH_OR_WEIGHT';end if;
 if p_photos is null or jsonb_typeof(p_photos)<>'object' then raise exception 'FOUR_PHOTOS_REQUIRED';end if;
 if (select count(*) from jsonb_object_keys(p_photos))<>4 or not(p_photos ?& array['front','back','left','right']) then raise exception 'FOUR_PHOTOS_REQUIRED';end if;
 if (select count(distinct value) from jsonb_each_text(p_photos))<>4 then raise exception 'DISTINCT_PHOTOS_REQUIRED';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text||':monthly:'||p_month::text,0));
 select * into previous from student_monthly_progress where user_id=p_actor and month=p_month for update;
 if coalesce(previous.version,0)<>coalesce(p_version,-1) then raise exception 'VERSION_CONFLICT';end if;
 perform 1 from monthly_progress_uploads where path in(select value from jsonb_each_text(p_photos)) order by path for update;
 foreach v_angle in array array['front','back','left','right'] loop
  v_photo:=p_photos->>v_angle;
  if not exists(select 1 from monthly_progress_uploads u where u.path=v_photo and u.user_id=p_actor and u.month=p_month and u.angle=v_angle and u.ready and not u.deleting) then raise exception 'INVALID_PHOTO';end if;
 end loop;
 insert into student_monthly_progress(user_id,month,weight_kg,photos) values(p_actor,p_month,p_weight,p_photos)
 on conflict(user_id,month) do update set weight_kg=excluded.weight_kg,photos=excluded.photos,version=student_monthly_progress.version+1,updated_at=now();
 perform record_student_health(p_actor,today,p_weight,null);
 update notifications set read_at=coalesce(read_at,now()),scheduled_for=null where user_id=p_actor and payload->>'monthly_progress'=p_month::text;
 return monthly_progress_read(p_actor);
end $$;
create function public.monthly_progress_unused_uploads() returns setof public.monthly_progress_uploads language plpgsql security definer set search_path=public as $$
declare candidate record;
begin
 for candidate in select u.path from monthly_progress_uploads u where u.created_at<now()-interval '1 day' and not u.deleting
 and not exists(select 1 from student_monthly_progress p where p.user_id=u.user_id and p.photos @> jsonb_build_object(u.angle,u.path)) order by u.path limit 100 for update skip locked
 loop
  update monthly_progress_uploads u set deleting=true where path=candidate.path and not exists(select 1 from student_monthly_progress p where p.user_id=u.user_id and p.photos @> jsonb_build_object(u.angle,u.path));
 end loop;
 return query select * from monthly_progress_uploads where deleting limit 100;
end $$;
create function public.monthly_progress_remind(p_now timestamptz default now()) returns jsonb language plpgsql security definer set search_path=public as $$
declare student record;today date;period date;counted int:=0;inserted int;
begin
 for student in select p.id,p.language,case when exists(select 1 from pg_timezone_names where name=p.timezone) then p.timezone else 'America/Sao_Paulo' end zone
 from profiles p join auth.users u on u.id=p.id where p.role='student' and not p.is_deleted and (u.banned_until is null or u.banned_until<=p_now)
 and not exists(select 1 from monthly_progress_reminders r where r.user_id=p.id and r.month=date_trunc('month',p_now at time zone (case when exists(select 1 from pg_timezone_names where name=p.timezone) then p.timezone else 'America/Sao_Paulo' end))::date)
 and exists(select 1 from can_access_platform(p.id) where allowed)
 and extract(day from p_now at time zone (case when exists(select 1 from pg_timezone_names where name=p.timezone) then p.timezone else 'America/Sao_Paulo' end))=1
 and (p_now at time zone (case when exists(select 1 from pg_timezone_names where name=p.timezone) then p.timezone else 'America/Sao_Paulo' end))::time>=time '08:00'
 and not exists(select 1 from student_monthly_progress m where m.user_id=p.id and m.month=date_trunc('month',p_now at time zone (case when exists(select 1 from pg_timezone_names where name=p.timezone) then p.timezone else 'America/Sao_Paulo' end))::date)
 order by p.id limit 500
 loop
  today:=(p_now at time zone student.zone)::date;period:=date_trunc('month',today)::date;
  if extract(day from today)<>1 or (p_now at time zone student.zone)::time<time '08:00' then continue;end if;
  if not exists(select 1 from can_access_platform(student.id) where allowed) or exists(select 1 from student_monthly_progress where user_id=student.id and month=period) then continue;end if;
  insert into monthly_progress_reminders values(student.id,period) on conflict do nothing;get diagnostics inserted=row_count;
  if inserted=0 then continue;end if;
  insert into notifications(user_id,type,title,body,url,payload,scheduled_for)
  values(student.id,'system',case when student.language='en-US' then 'Your monthly progress' else 'Sua evolução do mês' end,
   case when student.language='en-US' then 'Record your weight and four photos to compare your progress month by month.' else 'Registre seu peso e as quatro fotos para comparar sua evolução mês a mês.' end,
   '/'||student.language::text||'/progresso',jsonb_build_object('monthly_progress',period),p_now);counted:=counted+1;
 end loop;
 return jsonb_build_object('created',counted,'failed',0);
end $$;
revoke all on function public.monthly_progress_actor(uuid),public.monthly_progress_read(uuid),public.monthly_progress_reserve(uuid,date,text,text),public.monthly_progress_save(uuid,date,numeric,jsonb,int),public.monthly_progress_unused_uploads(),public.monthly_progress_remind(timestamptz) from public,anon,authenticated;
grant execute on function public.monthly_progress_actor(uuid),public.monthly_progress_read(uuid),public.monthly_progress_reserve(uuid,date,text,text),public.monthly_progress_save(uuid,date,numeric,jsonb,int),public.monthly_progress_unused_uploads(),public.monthly_progress_remind(timestamptz) to service_role;
commit;
