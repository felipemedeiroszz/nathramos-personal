import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ShoppingCart } from "lucide-react";
import { requireAuthenticated } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lista de Compras",
};

export default async function ShoppingListPage({
  params: { locale },
}: {
  params: { locale: (typeof locales)[number] };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const nav = await getTranslations("navigation");
  const s = await getTranslations("studentPages");
  await requireAuthenticated();

  return (
    <div className="space-y-6 w-full">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-text">{nav("shoppingList")}</h1>
        <p className="text-sm md:text-base text-text-secondary">{s("comingSoon")}</p>
      </header>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{nav("shoppingList")}</CardTitle>
              <CardDescription>{s("comingSoon")}</CardDescription>
            </div>
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <ShoppingCart size={22} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <EmptyState
            className="py-16"
            icon={<ShoppingCart size={40} className="text-text-secondary" />}
            title={nav("shoppingList")}
            description={s("comingSoon")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
