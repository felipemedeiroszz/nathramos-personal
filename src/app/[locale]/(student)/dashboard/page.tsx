import type { Metadata } from "next";
import { setRequestLocale, getTranslations, getLocale } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { TodayWorkoutCard } from "@/components/student/workout/TodayWorkoutCard";
import {
  Utensils,
  Droplets,
  Moon,
  Scale,
  Target,
  MessageSquare,
  Bell,
  ChevronRight,
  LayoutDashboard,
} from "lucide-react";
import { createClientSSR } from "@/lib/supabase/server";
import { requireAuthenticated } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

type LocaleKey = (typeof locales)[number];

function greetingKey(hour: number) {
  if (hour >= 5 && hour < 12) return "greetingMorning";
  if (hour >= 12 && hour < 18) return "greetingAfternoon";
  if (hour >= 18 || hour < 5) return "greetingEvening";
  return "greetingDefault";
}

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage({
  params: { locale },
}: {
  params: { locale: LocaleKey };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");
  const nav = await getTranslations("navigation");
  const common = await getTranslations("common");

  const userId = await requireAuthenticated();

  let firstName: string | null = null;
  try {
    const supabase = await createClientSSR();
    const { data } = await supabase
      .from("profiles")
      .select<string, { first_name: string | null }>("first_name")
      .eq("id", userId)
      .limit(1)
      .maybeSingle();
    firstName = data?.first_name ?? null;
  } catch {}

  const displayName = firstName?.trim() || nav("greetingDefault").replace(/[.!?]+$/, "");

  const greeting = nav(greetingKey(new Date().getHours()));

  return (
    <div className="space-y-6 md:space-y-8 w-full">
      <PageHeader
        title={`${greeting}, ${displayName}`}
        description={t("subtitle")}
        icon={<LayoutDashboard size={22} />}
      />

      <section className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        <TodayWorkoutCard locale={locale} userId={userId} key={userId} />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t("nextMeal")}</CardTitle>
                <CardDescription>{common("today")}</CardDescription>
              </div>
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Utensils size={22} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <EmptyState
              className="py-10"
              icon={<Utensils size={32} className="text-text-secondary" />}
              title={t("nextMealEmpty")}
              description={t("nextMealEmptyDesc")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t("hydration")}</CardTitle>
                <CardDescription>{t("hydrationSubtitle")}</CardDescription>
              </div>
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Droplets size={22} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <EmptyState
              className="py-10"
              icon={<Droplets size={32} className="text-text-secondary" />}
              title={t("hydrationEmpty")}
              description={t("hydrationEmptyDesc")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t("sleep")}</CardTitle>
                <CardDescription>{t("sleepSubtitle")}</CardDescription>
              </div>
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Moon size={22} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <EmptyState
              className="py-10"
              icon={<Moon size={32} className="text-text-secondary" />}
              title={t("sleepEmpty")}
              description={t("sleepEmptyDesc")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t("weight")}</CardTitle>
                <CardDescription>{t("weightSubtitle")}</CardDescription>
              </div>
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Scale size={22} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <EmptyState
              className="py-10"
              icon={<Scale size={32} className="text-text-secondary" />}
              title={t("weightEmpty")}
              description={t("weightEmptyDesc")}
            />
          </CardContent>
        </Card>

        <Card className="md:col-span-2 xl:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t("progress")}</CardTitle>
                <CardDescription>{t("progressSubtitle")}</CardDescription>
              </div>
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Target size={22} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <EmptyState
              className="py-10"
              icon={<Target size={32} className="text-text-secondary" />}
              title={t("progressEmpty")}
              description={t("progressEmptyDesc")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t("mentoring")}</CardTitle>
                <CardDescription>{t("mentoringSubtitle")}</CardDescription>
              </div>
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <MessageSquare size={22} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <EmptyState
              className="py-10"
              icon={<MessageSquare size={32} className="text-text-secondary" />}
              title={t("mentoringEmpty")}
              description={t("mentoringEmptyDesc")}
            />
          </CardContent>
        </Card>

        <Card className="md:col-span-2 xl:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t("notifications")}</CardTitle>
                <CardDescription>{t("notificationsSubtitle")}</CardDescription>
              </div>
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Bell size={22} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <EmptyState
              className="py-10"
              icon={<Bell size={32} className="text-text-secondary" />}
              title={t("notificationsEmpty")}
              description={t("notificationsEmptyDesc")}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
