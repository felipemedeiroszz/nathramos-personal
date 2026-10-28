# Painel do aluno — correções da auditoria

Atualizado em 28/10/2026.

> Etapa posterior: a revisão administrativa está em `AUDITORIA-PAINEL-ADMIN.md` e acrescenta as migrações `000028` e `000029`, que também são necessárias para o código atual.


## Situação atual

Os problemas identificados na auditoria foram tratados no código e nas novas migrações. A aplicação ainda precisa receber essas migrações no Supabase real e passar por homologação com contas reais de teste. Não é correto declarar produção “100% validada”: esta cópia continua sem `.env.local` nem credenciais do banco, pagamentos ou push disponíveis.

Nenhum banco remoto, registro de aluno, cobrança ou configuração externa foi alterado.

## Correções implementadas

| Achado | Resultado implementado |
| --- | --- |
| Elevação de privilégio pelo próprio perfil | Trigger impede alteração de papel, exclusão e IDs de cliente de pagamento por usuários comuns. Criação de perfil fica restrita ao trigger de autenticação/servidor. |
| RPC legada de exclusão de contas | Chamada direta por anônimos/alunos revogada; exclusão continua pela ação do servidor com conferência de senha. |
| Perfis expostos pela política pública antiga | Política de leitura irrestrita removida. Mantida a leitura do próprio perfil e a visão autorizada da equipe. |
| APIs de treino sem login/titularidade | APIs verificam sessão, assinatura, manutenção e usuário alvo; aluno não pode consultar outro aluno. Administrador/coach podem consultar alvos autorizados. |
| Chat acessível por ID de sala | Ações validam participação; papel do remetente/leitor é derivado no servidor. Respostas precisam pertencer à mesma sala. Escritas diretas nas tabelas de salas, mensagens e reuniões foram revogadas. |
| Conclusão de sessão alheia | RPC valida proprietário e bloqueia a sessão durante a gravação. Volume é calculado apenas com séries concluídas; duração é calculada a partir do início quando não informada. |
| Séries/sessões duplicadas | Criação da sessão é serializada e reutiliza a sessão existente. Registro repetido da mesma série atualiza o registro; sessões concluídas não aceitam novas séries. |
| Calendário de treino incorreto | Treino respeita dia e semana da atribuição, inclui os programas elegíveis e não libera automaticamente o próximo dia em um descanso. Kits com exercícios diretos geram dias executáveis e acompanham alterações do administrador. |
| Perda de progresso visual de treino | Séries já registradas são carregadas ao reabrir o treino. A sessão começa por ação explícita do aluno. |
| Bloqueio apenas visual | Operações pagas verificam acesso no servidor e políticas RLS restritivas complementam as regras de titularidade. Conta permanece acessível para regularização da assinatura. |
| Dieta com alimentos/macros fictícios | Tela usa os itens dos kits atribuídos. Consumo é registrado e pode ser desfeito. Nutrientes respeitam quantidade e porção cadastradas; unidades incompatíveis são sinalizadas e excluídas do cálculo. |
| Hidratação temporária | Quantidades exatas em ml, histórico, meta, lembretes, frequência e silêncio são persistidos. Sem arredondar ingestão personalizada em copos. |
| Suplementos com indicadores fictícios | Acompanhamento usa doses dos kits reais, com horários ou doses sem horário informado. Estoque e prescrições demonstrativos foram retirados. |
| Dashboard com estados vazios incondicionais | Mostra rotina, água, peso/sono registrados, próxima refeição pendente, notificações recebidas, mensagens não lidas e reuniões futuras. |
| Desempenho misturando dados fictícios | Mantidas métricas calculadas dos treinos; removidos percentuais demonstrativos e a fórmula artificial de adesão. Registros de peso/sono e dias de acompanhamento vêm do banco. |
| Lista de compras e Mais incompletos | Compras são derivadas dos alimentos atribuídos, com marcações por semana e cópia da lista. Mais contém atalhos funcionais. Quantidades são identificadas como consumo de um dia, sem inventar uma prescrição semanal. |
| Dados de rotina sem visão administrativa | Ficha do aluno no administrador consulta o mesmo serviço, exibe itens/consumo e permite ajustar a meta e preferências de hidratação do aluno selecionado. |
| Login enviando ao site público | Login/cadastro de aluno direcionam ao dashboard autenticado. |
| Recuperação de senha incompleta | Implementados callback de autenticação e formulário de nova senha; destino do callback é limitado a rotas internas previstas. |
| Falhas de consulta parecendo ausência de dados | Novos fluxos e leituras essenciais de treino, métricas, manutenção e mensagens propagam falhas e registram diagnóstico no servidor. O painel tem estado de erro com nova tentativa. |
| Kits futuros/vencidos exibidos como atuais | Rotina considera status, início, fim inclusivo, existência do kit e exclusão. A visão administrativa de atribuições mantém datas para gerenciamento. |
| Lembretes desconectados das atribuições | Cron usa o mesmo serviço de rotina e os kits reais. Não cria lembrete para consumo já concluído; respeita preferências, silêncio, assinatura e manutenção. Há deduplicação no banco e nova conferência antes do push. |
| Histórico truncado pelo limite da API | Registros de rotina, água, sessões e séries usados nas métricas são lidos com paginação. |

Os registros de consumo guardam o snapshot nutricional do momento da confirmação. Editar um alimento no catálogo não altera retroativamente o que o aluno já registrou.

## Migrações novas

Aplicar nesta ordem, sobre um banco que já tenha as migrações até `000024`:

1. `supabase/migrations/000025_student_routine_security.sql`: proteção de perfil, privacidade, registros/preferências de rotina, compras, hidratação, políticas de acesso e deduplicação de notificações.
2. `supabase/migrations/000026_workout_session_integrity.sql`: sincronização de exercícios diretos dos kits e operações transacionais de sessões/séries.
3. `supabase/migrations/000027_student_routine_integrity.sql`: validação transacional de consumo por atribuição e registro atômico de peso/sono.

As novas RPCs de escrita são executáveis apenas com service role. A aplicação confere o ator autenticado antes de chamá-las; a rotina também valida aluno, atribuição, item, dose e vigência dentro da transação.

A migração `000025` retira a chave de deduplicação de notificações legadas repetidas, preservando as notificações, antes de criar o índice único. A `000026` cria programas/dias a partir de exercícios diretos existentes que tenham dia da semana informado. Itens sem dia continuam precisando de agendamento pelo administrador.

É necessário publicar código e schema em uma mesma janela de atualização: os fluxos novos dependem dessas tabelas/funções. Fazer backup e testar primeiro em homologação. Não reaplicar as migrações históricas em um banco existente.

## Validações executadas

- `npm test`: **28 testes passaram**.
- As migrações do projeto, incluindo `000025`, `000026` e `000027`, foram aplicadas em PostgreSQL local em memória com PGlite. Os testes usam fixtures de Auth/Storage e publicação Realtime; não simulam entrega de e-mail, armazenamento externo ou eventos reais de Realtime.
- Testes cobrem isolamento entre alunos, privacidade, alteração indevida de papel, assinatura/manutenção, APIs, salas, callbacks, datas, doses, cálculo nutricional, consumo idempotente, saúde atômica, sessões e séries.
- `npm run typecheck`: passou.
- `npm run lint`: passou, sem avisos ou erros do ESLint.
- `npm run build`: compilação de produção validada; resultado final em `auditoria-build.log`.
- Verificação visual dos componentes reais renderizados com fixtures, em **390 px e 1280 px**, sem rolagem horizontal em dieta, suplementos, hidratação e compras. Evidências locais em `artifacts/auditoria-ui/`. Isso não substitui teste autenticado ponta a ponta.

Arquivos de testes e instruções de repetição ficam em `tests/`.

## Homologação pendente no ambiente real

1. Configurar as variáveis de `.env.example` com valores válidos, sem versionar segredos.
2. Aplicar as três migrações novas e conferir o schema implantado antes de publicar o código.
3. Conferir Site URL e URLs de redirecionamento do Supabase para `/{locale}/auth/callback`, incluindo a recuperação com destino `/{locale}/reset-password`; validar o template de e-mail e a entrega.
4. Testar com administrador, aluno A e aluno B: atribuir/editar/remover kits, registrar/desfazer consumo, recarregar e verificar persistência, acompanhar os dados na ficha administrativa, executar treino, trocar mensagens, enviar/revisar exame e agendar reunião.
5. Confirmar buckets, uploads e URLs assinadas de exames/e-books; publicação e entrega efetiva de Realtime; VAPID, assinatura push e cron autorizado.
6. Validar Stripe/Asaas em ambiente de teste: pagamento, liberação, cancelamento, expiração e reenvio de webhook. Não foram feitas cobranças.
7. Repetir isolamento e bloqueio com assinatura vencida/manutenção no Supabase implantado.

O código de exames, e-books e pagamentos já possuía integração. Foram reforçados os bloqueios de acesso necessários; sua operação externa continua dependente da configuração e homologação acima.
