begin;
-- Keep entitlement decisions in the database and out of catalog payloads.
create function public.student_ebook_access(p_ebook uuid,p_user uuid) returns boolean
language plpgsql stable security definer set search_path=public as $$
declare book ebooks; allowed boolean; chosen_plan uuid; chosen_order int; minimum_order int;
begin
 select * into book from ebooks where id=p_ebook and is_published and not is_deleted and (publish_at is null or publish_at<=now());
 if not found or p_user is null then return false;end if;
 select a.allowed into allowed from can_access_platform(p_user) a;
 if not coalesce(allowed,false) then return false;end if;
 if exists(select 1 from profiles where id=p_user and not is_deleted and role in ('admin','coach')) or book.is_free then return true;end if;
 if exists(select 1 from ebook_purchases where ebook_id=p_ebook and user_id=p_user and status in ('paid','partially_refunded')) then return true;end if;
 if book.min_plan_id is null then return false;end if;
 -- Match the subscription selected by can_access_platform, not an expired higher plan.
 select plan_id into chosen_plan from subscriptions where user_id=p_user
 order by case status when 'active' then 1 when 'trialing' then 2 when 'past_due' then 3 when 'canceled' then 4 when 'expired' then 5 when 'blocked' then 6 else 7 end,created_at desc,id desc limit 1;
 select order_index into chosen_order from plans where id=chosen_plan and not is_deleted;
 select order_index into minimum_order from plans where id=book.min_plan_id and not is_deleted;
 return coalesce(chosen_order>=minimum_order,false);
end $$;
revoke all on function public.student_ebook_access(uuid,uuid) from public,anon,authenticated;
grant execute on function public.student_ebook_access(uuid,uuid) to service_role;
create function public.my_ebook_access(p_ebook uuid) returns boolean language sql stable security definer set search_path=public as $$ select public.student_ebook_access(p_ebook,auth.uid()) $$;
revoke all on function public.my_ebook_access(uuid) from public;
grant execute on function public.my_ebook_access(uuid) to anon,authenticated,service_role;
drop policy if exists ebooks_read on public.ebooks;
create policy ebooks_read on public.ebooks for select using(public.is_admin() or public.my_ebook_access(id));

create table public.exam_upload_intents(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references profiles(id),
 object_path text not null unique, file_name text not null, file_size int not null check(file_size between 1 and 20971520),
 mime_type text not null check(mime_type in ('application/pdf','image/png','image/jpeg','image/webp')),
 created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '30 minutes',
 exam_id uuid unique references exams(id)
);
alter table public.exam_upload_intents enable row level security;
revoke all on public.exam_upload_intents from public,anon,authenticated;
grant all on public.exam_upload_intents to service_role;
create index on public.exam_upload_intents(user_id,created_at);
-- Direct uploads use short-lived signed URLs; users cannot bypass the intent flow.
create policy exam_signed_upload_only on storage.objects as restrictive for insert to authenticated with check(bucket_id<>'exam-files');
create policy exam_no_direct_update on storage.objects as restrictive for update to authenticated using(bucket_id<>'exam-files') with check(bucket_id<>'exam-files');
update storage.buckets set public=false,file_size_limit=20971520,allowed_mime_types=array['application/pdf','image/png','image/jpeg','image/webp'] where id='exam-files';
-- Finalization is idempotent and locks the intent; all metadata is server-verified.
create function public.finalize_exam_upload(p_user uuid,p_intent uuid,p_metadata jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare intent exam_upload_intents; result uuid;
begin
 select * into intent from exam_upload_intents where id=p_intent and user_id=p_user for update;
 if not found then raise exception 'Upload indisponível';end if;
 if intent.exam_id is not null then return intent.exam_id;end if;
 if intent.expires_at<now() then raise exception 'Upload expirado';end if;
 insert into exams(user_id,title,exam_date,category_id,lab_name,description,file_bucket_path,file_name,file_size_bytes,file_mime_type,results_summary)
 values(p_user,p_metadata->>'title',(p_metadata->>'exam_date')::date,nullif(p_metadata->>'category_id','')::uuid,p_metadata->>'lab_name',p_metadata->>'description',intent.object_path,intent.file_name,intent.file_size,intent.mime_type,'{}') returning id into result;
 update exam_upload_intents set exam_id=result where id=p_intent;
 return result;
end $$;
revoke all on function public.finalize_exam_upload(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.finalize_exam_upload(uuid,uuid,jsonb) to service_role;
commit;
