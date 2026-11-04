# Verificação do painel do aluno

`panel-sync.test.mjs` verifica atualização automática, suspensão durante edição/modais e erros de consulta. `live-updates.test.mjs` cobre o provedor global de todas as rotas, agrupamento e retomada de eventos, preservação de rascunhos, sinais por escopo, RLS e publicação segura. A migração 48 habilita eventos imediatos; a consulta de segurança a cada 15 segundos continua sem Realtime. Abas ocultas/offline aguardam retorno. Os testes não substituem homologação remota com duas sessões autenticadas. Consulte `ATUALIZACOES-TEMPO-REAL.md`.

Execute `npm ci` e `npm test`. Não são necessárias credenciais ou rede para executar os testes depois de instalar as dependências.

- `security-database.test.mjs` aplica as migrações em um PostgreSQL PGlite novo e testa políticas RLS, operações transacionais e persistência. O bootstrap cria fixtures mínimas de Auth/Storage e uma publicação; fornece também a identidade exigida pela migração histórica 000005. Nenhum banco remoto é utilizado.
- `access-api.test.mjs` executa os handlers e verificadores reais com dependências de autenticação controladas.
- `routine.test.mjs` verifica vigência, porções, doses e calendário.
- `reminders-auth.test.mjs` verifica lembretes de kits, preferências, deduplicação e callbacks.

Para inspeção visual opcional, execute primeiro `npm run build` e então `node tests/preview-ui.mjs` em um ambiente com Playwright e Chrome disponíveis. A variável `PLAYWRIGHT_MODULE` pode apontar para uma instalação de Playwright já existente. O script renderiza os componentes reais com fixtures e gera HTML/PNG em `artifacts/auditoria-ui/`, nas larguras 390 e 1280 px. As imagens não comprovam autenticação ou transações ponta a ponta.

A homologação remota descrita em `AUDITORIA-PAINEL-ALUNO.md` continua necessária para pagamentos, e-mail, Storage e Realtime reais.

## Administração

`platform-settings.test.mjs` testa configurações e auditoria transacionais no PGlite, incluindo erros de leitura, cadastro fechado, autorização, manutenção, conflitos e contatos públicos localizados. `prepare-settings-preview.mjs` prepara o formulário real com ação simulada para revisão no navegador, sem gravar no Supabase. Consulte `CORRECOES-CONFIGURACOES.md` e a migração `000047`.

`student-financial-history.test.mjs` cobre o histórico individual paginado, isolamento entre alunos, exclusão de duplicatas, acesso exclusivo do administrador, filtros, limites de datas no fuso de São Paulo e falhas de consulta. Usa dependências controladas, sem alterar registros reais.

`student-creation.test.mjs` e `manual-student-billing.test.mjs` cobrem cadastro administrativo, concessão de plano com vencimento inclusivo, dinheiro/recebimentos manuais, receita, autorização, deduplicação e rollback. Consulte `CADASTRO-ALUNOS-PAGAMENTOS-MANUAIS.md` para uso e migrações 000044/000045. Auth é substituído e o banco é local isolado; não há contas ou cobranças reais nesses testes.

`coaches.test.mjs` cobre criação exclusiva pelo administrador, validação, papel fixo de coach, e-mail duplicado, compensação de falhas de perfil, auditoria sem senha e visibilidade do menu. Usa Auth substituído e não cria contas reais. A área fica em `/{locale}/admin/coaches`; a vinculação à carteira continua na ficha individual do aluno.

`admin-database.test.mjs` cobre diretório, edição transacional de kits, metadados de atribuições e encerramento de acesso. `admin-actions.test.mjs` cobre redefinição e operações financeiras. `admin-reporting.test.mjs` cobre moeda, período, MRR e datas de auditoria.

A inspeção opcional do administrador usa `node tests/preview-admin-ui.mjs`, com os mesmos pré-requisitos de Playwright/Chrome da inspeção do aluno. Gera fixtures visuais locais em `artifacts/auditoria-admin-ui/`.

## Pagamentos

`immediate-checkout.test.mjs` verifica cobrança na contratação sem trial: os adaptadores usados pelo checkout não enviam dias de teste ao Stripe mesmo com configuração legada, e o resumo mostra o valor integral no cartão e PIX. Não realiza cobranças. A migração `000046_immediate_checkout_no_trial.sql` zera as configurações de teste e impede novos valores positivos; não altera nem cobra assinaturas históricas.

payments.test.mjs aplica as migrações e testa transações de confirmação, aliases, estornos, RLS e receita. payment-providers.test.mjs testa normalização e handlers com respostas controladas dos provedores. As chamadas bancárias reais dependem da homologação descrita em AUDITORIA-PAGAMENTOS.md.

## Central financeira do aluno

student-billing.test.mjs verifica acesso, isolamento do histórico, exportação real em Excel/CSV e recuperação de tentativas. preview-student-billing-ui.mjs verifica os componentes reais em navegador com fixtures, sem chamadas bancárias externas. Consulte CENTRAL-PAGAMENTOS-ALUNO.md.

## Diagnóstico do painel

admin-diagnostics.test.mjs verifica classificação de falhas, isolamento do endpoint administrativo e inspeção SQL do esquema/permissões. Consulte DIAGNOSTICO-PAINEL-ADMIN.md para investigar o ambiente publicado.


## Sistema visual administrativo

`node tests/preview-admin-system.mjs` renderiza 19 módulos reais com fixtures locais em 1440 e 390 px. Verifica transbordamento, Ctrl+K, navegação por teclado, permissões de navegação do coach em português e inglês, menu da conta, drawer mobile e foco dos modais. As ações remotas são substituídas; nenhum dado é gravado nos serviços. Os previews são gerados em `artifacts/admin-design-system/` (ignorado pelo Git). Requer Playwright com Chrome; use `PLAYWRIGHT_MODULE` para apontar para uma instalação existente.


## Sistema visual do aluno

`node tests/preview-student-system.mjs` renderiza as telas e estados de acesso com fixtures locais em 1440 e 390 px. Verifica alimentação, hidratação, peso/sono, séries, falhas de gravação, menu mobile e renovação com acesso bloqueado, além de cenários em inglês. Ações, fetch e Realtime são substituídos: o teste não altera serviços remotos. Os previews ficam em `artifacts/student-design-system/`. Requer Playwright com Chrome; configure `PLAYWRIGHT_MODULE` se necessário.


## Chat de mentoria

`node tests/preview-mentor-chat.mjs` verifica o componente real em duas sessões de navegador com transporte e gravação em memória: emojis, chegada imediata, deduplicação da mensagem otimista, recuperação após reconectar e rascunho preservado após falha. Nenhuma conversa real é alterada. Requer CSS gerado por `npm run build` e Playwright/Chrome (`PLAYWRIGHT_MODULE`). Capturas em `artifacts/public-site/chat-fixture/`.

## Notificações push

`push-notifications.test.mjs` cobre exibição pelo Service Worker, cliques, cache privado, inscrições concorrentes, desativação persistida e requisitos móveis. `node tests/preview-push-worker.mjs` verifica o Service Worker real em um navegador isolado no localhost, sem enviar push para pessoas. Consulte `NOTIFICACOES-PUSH.md` para o diagnóstico e a homologação em Android/iPhone.

## Site público

`content-pages.test.mjs` cobre links internos sem duplicação do idioma, destinos inválidos, tradução alternativa e retorno ao conteúdo padrão. `node tests/prepare-content-pages-preview.mjs` prepara o editor real com ações isoladas em `artifacts/content-pages-qa/`; execute o `server.mjs` gerado para abrir `http://localhost:3101`. Permite simular falha de rede e atualização de outra sessão, editar, reordenar, duplicar, remover/desfazer e publicar somente em memória. Nenhuma publicação real é feita. O editor e as páginas públicas foram conferidos pelo navegador em desktop/celular; capturas ficam nesse diretório.

`node tests/preview-checkout-design.mjs` verifica o checkout de demonstração em português/inglês e desktop/celular, o resumo por meio de pagamento e o total integral no PIX. As APIs de pagamento são bloqueadas pelo teste; nenhuma cobrança é criada. Screenshots em `artifacts/public-site/`.

`node tests/preview-auth-regressions.mjs` testa preservação de `next=checkout` e fragmento ao trocar idioma, Escape no seletor e falha de rede simulada no login. A requisição de autenticação é interceptada, sem atingir o servidor. `auth-login.test.mjs` cobre a normalização de checkbox no FormData e o idioma do redirecionamento com serviços substituídos.

`node tests/preview-auth-ui.mjs` confere login e as três etapas de cadastro em português/inglês, desktop/celular. Verifica validação, preservação dos campos, consentimentos desmarcados, alternância da senha e Escape no modal. Não envia login nem cria contas. Requer o localhost ativo e Playwright com Chrome (`PLAYWRIGHT_MODULE`).

`node tests/preview-public-motion.mjs` verifica o indicador de leitura, entradas por rolagem, retorno ao topo e foco do teclado em desktop e celular. Também testa movimento reduzido e leitura sem JavaScript. Usa o mesmo `PUBLIC_BASE_URL` e `PLAYWRIGHT_MODULE` do preview abaixo.

Com o site iniciado (`npm run dev`), `node tests/preview-public-site.mjs` verifica 11 páginas públicas em português e inglês, em 1440 e 390 px. Confere navegação, menu mobile, foco, idioma, prévia interativa, FAQ, canonical, zoom e caminho do plano ao cadastro, sem enviar formulários ou pagamentos. Os screenshots são gerados em `artifacts/public-site/`. Requer Playwright e Chrome; configure `PLAYWRIGHT_MODULE` quando necessário. `PUBLIC_BASE_URL` troca o endereço de teste e `PUBLIC_ROUTES=home,planos` limita as páginas.


### Programação diária

`daily-planning.test.mjs` cobre regras por dia/data, treino/descanso, alternativas, complementos, prioridades, horários, personalização, semanas/ciclos e histórico via serviço. `daily-planning-database.test.mjs` aplica as migrations e verifica revisão concorrente, carteira do coach, imutabilidade de dias passados, nutrição individual e isolamento de dados. `preview-daily-planning.mjs` usa fixtures locais para testar salvar e consultar data em PT/EN, desktop/mobile, com capturas em `artifacts/daily-planning-ui/`; requer Playwright/Chrome (`PLAYWRIGHT_MODULE`). Veja `AGENDAMENTO-TREINOS.md` para implantação e regras.


### Atualização do painel do aluno

`student-live.test.mjs` cobre todas as rotas do painel, fila de consultas, descarte de respostas antigas e conciliação de séries com rascunhos. `preview-student-live.mjs` abre duas abas em um servidor local e verifica atualização sem F5 por sinal, BroadcastChannel e fallback, mesmo com diálogo aberto e campo em foco, em 390/1440 px. O transporte Supabase e os dados são fixtures; não envia ações a produção. Capturas em `artifacts/student-live-ui/`. Requer Playwright/Chrome e aceita `PLAYWRIGHT_MODULE`.


### Bloqueadores de produção

`admin-production-fixes.test.mjs` cobre preservação dos quatro cadastros em falha, nova tentativa, bloqueio durante upload, datas civis, imagem real acima de 1 MB, arquivo inválido e políticas de alteração de imagens por admin/aluno. Para o upload direto de imagens de produtos, aplicar a migration **000053**, após a **000052**.

`production-content.test.mjs` valida catálogo sem links privados, autorização de compra/plano, estornos, RLS e finalização idempotente de exames. `production-uploads.test.mjs` confere limite de 20 MiB, metadados reais, assinatura binária e consentimentos. `production-reminders.test.mjs` verifica isolamento de falhas do cron e compatibilidade de exportação XLSX após as atualizações transitivas. `preview-production-uploads.mjs` envia arquivos de 10 MiB a endpoints locais nas larguras 390/1440. Os detalhes estão em `CORRECOES-PRODUCAO-ALUNO.md`; a migration 000051 é necessária.
