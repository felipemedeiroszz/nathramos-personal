-- Remove emojis dos templates de notificação exibidos no painel do aluno.
-- A interface utiliza exclusivamente ícones SVG (lucide-react); emojis são proibidos.
update public.notification_templates
set title_pt = 'Hora do treino!'
where id = '20000000-0000-0000-0000-000000000002'
  and title_pt <> 'Hora do treino!';
