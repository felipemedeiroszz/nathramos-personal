"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanCheckoutButtonProps {
  planId: string | null;
  isAuthenticated: boolean;
  locale: string;
  autoStart?: boolean;
  label: string;
  unavailableLabel: string;
  className?: string;
}

/**
 * CTA de assinatura da página de planos.
 * - Visitante: envia para o cadastro com retorno automático ao checkout.
 * - Aluno logado: abre o checkout no próprio site.
 */
export function PlanCheckoutButton({
  planId,
  isAuthenticated,
  locale,
  autoStart = false,
  label,
  unavailableLabel,
  className,
}: PlanCheckoutButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const goToCheckout = useCallback(() => {
    if (!planId) {
      setError(unavailableLabel);
      return;
    }
    setError(null);
    if (!isAuthenticated) {
      router.push(`/${locale}/cadastro?next=checkout`);
      return;
    }
    router.push(`/${locale}/assinatura/checkout`);
  }, [planId, isAuthenticated, locale, router, unavailableLabel]);

  useEffect(() => {
    if (!autoStart || startedRef.current) return;
    startedRef.current = true;
    goToCheckout();
  }, [autoStart, goToCheckout]);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={goToCheckout}
        className={cn(
          "group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-primary px-8 h-13 text-base font-semibold text-primary-foreground shadow-[0_0_35px_hsl(var(--primary)/0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_0_55px_hsl(var(--primary)/0.5)] disabled:cursor-not-allowed disabled:opacity-70 md:h-14 md:text-lg",
          className
        )}
      >
        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
        <span className="relative">{label}</span>
        <ArrowRight className="relative h-5 w-5 transition-transform duration-300 group-hover:translate-x-1.5" />
      </button>

      {error && (
        <p className="text-center text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default PlanCheckoutButton;
