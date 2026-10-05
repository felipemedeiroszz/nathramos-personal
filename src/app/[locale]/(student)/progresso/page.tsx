import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import { Chart } from "@/components/ui/Chart";
import { Button } from "@/components/ui/Button";
import {
  Scale,
  Activity,
  Dumbbell,
  Target,
  TrendingUp,
  TrendingDown,
  Trophy,
  Dumbbell as DumbbellIcon,
  ChevronUp,
  Calendar,
  Droplets,
  Moon,
  Apple,
  ArrowRight,
} from "lucide-react";
import { requireAuthenticated } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Progresso & Desempenho",
};

const weightData = [
  { name: "Jan", value: 82 },
  { name: "Fev", value: 81.5 },
  { name: "Mar", value: 80.8 },
  { name: "Abr", value: 80.5 },
  { name: "Mai", value: 80 },
  { name: "Jun", value: 79.8 },
  { name: "Jul", value: 79.5 },
  { name: "Ago", value: 79.2 },
  { name: "Set", value: 79 },
  { name: "Out", value: 78.8 },
  { name: "Nov", value: 78.6 },
  { name: "Dez", value: 78.5 },
];

const bodyMeasuresData = [
  { name: "Peito", value: 104, inicial: 108 },
  { name: "Cintura", value: 86, inicial: 92 },
  { name: "Quadril", value: 98, inicial: 102 },
  { name: "Coxa", value: 58, inicial: 60 },
  { name: "Braço", value: 38, inicial: 36 },
];

const personalRecords = [
  {
    exercise: "Supino reto",
    weight: "80 kg",
    date: "15/09",
    previous: "75 kg",
    gain: "+5 kg",
  },
  {
    exercise: "Agachamento livre",
    weight: "120 kg",
    date: "22/09",
    previous: "110 kg",
    gain: "+10 kg",
  },
  {
    exercise: "Levantamento terra",
    weight: "140 kg",
    date: "30/09",
    previous: "130 kg",
    gain: "+10 kg",
  },
  {
    exercise: "Desenvolvimento barra",
    weight: "40 kg",
    date: "01/10",
    previous: "35 kg",
    gain: "+5 kg",
  },
];

const adherenceData = [
  {
    label: "Treino",
    percentage: 92,
    detail: "23/25 sessões",
    icon: DumbbellIcon,
  },
  {
    label: "Dieta",
    percentage: 88,
    detail: "26/30 dias",
    icon: Apple,
  },
  {
    label: "Hidratação",
    percentage: 95,
    detail: "28.5/30 dias",
    icon: Droplets,
  },
  {
    label: "Sono",
    percentage: 83,
    detail: "25/30 dias",
    icon: Moon,
  },
];

export default async function ProgressPage({
  params: { locale },
}: {
  params: { locale: (typeof locales)[number] };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  await getTranslations("navigation");
  await getTranslations("studentPages");
  await requireAuthenticated();

  return (
    <div className="space-y-6 w-full pb-20 md:pb-6">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-text">Progresso & Desempenho</h1>
        <p className="text-sm md:text-base text-text-secondary">
          Acompanhe sua evolução ao longo do tempo
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Scale size={22} />
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-green-600">
                <TrendingDown size={14} />
                <span>-1,2 kg</span>
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <p className="text-sm text-text-secondary">Peso atual</p>
              <p className="text-2xl font-bold text-text">78,5 kg</p>
              <p className="text-xs text-text-secondary">esse mês</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                <Activity size={22} />
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-green-600">
                <TrendingDown size={14} />
                <span>-1,8%</span>
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <p className="text-sm text-text-secondary">Gordura corporal</p>
              <p className="text-2xl font-bold text-text">18,5%</p>
              <p className="text-xs text-text-secondary">esse mês</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <Dumbbell size={22} />
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-green-600">
                <TrendingUp size={14} />
                <span>+0,8 kg</span>
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <p className="text-sm text-text-secondary">Massa magra</p>
              <p className="text-2xl font-bold text-text">64 kg</p>
              <p className="text-xs text-text-secondary">esse mês</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Target size={22} />
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-green-600">
                <TrendingDown size={14} />
                <span>-0,4</span>
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <p className="text-sm text-text-secondary">IMC</p>
              <p className="text-2xl font-bold text-text">24,3</p>
              <Badge variant="success" className="mt-1">
                Normal
              </Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Evolução do Peso</CardTitle>
                <CardDescription>Últimos 12 meses</CardDescription>
              </div>
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <TrendingDown size={22} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Chart type="line" data={weightData} xKey="name" yKey="value" className="h-72" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Medidas Corporais</CardTitle>
                <CardDescription>Últimos 3 meses (Atual)</CardDescription>
              </div>
              <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <Activity size={22} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Chart type="bar" data={bodyMeasuresData} xKey="name" yKey="value" className="h-72" />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recordes Pessoais</CardTitle>
              <CardDescription>Suas maiores conquistas recentes</CardDescription>
            </div>
            <div className="w-11 h-11 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center">
              <Trophy size={22} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {personalRecords.map((pr) => (
              <div
                key={pr.exercise}
                className="flex items-center justify-between p-4 rounded-xl border border-border bg-surface-secondary/30"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center shrink-0">
                    <Trophy size={22} />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-text">{pr.exercise}</p>
                    <p className="text-xs text-text-secondary">
                      Antes: {pr.previous} • {pr.date}
                    </p>
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <p className="text-xl font-bold text-text">{pr.weight}</p>
                  <Badge variant="success" className="flex items-center gap-1 justify-end">
                    <ChevronUp size={12} />
                    {pr.gain}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Fotos Comparativas</CardTitle>
              <CardDescription>Veja sua transformação visual</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="h-48 bg-gradient-to-br from-slate-400 via-slate-500 to-slate-700 flex items-center justify-center">
                <div className="text-center text-white space-y-2">
                  <Calendar size={36} className="mx-auto opacity-80" />
                  <p className="text-sm font-medium opacity-90">Janeiro 2026</p>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-text text-lg">Início</h3>
                  <Badge variant="outline">Janeiro</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-0.5">
                    <p className="text-text-secondary">Peso</p>
                    <p className="font-semibold text-text">82 kg</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-text-secondary">Gordura</p>
                    <p className="font-semibold text-text">20,3%</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-text-secondary">Cintura</p>
                    <p className="font-semibold text-text">92 cm</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-text-secondary">IMC</p>
                    <p className="font-semibold text-text">25,4</p>
                  </div>
                </div>
                <Button variant="secondary" size="sm" className="w-full justify-center">
                  Ver mais fotos
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              <div className="h-48 bg-gradient-to-br from-primary via-fuchsia-500 to-pink-500 flex items-center justify-center">
                <div className="text-center text-white space-y-2">
                  <Trophy size={36} className="mx-auto opacity-90" />
                  <p className="text-sm font-medium opacity-95">Outubro 2026</p>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-text text-lg">Atual</h3>
                  <Badge variant="success">Atual</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-0.5">
                    <p className="text-text-secondary">Peso</p>
                    <div className="flex items-baseline gap-2">
                      <p className="font-semibold text-text">78,5 kg</p>
                      <span className="text-xs text-green-600 font-medium">-3,5</span>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-text-secondary">Gordura</p>
                    <div className="flex items-baseline gap-2">
                      <p className="font-semibold text-text">18,5%</p>
                      <span className="text-xs text-green-600 font-medium">-1,8%</span>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-text-secondary">Cintura</p>
                    <div className="flex items-baseline gap-2">
                      <p className="font-semibold text-text">86 cm</p>
                      <span className="text-xs text-green-600 font-medium">-6 cm</span>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-text-secondary">IMC</p>
                    <div className="flex items-baseline gap-2">
                      <p className="font-semibold text-text">24,3</p>
                      <span className="text-xs text-green-600 font-medium">-1,1</span>
                    </div>
                  </div>
                </div>
                <Button variant="primary" size="sm" className="w-full justify-center">
                  Ver mais fotos
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Adesão Geral</CardTitle>
              <CardDescription>Últimos 30 dias</CardDescription>
            </div>
            <div className="w-11 h-11 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center">
              <ChevronUp size={22} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {adherenceData.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Icon size={18} />
                      </div>
                      <div>
                        <p className="font-medium text-text text-sm">{item.label}</p>
                        <p className="text-xs text-text-secondary">{item.detail}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-text">{item.percentage}%</p>
                    </div>
                  </div>
                  <Progress value={item.percentage} max={100} />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
