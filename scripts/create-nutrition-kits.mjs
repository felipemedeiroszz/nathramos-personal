import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  dietTemplates,
  supplementTemplates,
} from "../data/catalog/nutrition-kit-templates.mjs";
import { normalizeCatalogName } from "./expand-nutrition-catalog.mjs";

const headings = {
  breakfast: ["Café da manhã", "Breakfast"],
  morning_snack: ["Lanche da manhã", "Morning snack"],
  lunch: ["Almoço", "Lunch"],
  afternoon_snack: ["Lanche da tarde", "Afternoon snack"],
  dinner: ["Jantar", "Dinner"],
};
const dietNotes = [
  "Modelo de refeições para adultos, com quantidades ilustrativas. Ajustar porções, alergias, preferências e necessidades individuais com o profissional responsável antes de vincular ao aluno. Pesos em gramas da parte comestível, no preparo indicado no nome. O ovo é pesado sem casca. Não há meta calórica ou de hidratação individual definida neste modelo.",
  "Adult meal template with illustrative quantities. Review portions, allergies, preferences and individual needs with the responsible professional before assigning it. Weights are edible portions in grams, prepared as named. Eggs are weighed without shells. This template does not set individual calorie or hydration targets.",
];
const supplementNotes = [
  "Modelo de ingrediente único. A quantidade é a porção de referência do produto cadastrado, não uma dose individual prescrita. Revisar necessidade, rótulo atual, alergias, frequência e horário com o profissional responsável antes de vincular ao aluno. Os kits são alternativas independentes; não devem ser somados automaticamente. Não substitui refeições.",
  "Single-ingredient template. The amount is the catalog product's reference serving, not an individual prescribed dose. Review need, current label, allergies, frequency and timing with the responsible professional before assigning. Kits are independent alternatives, not an automatic combined stack. Does not replace meals.",
];
function product(rows, name) {
  const matches = rows.filter(
    (row) =>
      row.is_active &&
      normalizeCatalogName(row.name_pt) === normalizeCatalogName(name),
  );
  if (matches.length !== 1)
    throw Error(`Expected exactly one active catalog product: ${name}`);
  return matches[0];
}
export function buildNutritionKits(foods, supplements) {
  const diets = dietTemplates.map((template) => {
    const items = template.meals
      .flatMap((meal) =>
        meal.foods.map(([name, quantity]) => ({
          food_id: product(foods, name).id,
          quantity,
          unit: "g",
          meal_type: meal.type,
          notes_pt: "Quantidade ilustrativa; revisar antes da vinculação.",
          notes_en: "Illustrative amount; review before assignment.",
        })),
      )
      .map((item, order_index) => ({ ...item, order_index }));
    const description = (language) =>
      template.meals
        .map(
          (meal) =>
            `${headings[meal.type][language]}\n${meal.foods.map(([name, quantity]) => `* ${product(foods, name)[language ? "name_en" : "name_pt"]}: ${quantity} g`).join("\n")}`,
        )
        .join("\n\n") +
      `\n\n${language ? "Notes" : "Observações"}\n${dietNotes[language]}`;
    return {
      kind: "diet",
      kit: {
        slug: template.slug,
        name_pt: `Kit ${template.pt}`,
        name_en: `${template.en} kit`,
        description_pt: description(0),
        description_en: description(1),
        short_desc_pt:
          "Cinco refeições com porções ilustrativas para personalização.",
        short_desc_en:
          "Five meals with illustrative portions for customization.",
        goal_pt: "Organização de refeições",
        goal_en: "Meal planning",
        tags: ["modelo", "5-refeicoes"],
        is_published: true,
        is_featured: false,
      },
      items,
    };
  });
  const kits = supplementTemplates.map((template) => {
    const item = product(supplements, template.product);
    if (!(item.serving_size > 0) || !item.serving_unit)
      throw Error("Invalid supplement reference serving");
    return {
      kind: "supplement",
      kit: {
        slug: template.slug,
        name_pt: `Kit ${template.pt}`,
        name_en: `${template.en} kit`,
        description_pt: `${supplementNotes[0]}\n\nProduto: ${item.name_pt}. Porção de referência: ${item.serving_size} ${item.serving_unit}.\n\n${item.description_pt || ""}`,
        description_en: `${supplementNotes[1]}\n\nProduct: ${item.name_en}. Reference serving: ${item.serving_size} ${item.serving_unit}.\n\n${item.description_en || ""}`,
        short_desc_pt:
          "Alternativa de ingrediente único, com porção de referência do fabricante.",
        short_desc_en:
          "Single-ingredient alternative with a manufacturer reference serving.",
        goal_pt: "Modelo para avaliação individual",
        goal_en: "Template for individual assessment",
        tags: ["modelo", "ingrediente-unico"],
        is_published: true,
        is_featured: false,
      },
      items: [
        {
          supplement_id: item.id,
          dosage: Number(item.serving_size),
          dosage_unit: item.serving_unit,
          frequency_per_day: 1,
          times_of_day: [],
          notes_pt: supplementNotes[0],
          notes_en: supplementNotes[1],
          order_index: 0,
        },
      ],
    };
  });
  return [...diets, ...kits];
}
export function missingKits(candidates, existing) {
  return candidates.filter(
    (candidate) =>
      !existing.some(
        (row) =>
          row.slug === candidate.kit.slug ||
          normalizeCatalogName(row.name_pt) ===
            normalizeCatalogName(candidate.kit.name_pt),
      ),
  );
}
export async function readRows(db, table) {
  const rows = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await db
      .from(table)
      .select("*")
      .order("id")
      .range(start, start + 999);
    if (error) throw Error(`Read ${table}: ${error.code}`);
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}
async function main() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  )
    throw Error("Supabase environment is required");
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const [foods, supplements, diets, supplementKits] = await Promise.all(
    ["diet_foods", "supplements", "diet_kits", "supplement_kits"].map((table) =>
      readRows(db, table),
    ),
  );
  const candidates = buildNutritionKits(foods, supplements);
  const pending = candidates.filter(
    (candidate) =>
      missingKits(
        [candidate],
        candidate.kind === "diet" ? diets : supplementKits,
      ).length,
  );
  console.log(
    JSON.stringify({
      mode: process.argv.includes("--apply") ? "apply" : "dry-run",
      newDietKits: pending.filter((k) => k.kind === "diet").length,
      newSupplementKits: pending.filter((k) => k.kind === "supplement").length,
    }),
  );
  if (process.argv.includes("--apply") && pending.length) {
    // Existing content-save transaction validates products, creates all items,
    // captures prescription revisions and writes an audit record atomically.
    let query = db
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .eq("is_deleted", false)
      .order("id")
      .limit(1);
    if (process.env.CATALOG_ACTOR_ID)
      query = query.eq("id", process.env.CATALOG_ACTOR_ID);
    const { data: actors, error } = await query;
    if (error || !actors?.length)
      throw Error(
        "An active administrator is required for catalog audit attribution",
      );
    for (const candidate of pending) {
      const { error } = await db.rpc("admin_save_content_kit", {
        p_kind: candidate.kind,
        p_kit: candidate.kit,
        p_items: candidate.items,
        p_actor: actors[0].id,
      });
      if (error) throw Error(`Create ${candidate.kit.slug}: ${error.code}`);
      console.log(
        JSON.stringify({
          created: candidate.kit.slug,
          items: candidate.items.length,
        }),
      );
    }
  }
  if (process.argv.includes("--apply")) {
    for (const [kind, table, itemTable] of [
      ["diet", "diet_kits", "diet_kit_items"],
      ["supplement", "supplement_kits", "supplement_kit_items"],
    ]) {
      const rows = await readRows(db, table),
        items = await readRows(db, itemTable);
      for (const candidate of candidates.filter((k) => k.kind === kind)) {
        const row = rows.find((row) => row.slug === candidate.kit.slug);
        if (!row || row.is_deleted || !row.is_published)
          throw Error(`Template unavailable: ${candidate.kit.slug}`);
        if (
          items.filter((item) => item.kit_id === row.id).length !==
          candidate.items.length
        )
          throw Error(`Incomplete template: ${candidate.kit.slug}`);
      }
      const available = rows.filter(
        (row) => !row.is_deleted && row.is_published,
      ).length;
      if (available < 10)
        throw Error(`Fewer than ten available kits: ${table}`);
      console.log(JSON.stringify({ table, available, verifiedTemplates: 10 }));
    }
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
