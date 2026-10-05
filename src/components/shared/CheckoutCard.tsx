"use client";

import { ReactNode } from "react";
import { ShieldCheck, Loader2, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { PlanRow } from "@/lib/supabase/types";

export interface CheckoutCardProps {
  plan: PlanRow;
  userCountry?: "BR" | "US";
  loading?: boolean;
  locale: "pt-BR" | "en-US";
  children?: ReactNode;
}

const i18n = {
  "pt-BR": {
    summary: "Resumo do plano",
    plan: "Plano",
    total: "Total",
    billingCycle: (days: number) =>
      days === 30
        ? "a cada mes"
        : days === 365
        ? "a cada ano"
        : `a cada ${days} dias`,
    secure: "Pagamento 100% seguro",
    processing: "Processando...",
  },
  "en-US": {
    summary: "Plan summary",
    plan: "Plan",
    total: "Total",
    billingCycle: (days: number) =>
      days === 30
        ? "every month"
        : days === 365
        ? "every year"
        : `every ${days} days`,
    secure: "100% secure payment",
    processing: "Processing...",
  },
};

export function CheckoutCard({
  plan,
  userCountry,
  loading = false,
  locale,
  children,
}: CheckoutCardProps) {
  const t = i18n[locale];
  const planName = locale === "pt-BR" ? plan.name_pt : plan.name_en;
  const badge = locale === "pt-BR" ? plan.badge_pt : plan.badge_en;

  const formattedPrice = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: plan.currency,
    minimumFractionDigits: 2,
  }).format(plan.price_cents / 100);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card className="overflow-hidden border-border/80">
        <CardHeader className="bg-surface-secondary/60 border-b border-border flex flex-row items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" aria-hidden="true" />
              <CardTitle>{t.summary}</CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold text-text">{planName}</h2>
              {badge && (
                <Badge variant="default" className="bg-primary text-primary-foreground">
                  {badge}
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right shrink-0 space-y-1">
            <p className="text-xs uppercase tracking-wider text-text-secondary">
              {t.total}
            </p>
            <p className="text-3xl font-black text-text tracking-tight">
              {formattedPrice}
            </p>
            <p className="text-xs text-text-secondary">
              {t.billingCycle(plan.billing_cycle_days)}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-2 text-xs text-text-secondary bg-surface-secondary rounded-xl px-3 py-2 w-fit">
            <ShieldCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <span>{t.secure}</span>
            {userCountry && (
              <span className="text-border/70">|</span>
            )}
            {userCountry && (
              <span className="font-medium text-text-secondary">
                {userCountry === "BR" ? "Brasil" : "United States"}
              </span>
            )}
          </div>

          {loading ? (
            <div className="min-h-[300px] flex flex-col items-center justify-center gap-3 py-10">
              <Loader2
                className="w-10 h-10 text-primary animate-spin"
                aria-hidden="true"
              />
              <p className="text-sm font-medium text-text-secondary">
                {t.processing}
              </p>
            </div>
          ) : (
            <div
              className={cn(
                "space-y-6",
                loading && "opacity-40 pointer-events-none select-none"
              )}
              aria-busy={loading}
            >
              {children}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default CheckoutCard;
