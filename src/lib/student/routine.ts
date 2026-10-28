export interface Nutrition { calories_kcal: number; protein_g: number; carbs_g: number; fats_g: number }
export const emptyNutrition = (): Nutrition => ({ calories_kcal: 0, protein_g: 0, carbs_g: 0, fats_g: 0 })
export function isAssignmentCurrent(row: { status: string; start_date: string; end_date: string | null; kit?: { is_deleted?: boolean } | null }, date: string) {
  return row.status === "active" && row.start_date <= date && (!row.end_date || row.end_date >= date) && !!row.kit && !row.kit.is_deleted
}
export function foodNutrition(food: Nutrition & { serving_size: number; serving_unit: string }, quantity: number, unit: string): Nutrition | null {
  if (unit.toLowerCase().trim() !== food.serving_unit.toLowerCase().trim() || Number(food.serving_size) <= 0) return null
  const factor = quantity / Number(food.serving_size)
  return Object.fromEntries(Object.keys(emptyNutrition()).map(key => [key, Math.round(Number(food[key as keyof Nutrition]) * factor * 10) / 10])) as unknown as Nutrition
}
export function supplementSlots(times: string[], frequency: number): string[] {
  const validTimes = Array.from(new Set(times.filter(t => /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(t)).map(t => t.slice(0, 5)))).sort()
  return [...validTimes, ...Array.from({ length: Math.max(0, frequency - validTimes.length) }, (_, i) => `dose-${i + 1}`)]
}
export function sumNutrition(rows: Nutrition[]): Nutrition {
  return rows.reduce((sum, row) => {
    for (const key of Object.keys(sum) as (keyof Nutrition)[]) sum[key] += Number(row[key]) || 0
    return sum
  }, emptyNutrition())
}

export function workoutWeek(startDate: string, date: string, totalWeeks: number) {
  const elapsed = Math.max(0, Math.floor((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${startDate}T12:00:00Z`)) / 86400000))
  return Math.floor(elapsed / 7) % Math.max(1,totalWeeks) + 1
}
export function selectWorkoutDays<T extends { week_number: number; day_of_week: number }>(days: T[], week: number, weekday: number): T[] {
  const effectiveWeek = days.some(d => d.week_number === week) ? week : 1
  return days.filter(d => d.week_number === effectiveWeek && d.day_of_week === weekday)
}
