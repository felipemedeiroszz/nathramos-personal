import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  UtensilsCrossed,
  Flame,
  Beef,
  Wheat,
  Droplet,
  Clock,
  Check,
  ShoppingCart,
  Pill,
  Copy,
  Sun,
  Moon,
  Leaf,
} from "lucide-react";
import { requireAuthenticated } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Plano Alimentar",
};

interface FoodItem {
  name: string;
  quantity: string;
  calories: number;
  done?: boolean;
}

interface Meal {
  id: number;
  name: string;
  time: string;
  period: "morning" | "noon" | "afternoon" | "night" | "late";
  foods: FoodItem[];
  done?: boolean;
}

interface ShoppingItem {
  name: string;
  bought?: boolean;
}

interface ShoppingCategory {
  id: string;
  name: string;
  icon: typeof Leaf;
  items: ShoppingItem[];
}

interface Supplement {
  id: number;
  name: string;
  dosage: string;
  frequency: string;
  time: string;
  periodIcon: typeof Sun;
  taken?: boolean;
}

const macros = {
  calories: { current: 2200, goal: 2500, unit: "kcal" },
  protein: { current: 130, goal: 150, unit: "g" },
  carbs: { current: 210, goal: 280, unit: "g" },
  fats: { current: 55, goal: 70, unit: "g" },
};

const meals: Meal[] = [
  {
    id: 1,
    name: "Café da manhã",
    time: "07:00",
    period: "morning",
    done: true,
    foods: [
      { name: "Ovos", quantity: "3 unidades", calories: 210, done: true },
      { name: "Pão integral", quantity: "2 fatias", calories: 160, done: true },
      { name: "Banana", quantity: "1 unidade", calories: 105, done: true },
      { name: "Leite desnatado", quantity: "200ml", calories: 100, done: true },
    ],
  },
  {
    id: 2,
    name: "Almoço",
    time: "12:30",
    period: "noon",
    done: true,
    foods: [
      { name: "Arroz integral", quantity: "100g cozido", calories: 112, done: true },
      { name: "Feijão preto", quantity: "100g cozido", calories: 132, done: true },
      { name: "Peito de frango grelhado", quantity: "150g", calories: 248, done: false },
      { name: "Salada verde", quantity: "1 prato", calories: 45, done: false },
      { name: "Batata doce", quantity: "100g cozida", calories: 90, done: false },
    ],
  },
  {
    id: 3,
    name: "Lanche da tarde",
    time: "16:00",
    period: "afternoon",
    done: false,
    foods: [
      { name: "Iogurte grego", quantity: "170g", calories: 100, done: false },
      { name: "Aveia em flocos", quantity: "30g", calories: 118, done: false },
      { name: "Whey Protein", quantity: "30g", calories: 120, done: false },
      { name: "Morangos", quantity: "100g", calories: 32, done: false },
    ],
  },
  {
    id: 4,
    name: "Jantar",
    time: "20:00",
    period: "night",
    done: false,
    foods: [
      { name: "Salmão assado", quantity: "150g", calories: 280, done: false },
      { name: "Brócolis", quantity: "150g cozido", calories: 54, done: false },
      { name: "Quinoa", quantity: "100g cozida", calories: 120, done: false },
      { name: "Azeite de oliva", quantity: "1 colher de sopa", calories: 120, done: false },
    ],
  },
  {
    id: 5,
    name: "Ceia",
    time: "22:30",
    period: "late",
    done: false,
    foods: [
      { name: "Chá de camomila", quantity: "200ml", calories: 2, done: false },
      { name: "Castanhas-do-pará", quantity: "3 unidades", calories: 90, done: false },
    ],
  },
];

const shoppingCategories: ShoppingCategory[] = [
  {
    id: "proteins",
    name: "Proteínas",
    icon: Beef,
    items: [
      { name: "Peito de frango", bought: true },
      { name: "Salmão", bought: false },
      { name: "Ovos (30 unid)", bought: true },
      { name: "Whey Protein", bought: false },
      { name: "Iogurte grego", bought: false },
    ],
  },
  {
    id: "carbs",
    name: "Carboidratos",
    icon: Wheat,
    items: [
      { name: "Arroz integral", bought: true },
      { name: "Batata doce", bought: true },
      { name: "Aveia em flocos", bought: false },
      { name: "Pão integral", bought: true },
      { name: "Quinoa", bought: false },
    ],
  },
  {
    id: "fats",
    name: "Gorduras boas",
    icon: Droplet,
    items: [
      { name: "Azeite de oliva", bought: true },
      { name: "Castanhas-do-pará", bought: false },
      { name: "Abacate", bought: false },
    ],
  },
  {
    id: "veggies",
    name: "Legumes e verduras",
    icon: Leaf,
    items: [
      { name: "Brócolis", bought: false },
      { name: "Alface", bought: true },
      { name: "Tomate", bought: true },
      { name: "Pepino", bought: false },
      { name: "Feijão preto", bought: true },
    ],
  },
  {
    id: "fruits",
    name: "Frutas",
    icon: Sun,
    items: [
      { name: "Banana", bought: true },
      { name: "Morangos", bought: false },
      { name: "Maçã", bought: false },
    ],
  },
];

const supplements: Supplement[] = [
  {
    id: 1,
    name: "Whey Protein",
    dosage: "30g",
    frequency: "2x/dia",
    time: "Café da manhã e Lanche",
    periodIcon: Sun,
    taken: true,
  },
  {
    id: 2,
    name: "Creatina",
    dosage: "5g",
    frequency: "1x/dia",
    time: "Pós-treino",
    periodIcon: Sun,
    taken: false,
  },
  {
    id: 3,
    name: "Ômega 3",
    dosage: "1g",
    frequency: "2x/dia",
    time: "Almoço e Jantar",
    periodIcon: Sun,
    taken: true,
  },
  {
    id: 4,
    name: "Multivitamínico",
    dosage: "1 comprimido",
    frequency: "1x/dia",
    time: "Café da manhã",
    periodIcon: Sun,
    taken: true,
  },
  {
    id: 5,
    name: "Cafeína",
    dosage: "200mg",
    frequency: "1x/dia",
    time: "Pré-treino",
    periodIcon: Sun,
    taken: false,
  },
];

export default async function DietPage({
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

  const title = (tDiet("title") as string) || (tStudent("dietTitle") as string) || "Plano Alimentar";
  const subtitle =
    (tDiet("subtitle") as string) ||
    (tStudent("dietDesc") as string) ||
    "Sua dieta personalizada para alcançar seus objetivos";

  const totalShoppingItems = shoppingCategories.reduce((acc, cat) => acc + cat.items.length, 0);
  const boughtItems = shoppingCategories.reduce(
    (acc, cat) => acc + cat.items.filter((i) => i.bought).length,
    0
  );

  return (
    <div className="w-full px-4 sm:px-6 py-8 pb-safe space-y-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold text-text">{title}</h1>
          <p className="text-sm md:text-base text-text-secondary">{subtitle}</p>
        </header>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-surface to-surface" />
          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
              <div>
                <Badge variant="default">
                  <Check size={12} className="mr-1" /> Em andamento
                </Badge>
              </div>
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <UtensilsCrossed size={22} />
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-text">
                    <div className="w-9 h-9 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
                      <Flame size={18} />
                    </div>
                    Calorias
                  </div>
                  <span className="text-sm font-bold text-text tabular-nums">
                    {macros.calories.current}
                    <span className="text-text-secondary font-normal">/{macros.calories.goal} kcal</span>
                  </span>
                </div>
                <Progress
                  value={macros.calories.current}
                  max={macros.calories.goal}
                  className="h-2.5"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2 rounded-xl border border-border bg-surface/60 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-text-secondary text-xs font-semibold">
                      <div className="w-7 h-7 rounded-md bg-red-500/10 text-red-500 flex items-center justify-center">
                        <Beef size={14} />
                      </div>
                      Proteínas
                    </div>
                  </div>
                  <div className="text-lg font-bold text-text tabular-nums">
                    {macros.protein.current}
                    <span className="text-text-secondary font-normal text-sm">/{macros.protein.goal} g</span>
                  </div>
                  <Progress value={macros.protein.current} max={macros.protein.goal} className="h-1.5" />
                </div>

                <div className="space-y-2 rounded-xl border border-border bg-surface/60 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-text-secondary text-xs font-semibold">
                      <div className="w-7 h-7 rounded-md bg-amber-500/10 text-amber-500 flex items-center justify-center">
                        <Wheat size={14} />
                      </div>
                      Carboidratos
                    </div>
                  </div>
                  <div className="text-lg font-bold text-text tabular-nums">
                    {macros.carbs.current}
                    <span className="text-text-secondary font-normal text-sm">/{macros.carbs.goal} g</span>
                  </div>
                  <Progress value={macros.carbs.current} max={macros.carbs.goal} className="h-1.5" />
                </div>

                <div className="space-y-2 rounded-xl border border-border bg-surface/60 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-text-secondary text-xs font-semibold">
                      <div className="w-7 h-7 rounded-md bg-blue-500/10 text-blue-500 flex items-center justify-center">
                        <Droplet size={14} />
                      </div>
                      Gorduras
                    </div>
                  </div>
                  <div className="text-lg font-bold text-text tabular-nums">
                    {macros.fats.current}
                    <span className="text-text-secondary font-normal text-sm">/{macros.fats.goal} g</span>
                  </div>
                  <Progress value={macros.fats.current} max={macros.fats.goal} className="h-1.5" />
                </div>
              </div>
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
                <CardTitle>Refeições do dia</CardTitle>
                <CardDescription>
                  {meals.filter((m) => m.done).length} de {meals.length} refeições concluídas
                </CardDescription>
              </div>
              <Badge variant={meals.filter((m) => m.done).length === meals.length ? "success" : "default"}>
                {Math.round((meals.filter((m) => m.done).length / meals.length) * 100)}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {meals.map((meal) => (
              <div
                key={meal.id}
                className={
                  "rounded-xl border " +
                  (meal.done ? "border-green-500/30 bg-green-500/5" : "border-border") +
                  " overflow-hidden"
                }
              >
                <div className="p-4 flex flex-wrap items-center gap-3 border-b border-border">
                  <div
                    className={
                      "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 " +
                      (meal.period === "morning"
                        ? "bg-yellow-500/10 text-yellow-500"
                        : meal.period === "noon"
                        ? "bg-orange-500/10 text-orange-500"
                        : meal.period === "afternoon"
                        ? "bg-amber-500/10 text-amber-500"
                        : meal.period === "night"
                        ? "bg-indigo-500/10 text-indigo-500"
                        : "bg-purple-500/10 text-purple-500")
                    }
                  >
                    {meal.period === "late" ? <Moon size={20} /> : <Sun size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-text">{meal.name}</h3>
                      {meal.done && (
                        <Badge variant="success">
                          <Check size={12} className="mr-1" /> Concluída
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline">
                    <Clock size={12} className="mr-1" /> {meal.time}
                  </Badge>
                </div>

                <div className="divide-y divide-border">
                  {meal.foods.map((food, idx) => (
                    <div
                      key={idx}
                      className={
                        "p-4 flex items-center gap-3 " +
                        (food.done ? "opacity-60" : "")
                      }
                    >
                      <div
                        className={
                          "w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors " +
                          (food.done
                            ? "border-green-600 bg-green-600 text-white"
                            : "border-border")
                        }
                      >
                        {food.done && <Check size={14} strokeWidth={3} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={"text-sm font-semibold " + (food.done ? "line-through text-text-secondary" : "text-text")}>
                          {food.name}
                        </div>
                        <div className="text-xs text-text-secondary">
                          {food.quantity} · <span className="text-primary font-medium">{food.calories} kcal</span>
                        </div>
                      </div>
                      <Button
                        variant={food.done ? "ghost" : "secondary"}
                        size="sm"
                        className={
                          "h-9 text-xs shrink-0 " +
                          (food.done ? "text-green-600 bg-green-500/10 hover:bg-green-500/15" : "")
                        }
                      >
                        <Check size={14} className="mr-1" />
                        {food.done ? "Feito" : "Marcar"}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <ShoppingCart size={20} />
              </div>
              <div className="flex-1">
                <CardTitle>Lista de compras da semana</CardTitle>
                <CardDescription>
                  {boughtItems} de {totalShoppingItems} itens comprados
                </CardDescription>
              </div>
              <Button variant="secondary" size="sm" className="h-9 text-xs shrink-0">
                <Copy size={14} className="mr-1" /> Copiar lista
              </Button>
            </div>
            <div className="mt-3">
              <Progress value={boughtItems} max={totalShoppingItems} className="h-1.5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {shoppingCategories.map((cat) => {
              const catBought = cat.items.filter((i) => i.bought).length;
              const CatIcon = cat.icon;
              return (
                <div key={cat.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-surface-secondary flex items-center justify-center">
                        <CatIcon size={15} className="text-text-secondary" />
                      </div>
                      <span className="text-sm font-bold text-text">{cat.name}</span>
                      <Badge variant="outline">
                        {catBought}/{cat.items.length}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-10">
                    {cat.items.map((item, idx) => (
                      <div
                        key={idx}
                        className={
                          "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors " +
                          (item.bought
                            ? "border-green-500/30 bg-green-500/5"
                            : "border-border hover:border-primary/50")
                        }
                      >
                        <div
                          className={
                            "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 " +
                            (item.bought
                              ? "border-green-600 bg-green-600 text-white"
                              : "border-border")
                          }
                        >
                          {item.bought && <Check size={12} strokeWidth={3} />}
                        </div>
                        <span
                          className={
                            "text-sm font-medium " +
                            (item.bought ? "line-through text-text-secondary" : "text-text")
                          }
                        >
                          {item.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
                <Pill size={20} />
              </div>
              <div className="flex-1">
                <CardTitle>Suplementos diários</CardTitle>
                <CardDescription>
                  {supplements.filter((s) => s.taken).length} de {supplements.length} tomados hoje
                </CardDescription>
              </div>
              <Badge variant={supplements.filter((s) => s.taken).length === supplements.length ? "success" : "default"}>
                {Math.round((supplements.filter((s) => s.taken).length / supplements.length) * 100)}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {supplements.map((sup) => {
                const PI = sup.periodIcon;
                return (
                  <div
                    key={sup.id}
                    className={
                      "flex items-center gap-3 p-4 rounded-xl border transition-colors " +
                      (sup.taken
                        ? "border-green-500/30 bg-green-500/5"
                        : "border-border")
                    }
                  >
                    <div
                      className={
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 " +
                        (sup.taken
                          ? "bg-green-500/10 text-green-600"
                          : "bg-violet-500/10 text-violet-500")
                      }
                    >
                      {sup.taken ? <Check size={20} /> : <Pill size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={
                            "text-sm font-bold " +
                            (sup.taken ? "text-text-secondary line-through" : "text-text")
                          }
                        >
                          {sup.name}
                        </span>
                        <Badge variant="outline">{sup.dosage}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        <span className="text-xs text-text-secondary">
                          <PI size={12} className="inline mr-1" />
                          {sup.frequency}
                        </span>
                        <span className="text-xs text-text-secondary">
                          <Clock size={12} className="inline mr-1" />
                          {sup.time}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant={sup.taken ? "ghost" : "secondary"}
                      size="sm"
                      className={
                        "h-9 text-xs shrink-0 " +
                        (sup.taken ? "text-green-600 bg-green-500/10 hover:bg-green-500/15" : "")
                      }
                    >
                      <Check size={14} className="mr-1" />
                      {sup.taken ? "Tomado" : "Marcar"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
