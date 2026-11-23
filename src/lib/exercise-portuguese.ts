import translations from "../data/exercise-portuguese.json";

export function normalizeExerciseName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}
const byId = new Map(translations.map((row) => [row.id, row]));
const byName = new Map(
  translations.map((row) => [normalizeExerciseName(row.nameEn), row]),
);
function variantName(value: string) {
  return normalizeExerciseName(
    value
      .toLowerCase()
      .replace(/^machine\b/, "lever")
      .replace(/\b(single)[ -](arm|leg)\b/g, "one $2")
      .replace(/\btriceps\b/g, "tricep"),
  );
}
const byVariant = new Map(
  translations.map((row) => [variantName(row.nameEn), row]),
);
export function portugueseExercise(id: string, name: string) {
  return (
    byId.get(id) ||
    byName.get(normalizeExerciseName(name)) ||
    byVariant.get(variantName(name)) ||
    null
  );
}
const searchTerms: Record<string, string> = {
  supino: "bench press",
  remada: "row",
  agachamento: "squat",
  afundo: "lunge",
  passada: "lunge",
  abdominal: "crunch",
  abdominais: "crunch",
  puxada: "pulldown",
  "barra fixa": "pull up",
  "flexao de bracos": "push up",
  flexao: "push up",
  "levantamento terra": "deadlift",
  "elevacao lateral": "lateral raise",
  "elevacao frontal": "front raise",
  "rosca martelo": "hammer curl",
  "rosca scott": "preacher curl",
  "rosca concentrada": "concentration curl",
  "rosca direta": "biceps curl",
  rosca: "curl",
  crucifixo: "fly",
  desenvolvimento: "shoulder press",
  alongamento: "stretch",
  panturrilha: "calf",
  panturrilhas: "calf",
  triceps: "triceps",
  biceps: "biceps",
  halter: "dumbbell",
  halteres: "dumbbell",
  barra: "barbell",
  elastico: "band",
  cabo: "cable",
  inclinado: "incline",
  declinado: "decline",
  sentado: "seated",
  "em pe": "standing",
  unilateral: "one arm",
  inversa: "reverse",
  inverso: "reverse",
  costas: "back",
  peito: "chest",
  ombro: "shoulder",
  ombros: "shoulder",
  perna: "leg",
  pernas: "leg",
  gluteos: "glute",
  com: "",
  de: "",
  no: "",
  na: "",
  para: "",
  do: "",
  da: "",
};
export function englishExerciseSearch(query?: string) {
  const original = query?.trim();
  if (!original) return original;
  const normalized = normalizeExerciseName(original);
  const exact = translations.find(
    (row) => normalizeExerciseName(row.namePt) === normalized,
  );
  if (exact) return exact.nameEn;
  let value = original
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const replacements: string[] = [];
  for (const [from, to] of Object.entries(searchTerms).sort(
    (a, b) => b[0].length - a[0].length,
  )) {
    value = value.replace(
      new RegExp(`\\b${from}\\b`, "g"),
      () => `§${replacements.push(to) - 1}§`,
    );
  }
  return value
    .replace(/§(\d+)§/g, (_, index) => replacements[Number(index)])
    .replace(/\s+/g, " ")
    .trim();
}
export function untranslatedExerciseFields(row: {
  external_id?: string | null;
  name_en: string;
  name_pt: string;
  instructions_en: string[];
  instructions_pt: string[];
  translation_locked: boolean;
}) {
  if (row.translation_locked) return {};
  const translated = portugueseExercise(row.external_id || "", row.name_en);
  if (!translated) return {};
  const patch: { name_pt?: string; instructions_pt?: string[] } = {};
  if (!row.name_pt?.trim() || row.name_pt.trim() === row.name_en.trim())
    patch.name_pt = translated.namePt;
  if (
    !row.instructions_pt?.length ||
    JSON.stringify(row.instructions_pt) === JSON.stringify(row.instructions_en)
  )
    patch.instructions_pt = translated.instructionsPt;
  return patch;
}
