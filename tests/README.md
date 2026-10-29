# Verificação do painel do aluno

Execute `npm ci` e `npm test`. Não são necessárias credenciais ou rede para executar os testes depois de instalar as dependências.

- `security-database.test.mjs` aplica as migrações em um PostgreSQL PGlite novo e testa políticas RLS, operações transacionais e persistência. O bootstrap cria fixtures mínimas de Auth/Storage e uma publicação; fornece também a identidade exigida pela migração histórica 000005. Nenhum banco remoto é utilizado.
- `access-api.test.mjs` executa os handlers e verificadores reais com dependências de autenticação controladas.
- `routine.test.mjs` verifica vigência, porções, doses e calendário.
- `reminders-auth.test.mjs` verifica lembretes de kits, preferências, deduplicação e callbacks.

Para inspeção visual opcional, execute primeiro `npm run build` e então `node tests/preview-ui.mjs` em um ambiente com Playwright e Chrome disponíveis. A variável `PLAYWRIGHT_MODULE` pode apontar para uma instalação de Playwright já existente. O script renderiza os componentes reais com fixtures e gera HTML/PNG em `artifacts/auditoria-ui/`, nas larguras 390 e 1280 px. As imagens não comprovam autenticação ou transações ponta a ponta.

A homologação remota descrita em `AUDITORIA-PAINEL-ALUNO.md` continua necessária para pagamentos, e-mail, Storage e Realtime reais.

## Administração

`admin-database.test.mjs` cobre diretório, edição transacional de kits, metadados de atribuições e encerramento de acesso. `admin-actions.test.mjs` cobre redefinição e operações financeiras. `admin-reporting.test.mjs` cobre moeda, período, MRR e datas de auditoria.

A inspeção opcional do administrador usa `node tests/preview-admin-ui.mjs`, com os mesmos pré-requisitos de Playwright/Chrome da inspeção do aluno. Gera fixtures visuais locais em `artifacts/auditoria-admin-ui/`.

## Pagamentos

payments.test.mjs aplica as migrações e testa transações de confirmação, aliases, estornos, RLS e receita. payment-providers.test.mjs testa normalização e handlers com respostas controladas dos provedores. As chamadas bancárias reais dependem da homologação descrita em AUDITORIA-PAGAMENTOS.md.

## Central financeira do aluno

student-billing.test.mjs verifica acesso, isolamento do histórico, exportação real em Excel/CSV e recuperação de tentativas. preview-student-billing-ui.mjs verifica os componentes reais em navegador com fixtures, sem chamadas bancárias externas. Consulte CENTRAL-PAGAMENTOS-ALUNO.md.

## Diagnóstico do painel

admin-diagnostics.test.mjs verifica classificação de falhas, isolamento do endpoint administrativo e inspeção SQL do esquema/permissões. Consulte DIAGNOSTICO-PAINEL-ADMIN.md para investigar o ambiente publicado.


## Sistema visual administrativo

`node tests/preview-admin-system.mjs` renderiza 19 módulos reais com fixtures locais em 1440 e 390 px. Verifica transbordamento, Ctrl+K, navegação por teclado, permissões de navegação do coach em português e inglês, menu da conta, drawer mobile e foco dos modais. As ações remotas são substituídas; nenhum dado é gravado nos serviços. Os previews são gerados em `artifacts/admin-design-system/` (ignorado pelo Git). Requer Playwright com Chrome; use `PLAYWRIGHT_MODULE` para apontar para uma instalação existente.


## Sistema visual do aluno

`node tests/preview-student-system.mjs` renderiza as telas e estados de acesso com fixtures locais em 1440 e 390 px. Verifica alimentação, hidratação, peso/sono, séries, falhas de gravação, menu mobile e renovação com acesso bloqueado, além de cenários em inglês. Ações, fetch e Realtime são substituídos: o teste não altera serviços remotos. Os previews ficam em `artifacts/student-design-system/`. Requer Playwright com Chrome; configure `PLAYWRIGHT_MODULE` se necessário.


## Notificações push

`push-notifications.test.mjs` cobre exibição pelo Service Worker, cliques, cache privado, inscrições concorrentes, desativação persistida e requisitos móveis. `node tests/preview-push-worker.mjs` verifica o Service Worker real em um navegador isolado no localhost, sem enviar push para pessoas. Consulte `NOTIFICACOES-PUSH.md` para o diagnóstico e a homologação em Android/iPhone.

## Site público

`node tests/preview-checkout-design.mjs` verifica o checkout de demonstração em português/inglês e desktop/celular, o resumo por meio de pagamento e o total integral no PIX. As APIs de pagamento são bloqueadas pelo teste; nenhuma cobrança é criada. Screenshots em `artifacts/public-site/`.

`node tests/preview-auth-regressions.mjs` testa preservação de `next=checkout` e fragmento ao trocar idioma, Escape no seletor e falha de rede simulada no login. A requisição de autenticação é interceptada, sem atingir o servidor. `auth-login.test.mjs` cobre a normalização de checkbox no FormData e o idioma do redirecionamento com serviços substituídos.

`node tests/preview-auth-ui.mjs` confere login e as três etapas de cadastro em português/inglês, desktop/celular. Verifica validação, preservação dos campos, consentimentos desmarcados, alternância da senha e Escape no modal. Não envia login nem cria contas. Requer o localhost ativo e Playwright com Chrome (`PLAYWRIGHT_MODULE`).

`node tests/preview-public-motion.mjs` verifica o indicador de leitura, entradas por rolagem, retorno ao topo e foco do teclado em desktop e celular. Também testa movimento reduzido e leitura sem JavaScript. Usa o mesmo `PUBLIC_BASE_URL` e `PLAYWRIGHT_MODULE` do preview abaixo.

Com o site iniciado (`npm run dev`), `node tests/preview-public-site.mjs` verifica 11 páginas públicas em português e inglês, em 1440 e 390 px. Confere navegação, menu mobile, foco, idioma, prévia interativa, FAQ, canonical, zoom e caminho do plano ao cadastro, sem enviar formulários ou pagamentos. Os screenshots são gerados em `artifacts/public-site/`. Requer Playwright e Chrome; configure `PLAYWRIGHT_MODULE` quando necessário. `PUBLIC_BASE_URL` troca o endereço de teste e `PUBLIC_ROUTES=home,planos` limita as páginas.
