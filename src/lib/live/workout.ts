export interface LiveWorkoutSet {
  failure_at_end?: boolean;
  drop_steps?: { reps_done: string; weight_kg: string }[];
  reps_done: string;
  weight_kg: string;
  logged: boolean;
  logKey: string;
}
export function mergeWorkoutSets<T extends LiveWorkoutSet>(
  local: Record<string, T[]>,
  baseline: Record<string, T[]>,
  remote: Record<string, T[]>,
): Record<string, T[]> {
  return Object.fromEntries(
    Object.entries(remote).map(([id, sets]) => [
      id,
      sets.map((set, index) => {
        const draft = local[id]?.[index],
          before = baseline[id]?.[index];
        if (!draft || !before || set.logged) return set;
        return {
          ...set,
          drop_steps:
            JSON.stringify(draft.drop_steps) !==
            JSON.stringify(before.drop_steps)
              ? draft.drop_steps
              : set.drop_steps,
          failure_at_end:
            draft.failure_at_end !== before.failure_at_end
              ? draft.failure_at_end
              : set.failure_at_end,
          reps_done:
            draft.reps_done !== before.reps_done
              ? draft.reps_done
              : set.reps_done,
          weight_kg:
            draft.weight_kg !== before.weight_kg
              ? draft.weight_kg
              : set.weight_kg,
          logged: draft.logged && !before.logged ? true : set.logged,
        };
      }),
    ]),
  );
}
