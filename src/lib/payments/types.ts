export type InternalPaymentStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'canceled'
  | 'refunded'
  | 'expired';

export type PaymentProviderName = 'stripe' | 'asaas';

export interface ProviderConfig {
  provider: PaymentProviderName;
  [key: string]: unknown;
}

export interface CreateCustomerInput {
  name: string;
  email: string;
  phone?: string;
  document?: string;
  externalUserId?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateCustomerResult {
  customerId: string;
  provider: PaymentProviderName;
  metadata?: Record<string, unknown>;
}

export interface CreateSubscriptionInput {
  customerId: string;
  planId: string;
  priceId?: string;
  amount?: number;
  currency?: string;
  interval?: 'day' | 'week' | 'month' | 'year';
  trialDays?: number;
  paymentMethodId?: string;
  metadata?: Record<string, unknown>;
}

export interface SubscriptionResult {
  subscriptionId: string;
  provider: PaymentProviderName;
  status: InternalPaymentStatus;
  customerId: string;
  planId: string;
  amount?: number;
  currency?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  trialEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface UpdatePaymentMethodInput {
  customerId: string;
  subscriptionId?: string;
  paymentMethodId: string;
}

export interface CheckoutSessionInput {
  customerId?: string;
  customerEmail?: string;
  customerName?: string;
  priceId?: string;
  planId?: string;
  amount?: number;
  currency?: string;
  mode: 'subscription' | 'payment';
  successUrl: string;
  cancelUrl: string;
  trialDays?: number;
  metadata?: Record<string, unknown>;
}

export interface CheckoutSessionResult {
  sessionId: string;
  provider: PaymentProviderName;
  url?: string;
  status: InternalPaymentStatus;
}

export interface CustomerPortalSessionInput {
  customerId: string;
  returnUrl: string;
}

export interface CustomerPortalSessionResult {
  url: string;
  provider: PaymentProviderName;
}

export interface OneTimePixInput {
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerDocument?: string;
  amount: number;
  currency?: string;
  description?: string;
  externalReference?: string;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface PixPaymentResult {
  paymentId: string;
  provider: PaymentProviderName;
  status: InternalPaymentStatus;
  amount: number;
  currency: string;
  qrCode: string;
  copyPaste: string;
  expiresAt: Date;
  externalReference?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentResult {
  paymentId: string;
  provider: PaymentProviderName;
  status: InternalPaymentStatus;
  amount: number;
  currency: string;
  customerId?: string;
  subscriptionId?: string;
  paidAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface PaymentProvider {
  createCustomer(input: CreateCustomerInput): Promise<CreateCustomerResult>;
  createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionResult>;
  cancelSubscription(subscriptionId: string, cancelAtPeriodEnd?: boolean): Promise<SubscriptionResult>;
  reactivateSubscription(subscriptionId: string): Promise<SubscriptionResult>;
  updatePaymentMethod(input: UpdatePaymentMethodInput): Promise<SubscriptionResult>;
  createOneTimePix(input: OneTimePixInput): Promise<PixPaymentResult>;
  getPaymentStatus(paymentId: string): Promise<PaymentResult>;
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult>;
  createCustomerPortalSession(input: CustomerPortalSessionInput): Promise<CustomerPortalSessionResult>;
}
