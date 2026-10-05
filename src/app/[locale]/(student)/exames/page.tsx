import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Stethoscope,
  CalendarDays,
  Activity,
  CheckCircle,
  FileText,
  Upload,
  Cloud,
  Download,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  MapPin,
  Clock,
  ChevronRight,
  Bell,
} from "lucide-react";
import { requireAuthenticated } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Exames Médicos",
};

export default async function ExamsPage({
  params: { locale },
}: {
  params: { locale: (typeof locales)[number] };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  await getTranslations("navigation");
  await requireAuthenticated();

  const marcadores = [
    {
      nome: "Colesterol total",
      valor: "178 mg/dL",
      referencia: "< 200 mg/dL",
      tendencia: "down",
      variacao: "-22",
      badge: { variant: "success" as const, label: "Ideal" },
      corTexto: "text-green-600",
    },
    {
      nome: "HDL (bom)",
      valor: "58 mg/dL",
      referencia: "> 40 mg/dL",
      tendencia: "up",
      variacao: "+3",
      badge: { variant: "success" as const, label: "Ótimo" },
      corTexto: "text-green-600",
    },
    {
      nome: "LDL (ruim)",
      valor: "102 mg/dL",
      referencia: "< 100 mg/dL",
      tendencia: null,
      variacao: null,
      badge: { variant: "warning" as const, label: "Atenção" },
      corTexto: "text-text-secondary",
    },
    {
      nome: "Triglicerídeos",
      valor: "89 mg/dL",
      referencia: "< 150 mg/dL",
      tendencia: null,
      variacao: null,
      badge: { variant: "success" as const, label: "Normal" },
      corTexto: "text-text-secondary",
    },
    {
      nome: "Glicose jejum",
      valor: "86 mg/dL",
      referencia: "70 - 99 mg/dL",
      tendencia: null,
      variacao: null,
      badge: { variant: "success" as const, label: "Ideal" },
      corTexto: "text-text-secondary",
    },
    {
      nome: "Vitamina D",
      valor: "38 ng/mL",
      referencia: "30 - 100 ng/mL",
      tendencia: null,
      variacao: null,
      badge: { variant: "outline" as const, label: "Suficiente" },
      corTexto: "text-text-secondary",
    },
    {
      nome: "TSH",
      valor: "2.1 mUI/L",
      referencia: "0.4 - 4.0 mUI/L",
      tendencia: null,
      variacao: null,
      badge: { variant: "success" as const, label: "Normal" },
      corTexto: "text-text-secondary",
    },
    {
      nome: "Ferritina",
      valor: "78 ng/mL",
      referencia: "30 - 300 ng/mL",
      tendencia: null,
      variacao: null,
      badge: { variant: "success" as const, label: "Normal" },
      corTexto: "text-text-secondary",
    },
  ];

  const historico = [
    {
      data: "12/09/2024",
      tipo: "Checkup completo",
      detalhes: "Sangue + Colesterol + TSH + Vitamina D",
      resultado: "Todos normais",
      badge: { variant: "success" as const, label: "Normal" },
      medico: null,
    },
    {
      data: "10/08/2024",
      tipo: "Urina EAS + Rotina",
      detalhes: null,
      resultado: "Normal",
      badge: { variant: "success" as const, label: "Normal" },
      medico: null,
    },
    {
      data: "05/07/2024",
      tipo: "ECG de repouso",
      detalhes: null,
      resultado: "Normal",
      badge: { variant: "success" as const, label: "Normal" },
      medico: "Dr. Carlos",
    },
    {
      data: "15/05/2024",
      tipo: "Ultrassom abdome total",
      detalhes: null,
      resultado: "Normal",
      badge: { variant: "success" as const, label: "Normal" },
      medico: null,
    },
    {
      data: "10/03/2024",
      tipo: "Densitometria óssea",
      detalhes: null,
      resultado: "Massa óssea normal (T-score +0.5)",
      badge: { variant: "success" as const, label: "Normal" },
      medico: null,
    },
    {
      data: "20/11/2023",
      tipo: "Ergometria",
      detalhes: "Caminhada na esteira",
      resultado: "Sem alterações isquêmicas",
      badge: { variant: "success" as const, label: "Normal" },
      medico: null,
    },
  ];

  const agendados = [
    {
      data: "15/12/2024",
      tipo: "Sangue anual",
      detalhes: "Hemograma, Colesterol, Glicose, TSH",
      local: "Clínica São Lucas",
      horario: "07:30",
      observacao: "Jejum 12h",
      badge: { variant: "warning" as const, label: "Atenção" },
    },
    {
      data: "20/01/2025",
      tipo: "Densitometria óssea",
      detalhes: "Acompanhamento massa óssea",
      local: "Diagnóstico Centro",
      horario: "10:00",
      observacao: null,
      badge: { variant: "outline" as const, label: "Agendado" },
    },
    {
      data: "22/01/2025",
      tipo: "Cardio (Ergometria)",
      detalhes: null,
      local: "Clínica do Coração",
      horario: "14:00",
      observacao: null,
      badge: { variant: "outline" as const, label: "Agendado" },
    },
  ];

  return (
    <div className="space-y-6 md:space-y-8 w-full">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-text">Exames Médicos</h1>
        <p className="text-sm md:text-base text-text-secondary">
          Resultados, históricos e check-ups
        </p>
      </header>

      <section className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        <Card className="md:col-span-2 xl:col-span-3 border-l-4 border-l-green-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Resumo geral</CardTitle>
                <CardDescription>Panorama dos seus exames</CardDescription>
              </div>
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Stethoscope size={22} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:gap-6 grid-cols-2 md:grid-cols-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-text-secondary">
                  <FileText size={16} />
                  <span className="text-xs font-medium uppercase tracking-wide">Total</span>
                </div>
                <div className="text-2xl font-bold text-text">8</div>
                <div className="text-xs text-text-secondary">exames realizados</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-text-secondary">
                  <CalendarDays size={16} />
                  <span className="text-xs font-medium uppercase tracking-wide">Último</span>
                </div>
                <div className="text-xl font-bold text-text">12/09/2024</div>
                <div className="text-xs text-text-secondary">Checkup completo</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-text-secondary">
                  <Activity size={16} />
                  <span className="text-xs font-medium uppercase tracking-wide">Próximo</span>
                </div>
                <div className="text-xl font-bold text-text">15/12/2024</div>
                <div className="text-xs text-text-secondary">Sangue anual</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-text-secondary">
                  <CheckCircle size={16} />
                  <span className="text-xs font-medium uppercase tracking-wide">Status geral</span>
                </div>
                <div className="pt-1">
                  <Badge variant="success" className="px-3 py-1 text-xs">
                    <CheckCircle size={12} className="mr-1" />
                    Todos dentro da normalidade
                  </Badge>
                </div>
                <div className="text-xs text-text-secondary pt-1">Excelente saúde</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 xl:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Próximos exames agendados</CardTitle>
                <CardDescription>
                  {agendados.length} exames programados
                </CardDescription>
              </div>
              <div className="w-11 h-11 rounded-xl bg-yellow-500/10 text-yellow-600 flex items-center justify-center">
                <CalendarDays size={22} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {agendados.map((exame, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-border bg-surface-secondary/30 p-4 md:p-5"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-text">{exame.data}</span>
                      <span className="text-text-secondary">•</span>
                      <span className="font-semibold text-text">{exame.tipo}</span>
                      <Badge variant={exame.badge.variant}>{exame.badge.label}</Badge>
                    </div>
                    {exame.detalhes && (
                      <p className="text-sm text-text-secondary">{exame.detalhes}</p>
                    )}
                    <div className="flex flex-wrap gap-4 pt-1 text-sm">
                      <div className="flex items-center gap-1.5 text-text-secondary">
                        <MapPin size={14} />
                        <span>{exame.local}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-text-secondary">
                        <Clock size={14} />
                        <span>{exame.horario}</span>
                      </div>
                      {exame.observacao && (
                        <div className="flex items-center gap-1.5 text-yellow-600 font-medium">
                          <AlertCircle size={14} />
                          <span>{exame.observacao}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm">
                      Ver detalhes
                      <ChevronRight size={16} className="ml-1" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Bell size={16} className="mr-1" />
                      Lembrar-me
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 xl:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Histórico de exames</CardTitle>
                <CardDescription>
                  {historico.length} exames realizados nos últimos 12 meses
                </CardDescription>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <FileText size={22} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {historico.map((exame, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-border p-4 hover:border-primary/40 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                        {exame.data}
                      </span>
                      <span className="font-semibold text-text">{exame.tipo}</span>
                      <Badge variant={exame.badge.variant}>{exame.badge.label}</Badge>
                    </div>
                    {exame.detalhes && (
                      <p className="text-xs text-text-secondary">{exame.detalhes}</p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary pt-0.5">
                      <span>{exame.resultado}</span>
                      {exame.medico && <span>• {exame.medico}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" size="sm">
                      <Download size={16} className="mr-1.5" />
                      Baixar PDF
                    </Button>
                    <Button variant="secondary" size="sm">
                      Ver resultados
                      <ChevronRight size={16} className="ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 xl:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Marcadores chave</CardTitle>
                <CardDescription>Últimos resultados e evolução</CardDescription>
              </div>
              <div className="w-11 h-11 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center">
                <Activity size={22} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {marcadores.map((m, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border bg-surface-secondary/30 p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium text-text-secondary">{m.nome}</span>
                    <Badge variant={m.badge.variant}>{m.badge.label}</Badge>
                  </div>
                  <div className="flex items-end justify-between gap-2 pt-1">
                    <div className="space-y-0.5">
                      <div className={`text-xl font-bold ${m.corTexto}`}>{m.valor}</div>
                      <div className="text-[11px] text-text-secondary">Ref. {m.referencia}</div>
                    </div>
                    {m.tendencia && (
                      <div
                        className={`flex items-center gap-0.5 font-semibold text-sm ${
                          m.tendencia === "down"
                            ? "text-green-600"
                            : "text-green-600"
                        }`}
                      >
                        {m.tendencia === "down" ? (
                          <TrendingDown size={16} />
                        ) : (
                          <TrendingUp size={16} />
                        )}
                        <span>{m.variacao}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 xl:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upload de novo exame</CardTitle>
                <CardDescription>
                  Selecione data, tipo e unidade depois do upload
                </CardDescription>
              </div>
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Upload size={22} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border-2 border-dashed border-border bg-surface-secondary/20 hover:border-primary/60 hover:bg-primary/5 transition-colors">
              <label className="flex flex-col items-center justify-center px-6 py-10 md:py-14 cursor-pointer text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Cloud size={32} />
                </div>
                <div className="space-y-1.5">
                  <p className="text-base md:text-lg font-semibold text-text">
                    Arraste arquivos PDF ou clique para selecionar
                  </p>
                  <p className="text-sm text-text-secondary">
                    Máximo 5 arquivos • Aceita PDF até 20MB
                  </p>
                </div>
                <div className="pt-1">
                  <Button type="button" size="md" variant="primary">
                    <Upload size={18} className="mr-2" />
                    Selecionar arquivos
                  </Button>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="application/pdf"
                  multiple
                />
              </label>
            </div>
            <div className="mt-4 flex items-start gap-2 text-xs text-text-secondary">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <p>
                Dica: Após o envio, você poderá classificar cada arquivo informando a data
                de realização, tipo do exame e unidade médica onde foi realizado.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
