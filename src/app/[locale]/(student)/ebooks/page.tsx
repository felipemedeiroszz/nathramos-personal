import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Book,
  BookOpen,
  Search,
  Sparkles,
  Download,
  Clock,
  CheckCircle,
  Star,
  ChevronRight,
} from "lucide-react";
import { requireAuthenticated } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Biblioteca Digital",
};

const categories = [
  { name: "Todos", count: null, active: true },
  { name: "Nutrição", count: 12, active: false },
  { name: "Treino", count: 10, active: false },
  { name: "Estilo de vida", count: 6, active: false },
  { name: "Mindset", count: 5, active: false },
  { name: "Receitas", count: 9, active: false },
];

const categoryColors: Record<string, { bg: string; text: string; accent: string }> = {
  "Nutrição": { bg: "bg-emerald-500/15", text: "text-emerald-600", accent: "from-emerald-500 to-green-600" },
  "Treino": { bg: "bg-orange-500/15", text: "text-orange-600", accent: "from-orange-500 to-red-600" },
  "Estilo de vida": { bg: "bg-sky-500/15", text: "text-sky-600", accent: "from-sky-500 to-blue-600" },
  "Mindset": { bg: "bg-violet-500/15", text: "text-violet-600", accent: "from-violet-500 to-purple-600" },
  "Receitas": { bg: "bg-amber-500/15", text: "text-amber-600", accent: "from-amber-500 to-orange-500" },
};

const featured = [
  {
    title: "Guia Completo de Hipertrofia 2024",
    category: "Treino",
    author: "Nath Ramos",
    pages: 45,
    updated: "Atualizado setembro/24",
    description: "Ciência aplicada ao ganho de massa muscular sem anabolizantes.",
    progress: 62,
    badge: { label: "Novo", variant: "success" as const },
  },
  {
    title: "Cardápio de 28 dias para Definição",
    category: "Nutrição",
    author: null,
    pages: 80,
    updated: null,
    description: "Cardápios para homem e mulher com trocas inteligentes e contagem de macros.",
    progress: 18,
    badge: { label: "Mais lido", variant: "default" as const },
  },
];

const ebooks = [
  {
    title: "Receitas Proteicas 30 minutos ou menos",
    category: "Receitas",
    pages: 25,
    progress: 100,
    badge: { label: "Concluído", variant: "success" as const },
  },
  {
    title: "10 fundamentos da suplementação",
    category: "Nutrição",
    pages: 18,
    progress: 40,
    badge: null,
  },
  {
    title: "Técnicas de execução perfeita: 20 exercícios",
    category: "Treino",
    pages: 32,
    progress: 0,
    badge: { label: "Começar", variant: "default" as const },
  },
  {
    title: "Mindset campeão para o longo prazo",
    category: "Mindset",
    pages: 22,
    progress: 55,
    badge: null,
  },
  {
    title: "Sono de atleta: 7 passos para recuperar melhor",
    category: "Estilo de vida",
    pages: 16,
    progress: 80,
    badge: null,
  },
  {
    title: "Shakes e smoothies pós e pré-treino",
    category: "Receitas",
    pages: 20,
    progress: 30,
    badge: null,
  },
  {
    title: "Aquecimento inteligente para lesão zero",
    category: "Treino",
    pages: 14,
    progress: 0,
    badge: { label: "Novo", variant: "success" as const },
  },
  {
    title: "Estratégias de recuperação ativa",
    category: "Estilo de vida",
    pages: 28,
    progress: 0,
    badge: null,
  },
];

const recentReads = [
  {
    title: "Guia Completo de Hipertrofia 2024",
    category: "Treino",
    progress: 62,
    chapter: "Cap. 8 de 12 — Periodização ondulatória diária",
  },
  {
    title: "Sono de atleta: 7 passos para recuperar melhor",
    category: "Estilo de vida",
    progress: 80,
    chapter: "Cap. 6 de 7 — Melhores suplementos para dormir",
  },
  {
    title: "Mindset campeão para o longo prazo",
    category: "Mindset",
    progress: 55,
    chapter: "Cap. 4 de 7 — Lidar com frustrações",
  },
];

const upcoming = [
  { title: "Treino de Força para Mulheres", days: 7 },
  { title: "Guia da Dieta Mediterrânea", days: 14 },
  { title: "Manual de Mobilidade Articular", days: 21 },
];

export default async function EbooksPage({
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
    <div className="space-y-6 w-full">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-text">Biblioteca Digital</h1>
        <p className="text-sm md:text-base text-text-secondary">
          Materiais exclusivos para alunos Nath Ramos
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Filtrar materiais</CardTitle>
          <CardDescription>Encontre o conteúdo ideal para o seu momento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
            <Input className="pl-10" placeholder="Buscar material..." />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button key={cat.name} type="button">
                <Badge
                  variant={cat.active ? "default" : "outline"}
                  className="cursor-pointer"
                >
                  {cat.name}
                  {cat.count !== null && (
                    <span className={cat.active ? "ml-1.5 opacity-80" : "ml-1.5"}>
                      ({cat.count})
                    </span>
                  )}
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
              <CardTitle>Destaques</CardTitle>
              <CardDescription>Continue sua leitura ou baixe os favoritos</CardDescription>
            </div>
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles size={22} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {featured.map((item) => {
              const colors = categoryColors[item.category];
              return (
                <div
                  key={item.title}
                  className="rounded-xl border border-border bg-gradient-to-br from-surface to-surface-secondary p-5 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3 min-w-0">
                      <div
                        className={`shrink-0 w-14 h-16 rounded-lg bg-gradient-to-br ${colors.accent} flex items-center justify-center shadow-lg`}
                      >
                        <Book size={26} className="text-white" />
                      </div>
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={`${colors.bg} ${colors.text} border-transparent`}>
                            {item.category}
                          </Badge>
                          {item.badge && <Badge variant={item.badge.variant}>{item.badge.label}</Badge>}
                        </div>
                        <h3 className="text-base font-semibold text-text leading-tight truncate">
                          {item.title}
                        </h3>
                        <p className="text-xs text-text-secondary flex items-center gap-2 flex-wrap">
                          {item.author && <span>{item.author}</span>}
                          {item.author && <span>•</span>}
                          <span>{item.pages} páginas</span>
                          {item.updated && (
                            <>
                              <span>•</span>
                              <span>{item.updated}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-text-secondary line-clamp-2">{item.description}</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-secondary">Progresso lido</span>
                      <span className="font-semibold text-text">{item.progress}%</span>
                    </div>
                    <Progress value={item.progress} />
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" className="gap-1.5">
                      <BookOpen size={16} />
                      Continuar leitura
                    </Button>
                    <Button size="sm" variant="secondary" className="gap-1.5">
                      <Download size={16} />
                      Baixar PDF
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Todos os materiais</CardTitle>
              <CardDescription>Explore toda a biblioteca de ebooks</CardDescription>
            </div>
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Book size={22} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ebooks.map((ebook) => {
              const colors = categoryColors[ebook.category];
              return (
                <div
                  key={ebook.title}
                  className="rounded-xl border border-border bg-surface overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className={`h-32 bg-gradient-to-br ${colors.accent} relative flex items-center justify-center`}>
                    <BookOpen size={44} className="text-white/90" />
                    {ebook.badge && (
                      <div className="absolute top-3 right-3">
                        <Badge variant={ebook.badge.variant}>{ebook.badge.label}</Badge>
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`${colors.bg} ${colors.text} border-transparent text-[11px]`}>
                          {ebook.category}
                        </Badge>
                        <span className="text-xs text-text-secondary">{ebook.pages} pgs</span>
                      </div>
                      <h3 className="text-sm font-semibold text-text leading-snug line-clamp-2 min-h-[2.5rem]">
                        {ebook.title}
                      </h3>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-text-secondary">
                          {ebook.progress === 0 ? "Não iniciado" : ebook.progress === 100 ? "Concluído" : "Em andamento"}
                        </span>
                        <span className="font-semibold text-text">{ebook.progress}%</span>
                      </div>
                      <Progress value={ebook.progress} />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="primary" className="flex-1 gap-1 text-xs h-9 px-2">
                        <BookOpen size={14} />
                        Ler
                      </Button>
                      <Button size="sm" variant="secondary" className="flex-1 gap-1 text-xs h-9 px-2">
                        <Download size={14} />
                        PDF
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Continuar de onde parou</CardTitle>
              <CardDescription>Seus materiais acessados recentemente</CardDescription>
            </div>
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Clock size={22} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentReads.map((item) => {
              const colors = categoryColors[item.category];
              return (
                <button
                  key={item.title}
                  type="button"
                  className="text-left rounded-xl border border-border bg-surface p-4 hover:border-primary hover:bg-surface-secondary transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`shrink-0 w-10 h-10 rounded-lg ${colors.bg} ${colors.text} flex items-center justify-center`}>
                      <BookOpen size={20} />
                    </div>
                    <ChevronRight size={18} className="text-text-secondary group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                  </div>
                  <div className="mt-3 space-y-1">
                    <Badge variant="outline" className={`${colors.bg} ${colors.text} border-transparent text-[11px] mb-1`}>
                      {item.category}
                    </Badge>
                    <h4 className="text-sm font-semibold text-text leading-tight line-clamp-1">{item.title}</h4>
                    <p className="text-xs text-text-secondary line-clamp-1">{item.chapter}</p>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-text-secondary">Progresso</span>
                      <span className="font-semibold text-text">{item.progress}%</span>
                    </div>
                    <Progress value={item.progress} />
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Novidades chegando</CardTitle>
              <CardDescription>Materiais em breve na sua biblioteca</CardDescription>
            </div>
            <div className="w-11 h-11 rounded-xl bg-yellow-500/10 text-yellow-600 flex items-center justify-center">
              <Star size={22} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {upcoming.map((item, index) => (
              <div
                key={item.title}
                className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-yellow-500/10 text-yellow-600 flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-text truncate">{item.title}</h4>
                    <p className="text-xs text-text-secondary mt-0.5">
                      <Clock size={12} className="inline mr-1 -translate-y-0.5" />
                      Disponível em {item.days} dias
                    </p>
                  </div>
                </div>
                <Badge variant="warning">Em breve</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
