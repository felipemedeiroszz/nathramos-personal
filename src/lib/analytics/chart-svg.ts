import { analyticsCopy } from "./copy";
import type { AnalyticsReport } from "./model";
const escapeXml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[char]!,
  );
export function analyticsChartSvg(
  report: AnalyticsReport,
  kind: "training" | "revenue",
  locale: string,
  width = 1400,
  height = 430,
) {
  const t = analyticsCopy(locale),
    rows = report.trend,
    left = 80,
    right = 30,
    top = 40,
    bottom = 70,
    w = width - left - right,
    h = height - top - bottom;
  const series =
    kind === "training"
      ? [
          { key: "completed" as const, label: t.completed, color: "#b48d00" },
          {
            key: "new_students" as const,
            label: t.newStudents,
            color: "#0284c7",
          },
        ]
      : [
          {
            key: "revenue_cents" as const,
            label: t.revenue + " (" + report.meta.currency + ")",
            color: "#059669",
          },
        ];
  const value = (
    row: (typeof rows)[number],
    key: (typeof series)[number]["key"],
  ) => Number(row[key] || 0) / (key === "revenue_cents" ? 100 : 1);
  const rawMax = Math.max(
    1,
    ...rows.flatMap((row) => series.map((s) => value(row, s.key))),
  );
  const max =
    kind === "training" ? Math.max(4, Math.ceil(rawMax / 4) * 4) : rawMax;
  const x = (index: number) =>
      left + (rows.length > 1 ? (index / (rows.length - 1)) * w : w / 2),
    y = (amount: number) => top + h - (amount / max) * h;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="white"/><g font-family="Arial, sans-serif" fill="#475569" font-size="22">`;
  for (let i = 0; i < 5; i++) {
    const amount = (max * i) / 4,
      cy = y(amount);
    svg += `<line x1="${left}" y1="${cy}" x2="${width - right}" y2="${cy}" stroke="#e2e8f0"/><text x="${left - 12}" y="${cy + 6}" text-anchor="end">${escapeXml(new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(kind === "training" ? Math.round(amount) : amount))}</text>`;
  }
  for (let i = 0; i < rows.length; i++)
    if (
      i === 0 ||
      i === rows.length - 1 ||
      i % Math.max(1, Math.ceil(rows.length / 8)) === 0
    ) {
      const label = new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "short",
        timeZone: "UTC",
      }).format(new Date(rows[i].key + "T12:00Z"));
      svg += `<text x="${x(i)}" y="${top + h + 30}" text-anchor="${i === rows.length - 1 ? "end" : i === 0 ? "start" : "middle"}">${escapeXml(label)}</text>`;
    }
  series.forEach((s, index) => {
    const points = rows
      .map((row, i) => `${x(i)},${y(value(row, s.key))}`)
      .join(" ");
    svg += `<polyline points="${points}" fill="none" stroke="${s.color}" stroke-width="4" stroke-linejoin="round"/>`;
    if (rows.length === 1)
      svg += `<circle cx="${x(0)}" cy="${y(value(rows[0], s.key))}" r="5" fill="${s.color}"/>`;
    svg += `<circle cx="${left + index * 470}" cy="${height - 16}" r="5" fill="${s.color}"/><text x="${left + 13 + index * 470}" y="${height - 10}">${escapeXml(s.label)}</text>`;
  });
  return svg + "</g></svg>";
}
