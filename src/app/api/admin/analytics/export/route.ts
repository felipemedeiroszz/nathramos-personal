import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsReport } from "@/services/AnalyticsService";
import { AccessError } from "@/lib/auth/platform";
import { analyticsCopy } from "@/lib/analytics/copy";
import { AuditLogService } from "@/services/AuditLogService";
import { ZodError } from "zod";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const locale = params.locale === "en-US" ? "en-US" : "pt-BR";
  const t = analyticsCopy(locale);
  if (!["pdf", "xlsx"].includes(params.format))
    return NextResponse.json(
      {
        error:
          locale === "en-US"
            ? "Invalid export format."
            : "Formato de exportação inválido.",
      },
      { status: 400 },
    );
  try {
    const { report, actor } = await getAnalyticsReport(
      { ...params, page: "1" },
      params.format === "xlsx" ? 5000 : 25,
    );
    if (
      params.format === "xlsx" &&
      report.details.total > report.students.length
    )
      return NextResponse.json({ error: t.exportLimit }, { status: 422 });
    const { buildAnalyticsPdf, buildAnalyticsWorkbook } = await import(
      "@/lib/analytics/export"
    );
    const buffer =
      params.format === "pdf"
        ? await buildAnalyticsPdf(report, locale)
        : await buildAnalyticsWorkbook(report, locale);
    await AuditLogService.log({
      adminId: actor.userId,
      action: "analytics.export",
      entity_type: "report",
      details: {
        format: params.format,
        from: report.meta.from,
        to: report.meta.to,
        role: actor.role,
        students: report.details.total,
      },
    });
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          params.format === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="relatorio-${report.meta.from}-${report.meta.to}.${params.format}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof AccessError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    if (
      error instanceof ZodError ||
      (error instanceof Error && /período|Agrupamento/.test(error.message))
    )
      return NextResponse.json(
        {
          error:
            locale === "en-US"
              ? "Invalid report filters."
              : "Filtros de relatório inválidos.",
        },
        { status: 400 },
      );
    console.error(
      "[analytics] export failed",
      error instanceof Error ? error.name : "unknown",
    );
    return NextResponse.json({ error: t.error }, { status: 500 });
  }
}
