import { AsaasProvider, asaasStatusToInternal } from './AsaasProvider';
import { StripeProvider, stripeStatusToInternal } from './StripeProvider';
import type { PaymentProvider, PaymentProviderName } from './types';

export function createPaymentProvider(provider: PaymentProviderName): PaymentProvider {
  switch (provider) {
    case 'stripe':
      return new StripeProvider();
    case 'asaas':
      return new AsaasProvider();
    default:
      throw new Error(`Provedor de pagamento "${provider}" não é suportado`);
  }
}

export { stripeStatusToInternal, asaasStatusToInternal };

export type {
  PaymentProvider,
  ProviderConfig,
  CreateCustomerInput,
  CreateCustomerResult,
  CreateSubscriptionInput,
  SubscriptionResult,
  UpdatePaymentMethodInput,
  CheckoutSessionInput,
  CheckoutSessionResult,
  CustomerPortalSessionInput,
  CustomerPortalSessionResult,
  OneTimePixInput,
  PixPaymentResult,
  PaymentResult,
  InternalPaymentStatus,
  PaymentProviderName,
} from './types';
