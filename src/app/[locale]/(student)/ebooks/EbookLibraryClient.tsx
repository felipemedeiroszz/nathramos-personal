"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { StudentPageHeader as PageHeader } from "@/components/student/StudentPageHeader";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";
import { PixDisplay } from "@/components/shared/PixDisplay";
import {
  Book,
  BookOpen,
  Search,
  Sparkles,
  ExternalLink,
  Lock,
  Loader2,
  CheckCircle2,
  CreditCard,
  QrCode,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EbookRow } from "@/types";

type Locale = "pt-BR" | "en-US";

interface EbookLibraryClientProps {
  locale: Locale;
  ebooks: EbookRow[];
  paidIds: string[];
  purchaseStatus: string | null;
}

interface PixData {
  pix_qr_code?: string;
  pix_copy_paste?: string;
  pix_expires_at?: string;
}

const ACCENTS = ["bg-primary/10 border border-primary/30"];

export function EbookLibraryClient({
  locale,
  ebooks,
  paidIds,
  purchaseStatus,
}: EbookLibraryClientProps) {
  const L = (pt: string, en: string) => (locale === "pt-BR" ? pt : en);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<EbookRow | null>(null);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [loading, setLoading] = useState<"stripe" | "pix" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const paidSet = useMemo(() => new Set(paidIds), [paidIds]);

  const titleOf = (e: EbookRow) =>
    locale === "en-US" ? e.title_en : e.title_pt;
  const summaryOf = (e: EbookRow) =>
    (locale === "en-US" ? e.summary_en : e.summary_pt) ?? "";
  const categoriesOf = (e: EbookRow) =>
    (locale === "en-US" ? e.categories_en : e.categories_pt) ?? [];
  const isOwned = (e: EbookRow) => e.is_free || paidSet.has(e.id);

  const formatPrice = (e: EbookRow) => {
    if (e.is_free || !e.price_cents) return L("Grátis", "Free");
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: e.currency || "BRL",
    }).format(e.price_cents / 100);
  };

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    ebooks.forEach((e) => categoriesOf(e).forEach((c) => c && set.add(c)));
    return Array.from(set);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ebooks, locale]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return ebooks.filter((e) => {
      const matchesSearch =
        !term ||
        titleOf(e).toLowerCase().includes(term) ||
        summaryOf(e).toLowerCase().includes(term) ||
        (e.author ?? "").toLowerCase().includes(term);
      const matchesCategory =
        !activeCategory || categoriesOf(e).includes(activeCategory);
      return matchesSearch && matchesCategory;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ebooks, search, activeCategory, locale]);

  const ownedList = filtered.filter(isOwned);
  const catalogList = filtered.filter((e) => !isOwned(e));

  const openPurchase = (ebook: EbookRow) => {
    setSelected(ebook);
    setPixData(null);
    setError(null);
    setLoading(null);
  };

  const closePurchase = () => {
    setSelected(null);
    setPixData(null);
    setError(null);
    setLoading(null);
  };

  const buyWithCard = async () => {
    if (!selected) return;
    setError(null);
    setLoading("stripe");
    try {
      const res = await fetch("/api/payments/ebook/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ebook_id: selected.id, locale }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        throw new Error(
          data?.error ??
            L(
              "Não foi possível iniciar o pagamento.",
              "Could not start the payment.",
            ),
        );
      }
      window.location.href = data.url as string;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : L(
              "Não foi possível iniciar o pagamento.",
              "Could not start the payment.",
            ),
      );
      setLoading(null);
    }
  };

  const buyWithPix = async () => {
    if (!selected) return;
    setError(null);
    setLoading("pix");
    try {
      const res = await fetch("/api/payments/ebook/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ebook_id: selected.id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        throw new Error(
          data?.error ??
            L("Não foi possível gerar o PIX.", "Could not generate the PIX."),
        );
      }
      setPixData(data as PixData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : L("Não foi possível gerar o PIX.", "Could not generate the PIX."),
      );
    } finally {
      setLoading(null);
    }
  };

  const renderCover = (ebook: EbookRow, accent: string) => {
    if (ebook.cover_url) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ebook.cover_url}
          alt={titleOf(ebook)}
          className="h-full w-full object-cover"
        />
      );
    }
    return (
      <div
        className={cn("h-full w-full flex items-center justify-center", accent)}
      >
        <BookOpen size={44} className="text-primary" />
      </div>
    );
  };

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        locale={locale}
        title={L("Biblioteca Digital", "Digital Library")}
        description={L(
          "Materiais exclusivos para alunos Nath Ramos",
          "Exclusive materials for Nath Ramos students",
        )}
        icon={<BookOpen size={22} />}
      />

      {purchaseStatus === "success" && (
        <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4">
          <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-text">
              {L("Pagamento confirmado!", "Payment confirmed!")}
            </p>
            <p className="text-text-secondary">
              {L(
                "O acesso é liberado automaticamente assim que o pagamento é processado.",
                "Access is released automatically as soon as the payment is processed.",
              )}
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{L("Filtrar materiais", "Filter materials")}</CardTitle>
          <CardDescription>
            {L(
              "Encontre o conteúdo ideal para o seu momento",
              "Find the ideal content for your moment",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary"
              size={18}
            />
            <Input
              className="pl-10"
              placeholder={L("Buscar material...", "Search material...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setActiveCategory(null)}>
              <Badge
                variant={activeCategory === null ? "default" : "outline"}
                className="cursor-pointer"
              >
                {L("Todos", "All")}
              </Badge>
            </button>
            {allCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
              >
                <Badge
                  variant={activeCategory === cat ? "default" : "outline"}
                  className="cursor-pointer"
                >
                  {cat}
                </Badge>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{L("Minha biblioteca", "My library")}</CardTitle>
              <CardDescription>
                {L(
                  "Materiais liberados para você",
                  "Materials unlocked for you",
                )}
              </CardDescription>
            </div>
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles size={22} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {ownedList.length === 0 ? (
            <EmptyState
              icon={<Book size={26} className="text-text-secondary" />}
              title={L(
                "Nenhum material liberado ainda",
                "No materials unlocked yet",
              )}
              description={L(
                "Adquira um e-book abaixo ou aguarde novos conteúdos exclusivos.",
                "Purchase an e-book below or wait for new exclusive content.",
              )}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ownedList.map((ebook, index) => (
                <div
                  key={ebook.id}
                  className="rounded-xl border border-border bg-surface overflow-hidden hover:shadow-md transition-shadow flex flex-col"
                >
                  <div className="h-32 relative">
                    {renderCover(ebook, ACCENTS[index % ACCENTS.length])}
                    <div className="absolute top-3 right-3 flex gap-2">
                      {ebook.is_free ? (
                        <Badge variant="success">{L("Grátis", "Free")}</Badge>
                      ) : (
                        <Badge variant="success">
                          <CheckCircle2 size={12} className="mr-1" />
                          {L("Adquirido", "Owned")}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="p-4 space-y-3 flex flex-col flex-1">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {categoriesOf(ebook)
                          .slice(0, 1)
                          .map((c) => (
                            <Badge
                              key={c}
                              variant="outline"
                              className="text-[11px]"
                            >
                              {c}
                            </Badge>
                          ))}
                        {!!ebook.pages_count && (
                          <span className="text-xs text-text-secondary">
                            {ebook.pages_count} {L("pgs", "pgs")}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-text leading-snug line-clamp-2 min-h-[2.5rem]">
                        {titleOf(ebook)}
                      </h3>
                      {!!summaryOf(ebook) && (
                        <p className="text-xs text-text-secondary line-clamp-2">
                          {summaryOf(ebook)}
                        </p>
                      )}
                    </div>
                    <div className="mt-auto pt-1">
                      {ebook.external_url ? (
                        <Button
                          asChild
                          size="sm"
                          variant="primary"
                          className="w-full gap-1.5 text-xs h-9"
                        >
                          <a
                            href={ebook.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink size={14} />
                            {L("Acessar e-book", "Access e-book")}
                          </a>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-full gap-1.5 text-xs h-9"
                          disabled
                        >
                          <Lock size={14} />
                          {L("Link indisponível", "Link unavailable")}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{L("Todos os materiais", "All materials")}</CardTitle>
              <CardDescription>
                {L(
                  "Explore toda a biblioteca de ebooks",
                  "Explore the whole e-book library",
                )}
              </CardDescription>
            </div>
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Book size={22} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {catalogList.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={26} className="text-text-secondary" />}
              title={L("Nenhum material encontrado", "No materials found")}
              description={L(
                "Ajuste a busca ou selecione outra categoria.",
                "Adjust your search or select another category.",
              )}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalogList.map((ebook, index) => (
                <div
                  key={ebook.id}
                  className="rounded-xl border border-border bg-surface overflow-hidden hover:shadow-md transition-shadow flex flex-col"
                >
                  <div className="h-32 relative">
                    {renderCover(ebook, ACCENTS[index % ACCENTS.length])}
                    <div className="absolute top-3 right-3">
                      {ebook.is_free ? (
                        <Badge variant="success">{L("Grátis", "Free")}</Badge>
                      ) : (
                        <Badge variant="warning">{L("Pago", "Paid")}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="p-4 space-y-3 flex flex-col flex-1">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {categoriesOf(ebook)
                          .slice(0, 1)
                          .map((c) => (
                            <Badge
                              key={c}
                              variant="outline"
                              className="text-[11px]"
                            >
                              {c}
                            </Badge>
                          ))}
                        {!!ebook.pages_count && (
                          <span className="text-xs text-text-secondary">
                            {ebook.pages_count} {L("pgs", "pgs")}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-text leading-snug line-clamp-2 min-h-[2.5rem]">
                        {titleOf(ebook)}
                      </h3>
                      {!!summaryOf(ebook) && (
                        <p className="text-xs text-text-secondary line-clamp-2">
                          {summaryOf(ebook)}
                        </p>
                      )}
                    </div>
                    <div className="mt-auto pt-1 space-y-2">
                      <p className="text-sm font-bold text-text">
                        {formatPrice(ebook)}
                      </p>
                      <Button
                        size="sm"
                        variant="primary"
                        className="w-full gap-1.5 text-xs h-9"
                        onClick={() => openPurchase(ebook)}
                      >
                        <Lock size={14} />
                        {L("Comprar", "Buy")}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog isOpen={!!selected} onClose={closePurchase} className="max-w-lg">
        {selected && (
          <>
            <DialogHeader>
              <DialogTitle>{titleOf(selected)}</DialogTitle>
              <DialogDescription>
                {L(
                  "Escolha a forma de pagamento para desbloquear este e-book.",
                  "Choose a payment method to unlock this e-book.",
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border border-border bg-surface-secondary p-4 flex items-center justify-between">
              <span className="text-sm text-text-secondary">
                {L("Valor", "Amount")}
              </span>
              <span className="text-lg font-bold text-text">
                {formatPrice(selected)}
              </span>
            </div>

            {error && (
              <p className="mt-3 text-sm text-text rounded-lg border border-text/25 bg-text/[0.08] px-3 py-2">
                {error}
              </p>
            )}

            {pixData ? (
              <div className="mt-4">
                <PixDisplay
                  qrCodeBase64={pixData.pix_qr_code}
                  copyPaste={pixData.pix_copy_paste}
                  expiresAt={pixData.pix_expires_at}
                  amountCents={selected.price_cents}
                  currency={selected.currency || "BRL"}
                  locale={locale}
                  onRefresh={buyWithPix}
                />
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={buyWithCard}
                  disabled={loading !== null}
                  className="rounded-xl border border-border bg-surface p-4 text-left hover:border-primary transition-colors disabled:opacity-60"
                >
                  <CreditCard size={20} className="text-primary mb-2" />
                  <p className="text-sm font-semibold text-text">
                    {L("Cartão de crédito", "Credit card")}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {loading === "stripe" ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Loader2 size={12} className="animate-spin" />
                        {L("Abrindo...", "Opening...")}
                      </span>
                    ) : (
                      L("Checkout seguro Stripe", "Secure Stripe checkout")
                    )}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={buyWithPix}
                  disabled={loading !== null}
                  className="rounded-xl border border-border bg-surface p-4 text-left hover:border-primary transition-colors disabled:opacity-60"
                >
                  <QrCode size={20} className="text-primary mb-2" />
                  <p className="text-sm font-semibold text-text">PIX</p>
                  <p className="text-xs text-text-secondary">
                    {loading === "pix" ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Loader2 size={12} className="animate-spin" />
                        {L("Gerando...", "Generating...")}
                      </span>
                    ) : (
                      L("Liberação imediata", "Immediate release")
                    )}
                  </p>
                </button>
              </div>
            )}

            <div className="flex items-center justify-end mt-4">
              <Button variant="ghost" onClick={closePurchase}>
                {L("Fechar", "Close")}
              </Button>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}
