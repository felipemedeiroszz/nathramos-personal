# Cadastro de Webhooks — Stripe e Asaas

Guia completo para configurar os webhooks de pagamento da plataforma.
Os dois endpoints já estão implementados e são a **fonte de verdade** do status
das assinaturas: é o webhook que ativa, bloqueia e cancela o acesso do aluno.

| Provedor | Método | Endpoint | Arquivo |
|---|---|---|---|
| Stripe | `POST` | `/api/webhooks/stripe` | `src/app/api/webhooks/stripe/route.ts` |
| Asaas | `POST` | `/api/webhooks/asaas` | `src/app/api/webhooks/asaas/route.ts` |

URL de produção: `https://SEU_DOMINIO/api/webhooks/stripe` e `https://SEU_DOMINIO/api/webhooks/asaas`
(`${NEXT_PUBLIC_APP_URL}` + o caminho acima).

---

## 1. Variáveis de ambiente (`.env`)

```env
# URL pública da aplicação (origem das URLs de retorno e dos webhooks)
NEXT_PUBLIC_APP_URL="https://SEU_DOMINIO"

# --- Stripe ---
STRIPE_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."   # gerado ao criar o endpoint no Dashboard (ou pelo stripe listen)

# --- Asaas (PIX) ---
ASAAS_API_KEY="$aact_..."
ASAAS_ENVIRONMENT="production"       # "sandbox" em testes
ASAAS_WEBHOOK_TOKEN="um-token-forte-e-unico"
```

Regra de ouro: o `STRIPE_WEBHOOK_SECRET` é **por endpoint**. Ao criar o webhook
no Dashboard, copie o valor gerado e cole no `.env` (em produção, nas variáveis
de ambiente da hospedagem/Vercel). Sem ele, o endpoint responde `500` e nenhum
pagamento é processado.

---

## 2. STRIPE — como cadastrar

### 2.1 Produção (Stripe Dashboard)

1. Acesse **Developers → Webhooks → Add endpoint**.
2. **Endpoint URL:**
   ```
   https://SEU_DOMINIO/api/webhooks/stripe
   ```
3. Em **Select events**, clique em *Select types* e marque:

   | Evento | Para que serve |
   |---|---|
   | `customer.subscription.created` | Cria/atualiza a assinatura local (`trialing`/`active`/`incomplete`) |
   | `customer.subscription.updated` | Renovação, mudança de status, cancelamento agendado, falha |
   | `customer.subscription.deleted` | Cancelamento efetivo → status `canceled` |
   | `invoice.paid` | Confirma o pagamento e renova o período |
   | `invoice.payment_failed` | Falha na cobrança (cartão recusado / sem saldo) |
   | `charge.refunded` | Registra o reembolso do pagamento |
   | `checkout.session.completed` | Apenas para o fluxo legado (Stripe Checkout hospedado) |

   > Atenção: o checkout in-site usa a API de assinaturas direta
   > (`SetupIntent` + `subscriptions.create`), portanto **não gera**
   > `checkout.session.completed`. Os eventos de assinatura e fatura são
   > obrigatórios.

4. Clique em **Add endpoint** e copie o **Signing secret** (`whsec_...`).
5. Cole o valor em `STRIPE_WEBHOOK_SECRET` no `.env` de produção e faça o deploy.

### 2.2 Desenvolvimento local

```bash
# Encaminha os eventos do Stripe para o servidor local e imprime um whsec temporário
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Use o `whsec_...` exibido no terminal como `STRIPE_WEBHOOK_SECRET` do `.env` local.
Para reenviar/forçar eventos, use `stripe trigger invoice.payment_failed` (etc.).

### 2.3 Como o Stripe autentica

O header `stripe-signature` é validado em `StripeProvider.constructWebhookEvent()`
com o `STRIPE_WEBHOOK_SECRET`. Se a assinatura for inválida, a resposta é `400`;
se o segredo não estiver configurado, `500`.

### 2.4 Mapa de status (Stripe → assinatura local)

| Status Stripe | Status local | Acesso do aluno |
|---|---|---|
| `trialing` | `trialing` | Liberado até `trial_ends_at` |
| `active` | `active` | Liberado até `current_period_end` |
| `past_due` | `past_due` | Liberado só se a assinatura **já foi paga** (tolerância de `grace_days`) |
| `unpaid` | `past_due` | Idem acima |
| `incomplete` | `inactive` | Bloqueado (aguardando 3DS) |
| `incomplete_expired` | `expired` | Bloqueado |
| `canceled` | `canceled` | Liberado até `current_period_end`, depois bloqueado |
| `paused` | `inactive` | Bloqueado |

> Regra de segurança implementada: `invoice.payment_failed` em uma assinatura
> que **nunca foi paga** (primeira cobrança recusada por falta de saldo) mantém
> o status `inactive` — não concede tolerância. Só quem já pagou alguma vez
> entra no `past_due` com período de graça.

---

## 3. ASAAS — como cadastrar

### 3.1 Produção (Asaas Dashboard)

1. Acesse **Integrações → Webhooks → Adicionar webhook**.
2. **URL:**
   ```
   https://SEU_DOMINIO/api/webhooks/asaas?token=SEU_ASAAS_WEBHOOK_TOKEN
   ```
   O token também pode ser enviado pelo header `asaas-access-token` (o Asaas
   envia esse header automaticamente quando você preenche o campo
   *Token de autenticação* no cadastro). O endpoint aceita as duas formas.
3. **Token de autenticação:** informe exatamente o mesmo valor de
   `ASAAS_WEBHOOK_TOKEN`. Se os dois não baterem, o endpoint responde `401`.
4. **E-mail para notificações:** preencha com o e-mail de suporte.
5. **Eventos:** marque os eventos de pagamento usados pelo sistema:

   | Evento Asaas | Efeito |
   |---|---|
   | `PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED` | PIX pago → assinatura `active` (libera o app) |
   | `PAYMENT_OVERDUE` | PIX vencido → pagamento `expired` |
   | `PAYMENT_CANCELED` / `PAYMENT_DELETED` | Pagamento `canceled` |
   | `PAYMENT_REFUNDED` | Pagamento `refunded` |
   | `PAYMENT_CHARGEBACK_REQUESTED` / `PAYMENT_CHARGEBACK_DISPUTE` | Pagamento `refunded` |
   | `PAYMENT_DUNNING_RECEIVED` / `PAYMENT_DUNNING_REQUESTED` | Cobrança em atraso → `expired` |
   | `PAYMENT_FEE_CHARGEBACK_REFUNDED` | Pagamento `refunded` |

   > Eventos não listados são ignorados com resposta `200 { skipped: true }`.
6. Marque também a opção de **envio de pagamentos não confirmados** se o Asaas
   oferecer (garante o recebimento de `PAYMENT_OVERDUE`).

### 3.2 Sandbox (testes)

Use o mesmo cadastro no painel de sandbox (`ASAAS_ENVIRONMENT="sandbox"`,
base `https://sandbox.asaas.com/api/v3`). Para receber os webhooks localmente,
exponha seu servidor:

```bash
ngrok http 3000
# use a URL https gerada + /api/webhooks/asaas?token=SEU_ASAAS_WEBHOOK_TOKEN
```

### 3.3 Como o Asaas autentica

O endpoint lê o token em `asaas-access-token` / `asaas-webhook-token` (header)
ou em `?token=` / `?asaasToken=` (query) e compara com `ASAAS_WEBHOOK_TOKEN`.
Divergência → `401`. Token não configurado → `500`.

### 3.4 Mapa de status (Asaas → pagamento / assinatura local)

| Status Asaas | Status do pagamento | Status da assinatura |
|---|---|---|
| `PENDING` | `pending` | `inactive` (criada ao gerar o PIX) |
| `RECEIVED` / `CONFIRMED` / `APPROVED` | `paid` | `active` (libera o acesso) |
| `OVERDUE` | `expired` | mantém `inactive` (sem acesso) |
| `CANCELED` / `DELETED` | `canceled` | mantém `inactive` (sem acesso) |
| `REFUNDED` / `CHARGEBACK` | `refunded` | mantém o status atual |
| `REJECTED` / `FAILED` | `failed` | mantém `inactive` |

> A assinatura local só é **ativada** quando o pagamento é `paid`. Expiração,
> cancelamento e estorno atualizam apenas a linha em `payments` — a assinatura
> nunca paga continua bloqueando o acesso.

---

## 4. Como o acesso do aluno é decidido

O gate fica na função SQL `public.can_access_platform(user_id)`
(`supabase/migrations/000001_esquema_completo.sql`) e é usado pelo layout de
aluno (`src/app/[locale]/(student)/layout.tsx`) e pela rota
`GET /api/subscription/status`.

- `admin` / `coach`: acesso sempre liberado.
- Aluno: escolhe a assinatura com status mais permissivo e avalia:
  - `trialing` com `trial_ends_at` no futuro → liberado
  - `active` com `current_period_end` no futuro → liberado
  - `active` vencido / `past_due` → tolerância de `plans.grace_days` (padrão 3 dias)
  - `canceled` → liberado até `current_period_end`
  - `inactive` / `expired` / `blocked` / sem assinatura → **bloqueado**

Fluxo pós-pagamento: `/assinatura/sucesso` consulta
`GET /api/subscription/status` a cada 4 segundos enquanto estiver pendente e
muda para "Pagamento confirmado" assim que o webhook ativar a assinatura.

---

## 5. Idempotência e auditoria

- Todo evento recebido é gravado na tabela `public.webhook_events`
  (`provider`, `event_id`, `event_type`, `payload`, `signature_ok`, `processed_at`).
- Se o mesmo `event_id` chegar de novo, o endpoint responde
  `200 { ok: true, idempotent: true }` e não reprocessa.
- Erros de processamento são registrados em `error_text` e o endpoint responde
  `500` para o provedor reenviar.

---

## 6. Teste rápido (curl)

Stripe (sem assinatura válida → deve responder `400`):

```bash
curl -i -X POST https://SEU_DOMINIO/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"type":"invoice.paid"}'
```

Asaas (token errado → deve responder `401`):

```bash
curl -i -X POST "https://SEU_DOMINIO/api/webhooks/asaas?token=errado" \
  -H "Content-Type: application/json" \
  -d '{"event":"PAYMENT_RECEIVED","payment":{"id":"pay_123","status":"RECEIVED"}}'
```

---

## 7. Checklist de configuração

- [ ] `STRIPE_SECRET_KEY` e `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` no `.env`
- [ ] Endpoint Stripe criado com os 6 eventos de assinatura/fatura (+ `charge.refunded`)
- [ ] `STRIPE_WEBHOOK_SECRET` copiado para o `.env` de produção
- [ ] `plans.stripe_price_id` preenchido para o plano ativo
- [ ] `ASAAS_API_KEY` e `ASAAS_ENVIRONMENT` configurados
- [ ] `ASAAS_WEBHOOK_TOKEN` definido (forte e único) e repetido no painel do Asaas
- [ ] Webhook Asaas criado com os eventos `PAYMENT_*` listados
- [ ] `NEXT_PUBLIC_APP_URL` apontando para o domínio público
- [ ] Testar um pagamento de cartão (aprovado) e verificar o status em `/admin/assinaturas`
- [ ] Testar um PIX e confirmar a ativação automática após o pagamento
- [ ] Simular `invoice.payment_failed` e confirmar que o acesso permanece bloqueado
