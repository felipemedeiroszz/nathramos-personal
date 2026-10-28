import "server-only"
import { DatabaseOperationError } from "@/lib/supabase/errors"
import { createServiceClientSSR } from "@/lib/supabase/server"
import { getZonedParts, shiftDateKey } from "@/lib/notifications/time"
import { isAssignmentCurrent, foodNutrition, supplementSlots, sumNutrition, type Nutrition } from "@/lib/student/routine"

export interface RoutineItem {
  key: string; kind: "diet" | "supplement"; assignmentId: string; itemId: string; kit: string; name: string;
  quantity: number; unit: string; slot: string; mealType: string; notes: string | null; done: boolean;
  foodId: string | null; nutrition: Nutrition | null
}
export interface WaterLog { id: number; amount_ml: number; logged_date: string; logged_time: string }
export interface ShoppingItem { foodId: string; name: string; quantities: { quantity: number; unit: string }[]; bought: boolean }
export interface RoutineData {
  date: string; weekStart: string; timezone: string; firstName: string; locale: string;
  diet: RoutineItem[]; supplements: RoutineItem[]; plannedNutrition: Nutrition; consumedNutrition: Nutrition;
  water: WaterLog[]; waterTotal: number; waterGoal: number | null;
  hydrationReminders: boolean; hydrationSilent: boolean; hydrationFrequency: number; quietStart: string | null; quietEnd: string | null;
  shopping: ShoppingItem[]; sleep: { logged_date: string; total_minutes: number }[];
  weight: { logged_date: string; weight_kg: number }[];
  logs: { kind: string; logged_date: string; assignment_id: string; item_id: string; slot: string }[];
}
export function checked<T>(result: { data: T | null; error: unknown }, operation: string): T {
  if (result.error) {
    throw new DatabaseOperationError(operation,result.error as {code?:string;status?:number})
  }
  return result.data as T
}

/** PostgREST caps responses; read complete bounded date windows rather than silently truncating them. */
export async function readPages<T>(query: () => any, operation: string): Promise<{ data: T[]; error: null }> {
  const data: T[] = []
  for (let offset = 0; ; offset += 500) {
    const rows = checked<T[]>(await query().range(offset, offset + 499), operation)
    data.push(...rows)
    if (rows.length < 500) break
  }
  return { data, error: null }
}

export class StudentRoutineService {
  // Callers must authorize the target before accessing this server-only service.
  static async get(userId: string, dateOverride?: string): Promise<RoutineData> {
    const db: any = await createServiceClientSSR()
    const profile: any = checked(await db.from("profiles").select("first_name, language, timezone, quiet_hours_start, quiet_hours_end").eq("id", userId).single(), "profile")
    const timezone = profile.timezone || "America/Sao_Paulo"
    const date = dateOverride || getZonedParts(new Date(), timezone).dateKey
    const weekday = ((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7) + 1
    const weekStart = shiftDateKey(date, 1 - weekday)
    const since = shiftDateKey(date, -29)
    const results: any[] = await Promise.all([
      db.from("student_diet_kits").select("*, kit:diet_kits(*)").eq("student_id", userId).eq("status", "active"),
      db.from("student_supplement_kits").select("*, kit:supplement_kits(*)").eq("student_id", userId).eq("status", "active"),
      readPages(() => db.from("student_routine_logs").select("*").eq("user_id", userId).gte("logged_date", since).lte("logged_date", date).order("id"), "routine logs"),
      readPages(() => db.from("water_intake_logs").select("id, amount_ml, logged_date, logged_time").eq("user_id", userId).gte("logged_date", since).lte("logged_date", date).order("id"), "water logs"),
      db.from("hydration_goals").select("daily_target_ml").eq("user_id", userId).lte("active_from", date).or(`active_until.is.null,active_until.gte.${date}`).order("active_from", { ascending: false }).limit(1).maybeSingle(),
      db.from("student_routine_settings").select("*").eq("user_id", userId).maybeSingle(),
      db.from("student_shopping_checks").select("food_id").eq("user_id", userId).eq("week_start", weekStart),
      db.from("sleep_logs").select("logged_date, total_minutes").eq("user_id", userId).gte("logged_date", since).lte("logged_date", date).order("logged_date", { ascending: false }),
      db.from("weight_logs").select("logged_date, weight_kg").eq("user_id", userId).gte("logged_date", since).lte("logged_date", date).order("logged_date", { ascending: false }).order("id", { ascending: false }),
    ])
    results.forEach((r, i) => checked(r, `routine query ${i}`))
    const dietAssignments = (results[0].data as any[]).filter(a => isAssignmentCurrent(a, date))
    const supplementAssignments = (results[1].data as any[]).filter(a => isAssignmentCurrent(a, date))
    const [dietResult, supplementResult] = await Promise.all([
      dietAssignments.length ? db.from("diet_kit_items").select("*, food:diet_foods(*)").in("kit_id", dietAssignments.map(a => a.kit_id)).order("order_index") : { data: [], error: null },
      supplementAssignments.length ? db.from("supplement_kit_items").select("*, supplement:supplements(*)").in("kit_id", supplementAssignments.map(a => a.kit_id)).order("order_index") : { data: [], error: null },
    ])
    const dietRows = checked<any[]>(dietResult, "diet items")
    const supplementRows = checked<any[]>(supplementResult, "supplement items")
    const logs = results[2].data as any[]
    const todayLogs = logs.filter(l => l.logged_date === date)
    const en = profile.language === "en-US"
    function build(kind: "diet" | "supplement", assignment: any, item: any, slot: string): RoutineItem {
      const product = kind === "diet" ? item.food : item.supplement
      const quantity = Number(kind === "diet" ? item.quantity ?? product.serving_size : item.dosage ?? product.serving_size)
      const unit = (kind === "diet" ? item.unit : item.dosage_unit) || product.serving_unit
      return {
        key: `${assignment.id}:${item.id}:${slot}`, kind, assignmentId: assignment.id, itemId: item.id,
        kit: en ? assignment.kit.name_en : assignment.kit.name_pt, name: en ? product.name_en : product.name_pt,
        quantity, unit, slot, mealType: item.meal_type || "other", notes: en ? item.notes_en : item.notes_pt,
        done: todayLogs.some(l => l.kind === kind && l.assignment_id === assignment.id && l.item_id === item.id && l.slot === slot),
        foodId: kind === "diet" ? item.food_id : null,
        nutrition: kind === "diet" ? foodNutrition(product, quantity, unit) : null,
      }
    }
    const diet = dietAssignments.flatMap(a => dietRows.filter(i => i.kit_id === a.kit_id && i.food?.is_active).map(i => build("diet", a, i, i.time_of_day || "")))
    const supplements = supplementAssignments.flatMap(a => supplementRows.filter(i => i.kit_id === a.kit_id && i.supplement?.is_active).flatMap(i => supplementSlots(i.times_of_day || [], i.frequency_per_day).map(slot => build("supplement", a, i, slot))))
    const checks = new Set((results[6].data as any[]).map(c => c.food_id))
    const shoppingMap = new Map<string, ShoppingItem>()
    for (const item of diet) {
      if (!item.foodId) continue
      const row: ShoppingItem = shoppingMap.get(item.foodId) || { foodId: item.foodId, name: item.name, quantities: [], bought: checks.has(item.foodId) }
      const q = row.quantities.find(q => q.unit === item.unit)
      if (q) q.quantity += item.quantity
      else row.quantities.push({ quantity: item.quantity, unit: item.unit })
      shoppingMap.set(item.foodId, row)
    }
    const water = results[3].data as WaterLog[]
    return {
      date, weekStart, timezone, firstName: profile.first_name || "", locale: profile.language,
      diet, supplements, plannedNutrition: sumNutrition(diet.flatMap(i => i.nutrition ? [i.nutrition] : [])),
      consumedNutrition: sumNutrition(todayLogs.filter(l => l.kind === "diet")), water,
      waterTotal: water.filter(w => w.logged_date === date).reduce((n, w) => n + w.amount_ml, 0),
      waterGoal: results[4].data?.daily_target_ml ?? null,
      hydrationReminders: results[5].data?.hydration_reminders ?? true,
      hydrationSilent: results[5].data?.hydration_silent ?? true,
      hydrationFrequency: results[5].data?.hydration_frequency_minutes ?? 60,
      quietStart: profile.quiet_hours_start, quietEnd: profile.quiet_hours_end,
      shopping: Array.from(shoppingMap.values()), sleep: results[7].data, weight: results[8].data, logs,
    }
  }
  static async setItem(userId: string, input: { kind: "diet" | "supplement"; assignmentId: string; itemId: string; slot: string; done: boolean }) {
    const routine = await this.get(userId)
    const item = [...routine.diet, ...routine.supplements].find(i => i.kind === input.kind && i.assignmentId === input.assignmentId && i.itemId === input.itemId && i.slot === input.slot)
    if (!item) throw new Error("Item não está mais atribuído para hoje. Atualize a página.")
    const db: any = await createServiceClientSSR()
    checked(await db.rpc("set_student_routine", { p_user_id: userId, p_kind: item.kind, p_assignment_id: item.assignmentId, p_item_id: item.itemId, p_slot: item.slot, p_done: input.done, p_date: routine.date }), "save routine item")
  }
}
