# Ativar pagamentos

O checkout precisa de um plano ativo com valor maior que zero e pelo menos um provedor configurado. Consulte **Admin → Planos** para ver os campos ausentes, sem expor as chaves.

Na verificação local de 18/11/2026, as credenciais dos dois provedores estavam ausentes e o plano Essencial estava sem `stripe_price_id`. Corrigir a interface não habilita cobranças reais.

## PIX pelo Asaas

Configure `ASAAS_API_KEY`, `ASAAS_ENVIRONMENT` (`sandbox` para testes ou `production` para produção) e `ASAAS_WEBHOOK_TOKEN`. O plano precisa estar em BRL. É possível habilitar PIX sem configurar Stripe.

Cadastre o webhook `/api/webhooks/asaas` com o token correspondente para receber a confirmação dos pagamentos. Use credenciais do mesmo ambiente escolhido.

## Cartão pelo Stripe

Configure `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` e `STRIPE_WEBHOOK_SECRET`. As duas chaves devem pertencer ao mesmo ambiente (teste ou produção). Vincule ao plano em **Admin → Planos** o identificador `price_...` do preço recorrente correspondente no Stripe.

Cadastre o webhook `/api/webhooks/stripe` e o segredo de assinatura correspondente. A confirmação e as atualizações de assinatura dependem desses eventos.

## Endereço e validação

Configure `NEXT_PUBLIC_APP_URL`: no ambiente local atual, `http://localhost:3001`; em produção, o domínio público HTTPS. Adicione variáveis somente em `.env.local` ou nas configurações do ambiente de hospedagem. Não coloque chaves no repositório nem no chat. Reinicie o servidor local ou faça novo deploy após alterar as variáveis.

Antes de produção, valide no sandbox: criação da cobrança, confirmação via webhook, liberação do acesso, repetição do webhook sem duplicação, vencimento e cancelamento. Os indicadores de configuração verificam presença e compatibilidade básica; não autenticam as credenciais no provedor.

Documentação: [chaves Stripe](https://docs.stripe.com/keys), [webhooks Stripe](https://docs.stripe.com/webhooks?locale=pt-BR), [chaves Asaas](https://docs.asaas.com/docs/chaves-de-api).
