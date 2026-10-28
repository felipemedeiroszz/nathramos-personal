import "server-only";
import { createClientSSR, createServiceClientSSR } from "@/lib/supabase/server";
import { canAccessPlatform } from "./access";
import { getMaintenanceStatus } from "@/services/PlatformSettingsService";
import { redirect } from "next/navigation";

export class AccessError extends Error {
  constructor(
    message: string,
    public status = 403,
  ) {
    super(message);
  }
}
export async function requirePlatformUser() {
  const client = await createClientSSR();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user)
    throw new AccessError("Entre na sua conta para continuar.", 401);
  const db = await createServiceClientSSR();
  const result = await db
    .from("profiles")
    .select("role, is_deleted")
    .eq("id", user.id)
    .single();
  if (result.error)
    throw new Error("Não foi possível verificar o acesso à conta.");
  const profile = result.data as { role: string; is_deleted: boolean };
  if (profile.is_deleted) throw new AccessError("Conta indisponível.");
  const staff = profile.role === "admin" || profile.role === "coach";
  if (!staff) {
    const access = await canAccessPlatform(user.id, true);
    if (!access.allowed)
      throw new AccessError(
        "Regularize sua assinatura para acessar a plataforma.",
      );
    if ((await getMaintenanceStatus()).active)
      throw new AccessError("Plataforma em manutenção.", 503);
  }
  return { userId: user.id, role: profile.role, staff };
}
export async function requireStudentPage() {
  try {
    return (await requirePlatformUser()).userId;
  } catch (error) {
    if (error instanceof AccessError && error.status === 401)
      redirect("/login");
    if (error instanceof AccessError && error.status === 403)
      redirect("/assinatura");
    throw error;
  }
}
export async function requireStudentTarget(targetId?: string | null) {
  const actor = await requirePlatformUser();
  if (targetId && targetId !== actor.userId && !actor.staff)
    throw new AccessError("Acesso negado.");
  if (targetId && targetId !== actor.userId && actor.role === "coach")
    await requireManagedStudent(targetId);
  return { ...actor, targetId: targetId || actor.userId };
}
export async function requireRoomAccess(roomId: string, writing = false) {
  const actor = await requirePlatformUser();
  const db = await createServiceClientSSR();
  const { data, error } = await db
    .from("mentorship_rooms")
    .select("user_id, coach_id, is_active")
    .eq("id", roomId)
    .maybeSingle();
  if (error) throw new Error("Não foi possível verificar a conversa.");
  const room = data as {
    user_id: string;
    coach_id: string | null;
    is_active: boolean;
  } | null;
  if (
    !room ||
    !(
      actor.role === "admin" ||
      room.user_id === actor.userId ||
      (actor.role === "coach" && room.coach_id === actor.userId)
    )
  )
    throw new AccessError("Conversa indisponível.");
  if (writing && !room.is_active)
    throw new AccessError("Esta conversa está encerrada.");
  return {
    ...actor,
    viewer:
      actor.userId === room.user_id ? ("user" as const) : ("coach" as const),
  };
}

export async function requireManagedStudent(studentId: string) {
  const actor = await requirePlatformUser();
  if (!actor.staff) throw new AccessError("Acesso negado.");
  const db = await createServiceClientSSR();
  const { data, error } = await (db.rpc as any)("can_manage_student", {
    p_student: studentId,
    p_actor: actor.userId,
  });
  if (error)
    throw new Error("Não foi possível verificar o responsável pelo aluno.");
  if (!data)
    throw new AccessError("Aluno fora da sua carteira de atendimento.");
  return actor;
}
export async function requireManagedRecord(
  table:
    | "meetings"
    | "exams"
    | "student_workout_kits"
    | "student_workout_overrides",
  id: string,
  column = "student_id",
) {
  const db = await createServiceClientSSR();
  const { data, error } = await (db.from(table as any) as any)
    .select(column)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) throw new AccessError("Registro indisponível.");
  return requireManagedStudent(data[column]);
}

export async function requireOwnedPrescription(
  table:
    | "diet_kits"
    | "supplement_kits"
    | "workout_kits"
    | "workout_programs"
    | "exercises",
  id?: string | null,
) {
  const actor = await requirePlatformUser();
  if (!actor.staff) throw new AccessError("Acesso negado.");
  if (!id || actor.role === "admin") return actor;
  const db = await createServiceClientSSR();
  const ownerColumn =
    table === "workout_programs" ? "owner_id" : "created_by_id";
  const { data, error } = await (db.from(table as any) as any)
    .select(ownerColumn)
    .eq("id", id)
    .maybeSingle();
  if (error || !data || data[ownerColumn] !== actor.userId)
    throw new AccessError(
      "Somente o autor ou administrador pode alterar esta prescrição.",
    );
  return actor;
}
export async function requireOwnedKitItem(itemId: string) {
  const db = await createServiceClientSSR();
  const { data, error } = await db
    .from("workout_kit_items")
    .select("kit_id")
    .eq("id", itemId)
    .maybeSingle();
  if (error || !data) throw new AccessError("Item indisponível.");
  return requireOwnedPrescription(
    "workout_kits",
    (data as { kit_id: string }).kit_id,
  );
}
export async function staffStudentIds(): Promise<string[] | null> {
  const actor = await requirePlatformUser();
  if (actor.role === "admin") return null;
  if (!actor.staff) return [actor.userId];
  const db = await createServiceClientSSR();
  const { data, error } = await db
    .from("mentorship_rooms")
    .select("user_id")
    .eq("coach_id", actor.userId);
  if (error) throw new Error("Não foi possível carregar a carteira de alunos.");
  return ((data as { user_id: string }[]) || []).map((row) => row.user_id);
}
