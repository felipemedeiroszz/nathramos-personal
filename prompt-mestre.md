# PROMPT MESTRE — DESENVOLVIMENTO COMPLETO DA PLATAFORMA FITNESS

## 0. INSTRUÇÃO PRINCIPAL PARA A IA DESENVOLVEDORA

Você é uma IA especializada em arquitetura de software, desenvolvimento Full Stack, UX/UI, segurança, sistemas SaaS, pagamentos recorrentes e aplicações PWA.

Sua tarefa é construir uma **plataforma fitness SaaS completa**, profissional, escalável e pronta para produção.

A plataforma será utilizada inicialmente no:

* Brasil
* Estados Unidos

Ela deverá funcionar em:

* Português do Brasil — PT-BR
* Inglês dos Estados Unidos — EN-US

A aplicação será uma:

**PWA — Progressive Web App**

com:

* Site público
* Área autenticada do aluno
* Painel administrativo
* Sistema de assinaturas
* Stripe
* ASAAS
* PIX
* Cartão
* Supabase
* Supabase Auth
* Supabase PostgreSQL
* Supabase Storage
* Supabase Realtime

---

# 1. STACK OBRIGATÓRIA

Não substituir a stack sem necessidade.

## Frontend

Utilizar:

* Next.js
* React
* TypeScript
* Next.js App Router
* Tailwind CSS
* CSS moderno
* Componentes reutilizáveis
* PWA

## Backend

Utilizar:

* Next.js Server Components
* Server Actions quando apropriado
* Route Handlers
* API Routes
* Middleware
* Serviços server-side

## Banco

Utilizar:

* Supabase
* PostgreSQL

## Autenticação

Utilizar:

* Supabase Auth

## Storage

Utilizar:

* Supabase Storage

## Tempo real

Utilizar:

* Supabase Realtime

Principalmente para:

* Chat
* Notificações
* Atualizações em tempo real quando necessário

## Pagamentos

Brasil:

* ASAAS
* PIX
* Cartão

Estados Unidos:

* Stripe
* Cartão

## Validação

Utilizar:

* Zod

## Tipagem

TypeScript strict.

Evitar `any`.

## Ícones

Utilizar somente:

* SVG
* CSS
* componentes vetoriais
* biblioteca de ícones SVG, como Lucide, se necessário

### PROIBIDO:

EMOJIS NA INTERFACE.

Não utilizar emojis como ícones.

---

# 2. OBJETIVO DO PRODUTO

A plataforma será um sistema de acompanhamento fitness personalizado.

O aluno terá acesso a:

* Treinos
* Dietas
* Hidratação
* Suplementação
* Exames
* E-books
* Lista de compras
* Histórico de desempenho
* Fotos de evolução
* Peso
* Sono
* Mentoria
* Chat
* Reuniões
* Acompanhamento de pagamentos

O administrador/profissional terá controle completo sobre:

* Alunos
* Treinos
* Exercícios
* Dietas
* Alimentos
* Suplementos
* Exames
* E-books
* Kits
* Mentoria
* Financeiro
* Assinaturas
* Conteúdo
* Redes sociais

---

# 3. REGRA FUNDAMENTAL — NÃO CONSTRUIR TUDO DE UMA VEZ

O projeto deverá ser desenvolvido por fases.

Não tentar criar todas as funcionalidades simultaneamente.

A ordem deverá ser:

```text
FASE 1
Arquitetura + projeto base

↓

FASE 2
Banco + autenticação + segurança

↓

FASE 3
Internacionalização

↓

FASE 4
Design System

↓

FASE 5
Site público

↓

FASE 6
Assinaturas + Stripe + ASAAS

↓

FASE 7
Área do aluno

↓

FASE 8
Painel administrativo

↓

FASE 9
Treinos

↓

FASE 10
Dietas

↓

FASE 11
Desempenho

↓

FASE 12
Suplementos/Hidratação/Exames/E-books

↓

FASE 13
Mentoria

↓

FASE 14
Financeiro

↓

FASE 15
PWA/Push

↓

FASE 16
Segurança/Testes

↓

FASE 17
Deploy
```

Depois de cada fase:

1. testar
2. corrigir
3. verificar banco
4. verificar segurança
5. verificar responsividade
6. verificar PT-BR
7. verificar EN-US
8. somente então avançar

---

# 4. REGRA DE NÃO DESTRUIR FUNCIONALIDADES EXISTENTES

Durante o desenvolvimento:

* não remover funcionalidades funcionando
* não substituir componentes sem necessidade
* não apagar migrations antigas
* não modificar schema de maneira destrutiva sem migração
* não quebrar autenticação
* não quebrar pagamentos
* não quebrar RLS

Antes de alterações importantes:

1. analisar dependências
2. identificar impacto
3. criar migration
4. testar
5. aplicar

---

# 5. IDENTIDADE VISUAL

A plataforma terá identidade:

**PREMIUM + FITNESS + TECNOLOGIA + PERFORMANCE**

Paleta:

### Preto

Cor predominante.

### Amarelo

Cor principal de destaque.

### Branco

Texto principal.

### Cinza

Elementos secundários.

Não criar uma interface excessivamente colorida.

---

# 6. DARK MODE OBRIGATÓRIO

A plataforma será:

**DARK FIRST**

Não implementar Light Mode inicialmente.

Utilizar tokens centralizados.

Exemplo conceitual:

```css
--background
--surface
--surface-secondary
--primary
--primary-foreground
--text
--text-secondary
--border
--muted
```

Não espalhar valores hex diretamente pelos componentes.

---

# 7. ÍCONES — REGRA ABSOLUTA

Não utilizar emojis.

PROIBIDO:

```text
Home = emoji
Dieta = emoji
Treino = emoji
Água = emoji
Suplemento = emoji
```

Utilizar SVG.

Preferência:

**Lucide Icons**

ou outro sistema SVG consistente.

Todos os ícones devem ter:

* mesma linguagem visual
* espessura consistente
* tamanhos padronizados
* estados ativo/inativo
* acessibilidade

---

# 8. MOBILE BOTTOM NAVIGATION

O menu mobile deverá ser:

**Dark Mobile Bottom Navigation with Yellow Circular Active Tab**

Estrutura:

```text
Dashboard
Dieta
Treino
Meu Desempenho
Mais
```

A barra será preta/dark.

O item ativo terá:

**círculo amarelo**

com o ícone SVG centralizado.

Conceito:

```text
             [ SVG ]
          ┌───────────┐
          │   ATIVO   │
          │  AMARELO  │
          └───────────┘
```

Os itens inativos:

* SVG branco/cinza
* sem círculo amarelo

Ao mudar de página, o indicador deverá possuir uma transição suave.

---

# 9. SAFE AREA MOBILE

A bottom navigation deverá respeitar:

```css
env(safe-area-inset-bottom)
```

principalmente no iPhone.

Nunca permitir que o menu cubra conteúdo.

Todas as páginas mobile devem possuir espaço inferior suficiente.

---

# 10. DESKTOP

No desktop:

* substituir bottom navigation por sidebar
* manter identidade visual
* sidebar dark
* item ativo amarelo
* ícones SVG

---

# 11. DESIGN SYSTEM

Criar componentes reutilizáveis:

```text
Button
Input
Select
Textarea
Modal
Dialog
Drawer
Card
Badge
Avatar
Tabs
Table
Dropdown
Toast
Tooltip
Progress
Skeleton
Pagination
Calendar
FileUpload
VideoPlayer
Chart
EmptyState
ErrorState
LoadingState
```

Não duplicar componentes.

---

# 12. INTERNACIONALIZAÇÃO

A aplicação deve ser bilíngue desde o início.

Idiomas:

```text
pt-BR
en-US
```

O idioma deverá ser armazenado no perfil do usuário.

O usuário poderá trocar o idioma.

---

# 13. CONTEÚDO ADMINISTRATIVO BILÍNGUE

REGRA FUNDAMENTAL:

Todo conteúdo criado pelo administrador que seja exibido ao aluno deverá possuir dois idiomas.

Exemplo:

```text
name_pt
name_en

description_pt
description_en

instructions_pt
instructions_en
```

Isso vale para:

* exercícios
* treinos
* categorias
* dietas
* alimentos
* refeições
* suplementos
* kits
* e-books
* reuniões
* conteúdos
* mensagens automáticas
* categorias

---

# 14. BOTÃO DE TRADUÇÃO

No painel administrativo, quando possível, disponibilizar:

```text
Traduzir automaticamente
```

O sistema poderá gerar a tradução do conteúdo.

Porém:

**A tradução automática nunca deverá substituir a possibilidade de edição manual.**

O administrador sempre poderá corrigir.

---

# 15. DADOS QUE NÃO PRECISAM DE DUPLICAÇÃO

Dados pessoais não precisam de dois idiomas:

```text
Nome
E-mail
Telefone
Peso
Altura
Data de nascimento
```

---

# 16. SITE PÚBLICO

Criar:

```text
/
 /sobre
 /como-funciona
 /treinos
 /dietas
 /desempenho
 /mentoria
 /planos
 /faq
 /login
 /cadastro
 /termos
 /privacidade
```

O site deverá ser SEO-friendly.

---

# 17. HOME

A Home deverá apresentar:

### Hero

Mensagem forte sobre:

* acompanhamento
* treino
* dieta
* evolução

CTA:

```text
Começar agora
```

### Benefícios

* Treinos personalizados
* Dietas
* Acompanhamento
* Hidratação
* Suplementação
* Mentoria

### Como funciona

```text
1. Crie sua conta
2. Escolha seu plano
3. Receba seu planejamento
4. Treine
5. Registre sua evolução
6. Acompanhe seus resultados
```

### Planos

Mostrar planos cadastrados pelo administrador.

### FAQ

Sistema bilíngue.

---

# 18. CADASTRO

Campos:

```text
Nome
Sobrenome
E-mail
Telefone
Senha
Data de nascimento
Sexo
Altura
Peso
País
Idioma
```

Utilizar Supabase Auth.

---

# 19. PERFIS

Roles:

```text
admin
student
```

O sistema deverá possuir proteção de rotas.

---

# 20. ADMIN

Nunca confiar no frontend para determinar:

```text
role
permissions
payment_status
subscription_status
```

O backend deverá validar tudo.

---

# 21. SUPABASE AUTH

Implementar:

* Login
* Logout
* Cadastro
* Recuperação de senha
* Confirmação de e-mail
* Sessão persistente
* Refresh de sessão

---

# 22. BANCO DE DADOS

Criar schema PostgreSQL organizado.

Principais tabelas:

```text
profiles

plans
subscriptions
payments
webhook_events

workout_categories
workouts
exercises
workout_exercises
workout_sets
workout_kits
workout_kit_items
student_workout_kits

diet_categories
diets
diet_meals
diet_foods
diet_kits
diet_kit_meals
student_diet_kits

supplements
supplement_kits
supplement_kit_items
student_supplement_kits

hydration_settings
hydration_logs

sleep_logs

progress_records
progress_photos
weight_records

exams
exam_comments

ebooks

shopping_lists
shopping_list_items

conversations
conversation_participants
messages

meetings

notifications

social_links

audit_logs
```

---

# 23. UUID

Utilizar UUID para entidades públicas.

Evitar IDs sequenciais expostos ao frontend quando não forem necessários.

---

# 24. TIMESTAMPS

Utilizar timestamps consistentes.

Preferência:

```text
timestamptz
```

Armazenar datas de forma consistente e converter para timezone do usuário na interface.

---

# 25. RLS

Implementar Row Level Security.

Exemplo:

Aluno só pode:

```text
visualizar seu próprio perfil
visualizar seus próprios treinos
visualizar seus próprios registros
visualizar seus exames
visualizar suas fotos
visualizar suas mensagens
```

Admin autorizado poderá gerenciar conteúdo.

---

# 26. STORAGE

Criar buckets:

```text
avatars
exercise-images
exercise-videos
progress-photos
exams
ebooks
chat-attachments
```

Arquivos privados deverão utilizar URLs assinadas quando necessário.

---

# 27. UPLOAD

Todo upload deve validar:

* MIME type
* extensão
* tamanho
* autorização
* usuário

Nunca confiar somente na extensão.

---

# 28. PAGAMENTOS

Implementar camada:

```text
PaymentProvider
```

Providers:

```text
StripeProvider
AsaasProvider
```

O sistema deve poder adicionar outros gateways futuramente.

---

# 29. STRIPE

Utilizar Stripe para:

* clientes
* produtos
* preços
* assinaturas
* checkout
* pagamentos
* cancelamentos
* webhooks

Nunca confirmar assinatura somente pelo frontend.

---

# 30. ASAAS

Utilizar ASAAS para Brasil.

Suportar:

* PIX
* cartão
* assinaturas
* cobranças
* webhooks
* cancelamentos

---

# 31. WEBHOOKS

Endpoints:

```text
/api/webhooks/stripe
/api/webhooks/asaas
```

Validar autenticidade.

Criar:

```text
webhook_events
```

Campos:

```text
provider
event_id
event_type
payload
processed
processed_at
```

Processar eventos de forma idempotente.

---

# 32. ASSINATURAS

Estados:

```text
active
pending
past_due
grace_period
blocked
cancelled
expired
```

Registrar:

```text
started_at
current_period_start
current_period_end
due_date
cancelled_at
```

---

# 33. REGRA DOS 3 DIAS

O aluno terá acesso normal enquanto estiver em dia.

Quando houver atraso:

```text
PENDING
```

Inicia período de tolerância.

Após:

**3 dias de atraso**

bloquear conteúdo.

O aluno verá somente:

```text
Sua assinatura está atrasada.

Regularize seu pagamento para continuar.

[ Regularizar pagamento ]
```

Continuar permitindo acesso mínimo a:

* conta
* assinatura
* pagamento
* suporte

Após webhook confirmar pagamento:

```text
blocked
↓
active
```

---

# 34. FUNÇÃO CENTRAL DE ACESSO

Criar uma função server-side:

```text
canAccessPlatform(userId)
```

Ela deverá verificar:

```text
autenticação
role
assinatura
status
data de vencimento
período de tolerância
```

Não duplicar essa regra em cada página.

---

# 35. DASHBOARD DO ALUNO

Mostrar:

```text
Saudação

Treino de hoje

Próxima refeição

Hidratação

Sono

Peso

Progresso

Mentoria

Notificações
```

Cards modernos.

---

# 36. DIETA

Categorias:

```text
Café da manhã
Almoço
Lanche
Lanche da tarde
Jantar
```

Cada refeição mostra:

```text
Alimento
Quantidade
Peso
Calorias
Proteína
Carboidratos
Gorduras
```

Conteúdo bilíngue.

---

# 37. TREINO

O aluno verá o treino do dia.

Exercício:

```text
Nome
Descrição
Vídeo
Imagem
Séries
Repetições
Descanso
```

Durante cada série:

```text
Peso
Repetições
Concluído
```

Salvar tudo no histórico.

---

# 38. HISTÓRICO DE CARGA

Exemplo:

```text
Supino

Semana 1
20kg

Semana 2
22kg

Semana 3
24kg
```

Preparar gráficos.

---

# 39. LIMITE DE TREINOS

Cada aluno poderá possuir até:

**6 treinos ativos atribuídos.**

Não permitir mais que 6 pela regra de negócio.

---

# 40. KIT DE TREINO

Criar kits reutilizáveis.

Exemplo:

```text
Kit Iniciante

Treino A
Treino B
Treino C
Treino D
```

Outro:

```text
Kit Avançado

Treino A
Treino B
Treino C
Treino D
Treino E
Treino F
```

Depois:

```text
Kit → Aluno
```

---

# 41. DIETA ADMINISTRATIVA

Administrador poderá criar:

```text
Nome PT
Nome EN
Descrição PT
Descrição EN
Refeições
Alimentos
Quantidades
Macros
Calorias
```

---

# 42. KIT DIETA

Criar:

```text
Básico
Médio
Avançado
```

Cada kit possui:

```text
Café da manhã
Almoço
Lanche
Lanche da tarde
Jantar
```

Atribuir kit ao aluno.

---

# 43. SUPLEMENTOS

Campos:

```text
Nome PT
Nome EN

Descrição PT
Descrição EN

Quantidade
Unidade
Frequência
```

Exemplo:

```text
Creatina
5g
1x ao dia
```

---

# 44. KIT SUPLEMENTOS

Criar kits:

```text
Básico
Hipertrofia
Performance
```

Atribuir ao aluno.

---

# 45. HIDRATAÇÃO

Utilizar peso e altura do aluno.

A fórmula deve ser implementada de forma configurável e não hardcoded de forma irreversível.

Gerar meta diária.

Fracionar em horários.

Aluno poderá registrar consumo.

Dashboard mostra:

```text
Consumido
Meta
Restante
```

---

# 46. SONO

Registrar:

```text
Data
Hora de dormir
Hora de acordar
Horas
```

Gerar gráfico de 30 dias.

---

# 47. DESEMPENHO

Abas:

```text
Gráficos
Comparar
```

Gráficos iniciais:

```text
Água — 30 dias
Sono — 30 dias
Peso — histórico
```

Preparar arquitetura para adicionar:

```text
medidas
calorias
treinos
cargas
```

---

# 48. FOTOS DE EVOLUÇÃO

Mensalmente:

```text
Frente
Costas
Perfil esquerdo
Perfil direito
Peso
```

Salvar no Storage.

Comparar:

```text
Setembro vs Outubro
```

Criar slider antes/depois.

---

# 49. EXAMES

Aluno poderá enviar:

**máximo 5 arquivos por mês.**

Formatos:

```text
JPG
JPEG
PNG
PDF
```

Admin:

* visualizar
* comentar

Aluno:

* visualizar comentário

---

# 50. E-BOOKS

Admin:

```text
Título PT
Título EN
Descrição PT
Descrição EN
Capa
PDF
```

Aluno vê apenas publicados.

---

# 51. LISTA DE COMPRAS

Gerar baseada na dieta.

Períodos:

```text
7 dias
15 dias
30 dias
```

Agrupar alimentos.

Aluno poderá marcar como comprado.

---

# 52. MENTORIA

Chat:

```text
student ↔ admin/professor
```

Usar Supabase Realtime.

Recursos:

* mensagens
* não lidas
* anexos
* timestamps
* status

---

# 53. REUNIÕES

Admin cria:

```text
Título PT
Título EN
Descrição PT
Descrição EN
Data
Hora
Link externo
```

Aluno recebe.

---

# 54. NOTIFICAÇÕES

Criar sistema:

```text
notifications
```

Tipos:

```text
payment
workout
diet
exam
message
meeting
ebook
system
```

---

# 55. PAINEL ADMINISTRATIVO

Sidebar:

```text
Dashboard
Alunos

Treinos
Categorias
Dietas
Suplementos
Exames
E-books

Kit Treinos
Kit Dietas
Kit Suplementos

Financeiro
Mentoria
Redes Sociais
Configurações
```

---

# 56. DASHBOARD ADMIN

Cards:

```text
Total de alunos
Ativos
Pendentes
Atrasados
Bloqueados

Receita mensal
Assinaturas ativas
Cancelamentos
```

Gráficos.

---

# 57. ALUNOS

Tabela:

```text
Foto
Nome
E-mail
Telefone
Plano
Status
Vencimento
Gateway
```

Filtros.

---

# 58. PERFIL DO ALUNO NO ADMIN

Mostrar:

```text
Dados
Assinatura
Pagamentos
Treinos
Dieta
Suplementos
Desempenho
Fotos
Exames
Mentoria
```

Permitir atribuir kits.

---

# 59. FINANCEIRO

Dashboard:

```text
Receita
Pagamentos
Assinaturas
Atrasados
Cancelamentos
```

Filtros:

```text
Hoje
7 dias
30 dias
Mês
Ano
```

Separar:

```text
Stripe
ASAAS
```

---

# 60. AUDITORIA

Criar:

```text
audit_logs
```

Registrar ações administrativas importantes.

Exemplo:

```text
Admin alterou dieta do aluno X.
Admin adicionou treino.
Admin alterou assinatura.
Admin comentou exame.
```

---

# 61. PWA

Implementar:

```text
manifest
service worker
icons
install prompt
splash
```

O app deverá ser instalável.

Não armazenar dados sensíveis indiscriminadamente em cache.

---

# 62. PUSH NOTIFICATIONS

Preparar arquitetura para notificações push.

Exemplos:

```text
Seu treino está disponível.
Hora de beber água.
Você recebeu uma mensagem.
Sua assinatura está vencendo.
```

---

# 63. RESPONSIVIDADE

Mobile-first.

Testar pelo menos:

```text
390px
412px
430px
768px
1024px
1280px
1440px
```

---

# 64. ACESSIBILIDADE

Implementar:

* labels
* contraste
* keyboard navigation
* foco
* aria
* alt
* semantic HTML

---

# 65. SEO

Site público:

* metadata
* OpenGraph
* sitemap
* robots
* canonical
* URLs amigáveis
* Schema.org quando apropriado

Área privada:

```text
noindex
```

---

# 66. SEGURANÇA

Implementar:

* RLS
* validação server-side
* Zod
* proteção de rotas
* rate limiting
* validação de upload
* URLs assinadas
* proteção de webhook
* idempotência
* controle de permissões

Nunca colocar secrets no client.

---

# 67. VARIÁVEIS DE AMBIENTE

Criar:

```text
.env.example
```

Com:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

ASAAS_API_KEY=
ASAAS_WEBHOOK_TOKEN=
ASAAS_ENVIRONMENT=

NEXT_PUBLIC_APP_URL=
```

Secrets nunca devem ser enviados ao browser.

---

# 68. ESTRUTURA DE PROJETO

Utilizar arquitetura organizada.

Exemplo:

```text
src/

app/
  (public)/
  (auth)/
  (student)/
  admin/
  api/

components/
  ui/
  shared/
  student/
  admin/

lib/
  supabase/
  stripe/
  asaas/
  payments/
  auth/
  i18n/

services/
  students/
  workouts/
  diets/
  supplements/
  payments/
  subscriptions/
  mentorship/

hooks/
types/
schemas/
config/
```

---

# 69. SERVICES

Regras de negócio importantes devem ficar em services.

Exemplo:

```text
SubscriptionService
PaymentService
WorkoutService
DietService
StudentService
MentorshipService
NotificationService
```

Não colocar toda regra dentro das páginas React.

---

# 70. COMPONENTES

Criar componentes reutilizáveis.

Nunca duplicar:

```text
Button
Modal
Card
Input
Upload
Table
```

---

# 71. TESTES

Criar testes para:

### Autenticação

* login
* logout
* recuperação

### Pagamentos

* webhook Stripe
* webhook ASAAS
* renovação
* atraso
* bloqueio
* desbloqueio

### Permissões

* aluno
* admin

### Treino

* conclusão
* séries
* peso
* histórico
* limite de 6 treinos

### Dieta

* kit
* refeições
* alimentos

### Upload

* exames
* fotos
* e-books

---

# 72. TESTE CRÍTICO DE PAGAMENTO

Simular:

```text
Pagamento aprovado
↓
Webhook
↓
Banco atualizado
↓
Aluno ativo
```

Depois:

```text
Pagamento atrasado
↓
3 dias
↓
Bloqueio
```

Depois:

```text
Pagamento realizado
↓
Webhook
↓
Aluno desbloqueado
```

Tudo deverá ser validado no backend.

---

# 73. TESTE DE SEGURANÇA

Testar:

```text
Aluno A tentando acessar dados do Aluno B
```

Resultado esperado:

```text
ACESSO NEGADO
```

Testar:

```text
Aluno tentando acessar /admin
```

Resultado:

```text
ACESSO NEGADO
```

Testar acesso direto a arquivos privados de outro usuário.

Resultado:

```text
ACESSO NEGADO
```

---

# 74. PERFORMANCE

Utilizar:

* Server Components
* lazy loading
* paginação
* índices
* queries eficientes
* cache apropriado
* otimização de imagens
* compressão

Evitar N+1 queries.

---

# 75. BANCO — ÍNDICES

Criar índices para campos frequentemente consultados:

```text
user_id
student_id
status
created_at
due_date
subscription_id
payment_id
language
```

Não criar índices indiscriminadamente.

---

# 76. SOFT DELETE

Para dados importantes, preferir:

```text
deleted_at
```

ou:

```text
is_active
```

em vez de apagar definitivamente.

Isso é especialmente importante para:

* exercícios
* dietas
* treinos
* suplementos
* kits

que podem possuir histórico.

---

# 77. HISTÓRICO

Nunca alterar registros históricos de treino de forma destrutiva.

Por exemplo:

Se um exercício mudar de nome posteriormente, o histórico antigo deverá continuar íntegro.

---

# 78. TIMEZONE

O sistema deve considerar timezone do usuário.

Brasil:

```text
America/Sao_Paulo
```

Estados Unidos:

suportar timezone apropriado do usuário.

Não assumir que todos os usuários estão no mesmo timezone.

---

# 79. MOEDA

Usuários poderão estar em mercados diferentes.

Preparar:

```text
BRL
USD
```

Planos deverão possuir moeda.

Não hardcodar:

```text
R$
```

na interface.

---

# 80. FORMATAÇÃO

PT-BR:

```text
R$ 199,90
```

EN-US:

```text
$199.90
```

Datas também devem respeitar locale.

---

# 81. ASSINATURA INTERNACIONAL

O usuário deverá receber a experiência adequada ao país.

Brasil:

```text
ASAAS
PIX
BRL
```

EUA:

```text
Stripe
USD
```

Porém a arquitetura deve permitir configuração futura de métodos diferentes.

---

# 82. ADMIN — CAMPOS BILÍNGUES

Exemplo de formulário:

```text
EXERCÍCIO

PORTUGUÊS

Nome
[________________]

Descrição
[________________]

Instruções
[________________]


ENGLISH

Name
[________________]

Description
[________________]

Instructions
[________________]
```

Não esconder completamente o segundo idioma.

O administrador deverá conseguir revisar os dois.

---

# 83. AUTO TRADUÇÃO

Se implementada:

```text
[ Traduzir para inglês ]
```

O sistema preenche:

```text
name_en
description_en
instructions_en
```

O administrador revisa.

---

# 84. ADMIN — UPLOAD DE VÍDEOS

Permitir:

* upload
* preview
* substituir
* remover

Utilizar Supabase Storage.

Não colocar vídeos grandes diretamente no PostgreSQL.

---

# 85. VÍDEO DO EXERCÍCIO

No aluno:

```text
Vídeo do exercício
```

Player responsivo.

Evitar autoplay com som.

---

# 86. DASHBOARD — EXPERIÊNCIA

O dashboard deverá responder rapidamente.

Mostrar primeiro:

```text
Treino de hoje
Próxima refeição
Hidratação
```

Depois:

```text
Desempenho
Sono
Mentoria
```

---

# 87. EMPTY STATES

Se aluno não possuir treino:

```text
Seu treino ainda não foi configurado.
```

Se não houver dieta:

```text
Sua dieta ainda não foi configurada.
```

Nunca deixar tela vazia.

---

# 88. LOADING

Utilizar skeleton loaders.

Não mostrar telas completamente vazias durante carregamento.

---

# 89. ERROS

Mensagens amigáveis.

Nunca exibir stack trace ao usuário.

Logs técnicos somente no servidor.

---

# 90. LOGS

Criar logging estruturado.

Registrar:

* erros
* webhooks
* pagamentos
* falhas importantes

Nunca registrar secrets.

---

# 91. CONFORMIDADE E PRIVACIDADE

A plataforma poderá lidar com informações sensíveis, incluindo exames.

Considerar:

* LGPD
* princípios de privacidade aplicáveis aos EUA
* consentimento
* política de privacidade
* exclusão de conta
* proteção de arquivos
* controle de acesso

Não expor exames publicamente.

---

# 92. CONTA DO USUÁRIO

Permitir:

```text
Editar perfil
Alterar senha
Alterar idioma
Alterar foto
Visualizar assinatura
Gerenciar pagamento
Solicitar exclusão da conta
Logout
```

---

# 93. TELA DE ASSINATURA

Mostrar:

```text
Plano atual
Valor
Periodicidade
Status
Próximo vencimento
Método de pagamento
Histórico
```

Se atrasado:

```text
Pagamento pendente
```

CTA:

```text
Regularizar pagamento
```

---

# 94. CANCELAMENTO

O cancelamento deve respeitar regras do gateway.

Registrar:

```text
cancelled_at
cancellation_reason
```

Não apagar histórico financeiro.

---

# 95. FINANCEIRO ADMIN

Mostrar:

```text
Receita total
Receita mensal
Receita Stripe
Receita ASAAS
Assinaturas
Pagamentos
Atrasados
Cancelados
```

Permitir filtros.

---

# 96. EXPORTAÇÃO

Preparar futuramente exportação de:

* alunos
* pagamentos
* relatórios

CSV quando apropriado.

---

# 97. FUTURO

Arquitetura deve permitir posteriormente:

* aplicativo nativo
* Apple Health
* Google Fit / Health Connect
* wearable
* integração com WhatsApp
* IA para análise
* notificações avançadas
* múltiplos profissionais
* planos corporativos
* afiliados
* cupons
* marketplace

Não implementar agora, mas não criar arquitetura que impeça essas expansões.

---

# 98. MULTI-PROFISSIONAL — PREPARAR ARQUITETURA

Mesmo que inicialmente exista apenas um administrador, não criar estrutura impossível de expandir.

Futuramente poderá existir:

```text
admin
coach
nutritionist
support
```

Preparar permissões.

Não é necessário implementar todos agora.

---

# 99. DASHBOARD DO ADMIN — PERMISSÕES

Um usuário admin não necessariamente terá acesso irrestrito no futuro.

Preparar:

```text
permissions
roles
```

---

# 100. RESULTADO FINAL

Ao terminar, a plataforma deverá possuir:

```text
SITE PÚBLICO
        ↓
CADASTRO
        ↓
PLANO
        ↓
PAGAMENTO
        ↓
ASSINATURA
        ↓
DASHBOARD
        ↓
┌─────────────────────────────┐
│ TREINO                      │
│ DIETA                       │
│ DESEMPENHO                  │
│ HIDRATAÇÃO                  │
│ SUPLEMENTOS                 │
│ EXAMES                      │
│ E-BOOKS                     │
│ LISTA DE COMPRAS            │
│ MENTORIA                    │
└─────────────────────────────┘
```

E:

```text
ADMIN
 │
 ├── Alunos
 ├── Treinos
 ├── Categorias
 ├── Dietas
 ├── Suplementos
 ├── Exames
 ├── E-books
 ├── Kit Treinos
 ├── Kit Dietas
 ├── Kit Suplementos
 ├── Financeiro
 ├── Mentoria
 └── Redes Sociais
```

---

# 101. CRITÉRIO DE CONCLUSÃO

A aplicação somente será considerada pronta quando:

* todas as rotas estiverem funcionando
* autenticação estiver funcionando
* RLS estiver implementado
* Storage estiver protegido
* Stripe estiver integrado
* ASAAS estiver integrado
* webhooks estiverem funcionando
* inadimplência estiver funcionando
* bloqueio após 3 dias estiver funcionando
* desbloqueio automático estiver funcionando
* PT-BR estiver funcionando
* EN-US estiver funcionando
* conteúdo administrativo possuir campos bilíngues
* área do aluno estiver funcionando
* painel admin estiver funcionando
* PWA estiver funcionando
* mobile estiver funcionando
* desktop estiver funcionando
* não houver emojis na UI
* todos os ícones forem SVG/CSS
* bottom navigation estiver funcionando
* círculo amarelo do item ativo estiver funcionando
* testes principais estiverem passando
* erros críticos estiverem corrigidos
* segurança estiver validada

---

# 102. REGRA FINAL PARA A IA DESENVOLVEDORA

Não faça uma implementação superficial.

Não crie somente telas estáticas.

Não use dados fake como solução definitiva.

Não coloque regras importantes somente no frontend.

Não simule pagamentos.

Não simule autenticação.

Não crie apenas componentes visuais sem integração real.

O objetivo é construir uma **aplicação Full Stack real, funcional e preparada para produção**.

Quando uma funcionalidade depender de backend, banco, Storage ou webhook, implementar a integração real.

Quando uma decisão arquitetural precisar ser tomada, priorizar:

1. Segurança
2. Integridade dos dados
3. Escalabilidade
4. Manutenibilidade
5. Performance
6. UX

---

# 103. MODO DE EXECUÇÃO

A IA deverá trabalhar em etapas.

Para cada fase:

### PASSO 1

Explicar brevemente o que será implementado.

### PASSO 2

Criar/alterar os arquivos necessários.

### PASSO 3

Criar migrations quando necessário.

### PASSO 4

Implementar.

### PASSO 5

Executar testes/lint/typecheck.

### PASSO 6

Corrigir erros.

### PASSO 7

Verificar segurança.

### PASSO 8

Verificar mobile.

### PASSO 9

Verificar desktop.

### PASSO 10

Somente então avançar.

Não avançar para uma fase seguinte enquanto a fase atual possuir erros críticos.

---

# 104. PRIMEIRO PASSO DA IMPLEMENTAÇÃO

Antes de começar a escrever grande quantidade de código:

1. analisar toda esta especificação
2. definir arquitetura
3. definir estrutura de pastas
4. definir schema PostgreSQL
5. definir relacionamentos
6. definir RLS
7. definir Storage
8. definir roles
9. definir fluxo de assinatura
10. definir fluxo Stripe
11. definir fluxo ASAAS
12. definir internacionalização
13. definir Design System

Depois disso:

**iniciar a FASE 1.**

Não implementar funcionalidades futuras antecipadamente.

Construir a base de maneira sólida para que todas as fases seguintes sejam adicionadas sem necessidade de reconstruir o projeto.
