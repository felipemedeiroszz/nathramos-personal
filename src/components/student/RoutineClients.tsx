"use client";
import { useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Check,
  Clock3,
  Copy,
  Droplets,
  Moon,
  Pill,
  Scale,
  ShoppingBasket,
  Trash2,
  Utensils,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type {
  RoutineData,
  RoutineItem,
} from "@/services/StudentRoutineService";
import {
  recordHealthAction,
  saveHydrationAction,
  setRoutineItemAction,
  setShoppingAction,
  waterAction,
} from "@/app/actions/routine";
import { cn } from "@/lib/utils";
function useLabels() {
  const locale = useLocale();
  return (pt: string, en: string) => (locale === "en-US" ? en : pt);
}
function useSave() {
  const router = useRouter(),
    t = useLabels(),
    saving = useRef(false);
  const [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(
      null,
    );
  async function save(
    action: () => Promise<{ success: boolean; message?: string }>,
  ) {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setFeedback(null);
    try {
      const result = await action();
      if (!result.success)
        setFeedback({
          text:
            result.message || t("Não foi possível salvar.", "Could not save."),
          error: true,
        });
      else {
        setFeedback({ text: t("Registro salvo.", "Log saved."), error: false });
        router.refresh();
      }
    } catch {
      setFeedback({
        text: t(
          "Não foi possível salvar. Verifique sua conexão e tente novamente.",
          "Could not save. Check your connection and try again.",
        ),
        error: true,
      });
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return {
    busy,
    save,
    status: (
      <div role="status" aria-live="polite">
        {feedback && (
          <p
            className={cn(
              "rounded-xl border px-3 py-2.5 text-xs leading-relaxed",
              feedback.error
                ? "border-rose-400/15 bg-rose-400/5 text-rose-300"
                : "border-emerald-400/15 bg-emerald-400/5 text-emerald-300",
            )}
          >
            {feedback.text}
          </p>
        )}
      </div>
    ),
  };
}
function Meter({
  value,
  total,
  color = "#facc15",
}: {
  value: number;
  total: number;
  color?: string;
}) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
      <div
        className="h-full rounded-full transition-[width]"
        style={{
          width: `${total ? Math.max(0, Math.min(100, (value / total) * 100)) : 0}%`,
          background: color,
        }}
      />
    </div>
  );
}
const meals: Record<string, [string, string]> = {
  breakfast: ["Café da manhã", "Breakfast"],
  morning_snack: ["Lanche da manhã", "Morning snack"],
  lunch: ["Almoço", "Lunch"],
  afternoon_snack: ["Lanche da tarde", "Afternoon snack"],
  dinner: ["Jantar", "Dinner"],
  supper: ["Ceia", "Supper"],
  pre_workout: ["Pré-treino", "Pre-workout"],
  post_workout: ["Pós-treino", "Post-workout"],
  other: ["Refeição", "Meal"],
};
export function DailyItemsClient({
  items,
  kind,
  consumed,
  planned,
  readOnly = false,
}: {
  readOnly?: boolean;
  items: RoutineItem[];
  kind: "diet" | "supplement";
  consumed?: RoutineData["consumedNutrition"];
  planned?: RoutineData["plannedNutrition"];
}) {
  const t = useLabels(),
    { busy, save, status } = useSave(),
    [filter, setFilter] = useState("all");
  const groupFor = (i: RoutineItem) =>
    `${i.kit} · ${kind === "diet" ? (meals[i.mealType] ? t(...meals[i.mealType]) : i.mealType) : t("Doses", "Doses")}`;
  const visible = items.filter(
      (i) =>
        filter === "all" ||
        (filter === "done" && i.done) ||
        (filter === "pending" && !i.done),
    ),
    groups = Array.from(new Set(visible.map(groupFor))),
    done = items.filter((i) => i.done).length;
  return (
    <div className="space-y-5">
      {planned && consumed && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t("Nutrição do dia", "Daily nutrition")}</CardTitle>
                <CardDescription>
                  {t(
                    "Consumo registrado em relação à sua prescrição.",
                    "Logged consumption compared with your prescription.",
                  )}
                </CardDescription>
              </div>
              <Utensils size={20} className="text-yellow-300" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
              {(
                [
                  [
                    "calories_kcal",
                    t("Calorias", "Calories"),
                    "kcal",
                    "#facc15",
                  ],
                  ["protein_g", t("Proteínas", "Protein"), "g", "#6ee7b7"],
                  ["carbs_g", t("Carboidratos", "Carbs"), "g", "#60a5fa"],
                  ["fats_g", t("Gorduras", "Fat"), "g", "#a78bfa"],
                ] as const
              ).map(([key, title, unit, color]) => (
                <div key={key}>
                  <p className="text-[11px] text-zinc-500">{title}</p>
                  <p className="mb-3 mt-2 text-xl font-semibold tracking-tight">
                    {Math.round(consumed[key])}
                    <span className="ml-1 text-[11px] font-normal text-zinc-500">
                      / {Math.round(planned[key])} {unit}
                    </span>
                  </p>
                  <Meter
                    value={consumed[key]}
                    total={planned[key]}
                    color={color}
                  />
                </div>
              ))}
            </div>
            {items.some((i) => !i.nutrition) && (
              <p className="mt-4 text-[11px] leading-relaxed text-zinc-500">
                {t(
                  "Itens com unidades diferentes da porção cadastrada não entram no cálculo nutricional.",
                  "Items with units different from the registered serving are excluded from nutrition calculations.",
                )}
              </p>
            )}
          </CardContent>
        </Card>
      )}
      {items.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-xl border border-white/[0.07] bg-surface p-1">
            {[
              { key: "all", label: t("Todos", "All") },
              { key: "pending", label: t("Pendentes", "Pending") },
              { key: "done", label: t("Registrados", "Logged") },
            ].map((tab) => (
              <button
                key={tab.key}
                aria-pressed={filter === tab.key}
                onClick={() => setFilter(tab.key)}
                className={cn(
                  "min-h-10 rounded-lg px-3 text-xs transition",
                  filter === tab.key
                    ? "bg-yellow-400/10 text-yellow-300"
                    : "text-zinc-500 hover:text-white",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-zinc-500">
            {done} / {items.length} {t("registrados hoje", "logged today")}
          </span>
        </div>
      )}
      {status}
      {!items.length ? (
        <Card>
          <EmptyState
            icon={kind === "diet" ? <Utensils size={25} /> : <Pill size={25} />}
            title={t(
              kind === "diet"
                ? "Seu plano alimentar aparecerá aqui"
                : "Sua suplementação aparecerá aqui",
              kind === "diet"
                ? "Your nutrition plan will appear here"
                : "Your supplements will appear here",
            )}
            description={t(
              "Ainda não há itens atribuídos para hoje. Suas orientações aparecerão após a prescrição da sua treinadora.",
              "There are no items assigned for today. Your guidance will appear after your coach assigns a plan.",
            )}
          />
        </Card>
      ) : !visible.length ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">
          {t("Nenhum item neste filtro.", "No items match this filter.")}
        </div>
      ) : (
        groups.map((group) => (
          <Card key={group}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    kind === "diet"
                      ? "bg-yellow-400/[0.07] text-yellow-300"
                      : "bg-violet-400/[0.07] text-violet-300",
                  )}
                >
                  {kind === "diet" ? (
                    <Utensils size={17} />
                  ) : (
                    <Pill size={17} />
                  )}
                </span>
                <CardTitle className="break-words">{group}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="divide-y divide-white/[0.06]">
              {visible
                .filter((i) => groupFor(i) === group)
                .map((item) => (
                  <div
                    key={item.key}
                    className="flex flex-wrap items-center gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-32 flex-1">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          item.done ? "text-zinc-400" : "text-zinc-100",
                        )}
                      >
                        {item.name}
                      </p>
                      <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                        <span>
                          {item.quantity} {item.unit}
                        </span>
                        {item.slot && (
                          <span className="flex items-center gap-1">
                            <Clock3 size={11} />
                            {item.slot.startsWith("dose-")
                              ? `${t("Dose", "Dose")} ${item.slot.slice(5)} · ${t("sem horário", "no set time")}`
                              : item.slot}
                          </span>
                        )}
                      </p>
                      {item.notes && (
                        <p className="mt-2 max-w-xl whitespace-pre-wrap text-xs leading-relaxed text-zinc-400">
                          {item.notes}
                        </p>
                      )}
                    </div>
                    {readOnly ? (
                      <span className="text-xs text-zinc-500">
                        {item.done
                          ? t("Registrado", "Logged")
                          : t("Pendente", "Pending")}
                      </span>
                    ) : (
                      <Button
                        disabled={busy}
                        variant={item.done ? "secondary" : "primary"}
                        aria-pressed={item.done}
                        aria-label={`${item.done ? t("Desfazer registro de", "Undo log for") : t("Registrar", "Log")} ${item.name}`}
                        onClick={() =>
                          save(() =>
                            setRoutineItemAction({
                              kind,
                              assignmentId: item.assignmentId,
                              itemId: item.itemId,
                              slot: item.slot,
                              done: !item.done,
                            }),
                          )
                        }
                      >
                        <Check size={15} />
                        {item.done
                          ? t("Registrado · desfazer", "Logged · undo")
                          : kind === "diet"
                            ? t("Consumido", "Eaten")
                            : t("Tomei", "Taken")}
                      </Button>
                    )}
                  </div>
                ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
export function HydrationClient({
  data,
  targetId,
}: {
  data: RoutineData;
  targetId?: string;
}) {
  const t = useLabels(),
    { busy, save, status } = useSave();
  const [amount, setAmount] = useState("250"),
    [goal, setGoal] = useState(String(data.waterGoal || 2000)),
    [reminders, setReminders] = useState(data.hydrationReminders),
    [frequency, setFrequency] = useState(data.hydrationFrequency),
    [silent, setSilent] = useState(data.hydrationSilent);
  const today = data.water.filter((w) => w.logged_date === data.date);
  const dates = Array.from({ length: 7 }, (_, index) => {
    const d = new Date(`${data.date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - (6 - index));
    return d.toISOString().slice(0, 10);
  });
  const percent = data.waterGoal
    ? Math.min(100, Math.round((data.waterTotal / data.waterGoal) * 100))
    : 0;
  return (
    <div className="space-y-5">
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card className="relative overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {t("Sua água de hoje", "Your water today")}
                </CardTitle>
                <CardDescription>
                  {t(
                    "Um registro de cada vez, ao longo do dia.",
                    "One log at a time, throughout the day.",
                  )}
                </CardDescription>
              </div>
              <Droplets size={21} className="text-blue-300" />
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div>
                <p className="text-4xl font-semibold tracking-tight">
                  {data.waterTotal.toLocaleString(data.locale || "pt-BR")}
                  <span className="ml-2 text-sm font-normal text-zinc-500">
                    ml
                  </span>
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  {data.waterGoal
                    ? `${t("de", "of")} ${data.waterGoal} ml ${t("da sua meta", "in your goal")}`
                    : t("Meta ainda não definida", "Goal not set yet")}
                </p>
              </div>
              <div
                aria-hidden="true"
                className="flex h-24 w-24 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(#60a5fa ${percent}%, #ffffff08 0)`,
                }}
              >
                <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-surface">
                  <Droplets size={20} className="text-blue-300" />
                  <span className="mt-1 text-xs font-semibold text-blue-300">
                    {data.waterGoal ? `${percent}%` : "—"}
                  </span>
                </div>
              </div>
            </div>
            <Meter
              value={data.waterTotal}
              total={data.waterGoal || 0}
              color="#60a5fa"
            />
            {!targetId && (
              <>
                <div className="flex gap-2">
                  {[200, 250, 500].map((value) => (
                    <button
                      key={value}
                      onClick={() => setAmount(String(value))}
                      aria-pressed={amount === String(value)}
                      className={cn(
                        "min-h-10 flex-1 rounded-xl border px-3 text-xs",
                        amount === String(value)
                          ? "border-blue-400/30 bg-blue-400/10 text-blue-300"
                          : "border-white/10 text-zinc-500 hover:text-white",
                      )}
                    >
                      {value} ml
                    </button>
                  ))}
                </div>
                <form
                  className="flex flex-wrap items-end gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    save(() =>
                      waterAction({ operation: "add", amount: Number(amount) }),
                    );
                  }}
                >
                  <label className="min-w-32 flex-1 text-xs text-zinc-400">
                    {t("Quantidade (ml)", "Amount (ml)")}
                    <Input
                      aria-label={t(
                        "Quantidade de água em ml",
                        "Water amount in ml",
                      )}
                      type="number"
                      min="10"
                      max="5000"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="mt-2"
                    />
                  </label>
                  <Button type="submit" disabled={busy}>
                    <Droplets size={16} />
                    {t("Registrar água", "Log water")}
                  </Button>
                </form>
              </>
            )}
            {status}
            <div className="border-t border-white/[0.06] pt-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  {t("Registros de hoje", "Today's logs")}
                </h3>
                {!targetId && today.length > 0 && (
                  <button
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          t(
                            "Apagar todos os registros de água de hoje?",
                            "Delete all water logs for today?",
                          ),
                        )
                      )
                        save(() => waterAction({ operation: "reset" }));
                    }}
                    className="min-h-10 px-2 text-[10px] text-zinc-500 hover:text-rose-300"
                  >
                    {t("Redefinir dia", "Reset day")}
                  </button>
                )}
              </div>
              {!today.length && (
                <p className="py-3 text-xs text-zinc-500">
                  {t(
                    "Seu primeiro registro de hoje aparecerá aqui.",
                    "Your first log today will appear here.",
                  )}
                </p>
              )}
              {today.map((w) => (
                <div
                  key={w.id}
                  className="flex min-h-12 items-center justify-between border-b border-white/[0.04] text-xs last:border-0"
                >
                  <span className="flex items-center gap-3">
                    <Droplets size={14} className="text-blue-400/70" />
                    <span className="text-zinc-500">
                      {w.logged_time.slice(0, 5)}
                    </span>
                    <span>{w.amount_ml} ml</span>
                  </span>
                  {!targetId && (
                    <Button
                      disabled={busy}
                      variant="ghost"
                      size="sm"
                      aria-label={`${t("Remover", "Remove")} ${w.amount_ml} ml ${w.logged_time}`}
                      onClick={() =>
                        save(() =>
                          waterAction({ operation: "remove", id: w.id }),
                        )
                      }
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("Meta e lembretes", "Goal and reminders")}</CardTitle>
            <CardDescription>
              {t(
                "Ajuste suas preferências de hidratação.",
                "Adjust your hydration preferences.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                save(() =>
                  saveHydrationAction(
                    { goal: Number(goal), reminders, frequency, silent },
                    targetId,
                  ),
                );
              }}
            >
              <label className="block text-xs text-zinc-400">
                {t("Meta diária (ml)", "Daily goal (ml)")}
                <Input
                  type="number"
                  min="500"
                  max="10000"
                  required
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="mt-2"
                />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] p-3 text-xs text-zinc-400">
                {t("Lembretes de hidratação", "Hydration reminders")}
                <input
                  type="checkbox"
                  checked={reminders}
                  onChange={(e) => setReminders(e.target.checked)}
                />
              </label>
              <label className="block text-xs text-zinc-400">
                {t("Intervalo entre lembretes", "Reminder interval")}
                <select
                  className="mt-2 block min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm"
                  value={frequency}
                  onChange={(e) => setFrequency(Number(e.target.value))}
                >
                  {[30, 45, 60, 90, 120].map((n) => (
                    <option key={n} value={n}>
                      {n} {t("minutos", "minutes")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] p-3 text-xs text-zinc-400">
                {t("Silenciar entre 22h e 7h", "Quiet hours: 10 pm to 7 am")}
                <input
                  type="checkbox"
                  checked={silent}
                  onChange={(e) => setSilent(e.target.checked)}
                />
              </label>
              <Button
                type="submit"
                disabled={busy}
                variant="secondary"
                className="w-full"
              >
                {t("Salvar preferências", "Save preferences")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("Seus últimos 7 dias", "Your last 7 days")}</CardTitle>
          <CardDescription>
            {t(
              "Volume de água registrado em cada dia.",
              "Water volume logged each day.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {dates.map((date) => {
              const volume = data.water
                  .filter((w) => w.logged_date === date)
                  .reduce((sum, w) => sum + w.amount_ml, 0),
                max = Math.max(
                  ...dates.map((d) =>
                    data.water
                      .filter((w) => w.logged_date === d)
                      .reduce((s, w) => s + w.amount_ml, 0),
                  ),
                  1,
                );
              return (
                <div key={date} className="min-w-0 text-center">
                  <div className="flex h-24 items-end justify-center rounded-xl bg-white/[0.02] p-1.5">
                    <div
                      className="w-full max-w-10 rounded-lg bg-blue-400/60"
                      style={{
                        height: `${(volume / max) * 100}%`,
                        minHeight: volume ? 4 : 0,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-[9px] text-zinc-500">
                    {new Date(`${date}T12:00:00Z`).toLocaleDateString(
                      data.locale || "pt-BR",
                      { timeZone: "UTC", day: "2-digit", month: "2-digit" },
                    )}
                  </p>
                  <p className="mt-1 text-[9px] text-zinc-400">
                    {volume}
                    <span className="hidden sm:inline"> ml</span>
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
export function ShoppingClient({ data }: { data: RoutineData }) {
  const t = useLabels(),
    { busy, save, status } = useSave(),
    [copyMessage, setCopyMessage] = useState("");
  const quantity = (item: RoutineData["shopping"][number]) =>
      item.quantities
        .map((q) => `${Math.round(q.quantity * 100) / 100} ${q.unit}`)
        .join(" + "),
    done = data.shopping.filter((i) => i.bought).length;
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>
              {t("Sua lista, sem complicação", "Your list, made simple")}
            </CardTitle>
            <CardDescription>
              {t(
                "Quantidades para um dia da dieta atribuída. Marcações organizadas por semana.",
                "Quantities for one day of your assigned diet. Checks are organized by week.",
              )}
            </CardDescription>
          </div>
          <ShoppingBasket size={22} className="text-yellow-300" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.shopping.length > 0 && (
          <>
            <div className="flex justify-between text-xs text-zinc-500">
              <span>{t("Itens comprados", "Items bought")}</span>
              <span>
                {done} / {data.shopping.length}
              </span>
            </div>
            <Meter value={done} total={data.shopping.length} />
          </>
        )}
        {status}
        {!data.shopping.length && (
          <EmptyState
            icon={<ShoppingBasket size={25} />}
            title={t(
              "Sua lista será preenchida aqui",
              "Your list will appear here",
            )}
            description={t(
              "Os alimentos aparecerão a partir da dieta atribuída pela sua treinadora.",
              "Ingredients will appear from the diet assigned by your coach.",
            )}
          />
        )}
        {data.shopping.map((item) => (
          <label
            key={item.foodId}
            className="flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] px-4 py-3"
          >
            <input
              type="checkbox"
              disabled={busy}
              checked={item.bought}
              onChange={(e) =>
                save(() => setShoppingAction(item.foodId, e.target.checked))
              }
            />
            <span
              className={cn(
                "min-w-0 flex-1 text-sm",
                item.bought && "text-zinc-500 line-through",
              )}
            >
              {item.name}
            </span>
            <span className="text-xs text-zinc-500">{quantity(item)}</span>
          </label>
        ))}
        {!!data.shopping.length && (
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  data.shopping
                    .map(
                      (i) =>
                        `${i.bought ? "[x]" : "[ ]"} ${i.name}: ${quantity(i)}`,
                    )
                    .join("\n"),
                );
                setCopyMessage(t("Lista copiada.", "List copied."));
              } catch {
                setCopyMessage(
                  t(
                    "Não foi possível copiar. Selecione os itens para copiar manualmente.",
                    "Could not copy. Select the items to copy them manually.",
                  ),
                );
              }
            }}
          >
            <Copy size={15} />
            {t("Copiar lista", "Copy list")}
          </Button>
        )}
        <p role="status" className="text-xs text-zinc-500">
          {copyMessage}
        </p>
      </CardContent>
    </Card>
  );
}
export function HealthLogClient() {
  const t = useLabels(),
    { busy, save, status } = useSave(),
    [weight, setWeight] = useState(""),
    [sleep, setSleep] = useState("");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Como você está hoje?", "How are you today?")}</CardTitle>
        <CardDescription>
          {t(
            "Registre peso e sono para acompanhar sua evolução.",
            "Log weight and sleep to track your progress.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            save(() =>
              recordHealthAction({
                ...(weight !== "" ? { weight: Number(weight) } : {}),
                ...(sleep !== ""
                  ? { sleepMinutes: Math.round(Number(sleep) * 60) }
                  : {}),
              }),
            );
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs text-zinc-400">
              <span className="flex items-center gap-2">
                <Scale size={14} />
                {t("Peso (kg)", "Weight (kg)")}
              </span>
              <Input
                className="mt-2"
                type="number"
                min="20"
                max="400"
                step="0.01"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </label>
            <label className="block text-xs text-zinc-400">
              <span className="flex items-center gap-2">
                <Moon size={14} />
                {t("Horas dormidas", "Hours of sleep")}
              </span>
              <Input
                className="mt-2"
                type="number"
                min="0"
                max="24"
                step="0.1"
                value={sleep}
                onChange={(e) => setSleep(e.target.value)}
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-zinc-500">
              {t(
                "Preencha apenas o que deseja registrar hoje.",
                "Fill in only what you want to log today.",
              )}
            </p>
            <Button type="submit" disabled={busy || (!weight && !sleep)}>
              {t("Salvar registro", "Save log")}
            </Button>
          </div>
          {status}
        </form>
      </CardContent>
    </Card>
  );
}
