import { NextRequest } from "next/server";
import { requireApiUser, handleApiError } from "@/lib/api/response";
import { billingProfile, studentPaymentPage } from "@/lib/payments/student";
import ExcelJS from "exceljs";
import { ApiValidationError } from "@/lib/api/response";
import { csvRow } from "@/lib/admin/csv";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireApiUser();
    await billingProfile(userId);
    const status = req.nextUrl.searchParams.get("status") || "all";
    const first = await studentPaymentPage(userId, { status });
    const columns = [
      "id",
      "created_at",
      "paid_at",
      "status",
      "method",
      "amount_cents",
      "currency",
      "refunded_amount_cents",
      "refunded_at",
      "external_id",
    ];
    const headers: Record<string, string> = {
      id: "Registro",
      created_at: "Criado em (São Paulo)",
      paid_at: "Pago em (São Paulo)",
      status: "Situação",
      method: "Forma de pagamento",
      amount_cents: "Valor",
      currency: "Moeda",
      refunded_amount_cents: "Valor estornado",
      refunded_at: "Estornado em (São Paulo)",
      external_id: "Identificador da cobrança",
    };
    const names: Record<string, string> = {
      paid: "Pago",
      pending: "Aguardando pagamento",
      processing: "Em processamento",
      failed: "Não aprovado",
      expired: "Vencido",
      canceled: "Cancelado",
      refunded: "Estornado",
      partially_refunded: "Estorno parcial",
      credit_card: "Cartão",
      pix: "PIX",
      boleto: "Boleto",
      bank_transfer: "Transferência",
    };
    const value = (row: any, key: string) => {
      const current = row[key];
      if (key.endsWith("_cents")) return Number(current || 0) / 100;
      if (key.endsWith("_at") && current)
        return new Intl.DateTimeFormat("sv-SE", {
          dateStyle: "short",
          timeStyle: "medium",
          timeZone: "America/Sao_Paulo",
        }).format(new Date(current));
      if (key === "status" || key === "method")
        return names[current] || current;
      return current ?? "";
    };
    if (req.nextUrl.searchParams.get("format") === "xlsx") {
      if (first.total > 5000)
        throw new ApiValidationError(
          "Use CSV para exportar mais de 5.000 registros.",
        );
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Pagamentos");
      sheet.columns = columns.map((key) => ({
        header: headers[key],
        key,
        width: key.includes("id") ? 38 : 24,
      }));
      let page = first;
      while (true) {
        for (const row of page.rows)
          sheet.addRow(
            Object.fromEntries(columns.map((c) => [c, value(row, c)])),
          );
        if (page.page * page.size >= page.total) break;
        page = await studentPaymentPage(userId, {
          status,
          page: String(page.page + 1),
        });
      }
      sheet.getColumn("amount_cents").numFmt = "0.00";
      sheet.getColumn("refunded_amount_cents").numFmt = "0.00";
      sheet.getRow(1).font = { bold: true };
      sheet.views = [{ state: "frozen", ySplit: 1 }];
      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: Math.max(1, sheet.rowCount), column: columns.length },
      };
      const bytes = await workbook.xlsx.writeBuffer();
      return new Response(new Uint8Array(bytes), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": "attachment; filename=meus-pagamentos.xlsx",
          "Cache-Control": "private, no-store",
        },
      });
    }
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(
              "\uFEFF" + csvRow(columns.map((key) => headers[key])),
            ),
          );
          let page = first;
          while (true) {
            page.rows.forEach((p: any) =>
              controller.enqueue(
                encoder.encode(
                  csvRow(
                    columns.map((c) =>
                      c.endsWith("_cents")
                        ? Number(value(p, c)).toFixed(2)
                        : value(p, c),
                    ),
                  ),
                ),
              ),
            );
            if (page.page * page.size >= page.total) break;
            page = await studentPaymentPage(userId, {
              status,
              page: String(page.page + 1),
            });
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=meus-pagamentos.csv",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
