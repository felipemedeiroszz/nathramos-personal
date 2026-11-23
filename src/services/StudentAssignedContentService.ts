import "server-only";
import { createServiceClientSSR } from "@/lib/supabase/server";
import { checked, readPages } from "./StudentRoutineService";
import { getZonedParts } from "@/lib/notifications/time";
import { dateKeySchema } from "@/lib/student/schedule";
import {
  linkedAssignmentAvailability,
  sortAssignedContent,
  type AssignedKind,
  type AssignedContent,
} from "@/lib/student/assigned-content";

// Callers must authenticate and authorize the student; all reads are scoped to that ID.
export class StudentAssignedContentService {
  static async counts(userId: string) {
    const db: any = await createServiceClientSSR();
    const counts = await Promise.all(
      [
        "student_workout_kits",
        "student_diet_kits",
        "student_supplement_kits",
      ].map(
        async (table) =>
          (
            await readPages<any>(
              () =>
                db
                  .from(table)
                  .select("id")
                  .eq("student_id", userId)
                  .order("id"),
              "assigned kit count",
            )
          ).data.length,
      ),
    );
    return { workout: counts[0], diet: counts[1], supplement: counts[2] };
  }
  static async today(userId: string) {
    const db: any = await createServiceClientSSR();
    const profile = checked<any>(
      await db.from("profiles").select("timezone").eq("id", userId).single(),
      "assigned content timezone",
    );
    return getZonedParts(new Date(), profile.timezone || "America/Sao_Paulo")
      .dateKey;
  }
  static async list(
    userId: string,
    kind: AssignedKind,
    context: {
      date: string;
      locale: string;
      availableAssignmentIds: string[];
      availableDays?: { assignmentId: string; dayId: string }[];
    },
  ): Promise<AssignedContent[]> {
    dateKeySchema.parse(context.date);
    const db: any = await createServiceClientSSR();
    const tables = {
      workout: ["student_workout_kits", "workout_kits"],
      diet: ["student_diet_kits", "diet_kits"],
      supplement: ["student_supplement_kits", "supplement_kits"],
    } as const;
    const [table, kits] = tables[kind];
    // Include upcoming, ended and paused assignments. Eligibility still comes
    // exclusively from the existing daily scheduler, never from this catalog.
    const { data: rows } = await readPages<any>(
      () =>
        db
          .from(table)
          .select(`*, kit:${kits}(*)`)
          .eq("student_id", userId)
          .order("id"),
      "student linked kits",
    );
    const en = context.locale === "en-US",
      availableIds = new Set(context.availableAssignmentIds);
    const items: AssignedContent[] = rows.map((row) => ({
      id: row.id,
      name:
        (en ? row.kit?.name_en : row.kit?.name_pt) ||
        row.kit?.name_pt ||
        (row.program_id && !row.kit_id
          ? en
            ? "Assigned workout"
            : "Treino vinculado"
          : en
            ? "Unavailable kit"
            : "Kit indisponível"),
      startDate: row.start_date,
      endDate: row.end_date,
      availability: linkedAssignmentAvailability(
        row,
        context.date,
        availableIds,
      ),
    }));
    if (kind === "workout" && rows.length) {
      const kitIds = [
        ...new Set(rows.map((row) => row.kit_id).filter(Boolean)),
      ];
      const allKitItems: any[] = [];
      for (let offset = 0; offset < kitIds.length; offset += 100) {
        const result = await readPages<any>(
          () =>
            db
              .from("workout_kit_items")
              .select("id,kit_id,program_id")
              .in("kit_id", kitIds.slice(offset, offset + 100))
              .order("id"),
          "linked workout kit programs",
        );
        allKitItems.push(...result.data);
      }
      const programIds = [
        ...new Set(
          rows
            .flatMap((row) => [
              row.program_id,
              row.kit?.generated_program_id,
              ...allKitItems
                .filter((item) => item.kit_id === row.kit_id)
                .map((item) => item.program_id),
            ])
            .filter(Boolean),
        ),
      ];
      const allDays: any[] = [];
      for (let offset = 0; offset < programIds.length; offset += 100) {
        const result = await readPages<any>(
          () =>
            db
              .from("workout_days")
              .select(
                "id,program_id,name_pt,name_en,week_number,day_of_week,order_index",
              )
              .in("program_id", programIds.slice(offset, offset + 100))
              .order("id"),
          "linked workout days",
        );
        allDays.push(...result.data);
      }
      const availableDays = new Set(
        (context.availableDays || []).map(
          (day) => `${day.assignmentId}:${day.dayId}`,
        ),
      );
      for (const item of items) {
        const row = rows.find((row) => row.id === item.id)!;
        const eligible = new Set(
          [
            row.program_id,
            row.kit?.generated_program_id,
            ...allKitItems
              .filter((i) => i.kit_id === row.kit_id)
              .map((i) => i.program_id),
          ].filter(Boolean),
        );
        item.days = allDays
          .filter((day) => eligible.has(day.program_id))
          .sort(
            (a, b) =>
              a.week_number - b.week_number ||
              a.day_of_week - b.day_of_week ||
              a.order_index - b.order_index ||
              a.id.localeCompare(b.id),
          )
          .map((day) => ({
            id: day.id,
            name: (en ? day.name_en : day.name_pt) || day.name_pt,
            week: day.week_number,
            weekday: day.day_of_week,
            available:
              item.availability === "available" &&
              availableDays.has(`${item.id}:${day.id}`),
          }));
      }
    }
    return sortAssignedContent(items);
  }
}
