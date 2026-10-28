import { NextResponse } from "next/server"
import { NotificationDispatcher } from "@/services/NotificationDispatcher"

export const dynamic = "force-dynamic"

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = request.headers.get("authorization") ?? ""
  return header === `Bearer ${secret}`
}

/**
 * Processa notificações agendadas e gera lembretes de rotina.
 * Protegida por `Authorization: Bearer <CRON_SECRET>` (usada pelo Vercel Cron).
 * `?task=deliver|reminders|all` permite executar apenas uma das etapas.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const task = new URL(request.url).searchParams.get("task") ?? "all"

  const result: Record<string, unknown> = { task }

  try {
  if (task === "all" || task === "reminders") {
    result.reminders = await NotificationDispatcher.generateRoutineReminders()
  }
  if (task === "all" || task === "deliver") {
    result.deliveries = await NotificationDispatcher.processDueNotifications()
  }

  return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error("[cron/notifications]", error)
    return NextResponse.json({ error: "Falha ao processar notificações." }, { status: 500 })
  }
}
