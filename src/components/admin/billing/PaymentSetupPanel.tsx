import "server-only";
import {
  configured,
  paymentAvailability,
  type CheckoutPlan,
} from "@/lib/payments/availability";
export function PaymentSetupPanel({
  plan,
  locale,
}: {
  plan: CheckoutPlan | null;
  locale: string;
}) {
  const en = locale === "en-US",
    t = (pt: string, english: string) => (en ? english : pt),
    env = process.env;
  const availability = paymentAvailability(plan, env);
  const checks = [
    [
      t("Plano ativo com valor válido", "Active plan with a valid price"),
      Boolean(plan?.is_active && !plan.is_deleted && plan.price_cents > 0),
    ],
    ["STRIPE_SECRET_KEY", configured(env.STRIPE_SECRET_KEY)],
    [
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      configured(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
    ],
    [
      t(
        "Preço recorrente Stripe vinculado ao plano (stripe_price_id)",
        "Recurring Stripe price linked to plan (stripe_price_id)",
      ),
      Boolean(plan?.stripe_price_id?.startsWith("price_")),
    ],
    ["STRIPE_WEBHOOK_SECRET", configured(env.STRIPE_WEBHOOK_SECRET)],
    ["ASAAS_API_KEY", configured(env.ASAAS_API_KEY)],
    ["ASAAS_WEBHOOK_TOKEN", configured(env.ASAAS_WEBHOOK_TOKEN)],
    [t("Plano em BRL para PIX", "BRL plan for PIX"), plan?.currency === "BRL"],
    [
      "ASAAS_ENVIRONMENT (sandbox / production)",
      !env.ASAAS_ENVIRONMENT ||
        ["sandbox", "production"].includes(env.ASAAS_ENVIRONMENT),
    ],
    ["NEXT_PUBLIC_APP_URL", configured(env.NEXT_PUBLIC_APP_URL)],
  ] as const;
  return (
    <section
      className="space-y-4 rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.03] p-5"
      aria-label={t("Configuração de pagamentos", "Payment configuration")}
    >
      <div>
        <h2 className="font-semibold">
          {t("Disponibilidade do checkout", "Checkout availability")}
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          {t(
            "O aluno só recebe a opção de contratar quando há um método configurado. Este diagnóstico verifica preenchimento e compatibilidade; a homologação com o provedor confirma o funcionamento.",
            "Students see checkout only when a method is configured. These checks verify presence and compatibility; provider testing confirms actual operation.",
          )}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-lg border border-border px-3 py-2">
          {t("Cartão", "Card")}:{" "}
          {availability.cardAvailable
            ? t("Configuração preenchida", "Configured")
            : t("Indisponível", "Unavailable")}
        </span>
        <span className="rounded-lg border border-border px-3 py-2">
          PIX:{" "}
          {availability.pixAvailable
            ? t("Configuração preenchida", "Configured")
            : t("Indisponível", "Unavailable")}
        </span>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {checks.map(([label, ok]) => (
          <li key={label} className="flex min-w-0 items-start gap-2 text-xs">
            <span className={ok ? "text-emerald-400" : "text-amber-300"}>
              {ok ? "✓" : "!"}
            </span>
            <span className="break-words">
              {label} —{" "}
              {ok
                ? t("OK", "OK")
                : t("Revisar configuração", "Review configuration")}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs leading-relaxed text-text-secondary">
        {t(
          "Configure as credenciais no .env.local do desenvolvimento e nas variáveis do projeto na Vercel. No localhost desta sessão, use NEXT_PUBLIC_APP_URL=http://localhost:3001. Depois de alterar as variáveis, reinicie o servidor; na Vercel, faça um novo deploy. Chaves Stripe de teste e produção não podem ser misturadas.",
          "Configure credentials in the development .env.local and in your Vercel project environment variables. For this local session, use NEXT_PUBLIC_APP_URL=http://localhost:3001. Restart the server after environment changes; on Vercel, redeploy. Stripe test and live keys must not be mixed.",
        )}
      </p>
    </section>
  );
}
