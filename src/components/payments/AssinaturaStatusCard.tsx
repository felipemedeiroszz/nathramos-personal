"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Loader2, RefreshCw } from "lucide-react";

export interface AssinaturaStatusLabels {
  successTitle: string;
  successDesc: string;
  successCta: string;
  pendingTitle: string;
  pendingDesc: string;
  pendingRetry: string;
  pendingAutoCheck: string;
}

interface AssinaturaStatusCardProps {
  locale: string;
  initialActive: boolean;
  labels: AssinaturaStatusLabels;
}

/**
 * Card de status pós-pagamento.
 * Enquanto o webhook do provedor (Stripe/Asaas) não confirma, a página fica em
 * estado "processando" e consulta /api/subscription/status automaticamente —
 * assim que a assinatura é ativada, o card muda para o estado de sucesso.
 */
export function AssinaturaStatusCard({
  locale,
  initialActive,
  labels,
}: AssinaturaStatusCardProps) {
  const router = useRouter();
  const [active, setActive] = useState(initialActive);
  const [checking, setChecking] = useState(false);
  const [checkError,setCheckError] = useState(false);
  const doneRef = useRef(initialActive);

  const check = useCallback(async () => {
    if (doneRef.current) return;
    try {
      const res = await fetch("/api/subscription/status", { cache: "no-store" });
      if (!res.ok) {setCheckError(true);return;}
      setCheckError(false);
      const data = await res.json().catch(() => null);
      if (data?.canAccessPlatform) {
        doneRef.current = true;
        setActive(true);
        router.refresh();
      }
    } catch {
      setCheckError(true);
    }
  }, [router]);

  useEffect(() => {
    if (active) return;
    const id = setInterval(() => void check(), 4000);
    return () => clearInterval(id);
  }, [active, check]);

  const handleManual = async () => {
    setChecking(true);
    await check();
    setChecking(false);
  };

  return (
    <div className="animate-slide-up [animation-fill-mode:both] space-y-5 rounded-2xl border border-border/60 bg-surface p-8 text-center md:p-10">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Link className="block text-sm text-primary underline" href={`/${locale}/assinatura`}>{locale === "pt-BR" ? "Abrir central de pagamentos e acompanhar a cobrança" : "Open billing center and track payment"}</Link>
      {checkError && <p role="status" className="text-sm text-text-secondary">{locale === "pt-BR" ? "Não foi possível consultar agora. Verifique sua conexão e tente novamente; não repita o pagamento." : "Unable to check right now. Check your connection and retry; do not pay again."}</p>}
      {!active && <p className="text-sm text-text-secondary">{locale === "pt-BR" ? "Não pague novamente antes de verificar a tentativa existente. No cartão, conclua a autenticação do seu banco. No PIX, consulte a confirmação na central." : "Do not pay again before checking the existing attempt. For cards, complete bank authentication. For PIX, check confirmation in the billing center."}</p>}
      {active ? (
          <CheckCircle2 size={30} className="text-primary" />
        ) : (
          <Clock size={30} className="text-primary" />
        )}
      </div>

      <h1 className="text-2xl font-bold text-text md:text-3xl">
        {active ? labels.successTitle : labels.pendingTitle}
      </h1>

      <p className="leading-relaxed text-text-secondary">
        {active ? labels.successDesc : labels.pendingDesc}
      </p>

      {active ? (
        <div className="pt-2">
          <Link
            href={`/${locale}/dashboard`}
            className="inline-flex h-13 items-center justify-center rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground shadow-[0_0_35px_hsl(var(--primary)/0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_0_55px_hsl(var(--primary)/0.5)]"
          >
            {labels.successCta}
          </Link>
        </div>
      ) : (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-center gap-2 text-xs text-text-secondary/80">
            <Loader2 size={14} className="animate-spin text-primary" />
            <span>{labels.pendingAutoCheck}</span>
          </div>

          <button
            type="button"
            onClick={handleManual}
            disabled={checking}
            className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-border/60 bg-background/40 px-8 text-base font-semibold text-text backdrop-blur-md transition-all duration-300 hover:border-primary/60 hover:text-primary disabled:opacity-60"
          >
            <RefreshCw size={18} className={checking ? "animate-spin" : undefined} />
            {labels.pendingRetry}
          </button>
        </div>
      )}
    </div>
  );
}

export default AssinaturaStatusCard;
