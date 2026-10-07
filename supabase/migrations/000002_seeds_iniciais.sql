-- ============================================================================
-- Nath Ramos Personal Trainer — Migration 000002: Seeds Iniciais
-- Objetivo: popular planos, categorias exame, templates notificações,
--           configurações da plataforma.
-- IMPORTANTE antes de rodar: substitua abaixo o valor de ADMIN_EMAIL_SEED
-- pelo e-mail do admin real (você deve criar o usuário no painel Auth Users
-- do Supabase ANTES de rodar esta migration, OU rodar 2x: 1x cria plano,
-- 2x atualiza o e-mail).
-- ============================================================================

-- ========================== SEED: PLANOS ====================================
-- Plano 1: Essencial
insert into public.plans (
  id, order_index, is_active,
  name_pt, name_en,
  description_pt, description_en,
  slug, price_cents, currency, billing_cycle_days, trial_days, grace_days,
  max_active_workouts, max_exam_files_month,
  include_meal_plan, include_supplements, include_hydration, include_sleep,
  include_exams, include_ebooks, chat_support, video_meetings_month,
  custom_exercises, coach_direct_access, has_referral_reward, referral_discount_pct,
  highlight_hex, badge_pt, badge_en
) values (
  '00000000-0000-0000-0000-000000000001', 1, true,
  'Essencial', 'Essential',
  'Treinos personalizados, hidratação e sono. Ideal para começar.',
  'Personalized workouts, hydration and sleep tracking. Great start.',
  'essencial-mensal', 9700, 'BRL', 30, 7, 3,
  4, 0,
  false, false, true, true,
  false, true, true, 0,
  false, false, true, 10,
  null, null, null
) on conflict do nothing;

insert into public.plan_benefits (plan_id, text_pt, text_en, order_index, included)
select p.id,
       '4 treinos personalizados por semana',
       '4 personalized workouts per week',
       1, true
from public.plans p where p.slug = 'essencial-mensal'
union all
select p.id,
       'Acompanhamento de hidratação e sono',
       'Hydration and sleep tracking',
       2, true
from public.plans p where p.slug = 'essencial-mensal'
union all
select p.id,
       'Biblioteca de ebooks e guias',
       'Ebooks and guides library',
       3, true
from public.plans p where p.slug = 'essencial-mensal'
union all
select p.id,
       'Suporte via chat (até 24h)',
       'Chat support (up to 24h)',
       4, true
from public.plans p where p.slug = 'essencial-mensal'
on conflict do nothing;

-- Plano 2: Transformação (mais vendido / destaque)
insert into public.plans (
  id, order_index, is_active,
  name_pt, name_en,
  description_pt, description_en,
  slug, price_cents, currency, billing_cycle_days, trial_days, grace_days,
  max_active_workouts, max_exam_files_month,
  include_meal_plan, include_supplements, include_hydration, include_sleep,
  include_exams, include_ebooks, chat_support, video_meetings_month,
  custom_exercises, coach_direct_access, has_referral_reward, referral_discount_pct,
  highlight_hex, badge_pt, badge_en
) values (
  '00000000-0000-0000-0000-000000000002', 2, true,
  'Transformação', 'Transformation',
  'Treinos + dieta + suplementação. Mais completo para mudança de hábito.',
  'Workouts + meal plan + supplements. Complete habit change.',
  'transformacao-mensal', 19700, 'BRL', 30, 7, 3,
  6, 2,
  true, true, true, true,
  false, true, true, 1,
  true, false, true, 15,
  'f5c518', 'Mais escolhido', 'Best seller'
) on conflict do nothing;

insert into public.plan_benefits (plan_id, text_pt, text_en, order_index, included)
select p.id, 'Até 6 treinos personalizados ativos', 'Up to 6 active custom workouts', 1, true
from public.plans p where p.slug = 'transformacao-mensal'
union all
select p.id, 'Plano alimentar com lista de compras', 'Meal plan with shopping list', 2, true
from public.plans p where p.slug = 'transformacao-mensal'
union all
select p.id, 'Suplementação guiada + lembretes', 'Guided supplementation + reminders', 3, true
from public.plans p where p.slug = 'transformacao-mensal'
union all
select p.id, '1 consultoria por vídeo por mês', '1 video consultation per month', 4, true
from public.plans p where p.slug = 'transformacao-mensal'
union all
select p.id, 'Exercícios customizados (seu equipamento)', 'Custom exercises (your equipment)', 5, true
from public.plans p where p.slug = 'transformacao-mensal'
union all
select p.id, 'Envio de 2 laudos de exames por mês', 'Upload 2 exam files per month', 6, true
from public.plans p where p.slug = 'transformacao-mensal'
on conflict do nothing;

-- Plano 3: Elite
insert into public.plans (
  id, order_index, is_active,
  name_pt, name_en,
  description_pt, description_en,
  slug, price_cents, currency, billing_cycle_days, trial_days, grace_days,
  max_active_workouts, max_exam_files_month,
  include_meal_plan, include_supplements, include_hydration, include_sleep,
  include_exams, include_ebooks, chat_support, video_meetings_month,
  custom_exercises, coach_direct_access, has_referral_reward, referral_discount_pct,
  highlight_hex, badge_pt, badge_en
) values (
  '00000000-0000-0000-0000-000000000003', 3, true,
  'Elite', 'Elite',
  '1:1 com Nath. Acompanhamento premium com reuniões semanais e suporte WhatsApp.',
  '1:1 with Nath. Premium weekly meetings + WhatsApp support.',
  'elite-mensal', 49700, 'BRL', 30, 0, 3,
  6, 5,
  true, true, true, true,
  true, true, true, 4,
  true, true, true, 20,
  null, 'Premium', 'Premium'
) on conflict do nothing;

insert into public.plan_benefits (plan_id, text_pt, text_en, order_index, included)
select p.id, 'Acesso direto com Nath no WhatsApp', 'Direct access to Nath on WhatsApp', 1, true
from public.plans p where p.slug = 'elite-mensal'
union all
select p.id, '4 reuniões 1:1 por mês', '4 1:1 meetings per month', 2, true
from public.plans p where p.slug = 'elite-mensal'
union all
select p.id, 'Envio ilimitado de exames e análise', 'Unlimited exam upload & review', 3, true
from public.plans p where p.slug = 'elite-mensal'
union all
select p.id, 'Plano alimentar atualizado semanal', 'Weekly updated meal plan', 4, true
from public.plans p where p.slug = 'elite-mensal'
union all
select p.id, 'Suporte prioritário < 2h útil', 'Priority support < 2 business hours', 5, true
from public.plans p where p.slug = 'elite-mensal'
on conflict do nothing;

-- ========================== SEED: CATEGORIAS EXAME ==========================
insert into public.exam_categories (id, name_pt, name_en, order_index) values
  ('10000000-0000-0000-0000-000000000001', 'Sangue (Rotina)',       'Blood (Routine)',       1),
  ('10000000-0000-0000-0000-000000000002', 'Hormonal',              'Hormonal',              2),
  ('10000000-0000-0000-0000-000000000003', 'Cardiológico',          'Cardiology',            3),
  ('10000000-0000-0000-0000-000000000004', 'Imagem (Raio-X, RM)',   'Imaging (X-ray, MRI)',  4),
  ('10000000-0000-0000-0000-000000000005', 'Avaliação Física',      'Fitness Assessment',    5),
  ('10000000-0000-0000-0000-000000000006', 'Outros',                'Other',                 6)
on conflict do nothing;

-- ========================== SEED: TEMPLATES NOTIFICAÇÕES ====================
insert into public.notification_templates (
  id, slug, type,
  title_pt, title_en, body_pt, body_en,
  default_url, click_action, tag, icon_path
) values
  (
    '20000000-0000-0000-0000-000000000001',
    'welcome',
    'system',
    'Bem-vindo(a), Nath Ramos PT',
    'Welcome to Nath Ramos PT',
    'Seu cadastro foi confirmado. Vamos começar sua transformação.',
    'Your account is confirmed. Let us start your transformation.',
    '/dashboard', null, 'welcome', null
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'workout_reminder',
    'workout',
    'Hora do treino! 💪',
    'Workout time!',
    'Seu treino de hoje está aguardando você. Não pule!',
    'Your workout for today is ready. Do not skip it!',
    '/treino', null, 'workout_daily', null
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    'payment_paid',
    'payment',
    'Pagamento confirmado',
    'Payment confirmed',
    'Seu pagamento foi aprovado. Aproveite todos os benefícios!',
    'Your payment has been approved. Enjoy all benefits!',
    '/assinatura', null, 'payment_paid', null
  ),
  (
    '20000000-0000-0000-0000-000000000004',
    'payment_failed',
    'payment',
    'Pagamento não aprovado',
    'Payment declined',
    'Seu pagamento falhou. Atualize o método de pagamento em até 3 dias.',
    'Your payment failed. Update your payment method within 3 days.',
    '/assinatura/pagamento', null, 'payment_failed', null
  ),
  (
    '20000000-0000-0000-0000-000000000005',
    'subscription_blocked',
    'payment',
    'Assinatura bloqueada',
    'Subscription blocked',
    'Prazo de tolerância expirou. Atualize o pagamento para recuperar o acesso.',
    'Grace period expired. Update your payment to recover access.',
    '/assinatura/pagamento', null, 'subscription_blocked', null
  ),
  (
    '20000000-0000-0000-0000-000000000006',
    'hydration_reminder',
    'hydration',
    'Beba água',
    'Drink water',
    'Mantenha-se hidratado. Já bateu sua meta de hoje?',
    'Stay hydrated. Have you hit today goal?',
    '/agua', null, 'hydration', null
  ),
  (
    '20000000-0000-0000-0000-000000000007',
    'sleep_reminder',
    'sleep',
    'Hora de dormir',
    'Bedtime reminder',
    'Recuperação = resultado. Vá descansar.',
    'Recovery = results. Go get some rest.',
    '/sono', null, 'sleep', null
  ),
  (
    '20000000-0000-0000-0000-000000000008',
    'meal_reminder',
    'diet',
    'Próxima refeição',
    'Next meal',
    'Não pule a refeição. Consistência é tudo.',
    'Do not skip this meal. Consistency is everything.',
    '/dieta', null, 'meal', null
  ),
  (
    '20000000-0000-0000-0000-000000000009',
    'supplement_reminder',
    'supplement',
    'Suplemento programado',
    'Scheduled supplement',
    'Hora de tomar o seu suplemento.',
    'Time to take your supplement.',
    '/suplementos', null, 'supplement', null
  ),
  (
    '20000000-0000-0000-0000-000000000010',
    'chat_new_message',
    'chat',
    'Nova mensagem',
    'New message',
    'Você recebeu uma nova mensagem da sua mentoria.',
    'You have a new message from your mentorship.',
    '/mentoria', null, 'chat', null
  ),
  (
    '20000000-0000-0000-0000-000000000011',
    'meeting_reminder',
    'meeting',
    'Reunião em breve',
    'Meeting coming up',
    'Sua reunião com Nath começa em 15 minutos.',
    'Your meeting with Nath starts in 15 minutes.',
    '/mentoria/reunioes', null, 'meeting', null
  )
on conflict (slug) do nothing;

-- ========================== SEED: CONFIGURAÇÕES PLATAFORMA ==================
insert into public.platform_settings (key, value_pt, value_en, value_num) values
  ('ref_terms_pt',
   'Indique 1 amigo e ganhe desconto. Ele ganha 15% OFF e você ganha um mês grátis após o primeiro pagamento confirmado dele.',
   'Refer 1 friend and earn a discount. They get 15% OFF and you get 1 month free after their first confirmed payment.',
   null),
  ('platform_email_from', 'naoresponda@nathramos.com.br', 'no-reply@nathramos.com.br', null),
  ('platform_phone_whatsapp', '+55 (00) 00000-0000', '+55 (00) 00000-0000', null),
  ('default_hydration_ml_per_kg', null, null, 35),
  ('exams_enabled', 'Sim', 'Yes', null),
  ('ebooks_enabled', 'Sim', 'Yes', null),
  ('referrals_enabled', 'Sim', 'Yes', null)
on conflict (key) do nothing;

-- ========================== SEED: ADMIN PLACEHOLDER (Opcional) ==============
-- Cria profile.role = 'admin' PARA O E-MAIL ABAIXO (caso já exista em auth.users).
-- Substitua o e-mail abaixo pelo SEU e-mail de admin ANTES de rodar.
do $$
declare
  v_admin_email text := 'admin@admin.com';
  v_admin_uuid uuid;
  v_admin_name text := 'Administrador';
begin
  select au.id into v_admin_uuid
  from auth.users au where au.email = lower(v_admin_email) and not exists (
    select 1 from public.profiles p where p.id = au.id and p.role = 'admin'
  );

  if v_admin_uuid is not null then
    insert into public.profiles (id, role, full_name, display_name, email_notifs_enabled, push_enabled, has_accepted_terms, accepted_terms_at, signup_completed_at, onboarding_step)
    values (v_admin_uuid, 'admin', v_admin_name, v_admin_name, true, true, true, now(), now(), 999)
    on conflict (id) do update set role = 'admin';
  end if;
end $$;
