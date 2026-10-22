-- ============================================================================
-- 000020 - PLANO ÚNICO (acesso a tudo)
-- ----------------------------------------------------------------------------
-- Consolida o catálogo em um único plano geral com acesso a todos os recursos:
--   1) Arquiva (soft delete) os planos extras que NÃO possuem assinaturas,
--      mantendo apenas um plano principal.
--   2) Garante que o plano principal tenha todos os recursos habilitados.
-- Idempotente: pode ser executada múltiplas vezes sem efeitos colaterais.
-- ============================================================================

-- 1) Arquiva planos extras (sem assinaturas vinculadas), mantendo o principal
with ranked as (
  select
    id,
    row_number() over (
      order by is_active desc, order_index asc, created_at asc
    ) as rn
  from public.plans
  where is_deleted = false
),
keep as (
  select id from ranked where rn = 1
)
update public.plans p
set is_deleted = true,
    is_active = false,
    deleted_at = now()
where p.is_deleted = false
  and p.id not in (select id from keep)
  and not exists (
    select 1 from public.subscriptions s where s.plan_id = p.id
  );

-- 2) Habilita acesso total no plano principal
update public.plans
set include_meal_plan    = true,
    include_supplements  = true,
    include_hydration    = true,
    include_sleep        = true,
    include_exams        = true,
    include_ebooks       = true,
    chat_support         = true,
    custom_exercises     = true,
    coach_direct_access  = true,
    has_referral_reward  = true,
    max_active_workouts  = greatest(max_active_workouts, 9999),
    max_exam_files_month = greatest(max_exam_files_month, 9999),
    video_meetings_month = greatest(video_meetings_month, 9999)
where is_deleted = false;
