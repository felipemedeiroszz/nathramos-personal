# Programação sequencial de kits de treino

Aplique `supabase/migrations/000065_sequential_workout_schedule.sql` no Supabase antes de usar o novo cadastro. A aplicação não executa migrações automaticamente no banco remoto.

Na ficha do aluno, abra **Treinos → Programar kits**. Escolha o kit, a data inicial e a data final. **Adicionar próximo kit** sugere como início o dia seguinte ao término do anterior. É possível salvar até seis períodos em andamento ou futuros, contando os já cadastrados. A mesma sequência pode reutilizar um kit.

A data final é inclusiva. O aluno recebe os treinos do kit correspondente ao dia, no fuso horário cadastrado em sua conta. Não é necessário um cron para ativar o próximo kit: a seleção diária já consulta início e fim. Se houver um intervalo entre os períodos, o app avisa que não haverá kit liberado naquele intervalo.

A ficha apresenta **Em andamento**, **Agendado** e **Encerrado**. Os encerrados liberam vagas e permanecem no histórico; as sessões realizadas são preservadas. **Editar datas** permite ajustar períodos atuais ou futuros. Em um período já iniciado, seu início e kit são preservados; períodos encerrados não podem ser editados pelo novo cadastro.

O banco bloqueia datas inválidas, períodos sobrepostos e mais de seis vínculos atuais/futuros. A gravação da sequência e a auditoria são atômicas. Uma falha não deixa apenas parte dos kits cadastrada. Administradores e treinadoras passam pelas autorizações existentes da carteira do aluno.

A migração preserva os vínculos antigos. Se houver um kit legado sem data final, use **Editar datas** para definir seu término antes de acrescentar outro; períodos antigos sobrepostos precisam ser ajustados manualmente. O limite anterior baseado em vínculos simultâneos passa a ser seis períodos em andamento ou agendados.

Validação: testes PostgreSQL local de autorização, limite, sobreposição, edição, histórico, rollback e seleção nas datas de transição; testes de navegador com seis períodos, preservação de dados após erro e edição em português/inglês, celular/desktop. Nenhum vínculo real foi alterado durante os testes.
