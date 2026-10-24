import { NextResponse } from "next/server"
import { createClientSSR } from "@/lib/supabase/server"
import { PushService } from "@/services/PushService"

export const dynamic = "force-dynamic"

/** Registra (ou revalida) a subscription de push do dispositivo atual. */
export async function POST(request: Request) {
  try {
    const supabase = await createClientSSR()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as {
      endpoint?: unknown
      keys?: { p256dh?: unknown; auth?: unknown }
      device_name?: unknown
    } | null

    const endpoint = typeof body?.endpoint === "string" ? body.endpoint : ""
    const p256dh = typeof body?.keys?.p256dh === "string" ? body.keys.p256dh : ""
    const auth = typeof body?.keys?.auth === "string" ? body.keys.auth : ""

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "invalid_subscription" }, { status: 400 })
    }

    const ok = await PushService.saveSubscription(
      user.id,
      { endpoint, keys: { p256dh, auth } },
      {
        device_name: typeof body?.device_name === "string" ? body.device_name : null,
        user_agent: request.headers.get("user-agent"),
      }
    )

    if (!ok) {
      return NextResponse.json({ error: "save_failed" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "unexpected" }, { status: 500 })
  }
}
