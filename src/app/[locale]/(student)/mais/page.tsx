import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { MoreHorizontal, MessageCircle } from "lucide-react";
import { requireAuthenticated } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mais",
};

export default async function MorePage({
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
      <PageHeader
        title={nav("moreOptions")}
        description={s("comingSoon")}
        icon={<MoreHorizontal size={22} />}
      />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{nav("moreOptions")}</CardTitle>
              <CardDescription>{s("comingSoon")}</CardDescription>
            </div>
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <MoreHorizontal size={22} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <EmptyState
            className="py-16"
            icon={<MoreHorizontal size={40} className="text-text-secondary" />}
            title={nav("moreOptions")}
            description={s("comingSoon")}
            action={
              <Button variant="secondary" size="md">
                <MessageCircle size={16} className="mr-2" />
                {s("ctaContact")}
              </Button>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
