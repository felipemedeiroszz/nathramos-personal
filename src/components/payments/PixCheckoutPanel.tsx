"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2, QrCode, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PixLabels {
  title: string;
  qr: string;
  copyPaste: string;
  copy: string;
  copied: string;
  expires: string;
  expired: string;
  refresh: string;
  instructions: string;
  awaiting: string;
  paymentError: string;
}

interface PixCharge {
  payment_id: string;
  pix_qr_code: string;
  pix_copy_paste: string;
  pix_expires_at: string;
}

interface PixCheckoutPanelProps {
  planId: string;
  labels: PixLabels;
  onSuccess: () => void;
}

export function PixCheckoutPanel({ planId, labels, onSuccess }: PixCheckoutPanelProps) {
  const [charge, setCharge] = useState<PixCharge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);

  const createCharge = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCharge(null);
    completedRef.current = false;

    try {
      const res = await fetch("/api/payments/asaas/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.pix_copy_paste) {
        setError(typeof data?.error === "string" ? data.error : labels.paymentError);
        setLoading(false);
        return;
      }

      setCharge({
        payment_id: String(data.payment_id),
        pix_qr_code: String(data.pix_qr_code ?? ""),
        pix_copy_paste: String(data.pix_copy_paste),
        pix_expires_at: String(data.pix_expires_at ?? ""),
      });
      setLoading(false);
    } catch {
      setError(labels.paymentError);
      setLoading(false);
    }
  }, [planId, labels.paymentError]);

  useEffect(() => {
    void createCharge();
  }, [createCharge]);

  useEffect(() => {
    if (!charge?.payment_id) return;

    const check = async () => {
      try {
        const res = await fetch(`/api/payments/asaas/${charge.payment_id}`);
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (data?.status === "paid" && !completedRef.current) {
          completedRef.current = true;
          if (pollingRef.current) clearInterval(pollingRef.current);
          onSuccess();
        }
      } catch {
        // silencioso: tenta novamente no próximo ciclo
      }
    };

    pollingRef.current = setInterval(check, 5000);
    void check();

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [charge?.payment_id, onSuccess]);

  const handleCopy = async () => {
    if (!charge) return;
    try {
      await navigator.clipboard.writeText(charge.pix_copy_paste);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard indisponível
    }
  };

  const qrSrc = charge?.pix_qr_code
    ? charge.pix_qr_code.startsWith("data:") || charge.pix_qr_code.startsWith("http")
      ? charge.pix_qr_code
      : `data:image/png;base64,${charge.pix_qr_code}`
    : "";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-text-secondary">
        <Loader2 size={26} className="animate-spin text-primary" />
        <p className="text-sm">{labels.title}</p>
      </div>
    );
  }

  if (error || !charge) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-sm text-red-400">{error ?? labels.paymentError}</p>
        <button
          type="button"
          onClick={() => void createCharge()}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-border/60 bg-background/40 px-6 text-sm font-semibold text-text transition-all duration-300 hover:border-primary/60 hover:text-primary"
        >
          <RefreshCw size={16} />
          {labels.refresh}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-primary">
        <QrCode size={18} />
        <h3 className="text-sm font-semibold uppercase tracking-wide">{labels.title}</h3>
      </div>

      <p className="text-sm leading-relaxed text-text-secondary">{labels.instructions}</p>

      <div className="flex justify-center">
        <div className="rounded-2xl border border-primary/25 bg-white p-3 shadow-[0_0_35px_hsl(var(--primary)/0.15)]">
          {qrSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrSrc} alt={labels.qr} className="h-52 w-52 object-contain" />
          ) : (
            <div className="flex h-52 w-52 items-center justify-center text-black/40">QR</div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-text-secondary">{labels.copyPaste}</label>
        <div className="flex items-stretch gap-2">
          <div className="min-w-0 flex-1 rounded-xl border border-border/60 bg-background/60 px-3 py-3">
            <p className="truncate font-mono text-xs text-text-secondary">{charge.pix_copy_paste}</p>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all duration-300",
              copied
                ? "bg-primary/15 text-primary"
                : "bg-primary text-primary-foreground hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)]"
            )}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span className="hidden sm:inline">{copied ? labels.copied : labels.copy}</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-text-secondary/80">
        <Loader2 size={14} className="animate-spin text-primary" />
        <span>{labels.awaiting}</span>
      </div>

      {charge.pix_expires_at && (
        <p className="text-xs text-text-secondary/70">
          {labels.expires}: {new Date(charge.pix_expires_at).toLocaleDateString()}
        </p>
      )}

      <button
        type="button"
        onClick={() => void createCharge()}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-background/40 text-sm font-semibold text-text transition-all duration-300 hover:border-primary/60 hover:text-primary"
      >
        <RefreshCw size={16} />
        {labels.refresh}
      </button>
    </div>
  );
}

export default PixCheckoutPanel;
