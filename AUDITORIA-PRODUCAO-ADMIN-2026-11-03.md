# Revisão do painel administrativo — 03/11/2026

## Correções posteriores

Os três problemas abaixo foram corrigidos no projeto: os quatro cadastros verificam a resposta e preservam campos/erro em caso de falha; imagens usam upload direto assinado, limite único de 5 MiB e validação real com Sharp no servidor; datas civis são formatadas sem deslocamento de fuso e o formulário de exame usa o dia local como padrão. O envio bloqueia salvamento enquanto a imagem está pendente e os formulários impedem submissões duplicadas.

Aplicar **000053_product_image_admin_access.sql** após a 000052: restringe alteração de imagens públicas a administradores e mantém a leitura pública. As políticas anteriores permitiam mutações por qualquer usuário autenticado. A autorização das duas ações novas também exige admin.

Validação após correções: **201 testes passaram**, incluindo sete novos testes de regressão em `tests/admin-production-fixes.test.mjs`; **build de produção aprovado**, com lint e tipos. Não houve aplicação de migrations nem homologação no ambiente remoto. O restante deste documento registra o diagnóstico anterior às correções.

Veredito: não liberar como 100% pronto. Há três problemas confirmados por inspeção do fluxo e reprodução local de data. Esta revisão não alterou o código funcional e não executou operações em produção.

## Problemas

1. **P2 — Falhas de gravação são descartadas em quatro cadastros.** Os callbacks de `AdminExamesClient.tsx:353`, `AdminAlimentosClient.tsx:301`, `AdminSuplementosClient.tsx:299` e `AdminEbooksClient.tsx:323` aguardam a ação, mas ignoram `success:false`. Os respectivos modais chamam `onSaved` em seguida, fechando e descartando o formulário sem apresentar a falha. Uma recusa do banco pode aparentar salvamento. Conferir o resultado e manter campos/erro visíveis até confirmação de sucesso; tratar também exceções de rede. Kits de treino já conferem o resultado.

2. **P2 — Limite de upload de imagens incompatível com o transporte.** `ProductImageField.tsx:75` permite 5 MiB e envia o binário por Server Action. `content.ts:473` aceita até 5.000.000 bytes. `next.config.mjs` não configura `serverActions.bodySizeLimit`; o Next instalado (`action-handler.js:478`) limita a requisição a 1 MB. Imagens acima desse limite são rejeitadas antes da validação da ação. O componente também não captura essa rejeição. Recomenda-se upload direto autorizado no Storage com validação do arquivo e limite único, como no fluxo de exames. O limite da hospedagem deve ser respeitado; apenas aumentar a configuração local não comprova funcionamento em produção.

3. **P2 — Data do exame aparece um dia antes no Brasil.** `AdminExamesClient.tsx:123` converte uma data civil `YYYY-MM-DD` usando `new Date(dateStr)` e depois formata no fuso do navegador. Reprodução com `TZ=America/Sao_Paulo`: `2026-11-03` aparece como `02/11/2026`. Formatar data civil sem conversão de fuso; verificar também os valores padrão criados com `toISOString().slice(0,10)` perto da meia-noite.

## Evidências positivas e limites

- `npm test` executado nesta revisão: **194 passaram**, zero falhas. Inclui permissões, escopo de coach, concorrência de prescrições, cadastro, financeiro manual, relatórios e diagnósticos. Os testes atuais não cobrem as falhas de interface acima.
- Build de produção aprovado e auditoria de runtime sem alertas na revisão imediatamente anterior, no mesmo checkout, sem mudanças funcionais posteriores.
- Layout administrativo exige admin/coach; ações financeiras e criação de contas exigem admin. Ações de prescrição verificam carteira/autoria; programação diária valida vínculo, itens e revisão. Esses controles foram inspecionados e possuem testes, mas não constituem garantia de ausência de toda falha possível.
- Diversas gravações de auditoria são disparadas com `void AuditLogService.log`; não há garantia de persistência antes da resposta. É uma limitação de rastreabilidade a endereçar conforme a exigência operacional.
- Sem homologação remota nesta revisão: não foram testados pagamentos reais, webhooks, push, políticas efetivamente instaladas, carga, restauração de backup ou telas com sessão real publicada. Previews existentes usam fixtures; não equivalem a teste completo em produção.

## Antes da liberação

Corrigir os três problemas, testar respostas negativas e rede interrompida nos cadastros, upload acima de 1 MB e datas em São Paulo. Aplicar migrations pendentes até 000052 e executar o diagnóstico no projeto correto. Homologar admin, coach e dois alunos com carteiras distintas; conferir rotina por data, pagamentos manuais e sincronização com provedores, relatórios/exportações, notificações e atualização entre sessões. Confirmar monitoramento de erros, backup e restauração no ambiente de implantação.
