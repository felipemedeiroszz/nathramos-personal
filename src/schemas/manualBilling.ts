import { z } from "zod";

export function moneyToCents(value: string) {
  if (!/^\d{1,7}([.,]\d{1,2})?$/.test(value.trim())) return NaN;
  const [whole, fraction = ""] = value.trim().replace(",", ".").split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export const manualBillingSchema = z.object({
  studentId: z.string().uuid(),
  requestKey: z.string().uuid(),
  operation: z.enum(["plan", "payment", "plan_payment"]),
  planId: z.string().uuid().optional(),
  expires: z.string().date().optional(),
  amount: z.string().transform(moneyToCents).pipe(z.number().int().positive().max(100000000)).optional(),
  currency: z.enum(["BRL", "USD"]),
  method: z.enum(["cash", "pix", "bank_transfer", "credit_card"]).default("cash"),
  paidDate: z.string().date().optional(),
  notes: z.string().trim().max(1000).default(""),
  locale: z.enum(["pt-BR", "en-US"]),
}).superRefine((value, ctx) => {
  if (value.operation !== "payment" && (!value.planId || !value.expires)) ctx.addIssue({ code: "custom", message: "Selecione plano e vencimento." });
  if (value.operation !== "plan" && (!value.amount || !value.paidDate)) ctx.addIssue({ code: "custom", message: "Informe valor e data do recebimento." });
});
