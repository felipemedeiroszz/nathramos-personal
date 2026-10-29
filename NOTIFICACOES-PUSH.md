# Verificação de notificações push

Auditoria local: 29/10/2026.

## Domínio de produção

Verificado em 29/10/2026: https://nathramos-personal.vercel.app/ responde por HTTPS. O manifesto e os ícones 192/512/maskable retornaram HTTP 200. A rota de cron sem autenticação retornou 401, como esperado; isso não confirma execução automática.

O `/sw.js` publicado ainda usa `nathramos-static-v1`, e o manifesto mantém as rotas antigas. As correções locais precisam ser publicadas antes da homologação no aparelho. Também foi adicionado `apple-touch-icon` aos metadados locais para instalação no iPhone.

Confirmar o plano Vercel: Hobby aceita cron apenas diário, portanto não suporta o intervalo de 15 minutos do projeto. Usar um plano compatível ou um agendador externo autenticado. Não executar a rota de cron manualmente durante uma simples auditoria, pois ela pode disparar avisos reais.

## Situação verificada

- Chaves VAPID do navegador e servidor presentes e iguais; par público/privado validado por derivação criptográfica.
- CRON_SECRET presente no ambiente local.
- Tabelas notifications e push_subscriptions acessíveis pelo servidor.
- Nenhum dispositivo cadastrado no banco consultado durante a auditoria. Não há destinatário push registrado nesse ambiente.
- vercel.json solicita execução a cada 15 minutos. Isso não comprova que o agendador esteja instalado ou rodando na hospedagem. `npm run dev` não executa esse cron.
- Não foram enviados avisos para usuários reais, nem validada a recepção em um aparelho físico.

## Ativação no celular

1. Abrir o domínio publicado por HTTPS. HTTP em um IP da rede não permite Web Push. O localhost de um celular é o próprio celular.
2. No iPhone/iPad (iOS/iPadOS 16.4+), adicionar o site à Tela de Início e abrir pelo ícone.
3. Entrar como aluno, abrir Notificações → preferências e tocar em Ativar notificações. Aceitar a permissão do sistema. A ativação agora salva a preferência no servidor imediatamente.
4. Confirmar que o aparelho aparece como ativo; permitir as categorias desejadas e salvar suas preferências. Conferir a janela de silêncio.
5. Na hospedagem, conferir o mesmo par VAPID e CRON_SECRET e os registros do agendador. A chave NEXT_PUBLIC_VAPID_PUBLIC_KEY precisa estar definida na compilação, não apenas no processo de execução.
6. Com autorização para um teste real, enviar um aviso apenas à conta de teste pelo painel, fechar o PWA, conferir recebimento e tocar na notificação. O clique deve abrir a rota correta. Não usar disparo geral para homologar.

## Correções realizadas

- Aguarda a ativação do Service Worker antes da inscrição; impede inscrições concorrentes na mesma página.
- Reporta falhas de inscrição/desinscrição; respeita a desativação persistida neste aparelho.
- Ativação salva a preferência global; desativar o aparelho não desativa os demais.
- Tela distingue permissão do sistema de inscrição efetiva e explica HTTPS, instalação no iOS e bloqueio de permissão.
- Corrige eventos push sem tag e com JSON inválido, mantendo exibição pelo sistema operacional.
- Clique da notificação fica restrito ao domínio, com rota padrão localizada.
- Remove cache de páginas privadas/API/RSC e limpa caches antigos do próprio app.
- Corrige rotas do manifesto e preserva a identidade anterior do PWA.

## Testes

`npm test`: inclui push-notifications.test.mjs com eventos push/clique simulados, cache, concorrência, opt-out e requisitos de celular. Sem acesso aos provedores push.

`node tests/preview-push-worker.mjs`: ativa o Service Worker real no localhost em um navegador isolado, testa limpeza do cache antigo, ausência de cache privado, ícones PWA e rejeição de inscrição anônima. Requer Playwright/Chrome (`PLAYWRIGHT_MODULE`). Não prova entrega a um celular.

Referências:
- https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe
