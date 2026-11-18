import { parseDietWrittenPlan } from "@/lib/diet-written-plan";
export function DietWrittenPlan({
  text,
  locale,
}: {
  text: string;
  locale: string;
}) {
  const en = locale === "en-US";
  return (
    <div className="grid min-w-0 gap-3">
      {parseDietWrittenPlan(text).map((section, index) => (
        <section
          key={index}
          className={`min-w-0 rounded-xl border p-4 ${section.kind === "meal" ? "border-white/[0.08] bg-white/[0.02]" : "border-yellow-400/15 bg-yellow-400/[0.03]"}`}
        >
          <h3 className="mb-3 text-sm font-semibold text-text">
            {section.title || (en ? "Guidance" : "Orientações")}
          </h3>
          {section.kind === "meal" ? (
            <ul className="space-y-2">
              {section.lines.map((line, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 break-words text-sm text-text-secondary"
                >
                  <span
                    aria-hidden="true"
                    className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary"
                  />
                  <span className="min-w-0 whitespace-pre-wrap break-words">
                    {line}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-3 text-sm leading-relaxed text-text-secondary">
              {section.lines.map((line, i) => (
                <p key={i} className="whitespace-pre-wrap break-words">
                  {line}
                </p>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
