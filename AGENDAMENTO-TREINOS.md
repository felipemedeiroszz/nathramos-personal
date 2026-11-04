# Programação diária do aluno

## Publicação

Publicar o código junto das migrations `000049_workout_schedule_consistency.sql` e `000050_daily_prescription.sql`, na ordem. A segunda cria regras por aluno, versões e histórico diário; as telas novas dependem dela.

O cron já definido em `vercel.json` chama `/api/cron/notifications?task=all` a cada 15 minutos. Configure `CRON_SECRET` no ambiente de implantação. A rotina salva a prescrição do dia para cada aluno com acesso, mesmo que ele não abra o app. Sem o cron, a captura ocorre ao consultar a rotina ou iniciar um treino; dias que não foram capturados aparecem como histórico indisponível. Dados anteriores à implantação não são reconstruídos com o cadastro atual.

## Uso no admin

1. Vincular kits de dieta, suplementos e/ou treino ao aluno, com início e término inclusivos.
2. Abrir **Rotina e saúde** no cadastro do aluno.
3. Selecionar a data em **Consultar dia** e clicar em **Ver dia do aluno**.
4. Expandir o vínculo e configurar dias da semana ou uma data específica; dieta/suplementos podem valer apenas em treino ou descanso programado.
5. Definir alternativas/complementos, prioridade, orientações e quantidades/horários individuais. Salvar cada vínculo separadamente.
6. Conferir a prévia abaixo. Datas com regras personalizadas são listadas no painel.

A alteração vale a partir da data consultada. Uma exceção com data específica vale só naquele dia; depois volta a regra semanal. Versões futuras já existentes continuam valendo nas respectivas datas. Não se edita o passado. Revisões concorrentes são rejeitadas para evitar sobrescrever o trabalho de outro profissional.

## Regras

- Treinos seguem os dias internos do programa. Exercícios avulsos exigem dia ISO (segunda=1, domingo=7).
- A programação do vínculo permite restringir dias e marcar descanso explícito. Um treino elegível em outro vínculo prevalece sobre o descanso daquele vínculo; sem nenhum dos dois, o estado é **sem programação**.
- Horário de treino é configurável e alimenta o lembrete. Horários orientam a execução; não bloqueiam o aluno de realizar sua rotina no mesmo dia.
- Sem configuração, não há reinício automático do ciclo nem reaproveitamento da semana 1. O admin pode ativar ambos. As semanas são períodos de sete dias desde o início do vínculo. Kits de exercícios avulsos usam a mesma agenda semanal durante as semanas de duração do kit.
- Dieta/suplementos são diários sem personalização. “Somente descanso” requer descanso explicitamente programado; falta de cadastro não conta como descanso.
- Dietas usam por padrão o grupo `dieta-principal`: só aparece uma alternativa elegível. Maior prioridade vence; empate usa o vínculo mais recente, depois ID como desempate estável.
- Suplementos são complementares por padrão. Qualquer kit pode ser complementar ou alternativa em um grupo nomeado. Grupos diferentes se somam.
- Quantidade, unidade, horários e orientação podem ser personalizados no vínculo sem alterar outros alunos. Campos vazios usam o kit. Cada horário individual representa uma porção/dose completa.
- Observações do vínculo são exibidas junto da orientação do item. A nota individual de programação substitui a nota geral do vínculo, quando preenchida.
- Refeições atrasadas continuam pendentes e em destaque; suplementos são ordenados pelo horário entre kits. Itens sem horário ficam depois dos itens com horário.
- A data segue o fuso do aluno; pendências não são transferidas automaticamente para o dia seguinte.
- Lembretes usam a mesma rotina, conferem novamente a elegibilidade antes da entrega e cancelam itens removidos, concluídos ou reprogramados.

## Histórico

A prescrição salva inclui alimentos, doses, quantidades, horários, orientações, nutrição e exercícios com parâmetros individuais. Mudanças na prescrição do dia arquivam a versão anterior. Dias passados usam a última prescrição salva daquele dia, sem consultar o kit atual. Registros de consumo e sessões ficam separados da prescrição e não são reescritos por alterações posteriores. A aba mostra a execução do dia e revisões anteriores.

O histórico começa quando o dia é capturado após a implantação. Não há reconstrução fictícia de dias antigos. Cópias de prescrição não podem ser gravadas pelo navegador nem alteradas para dias passados pela RPC.

## Dados antigos sem dia

O sistema não deduz em qual dia o profissional pretendia prescrever um exercício. Revisar e cadastrar novamente com o dia correto:

```sql
select i.id, i.kit_id, k.name_pt, i.exercise_id
from public.workout_kit_items i
join public.workout_kits k on k.id=i.kit_id
where i.exercise_id is not null and i.day_of_week is null and not k.is_deleted;
```

## Validação

- `npm run typecheck`
- `npm test` (regras, serviços, permissões e PostgreSQL local com PGlite)
- `npm run build`
- `node tests/preview-daily-planning.mjs` (fixtures locais; requer Playwright/Chrome e aceita `PLAYWRIGHT_MODULE`). Interação e capturas em português/inglês nas larguras 390 e 1440. Sem chamadas a serviços remotos.
