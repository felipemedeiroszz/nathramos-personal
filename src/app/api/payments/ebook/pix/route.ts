import { NextRequest } from "next/server"
import { ebookPixSchema } from "@/schemas/payments"
import { handleApiError, jsonResponse, errorResponse, requireApiUser } from "@/lib/api/response"
import { AsaasProvider } from "@/lib/payments/asaas"
import { PaymentService, ProfileService } from "@/lib/payments/services"
import { EbookService } from "@/services/EbookService"
import type { Currency, PaymentMethod } from "@/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireApiUser()
    const raw = await req.json()
    const parsed = ebookPixSchema.safeParse(raw)
    if (!parsed.success) {
      return errorResponse("Dados inválidos.", 400, "VALIDATION_ERROR", {
        issues: parsed.error.flatten(),
      })
    }

    const { ebook_id } = parsed.data

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
    if (!profile) {
      return errorResponse("Perfil de usuário não encontrado.", 404, "PROFILE_NOT_FOUND")
    }

    const amount = ebook.price_cents / 100
    const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const idempotencyKey = `ebook_${userId}_${ebook.id}_${Date.now()}`

    const pixResult = await AsaasProvider.createPixCharge({
      customerId: profile.asaas_customer_id ?? undefined,
      name: profile.full_name || "Cliente",
      email: (profile as any).email || "",
      cpfCnpj: profile.cpf ?? undefined,
      phone: profile.phone ?? undefined,
      amount,
      dueDate,
      description: `E-book ${ebook.title_pt}`,
      externalReference: idempotencyKey,
      userId,
    })

    if (!profile.asaas_customer_id) {
      const customer = await AsaasProvider.findOrCreateCustomer({
        name: profile.full_name || "Cliente",
        email: (profile as any).email || "",
        cpfCnpj: profile.cpf ?? undefined,
        phone: profile.phone ?? undefined,
        userId,
      })
      await ProfileService.setAsaasCustomerId(userId, customer.id)
    }

    await PaymentService.upsertPayment({
      userId,
      provider: "asaas",
      externalId: pixResult.id,
      status: "pending",
      amountCents: ebook.price_cents,
      currency: (ebook.currency || "BRL") as Currency,
      method: "pix" as PaymentMethod,
      descriptionPt: `Compra do e-book ${ebook.title_pt}`,
      descriptionEn: `E-book purchase ${ebook.title_en}`,
      pixQrCode: pixResult.pix_qr_code,
      pixCopyPaste: pixResult.pix_copy_paste,
      pixExpiresAt: pixResult.pix_expires_at,
      idempotencyKey,
      metadata: { ebook_id: ebook.id },
    })

    await EbookService.createPendingPurchase({
      userId,
      ebookId: ebook.id,
      provider: "asaas",
      amountCents: ebook.price_cents,
      currency: (ebook.currency || "BRL") as Currency,
      externalId: pixResult.id,
      pixQrCode: pixResult.pix_qr_code,
      pixCopyPaste: pixResult.pix_copy_paste,
      pixExpiresAt: pixResult.pix_expires_at,
    })

    return jsonResponse({
      pix_qr_code: pixResult.pix_qr_code,
      pix_copy_paste: pixResult.pix_copy_paste,
      pix_expires_at: pixResult.pix_expires_at,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
