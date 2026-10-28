import { NextRequest, NextResponse } from "next/server";
import { requirePlatformUser, AccessError } from "@/lib/auth/platform";
import { getAdminDataPage, dataFilters } from "@/lib/admin/data-page";
import { csvRow } from "@/lib/admin/csv";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const actor = await requirePlatformUser();
    if (actor.role !== "admin") throw new AccessError("Acesso negado.");
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    params.currency = params.currency || "BRL";
    dataFilters(params);
    const first = await getAdminDataPage(
      "payments",
      { ...params, page: "1" },
      100,
    );
    const columns = [
      "id",
      "student_name",
      "currency",
      "amount_cents",
      "refunded_amount_cents",
      "refunded_at",
      "external_id",
      "status",
      "provider",
      "method",
      "created_at",
      "paid_at",
    ];
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode("\uFEFF" + csvRow(columns)));
          let page = first;
          while (true) {
            for (const row of page.rows)
              controller.enqueue(
                encoder.encode(csvRow(columns.map((col) => row[col]))),
              );
            if (page.page * page.size >= page.total) break;
            page = await getAdminDataPage(
              "payments",
              { ...params, page: String(page.page + 1) },
              100,
              first.snapshot,
            );
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
        "Content-Disposition": `attachment; filename="payments-${params.currency}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof AccessError
            ? error.message
            : "Não foi possível exportar os pagamentos.",
      },
      { status: error instanceof AccessError ? error.status : 400 },
    );
  }
}
