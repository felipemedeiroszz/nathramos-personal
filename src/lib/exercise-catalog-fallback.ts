import catalog from "../data/exercise-catalog-fallback.json";
import {
  englishExerciseSearch,
  normalizeExerciseName,
  portugueseExercise,
} from "./exercise-portuguese";
import type {
  ExerciseDbExercise,
  ExerciseDbListParams,
  ExerciseDbPage,
} from "./exercisedb";
const items: ExerciseDbExercise[] = catalog
  .map((row) => {
    const pt = portugueseExercise(row.exerciseId, row.name);
    return {
      ...row,
      ...(pt ? { namePt: pt.namePt, instructionsPt: pt.instructionsPt } : {}),
    };
  })
  .sort((a, b) => a.exerciseId.localeCompare(b.exerciseId, "en"));
function equivalent(value: string) {
  const key = normalizeExerciseName(value);
  return (
    (
      {
        abs: "abdominals",
        bodyweight: "bodyweight",
        leveragemachine: "levermachine",
      } as Record<string, string>
    )[key] || key
  );
}
export function fallbackExercise(id: string) {
  return items.find((item) => item.exerciseId === id) || null;
}
export function fallbackOptions(
  field: "bodyParts" | "targetMuscles" | "equipments",
) {
  return [...new Set(items.flatMap((item) => item[field]))]
    .sort()
    .map((name) => ({ name }));
}
export function fallbackExercisePage(
  params: ExerciseDbListParams,
): ExerciseDbPage {
  const q = (englishExerciseSearch(params.name) || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const filters = [
    ["bodyParts", params.bodyParts],
    ["targetMuscles", params.targetMuscles],
    ["secondaryMuscles", params.secondaryMuscles],
    ["equipments", params.equipments],
  ] as const;
  const found = items.filter(
    (item) =>
      q.every((word) =>
        `${item.name} ${item.namePt || ""}`.toLowerCase().includes(word),
      ) &&
      filters.every(
        ([field, value]) =>
          !value ||
          value
            .split(",")
            .some((term) =>
              item[field].some(
                (label) => equivalent(label) === equivalent(term),
              ),
            ),
      ),
  );
  const limit = Math.max(1, Math.min(25, Math.trunc(params.limit || 10)));
  const after = params.after
    ? found.findIndex((item) => item.exerciseId === params.after)
    : -1;
  const before = params.before
    ? found.findIndex((item) => item.exerciseId === params.before)
    : -1;
  const start =
    before >= 0 ? Math.max(0, before - limit) : after >= 0 ? after + 1 : 0;
  const page = found.slice(start, start + limit);
  return {
    items: page,
    total: found.length,
    hasNextPage: start + limit < found.length,
    hasPreviousPage: start > 0,
    nextCursor: page.at(-1)?.exerciseId || null,
    previousCursor: page[0]?.exerciseId || null,
    availability: "offline",
  };
}
