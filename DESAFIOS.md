# Desafios

O módulo usa as contas, o controle de acesso, os menus, a central de notificações e o cron existentes. Aplique as migrações `000056_challenges.sql` e `000057_challenge_integrity.sql`, em sequência após a 000055, antes de publicar o código. A 000057 também atualiza instalações que já aplicaram a 000056. O bucket `challenge-assets` é privado e criado pela migração. Não há novas variáveis de ambiente.

A 000057 preserva os registros anteriores, permite corrigir um registro recusado mantendo o horário original e impede dois registros ativos da mesma meta no mesmo dia. Se encontrar duplicidades ativas antigas, ela interrompe a atualização para revisão dos registros, sem apagar dados automaticamente.

## Uso

No administrador, abra **Desafios → Novo desafio**, crie o rascunho, configure as informações, metas e prêmios, salve e publique. Cada colocação recebe nome, imagem e instruções próprios. Desafios podem ser duplicados, pausados, retomados, cancelados e encerrados. A duplicação também copia as imagens para arquivos independentes. Se a cópia de um arquivo falhar, o rascunho fica disponível com um aviso para conferir as imagens.

O aluno encontra o módulo no menu e em **Mais → Desafios** no celular. Pode filtrar os seus desafios, ler as regras, aceitar e solicitar inscrição. Requisitos podem exigir aprovação administrativa. Este módulo oferece participação livre ou com requisitos, sem criar cobrança de inscrição.

Cada aluno envia um total consolidado por meta por dia. Para duas sessões de treino no mesmo dia, por exemplo, informa quantidade 2 em um único registro. Quantidades parciais já enviadas exigem revisão administrativa antes de um novo envio corrigido. Fotos e comprovantes pertencem ao aluno e ao desafio. Somente o titular e o administrador consultam comprovantes. Os demais participantes veem nome, avatar, progresso e pontuação no ranking.

## Pontuação e datas

- A pontuação é calculada no PostgreSQL. Uma meta pontua uma vez por período ao atingir o valor configurado. Metas diárias usam dias locais, semanais usam semanas de segunda-feira a domingo, e totais usam todo o desafio.
- Exemplo semanal: meta de 5 treinos, 30 pontos. Registros consolidados de um treino em cinco dias somam 5 e concedem 30 pontos nessa semana.
- O teto limita os pontos por meta em todo o desafio. O valor excedente de uma atividade não multiplica a pontuação do período.
- Atividades com aprovação manual ficam sem pontos até serem aprovadas. Recusa de um registro anteriormente aprovado recalcula o livro de pontos e o ranking. Ajustes administrativos positivos ou negativos exigem justificativa e não podem tornar o saldo negativo.
- Entrada, aprovação, pontuação e encerramento são serializados por desafio. Chaves de tentativa e restrições únicas protegem os envios e ajustes repetidos.
- A interface usa horário de Brasília. O banco guarda os instantes com fuso e usa o fuso configurado para os períodos. O registro padrão recebe o horário do servidor. O aluno pode informar um horário dentro da janela retroativa configurada e após sua inscrição. Com janela zero, o registro usa exclusivamente o horário do servidor.
- A entrada tardia não reduz as metas nem os períodos totais do desafio. O aluno participa conforme as mesmas regras publicadas.
- Pausar bloqueia registros e novas inscrições. A pausa mantém as datas publicadas. Depois do início, metas, prêmios, datas e critérios de pontuação ficam preservados. O administrador pode esclarecer textos e atualizar a capa mediante justificativa, com auditoria e aviso aos participantes.

## Resultado e premiação

Ao encerrar, novos registros são bloqueados, mesmo se o cron ainda não tiver executado. O cron encaminha o desafio para apuração. Pendências aguardam revisão ou são recusadas automaticamente conforme a configuração publicada.

A apuração guarda uma versão com configuração, metas, prêmios, pontuações, critérios e classificação. O administrador revisa e confirma para publicar. Critérios de desempate são aplicados na ordem configurada após a pontuação. Empates persistentes exigem decisão justificada ou compartilham a colocação e o prêmio quando essa política estiver habilitada. Assim, a premiação compartilhada pode ter mais pessoas que a quantidade de colocações.

Resultados e ganhadores confirmados são imutáveis. Para corrigir, abra uma revisão justificada, revise atividades ou ajuste pontos e confirme uma nova versão. A versão anterior permanece no histórico. A entrega do prêmio é acompanhada separadamente como pendente, contato realizado ou entregue.

O resultado oficial aparece na aba **Vencedores** e na página `/{locale}/desafios/{id}/vencedores`.

## Notificações e operação

As notificações são internas, persistidas na central atual, com links para o desafio. Cobrem publicação, inscrição, início, lembretes de metas, cumprimento de metas, pontos, mudança de posição, Top 3, últimos dias, encerramento e resultado, incluindo os ganhadores. Mudanças posteriores de posição geram novos avisos, inclusive quando outro participante sai do desafio. Encerramentos manuais e automáticos notificam os participantes. Eventos repetidos são deduplicados. Lembretes são diários e enviados apenas se houver meta do período ainda incompleta.

O cron `/api/cron/notifications?task=all` processa desafios e limpeza, além das tarefas anteriores. A tarefa `reminders` também processa desafios e a tarefa `uploads` limpa arquivos abandonados. Confirme o agendamento autenticado na hospedagem. Resultados aguardam a confirmação do administrador.

Uploads aceitam JPG, PNG, WebP e, para comprovantes, PDF, até 4 MB. Imagens são validadas por decodificação, convertidas para WebP e reduzidas a 1.600 px, com remoção de EXIF. PDFs são servidos como anexos. Há limite de 30 tentativas por hora para alunos e 200 para administradores. Reservas abandonadas são limpas após 24 horas, com repetição segura em falhas do Storage.

## Verificação

`npm test` inclui testes de banco e API em `tests/challenges.test.mjs` e `tests/challenge-api.test.mjs`.

`node tests/preview-challenges.mjs` verifica o fluxo completo usando componentes reais, schemas e PostgreSQL PGlite local. Requer Chrome e Playwright. `PLAYWRIGHT_MODULE` pode apontar para uma instalação existente. Auth e Storage são fixtures isoladas. Capturas ficam em `artifacts/challenges-ui/`.

Depois da publicação, homologue em staging com administrador e dois alunos, verificando permissões exclusivas, imagens reais, aprovação, pontuação, notificações, fechamento pelo cron, empate e publicação/correção do resultado.
