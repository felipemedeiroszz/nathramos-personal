import { NextRequest } from "next/server"
import { ebookCheckoutSchema } from "@/schemas/payments"
import { handleApiError, jsonResponse, errorResponse, requireApiUser } from "@/lib/api/response"
import { StripeProvider } from "@/lib/payments/stripe"
import { ProfileService } from "@/lib/payments/services"
import { appReturnUrl, reserveCheckout, readyCheckout } from "@/lib/payments/checkout"
import { EbookService } from "@/services/EbookService"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireApiUser()
    const raw = await req.json()
    const parsed = ebookCheckoutSchema.safeParse(raw)
    if (!parsed.success) {
      return errorResponse("Dados de checkout inválidos.", 400, "VALIDATION_ERROR", {
        issues: parsed.error.flatten(),
      })
    }

    const { ebook_id, locale, success_path, cancel_path } = parsed.data

    const ebook = await EbookService.getEbook(ebook_id)
    if (!ebook || ebook.is_deleted || !ebook.is_published) {
      return errorResponse("E-book não encontrado ou indisponível.", 404, "EBOOK_NOT_FOUND")
    }
    if (ebook.is_free || !ebook.price_cents || ebook.price_cents <= 0) {
      return errorResponse("Este e-book é gratuito.", 400, "EBOOK_FREE")
    }

    const paidIds = await EbookService.getPaidEbookIds(userId)
    if (paidIds.includes(ebook.id)) {
      return errorResponse("Você já possui este e-book.", 409, "ALREADY_PURCHASED")
    }

    const profile = await ProfileService.getProfile(userId)
    const appUrl = StripeProvider.getAppUrl()
    const fallbackPath = `/${locale}/ebooks`
    const successUrl = appReturnUrl(appUrl, success_path, fallbackPath) + `?purchase=success&ebook=${encodeURIComponent(ebook.slug)}`
    const cancelUrl = appReturnUrl(appUrl, cancel_path, fallbackPath) + `?purchase=cancel&ebook=${encodeURIComponent(ebook.slug)}`

    const title = locale === "en-US" ? ebook.title_en : ebook.title_pt

    const op = await reserveCheckout(userId,"ebook",ebook.id,"stripe")
    if (op.remote_id) {
      const { getStripeClient } = await import("@/lib/payments/stripe")
      const session = await getStripeClient().checkout.sessions.retrieve(op.remote_id)
      if (session.url && session.status === "open") return jsonResponse({sessionId:session.id,url:session.url})
      return errorResponse("Checkout finalizado ou expirado.",409)
    }
    const result = await StripeProvider.createOneTimeCheckoutSession({
      userId,
      idempotencyKey: op.id,
      customerId: profile?.stripe_customer_id ?? undefined,
      customerEmail: (profile as any)?.email ?? undefined,
      amountCents: ebook.price_cents,
      currency: ebook.currency || "BRL",
      productName: title,
      productDescription: (locale === "en-US" ? ebook.summary_en : ebook.summary_pt) ?? undefined,
      successUrl,
      cancelUrl,
      metadata: { ebook_id: ebook.id, checkout_id: op.id },
    })

    await readyCheckout(op.id,result.sessionId,result.expiresAt)
    return jsonResponse({ sessionId: result.sessionId, url: result.url })
  } catch (error) {
    return handleApiError(error)
  }
}
