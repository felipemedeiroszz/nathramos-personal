import { NextResponse } from "next/server"
import { createClientSSR } from "@/lib/supabase/server"
import { PushService } from "@/services/PushService"

export const dynamic = "force-dynamic"

/** Remove a subscription de push do dispositivo atual. */
export async function POST(request: Request) {
  try {
    const supabase = await createClientSSR()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null
    const endpoint = typeof body?.endpoint === "string" ? body.endpoint : ""

    if (!endpoint) {
      return NextResponse.json({ error: "invalid_endpoint" }, { status: 400 })
    }

    const ok = await PushService.removeSubscription(user.id, endpoint)
    if (!ok) {
      return NextResponse.json({ error: "remove_failed" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "unexpected" }, { status: 500 })
  }
}
