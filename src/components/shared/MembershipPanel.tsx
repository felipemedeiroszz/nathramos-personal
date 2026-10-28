"use client";
import Link from "next/link";
import {CreditCard,ArrowRight,ShieldCheck} from "lucide-react";
export interface MembershipSubscription {
  id: string;
  status: string;
  plan_name: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  last_paid_at: string | null;
  last_failed_at: string | null;
  billing_cycle_days: number | null;
  amount_cents: number | null;
  currency: string | null;
  provider: string | null;
  payment_method: string | null;
  card_last4: string | null;
  card_brand: string | null;
  grace_days: number | null;
}

export interface MembershipPayment {
  id: string;
  status: string;
  amount_cents: number;
  currency: string;
  method: string;
  created_at: string;
  paid_at: string | null;
  due_at: string | null;
  failed_at: string | null;
  pix_copy_paste: string | null;
  card_last4: string | null;
  card_brand: string | null;
  description_pt: string | null;
  description_en: string | null;
}

export interface MembershipAccess {
  allowed: boolean;
  status: string;
  reason: string;
}


export function MembershipPanel({locale,subscription,access}: {locale:string;language:string|null;subscription:MembershipSubscription|null;payments:MembershipPayment[];access:MembershipAccess}) {
 const en=locale==="en-US";
 return <section className="rounded-2xl border border-border bg-surface p-6 space-y-4">
  <CreditCard className="text-primary" size={28}/>
  <h2 className="text-xl font-semibold">{en?"Subscription and payments":"Assinatura e pagamentos"}</h2>
  <p className="text-text-secondary">{en?"Manage renewal, card and PIX. Review payment details, pending charges and refunds in your billing center.":"Gerencie renovação, cartão e PIX. Consulte detalhes dos pagamentos, cobranças pendentes e estornos na sua central."}</p>
  <p className="flex items-center gap-2 text-sm"><ShieldCheck size={16}/>{access.allowed?(en?"Access enabled":"Acesso liberado"):(en?"Payment required to access the platform":"Regularize o pagamento para acessar o painel")}{subscription?.plan_name?` · ${subscription.plan_name}`:""}</p>
  <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 font-semibold" href={`/${locale}/assinatura`}>{en?"Open billing center":"Abrir central de pagamentos"}<ArrowRight size={16}/></Link>
 </section>;
}
export default MembershipPanel;
