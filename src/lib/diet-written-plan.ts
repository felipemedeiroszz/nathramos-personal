export interface DietPlanSection {
  title: string | null;
  kind: "meal" | "notes";
  lines: string[];
}
function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
const mealTitles = new Set([
  "cafe da manha",
  "cafe",
  "lanche",
  "lanche da manha",
  "lanche da tarde",
  "lanche perto do treino",
  "almoco",
  "jantar",
  "ceia",
  "pre treino",
  "pos treino",
  "breakfast",
  "morning snack",
  "snack",
  "afternoon snack",
  "lunch",
  "dinner",
  "supper",
  "pre workout",
  "post workout",
  "snack near training",
]);
const noteTitles = new Set([
  "orientacoes",
  "orientacoes adicionais",
  "observacoes",
  "hidratacao",
  "notes",
  "additional guidance",
  "guidance",
  "hydration",
]);
export function parseDietWrittenPlan(text: string): DietPlanSection[] {
  const sections: DietPlanSection[] = [];
  let current: DietPlanSection | undefined;
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const title = line
        .replace(/^#{1,6}\s*/, "")
        .replace(/^\*\*(.*?)\*\*:?$/, "$1")
        .replace(/:$/, ""),
      key = normalize(title);
    if (
      mealTitles.has(key) ||
      /^(refeicao|meal|lanche|snack) \d+$/.test(key) ||
      noteTitles.has(key)
    ) {
      current = {
        title,
        kind: noteTitles.has(key) ? "notes" : "meal",
        lines: [],
      };
      sections.push(current);
      continue;
    }
    const bullet = /^[-*•]\s+/.test(line);
    if (
      !current ||
      (current.kind === "meal" && !bullet && !/^[^:]+:\s*.*\d/.test(line))
    ) {
      current = { title: null, kind: "notes", lines: [] };
      sections.push(current);
    }
    current.lines.push(line.replace(/^[-*•]\s+/, ""));
  }
  return sections.filter((section) => section.lines.length);
}
export function dietGuidanceForAssignments(assignments: any[], en: boolean) {
  return assignments.flatMap((assignment) => {
    const kit = assignment.kit;
    if (!kit || kit.is_deleted) return [];
    const text = [
      en
        ? kit.description_en || kit.description_pt
        : kit.description_pt || kit.description_en,
      assignment.notes,
    ]
      .filter(
        (value, index, array) =>
          typeof value === "string" &&
          value.trim() &&
          array.indexOf(value) === index,
      )
      .join("\n\n");
    return text
      ? [
          {
            assignmentId: assignment.id,
            kit: en ? kit.name_en || kit.name_pt : kit.name_pt || kit.name_en,
            text,
          },
        ]
      : [];
  });
}
export const DIET_PLAN_EXAMPLE_PT = `Café da manhã
* 2 ovos: aproximadamente 100 g sem casca
* Claras: 100 g
* Aveia: 50 g
* Banana: 100 g

Lanche
* Iogurte grego natural: 170 g
* Maçã: 150 g

Almoço
* Frango: 150 g
* Arroz: 150 g
* Feijão: 100 g
* Salada ou legumes: 200 g
* Azeite: 5 g — cerca de 1 colher de chá

Lanche perto do treino
* Banana: 100 g
* Iogurte grego natural: 170 g

Jantar
* Peixe, frango ou carne magra: 170 g
* Batata cozida ou assada: 250 g
* Legumes: 200 g
* Azeite: 5 g

Orientações adicionais
Se ainda sentir fome, pode acrescentar 150 g de cottage cheese ou iogurte natural.
As calorias variam conforme a marca e o preparo.

Hidratação
Procure beber cerca de 3 litros de água ao longo do dia. Quando estiver trabalhando no calor ou suando bastante, beba cerca de 240 ml a cada 15–20 minutos, aos poucos. Essa frequência vale para o período de trabalho no calor, não para o dia inteiro.`;
export const DIET_PLAN_EXAMPLE_EN = `Breakfast
* 2 eggs: approximately 100 g without shells
* Egg whites: 100 g
* Oats: 50 g
* Banana: 100 g

Snack
* Plain Greek yogurt: 170 g
* Apple: 150 g

Lunch
* Chicken: 150 g
* Rice: 150 g
* Beans: 100 g
* Salad or vegetables: 200 g
* Olive oil: 5 g — about 1 teaspoon

Snack near training
* Banana: 100 g
* Plain Greek yogurt: 170 g

Dinner
* Fish, chicken or lean meat: 170 g
* Boiled or baked potatoes: 250 g
* Vegetables: 200 g
* Olive oil: 5 g

Additional guidance
If still hungry, you may add 150 g of cottage cheese or plain yogurt.
Calories vary depending on the brand and preparation.

Hydration
Aim to drink about 3 liters of water throughout the day. When working in heat or sweating heavily, drink about 240 ml every 15–20 minutes, gradually. This frequency applies to work in the heat, not the entire day.`;
