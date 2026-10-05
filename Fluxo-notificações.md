# REQUISITO CRÍTICO — NOTIFICAÇÕES COM PWA FECHADO

A plataforma DEVE suportar notificações Push reais mesmo quando o PWA estiver fechado.

Não implementar notificações utilizando apenas:

* setTimeout
* setInterval
* JavaScript em uma página aberta
* timers do navegador
* notificações somente dentro do dashboard

Essas abordagens não atendem ao requisito.

O sistema deve utilizar uma arquitetura real de Web Push/PWA, com Service Worker e backend responsável pelo agendamento e disparo das notificações.

---

# 1. COMPORTAMENTO ESPERADO

Exemplo:

O aluno possui:

Horário do almoço:
12:00

O aluno fecha completamente o PWA às 10:00.

Às 12:00, o sistema deve enviar uma Push Notification para o dispositivo:

"Hora do almoço"

"Seu almoço programado está disponível. Confira sua dieta."

A notificação deve aparecer no sistema operacional/dispositivo mesmo com:

* PWA fechado
* aba do navegador fechada
* navegador em segundo plano

desde que o dispositivo/navegador/plataforma ofereça suporte a Web Push e as permissões estejam concedidas.

---

# 2. SERVICE WORKER

Implementar um Service Worker dedicado às notificações.

O Service Worker deve:

* receber eventos Push
* exibir notificações
* tratar cliques
* abrir o PWA na rota correta
* focar uma janela existente quando possível
* abrir uma nova janela quando necessário
* tratar notificações agrupadas
* tratar notificações com dados personalizados

Exemplo de payload:

{
"title": "Hora do almoço",
"body": "Seu almoço programado está disponível.",
"url": "/dashboard/dieta",
"notification_id": "UUID",
"type": "meal_reminder"
}

---

# 3. WEB PUSH

Utilizar Web Push de forma real.

Implementar:

* Push API
* Notifications API
* Service Worker
* Push Subscription
* VAPID
* backend para envio
* gerenciamento de subscriptions

As credenciais VAPID devem permanecer exclusivamente no servidor.

Nunca colocar:

* VAPID private key
* secrets
* API keys
* credenciais de provedores

no frontend.

---

# 4. REGISTRO DO DISPOSITIVO

Quando o usuário aceitar notificações:

1. Registrar o Service Worker.
2. Solicitar permissão.
3. Criar Push Subscription.
4. Enviar a subscription para o backend.
5. Associar a subscription ao usuário autenticado.
6. Armazenar de forma segura no Supabase.

O mesmo usuário poderá possuir múltiplos dispositivos.

Exemplo:

Luís:

* Windows Chrome
* Android Chrome
* iPhone Safari, quando suportado pela plataforma
* outro computador

Cada dispositivo deve possuir sua própria subscription.

---

# 5. MULTI-DISPOSITIVO

Quando uma notificação for enviada:

O sistema deve poder enviar para todas as subscriptions válidas daquele usuário.

Exemplo:

Usuário possui:

2 dispositivos

Então:

"Hora de beber água"

pode chegar nos dois dispositivos.

O sistema deve permitir futuramente configurar preferências por dispositivo.

---

# 6. LIMPEZA DE SUBSCRIPTIONS INVÁLIDAS

Se o Push Service retornar uma resposta indicando que a subscription não existe mais ou não é válida:

* registrar o erro
* marcar a subscription como inválida
* remover/desativar a subscription
* não continuar tentando enviar indefinidamente

Isso evita desperdício de processamento.

---

# 7. CLIQUE NA NOTIFICAÇÃO

Ao clicar:

"Hora de beber água"

o sistema deve abrir:

/dashboard/hidratacao

Ao clicar:

"Hora do almoço"

abrir:

/dashboard/dieta

Ao clicar:

"Hora do treino"

abrir:

/dashboard/treino

Ao clicar:

"Nova mensagem"

abrir:

/dashboard/mentoria

Ao clicar:

"Reunião em 15 minutos"

abrir a tela da reunião.

A URL deve ser definida dinamicamente pelo backend através do payload.

---

# 8. NOTIFICAÇÃO COM O PWA COMPLETAMENTE FECHADO

O sistema deve funcionar mesmo quando:

* o usuário fechou a aba
* o usuário fechou a janela do navegador
* o PWA foi fechado
* nenhuma página da aplicação está aberta

Não depender de uma página React ativa para disparar a notificação.

O disparo deve ocorrer através da infraestrutura de Push + Service Worker + backend.

---

# 9. AGENDAMENTO NO BACKEND

Os horários não devem depender do computador do usuário.

Exemplo:

Aluno:

* almoço 12:00
* água 14:00
* treino 18:00
* jantar 20:00

O servidor deve controlar esses horários.

Criar um sistema de jobs/scheduler capaz de processar:

* notificações únicas
* notificações recorrentes
* notificações diárias
* notificações semanais
* notificações mensais
* notificações baseadas em eventos

---

# 10. TIMEZONE

O agendamento deve respeitar o timezone individual do usuário.

Exemplo:

Usuário Brasil:

America/Sao_Paulo

Usuário EUA:

timezone correspondente ao perfil/configuração.

Se o usuário viajar ou alterar seu timezone, a plataforma deve utilizar a configuração atualizada.

Nunca assumir que todos os usuários estão no mesmo timezone.

---

# 11. REGRAS DE HORÁRIO

O sistema deve respeitar:

* horário de silêncio
* preferências do usuário
* status da assinatura
* tarefa já concluída
* tarefa cancelada
* data inicial
* data final
* dias da semana
* timezone

Exemplo:

O almoço está marcado para 12:00.

Se o aluno já marcou o almoço como concluído às 11:50, o sistema não deve enviar o lembrete das 12:00.

---

# 12. NOTIFICAÇÕES AGRUPADAS

Evitar bombardear o usuário.

Se houver várias notificações muito próximas, a arquitetura deve permitir agrupamento.

Exemplo:

Em vez de:

"Hora da água"

"Hora do suplemento"

"Novo conteúdo"

"Treino disponível"

Enviar ou agrupar de maneira inteligente quando apropriado.

A lógica de agrupamento deve ser configurável por categoria.

---

# 13. ANDROID

O PWA deve ser preparado para funcionar com Push Notifications no Android através de navegadores compatíveis.

Testar especificamente:

* Chrome Android
* instalação do PWA
* PWA aberto
* PWA em segundo plano
* PWA fechado
* tela bloqueada, quando suportado pelo sistema
* permissão concedida
* permissão negada

---

# 14. DESKTOP

Testar:

* Chrome
* Edge
* PWA instalado
* navegador fechado
* navegador em segundo plano
* PWA fechado

O sistema deve utilizar a infraestrutura de Push suportada pelo navegador/OS.

---

# 15. IOS / SAFARI

A plataforma deve ser implementada considerando o suporte de Web Push do iOS/iPadOS para PWAs.

Detectar corretamente:

* dispositivo
* navegador
* instalação do PWA
* disponibilidade de Push
* permissão

Caso determinada combinação de dispositivo/OS/navegador não suporte uma funcionalidade específica, apresentar uma mensagem explicativa e não quebrar o restante da aplicação.

Não fingir suporte quando o dispositivo não oferecer a funcionalidade.

---

# 16. PERMISSÃO

Não solicitar permissão de Push imediatamente ao abrir o site.

Primeiro apresentar uma explicação:

"Receba lembretes da sua rotina"

"Ative as notificações para receber lembretes de água, refeições, treinos e suplementos mesmo quando o aplicativo estiver fechado."

Botão:

"ATIVAR NOTIFICAÇÕES"

Depois solicitar a permissão nativa do navegador.

---

# 17. STATUS DA PERMISSÃO

O sistema deve identificar:

* granted
* denied
* default
* unsupported

Mostrar ao usuário o estado atual.

Se estiver bloqueado pelo navegador:

"Suas notificações estão bloqueadas. Altere as permissões do navegador para receber lembretes."

---

# 18. FALLBACK

Push Notification é a principal forma de lembrete.

Porém, o sistema também deve possuir:

* Central de notificações
* notificações in-app
* badges
* agenda diária
* indicadores de tarefas pendentes

Assim, se Push estiver indisponível, a plataforma continua funcional.

---

# 19. ARQUITETURA

Criar uma camada central:

NotificationService

Responsável por:

* criar notificações
* agendar notificações
* cancelar notificações
* enviar Push
* controlar retries
* registrar entregas
* controlar subscriptions
* processar preferências
* verificar timezone
* verificar quiet hours
* verificar status da tarefa
* registrar logs

Os demais módulos não devem implementar seu próprio sistema de Push.

Exemplo:

HydrationService
→ NotificationService

MealService
→ NotificationService

WorkoutService
→ NotificationService

SupplementService
→ NotificationService

MentorshipService
→ NotificationService

PaymentService
→ NotificationService

Isso mantém a arquitetura organizada e escalável.

---

# 20. TESTE OBRIGATÓRIO

Antes de considerar a plataforma pronta, realizar testes reais:

Teste 1:

* instalar PWA
* ativar notificações
* fechar PWA
* aguardar horário
* verificar recebimento

Teste 2:

* PWA fechado
* receber lembrete de água
* clicar
* abrir tela de hidratação

Teste 3:

* PWA fechado
* receber lembrete de almoço
* clicar
* abrir dieta

Teste 4:

* PWA fechado
* receber lembrete de treino
* clicar
* abrir treino

Teste 5:

* múltiplos dispositivos
* verificar subscriptions independentes

Teste 6:

* cancelar permissão
* verificar fallback in-app

Teste 7:

* tarefa concluída antes do horário
* confirmar que lembrete não seja enviado

Teste 8:

* horário de silêncio
* confirmar comportamento correto

Teste 9:

* assinatura vencida/bloqueada
* confirmar regras de notificações

---

# 21. REGRA FUNDAMENTAL

NÃO considerar o sistema de notificações concluído simplesmente porque uma notificação aparece enquanto o site está aberto.

O requisito de aceitação é:

"Um usuário com Push autorizado deve conseguir receber notificações programadas mesmo quando o PWA estiver completamente fechado, dentro das capacidades e limitações do sistema operacional e navegador."

A implementação deve ser real, testável e adequada para produção.
