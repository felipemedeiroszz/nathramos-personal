"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/access";
import {
  PlatformSettingsService,
  getSupportWhatsapp,
} from "@/services/PlatformSettingsService";
import {
  platformSettingsSchema,
  type PlatformSettingsInput,
} from "@/schemas/settings";

function revalidate() {
  revalidatePath("/[locale]/admin/configuracoes", "page");
}

/** Contato público de suporte (usado no fluxo de "esqueci minha senha"). */
export async function getSupportWhatsappAction() {
  const whatsapp = await getSupportWhatsapp();
  return { whatsapp };
}

export async function savePlatformSettingsAction(input: PlatformSettingsInput) {
  const { userId } = await requireRole(["admin"], "/dashboard");
  try {
    const parsed = platformSettingsSchema.parse(input);
    const ok = await PlatformSettingsService.save(parsed, userId);
    if (!ok) {
      return {
        success: false as const,
        message: "Falha ao salvar as configurações.",
      };
    }
    revalidate();
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message:
        e?.issues?.[0]?.message ??
        e?.message ??
        "Falha ao salvar as configurações.",
    };
  }
}
