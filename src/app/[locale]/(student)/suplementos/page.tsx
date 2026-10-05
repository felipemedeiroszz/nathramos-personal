import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Pill,
  CalendarDays,
  AlertTriangle,
  Check,
  Clock,
  Package,
  FileText,
  Download,
  Plus,
  UserCheck,
} from "lucide-react";
import { requireAuthenticated } from "@/lib/auth/access";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Suplementos",
};

interface SupplementSummary {
  id: number;
  name: string;
  time: string;
  dosage: string;
  taken: boolean;
  color: string;
}

interface TimelineItem {
  id: number;
  time: string;
  name: string;
  dosage: string;
  status: "taken" | "pending" | "now";
  note?: string;
}

interface StockItem {
  id: number;
  name: string;
  size: string;
  remaining: number;
  color: "orange" | "green" | "amber" | "red";
  daysText: string;
  urgent?: boolean;
}

interface HistoryDay {
  day: string;
  status: "ok" | "fail" | "partial" | "pending";
  note?: string;
}

interface Prescription {
  id: number;
  title: string;
  issuer: string;
  issuedDate: string;
  validText: string;
}

const summarySupplements: SupplementSummary[] = [
  { id: 1, name: "Whey", time: "07:30 / 18:00", dosage: "30g", taken: true, color: "bg-blue-500/10 text-blue-500" },
  { id: 2, name: "Creatina", time: "14:00", dosage: "5g", taken: false, color: "bg-purple-500/10 text-purple-500" },
  { id: 3, name: "Ômega3", time: "12:00 / 20:30", dosage: "1g", taken: true, color: "bg-amber-500/10 text-amber-500" },
  { id: 4, name: "Multivitamínico", time: "08:00", dosage: "1 comp", taken: true, color: "bg-green-500/10 text-green-500" },
  { id: 5, name: "Cafeína", time: "10:00", dosage: "200mg", taken: true, color: "bg-orange-500/10 text-orange-500" },
];

const timeline: TimelineItem[] = [
  { id: 1, time: "07:30", name: "Whey Protein", dosage: "30g", status: "taken" },
  { id: 2, time: "08:00", name: "Multivitamínico", dosage: "1 comprimido", status: "taken" },
  { id: 3, time: "10:00", name: "Cafeína", dosage: "200mg", status: "taken", note: "pré treino" },
  { id: 4, time: "12:00", name: "Ômega 3", dosage: "1g", status: "taken" },
  { id: 5, time: "14:00", name: "Creatina", dosage: "5g", status: "now" },
  { id: 6, time: "18:00", name: "Whey Protein", dosage: "30g", status: "pending", note: "pós treino" },
  { id: 7, time: "20:30", name: "Ômega 3", dosage: "1g", status: "pending" },
];

const stock: StockItem[] = [
  { id: 1, name: "Whey Protein", size: "900g", remaining: 28, color: "orange", daysText: "Compra sugerida em 5 dias" },
  { id: 2, name: "Creatina", size: "300g", remaining: 60, color: "green", daysText: "Compra em 21 dias" },
  { id: 3, name: "Ômega 3", size: "120 cápsulas", remaining: 35, color: "amber", daysText: "Compra em 10 dias" },
  { id: 4, name: "Multivitamínico", size: "60 comp", remaining: 82, color: "green", daysText: "Compra em 45 dias" },
  { id: 5, name: "Cafeína", size: "60 caps", remaining: 10, color: "red", daysText: "Rápido! Repor", urgent: true },
];

const historyDays: HistoryDay[] = [
  { day: "Seg", status: "ok" },
  { day: "Ter", status: "ok" },
  { day: "Qua", status: "fail", note: "falhou creatina" },
  { day: "Qui", status: "ok" },
  { day: "Sex", status: "ok" },
  { day: "Sáb", status: "ok" },
  { day: "Dom", status: "partial", note: "hoje" },
];

const prescriptions: Prescription[] = [
  {
    id: 1,
    title: "Nath Ramos Personal Trainer",
    issuer: "Dr. Esporte",
    issuedDate: "10/09",
    validText: "Válida por 90 dias",
  },
  {
    id: 2,
    title: "Checkup anual",
    issuer: "Clínica Saúde",
    issuedDate: "05/08",
    validText: "Vence 05/08 próximo ano",
  },
];

export default async function SupplementsPage({
  params: { locale },
}: {
  params: { locale: (typeof locales)[number] };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);

  let tDiet;
  let tStudent;
  let tCommon;
  try {
    tDiet = await getTranslations("diet");
  } catch {
    tDiet = () => undefined;
  }
  try {
    tStudent = await getTranslations("studentPages");
  } catch {
    tStudent = () => undefined;
  }
  try {
    tCommon = await getTranslations("common");
  } catch {
    tCommon = () => undefined;
  }

  await requireAuthenticated();

  const title = "Suplementos";
  const subtitle = "Acompanhe sua suplementação diária";

  const takenToday = timeline.filter((t) => t.status === "taken").length;
  const totalToday = timeline.length;
  const adherenceRate = 92;

  const stockColorClass = (color: StockItem["color"]) => {
    switch (color) {
      case "orange":
        return "[&>div]:bg-orange-500";
      case "green":
        return "[&>div]:bg-green-500";
      case "amber":
        return "[&>div]:bg-amber-500";
      case "red":
        return "[&>div]:bg-red-500";
    }
  };

  const dayStatusClass = (status: HistoryDay["status"]) => {
    switch (status) {
      case "ok":
        return "bg-green-500 text-white border-green-500";
      case "fail":
        return "bg-red-500 text-white border-red-500";
      case "partial":
        return "bg-yellow-500 text-white border-yellow-500";
      case "pending":
        return "bg-surface-secondary text-text-secondary border-border";
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 py-8 pb-safe space-y-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold text-text">{title}</h1>
          <p className="text-sm md:text-base text-text-secondary">{subtitle}</p>
        </header>

        <Card className="relative overflow-hidden border-primary/20">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-surface to-surface" />
          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
              <div className="space-y-2">
                <Badge variant="success">
                  <Check size={12} className="mr-1" /> {takenToday}/{totalToday} tomados hoje
                </Badge>
                <div className="flex items-center gap-2">
                  <Badge variant="warning">
                    <Clock size={12} className="mr-1" /> Agora
                  </Badge>
                  <span className="text-sm font-semibold text-text">
                    Próximo às 14:00: Creatina 5g
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  <Package size={12} className="mr-1" /> {summarySupplements.length} suplementos ativos
                </Badge>
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Pill size={22} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {summarySupplements.map((sup) => (
                <div
                  key={sup.id}
                  className={cn(
                    "rounded-xl border p-3 space-y-2 transition-colors",
                    sup.taken ? "border-green-500/30 bg-green-500/5" : "border-border bg-surface/60"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", sup.color)}>
                      <Pill size={16} />
                    </div>
                    {sup.taken ? (
                      <Badge variant="success" className="text-[10px] px-1.5 py-0">
                        <Check size={10} />
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                        Pendente
                      </Badge>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text truncate">{sup.name}</p>
                    <p className="text-[11px] text-text-secondary">{sup.time}</p>
                    <p className="text-[11px] font-semibold text-primary">{sup.dosage}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Clock size={20} />
              </div>
              <div className="flex-1">
                <CardTitle>Hoje</CardTitle>
                <CardDescription>
                  {takenToday} de {totalToday} doses concluídas
                </CardDescription>
              </div>
              <Badge
                variant={takenToday === totalToday ? "success" : "default"}
              >
                {Math.round((takenToday / totalToday) * 100)}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border" />
              <div className="space-y-4">
                {timeline.map((item) => {
                  const dotColor =
                    item.status === "taken"
                      ? "bg-green-500 border-green-500"
                      : item.status === "now"
                      ? "bg-yellow-500 border-yellow-500 animate-pulse"
                      : "bg-surface border-border";
                  return (
                    <div key={item.id} className="relative flex gap-4 pl-10">
                      <div
                        className={cn(
                          "absolute left-2 top-2 w-5 h-5 rounded-full border-4 border-surface shadow-sm",
                          dotColor
                        )}
                      />
                      <div
                        className={cn(
                          "flex-1 rounded-xl border p-4 flex flex-wrap items-center gap-3",
                          item.status === "taken"
                            ? "border-green-500/30 bg-green-500/5"
                            : item.status === "now"
                            ? "border-yellow-500/30 bg-yellow-500/5"
                            : "border-border bg-surface/50"
                        )}
                      >
                        <div
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                            item.status === "taken"
                              ? "bg-green-500/10 text-green-600"
                              : item.status === "now"
                              ? "bg-yellow-500/10 text-yellow-600"
                              : "bg-surface-secondary text-text-secondary"
                          )}
                        >
                          {item.status === "taken" ? <Check size={20} /> : <Pill size={20} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-text">
                              {item.name} {item.dosage}
                            </span>
                            {item.status === "taken" && (
                              <Badge variant="success" className="text-[10px]">
                                <Check size={10} className="mr-0.5" /> Tomado
                              </Badge>
                            )}
                            {item.status === "pending" && (
                              <Badge variant="outline" className="text-[10px]">
                                Pendente
                              </Badge>
                            )}
                            {item.status === "now" && (
                              <Badge variant="warning" className="text-[10px]">
                                <Clock size={10} className="mr-0.5" /> Pendente
                              </Badge>
                            )}
                            {item.note && (
                              <Badge variant="outline" className="text-[10px]">
                                {item.note}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <Badge variant="outline" className="text-xs font-mono">
                            {item.time}
                          </Badge>
                          {item.status === "now" && (
                            <Button size="sm" variant="primary" className="h-9 text-xs">
                              <Check size={14} className="mr-1" /> Marcar como tomado
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                <Package size={20} />
              </div>
              <div className="flex-1">
                <CardTitle>Estoque</CardTitle>
                <CardDescription>Acompanhe seus suplementos em casa</CardDescription>
              </div>
              <Button variant="secondary" size="sm" className="h-9 text-xs shrink-0">
                <Plus size={14} className="mr-1" /> Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {stock.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-xl border p-4 space-y-3",
                    item.urgent ? "border-red-500/30 bg-red-500/5" : "border-border"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                          item.color === "orange" && "bg-orange-500/10 text-orange-500",
                          item.color === "green" && "bg-green-500/10 text-green-500",
                          item.color === "amber" && "bg-amber-500/10 text-amber-500",
                          item.color === "red" && "bg-red-500/10 text-red-500"
                        )}
                      >
                        {item.urgent ? <AlertTriangle size={20} /> : <Package size={20} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-text truncate">{item.name}</p>
                        <p className="text-xs text-text-secondary">{item.size}</p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "text-sm font-bold tabular-nums shrink-0",
                        item.color === "orange" && "text-orange-500",
                        item.color === "green" && "text-green-500",
                        item.color === "amber" && "text-amber-500",
                        item.color === "red" && "text-red-500"
                      )}
                    >
                      {item.remaining}%
                    </span>
                  </div>
                  <Progress
                    value={item.remaining}
                    max={100}
                    className={cn("h-2", stockColorClass(item.color))}
                  />
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "text-xs font-medium",
                        item.urgent ? "text-red-500" : "text-text-secondary"
                      )}
                    >
                      {item.urgent && <AlertTriangle size={12} className="inline mr-1" />}
                      {item.daysText}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <CalendarDays size={20} />
              </div>
              <div className="flex-1">
                <CardTitle>Histórico últimos 7 dias</CardTitle>
                <CardDescription>Consistência da sua suplementação</CardDescription>
              </div>
              <Badge variant="success">
                <UserCheck size={12} className="mr-1" /> Excelente
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-7 gap-2">
              {historyDays.map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div
                    className={cn(
                      "w-full aspect-square max-w-[56px] rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all",
                      dayStatusClass(d.status)
                    )}
                  >
                    {d.status === "ok" && <Check size={18} strokeWidth={3} />}
                    {d.status === "fail" && (
                      <span className="text-lg font-bold leading-none" style={{ strokeWidth: 3 }}>
                        ×
                      </span>
                    )}
                    {d.status === "partial" && <Clock size={16} />}
                    {d.status === "pending" && <span className="text-lg opacity-50">–</span>}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      d.status === "partial" ? "text-primary" : "text-text-secondary"
                    )}
                  >
                    {d.day}
                  </span>
                  {d.note && (
                    <span className="text-[10px] text-text-secondary text-center leading-tight">
                      {d.note}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-xl bg-surface-secondary p-4">
              <div>
                <p className="text-sm font-semibold text-text">Taxa de adesão semanal</p>
                <p className="text-xs text-text-secondary">
                  Média dos últimos 7 dias
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={adherenceRate} max={100} className="w-32 h-2 [&>div]:bg-green-500" />
                <span className="text-lg font-bold text-green-500 tabular-nums">{adherenceRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
                <FileText size={20} />
              </div>
              <div className="flex-1">
                <CardTitle>Minhas prescrições</CardTitle>
                <CardDescription>Prescrições médicas e guias de suplementação</CardDescription>
              </div>
              <Button variant="secondary" size="sm" className="h-9 text-xs shrink-0">
                <Plus size={14} className="mr-1" /> Nova
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {prescriptions.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-border p-4 flex flex-wrap items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0">
                  <FileText size={24} />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-text">{p.title}</h3>
                    <Badge variant="outline" className="text-[10px]">
                      {p.issuer}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                    <span>
                      <CalendarDays size={12} className="inline mr-1" />
                      Emitida em {p.issuedDate}
                    </span>
                    <Badge variant="success" className="text-[10px]">
                      <Check size={10} className="mr-0.5" /> {p.validText}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                  <Button variant="secondary" size="sm" className="h-9 text-xs flex-1 sm:flex-none">
                    <FileText size={14} className="mr-1" /> Ver prescrição
                  </Button>
                  <Button variant="ghost" size="sm" className="h-9 text-xs flex-1 sm:flex-none text-text-secondary">
                    <Download size={14} className="mr-1" /> Baixar PDF
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
