# Comunidade interna

Aplique a migração `000055_community.sql` após a 000054, antes de publicar o código. Ela cria as tabelas, funções e o bucket privado `community-images`. Não exige variáveis de ambiente adicionais.

O aluno acessa `/{locale}/comunidade`. O administrador acessa `/{locale}/admin/comunidade`. Alunos precisam de conta e assinatura com acesso vigente. Coaches não participam nem moderam. A área administrativa permite buscar por nome e data, consultar publicações, comentários, reações e alunos, abrir o histórico individual, moderar e suspender a participação por 24 horas, 7 ou 30 dias. Reativação pode ser feita a qualquer momento com motivo registrado.

## Publicações e segurança

- Texto de até 5.000 caracteres e no máximo três imagens. Comentários têm até 2.000 caracteres.
- JPG, PNG e WebP de até 4 MB cada são decodificados no servidor, redimensionados até 1.600 px e convertidos para WebP sem EXIF. Animações e formatos incompatíveis são recusados.
- Imagens ficam privadas. A rota de leitura autentica o membro e verifica o vínculo com uma publicação disponível. Prévia de upload ainda sem publicação é exclusiva do proprietário.
- Somente o autor edita. Autor ou administrador podem excluir. Moderação exige motivo, registra o administrador e oculta conteúdo e interações. Os registros permanecem para integridade e auditoria.
- Uma reação por aluno e publicação, alterável ou removível. Reservas de envio, tentativas repetidas, limites e notificações são protegidos por transações no PostgreSQL.
- Limites por pessoa são 10 publicações por hora, 30 comentários por 10 minutos e 30 tentativas de upload por hora. Suspensão da comunidade impede publicar, editar e comentar até o vencimento, preservando a leitura e as reações.
- O feed usa paginação de 20 itens e cursor por data e UUID. Comentários e autores de reações são paginados de 50 em 50. Posts visíveis e conversas são consultados a cada 15 segundos com a aba ativa. Rascunhos são mantidos.

## Notificações e arquivos

As interações criam notificações na central existente, com link direto para a publicação. O autor e os participantes da conversa são avisados, sem autoaviso. Avisos repetidos do mesmo post são agrupados por 15 minutos enquanto não lidos. São notificações internas. O compartilhamento opcional por republicação fica desabilitado, com acesso por link interno disponível.

O cron existente, nas tarefas `all` e `uploads`, limpa arquivos abandonados e imagens que deixaram de pertencer a publicações disponíveis após 24 horas. A limpeza marca os arquivos antes de remover, bloqueia novas vinculações e permite repetir tentativas com falha. Confirme a execução do cron na hospedagem.

## Verificação

`npm test` inclui `community.test.mjs` e `community-api.test.mjs`. Eles executam as migrações em banco local e verificam autoria, permissões, duplicidade, moderação, notificações, paginação, imagens e proteção de requisições.

`node tests/preview-community.mjs` abre o componente real em Chrome com fixtures locais de Auth/Storage e PostgreSQL PGlite. Requer Playwright e Chrome. A variável `PLAYWRIGHT_MODULE` permite apontar para uma instalação existente. Capturas são gravadas em `artifacts/community-ui/`.

Depois do deploy, homologue com dois alunos e um administrador reais de teste. Confira upload no Storage, reação e resposta entre sessões, central de notificações e link direto, suspensão de participação, exclusão com auditoria e execução da limpeza.
