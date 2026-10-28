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
 ('mentorship_rooms','coach_id','000030_coach_scope.sql')
), expected_functions(name,types,migration) as (values
 ('admin_data_page','uuid, text, jsonb, integer, integer','000042_financial_canonical_reporting.sql'),
 ('admin_student_directory','text, text, integer, integer, text, uuid','000030_coach_scope.sql'),
 ('admin_analytics_report','uuid, date, date, text, text, uuid, uuid, text, text, integer, integer','000042_financial_canonical_reporting.sql'),
 ('admin_work_queue','uuid','000031_admin_work_queue.sql'),
 ('billing_current_subscription','uuid','000041_payment_integrity.sql'),
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
order by present,kind,resource;

-- Se os objetos existem mas a API não os reconhece, a documentação Supabase orienta:
-- NOTIFY pgrst, 'reload schema';
-- Execute isso separadamente somente após conferir o esquema e a aplicação das migrações.
