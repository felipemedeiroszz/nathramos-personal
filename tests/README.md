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
