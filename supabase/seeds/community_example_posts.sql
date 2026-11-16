-- Posts fictícios para demonstrar o feed.
-- Execute no SQL Editor do Supabase após aplicar 000055_community.sql.
-- Pode ser executado novamente: os mesmos exemplos não serão duplicados.
-- Não altera perfis, permissões, assinaturas nem envia notificações.
begin;

do $$
begin
  if (
    select count(*) from public.profiles
    where id in (
      '7d544fc3-5ecf-44be-b2ce-41a0a560685c'::uuid,
      '87855b7b-fd58-446a-98fe-93f4c4437e2e'::uuid
    ) and not is_deleted
  ) <> 2 then
    raise exception 'Os dois usuários precisam existir em public.profiles e estar ativos antes de inserir os exemplos.';
  end if;
end $$;

insert into public.community_posts
  (id, author_id, body, request_id, created_at, updated_at)
select
  md5('community-demo-post-v1-' || demo.n)::uuid,
  case when demo.n % 2 = 1
    then '7d544fc3-5ecf-44be-b2ce-41a0a560685c'::uuid
    else '87855b7b-fd58-446a-98fe-93f4c4437e2e'::uuid
  end,
  demo.body,
  md5('community-demo-request-v1-' || demo.n)::uuid,
  now() - demo.age,
  now() - demo.age
from (values
  (1, 'Treino de hoje concluído! 💪 Consegui manter a concentração em cada série e saí com aquela sensação boa de missão cumprida. Quem também já treinou hoje?', interval '30 minutes'),
  (2, 'Pequena vitória da semana: consegui organizar meus horários e cumprir os treinos planejados. 🎯 A rotina ainda está se ajustando, mas cada passo conta!', interval '2 hours'),
  (3, 'Preparação para a semana por aqui! 🥗 Deixei minhas refeições organizadas para facilitar os próximos dias. Vocês preferem preparar tudo de uma vez ou um pouco a cada dia?', interval '5 hours'),
  (4, 'Hoje a motivação demorou para aparecer, mas comecei pelo primeiro exercício e fui no meu ritmo. ✨ Feliz por ter reservado esse tempo para cuidar de mim.', interval '9 hours'),
  (5, 'Uma coisa que está me ajudando muito: registrar como me sinto depois do treino. 📝 Perceber a evolução na disposição também faz parte do processo!', interval '1 day'),
  (6, 'Garrafinha por perto e pausas ao longo do dia. 💧 Estou tentando prestar mais atenção aos hábitos simples da minha rotina. Qual hábito vocês estão trabalhando esta semana?', interval '1 day 4 hours'),
  (7, 'Dia de respeitar o descanso planejado e recarregar as energias. 🌿 Amanhã tem mais! Como vocês gostam de aproveitar os dias de recuperação?', interval '2 days'),
  (8, 'Começando minha participação na comunidade! 👋 Quero compartilhar as pequenas conquistas e acompanhar a evolução de vocês. Vamos apoiar uns aos outros nessa caminhada!', interval '3 days')
) as demo(n, body, age)
on conflict do nothing;

-- Confirma somente os exemplos deste arquivo.
select id, author_id, body, created_at
from public.community_posts
where request_id in (
  select md5('community-demo-request-v1-' || n)::uuid
  from generate_series(1, 8) as examples(n)
)
order by created_at desc;

commit;
