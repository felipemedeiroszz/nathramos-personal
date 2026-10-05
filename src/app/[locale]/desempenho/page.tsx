import Link from "next/link";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { PublicHeader } from "@/components/shared/PublicHeader";
import { PublicFooter } from "@/components/shared/PublicFooter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Chart } from "@/components/ui/Chart";
import {
  Droplet,
  Moon,
  Scale,
  Gauge,
  TrendingUp,
  Sparkles,
  Percent,
  Target,
  LineChart,
  BarChart3,
  Activity,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Desempenho",
  description:
    "Acompanhe sua evolução com métricas de hidratação, sono, peso e médias gerais. Gráficos e relatórios completos da sua transformação.",
};

const metricIcons = [Droplet, Moon, Scale, Gauge];
const metricKeys = ["water", "sleep", "weight", "averages"];

const weightMockData = [
  { name: "01", value: 85 },
  { name: "03", value: 84.5 },
  { name: "05", value: 83.8 },
  { name: "07", value: 83.2 },
  { name: "09", value: 82.6 },
  { name: "11", value: 82 },
  { name: "13", value: 81.4 },
  { name: "15", value: 80.9 },
  { name: "17", value: 80.5 },
  { name: "19", value: 80.1 },
  { name: "21", value: 79.6 },
  { name: "23", value: 79.2 },
  { name: "25", value: 78.8 },
  { name: "27", value: 78.4 },
  { name: "29", value: 78 },
];

export default async function DesempenhoPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);

  const t = await getTranslations("performancePage");
  const tn = await getTranslations("nav");
  const tc = await getTranslations("common");

  return (
    <>
      <PublicHeader locale={locale} />

      <main className="animate-fade-in">
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
          <div className="mx-auto max-w-7xl px-4 md:px-6 py-20 md:py-28 relative">
            <div className="max-w-3xl space-y-6">
              <Badge variant="outline">{tn("performance")}</Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-text text-balance leading-tight">
                {t("heroTitle")}
              </h1>
              <p className="text-lg md:text-xl text-text-secondary max-w-2xl">
                {t("heroSubtitle")}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button asChild size="lg">
                  <Link href={`/${locale}/cadastro`}>{tc("startNow")}</Link>
                </Button>
                <Button asChild variant="secondary" size="lg">
                  <Link href={`/${locale}/mentoria`}>{tn("mentoring")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 md:px-6 py-20 md:py-24">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <Badge variant="outline">{t("metricsTitle")}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
              {t("metricsSubtitle")}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[0, 1, 2, 3].map((i) => {
              const Icon = metricIcons[i];
              const k = metricKeys[i];
              return (
                <Card
                  key={k}
                  className="group hover:-translate-y-1 transition-transform duration-300 border-border/60"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Icon size={22} className="text-primary" />
                      </div>
                      {i === 0 && (
                        <Badge variant="success" className="text-[10px] h-6">
                          <span className="flex items-center gap-1">
                            <Percent size={10} />
                            92%
                          </span>
                        </Badge>
                      )}
                      {i === 1 && (
                        <Badge variant="success" className="text-[10px] h-6">
                          7h30
                        </Badge>
                      )}
                      {i === 2 && (
                        <Badge variant="outline" className="text-[10px] h-6">
                          -7kg
                        </Badge>
                      )}
                      {i === 3 && (
                        <Badge className="text-[10px] h-6">
                          <span className="flex items-center gap-1">
                            <Target size={10} />
                            89%
                          </span>
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg">{t(`${k}Title`)}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      {t(`${k}Desc`)}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="bg-surface border-y border-border">
          <div className="mx-auto max-w-7xl px-4 md:px-6 py-20 md:py-24">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
              <Badge variant="outline" className="inline-flex items-center gap-2">
                <LineChart size={14} />
                {t("chartTitle")}
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
                {t("chartTitle")}
              </h2>
              <p className="text-text-secondary text-lg">{t("chartDesc")}</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-border/60">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <TrendingUp size={18} className="text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Evolução do Peso</CardTitle>
                        <CardDescription className="text-sm">
                          Últimos 30 dias
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] h-6">
                        <span className="flex items-center gap-1">
                          <LineChart size={10} />
                          -8.2%
                        </span>
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Chart
                    data={weightMockData}
                    type="area"
                    xKey="name"
                    yKey="value"
                    className="h-72"
                  />
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="border-border/60">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BarChart3 size={18} className="text-primary" />
                      </div>
                      <CardTitle className="text-lg">Adesão Semanal</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Chart
                      data={[
                        { name: "Seg", value: 100 },
                        { name: "Ter", value: 95 },
                        { name: "Qua", value: 88 },
                        { name: "Qui", value: 92 },
                        { name: "Sex", value: 85 },
                        { name: "Sáb", value: 78 },
                        { name: "Dom", value: 90 },
                      ]}
                      type="bar"
                      className="h-40"
                    />
                  </CardContent>
                </Card>

                <Card className="border-border/60">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Activity size={18} className="text-primary" />
                      </div>
                      <CardTitle className="text-lg">Distribuição</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Chart
                      data={[
                        { name: "Treino", value: 40 },
                        { name: "Dieta", value: 35 },
                        { name: "Recuperação", value: 25 },
                      ]}
                      type="pie"
                      className="h-40"
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 md:px-6 py-16 md:py-20">
          <Card className="bg-gradient-to-br from-primary/15 via-surface to-surface border-primary/30">
            <CardContent className="p-10 md:p-14 text-center space-y-6">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-primary shadow-[0_0_30px_hsl(var(--primary)/0.25)] flex items-center justify-center">
                <Sparkles size={26} className="text-primary-foreground" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
                {t("ctaTitle")}
              </h2>
              <p className="text-lg text-text-secondary max-w-xl mx-auto">
                {t("ctaSubtitle")}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Button asChild size="lg">
                  <Link href={`/${locale}/cadastro`}>{t("ctaButton")}</Link>
                </Button>
                <Button asChild variant="secondary" size="lg">
                  <Link href={`/${locale}/dietas`}>{tn("diets")}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <PublicFooter locale={locale} />
    </>
  );
}
