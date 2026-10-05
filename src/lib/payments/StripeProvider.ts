import Stripe from 'stripe';
import type {
  CheckoutSessionInput,
  CheckoutSessionResult,
  CreateCustomerInput,
  CreateCustomerResult,
  CreateSubscriptionInput,
  CustomerPortalSessionInput,
  CustomerPortalSessionResult,
  InternalPaymentStatus,
  OneTimePixInput,
  PaymentProvider,
  PaymentResult,
  PixPaymentResult,
  SubscriptionResult,
  UpdatePaymentMethodInput,
} from './types';

export const stripeStatusToInternal = (status: string): InternalPaymentStatus => {
  const mapping: Record<string, InternalPaymentStatus> = {
    pending: 'pending',
    requires_payment_method: 'pending',
    requires_confirmation: 'pending',
    requires_action: 'processing',
    processing: 'processing',
    requires_capture: 'processing',
    succeeded: 'paid',
    paid: 'paid',
    active: 'paid',
    past_due: 'failed',
    failed: 'failed',
    canceled: 'canceled',
    canceled_or_failed: 'canceled',
    refunded: 'refunded',
    partially_refunded: 'refunded',
    expired: 'expired',
    unpaid: 'failed',
    incomplete: 'pending',
    incomplete_expired: 'expired',
    trialing: 'pending',
  };

  return mapping[status] ?? 'pending';
};

export class StripeProvider implements PaymentProvider {
  private stripe: Stripe;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY não está configurada nas variáveis de ambiente');
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    });
  }

  async createCustomer(input: CreateCustomerInput): Promise<CreateCustomerResult> {
    try {
      const customer = await this.stripe.customers.create({
        name: input.name,
        email: input.email,
        phone: input.phone,
        description: input.externalUserId ? `Usuário: ${input.externalUserId}` : undefined,
        metadata: input.metadata as Record<string, string> | undefined,
      });

      return {
        customerId: customer.id,
        provider: 'stripe',
        metadata: customer.metadata,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Erro ao criar cliente no Stripe'
      );
    }
  }

  async createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionResult> {
    try {
      const items: Stripe.SubscriptionCreateParams.Item[] = [];

      if (input.priceId) {
        items.push({ price: input.priceId });
      } else if (input.planId) {
        items.push({ plan: input.planId });
      }

      if (items.length === 0 && !input.amount) {
        throw new Error('É necessário fornecer priceId, planId ou amount');
      }

      const subscription = await this.stripe.subscriptions.create({
        customer: input.customerId,
        items: items.length > 0 ? items : undefined,
        default_payment_method: input.paymentMethodId,
        trial_period_days: input.trialDays,
        metadata: input.metadata as Record<string, string> | undefined,
        payment_behavior: input.paymentMethodId ? 'default_incomplete' : undefined,
        expand: ['latest_invoice.payment_intent'],
      });

      const latestInvoice = subscription.latest_invoice as Stripe.Invoice | undefined;
      const paymentIntent = latestInvoice?.payment_intent as Stripe.PaymentIntent | undefined;

      const status = paymentIntent?.status
        ? stripeStatusToInternal(paymentIntent.status)
        : stripeStatusToInternal(subscription.status);

      return {
        subscriptionId: subscription.id,
        provider: 'stripe',
        status,
        customerId: subscription.customer as string,
        planId: input.planId ?? input.priceId ?? '',
        amount: subscription.items.data[0]?.price.unit_amount
          ? subscription.items.data[0].price.unit_amount / 100
          : input.amount,
        currency: subscription.items.data[0]?.price.currency ?? input.currency,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined,
        metadata: subscription.metadata,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Erro ao criar assinatura no Stripe'
      );
    }
  }

  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd = true
  ): Promise<SubscriptionResult> {
    try {
      const subscription = cancelAtPeriodEnd
        ? await this.stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
          })
        : await this.stripe.subscriptions.cancel(subscriptionId);

      return {
        subscriptionId: subscription.id,
        provider: 'stripe',
        status: stripeStatusToInternal(subscription.status),
        customerId: subscription.customer as string,
        planId: subscription.items.data[0]?.price.id ?? '',
        amount: subscription.items.data[0]?.price.unit_amount
          ? subscription.items.data[0].price.unit_amount / 100
          : undefined,
        currency: subscription.items.data[0]?.price.currency,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined,
        metadata: subscription.metadata,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Erro ao cancelar assinatura no Stripe'
      );
    }
  }

  async reactivateSubscription(subscriptionId: string): Promise<SubscriptionResult> {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });

      return {
        subscriptionId: subscription.id,
        provider: 'stripe',
        status: stripeStatusToInternal(subscription.status),
        customerId: subscription.customer as string,
        planId: subscription.items.data[0]?.price.id ?? '',
        amount: subscription.items.data[0]?.price.unit_amount
          ? subscription.items.data[0].price.unit_amount / 100
          : undefined,
        currency: subscription.items.data[0]?.price.currency,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined,
        metadata: subscription.metadata,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Erro ao reativar assinatura no Stripe'
      );
    }
  }

  async updatePaymentMethod(input: UpdatePaymentMethodInput): Promise<SubscriptionResult> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.attach(
        input.paymentMethodId,
        {
          customer: input.customerId,
        }
      );

      await this.stripe.customers.update(input.customerId, {
        invoice_settings: {
          default_payment_method: paymentMethod.id,
        },
      });

      if (input.subscriptionId) {
        const subscription = await this.stripe.subscriptions.update(input.subscriptionId, {
          default_payment_method: paymentMethod.id,
        });

        return {
          subscriptionId: subscription.id,
          provider: 'stripe',
          status: stripeStatusToInternal(subscription.status),
          customerId: subscription.customer as string,
          planId: subscription.items.data[0]?.price.id ?? '',
          amount: subscription.items.data[0]?.price.unit_amount
            ? subscription.items.data[0].price.unit_amount / 100
            : undefined,
          currency: subscription.items.data[0]?.price.currency,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined,
          metadata: subscription.metadata,
        };
      }

      return {
        subscriptionId: '',
        provider: 'stripe',
        status: 'paid',
        customerId: input.customerId,
        planId: '',
        metadata: {},
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Erro ao atualizar método de pagamento no Stripe'
      );
    }
  }

  async createOneTimePix(_input: OneTimePixInput): Promise<PixPaymentResult> {
    throw new Error('Stripe não suporta PIX diretamente. Utilize o provedor ASAAS.');
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentId);

      return {
        paymentId: paymentIntent.id,
        provider: 'stripe',
        status: stripeStatusToInternal(paymentIntent.status),
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        customerId: paymentIntent.customer as string | undefined,
        paidAt: paymentIntent.created ? new Date(paymentIntent.created * 1000) : undefined,
        metadata: paymentIntent.metadata,
      };
    } catch (error) {
      try {
        const charge = await this.stripe.charges.retrieve(paymentId);

        return {
          paymentId: charge.id,
          provider: 'stripe',
          status: stripeStatusToInternal(charge.status),
          amount: charge.amount / 100,
          currency: charge.currency,
          customerId: charge.customer as string | undefined,
          paidAt: charge.created ? new Date(charge.created * 1000) : undefined,
          metadata: charge.metadata,
        };
      } catch (innerError) {
        throw new Error(
          innerError instanceof Error
            ? innerError.message
            : 'Erro ao consultar status de pagamento no Stripe'
        );
      }
    }
  }

  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (!appUrl) {
        throw new Error('NEXT_PUBLIC_APP_URL não está configurada nas variáveis de ambiente');
      }

      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

      if (input.priceId) {
        lineItems.push({
          price: input.priceId,
          quantity: 1,
        });
      } else if (input.amount && input.currency) {
        lineItems.push({
          quantity: 1,
          price_data: {
            currency: input.currency,
            unit_amount: Math.round(input.amount * 100),
            product_data: {
              name: input.planId ?? 'Pagamento',
            },
            recurring: input.mode === 'subscription' ? { interval: 'month' } : undefined,
          },
        });
      }

      const session = await this.stripe.checkout.sessions.create({
        mode: input.mode,
        customer: input.customerId,
        customer_email: input.customerEmail,
        success_url: new URL(input.successUrl, appUrl).toString(),
        cancel_url: new URL(input.cancelUrl, appUrl).toString(),
        line_items: lineItems.length > 0 ? lineItems : undefined,
        subscription_data:
          input.mode === 'subscription' && input.trialDays
            ? {
                trial_period_days: input.trialDays,
                metadata: input.metadata as Record<string, string> | undefined,
              }
            : undefined,
        payment_intent_data:
          input.mode === 'payment'
            ? {
                metadata: input.metadata as Record<string, string> | undefined,
              }
            : undefined,
        metadata: input.metadata as Record<string, string> | undefined,
        billing_address_collection: 'auto',
        client_reference_id: input.customerId,
      });

      return {
        sessionId: session.id,
        provider: 'stripe',
        url: session.url ?? undefined,
        status: stripeStatusToInternal(session.status ?? 'open'),
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Erro ao criar sessão de checkout no Stripe'
      );
    }
  }

  async createCustomerPortalSession(
    input: CustomerPortalSessionInput
  ): Promise<CustomerPortalSessionResult> {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (!appUrl) {
        throw new Error('NEXT_PUBLIC_APP_URL não está configurada nas variáveis de ambiente');
      }

      const session = await this.stripe.billingPortal.sessions.create({
        customer: input.customerId,
        return_url: new URL(input.returnUrl, appUrl).toString(),
      });

      return {
        url: session.url,
        provider: 'stripe',
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Erro ao criar sessão do portal do cliente no Stripe'
      );
    }
  }
}
