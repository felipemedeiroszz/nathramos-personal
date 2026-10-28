import "server-only";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { analyticsCopy, analyticsValueLabel } from "./copy";
import { analyticsChartSvg } from "./chart-svg";
import { ratio, type AnalyticsReport } from "./model";
async function chart(
  report: AnalyticsReport,
  kind: "training" | "revenue",
  locale: string,
) {
  return sharp(Buffer.from(analyticsChartSvg(report, kind, locale)))
    .png()
    .toBuffer();
}
function formats(report: AnalyticsReport, locale: string) {
  return {
    money: (value: number) =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: report.meta.currency,
      }).format(value / 100),
    number: (value: number) =>
      new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value),
    date: (value: string | null) =>
      value
        ? new Intl.DateTimeFormat(locale, {
            dateStyle: "short",
            timeZone: report.meta.timezone,
          }).format(new Date(value.length === 10 ? value + "T12:00Z" : value))
        : "—",
  };
}
function filterLines(report: AnalyticsReport, locale: string) {
  const t = analyticsCopy(locale);
  const coach =
    report.options.coaches.find((c) => c.id === report.meta.coach_id)?.name ||
    report.meta.coach_id ||
    t.all;
  const plan = report.options.plans.find((p) => p.id === report.meta.plan_id);
  return [
    `${t.period}: ${report.meta.from} / ${report.meta.to}`,
    `${t.previousPeriod}: ${report.meta.previous_from} / ${report.meta.previous_to}`,
    `${t.scope}: ${report.meta.role === "admin" ? t.platform : t.portfolio} · ${t.coach}: ${coach}`,
    `${t.search}: ${report.meta.search || t.all}`,
    ...(report.financial
      ? [
          `${t.currency}: ${report.meta.currency} · ${t.plan}: ${plan ? (locale === "en-US" ? plan.name_en : plan.name_pt) : t.all} · ${t.provider}: ${report.meta.provider || t.all}`,
        ]
      : []),
    `${t.updated}: ${new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short", timeZone: report.meta.timezone }).format(new Date(report.meta.generated_at))} (${report.meta.timezone})`,
  ];
}
export async function buildAnalyticsWorkbook(
  report: AnalyticsReport,
  locale: string,
): Promise<Buffer> {
  const t = analyticsCopy(locale),
    fmt = formats(report, locale),
    workbook = new ExcelJS.Workbook();
  workbook.creator = "Nath Ramos";
  workbook.created = new Date(report.meta.generated_at);
  workbook.calcProperties.fullCalcOnLoad = true;
  const moneyFormat =
    report.meta.currency === "BRL"
      ? '"R$" #,##0.00;[Red]-"R$" #,##0.00'
      : '"US$" #,##0.00;[Red]-"US$" #,##0.00';
  function sheet(name: string) {
    return workbook.addWorksheet(name, {
      views: [{ state: "frozen", ySplit: 1, showGridLines: false }],
      properties: { defaultRowHeight: 22 },
      pageSetup: {
        paperSize: 9,
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      },
      headerFooter: { oddFooter: "&L" + t.title + "&R&P / &N" },
    });
  }
  function table(
    name: string,
    headers: string[],
    rows: (string | number | boolean | Date | null)[][],
    widths: number[],
  ) {
    const ws = sheet(name);
    ws.columns = widths.map((width) => ({ width }));
    ws.addRow(headers);
    rows.forEach((row) => ws.addRow(row));
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(1, rows.length + 1), column: headers.length },
    };
    ws.getRow(1).height = 34;
    ws.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF172033" },
      };
      cell.alignment = { vertical: "middle", wrapText: true };
    });
    ws.eachRow((row, n) => {
      if (n > 1) {
        row.font = { name: "Arial", size: 10 };
        row.alignment = { vertical: "middle", wrapText: true };
        if (n % 2 === 0)
          row.eachCell((cell) => {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF1F5F9" },
            };
          });
      }
    });
    return ws;
  }
  const summary = sheet(t.summary);
  summary.views = [{ showGridLines: false }];
  summary.columns = Array.from({ length: 8 }, () => ({ width: 15 }));
  summary.mergeCells("A1:H2");
  summary.getCell("A1").value = t.title;
  summary.getCell("A1").font = {
    name: "Arial",
    size: 23,
    bold: true,
    color: { argb: "FF172033" },
  };
  summary.getCell("A1").alignment = { vertical: "middle" };
  const lines = filterLines(report, locale);
  lines.forEach((line, i) => {
    summary.mergeCells(i + 4, 1, i + 4, 8);
    summary.getCell(i + 4, 1).value = line;
    summary.getCell(i + 4, 1).font = { size: 10, color: { argb: "FF475569" } };
    summary.getCell(i + 4, 1).alignment = {
      wrapText: true,
      vertical: "middle",
    };
    summary.getRow(i + 4).height = Math.max(
      22,
      Math.ceil(line.length / 135) * 16,
    );
  });
  const metrics: [string, number | string, string?][] = [
    [t.students, report.summary.students],
    [t.newStudents, report.summary.new_students],
    [
      t.newStudents + " (" + t.previousPeriod.toLowerCase() + ")",
      report.summary.previous_new_students,
    ],
    [t.completed, report.summary.completed_sessions],
    [
      t.completed + " (" + t.previousPeriod.toLowerCase() + ")",
      report.summary.previous_completed_sessions,
    ],
    [t.active, report.summary.active_students],
    [t.minutes, report.summary.minutes],
    [t.started, report.summary.started_sessions],
    [t.cohortCompleted, report.summary.cohort_completed],
    [
      t.completion,
      ratio(
        report.summary.cohort_completed,
        report.summary.started_sessions,
      ) === null
        ? t.none
        : ratio(
            report.summary.cohort_completed,
            report.summary.started_sessions,
          )! / 100,
      "percent",
    ],
    [t.workout, report.summary.workout_coverage],
    [t.diet, report.summary.diet_coverage],
    [t.exams, report.summary.exams_pending],
    [t.chats, report.summary.unread_conversations],
    [t.meetings, report.summary.upcoming_meetings],
  ];
  if (report.financial)
    metrics.push(
      [t.revenue, report.financial.paid_cents / 100, "money"],
      [
        t.revenue + " (" + t.previousPeriod.toLowerCase() + ")",
        report.financial.previous_paid_cents / 100,
        "money",
      ],
      [
        t.ticket,
        report.financial.paid_count
          ? report.financial.paid_cents / report.financial.paid_count / 100
          : t.none,
        "money",
      ],
      [t.mrr, report.financial.mrr_cents / 100, "money"],
      [t.failed, report.financial.failed_count],
      [t.pending, report.financial.pending_count],
      [t.refunds, report.financial.refund_count],
      [t.refunds + " (" + report.meta.currency + ")", (report.financial.refunded_cents || 0) / 100, "money"],
    );
  metrics.forEach(([label, value, format], i) => {
    const row = i + 12;
    summary.mergeCells(row, 1, row, 4);
    summary.getCell(row, 1).value = label;
    summary.getCell(row, 1).font = {
      name: "Arial",
      size: 11,
      color: { argb: "FF475569" },
    };
    summary.mergeCells(row, 5, row, 8);
    const cell = summary.getCell(row, 5);
    cell.value = value;
    cell.font = {
      name: "Arial",
      size: 12,
      bold: true,
      color: { argb: "FF172033" },
    };
    cell.numFmt =
      format === "money"
        ? moneyFormat
        : format === "percent"
          ? "0.0%"
          : "#,##0";
    summary.getRow(row).height = 25;
  });
  const chartRow = 12 + metrics.length + 2;
  summary.mergeCells(chartRow, 1, chartRow, 8);
  summary.getCell(chartRow, 1).value = t.training;
  summary.getCell(chartRow, 1).font = { bold: true, size: 14 };
  summary.addImage(
    workbook.addImage({
      buffer: (await chart(report, "training", locale)) as any,
      extension: "png",
    }),
    { tl: { col: 0, row: chartRow }, ext: { width: 850, height: 260 } },
  );
  if (report.financial) {
    const row = chartRow + 15;
    summary.mergeCells(row, 1, row, 8);
    summary.getCell(row, 1).value =
      t.revenueTrend + " (" + report.meta.currency + ")";
    summary.getCell(row, 1).font = { bold: true, size: 14 };
    summary.addImage(
      workbook.addImage({
        buffer: (await chart(report, "revenue", locale)) as any,
        extension: "png",
      }),
      { tl: { col: 0, row }, ext: { width: 850, height: 260 } },
    );
  }
  summary.pageSetup.printArea = `A1:H${chartRow + (report.financial ? 30 : 15)}`;
  const evolution = table(
    t.evolution,
    [
      t.period,
      t.completed,
      t.newStudents,
      ...(report.financial
        ? [t.revenue + " (" + report.meta.currency + ")"]
        : []),
    ],
    report.trend.map((row) => [
      new Date(row.key + "T12:00Z"),
      row.completed,
      row.new_students,
      ...(report.financial ? [(row.revenue_cents || 0) / 100] : []),
    ]),
    [20, 24, 24, 25],
  );
  evolution.getColumn(1).numFmt = "yyyy-mm-dd";
  if (report.financial) evolution.getColumn(4).numFmt = moneyFormat;
  const totalRow = evolution.addRow([locale === "en-US" ? "Total" : "Total"]);
  totalRow.font = { bold: true };
  for (let column = 2; column <= (report.financial ? 4 : 3); column++) {
    const letter = evolution.getColumn(column).letter;
    const total = report.trend.reduce(
      (sum, row) =>
        sum +
        (column === 2
          ? row.completed
          : column === 3
            ? row.new_students
            : (row.revenue_cents || 0) / 100),
      0,
    );
    totalRow.getCell(column).value = {
      formula: `SUM(${letter}2:${letter}${report.trend.length + 1})`,
      result: total,
    };
  }
  if (report.financial) {
    const index = metrics.findIndex(([label]) => label === t.revenue);
    summary.getCell(index + 12, 5).value = {
      formula: `'${t.evolution}'!D${totalRow.number}`,
      result: report.financial.paid_cents / 100,
    };
  }
  const students = table(
    t.snapshot,
    [
      t.name,
      t.responsible,
      t.completed,
      t.minutes,
      t.last + " (UTC)",
      t.workout,
      t.diet,
      t.pendingExams,
      t.chats,
    ],
    report.students.map((row) => [
      row.name,
      row.coach_name || "",
      row.completed,
      row.minutes,
      row.last_workout ? new Date(row.last_workout) : null,
      row.workout ? t.yes : t.no,
      row.diet ? t.yes : t.no,
      row.pending_exams,
      row.unread,
    ]),
    [32, 28, 18, 16, 24, 18, 18, 20, 24],
  );
  students.getColumn(5).numFmt = "yyyy-mm-dd hh:mm";
  students.getRow(1).height = 44;
  students.eachRow((row, index) => {
    if (index > 1)
      row.height = Math.max(
        26,
        Math.ceil(
          Math.max(
            String(row.getCell(1).value || "").length / 30,
            String(row.getCell(2).value || "").length / 26,
          ),
        ) *
          15 +
          10,
      );
  });
  if (report.financial) {
    table(
      t.statuses.slice(0, 31),
      [t.status, t.count],
      report.financial.statuses.map((row) => [
        analyticsValueLabel(row.name, locale),
        row.value,
      ]),
      [36, 20],
    );
    const methods = table(
      t.methods.slice(0, 31),
      [t.method, t.count, t.revenue + " (" + report.meta.currency + ")"],
      report.financial.methods.map((row) => [
        analyticsValueLabel(row.name, locale),
        row.value,
        row.cents / 100,
      ]),
      [32, 20, 30],
    );
    methods.getColumn(3).numFmt = moneyFormat;
    const plans = table(
      t.topPlans.slice(0, 31),
      [t.plan, t.count, t.revenue + " (" + report.meta.currency + ")"],
      report.financial.plans.map((row) => [
        locale === "en-US" ? row.name_en : row.name_pt,
        row.payments,
        row.cents / 100,
      ]),
      [46, 20, 30],
    );
    plans.getColumn(3).numFmt = moneyFormat;
  }
  const notes = table(
    t.notes,
    [t.notes, t.amount],
    [
      ...lines.map((line, i) => [String(i + 1), line] as [string, string]),
      [t.period, t.periodNote],
      [t.coverage, t.coverageNote],
      [t.completion, t.completionNote],
      ...(report.financial
        ? [[t.finance, t.financeNote] as [string, string]]
        : []),
      [t.snapshot, `${report.students.length} / ${report.details.total}`],
      [
        t.recorded,
        locale === "en-US"
          ? "Snapshot report. Charts are embedded images. Regenerate to reflect changes. Dates in the student sheet use UTC."
          : "Relatório de snapshot. Gráficos são imagens incorporadas. Gere novamente para refletir alterações. Datas na aba de alunos usam UTC.",
      ],
    ],
    [32, 110],
  );
  notes.eachRow((row, n) => {
    if (n > 1)
      row.height = Math.max(
        34,
        Math.ceil(String(row.getCell(2).value || "").length / 100) * 15 + 12,
      );
  });
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
export async function buildAnalyticsPdf(
  report: AnalyticsReport,
  locale: string,
): Promise<Buffer> {
  const t = analyticsCopy(locale),
    fmt = formats(report, locale),
    training = await chart(report, "training", locale),
    revenue = report.financial ? await chart(report, "revenue", locale) : null;
  const font = await readFile(
    path.join(process.cwd(), "public/report-fonts/Inter.ttf"),
  );
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 42, bottom: 48, left: 42, right: 42 },
    bufferPages: true,
    info: {
      Title: t.title,
      Author: "Nath Ramos",
      Subject: report.meta.from + " / " + report.meta.to,
    },
  });
  const chunks: Buffer[] = [];
  const output = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  doc.registerFont("Report", font);
  doc.font("Report");
  const width = doc.page.width - 84;
  doc.on("pageAdded", () => {
    doc
      .font("Report")
      .fontSize(8)
      .fillColor("#64748b")
      .text("NATH RAMOS / " + t.title, 42, 26, { width });
    doc.x = 42;
    doc.y = 50;
  });
  const next = () => {
    doc.addPage();
  };
  function section(title: string, height = 35) {
    if (doc.y + height > doc.page.height - 55) next();
    doc
      .moveDown(0.7)
      .fontSize(13)
      .fillColor("#172033")
      .text(title, 42, doc.y, { width });
    doc.moveDown(0.4);
  }
  function paragraph(text: string) {
    doc.fontSize(9);
    if (
      doc.y + doc.heightOfString(text, { width, lineGap: 3 }) + 10 >
      doc.page.height - 55
    )
      next();
    doc
      .fontSize(9)
      .fillColor("#475569")
      .text(text, 42, doc.y, { width, lineGap: 3 });
    doc.moveDown(0.5);
  }
  function image(title: string, buffer: Buffer) {
    section(title, 205);
    const y = doc.y;
    doc.image(buffer, 42, y, { width, height: (width * 430) / 1400 });
    doc.y = y + (width * 430) / 1400 + 12;
  }
  function table(headers: string[], rows: string[][], widths: number[]) {
    if (!rows.length) {
      paragraph(t.empty);
      return;
    }
    const header = () => {
      doc.fontSize(8);
      const height = Math.max(
        28,
        ...headers.map(
          (value, i) =>
            doc.heightOfString(value, { width: widths[i] - 12 }) + 16,
        ),
      );
      if (doc.y + height + 30 > doc.page.height - 55) next();
      const y = doc.y;
      doc.rect(42, y, width, height).fill("#172033");
      let x = 42;
      headers.forEach((value, i) => {
        doc
          .fillColor("white")
          .text(value, x + 6, y + 8, { width: widths[i] - 12 });
        x += widths[i];
      });
      doc.y = y + height;
    };
    header();
    rows.forEach((row, index) => {
      doc.fontSize(8);
      const height = Math.max(
        29,
        ...row.map(
          (value, i) =>
            doc.heightOfString(value, { width: widths[i] - 12 }) + 14,
        ),
      );
      if (doc.y + height > doc.page.height - 55) {
        next();
        header();
      }
      const y = doc.y;
      if (index % 2 === 0) doc.rect(42, y, width, height).fill("#f1f5f9");
      let x = 42;
      row.forEach((value, i) => {
        doc
          .fillColor("#172033")
          .text(value, x + 6, y + 7, { width: widths[i] - 12 });
        x += widths[i];
      });
      doc.y = y + height;
    });
    doc.y += 10;
  }
  doc
    .fontSize(9)
    .fillColor("#8c6b00")
    .text("NATH RAMOS  /  " + t.recorded.toUpperCase());
  doc.moveDown(0.5).fontSize(25).fillColor("#172033").text(t.title);
  doc.moveDown(0.7);
  filterLines(report, locale).forEach((line) => {
    doc.fontSize(8).fillColor("#475569").text(line, { width, lineGap: 2 });
  });
  doc.moveDown(1);
  const metrics: [
    [string, string],
    [string, string],
    [string, string],
    [string, string],
    ...[string, string][],
  ] = [
    [t.students, fmt.number(report.summary.students)],
    [t.completed, fmt.number(report.summary.completed_sessions)],
    [t.active, fmt.number(report.summary.active_students)],
    [
      t.completion,
      report.summary.started_sessions
        ? fmt.number(
            ratio(
              report.summary.cohort_completed,
              report.summary.started_sessions,
            )!,
          ) + "%"
        : t.none,
    ],
  ];
  if (report.financial)
    metrics.push(
      [t.revenue, fmt.money(report.financial.paid_cents)],
      [t.mrr, fmt.money(report.financial.mrr_cents)],
    );
  let y = doc.y;
  metrics.forEach(([label, value], index) => {
    const x = 42 + (index % 2) * (width / 2 + 5);
    if (index > 0 && index % 2 === 0) y += 76;
    doc.roundedRect(x, y, width / 2 - 5, 65, 7).fill("#f1f5f9");
    doc
      .fillColor("#475569")
      .fontSize(8)
      .text(label, x + 12, y + 10, { width: width / 2 - 30 });
    doc
      .fillColor("#172033")
      .fontSize(20)
      .text(value, x + 12, y + 30, { width: width / 2 - 30, lineBreak: false });
  });
  doc.y = y + 80;
  image(t.training, training);
  section(t.coverage, 170);
  table(
    [t.prescriptions, t.count],
    [
      [
        t.workout,
        `${report.summary.workout_coverage} / ${report.summary.students}`,
      ],
      [t.diet, `${report.summary.diet_coverage} / ${report.summary.students}`],
    ],
    [width * 0.72, width * 0.28],
  );
  paragraph(
    `${t.exams}: ${report.summary.exams_pending}. ${t.chats}: ${report.summary.unread_conversations}. ${t.meetings}: ${report.summary.upcoming_meetings}.`,
  );
  if (report.financial && revenue) {
    image(t.revenueTrend + " (" + report.meta.currency + ")", revenue);
    section(t.finance, 140);
    table(
      [t.summary, t.amount],
      [
        [
          t.ticket,
          report.financial.paid_count
            ? fmt.money(
                report.financial.paid_cents / report.financial.paid_count,
              )
            : t.none,
        ],
        [
          t.revenue + " (" + t.previousPeriod.toLowerCase() + ")",
          fmt.money(report.financial.previous_paid_cents),
        ],
        [t.failed, String(report.financial.failed_count)],
        [t.pending, String(report.financial.pending_count)],
        [t.refunds, String(report.financial.refund_count)],
        [t.refunds + " (" + report.meta.currency + ")", fmt.money(report.financial.refunded_cents || 0)],
      ],
      [width * 0.65, width * 0.35],
    );
    section(t.statuses, 110);
    if (report.financial.statuses.length)
      table(
        [t.status, t.count],
        report.financial.statuses.map((row) => [
          analyticsValueLabel(row.name, locale),
          String(row.value),
        ]),
        [width * 0.7, width * 0.3],
      );
    else paragraph(t.empty);
    section(t.methods, 110);
    table(
      [t.method, t.count, t.revenue],
      report.financial.methods.map((row) => [
        analyticsValueLabel(row.name, locale),
        String(row.value),
        fmt.money(row.cents),
      ]),
      [width * 0.45, width * 0.2, width * 0.35],
    );
    section(t.topPlans, 110);
    table(
      [t.plan, t.count, t.revenue],
      report.financial.plans.map((row) => [
        locale === "en-US" ? row.name_en : row.name_pt,
        String(row.payments),
        fmt.money(row.cents),
      ]),
      [width * 0.5, width * 0.16, width * 0.34],
    );
  }
  section(t.details, 160);
  paragraph(
    `${report.students.length} ${t.of} ${report.details.total}. ${t.detailNote}`,
  );
  table(
    [t.name, t.sessions, t.minutes, t.workout, t.diet],
    [...report.students.slice(0, 25)].map((row) => [
      row.name,
      String(row.completed),
      String(row.minutes),
      row.workout ? t.yes : t.no,
      row.diet ? t.yes : t.no,
    ]),
    [width * 0.4, width * 0.14, width * 0.14, width * 0.16, width * 0.16],
  );
  section(t.definitions, 300);
  [
    t.periodNote,
    t.coverageNote,
    t.completionNote,
    ...(report.financial ? [t.financeNote] : []),
  ].forEach(paragraph);
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc
      .fontSize(8)
      .fillColor("#64748b")
      .text(
        `${report.meta.from} / ${report.meta.to}`,
        42,
        doc.page.height - 28,
        { lineBreak: false },
      );
    doc.text(
      `${i + 1} / ${range.count}`,
      doc.page.width - 90,
      doc.page.height - 28,
      { width: 48, align: "right", lineBreak: false },
    );
    doc.page.margins.bottom = bottom;
  }
  doc.end();
  return output;
}
