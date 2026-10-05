"use client";

import { useState } from "react";
import { Copy, QrCode, Clock, ShieldCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export interface PixDisplayProps {
  qrCodeBase64?: string;
  copyPaste?: string;
  expiresAt?: string;
  amountCents: number;
  currency: "BRL" | "USD";
  locale: "pt-BR" | "en-US";
  onRefresh?: () => void;
  onCopy?: () => void;
}

const i18n = {
  "pt-BR": {
    title: "Pagamento via PIX",
    qrAlt: "QR Code PIX",
    copyCode: "Copiar codigo PIX",
    copied: "Copiado!",
    copiedSubtitle: "Cole no seu app do banco",
    amount: "Valor",
    expires: "Expira em",
    expired: "Expirado",
    refresh: "Gerar novo PIX",
    secure: "Pagamento seguro",
    noQr: "QR Code indisponivel",
    instructions: "Escaneie ou copie o codigo",
  },
  "en-US": {
    title: "Payment via PIX",
    qrAlt: "PIX QR Code",
    copyCode: "Copy PIX code",
    copied: "Copied!",
    copiedSubtitle: "Paste into your banking app",
    amount: "Amount",
    expires: "Expires at",
    expired: "Expired",
    refresh: "Generate new PIX",
    secure: "Secure payment",
    noQr: "QR Code unavailable",
    instructions: "Scan or copy the code",
  },
};

function formatDateTime(dateStr: string, locale: "pt-BR" | "en-US"): string {
  try {
    const dt = new Date(dateStr);
    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(dt);
  } catch {
    return dateStr;
  }
}

function isExpired(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  return new Date(dateStr).getTime() < Date.now();
}

export function PixDisplay({
  qrCodeBase64,
  copyPaste,
  expiresAt,
  amountCents,
  currency,
  locale,
  onRefresh,
  onCopy,
}: PixDisplayProps) {
  const t = i18n[locale];
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);

  const amount = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amountCents / 100);

  const expired = isExpired(expiresAt);

  const handleCopy = async () => {
    if (!copyPaste || copying) return;
    try {
      setCopying(true);
      await navigator.clipboard.writeText(copyPaste);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    } finally {
      setCopying(false);
    }
  };

  const imgSrc = qrCodeBase64?.startsWith("data:")
    ? qrCodeBase64
    : qrCodeBase64
    ? `data:image/png;base64,${qrCodeBase64}`
    : undefined;

  return (
    <div
      className="w-full rounded-2xl border border-border bg-surface p-6 flex flex-col gap-5 animate-fade-in"
      aria-label={t.title}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-text flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" aria-hidden="true" />
            {t.title}
          </h3>
          <p className="text-sm text-text-secondary">{t.instructions}</p>
        </div>
        <div className="inline-flex items-center gap-1.5 text-xs text-text-secondary bg-surface-secondary border border-border rounded-full px-3 py-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
          {t.secure}
        </div>
      </div>

      <div className="w-full grid grid-cols-1 md:grid-cols-[280px_1fr] gap-5 items-start">
        <div className="flex justify-center md:justify-start">
          <div className="relative w-60 h-60 rounded-2xl bg-white p-4 border border-border shadow-lg">
            {imgSrc ? (
              <img
                src={imgSrc}
                alt={t.qrAlt}
                role="img"
                aria-label={t.qrAlt}
                className="w-full h-full object-contain"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-text-secondary bg-surface-secondary rounded-xl">
                <QrCode className="w-10 h-10 mb-2 opacity-40" aria-hidden="true" />
                <p className="text-xs">{t.noQr}</p>
              </div>
            )}
            {expired && (
              <div className="absolute inset-0 rounded-2xl bg-black/70 flex items-center justify-center p-4">
                <div className="text-center space-y-2">
                  <Clock className="w-8 h-8 text-red-400 mx-auto" aria-hidden="true" />
                  <p className="text-white font-semibold">{t.expired}</p>
                  {onRefresh && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={onRefresh}
                      aria-label={t.refresh}
                    >
                      {t.refresh}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-surface-secondary border border-border p-4">
              <p className="text-xs uppercase tracking-wider text-text-secondary mb-1">
                {t.amount}
              </p>
              <p className="text-xl font-bold text-text">{amount}</p>
            </div>
            {expiresAt && (
              <div
                className={cn(
                  "rounded-xl border p-4",
                  expired
                    ? "bg-red-500/10 border-red-500/40"
                    : "bg-surface-secondary border-border"
                )}
              >
                <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-text-secondary mb-1">
                  <Clock className="w-3 h-3" aria-hidden="true" />
                  {t.expires}
                </div>
                <p
                  className={cn(
                    "text-sm font-semibold",
                    expired ? "text-red-400" : "text-text"
                  )}
                >
                  {formatDateTime(expiresAt, locale)}
                </p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="bg-surface-secondary px-4 py-2 border-b border-border">
              <p className="text-xs font-medium text-text-secondary">
                {t.copyCode}
              </p>
            </div>
            <div className="p-3 flex items-start gap-3">
              <p className="flex-1 text-xs font-mono text-text break-all line-clamp-5 leading-relaxed">
                {copyPaste || "-"}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopy}
                disabled={!copyPaste || copying}
                aria-label={copied ? t.copied : t.copyCode}
                className="shrink-0"
              >
                {copying ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : copied ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                    <span className="text-emerald-400">{t.copied}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" aria-hidden="true" />
                    {t.copyCode}
                  </>
                )}
              </Button>
            </div>
          </div>

          {expired && onRefresh && (
            <Button variant="primary" onClick={onRefresh} className="w-full md:w-auto">
              {t.refresh}
            </Button>
          )}

          {copied && (
            <p className="text-center text-xs text-emerald-400 font-medium animate-fade-in">
              {t.copied} - {t.copiedSubtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default PixDisplay;
