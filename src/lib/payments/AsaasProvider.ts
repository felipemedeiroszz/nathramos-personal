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

export const asaasStatusToInternal = (status: string): InternalPaymentStatus => {
  const mapping: Record<string, InternalPaymentStatus> = {
    PENDING: 'pending',
    AWAITING_CHECKOUT_RISK_ANALYSIS_REQUEST: 'pending',
    AWAITING_CREDIT_CARD_REFUND_ANALYSIS: 'pending',
    AWAITING_RISK_ANALYSIS: 'processing',
    AWAITING_CUSTOMER_ACTION: 'pending',
    AWAITING_PAYMENT: 'pending',
    IN_QUEUE: 'processing',
    BANK_PROCESSING: 'processing',
    AUTHORIZED: 'processing',
    CONFIRMED: 'paid',
    RECEIVED: 'paid',
    RECEIVED_IN_CASH: 'paid',
    APPROVED: 'paid',
    DEPOSIT_IN_ACCOUNT: 'paid',
    REFUND_REQUESTED: 'refunded',
    REFUND_IN_PROGRESS: 'refunded',
    REFUNDED: 'refunded',
    CREDITED: 'paid',
    CHARGEBACK_REQUESTED: 'refunded',
    CHARGEBACK_DISPUTE: 'failed',
    CHARGEBACK: 'refunded',
    AWAITING_CHARGEBACK_REVERSAL: 'failed',
    DUNNING_RECEIVED: 'processing',
    AWAITING_DUNNING_PROOF: 'processing',
    AWAITING_BANK_TRANSFER: 'pending',
    REPROVED: 'failed',
    REJECTED: 'failed',
    DECLINED: 'failed',
    DENIED: 'failed',
    CANCELED: 'canceled',
    CANCELLED: 'canceled',
    EXPIRED: 'expired',
    OVERDUE: 'expired',
  };

  return mapping[status.toUpperCase()] ?? 'pending';
};

type AsaasEnvironment = 'sandbox' | 'production';

const BASE_URLS: Record<AsaasEnvironment, string> = {
  sandbox: 'https://sandbox.asaas.com/api/v3',
  production: 'https://www.asaas.com/api/v3',
};

interface AsaasCustomer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cpfCnpj?: string;
  externalReference?: string;
}

interface AsaasPixQrCodeResponse {
  encodedImage?: string;
  payload?: string;
  expiresAt?: string;
}

interface AsaasPayment {
  id: string;
  customer: string;
  billingType: string;
  value: number;
  netValue: number;
  status: string;
  dueDate: string;
  originalDueDate?: string;
  paymentDate?: string;
  clientPaymentDate?: string;
  installmentNumber?: number;
  invoiceUrl?: string;
  invoiceNumber?: string;
  externalReference?: string;
  pixTransaction?: AsaasPixQrCodeResponse;
  description?: string;
  subscription?: string;
  dateCreated?: string;
}

interface AsaasSubscription {
  id: string;
  customer: string;
  value: number;
  netValue?: number;
  billingType: string;
  cycle: string;
  status: string;
  externalReference?: string;
  startDate: string;
  nextDueDate?: string;
  endDate?: string;
  deleted?: boolean;
  dateCreated?: string;
}

export class AsaasProvider implements PaymentProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    const apiKey = process.env.ASAAS_API_KEY;
    if (!apiKey) {
      throw new Error('ASAAS_API_KEY não está configurada nas variáveis de ambiente');
    }

    const environment = (process.env.ASAAS_ENVIRONMENT as AsaasEnvironment) ?? 'sandbox';

    this.apiKey = apiKey;
    this.baseUrl = BASE_URLS[environment];
  }

  private buildHeaders(): Record<string, string> {
    return {
      access_token: this.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        ...this.buildHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = `Erro na requisição ASAAS (${response.status})`;
      try {
        const errorData = (await response.json()) as { errors?: Array<{ description?: string }>; description?: string };
        if (errorData.errors && errorData.errors.length > 0) {
          errorMessage = errorData.errors.map((e) => e.description).join(', ') || errorMessage;
        } else if (errorData.description) {
          errorMessage = errorData.description;
        }
      } catch {
        // Ignora erro de parse
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  }

  async createCustomer(input: CreateCustomerInput): Promise<CreateCustomerResult> {
    try {
      const customer = await this.request<AsaasCustomer>('/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: input.name,
          email: input.email,
          phone: input.phone,
          cpfCnpj: input.document,
          externalReference: input.externalUserId,
          additionalEmails: undefined,
          notificationDisabled: true,
        }),
      });

      return {
        customerId: customer.id,
        provider: 'asaas',
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Erro ao criar cliente no ASAAS'
      );
    }
  }

  async createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionResult> {
    try {
      const cycle = this.mapIntervalToCycle(input.interval ?? 'month');

      const subscription = await this.request<AsaasSubscription>('/subscriptions', {
        method: 'POST',
        body: JSON.stringify({
          customer: input.customerId,
          billingType: 'UNDEFINED',
          value: input.amount,
          cycle,
          externalReference: input.planId,
          startDate: new Date().toISOString().split('T')[0],
          nextDueDate: undefined,
          endDate: undefined,
          maxPayments: undefined,
          description: undefined,
          discount: undefined,
          interest: undefined,
          fine: undefined,
          split: undefined,
        }),
      });

      return {
        subscriptionId: subscription.id,
        provider: 'asaas',
        status: asaasStatusToInternal(subscription.status),
        customerId: subscription.customer,
        planId: input.planId,
        amount: subscription.value,
        currency: 'BRL',
        currentPeriodStart: subscription.dateCreated
          ? new Date(subscription.dateCreated)
          : new Date(),
        currentPeriodEnd: subscription.nextDueDate
          ? new Date(subscription.nextDueDate)
          : undefined,
        metadata: input.metadata,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Erro ao criar assinatura no ASAAS'
      );
    }
  }

  private mapIntervalToCycle(interval: 'day' | 'week' | 'month' | 'year'): string {
    const mapping: Record<string, string> = {
      day: 'WEEKLY',
      week: 'WEEKLY',
      month: 'MONTHLY',
      year: 'YEARLY',
    };

    return mapping[interval] ?? 'MONTHLY';
  }

  async cancelSubscription(
    subscriptionId: string,
    _cancelAtPeriodEnd = true
  ): Promise<SubscriptionResult> {
    try {
      const subscription = await this.request<AsaasSubscription>(
        `/subscriptions/${subscriptionId}`,
        {
          method: 'DELETE',
        }
      );

      return {
        subscriptionId: subscription.id,
        provider: 'asaas',
        status: 'canceled',
        customerId: subscription.customer,
        planId: subscription.externalReference ?? '',
        amount: subscription.value,
        currency: 'BRL',
        currentPeriodStart: subscription.dateCreated
          ? new Date(subscription.dateCreated)
          : new Date(),
        currentPeriodEnd: subscription.nextDueDate
          ? new Date(subscription.nextDueDate)
          : undefined,
        canceledAt: new Date(),
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Erro ao cancelar assinatura no ASAAS'
      );
    }
  }

  async reactivateSubscription(subscriptionId: string): Promise<SubscriptionResult> {
    try {
      const subscription = await this.request<AsaasSubscription>(
        `/subscriptions/${subscriptionId}`,
        {
          method: 'GET',
        }
      );

      return {
        subscriptionId: subscription.id,
        provider: 'asaas',
        status: asaasStatusToInternal(subscription.status),
        customerId: subscription.customer,
        planId: subscription.externalReference ?? '',
        amount: subscription.value,
        currency: 'BRL',
        currentPeriodStart: subscription.dateCreated
          ? new Date(subscription.dateCreated)
          : new Date(),
        currentPeriodEnd: subscription.nextDueDate
          ? new Date(subscription.nextDueDate)
          : undefined,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Reativação de assinatura não suportada diretamente no ASAAS'
      );
    }
  }

  async updatePaymentMethod(_input: UpdatePaymentMethodInput): Promise<SubscriptionResult> {
    throw new Error(
      'Atualização de método de pagamento deve ser realizada através do portal do cliente ASAAS'
    );
  }

  async createOneTimePix(input: OneTimePixInput): Promise<PixPaymentResult> {
    try {
      if (!input.customerId && (!input.customerName || !input.customerEmail)) {
        throw new Error(
          'É necessário fornecer customerId ou customerName e customerEmail'
        );
      }

      let customerId = input.customerId;

      if (!customerId && input.customerName && input.customerEmail) {
        const customer = await this.createCustomer({
          name: input.customerName,
          email: input.customerEmail,
          document: input.customerDocument,
          externalUserId: input.externalReference,
          metadata: input.metadata,
        });
        customerId = customer.customerId;
      }

      if (!customerId) {
        throw new Error('Não foi possível obter o ID do cliente');
      }

      const dueDate = input.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000);

      const payment = await this.request<AsaasPayment>('/payments', {
        method: 'POST',
        body: JSON.stringify({
          customer: customerId,
          billingType: 'PIX',
          value: input.amount,
          dueDate: dueDate.toISOString().split('T')[0],
          description: input.description ?? 'Pagamento via PIX',
          externalReference: input.externalReference,
          interest: { value: 0 },
          fine: { value: 0 },
          discount: undefined,
          split: undefined,
          callback: {
            successUrl: undefined,
            autoRedirect: false,
          },
        }),
      });

      const pixData = await this.fetchPixQrCode(payment.id);

      return {
        paymentId: payment.id,
        provider: 'asaas',
        status: asaasStatusToInternal(payment.status),
        amount: payment.value,
        currency: 'BRL',
        qrCode: pixData.encodedImage ?? '',
        copyPaste: pixData.payload ?? '',
        expiresAt: pixData.expiresAt ? new Date(pixData.expiresAt) : dueDate,
        externalReference: payment.externalReference,
        metadata: input.metadata,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Erro ao criar cobrança PIX no ASAAS'
      );
    }
  }

  private async fetchPixQrCode(paymentId: string): Promise<AsaasPixQrCodeResponse> {
    try {
      return await this.request<AsaasPixQrCodeResponse>(
        `/payments/${paymentId}/pixQrCode`
      );
    } catch {
      return {};
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentResult> {
    try {
      const payment = await this.request<AsaasPayment>(`/payments/${paymentId}`);

      return {
        paymentId: payment.id,
        provider: 'asaas',
        status: asaasStatusToInternal(payment.status),
        amount: payment.value,
        currency: 'BRL',
        customerId: payment.customer,
        subscriptionId: payment.subscription,
        paidAt: payment.paymentDate ? new Date(payment.paymentDate) : undefined,
        metadata: {
          externalReference: payment.externalReference,
        },
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Erro ao consultar status de pagamento no ASAAS'
      );
    }
  }

  async createCheckoutSession(_input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
    throw new Error(
      'Checkout Session não é suportado diretamente no ASAAS. Utilize createOneTimePix para pagamentos PIX.'
    );
  }

  async createCustomerPortalSession(
    _input: CustomerPortalSessionInput
  ): Promise<CustomerPortalSessionResult> {
    throw new Error(
      'Portal do cliente não é suportado diretamente nesta integração ASAAS.'
    );
  }
}
