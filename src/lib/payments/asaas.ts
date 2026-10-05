const getEnv = (key: string, required = false) => {
  const value = process.env[key]
  if (required && (!value || value.length === 0)) {
    throw new Error(`[asaas] Missing required env: ${key}`)
  }
  return value ?? ""
}

const apiKey = getEnv("ASAAS_API_KEY")
const environment = (getEnv("ASAAS_ENVIRONMENT") || "sandbox") as "sandbox" | "production"
const webhookToken = getEnv("ASAAS_WEBHOOK_TOKEN")

const BASE_URLS: Record<"sandbox" | "production", string> = {
  sandbox: "https://sandbox.asaas.com/api/v3",
  production: "https://www.asaas.com/api/v3",
}

function getBaseUrl() {
  return BASE_URLS[environment] ?? BASE_URLS.sandbox
}

function getAuthHeaders(): Record<string, string> {
  if (!apiKey) {
    throw new Error("ASAAS_API_KEY não configurada.")
  }
  return {
    access_token: apiKey,
    "Content-Type": "application/json",
    Accept: "application/json",
  }
}

export interface AsaasPixCreateInput {
  customerId?: string
  name: string
  email: string
  cpfCnpj?: string
  phone?: string
  amount: number
  dueDate: string
  description: string
  externalReference?: string
  userId?: string
  planId?: string
}

export interface AsaasPixResult {
  id: string
  pix_qr_code: string
  pix_copy_paste: string
  pix_expires_at: string
  status: string
  external_reference?: string
  invoice_url?: string
}

export interface AsaasPaymentStatus {
  id: string
  status: string
  external_reference?: string
  date_created?: string
  payment_date?: string
  value?: number
}

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers ?? {}),
    },
  })

  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (!res.ok) {
    const errMsg =
      (data && typeof data === "object" && "errors" in data && Array.isArray((data as any).errors)
        ? (data as any).errors.map((e: any) => e.description || e.code).join(", ")
        : null) ||
      (data && typeof data === "object" && "message" in data ? (data as any).message : null) ||
      `ASAAS request failed (${res.status})`
    throw new Error(errMsg)
  }

  return data as T
}

export const AsaasProvider = {
  getWebhookToken() {
    return webhookToken
  },

  async findOrCreateCustomer(input: { name: string; email: string; cpfCnpj?: string; phone?: string; userId?: string }): Promise<{ id: string }> {
    const list = await request<any>(`/customers?email=${encodeURIComponent(input.email)}&limit=1`, {
      method: "GET",
    })
    if (list && list.data && list.data.length > 0) {
      return { id: list.data[0].id }
    }
    const created = await request<any>("/customers", {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        email: input.email,
        cpfCnpj: input.cpfCnpj,
        phone: input.phone,
        externalReference: input.userId,
        notificationDisabled: true,
      }),
    })
    return { id: created.id }
  },

  async createPixCharge(input: AsaasPixCreateInput): Promise<AsaasPixResult> {
    let customerId = input.customerId
    if (!customerId) {
      const customer = await this.findOrCreateCustomer({
        name: input.name,
        email: input.email,
        cpfCnpj: input.cpfCnpj,
        phone: input.phone,
        userId: input.userId,
      })
      customerId = customer.id
    }

    const payment = await request<any>("/payments", {
      method: "POST",
      body: JSON.stringify({
        customer: customerId,
        billingType: "PIX",
        value: Number(input.amount.toFixed(2)),
        dueDate: input.dueDate,
        description: input.description,
        externalReference: input.externalReference,
      }),
    })

    if (!payment || !payment.id) {
      throw new Error("Falha ao criar cobrança PIX no ASAAS.")
    }

    const pix = await request<any>(`/payments/${payment.id}/pixQrCode`, {
      method: "GET",
    })

    const expiresAt = pix?.expirationDate || payment?.dueDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    return {
      id: payment.id,
      pix_qr_code: pix?.encodedImage ?? "",
      pix_copy_paste: pix?.payload ?? "",
      pix_expires_at: expiresAt,
      status: payment.status || "PENDING",
      external_reference: payment.externalReference,
      invoice_url: payment.invoiceUrl,
    }
  },

  async getPaymentStatus(paymentId: string): Promise<AsaasPaymentStatus> {
    const payment = await request<any>(`/payments/${paymentId}`, {
      method: "GET",
    })
    return {
      id: payment.id,
      status: payment.status,
      external_reference: payment.externalReference,
      date_created: payment.dateCreated,
      payment_date: payment.paymentDate,
      value: payment.value,
    }
  },
}
