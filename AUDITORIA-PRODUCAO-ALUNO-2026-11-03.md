# Auditoria de produção do painel do aluno — 03/11/2026

> Atualização posterior: os achados foram corrigidos no código. Veja `CORRECOES-PRODUCAO-ALUNO.md` para resultado, limites e implantação. O parecer abaixo registra o estado auditado antes dessas correções.

## Parecer

**Não aprovado para produção no estado atual.** Os testes locais e o build não substituem homologação remota nem eliminam os bloqueadores encontrados nesta revisão. Esta auditoria não alterou código funcional, banco remoto, contas, cobranças ou configurações externas.

## Achados prioritários

### P1 — Dependências de produção com alertas críticos/altos

`package.json:24` e a instalação local usam Next.js 14.2.15. `npm audit --omit=dev --json` retornou 15 pacotes com alertas: 1 crítico, 3 altos e 11 moderados. Os pacotes crítico/altos são Next, Zod, PostCSS e source-map-js. São contagens de dependências reportadas, não 15 explorações demonstradas neste aplicativo.

A confirmação oficial inclui DoS em Server Components que afeta a versão instalada. O projeto usa App Router e Server Actions. O advisory de bypass de middleware também inclui essa versão; o aplicativo tem verificações adicionais no servidor, e a Vercel protege especificamente esse bypass, portanto não foi demonstrado acesso indevido por essa falha aqui. O Image Optimizer está desativado em `next.config.mjs`; não se deve classificar automaticamente todos os advisories do pacote como caminhos exploráveis na configuração atual.

Ação: atualizar para versões corrigidas compatíveis, revisar mudanças de versão principal e repetir testes/build/auditoria. Não aplicar `npm audit fix --force` sem revisão.

Fontes primárias:
- https://nextjs.org/blog/security-update-2025-12-11
- https://github.com/vercel/next.js/security/advisories/GHSA-f82v-jwr5-mffw

Evidência local: `artifacts/production-audit-dependencies.json`.

### P1 — Link de e-book pago é entregue antes da autorização de compra

`src/services/EbookService.ts:33` usa `select("*")` com cliente de serviço. `src/app/[locale]/(student)/ebooks/page.tsx:28` lista todos os publicados e a linha 34 repassa as linhas completas ao componente cliente. A compra só define quais cartões o componente exibe como disponíveis; não remove `external_url` do payload.

Reprodução local com o componente de página real e fixture: aluno sem nenhuma compra recebeu um e-book pago com seu `external_url` intacto nas props. Não foi acessado material nem URL real. Quando esse URL é o link de entrega, o conteúdo pode ser obtido sem passar pela compra. A lista também não filtra `is_deleted`, apesar de a exclusão ser lógica.

Ação: catálogo público/ao aluno com lista explícita de campos seguros; endpoint de acesso que valide no servidor gratuidade, compra ou benefício do plano, publicação e exclusão. Para arquivos privados, gerar URL assinada somente depois da autorização. Links externos compartilháveis continuam tendo essa limitação mesmo após a autorização inicial.

### P1 — Upload de exames anuncia 20 MB, mas o transporte aceita 1 MB

`src/app/actions/exams.ts:13` aceita 20 MB. A interface envia `FormData` para uma Server Action. `next.config.mjs:10` não configura `serverActions.bodySizeLimit`; o Next.js 14 usa 1 MB por padrão. Um PDF de alguns MB pode ser rejeitado antes de chegar às validações da ação.

Ação: preferir upload direto autorizado para Storage privado, com validação e confirmação de metadados no servidor; ou alinhar os limites do aplicativo, Next e provedor de hospedagem. Aumentar só a validação de tamanho da ação não resolve limites do transporte/hospedagem.

Fonte primária: https://nextjs.org/docs/14/app/api-reference/next-config-js/serverActions#bodysizelimit

### P2 — Uma falha de rotina interrompe os lembretes de todos os alunos posteriores

`src/services/NotificationDispatcher.ts:228` processa alunos em sequência e não isola erros por aluno. Se `StudentRoutineService.get` falhar para um aluno, o processamento termina. Na rota `src/app/api/cron/notifications/route.ts`, a entrega de notificações pendentes acontece depois da geração; uma exceção na geração também impede a entrega naquele ciclo.

Ação: isolar falhas por aluno, registrar resultado parcial com identificadores seguros e executar a entrega mesmo quando uma parte da geração falhar. Homologar também tempo máximo e carga do cron: o serviço de rotina faz várias consultas e materializa a prescrição por aluno.

## O que está validado localmente

- `npm test`: **180 testes passaram** nesta auditoria. Logs em `artifacts/production-audit-tests.log`.
- As suites incluem regras de calendário, vigência, consumo, autorização, RLS, sessões, pagamentos com fixtures, rascunhos e sincronização.
- Na etapa anterior, o teste de duas abas demonstrou atualização sem navegação do documento em 390/1440 px, com diálogo aberto e campo em foco. Usa transporte e dados de teste, não Supabase Realtime real.
- O teste de e-book desta auditoria demonstra um caso ausente da suite: passar nos 180 testes não significa que todos os fluxos de autorização de conteúdo estejam cobertos.
- `npm run build`: **aprovado** nesta auditoria. Resultado final em `artifacts/production-audit-build.log`.

## Homologação necessária antes da liberação

Não foi inspecionado o estado do ambiente publicado nesta revisão. Assim, permanecem sem comprovação remota:

1. Migrations efetivamente aplicadas, inclusive 000048, 000049 e 000050; políticas RLS, publicação Realtime e buckets privados.
2. Sessões reais de admin e dois alunos: atribuição, alteração, remoção e dia de treino/descanso; acesso indevido a outro aluno deve falhar.
3. Virada do dia no fuso do aluno, vencimento de assinatura, bloqueio/desbloqueio e manutenção com a tela aberta.
4. Upload e leitura autorizada de arquivos reais de teste, nos tamanhos prometidos.
5. Compra, confirmação, estorno, cancelamento e repetição de webhook em ambiente de teste dos provedores; nenhum pagamento real foi feito.
6. Cron autenticado, captura diária do histórico, entrega real de push e retomada depois de falha. Dias sem captura não podem ser reconstruídos fielmente com o cadastro atual.
7. Carga com quantidade representativa de alunos, observabilidade, alertas e restauração de backup. Não foi feito teste de carga ou de restauração.

## Critério de liberação

Corrigir os P1, tratar o isolamento do cron e executar os cenários de homologação com evidências. Até lá, o código pode seguir para homologação controlada, mas não deve ser considerado 100% pronto para produção.
