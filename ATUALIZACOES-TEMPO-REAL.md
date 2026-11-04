# Atualização automática do painel

O layout principal monta `LiveDataRefresh` uma única vez para site público, autenticação, assinatura, aluno e administração. As páginas dinâmicas recebem novamente seus dados com `router.refresh()`, sem recarregar o documento, mudar a rota ou exigir F5.

## Entrega e recuperação

- A migration `000048_site_live_updates.sql` habilita sinais via Supabase Realtime. A `000050_daily_prescription.sql` inclui as regras de programação diária nesse transporte. Publicar o código e aplicar as migrations ainda pendentes no ambiente.
- Os sinais contêm apenas escopo, destinatário, revisão e horário. Dados de pagamentos, prescrições e perfis são consultados novamente no servidor, com autorização. RLS impede receber sinais de outros alunos.
- Eventos próximos são agrupados; o limitador evita uma consulta por linha alterada.
- Cada gravação local também pode invalidar as consultas pelo evento `app:data-changed`; `BroadcastChannel` envia apenas a palavra `changed` para outras abas da mesma origem. Nenhum dado pessoal é transmitido nesse canal.
- A consulta periódica a cada 15 segundos continua funcionando sem WebSocket. Foco, reconexão e retorno à aba também solicitam atualização. Aba oculta ou navegador offline adiam consultas; a retomada não depende de F5.
- A passagem do dia, vencimentos de acesso e alterações de manutenção são reavaliados pelas consultas automáticas. O estado de bloqueio não desmonta o mecanismo global.

## Cobertura do aluno

Dashboard, treino, dieta, suplementos, hidratação, progresso, compras, conversas, reuniões, exames, e-books, conta e central de assinatura recebem os dados novos. O treino de hoje, histórico e sino usam `useLiveResource`, pois carregam dados por API/ação separadamente do conteúdo do servidor. A caixa de notificações acompanha as propriedades atualizadas da página, sem exigir publicação direta de sua tabela privada.

O chat mantém seu transporte próprio e também se sincroniza com os sinais globais; isso permite recuperar mensagens mesmo se o canal parecer conectado mas perder algum evento. Os detalhes de cobrança e de e-books abertos acompanham as novas propriedades; uma compra confirmada fecha a oferta já desbloqueada.

## Preservação da interação

No painel do aluno, escrever em um campo ou abrir um diálogo não paralisa o restante da página. `useLiveDraft` atualiza formulários limpos e mantém edições ainda não salvas de perfil, hidratação e preferências de notificação. Uma gravação confirmada marca a versão enviada como salva sem substituir texto digitado depois do envio.

As séries do treino conciliam a nova prescrição e os registros recebidos com o rascunho: campos não editados aceitam alterações; repetições/carga digitadas são mantidas; registros confirmados pelo servidor prevalecem. O temporizador local continua no componente existente.

As consultas em segundo plano conservam a última resposta válida e não voltam a mostrar skeletons a cada evento. Há somente uma requisição por recurso em andamento, eventos acumulados produzem uma consulta adicional e respostas antigas/desmontadas são descartadas.

Administração, site público e checkout mantêm o adiamento conservador durante edição e diálogos. A marca explícita `data-live-refresh-pause="true"` continua disponível para interações que realmente não podem receber uma atualização naquele momento.

## Validação local

- `npm test`: agendamento, agrupamento, retomada, rascunhos, séries, respostas fora de ordem, RLS e publicação de sinais.
- `node tests/preview-student-live.mjs`: duas abas em servidor local com fixtures, em 390/1440 px. Testa sinal de alteração, BroadcastChannel, fallback de 15 segundos, diálogo aberto e campos em foco, preservando os rascunhos e verificando que houve apenas uma navegação do documento. O transporte Supabase é simulado; não comprova que as migrations já foram aplicadas em produção.
- `node tests/preview-student-system.mjs`: regressão das telas e interações do aluno com fixtures locais.
- `npm run build`: compilação de produção.

Os previews exigem Playwright com Chrome e aceitam `PLAYWRIGHT_MODULE`. Artefatos ficam em `artifacts/student-live-ui/` e `artifacts/student-design-system/`. Nenhum registro real foi alterado.
