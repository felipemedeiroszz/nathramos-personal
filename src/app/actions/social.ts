"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/access";
import { SocialLinksService } from "@/services/SocialLinksService";
import type {
  ReorderSocialLinksInput,
  UpsertSocialLinkInput,
} from "@/schemas/social";

function revalidate() {
  revalidatePath("/[locale]/admin/redes-sociais", "page");
  revalidatePath("/[locale]", "page");
}

export async function upsertSocialLinkAction(input: UpsertSocialLinkInput) {
  const { userId } = await requireRole(["admin", "coach"], "/dashboard");
  try {
    const saved = await SocialLinksService.upsert(input, userId);
    if (!saved) {
      return { success: false as const, message: "Falha ao salvar a rede social." };
    }
    revalidate();
    return { success: true as const, data: saved };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao salvar a rede social.",
    };
  }
}

export async function deleteSocialLinkAction(id: string) {
  const { userId } = await requireRole(["admin", "coach"], "/dashboard");
  try {
    const ok = await SocialLinksService.remove(id, userId);
    if (!ok) {
      return { success: false as const, message: "Falha ao excluir a rede social." };
    }
    revalidate();
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao excluir a rede social.",
    };
  }
}

export async function toggleSocialLinkActiveAction(id: string, isActive: boolean) {
  const { userId } = await requireRole(["admin", "coach"], "/dashboard");
  try {
    const ok = await SocialLinksService.toggleActive(id, isActive, userId);
    if (!ok) {
      return { success: false as const, message: "Falha ao atualizar a rede social." };
    }
    revalidate();
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao atualizar a rede social.",
    };
  }
}

export async function reorderSocialLinksAction(input: ReorderSocialLinksInput) {
  const { userId } = await requireRole(["admin", "coach"], "/dashboard");
  try {
    const ok = await SocialLinksService.reorder(input, userId);
    if (!ok) {
      return { success: false as const, message: "Falha ao reordenar as redes sociais." };
    }
    revalidate();
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao reordenar as redes sociais.",
    };
  }
}
