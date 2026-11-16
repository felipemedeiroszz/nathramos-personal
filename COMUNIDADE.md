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


# Stories de 24 horas

## Banco de dados

Aplicar as migrações pendentes na ordem do repositório. O feed requer `000055_community.sql`; stories requerem `000058_community_stories.sql`. O código local não aplica migrações no Supabase remoto. O diagnóstico administrativo verifica as duas funções de leitura.

## Stories

- Foto JPG/PNG/WebP de até 4 MB, convertida no servidor para WebP sem EXIF; reutiliza o bucket privado `community-images`.
- Texto e emojis de até 280 caracteres, inclusive stories apenas de texto, quatro fundos e três posições para o texto.
- Prévia antes de publicar, faixa agrupada por autor, visualizador em tela cheia com sequência de 8 segundos, pausa, navegação e fechamento por Escape.
- Expiração definida pelo banco em 24 horas. Leitura e autorização das fotos verificam o prazo. A tela também retira stories expirados sem recarregar a página.
- Limite de 20 publicações por autor por 24 horas. Excluir não reinicia o limite. Retentativas com a mesma chave não duplicam o story.
- Autor e administrador podem excluir. Alunos suspensos para participação não publicam; contas sem acesso à plataforma não leem.
- Imagens de stories ativos são preservadas pela limpeza existente. Imagens sem uso são removidas pelo cron `uploads`/`all`, após expiração e respeitando o período mínimo do upload. A expiração do feed independe do cron. Imagens também usadas em posts continuam disponíveis no post.
- Stories não enviam notificações ou mensagens a outros usuários. Visualizações são marcadas somente na sessão atual da tela.

## Validação local

`npm run typecheck`, `npm run lint`, `npm test`.

`tests/preview-community.mjs` exercita os componentes React com banco PGlite, autenticação e Storage simulados. Valida publicação de story com foto e emoji, posicionamento, visualizador e o feed anterior em PT/EN e 390/1440 px. Screenshots ficam em `artifacts/community-ui` (ignorados pelo Git).

## Posição livre do texto nos stories

Aplicar também `000059_story_text_drag.sql` após a 000058. O editor permite arrastar o texto com dedo ou mouse e ajustar com as setas do teclado (Shift aumenta o passo). As coordenadas são percentuais da área disponível para movimento; o texto fica dentro da imagem e mantém a posição em telas diferentes. Os atalhos Acima/Centro/Abaixo continuam disponíveis. Stories antigos sem coordenadas usam o posicionamento anterior.

## Tamanho do texto e emojis

Aplicar `000060_story_text_size.sql` após a 000059. Botões A−/A+, controle deslizante de 50% a 200%, restauração para 100% e gesto de pinça com dois dedos na prévia. O tamanho se aplica ao texto e aos emojis da legenda; posição e escala são salvas e reproduzidas no visualizador. Stories anteriores usam 100% automaticamente.

## Música com Deezer

Aplicar `000061_community_music.sql` após a 000060. Busca por música/artista, seleção, troca e remoção no editor de posts e stories. Faixas sem prévia são omitidas na busca e recusadas ao publicar. Somente o identificador numérico é salvo; o servidor resolve metadados e endereço de prévia atualizados, com timeout, cache de 60 segundos e consultas autenticadas. O limite de consultas é por instância do servidor; não substitui um rate limit distribuído em múltiplas instâncias.

A reprodução é iniciada pelo usuário e usa a prévia oficial de até 30 segundos diretamente do CDN do Deezer, com atribuição e link para a faixa completa. Nenhum áudio é copiado ao Storage ou incorporado na imagem. Nos stories, a reprodução pausa o avanço automático; fechar ou trocar o story remove o player. Iniciar outra prévia pausa a anterior.

Não há chaves adicionais para os endpoints públicos utilizados, que responderam no teste de conectividade local. Isso não representa autorização para uso comercial: os termos do Deezer restringem finalidades comerciais. Validar a autorização aplicável antes de disponibilizar no aplicativo comercial. Referências: https://developers.deezer.com/api e https://cdns-content.dzcdn.net/pdf/CGV-ww.pdf . Disponibilidade por faixa, território e provedor pode mudar.

Os testes de navegador usam áudio PCM gerado localmente e metadados simulados; não reproduzem músicas comerciais. A consulta real de busca e faixa foi verificada separadamente.

## Descoberta e favoritas de músicas

Aplicar `000062_community_music_favorites.sql` após a 000061. Ao abrir Adicionar música, o seletor busca sugestões sem exigir texto. Recomendadas reúne Em alta (ranking do Deezer), Treino, Pop e Eletrônica (buscas temáticas). Essas seleções não são recomendações personalizadas do Deezer.

O coração salva/remove músicas na biblioteca privada do usuário, compartilhada entre os editores de stories e posts e persistida no banco. Limite de 50 favoritas, gravação idempotente e sem URLs de áudio armazenadas. A reprodução consulta o Deezer novamente, porque a disponibilidade das prévias pode mudar. As mesmas condições de uso comercial da integração continuam aplicáveis.

## Carregamento de stories e áudio automático

Fotos do story atual e dos próximos são antecipadas e decodificadas, com cache limitado em memória por tela, sem armazenamento persistente. URLs de objetos são liberadas ao sair da tela. A rota de imagens pode autorizar diretamente pelo ID do story, imagem vinculada, autor ativo e prazo de expiração, evitando consultas ao feed e à reserva do upload. As respostas continuam privadas e sem cache HTTP.

O relógio do story começa após a imagem estar pronta. Há estado de carregamento e nova tentativa em caso de falha. Stories com música tentam iniciar a prévia automaticamente após a foto carregar; posts continuam exigindo reprodução manual. Se a política do navegador bloquear som automático, aparece “Toque para ativar o som”. A reprodução musical pausa o avanço automático independentemente do botão de pausa do story.
