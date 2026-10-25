import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
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
import { SupplementService } from "@/services/SupplementService";
import type { SupplementKitItemWithSupplement, SupplementKitRow } from "@/types";
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
  { id: 1, name: "Whey", time: "07:30 / 18:00", dosage: "30g", taken: true, color: "bg-surface-secondary text-text-secondary" },
  { id: 2, name: "Creatina", time: "14:00", dosage: "5g", taken: false, color: "bg-surface-secondary text-text-secondary" },
  { id: 3, name: "Ômega3", time: "12:00 / 20:30", dosage: "1g", taken: true, color: "bg-primary/10 text-primary" },
  { id: 4, name: "Multivitamínico", time: "08:00", dosage: "1 comp", taken: true, color: "bg-primary/10 text-primary" },
  { id: 5, name: "Cafeína", time: "10:00", dosage: "200mg", taken: true, color: "bg-primary/10 text-primary" },
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

function KitCard({
  kit,
  items,
  locale,
}: {
  kit: SupplementKitRow;
  items: SupplementKitItemWithSupplement[];
  locale: string;
}) {
  const name = locale === "pt-BR" ? kit.name_pt : kit.name_en;
  const goal = locale === "pt-BR" ? kit.goal_pt : kit.goal_en;
  const shortDesc = locale === "pt-BR" ? kit.short_desc_pt : kit.short_desc_en;
  const description = locale === "pt-BR" ? kit.description_pt : kit.description_en;

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        <div className="relative sm:w-40 h-32 sm:h-auto shrink-0 bg-gradient-to-br from-primary/25 via-surface-secondary to-surface">
          {kit.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={kit.cover_image_url}
              alt={name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Package size={32} className="text-primary/40" />
            </div>
          )}
        </div>
        <div className="p-4 space-y-3 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-text">{name}</h3>
            {goal && <Badge variant="outline">{goal}</Badge>}
            {kit.is_featured && <Badge variant="warning">Destaque</Badge>}
          </div>
          {(shortDesc || description) && (
            <p className="text-sm text-text-secondary">{shortDesc || description}</p>
          )}
          {items.length === 0 ? (
            <p className="text-xs text-text-secondary">
              Nenhum suplemento neste kit ainda.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {items.map((item) => {
                const itemName = item.supplement
                  ? locale === "pt-BR"
                    ? item.supplement.name_pt
                    : item.supplement.name_en
                  : "-";
                const note = locale === "pt-BR" ? item.notes_pt : item.notes_en;
                const details = [
                  item.dosage ? `${item.dosage}${item.dosage_unit ?? ""}` : null,
                  item.frequency_per_day ? `${item.frequency_per_day}x/dia` : null,
                  (item.times_of_day ?? []).join(", ") || null,
                ]
                  .filter(Boolean)
                  .join(" • ");
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-2 rounded-lg border border-border bg-surface-secondary/30 p-2.5"
                  >
                    <Pill size={14} className="text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text truncate">
                        {itemName}
                      </p>
                      {details && (
                        <p className="text-[11px] text-text-secondary">{details}</p>
                      )}
                      {note && (
                        <p className="text-[11px] text-text-secondary">{note}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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

  const userId = await requireAuthenticated();

  const kits: SupplementKitRow[] = await SupplementService.listKits({
    is_published: true,
    limit: 50,
  });
  const kitItems = await SupplementService.listKitItemsForKits(kits.map((k) => k.id));
  const itemsByKit: Record<string, SupplementKitItemWithSupplement[]> = {};
  for (const kit of kits) {
    itemsByKit[kit.id] = kitItems.filter((item) => item.kit_id === kit.id);
  }

  // Kits vinculados especificamente a este aluno
  const myAssignments = await SupplementService.listStudentKits(userId);
  const myKits = myAssignments.filter((a) => a.kit);
  const myKitItems = await SupplementService.listKitItemsForKits(
    myKits.map((a) => a.kit_id)
  );
  const myItemsByKit: Record<string, SupplementKitItemWithSupplement[]> = {};
  for (const assignment of myKits) {
    myItemsByKit[assignment.kit_id] = myKitItems.filter(
      (item) => item.kit_id === assignment.kit_id
    );
  }

  const title = "Suplementos";
  const subtitle = "Acompanhe sua suplementação diária";

  const takenToday = timeline.filter((t) => t.status === "taken").length;
  const totalToday = timeline.length;
  const adherenceRate = 92;

  const stockColorClass = (color: StockItem["color"]) => {
    switch (color) {
      case "orange":
        return "[&>div]:bg-primary";
      case "green":
        return "[&>div]:bg-primary";
      case "amber":
        return "[&>div]:bg-primary";
      case "red":
        return "[&>div]:bg-text/[0.08]";
    }
  };

  const dayStatusClass = (status: HistoryDay["status"]) => {
    switch (status) {
      case "ok":
        return "bg-primary text-primary-foreground border-primary";
      case "fail":
        return "bg-text/[0.08] text-text border-text/25";
      case "partial":
        return "bg-primary text-primary-foreground border-primary";
      case "pending":
        return "bg-surface-secondary text-text-secondary border-border";
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 py-8 pb-safe space-y-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <PageHeader
          title={title}
          description={subtitle}
          icon={<Pill size={22} />}
        />

        {myKits.length > 0 && (
          <Card className="border-primary/40">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <UserCheck size={20} />
                </div>
                <div className="flex-1">
                  <CardTitle>Meus kits de suplementos</CardTitle>
                  <CardDescription>
                    Kits indicados pelo seu treinador
                  </CardDescription>
                </div>
                <Badge variant="outline">{myKits.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {myKits.map((assignment) =>
                assignment.kit ? (
                  <KitCard
                    key={assignment.id}
                    kit={assignment.kit}
                    items={myItemsByKit[assignment.kit_id] ?? []}
                    locale={locale}
                  />
                ) : null
              )}
            </CardContent>
          </Card>
        )}

        {kits.length > 0 && (
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Package size={20} />
                </div>
                <div className="flex-1">
                  <CardTitle>Catálogo de kits</CardTitle>
                  <CardDescription>
                    Combinações prontas montadas pelo seu treinador
                  </CardDescription>
                </div>
                <Badge variant="outline">{kits.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {kits.map((kit) => (
                <KitCard
                  key={kit.id}
                  kit={kit}
                  items={itemsByKit[kit.id] ?? []}
                  locale={locale}
                />
              ))}
            </CardContent>
          </Card>
        )}

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
                    sup.taken ? "border-primary/30 bg-primary/5" : "border-border bg-surface/60"
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
                      ? "bg-primary border-primary"
                      : item.status === "now"
                      ? "bg-primary border-primary animate-pulse"
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
                            ? "border-primary/30 bg-primary/5"
                            : item.status === "now"
                            ? "border-primary/30 bg-primary/5"
                            : "border-border bg-surface/50"
                        )}
                      >
                        <div
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                            item.status === "taken"
                              ? "bg-primary/10 text-primary"
                              : item.status === "now"
                              ? "bg-primary/10 text-primary"
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
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
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
                    item.urgent ? "border-text/25 bg-text/[0.08]" : "border-border"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                          item.color === "orange" && "bg-primary/10 text-primary",
                          item.color === "green" && "bg-primary/10 text-primary",
                          item.color === "amber" && "bg-primary/10 text-primary",
                          item.color === "red" && "bg-text/[0.08] text-text"
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
                        item.color === "orange" && "text-primary",
                        item.color === "green" && "text-primary",
                        item.color === "amber" && "text-primary",
                        item.color === "red" && "text-text"
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
                        item.urgent ? "text-text" : "text-text-secondary"
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
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
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
                <Progress value={adherenceRate} max={100} className="w-32 h-2 [&>div]:bg-primary" />
                <span className="text-lg font-bold text-primary tabular-nums">{adherenceRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-surface-secondary text-text-secondary flex items-center justify-center">
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
                <div className="w-12 h-12 rounded-xl bg-surface-secondary text-text-secondary flex items-center justify-center shrink-0">
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
