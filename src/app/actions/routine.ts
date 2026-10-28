"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireStudentTarget, requirePlatformUser } from "@/lib/auth/platform";
import { createServiceClientSSR } from "@/lib/supabase/server";
import {
  StudentRoutineService,
  checked,
} from "@/services/StudentRoutineService";

function refresh() {
  revalidatePath("/[locale]/(student)", "layout");
  revalidatePath("/[locale]/admin/alunos/[id]", "page");
}
const itemSchema = z.object({
  kind: z.enum(["diet", "supplement"]),
  assignmentId: z.string().uuid(),
  itemId: z.string().uuid(),
  slot: z.string().max(40),
  done: z.boolean(),
});
export async function setRoutineItemAction(input: z.infer<typeof itemSchema>) {
  const { userId } = await requirePlatformUser();
  try {
    await StudentRoutineService.setItem(userId, itemSchema.parse(input));
    refresh();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Falha ao registrar item.",
    };
  }
}
export async function waterAction(input: {
  operation: "add" | "remove" | "reset";
  amount?: number;
  id?: number;
}) {
  const { userId } = await requirePlatformUser();
  try {
    const parsed = z
      .discriminatedUnion("operation", [
        z.object({
          operation: z.literal("add"),
          amount: z.number().int().min(10).max(5000),
        }),
        z.object({
          operation: z.literal("remove"),
          id: z.number().int().positive(),
        }),
        z.object({ operation: z.literal("reset") }),
      ])
      .parse(input);
    const routine = await StudentRoutineService.get(userId);
    const db: any = await createServiceClientSSR();
    if (parsed.operation === "add")
      checked(
        await db.from("water_intake_logs").insert({
          user_id: userId,
          logged_date: routine.date,
          amount_ml: parsed.amount,
          logged_time: new Intl.DateTimeFormat("en-GB", {
            timeZone: routine.timezone,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          }).format(new Date()),
        }),
        "water add",
      );
    else {
      let query = db
        .from("water_intake_logs")
        .delete()
        .eq("user_id", userId)
        .eq("logged_date", routine.date);
      if (parsed.operation === "remove") query = query.eq("id", parsed.id);
      checked(await query, "water remove");
    }
    refresh();
    return { success: true };
  } catch {
    return {
      success: false,
      message: "Não foi possível registrar a água. Use entre 10 e 5000 ml.",
    };
  }
}
export async function saveHydrationAction(
  input: {
    goal: number;
    reminders: boolean;
    frequency: number;
    silent: boolean;
  },
  targetId?: string,
) {
  const actor = await requireStudentTarget(targetId);
  try {
    const data = z
      .object({
        goal: z.number().int().min(500).max(10000),
        reminders: z.boolean(),
        frequency: z.union([
          z.literal(30),
          z.literal(45),
          z.literal(60),
          z.literal(90),
          z.literal(120),
        ]),
        silent: z.boolean(),
      })
      .parse(input);
    const routine = await StudentRoutineService.get(actor.targetId);
    const db: any = await createServiceClientSSR();
    checked(
      await db.rpc("save_student_hydration", {
        p_user_id: actor.targetId,
        p_date: routine.date,
        p_goal: data.goal,
        p_reminders: data.reminders,
        p_frequency: data.frequency,
        p_silent: data.silent,
      }),
      "hydration settings",
    );
    refresh();
    return { success: true };
  } catch {
    return {
      success: false,
      message: "Não foi possível salvar a meta e os lembretes.",
    };
  }
}
export async function setShoppingAction(foodId: string, bought: boolean) {
  const { userId } = await requirePlatformUser();
  try {
    z.string().uuid().parse(foodId);
    z.boolean().parse(bought);
    const routine = await StudentRoutineService.get(userId);
    if (!routine.shopping.some((i) => i.foodId === foodId))
      throw new Error("Alimento não atribuído.");
    const db: any = await createServiceClientSSR();
    const key = {
      user_id: userId,
      food_id: foodId,
      week_start: routine.weekStart,
    };
    checked(
      await (bought
        ? db.from("student_shopping_checks").upsert(key, {
            onConflict: "user_id,food_id,week_start",
            ignoreDuplicates: true,
          })
        : db.from("student_shopping_checks").delete().match(key)),
      "shopping check",
    );
    refresh();
    return { success: true };
  } catch {
    return { success: false, message: "Não foi possível atualizar a lista." };
  }
}
export async function recordHealthAction(input: {
  weight?: number;
  sleepMinutes?: number;
}) {
  const { userId } = await requirePlatformUser();
  try {
    const data = z
      .object({
        weight: z.number().min(20).max(400).optional(),
        sleepMinutes: z.number().int().min(0).max(1440).optional(),
      })
      .refine((v) => v.weight !== undefined || v.sleepMinutes !== undefined)
      .parse(input);
    const routine = await StudentRoutineService.get(userId);
    const db: any = await createServiceClientSSR();
    checked(
      await db.rpc("record_student_health", {
        p_user_id: userId,
        p_date: routine.date,
        p_weight: data.weight ?? null,
        p_sleep: data.sleepMinutes ?? null,
      }),
      "record health",
    );
    refresh();
    return { success: true };
  } catch {
    return {
      success: false,
      message: "Não foi possível salvar. Confira os valores informados.",
    };
  }
}
