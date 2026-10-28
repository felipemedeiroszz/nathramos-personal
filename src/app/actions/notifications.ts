"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId, requireRole } from "@/lib/auth/access";
import { AuditLogService } from "@/services/AuditLogService";
import { NotificationService } from "@/services/NotificationService";
import { PushService } from "@/services/PushService";
import {
  sendNotificationSchema,
  templateSchema,
  notifySettingsSchema,
  notificationPreferencesSchema,
  NOTIFICATION_TYPES,
  type SendNotificationInput,
  type TemplateInput,
  type NotifySettingsInput,
  type NotificationPreferencesInput,
} from "@/schemas/notifications";

function revalidate() {
  revalidatePath("/[locale]/admin/notificacoes", "page");
}

export async function getMyNotificationsAction() {
  const userId = await getCurrentUserId();
  if (!userId) return { items: [], unread: 0 };
  const [items, unread] = await Promise.all([
    NotificationService.listForUser(userId, false, 8),
    NotificationService.unreadCount(userId),
  ]);
  return { items, unread };
}

export async function getNotificationInboxAction(limit: number = 100) {
  const userId = await getCurrentUserId();
  if (!userId) return { items: [] };
  const items = await NotificationService.listForUser(
    userId,
    false,
    Math.min(Math.max(limit, 1), 200),
  );
  return { items };
}

export async function markNotificationReadAction(notificationId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false as const };
  const ok = await NotificationService.markRead(userId, notificationId);
  return { success: ok };
}

export async function markAllNotificationsReadAction() {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false as const };
  const ok = await NotificationService.markAllRead(userId);
  return { success: ok };
}

export async function getNotificationPreferencesAction() {
  const userId = await getCurrentUserId();
  if (!userId) return { preferences: null, settings: null, devices: 0 };
  const [preferences, settings, devices] = await Promise.all([
    NotificationService.getPreferences(userId),
    NotificationService.getNotifySettings(userId),
    PushService.countDevices(userId),
  ]);
  return { preferences, settings, devices };
}

export async function saveNotificationPreferencesAction(
  input: NotificationPreferencesInput,
) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false as const, message: "unauthorized" };
  try {
    const parsed = notificationPreferencesSchema.parse(input);
    const email: Record<string, boolean> = {};
    const push: Record<string, boolean> = {};
    for (const type of NOTIFICATION_TYPES) {
      if (typeof parsed.email[type] === "boolean")
        email[type] = parsed.email[type];
      if (typeof parsed.push[type] === "boolean")
        push[type] = parsed.push[type];
    }
    const ok = await NotificationService.savePreferences(userId, {
      email,
      push,
    } as never);
    if (!ok) {
      return {
        success: false as const,
        message: "Não foi possível salvar as preferências.",
      };
    }
    revalidatePath("/[locale]/account", "page");
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message:
        e?.issues?.[0]?.message ??
        e?.message ??
        "Não foi possível salvar as preferências.",
    };
  }
}

export async function saveNotifySettingsAction(input: NotifySettingsInput) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false as const, message: "unauthorized" };
  try {
    const parsed = notifySettingsSchema.parse(input);
    const ok = await NotificationService.saveNotifySettings(userId, {
      push_enabled: parsed.push_enabled,
      quiet_hours_start: parsed.quiet_hours_start
        ? `${parsed.quiet_hours_start}:00`
        : null,
      quiet_hours_end: parsed.quiet_hours_end
        ? `${parsed.quiet_hours_end}:00`
        : null,
    });
    if (!ok) {
      return {
        success: false as const,
        message: "Não foi possível salvar as configurações.",
      };
    }
    revalidatePath("/[locale]/account", "page");
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message:
        e?.issues?.[0]?.message ??
        e?.message ??
        "Não foi possível salvar as configurações.",
    };
  }
}

export async function sendNotificationAction(input: SendNotificationInput) {
  const { userId } = await requireRole(["admin"], "/dashboard");
  try {
    const parsed = sendNotificationSchema.parse(input);
    const result = await NotificationService.broadcastToStudents({
      type: parsed.type,
      title_pt: parsed.title_pt,
      title_en: parsed.title_en,
      body_pt: parsed.body_pt,
      body_en: parsed.body_en,
      url: parsed.url || undefined,
    });

    await AuditLogService.log({
      adminId: userId,
      action: "notification.broadcast",
      entity_type: "notification",
      details: {
        type: parsed.type,
        recipients: result.sent,
        total: result.total,
      },
    });

    revalidate();
    return { success: true as const, sent: result.sent, total: result.total };
  } catch (e: any) {
    return {
      success: false as const,
      message:
        e?.issues?.[0]?.message ??
        e?.message ??
        "Não foi possível enviar a notificação.",
    };
  }
}

export async function saveTemplateAction(input: TemplateInput) {
  const { userId } = await requireRole(["admin"], "/dashboard");
  try {
    const parsed = templateSchema.parse(input);
    const ok = await NotificationService.saveTemplate({
      id: parsed.id,
      slug: parsed.slug,
      type: parsed.type,
      title_pt: parsed.title_pt,
      title_en: parsed.title_en,
      body_pt: parsed.body_pt,
      body_en: parsed.body_en,
      default_url: parsed.default_url || null,
    });

    if (!ok) {
      return {
        success: false as const,
        message: "Não foi possível salvar o template.",
      };
    }

    await AuditLogService.log({
      adminId: userId,
      action: parsed.id
        ? "notification.template.update"
        : "notification.template.create",
      entity_type: "notification_template",
      entity_id: parsed.id ?? parsed.slug,
      details: { slug: parsed.slug, type: parsed.type },
    });

    revalidate();
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message:
        e?.issues?.[0]?.message ??
        e?.message ??
        "Não foi possível salvar o template.",
    };
  }
}

export async function deleteTemplateAction(templateId: string) {
  const { userId } = await requireRole(["admin"], "/dashboard");
  try {
    const ok = await NotificationService.deleteTemplate(templateId);
    if (!ok) {
      return {
        success: false as const,
        message: "Não foi possível excluir o template.",
      };
    }

    await AuditLogService.log({
      adminId: userId,
      action: "notification.template.delete",
      entity_type: "notification_template",
      entity_id: templateId,
    });

    revalidate();
    return { success: true as const };
  } catch {
    return {
      success: false as const,
      message: "Não foi possível excluir o template.",
    };
  }
}
