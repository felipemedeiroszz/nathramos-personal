# Aviso administrativo de atualização do ciclo

Aplique `supabase/migrations/000066_workout_cycle_admin_reminders.sql` após as migrações anteriores. A programação sequencial depende também de `000065_sequential_workout_schedule.sql`.

A atribuição direta de **Programa isolado** foi retirada da interface e bloqueada no serviço. A programação usa kits, inclusive um kit padrão. Programas internos dos kits e vínculos históricos permanecem disponíveis para preservar o histórico.

Quando o aluno entra no último kit programado, os administradores ativos recebem no painel:

> Ciclo de treinos precisa ser atualizado
>
> [Aluno] entrou no último kit programado. Prepare a próxima sequência de treinos.

O aviso abre diretamente a aba de treinos desse aluno. O último é o sexto quando houver seis períodos, ou o último cadastrado quando a sequência for menor. Havendo outro kit futuro, o atual ainda não gera o aviso.

A rotina protegida `/api/cron/notifications` verifica as datas a cada 15 minutos conforme `vercel.json`. A geração também é chamada ao iniciar uma sessão válida de treino, restrita ao aluno que iniciou a sessão. Falhas temporárias no aviso não interrompem o treino; a rotina automática pode tentar novamente. O processamento considera o fuso do aluno e cria um único aviso por vínculo final e por administrador, protegido por índice único no banco.

A notificação entra na central do administrador. O push utiliza a fila e as preferências já existentes, depende da permissão e configuração de push e é entregue pelo cron. Se um kit futuro for acrescentado antes da entrega, o aviso pendente é cancelado e marcado como lido. Notificações já entregues permanecem no histórico.

Em produção, o cron precisa estar ativo e `CRON_SECRET` configurado. Em localhost, os crons da Vercel não executam automaticamente. Não é necessário criar um cron adicional. Nenhum aviso foi enviado para usuários reais nos testes.

Validação: banco PostgreSQL local com seis kits, transição por fuso, deduplicação, destinos e idioma, acesso restrito, cancelamento de avisos obsoletos e nova sequência; testes de isolamento da rotina e atribuição direta bloqueada.
