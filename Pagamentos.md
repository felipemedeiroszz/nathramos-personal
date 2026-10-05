## IMPLEMENTAÇÃO COMPLETA — PAGAMENTOS, ASSINATURAS E WEBHOOKS

Preciso implementar o sistema completo de pagamentos e assinaturas da aplicação, com integração segura para **Brasil e Estados Unidos**, incluindo frontend, backend, APIs, banco de dados, webhooks, controle de assinatura e tratamento de todos os estados de pagamento.

### 1. REGRAS DE PAGAMENTO POR PAÍS

#### 🇧🇷 Brasil

Para usuários localizados no Brasil:

* **PIX:** utilizar **ASAAS**
* **Assinatura/mensalidade:** utilizar **STRIPE**
* O PIX deve ser processado exclusivamente pelo ASAAS.
* As mensalidades recorrentes devem ser processadas pelo Stripe.
* Implementar criação, consulta, confirmação, cancelamento e atualização dos pagamentos.
* Implementar todos os webhooks necessários.

#### 🇺🇸 Estados Unidos

Para usuários localizados nos Estados Unidos:

* **Assinatura/mensalidade:** utilizar **STRIPE**
* Não utilizar ASAAS.
* Implementar cobrança recorrente através do Stripe.
* Implementar todos os webhooks necessários para controlar o ciclo completo da assinatura.

---

# 2. STRIPE — ASSINATURAS

Implementar o Stripe de forma profissional e segura.

O sistema deve suportar:

* Criação de cliente no Stripe.
* Criação de assinatura.
* Seleção do plano.
* Checkout.
* Pagamento inicial.
* Renovação automática.
* Alteração de plano.
* Upgrade.
* Downgrade.
* Cancelamento.
* Reativação.
* Período de teste, caso o plano possua.
* Falha no pagamento.
* Cartão recusado.
* Atualização do cartão.
* Expiração do cartão.
* Status da assinatura.
* Histórico de cobranças.
* Faturas.
* Reembolsos quando aplicável.
* Sincronização entre Stripe e banco de dados local.

### IMPORTANTE — SEGURANÇA

NÃO armazenar número completo do cartão, CVV ou dados sensíveis do cartão no banco de dados da aplicação.

Utilizar os recursos oficiais do Stripe para coleta e processamento dos dados do cartão, como:

* Stripe Checkout
* Stripe Elements
* Payment Element

O backend deve trabalhar utilizando os IDs e tokens/PaymentMethods fornecidos pelo Stripe.

Nunca enviar dados brutos de cartão para a API própria.

---

# 3. FORMULÁRIO DE CARTÃO / UI

Utilizar como referência visual o formulário de cartão fornecido no material deste projeto.

A referência possui:

* cartão visual em tempo real;
* número do cartão;
* nome do titular;
* validade;
* CVV;
* identificação da bandeira;
* animação de virar o cartão ao informar o CVV;
* animações de preenchimento;
* layout responsivo.

O visual deve ser modernizado e integrado ao design atual da aplicação.

NÃO copiar cegamente a implementação antiga em Vue.

Reproduzir a experiência visual utilizando a stack atual do projeto e integrar a coleta de cartão com o Stripe de maneira segura.

O formulário deve:

* detectar a bandeira;
* formatar o número;
* validar os campos;
* mostrar erros de forma clara;
* funcionar perfeitamente em desktop;
* funcionar perfeitamente em mobile;
* possuir estados de loading;
* impedir múltiplos envios;
* informar sucesso ou erro;
* nunca expor dados sensíveis no frontend ou backend.

---

# 4. ASAAS — PIX

Para usuários brasileiros que escolherem PIX:

Implementar integração completa com ASAAS.

O sistema deve permitir:

1. Criar cobrança.
2. Obter QR Code PIX.
3. Exibir QR Code.
4. Exibir código PIX copia e cola.
5. Informar valor.
6. Informar vencimento.
7. Consultar status.
8. Detectar pagamento confirmado.
9. Atualizar assinatura/compra no banco.
10. Liberar o acesso do usuário após confirmação.
11. Registrar histórico da transação.
12. Tratar cobrança vencida.
13. Tratar cobrança cancelada.
14. Tratar pagamento estornado/devolvido quando aplicável.

---

# 5. WEBHOOKS

CRIAR TODOS OS WEBHOOKS NECESSÁRIOS.

Os webhooks devem possuir:

* endpoint próprio;
* validação de autenticidade;
* validação da origem;
* processamento idempotente;
* logs;
* tratamento de erros;
* retry seguro;
* proteção contra eventos duplicados;
* registro do evento recebido;
* atualização correta do banco de dados.

Nunca confiar apenas no frontend para confirmar um pagamento.

A confirmação definitiva do pagamento deve ocorrer através da comunicação com o provedor de pagamento.

---

# 6. EVENTOS DO STRIPE

Implementar os eventos necessários para manter a assinatura sincronizada.

Considerar, conforme aplicabilidade:

* checkout.session.completed
* payment_intent.succeeded
* payment_intent.payment_failed
* invoice.paid
* invoice.payment_failed
* invoice.finalized
* customer.subscription.created
* customer.subscription.updated
* customer.subscription.deleted
* charge.refunded

Não implementar eventos desnecessários apenas por implementar.

O sistema deve utilizar os eventos realmente necessários para manter o estado local consistente com o Stripe.

---

# 7. EVENTOS DO ASAAS

Implementar os webhooks necessários para:

* pagamento criado;
* pagamento confirmado;
* pagamento recebido;
* pagamento vencido;
* pagamento cancelado;
* pagamento estornado/devolvido;
* demais estados relevantes utilizados pela integração.

Mapear corretamente os status do ASAAS para os status internos da aplicação.

---

# 8. BANCO DE DADOS

Criar/ajustar as estruturas necessárias para armazenar:

### Usuário

* país;
* moeda;
* customer_id do Stripe;
* customer_id do ASAAS, quando aplicável.

### Assinatura

* user_id;
* provider;
* provider_subscription_id;
* plano;
* status;
* valor;
* moeda;
* período atual;
* início;
* término;
* cancelamento;
* data de criação;
* data de atualização.

### Pagamento

* usuário;
* provedor;
* ID externo;
* valor;
* moeda;
* status;
* método;
* data;
* metadata.

### Webhook

* provider;
* event_id;
* event_type;
* payload;
* status de processamento;
* erro;
* timestamps.

O sistema deve possuir controle de idempotência utilizando o ID único do evento recebido.

---

# 9. STATUS INTERNOS

Criar uma camada de abstração para que a aplicação não fique dependente diretamente dos nomes de status do Stripe ou ASAAS.

Exemplo:

```text
PENDING
PROCESSING
PAID
FAILED
CANCELED
REFUNDED
EXPIRED
```

Mapear os status externos para os status internos.

---

# 10. FLUXO DE ASSINATURA

Implementar o seguinte fluxo:

```text
Usuário
   ↓
Seleciona plano
   ↓
Sistema identifica país
   ↓
┌───────────────────────┐
│ Brasil?               │
└───────────┬───────────┘
            │
       SIM  │  NÃO
            ↓
      Brasil                  Estados Unidos
         ↓                         ↓
      Stripe                    Stripe
         ↓                         ↓
   Checkout/Payment          Checkout/Payment
         ↓                         ↓
      Webhook                   Webhook
         ↓                         ↓
      Backend                   Backend
         ↓                         ↓
      Banco de dados
         ↓
   Ativa assinatura
         ↓
   Libera funcionalidades
```

Para pagamentos PIX no Brasil:

```text
Usuário
   ↓
Seleciona PIX
   ↓
Backend
   ↓
ASAAS
   ↓
Cria cobrança
   ↓
QR Code + Copia e Cola
   ↓
Usuário realiza pagamento
   ↓
ASAAS Webhook
   ↓
Backend
   ↓
Confirma pagamento
   ↓
Banco de dados
   ↓
Libera acesso
```

---

# 11. FRONTEND

Criar uma experiência de pagamento profissional.

A tela deve apresentar:

* resumo do plano;
* valor;
* periodicidade;
* moeda;
* método de pagamento;
* formulário de cartão quando Stripe;
* PIX quando Brasil + PIX;
* botão de pagamento;
* loading;
* mensagens de erro;
* confirmação;
* status da assinatura.

Exemplo:

```text
┌─────────────────────────────────────┐
│          RESUMO DO PLANO            │
│                                     │
│ Plano Premium                       │
│ R$ XX,XX / mês                      │
│                                     │
├─────────────────────────────────────┤
│ Método de pagamento                 │
│                                     │
│ ○ Cartão                            │
│ ○ PIX                               │
│                                     │
│ [ formulário de pagamento ]         │
│                                     │
│       [ ASSINAR AGORA ]             │
│                                     │
│ 🔒 Pagamento seguro                 │
└─────────────────────────────────────┘
```

Para os Estados Unidos, adaptar automaticamente:

* idioma;
* moeda USD;
* formato monetário;
* informações de cobrança;
* métodos disponíveis.

---

# 12. BACKEND

Criar todas as APIs necessárias.

Organizar as rotas de forma clara.

Exemplo:

```text
POST   /api/payments/stripe/checkout
POST   /api/payments/stripe/subscribe
POST   /api/payments/stripe/cancel
POST   /api/payments/stripe/reactivate
POST   /api/payments/stripe/update-payment-method

GET    /api/subscription
GET    /api/subscription/status
GET    /api/payments/history

POST   /api/payments/asaas/pix
GET    /api/payments/asaas/:id
POST   /api/webhooks/stripe
POST   /api/webhooks/asaas
```

Ajustar os endpoints à arquitetura existente do projeto.

Não criar endpoints duplicados caso já existam.

---

# 13. SEGURANÇA

Implementar:

* validação de entrada;
* autenticação;
* autorização;
* rate limiting nos endpoints sensíveis;
* validação dos webhooks;
* idempotência;
* logs;
* tratamento seguro de erros;
* proteção contra replay de webhook;
* proteção contra duplicidade;
* secrets exclusivamente através de variáveis de ambiente.

Nunca colocar:

```text
STRIPE_SECRET_KEY
ASAAS_API_KEY
WEBHOOK_SECRET
```

diretamente no código.

Utilizar:

```env
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
ASAAS_API_KEY=
ASAAS_WEBHOOK_TOKEN=
```

---

# 14. AMBIENTES

Criar suporte para:

```text
development
staging
production
```

Separar corretamente:

* Stripe Test;
* Stripe Live;
* ASAAS Sandbox;
* ASAAS Production.

Nunca misturar credenciais de teste com produção.

---

# 15. TRATAMENTO DE ERROS

Todos os erros devem possuir mensagens amigáveis para o usuário.

Exemplo:

```text
Pagamento recusado
Não foi possível processar seu cartão.
Verifique os dados ou tente outro método de pagamento.
```

Nunca exibir:

* stack trace;
* API keys;
* secrets;
* payload completo do gateway;
* dados sensíveis.

Os detalhes técnicos devem ficar apenas nos logs do backend.

---

# 16. EXPERIÊNCIA DO USUÁRIO

A experiência deve ser premium.

Utilizar:

* animações suaves;
* feedback visual;
* skeleton/loading quando necessário;
* estados de sucesso;
* estados de erro;
* responsividade;
* acessibilidade;
* validação em tempo real;
* prevenção de duplo clique;
* mensagens claras.

Não utilizar alertas genéricos do navegador quando for possível utilizar componentes próprios da aplicação.

---

# 17. APÓS O PAGAMENTO

Quando o pagamento for confirmado:

1. Confirmar através do webhook.
2. Atualizar pagamento.
3. Atualizar assinatura.
4. Atualizar usuário.
5. Registrar data de ativação.
6. Registrar período da assinatura.
7. Liberar funcionalidades premium.
8. Exibir confirmação ao usuário.

O frontend NÃO deve liberar acesso apenas porque recebeu uma resposta de sucesso de uma requisição.

O backend deve ser a fonte de verdade.

---

# 18. DASHBOARD DA ASSINATURA

Criar uma área onde o usuário possa visualizar:

* plano atual;
* preço;
* próxima cobrança;
* status;
* método de pagamento;
* histórico de pagamentos;
* data de início;
* data de renovação;
* opção de atualizar pagamento;
* opção de cancelar;
* opção de reativar quando aplicável.

---

# 19. REQUISITO IMPORTANTE

Antes de implementar:

1. Analise a arquitetura atual do projeto.
2. Identifique frontend, backend e banco de dados existentes.
3. Verifique se já existem módulos de autenticação.
4. Verifique se já existem tabelas de usuários.
5. Verifique se já existem planos/assinaturas.
6. Verifique se já existem integrações de pagamento.
7. Reutilize estruturas existentes quando apropriado.
8. Não duplique código.
9. Não quebrar funcionalidades existentes.

---

# 20. IMPLEMENTAÇÃO

Quero a implementação REAL e COMPLETA.

Não quero apenas exemplos ou pseudocódigo.

Faça:

* migrations;
* models;
* services;
* controllers;
* routes;
* DTOs/validators;
* integrações Stripe;
* integração ASAAS;
* webhooks;
* banco de dados;
* frontend;
* componentes;
* tratamento de erros;
* logs;
* documentação;
* variáveis de ambiente;
* testes necessários.

Sempre respeite a arquitetura e a stack existente.

---

# 21. CRITÉRIO DE CONCLUSÃO

Considere a tarefa concluída somente quando:

* Brasil + Stripe funcionar;
* Brasil + PIX/ASAAS funcionar;
* Estados Unidos + Stripe funcionar;
* assinatura puder ser criada;
* assinatura puder ser cancelada;
* assinatura puder ser reativada quando aplicável;
* pagamentos forem sincronizados;
* webhooks forem processados;
* eventos duplicados não gerarem duplicidade;
* falhas de pagamento forem tratadas;
* banco de dados permanecer consistente;
* frontend estiver responsivo;
* nenhuma chave secreta estiver exposta;
* dados de cartão não forem armazenados pela aplicação;
* fluxo de produção estiver separado do ambiente de testes.

Ao finalizar, apresente:

### IMPLEMENTADO

Lista objetiva de tudo que foi criado ou alterado.

### ROTAS

Lista das novas APIs.

### WEBHOOKS

Lista dos webhooks implementados.

### BANCO

Migrations/tabelas alteradas.

### VARIÁVEIS DE AMBIENTE

Lista das variáveis necessárias, sem mostrar valores secretos.

### TESTES

Como testar cada fluxo:

* Brasil + Stripe;
* Brasil + PIX;
* EUA + Stripe;
* pagamento aprovado;
* pagamento recusado;
* assinatura cancelada;
* renovação;
* webhook duplicado;
* webhook inválido.

### PENDÊNCIAS

Caso alguma parte não possa ser implementada devido a configuração externa, informe exatamente o que falta e onde deve ser configurado.
# 22. UI/UX — CARD DE CRÉDITO

O card de pagamento abaixo é uma **referência obrigatória de UI/UX** para a implementação.

Quero manter a mesma experiência visual do componente de referência:

* cartão 3D;
* frente e verso;
* animação de flip;
* chip;
* bandeira dinâmica;
* número do cartão em tempo real;
* nome do titular em tempo real;
* validade em tempo real;
* CVV no verso;
* destaque visual do campo atualmente selecionado;
* animações de entrada dos caracteres;
* sombras;
* bordas arredondadas;
* layout responsivo;
* excelente experiência mobile e desktop.

O código original utiliza Vue e possui a estrutura de card abaixo. **Não copie a implementação de pagamento insegura para produção. Reaproveite o conceito visual e adapte a implementação para a stack atual e para Stripe Elements/Payment Element.**

## REFERÊNCIA VISUAL DO CARD

```html
<div class="wrapper" id="app">
  <div class="card-form">

    <div class="card-list">

      <div
        class="card-item"
        :class="{ '-active': isCardFlipped }"
      >

        <!-- ========================= -->
        <!-- FRENTE DO CARTÃO           -->
        <!-- ========================= -->

        <div class="card-item__side -front">

          <div
            class="card-item__focus"
            :class="{ '-active': focusElementStyle }"
            :style="focusElementStyle"
          ></div>

          <div class="card-item__cover">
            <img
              :src="
                'https://raw.githubusercontent.com/muhammederdem/credit-card-form/master/src/assets/images/'
                + currentCardBackground +
                '.jpeg'
              "
              class="card-item__bg"
            >
          </div>

          <div class="card-item__wrapper">

            <div class="card-item__top">

              <img
                src="https://raw.githubusercontent.com/muhammederdem/credit-card-form/master/src/assets/images/chip.png"
                class="card-item__chip"
              >

              <div class="card-item__type">

                <!-- Bandeira dinâmica -->
                <img
                  :src="
                    'https://raw.githubusercontent.com/muhammederdem/credit-card-form/master/src/assets/images/'
                    + getCardType +
                    '.png'
                  "
                  v-if="getCardType"
                  class="card-item__typeImg"
                  alt="Bandeira do cartão"
                >

              </div>

            </div>

            <!-- NÚMERO -->
            <label
              for="cardNumber"
              class="card-item__number"
            >

              <template v-if="getCardType === 'amex'">

                <span
                  v-for="(n, index) in amexCardMask"
                  :key="index"
                >

                  <div
                    class="card-item__numberItem"
                    v-if="
                      index > 4 &&
                      index < 14 &&
                      cardNumber.length > index &&
                      n.trim() !== ''
                    "
                  >
                    *
                  </div>

                  <div
                    class="card-item__numberItem"
                    v-else-if="cardNumber.length > index"
                    :class="{ '-active': n.trim() === '' }"
                  >
                    {{ cardNumber[index] }}
                  </div>

                  <div
                    class="card-item__numberItem"
                    v-else
                    :class="{ '-active': n.trim() === '' }"
                  >
                    {{ n }}
                  </div>

                </span>

              </template>

              <template v-else>

                <span
                  v-for="(n, index) in otherCardMask"
                  :key="index"
                >

                  <div
                    class="card-item__numberItem"
                    v-if="
                      index > 4 &&
                      index < 15 &&
                      cardNumber.length > index &&
                      n.trim() !== ''
                    "
                  >
                    *
                  </div>

                  <div
                    class="card-item__numberItem"
                    v-else-if="cardNumber.length > index"
                    :class="{ '-active': n.trim() === '' }"
                  >
                    {{ cardNumber[index] }}
                  </div>

                  <div
                    class="card-item__numberItem"
                    v-else
                    :class="{ '-active': n.trim() === '' }"
                  >
                    {{ n }}
                  </div>

                </span>

              </template>

            </label>

            <div class="card-item__content">

              <!-- TITULAR -->
              <label class="card-item__info">

                <div class="card-item__holder">
                  Card Holder
                </div>

                <div class="card-item__name">
                  {{ cardName || 'Full Name' }}
                </div>

              </label>

              <!-- VALIDADE -->
              <div class="card-item__date">

                <label class="card-item__dateTitle">
                  Expires
                </label>

                <label class="card-item__dateItem">
                  {{ cardMonth || 'MM' }}
                </label>

                <span>/</span>

                <label class="card-item__dateItem">
                  {{ cardYear || 'YY' }}
                </label>

              </div>

            </div>

          </div>

        </div>


        <!-- ========================= -->
        <!-- VERSO DO CARTÃO            -->
        <!-- ========================= -->

        <div class="card-item__side -back">

          <div class="card-item__cover">

            <img
              :src="
                'https://raw.githubusercontent.com/muhammederdem/credit-card-form/master/src/assets/images/'
                + currentCardBackground +
                '.jpeg'
              "
              class="card-item__bg"
            >

          </div>

          <div class="card-item__band"></div>

          <div class="card-item__cvv">

            <div class="card-item__cvvTitle">
              CVV
            </div>

            <div class="card-item__cvvBand">

              <span
                v-for="(n, index) in cardCvv"
                :key="index"
              >
                *
              </span>

            </div>

            <div class="card-item__type">

              <img
                :src="
                  'https://raw.githubusercontent.com/muhammederdem/credit-card-form/master/src/assets/images/'
                  + getCardType +
                  '.png'
                "
                v-if="getCardType"
                class="card-item__typeImg"
              >

            </div>

          </div>

        </div>

      </div>

    </div>


    <!-- ========================= -->
    <!-- FORMULÁRIO                 -->
    <!-- ========================= -->

    <div class="card-form__inner">

      <div class="card-input">

        <label class="card-input__label">
          Card Number
        </label>

        <input
          type="text"
          id="cardNumber"
          class="card-input__input"
          autocomplete="cc-number"
        >

      </div>


      <div class="card-input">

        <label class="card-input__label">
          Card Holder
        </label>

        <input
          type="text"
          id="cardName"
          class="card-input__input"
          autocomplete="cc-name"
        >

      </div>


      <div class="card-form__row">

        <div class="card-form__col">

          <div class="card-form__group">

            <label class="card-input__label">
              Expiration Date
            </label>

            <select
              class="card-input__input -select"
              id="cardMonth"
            >
              <option value="">
                Month
              </option>
            </select>

            <select
              class="card-input__input -select"
              id="cardYear"
            >
              <option value="">
                Year
              </option>
            </select>

          </div>

        </div>


        <div class="card-form__col -cvv">

          <div class="card-input">

            <label class="card-input__label">
              CVV
            </label>

            <input
              type="text"
              class="card-input__input"
              id="cardCvv"
              maxlength="4"
              autocomplete="cc-csc"
            >

          </div>

        </div>

      </div>


      <button class="card-form__button">
        Pay / Subscribe
      </button>

    </div>

  </div>
</div>
```

## CSS / DESIGN SYSTEM DO CARD

Manter a ideia visual abaixo:

```css
.card-form {
  max-width: 570px;
  width: 100%;
  margin: auto;
}

.card-form__inner {
  background: #ffffff;
  box-shadow: 0 30px 60px rgba(90, 116, 148, 0.4);
  border-radius: 10px;
  padding: 35px;
  padding-top: 180px;
}

.card-item {
  max-width: 430px;
  height: 270px;
  width: 100%;
  margin: 0 auto;
  position: relative;
  z-index: 2;
}

.card-item__side {
  height: 100%;
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(14, 42, 90, 0.55);

  transform-style: preserve-3d;
  transition:
    all 0.8s cubic-bezier(0.71, 0.03, 0.56, 0.85);

  backface-visibility: hidden;
}

.card-item__side.-back {
  position: absolute;
  inset: 0;
  transform:
    perspective(2000px)
    rotateY(-180deg);
}

.card-item.-active .card-item__side.-front {
  transform:
    perspective(1000px)
    rotateY(180deg);
}

.card-item.-active .card-item__side.-back {
  transform:
    perspective(2000px)
    rotateY(0deg);
}

.card-item__cover {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 15px;
  background: #1c1d27;
}

.card-item__cover::after {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(6, 2, 29, 0.45);
}

.card-item__bg {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-item__wrapper {
  position: relative;
  z-index: 4;
  height: 100%;
  padding: 25px 15px;

  font-family:
    "Source Code Pro",
    monospace;

  text-shadow:
    7px 6px 10px rgba(14, 42, 90, 0.8);
}

.card-item__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 40px;
  padding: 0 10px;
}

.card-item__chip {
  width: 60px;
}

.card-item__type {
  height: 45px;
  max-width: 100px;
  width: 100%;

  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.card-item__typeImg {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.card-item__number {
  display: inline-block;

  color: #ffffff;

  font-size: 27px;
  font-weight: 500;
  line-height: 1;

  padding: 10px 15px;
  margin-bottom: 35px;
}

.card-item__numberItem {
  width: 16px;
  display: inline-block;
}

.card-item__numberItem.-active {
  width: 30px;
}

.card-item__content {
  display: flex;
  align-items: flex-start;
  color: #ffffff;
}

.card-item__info {
  width: 100%;
  max-width: calc(100% - 85px);
  padding: 10px 15px;
}

.card-item__holder {
  opacity: 0.7;
  font-size: 13px;
  margin-bottom: 6px;
}

.card-item__name {
  font-size: 18px;
  line-height: 1;

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  text-transform: uppercase;
}

.card-item__date {
  margin-left: auto;
  padding: 10px;

  display: inline-flex;
  flex-wrap: wrap;

  width: 80px;
  flex-shrink: 0;

  font-size: 18px;
}

.card-item__dateTitle {
  width: 100%;

  opacity: 0.7;
  font-size: 13px;

  padding-bottom: 6px;
}

.card-item__band {
  width: 100%;
  height: 50px;

  margin-top: 30px;

  background: rgba(0, 0, 19, 0.8);
}

.card-item__cvv {
  position: relative;
  z-index: 2;

  padding: 15px;

  text-align: right;
}

.card-item__cvvTitle {
  color: #ffffff;
  font-size: 15px;
  font-weight: 500;

  margin-bottom: 5px;
}

.card-item__cvvBand {
  height: 45px;

  background: #ffffff;

  border-radius: 4px;

  display: flex;
  align-items: center;
  justify-content: flex-end;

  padding-right: 10px;

  color: #1a3b5d;

  box-shadow:
    0 10px 20px -7px
    rgba(32, 56, 117, 0.35);
}

.card-input {
  margin-bottom: 20px;
}

.card-input__label {
  display: block;

  width: 100%;

  margin-bottom: 5px;

  font-size: 14px;
  font-weight: 500;

  color: #1a3b5d;
}

.card-input__input {
  width: 100%;
  height: 50px;

  border-radius: 5px;

  border: 1px solid #ced6e0;

  background: transparent;

  padding: 5px 15px;

  font-size: 18px;

  color: #1a3b5d;

  transition:
    all 0.3s ease-in-out;
}

.card-input__input:hover,
.card-input__input:focus {
  border-color: #3d9cff;
}

.card-form__button {
  width: 100%;
  height: 55px;

  border: none;
  border-radius: 5px;

  background: #2364d2;

  color: #ffffff;

  font-size: 22px;
  font-weight: 500;

  cursor: pointer;

  box-shadow:
    3px 10px 20px
    rgba(35, 100, 210, 0.3);

  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.card-form__button:hover {
  transform: translateY(-2px);
}
```

A referência original também utiliza um efeito de destaque sobre o campo ativo, com transição suave e borda translúcida . **Manter esse comportamento na nova implementação.**

---

# 23. ANIMAÇÕES

Implementar as seguintes interações:

### Campo do número

Ao selecionar o número do cartão:

* destacar visualmente a região do número no card;
* acompanhar o foco do campo;
* atualizar os dígitos em tempo real.

### Nome

Ao digitar:

* atualizar o nome instantaneamente no cartão;
* utilizar uppercase no display;
* limitar visualmente o texto para não quebrar o layout.

### Validade

Ao alterar mês/ano:

* atualizar imediatamente o cartão.

### CVV

Quando o usuário focar o campo CVV:

```text
CARD FRONT
     ↓
  FLIP 180°
     ↓
CARD BACK
```

Ao sair do campo CVV:

```text
CARD BACK
     ↓
  FLIP 180°
     ↓
CARD FRONT
```

Utilizar uma animação suave semelhante à referência.

---

# 24. RESPONSIVIDADE

Desktop:

```text
Card
430 × 270 px
```

Mobile:

```text
width: 90%;
max-width: 310px;
```

Adaptar automaticamente:

* tamanho da fonte;
* número do cartão;
* chip;
* bandeira;
* espaçamento;
* formulário;
* botões.

O card nunca deve ultrapassar a largura da tela.

---

# 25. INTEGRAÇÃO COM STRIPE

IMPORTANTE:

O visual do card acima é apenas a camada de apresentação.

A aplicação NÃO deve armazenar:

* número completo;
* CVV;
* dados sensíveis do cartão.

Utilizar Stripe Elements/Payment Element para o processamento seguro.

A interface deve continuar apresentando visualmente:

```text
┌─────────────────────────────┐
│ CHIP                 VISA   │
│                             │
│ 4242 4242 4242 4242         │
│                             │
│ JOHN DOE             12/30  │
└─────────────────────────────┘
```

mas os dados reais devem ser processados pelos componentes seguros do Stripe.

Sempre que necessário, sincronizar os dados visuais do card com os eventos disponibilizados pelo Stripe sem expor dados sensíveis.

---

# 26. RESULTADO ESPERADO

Quero um checkout visualmente semelhante ao card de referência, porém:

* moderno;
* premium;
* responsivo;
* acessível;
* seguro;
* integrado ao Stripe;
* integrado ao ASAAS para PIX;
* com animação 3D;
* com atualização em tempo real;
* com identificação da bandeira;
* com feedback de validação;
* com estados de loading;
* com estados de erro;
* com estado de sucesso.

**Não remover o card visual da implementação.**

O card é parte importante da experiência de pagamento e deve aparecer na tela de checkout.
