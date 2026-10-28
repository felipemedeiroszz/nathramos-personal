"use server";
import {
  requireManagedStudent,
  requireManagedRecord,
  requireOwnedPrescription,
  requireOwnedKitItem,
} from "@/lib/auth/platform";

import { requireRoomAccess } from "@/lib/auth/platform";
import { revalidatePath } from "next/cache";
import {
  requireAuthenticated,
  requireRole,
  getCurrentRole,
} from "@/lib/auth/access";
import { MentorshipService } from "@/services/MentorshipService";
import type {
  EnsureMentorshipRoomInput,
  SendChatMessageInput,
  UpdateMeetingStatusInput,
  UpsertMeetingInput,
} from "@/schemas/mentoring";
import type { ChatSenderT } from "@/lib/supabase/types";

// ---------------------------------------------------------------------
// CHAT DE MENTORIA
// ---------------------------------------------------------------------
export async function sendChatMessageAction(input: SendChatMessageInput) {
  try {
    const { userId, viewer: senderType } = await requireRoomAccess(
      input.room_id,
      true,
    );

    if (input.reply_to_id) {
      const db = await (
        await import("@/lib/supabase/server")
      ).createServiceClientSSR();
      const { data, error } = await db
        .from("chat_messages")
        .select("id")
        .eq("id", input.reply_to_id)
        .eq("room_id", input.room_id)
        .eq("is_deleted", false)
        .maybeSingle();
      if (error || !data)
        return {
          success: false as const,
          message: "Mensagem de referência indisponível.",
        };
    }
    const saved = await MentorshipService.sendMessage(
      input,
      userId,
      senderType,
    );
    if (!saved) {
      return {
        success: false as const,
        message: "Falha ao enviar a mensagem.",
      };
    }

    revalidatePath("/[locale]/admin/mentoria", "page");
    revalidatePath("/[locale]/conversas", "page");
    return { success: true as const, data: saved };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao enviar a mensagem.",
    };
  }
}

export async function fetchRoomMessagesAction(
  roomId: string,
  afterIso?: string,
) {
  try {
    await requireRoomAccess(roomId);
    const messages = afterIso
      ? await MentorshipService.listMessagesAfter(roomId, afterIso)
      : await MentorshipService.listMessages(roomId);
    return { success: true as const, data: messages };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao carregar as mensagens.",
    };
  }
}

export async function markRoomReadAction(
  roomId: string,
  viewer: "coach" | "user",
) {
  try {
    const actor = await requireRoomAccess(roomId);
    const ok = await MentorshipService.markRoomRead(roomId, actor.viewer);
    if (!ok) throw new Error("Falha ao marcar como lida.");
    revalidatePath("/[locale]/admin/mentoria", "page");
    revalidatePath("/[locale]/conversas", "page");
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao marcar como lida.",
    };
  }
}

export async function ensureMentorshipRoomAction(
  input: EnsureMentorshipRoomInput,
) {
  await requireRole(["admin", "coach"], "/dashboard");
  try {
    await requireManagedStudent(input.student_id);
    const room = await MentorshipService.ensureRoom(input);
    if (!room) {
      return { success: false as const, message: "Falha ao abrir a conversa." };
    }
    revalidatePath("/[locale]/admin/mentoria", "page");
    return { success: true as const, data: room };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao abrir a conversa.",
    };
  }
}

export async function setMentorshipRoomActiveAction(
  roomId: string,
  isActive: boolean,
) {
  const { userId } = await requireRole(["admin", "coach"], "/dashboard");
  try {
    await requireRoomAccess(roomId);
    const ok = await MentorshipService.setRoomActive(roomId, isActive, userId);
    if (!ok) {
      return {
        success: false as const,
        message: "Falha ao atualizar a conversa.",
      };
    }
    revalidatePath("/[locale]/admin/mentoria", "page");
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao atualizar a conversa.",
    };
  }
}

// ---------------------------------------------------------------------
// REUNIÕES
// ---------------------------------------------------------------------
export async function upsertMeetingAction(input: UpsertMeetingInput) {
  const { userId } = await requireRole(["admin", "coach"], "/dashboard");
  try {
    await requireManagedStudent(input.user_id);
    if (input.id) await requireManagedRecord("meetings", input.id, "user_id");
    const saved = await MentorshipService.upsertMeeting(input, userId);
    if (!saved) {
      return { success: false as const, message: "Falha ao salvar a reunião." };
    }
    revalidatePath("/[locale]/admin/mentoria", "page");
    revalidatePath("/[locale]/admin/reunioes", "page");
    revalidatePath("/[locale]/conversas", "page");
    return { success: true as const, data: saved };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao salvar a reunião.",
    };
  }
}

export async function updateMeetingStatusAction(
  input: UpdateMeetingStatusInput,
) {
  await requireRole(["admin", "coach"], "/dashboard");
  try {
    await requireManagedRecord("meetings", input.id, "user_id");
    const saved = await MentorshipService.updateMeetingStatus(input);
    if (!saved) {
      return {
        success: false as const,
        message: "Falha ao atualizar a reunião.",
      };
    }
    revalidatePath("/[locale]/admin/mentoria", "page");
    revalidatePath("/[locale]/admin/reunioes", "page");
    revalidatePath("/[locale]/conversas", "page");
    return { success: true as const, data: saved };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao atualizar a reunião.",
    };
  }
}

export async function deleteMeetingAction(id: string) {
  const { userId } = await requireRole(["admin", "coach"], "/dashboard");
  try {
    await requireManagedRecord("meetings", id, "user_id");
    const ok = await MentorshipService.deleteMeeting(id, userId);
    if (!ok) {
      return {
        success: false as const,
        message: "Falha ao excluir a reunião.",
      };
    }
    revalidatePath("/[locale]/admin/mentoria", "page");
    revalidatePath("/[locale]/admin/reunioes", "page");
    revalidatePath("/[locale]/conversas", "page");
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao excluir a reunião.",
    };
  }
}
