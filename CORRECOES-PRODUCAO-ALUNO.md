# Correções da auditoria de produção — painel do aluno

## Resultado no código

Os bloqueadores da auditoria de 03/11/2026 foram tratados. Isso não declara o ambiente publicado homologado: nenhum banco remoto, conta ou cobrança real foi alterado durante este trabalho.

### Dependências

- Next.js atualizado de 14.2.15 para **15.5.28**, next-intl para **4.14.9** e Zod para **4.6.7**.
- Rotas, layouts e handlers foram adaptados às APIs assíncronas de `params`, `searchParams`, `headers` e `cookies`. As opções de configuração de pacotes externos/tracing foram migradas.
- As validações foram adaptadas ao Zod 4; consentimentos textuais `false` agora são recusados, em vez de interpretados como verdadeiros por coerção booleana.
- PostCSS, source-map-js e qs receberam versões corrigidas. ExcelJS mantém sua API com dependências transitivas atualizadas por overrides. Uma exportação XLSX com formatação condicional foi gravada e relida para verificar compatibilidade.
- **`npm audit --omit=dev`: zero vulnerabilidades de produção.** A auditoria que inclui ferramentas de desenvolvimento ainda aponta alertas moderados na árvore do ESLint legado; isso é distinto do resultado das dependências implantadas em runtime. Não foi usado `npm audit fix --force`.
- Node **22.x** definido em `engines` e `.nvmrc`. Reinstalar pelo lockfile (`npm ci`) ao publicar.

### E-books

O catálogo usa uma lista explícita de campos e nunca envia `external_url` nem `file_bucket_path` ao componente cliente. A disponibilidade é calculada no servidor/banco, incluindo gratuidade, compra paga/estorno parcial ou benefício do plano efetivamente elegível. Publicações futuras e exclusões ficam fora do catálogo.

O aluno abre `/api/ebooks/{id}/access`. A rota verifica sessão, acesso à plataforma e direito ao conteúdo naquele momento. Arquivos privados recebem URL assinada de **60 segundos**. Entregas externas aceitam somente HTTPS; a resposta não é armazenada em cache e usa `no-referrer`.

A política de leitura de e-books no banco usa a mesma autorização. O servidor não considera uma assinatura antiga de plano superior para liberar conteúdo de um plano atual inferior. Estorno total revoga o direito decorrente da compra.

URLs externas continuam sendo endereços compartilháveis depois de entregues a um usuário autorizado. Para proteção e revogação mais fortes, usar arquivos no bucket privado `ebook-files`. Se links externos já foram distribuídos antes desta correção, trocar esses links ou mover o material para armazenamento privado é uma operação adicional no provedor do conteúdo.

### Exames de até 20 MB

O envio foi dividido em três etapas:

1. Ação autenticada valida nome, tamanho e tipo, cria uma intenção de upload de 30 minutos e emite autorização para um caminho único no bucket privado.
2. O navegador envia os bytes diretamente ao Storage por URL assinada, sem atravessar Server Actions ou a função da hospedagem.
3. Ação autenticada confere titularidade, existência, tamanho/tipo reais no Storage e assinatura binária do arquivo; então uma RPC transacional cria o exame. Repetir a finalização retorna o mesmo exame.

Tipos permitidos: PDF, PNG, JPEG e WebP. O bucket aplica **20 MiB** de limite. Uploads autenticados diretos fora desse fluxo e atualizações diretas são bloqueados por política restritiva. O caminho não aceita sobrescrita via autorização assinada. Não se aumentou indiscriminadamente o limite global de Server Actions.

O formulário usa estado de envio durante toda a operação e impede submissões duplicadas. Arquivos órfãos de intenções vencidas são removidos pelo cron após o término da validade potencial do token; arquivos de exames concluídos não entram nessa limpeza.

### Lembretes

Falhas são isoladas por aluno e por notificação. A geração e a entrega usam no máximo quatro workers simultâneos, e consultas de rotina da mesma conta são compartilhadas durante uma entrega. Contadores incluem falhas parciais.

No cron `task=all`, uma falha na geração não impede entrega ou limpeza de uploads. A resposta preserva resultados parciais e usa HTTP 500 se alguma etapa falhar, para permitir monitoramento/reprocessamento. A tarefa desconhecida é rejeitada. A rota continua protegida por `CRON_SECRET`.

## Implantação

Aplicar também **`supabase/migrations/000052_exam_storage_delete_integrity.sql`** após a 000051. Ela bloqueia DELETE direto do aluno no bucket `exam-files`; a exclusão pela ação do aplicativo continua usando o servidor após atualizar o registro do exame. O teste de regressão verifica RLS com privilégios reais de Storage, preservação do arquivo diante de DELETE direto, exclusão pelo servidor e funcionamento dos demais buckets.

1. Aplicar migrations pendentes anteriores e depois **`supabase/migrations/000051_student_content_security.sql`**. Não reaplicar migrations históricas em banco existente.
2. Publicar o código com Node 22.x e o novo `package-lock.json`.
3. Conferir bucket `exam-files` privado e limitado a 20 MiB, e `ebook-files` privado. A migration ajusta o bucket de exames e as políticas; não publica arquivos.
4. Manter o cron autenticado `/api/cron/notifications?task=all` e `CRON_SECRET`. A limpeza também pode ser executada pelo task `uploads`.
5. Executar `supabase/diagnostics/admin-readiness.sql` no projeto correto; o diagnóstico administrativo inclui os novos objetos.
6. Homologar com contas reais de teste: comprador/não comprador, benefício do plano, estorno, upload direto no Storage e entrega real de push. Os testes locais não substituem essa etapa.

As telas novas dependem do schema novo; código e migration devem entrar na mesma janela de publicação.

## Validação e evidências

- `npm test`: **193 testes passaram**, incluindo regressões em `production-content`, `production-uploads` e `production-reminders`.
- `npm run build`: **aprovado**, com Next.js atualizado.
- `npm run audit:production`: **zero alertas** nas dependências de runtime.
- `tests/preview-production-uploads.mjs`: componente real enviando PDFs de **10 MiB**, em 390 e 1440 px, para servidor local de teste. Binário passa apenas pelo endpoint de Storage; payloads das ações ficam abaixo de 4 KiB. Não usa Storage real.
- `tests/preview-student-system.mjs`: regressão das telas do aluno com fixtures.
- `tests/preview-student-live.mjs`: atualização entre abas, preservação de edição e fallback.
- `tests/preview-auth-ui.mjs`: **8 cenários aprovados** de login/cadastro, PT/EN e 390/1440 px, no servidor local compilado. Nenhuma conta foi criada. Aceita `PUBLIC_BASE_URL`.

Os previews aceitam `PLAYWRIGHT_MODULE` e requerem Chrome. Logs e capturas estão em `artifacts/production-fixes-*` e `artifacts/production-upload-ui/`.
