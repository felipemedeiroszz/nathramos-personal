# Falha de renderização do painel: diagnóstico de implantação

O console enviado mostra um erro de Server Components em produção e um aviso sobre meta tag. O aviso não explica uma exceção do servidor. O trecho enviado não contém o digest nem o erro original do backend, portanto a causa da falha remota ainda não foi confirmada.

## Correções locais

- Inclusão de `mobile-web-app-capable=yes`, mantendo a compatibilidade iOS.
- A tela de erro administrativa exibe o digest quando disponibilizado pelo Next.js.
- Botão **Verificar diagnóstico**, restrito ao administrador, consulta a conexão e os recursos necessários ao painel.
- Erros de consultas passam a registrar operação, código e categoria nos logs do servidor, sem payload, dados de alunos ou chaves. Falhas continuam sendo falhas: nenhum valor financeiro é substituído por zero para esconder o problema.
- Consulta `supabase/diagnostics/admin-readiness.sql` verifica colunas, assinaturas de funções e permissão de execução da service role. É somente leitura e não aplica migrações.

## Como obter a causa no ambiente publicado

**Sem precisar publicar código novo:** execute `supabase/diagnostics/admin-readiness.sql` no SQL Editor do mesmo projeto Supabase usado na Vercel. Linhas com `present=false` indicam dependências ausentes; funções com `service_can_execute=false` precisam de revisão de permissões. O arquivo indica a migração associada a cada recurso. Confira o histórico completo antes de executar qualquer migração; não reaplique tabelas ou funções indiscriminadamente.

**Depois de publicar estas alterações:** abra a página que falha e use **Verificar diagnóstico**. A consulta não exige que o dashboard consiga renderizar e autentica o administrador antes de usar o cliente privilegiado. Alunos e coaches não recebem o relatório.

Nos logs da Vercel, reproduza o acesso a `/pt-BR/admin/dashboard` e procure o digest exibido. Registros `[database] operation_failed` mostram a operação e o código. Isso permite distinguir:

| Categoria | Exemplos | O que conferir |
|---|---|---|
| Esquema/cache | PGRST200/202/204/205, 42P01, 42703, 42883 | Migrações do mesmo banco, funções, colunas, relacionamentos e cache da Data API |
| Permissão | 42501 | Chave de serviço correta e GRANTs das migrações |
| Credencial | PGRST301/302/303, chave ausente | Variáveis do servidor na Vercel e vínculo com o mesmo projeto Supabase |
| Conexão/timeout | PGRST002, 57014 | Disponibilidade e duração das consultas |

Após confirmar que os objetos existem, a [documentação oficial do Supabase](https://supabase.com/kb/troubleshooting/refresh-postgrest-schema) orienta `NOTIFY pgrst, 'reload schema';` para atualizar o cache. Isso não cria funções ou tabelas ausentes e não substitui migrações. Veja também os [códigos da Data API](https://supabase.com/docs/guides/api/rest/postgrest-error-codes).

## Limites da verificação

Neste workspace não há credenciais Supabase, sessão de Vercel nem vínculo `.vercel/project.json`. Não foram consultados logs de produção, aplicadas migrações remotas nem publicado código. A ausência local de credenciais não prova que a produção esteja sem credenciais. Migração/cache desatualizado é uma hipótese que as verificações permitem confirmar ou descartar.

Os testes locais verificam a classificação dos erros, acesso restrito ao diagnóstico, preservação de segredos e o SQL de inspeção em banco isolado. A causa do erro remoto depende do log original ou do resultado da inspeção no banco publicado.

Verificação desta alteração: 96 testes aprovados; TypeScript, lint e build aprovados. Em servidor local de produção, `/pt-BR/login` respondeu HTTP 200 com as duas meta tags mobile/iOS. Isso verifica a correção da meta tag, não o carregamento do painel autenticado no banco publicado.
