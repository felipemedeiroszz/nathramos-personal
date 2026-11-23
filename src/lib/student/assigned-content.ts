export type AssignedKind = "workout" | "diet" | "supplement";
export type AssignmentAvailability =
  | "available"
  | "scheduled"
  | "ended"
  | "inactive"
  | "unavailable"
  | "not_today";
export interface AssignedContent {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  availability: AssignmentAvailability;
  days?: {
    id: string;
    name: string;
    week: number;
    weekday: number;
    available: boolean;
  }[];
}
export function linkedAssignmentAvailability(
  row: {
    id: string;
    status: string;
    start_date: string;
    end_date: string | null;
    kit?: { is_deleted?: boolean } | null;
    kit_id?: string | null;
    program_id?: string | null;
  },
  date: string,
  availableIds: ReadonlySet<string>,
): AssignmentAvailability {
  if ((!row.kit && !(row.program_id && !row.kit_id)) || row.kit?.is_deleted)
    return "unavailable";
  if (row.status !== "active")
    return row.end_date && row.end_date < date ? "ended" : "inactive";
  if (row.start_date > date) return "scheduled";
  if (row.end_date && row.end_date < date) return "ended";
  return availableIds.has(row.id) ? "available" : "not_today";
}
export function sortAssignedContent(items: AssignedContent[]) {
  const priority = {
    available: 0,
    scheduled: 2,
    not_today: 1,
    ended: 3,
    inactive: 4,
    unavailable: 5,
  };
  return [...items].sort(
    (a, b) =>
      priority[a.availability] - priority[b.availability] ||
      (a.availability === "ended"
        ? b.startDate.localeCompare(a.startDate)
        : a.startDate.localeCompare(b.startDate)) ||
      a.id.localeCompare(b.id),
  );
}
