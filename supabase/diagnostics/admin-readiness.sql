-- Somente leitura. Execute no SQL Editor do MESMO projeto Supabase usado na Vercel.
-- Não cria tabelas, não altera permissões e não modifica registros.
with expected_columns(table_name,column_name,migration) as (values
 ('profiles','role','000001_esquema_completo.sql'),
 ('payments','is_duplicate','000041_payment_integrity.sql'),
 ('payments','refunded_amount_cents','000041_payment_integrity.sql'),
 ('payment_refunds','payment_id','000041_payment_integrity.sql'),
 ('payment_refunds','occurred_at','000041_payment_integrity.sql'),
 ('billing_checkout_operations','request_key','000041_payment_integrity.sql'),
 ('subscriptions','last_provider_sync_at','000041_payment_integrity.sql'),
 ('mentorship_rooms','coach_id','000030_coach_scope.sql'),
 ('admin_manual_operations','request','000045_manual_student_billing.sql'),
 ('site_live_updates','revision','000048_site_live_updates.sql'),
 ('student_day_prescriptions','payload','000050_daily_prescription.sql'),
 ('student_daily_rules','rule','000050_daily_prescription.sql'),
 ('exam_upload_intents','file_size','000051_student_content_security.sql')
), expected_functions(name,types,migration) as (values
 ('student_ebook_access','uuid, uuid','000051_student_content_security.sql'),
 ('finalize_exam_upload','uuid, uuid, jsonb','000051_student_content_security.sql'),
 ('store_student_day','uuid, date, jsonb','000050_daily_prescription.sql'),
 ('admin_data_page','uuid, text, jsonb, integer, integer','000042_financial_canonical_reporting.sql'),
 ('admin_student_directory','text, text, integer, integer, text, uuid','000030_coach_scope.sql'),
 ('admin_analytics_report','uuid, date, date, text, text, uuid, uuid, text, text, integer, integer','000042_financial_canonical_reporting.sql'),
 ('admin_work_queue','uuid','000031_admin_work_queue.sql'),
 ('billing_current_subscription','uuid','000041_payment_integrity.sql'),
 ('admin_record_student_manual','uuid, uuid, uuid, uuid, date, integer, text, text, date, text','000045_manual_student_billing.sql'),
 ('admin_save_platform_settings','uuid, jsonb, timestamp with time zone','000047_platform_settings_integrity.sql'),
 ('billing_apply_event','payment_provider_t, text, text, jsonb, jsonb, jsonb, timestamp with time zone','000041_payment_integrity.sql')
)
select 'column' as kind, e.table_name||'.'||e.column_name as resource,
 exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=e.table_name and c.column_name=e.column_name) as present,
 null::boolean as service_can_execute, e.migration
from expected_columns e
union all
select 'function','public.'||f.name||'('||f.types||')',p.oid is not null,
 case when p.oid is not null then has_function_privilege('service_role',p.oid,'EXECUTE') else false end,
 f.migration from expected_functions f left join (pg_proc p join pg_namespace n on n.oid=p.pronamespace and n.nspname='public') on p.proname=f.name and oidvectortypes(p.proargtypes)=f.types
union all
select 'policy', 'storage.objects.'||expected.name, exists (
 select 1 from pg_policies p where p.schemaname='storage'
 and p.tablename='objects' and p.policyname=expected.name
 and p.permissive='RESTRICTIVE'
), null::boolean, expected.migration
from (values
 ('exam_no_direct_delete','000052_exam_storage_delete_integrity.sql'),
 ('product_images_admin_insert','000053_product_image_admin_access.sql'),
 ('product_images_admin_update','000053_product_image_admin_access.sql'),
 ('product_images_admin_delete','000053_product_image_admin_access.sql')
) as expected(name,migration)
order by present,kind,resource;

-- Se os objetos existem mas a API não os reconhece, a documentação Supabase orienta:
-- NOTIFY pgrst, 'reload schema';
-- Execute isso separadamente somente após conferir o esquema e a aplicação das migrações.
