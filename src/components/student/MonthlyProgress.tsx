"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  CalendarDays,
  Check,
  ArrowRight,
  LockKeyhole,
  Scale,
  RefreshCw,
} from "lucide-react";
import {
  progressAngles,
  progressPhotoUrl,
  type ProgressAngle,
  type MonthlySnapshot,
} from "@/lib/monthly-progress";
import "./monthly-progress.css";
import { MonthlyPhotoCompare } from "./MonthlyPhotoCompare";
const labels: Record<ProgressAngle, [string, string]> = {
  front: ["Frente", "Front"],
  back: ["Costas", "Back"],
  left: ["Lado esquerdo", "Left side"],
  right: ["Lado direito", "Right side"],
};
async function api(options?: RequestInit) {
  const r = await fetch("/api/student/monthly-progress", {
    ...options,
    cache: "no-store",
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error || "Registro indisponível.");
  return data;
}
export function MonthlyProgress({ locale }: { locale: string }) {
  const en = locale === "en-US",
    t = (pt: string, eng: string) => (en ? eng : pt);
  const [compareMode, setCompareMode] = useState<"slider" | "side">("slider");
  const [snapshot, setSnapshot] = useState<MonthlySnapshot | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState<ProgressAngle | null>(null);
  const [weight, setWeight] = useState(""),
    [photos, setPhotos] = useState<Partial<Record<ProgressAngle, string>>>({}),
    [previews, setPreviews] = useState<Partial<Record<ProgressAngle, string>>>(
      {},
    );
  const urls = useRef(new Map<ProgressAngle, string>());
  const [before, setBefore] = useState(""),
    [after, setAfter] = useState(""),
    [angle, setAngle] = useState<ProgressAngle>("front");
  const monthName = (month: string) =>
    new Intl.DateTimeFormat(locale, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(month + "T12:00:00Z"));
  const dateName = (date: string) =>
    new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(date + "T12:00:00Z"));
  const apply = useCallback((data: MonthlySnapshot) => {
    setSnapshot(data);
    const record = data.records.find((r) => r.month === data.month);
    setWeight(record ? String(record.weight_kg) : "");
    setPhotos(record?.photos || {});
    setPreviews({});
    setBefore((previous) => previous || data.records[1]?.month || "");
    setAfter((previous) => previous || data.records[0]?.month || "");
  }, []);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      apply(await api());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [apply]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const entries = urls.current;
    return () => {
      for (const url of entries.values()) URL.revokeObjectURL(url);
    };
  }, []);
  async function upload(position: ProgressAngle, file: File) {
    setError("");
    setNotice("");
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 4 * 1024 * 1024
    ) {
      setError(
        t(
          "Escolha JPG, PNG ou WebP de até 4 MB.",
          "Choose JPG, PNG or WebP up to 4 MB.",
        ),
      );
      return;
    }
    if (!snapshot) return;
    setUploading(position);
    const local = URL.createObjectURL(file);
    const old = urls.current.get(position);
    if (old) URL.revokeObjectURL(old);
    urls.current.set(position, local);
    setPreviews((previous) => ({ ...previous, [position]: local }));
    try {
      const form = new FormData();
      form.set("month", snapshot.month);
      form.set("angle", position);
      form.set("file", file);
      const data = await api({ method: "POST", body: form });
      setPhotos((previous) => ({ ...previous, [position]: data.path }));
    } catch (e) {
      setError((e as Error).message);
      setPreviews((previous) => {
        const next = { ...previous };
        delete next[position];
        return next;
      });
      URL.revokeObjectURL(local);
      urls.current.delete(position);
    } finally {
      setUploading(null);
    }
  }
  async function save() {
    if (!snapshot) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const current = snapshot.records.find((r) => r.month === snapshot.month);
      const data = await api({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: snapshot.month,
          weight_kg: Number(weight.replace(",", ".")),
          photos,
          version: current?.version || 0,
        }),
      });
      apply(data);
      for (const url of urls.current.values()) URL.revokeObjectURL(url);
      urls.current.clear();
      setAfter(data.month);
      setNotice(
        t(
          "Evolução mensal salva. Suas quatro fotos e seu peso estão no histórico.",
          "Monthly progress saved. Your four photos and weight are in your history.",
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const current = snapshot?.records.find((r) => r.month === snapshot.month);
  const count = progressAngles.filter((a) => photos[a]).length;
  const left = snapshot?.records.find((r) => r.month === before),
    right = snapshot?.records.find((r) => r.month === after);
  const number = (value: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
  return (
    <section
      className="monthly-progress"
      aria-label={t("Evolução mensal", "Monthly progress")}
    >
      <header className="monthly-heading">
        <div>
          <span className="monthly-eyebrow">
            <CalendarDays size={15} />
            {t("UM REGISTRO. TODO MÊS.", "ONE CHECK-IN. EVERY MONTH.")}
          </span>
          <h2>
            {t("Sua evolução, mês a mês", "Your progress, month by month")}
          </h2>
          <p>
            {t(
              "Comece hoje: registre seu peso e quatro fotos, uma vez por mês. Compare a mesma perspectiva e acompanhe sua jornada.",
              "Start today: record your weight and four photos once a month. Compare matching views and follow your journey.",
            )}
          </p>
        </div>
        <span className="monthly-private">
          <LockKeyhole size={13} />
          {t("Fotos privadas", "Private photos")}
        </span>
      </header>
      {loading && !snapshot && (
        <p role="status" className="monthly-status">
          {t("Carregando sua evolução…", "Loading your progress…")}
        </p>
      )}
      {snapshot && (
        <>
          <div className={`monthly-due ${current ? "is-complete" : ""}`}>
            <div>
              {current ? <Check size={22} /> : <CalendarDays size={22} />}
              <span>
                <strong>{monthName(snapshot.month)}</strong>
                <small>
                  {current
                    ? t(
                        "Registro concluído. Você pode corrigir durante este mês.",
                        "Check-in completed. You can make corrections this month.",
                      )
                    : t(
                        "Você já pode registrar agora, mesmo começando no meio do mês. Envie o peso e as quatro fotos.",
                        "You can check in now, even if you joined mid-month. Add your weight and four photos.",
                      )}
                </small>
              </span>
            </div>
            <span>
              {current ? t("Concluído", "Completed") : t("Pendente", "Pending")}
            </span>
          </div>
          <div className="monthly-entry">
            <div className="monthly-entry-top">
              <h3>
                {current
                  ? t("Seu registro do mês", "Your monthly check-in")
                  : t(
                      "Vamos registrar este mês?",
                      "Ready for this month’s check-in?",
                    )}
              </h3>
              <label className="monthly-weight">
                <Scale size={18} />
                <span>{t("Peso atual", "Current weight")}</span>
                <input
                  inputMode="decimal"
                  aria-label={t(
                    "Peso mensal em quilos",
                    "Monthly weight in kilograms",
                  )}
                  value={weight}
                  disabled={busy || !!uploading}
                  placeholder="0,00"
                  onChange={(e) => setWeight(e.target.value)}
                  maxLength={7}
                />
                <span>kg</span>
              </label>
            </div>
            <div className="monthly-photo-grid">
              {progressAngles.map((position) => {
                const src =
                  previews[position] ||
                  (photos[position]
                    ? progressPhotoUrl(photos[position]!)
                    : null);
                return (
                  <label
                    className={`monthly-photo ${photos[position] ? "has-photo" : ""}`}
                    key={position}
                  >
                    <span className="monthly-photo-title">
                      <span>{labels[position][en ? 1 : 0]}</span>
                      {photos[position] && <Check size={14} />}
                    </span>
                    <div className="monthly-photo-frame">
                      {src ? (
                        <img
                          src={src}
                          alt={labels[position][en ? 1 : 0]}
                          width={450}
                          height={600}
                        />
                      ) : (
                        <>
                          <Camera size={29} />
                          <span>{t("Adicionar foto", "Add photo")}</span>
                        </>
                      )}
                      {uploading === position && (
                        <span className="monthly-uploading">
                          {t("Enviando…", "Uploading…")}
                        </span>
                      )}
                    </div>
                    <span className="monthly-photo-action">
                      {src
                        ? t("Trocar foto", "Change photo")
                        : t("Escolher foto", "Choose photo")}{" "}
                      <Camera size={13} />
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      aria-label={
                        t("Foto: ", "Photo: ") + labels[position][en ? 1 : 0]
                      }
                      disabled={busy || !!uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void upload(position, file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                );
              })}
            </div>
            <div className="monthly-entry-bottom">
              <p>
                {t(
                  "Use a mesma luz, distância e postura a cada mês. JPG, PNG ou WebP de até 4 MB por foto.",
                  "Use similar lighting, distance and posture each month. JPG, PNG or WebP up to 4 MB per photo.",
                )}{" "}
                <strong>
                  {count}/4 {t("fotos", "photos")}
                </strong>
              </p>
              <button
                type="button"
                className="monthly-primary"
                disabled={
                  busy ||
                  !!uploading ||
                  count !== 4 ||
                  !weight ||
                  Number(weight.replace(",", ".")) < 20 ||
                  Number(weight.replace(",", ".")) > 500 ||
                  !Number.isFinite(Number(weight.replace(",", ".")))
                }
                onClick={() => void save()}
              >
                {busy
                  ? t("Salvando…", "Saving…")
                  : current
                    ? t("Atualizar registro", "Update check-in")
                    : t("Salvar evolução do mês", "Save monthly progress")}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
          <div className="monthly-comparison">
            <div className="monthly-comparison-heading">
              <div>
                <span className="monthly-eyebrow">
                  {t(
                    "CADA MÊS CONTA UMA HISTÓRIA",
                    "EVERY MONTH TELLS A STORY",
                  )}
                </span>
                <h3>
                  {t(
                    "Veja o caminho que você percorreu",
                    "See how far you have come",
                  )}
                </h3>
              </div>
              <span className="monthly-count">
                {snapshot.records.length}{" "}
                {t("meses registrados", "months recorded")}
              </span>
            </div>
            {snapshot.records.length >= 2 ? (
              <>
                <div className="monthly-selectors">
                  <label>
                    {t("Primeiro mês", "First month")}
                    <select
                      aria-label={t("Primeiro mês", "First month")}
                      value={before}
                      onChange={(e) => setBefore(e.target.value)}
                    >
                      {snapshot.records.map((record) => (
                        <option key={record.month} value={record.month}>
                          {monthName(record.month)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <ArrowRight size={18} />
                  <label>
                    {t("Segundo mês", "Second month")}
                    <select
                      aria-label={t("Segundo mês", "Second month")}
                      value={after}
                      onChange={(e) => setAfter(e.target.value)}
                    >
                      {snapshot.records.map((record) => (
                        <option key={record.month} value={record.month}>
                          {monthName(record.month)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div
                  className="monthly-angle-tabs"
                  aria-label={t("Ângulo da comparação", "Comparison view")}
                >
                  {progressAngles.map((position) => (
                    <button
                      type="button"
                      key={position}
                      aria-pressed={angle === position}
                      onClick={() => setAngle(position)}
                    >
                      {labels[position][en ? 1 : 0]}
                    </button>
                  ))}
                </div>
                {left && right && before !== after ? (
                  <>
                    <div
                      className="monthly-compare-mode"
                      aria-label={t("Modo de comparação", "Comparison mode")}
                    >
                      <button
                        type="button"
                        aria-pressed={compareMode === "slider"}
                        onClick={() => setCompareMode("slider")}
                      >
                        {t("Deslizar fotos", "Slide photos")}
                      </button>
                      <button
                        type="button"
                        aria-pressed={compareMode === "side"}
                        onClick={() => setCompareMode("side")}
                      >
                        {t("Lado a lado", "Side by side")}
                      </button>
                    </div>
                    {compareMode === "slider" ? (
                      <MonthlyPhotoCompare
                        key={left.photos[angle] + right.photos[angle]}
                        locale={locale}
                        first={{
                          src: progressPhotoUrl(left.photos[angle]),
                          label: monthName(left.month),
                          weight: number(Number(left.weight_kg)) + " kg",
                        }}
                        second={{
                          src: progressPhotoUrl(right.photos[angle]),
                          label: monthName(right.month),
                          weight: number(Number(right.weight_kg)) + " kg",
                        }}
                      />
                    ) : (
                      <div className="monthly-compare-photos">
                        {[left, right].map((record, index) => (
                          <figure key={index}>
                            <figcaption>
                              <span>{monthName(record.month)}</span>
                              <strong>
                                {number(Number(record.weight_kg))} kg
                              </strong>
                            </figcaption>
                            <img
                              src={progressPhotoUrl(record.photos[angle])}
                              alt={`${labels[angle][en ? 1 : 0]} · ${monthName(record.month)}`}
                              width={600}
                              height={800}
                              loading="lazy"
                            />
                          </figure>
                        ))}
                      </div>
                    )}
                    <p className="monthly-weight-difference">
                      {t(
                        "Variação de peso entre os meses selecionados:",
                        "Weight change between the selected months:",
                      )}{" "}
                      <strong>
                        {Number(right.weight_kg) - Number(left.weight_kg) > 0
                          ? "+"
                          : ""}
                        {number(
                          Number(right.weight_kg) - Number(left.weight_kg),
                        )}{" "}
                        kg
                      </strong>
                    </p>
                  </>
                ) : (
                  <p className="monthly-status">
                    {t(
                      "Escolha dois meses diferentes para comparar.",
                      "Choose two different months to compare.",
                    )}
                  </p>
                )}
              </>
            ) : (
              <div className="monthly-empty">
                <CalendarDays size={30} />
                <h4>
                  {snapshot.records.length
                    ? t(
                        "Seu primeiro capítulo já está salvo",
                        "Your first chapter is saved",
                      )
                    : t(
                        "Seu primeiro registro começa aqui",
                        "Your first check-in starts here",
                      )}
                </h4>
                <p>
                  {snapshot.records.length
                    ? t(
                        "No próximo mês, envie um novo conjunto de fotos e peso. A comparação aparecerá aqui.",
                        "Next month, add your new photos and weight. Your comparison will appear here.",
                      )
                    : t(
                        "Preencha o peso e as quatro fotos acima. Cada mês terá seu próprio registro.",
                        "Enter your weight and four photos above. Each month will have its own check-in.",
                      )}
                </p>
              </div>
            )}
            {snapshot.records.length > 0 && (
              <div className="monthly-history">
                <h4>{t("Seus registros", "Your check-ins")}</h4>
                {snapshot.records.map((record) => (
                  <div key={record.month}>
                    <CalendarDays size={16} />
                    <span>{monthName(record.month)}</span>
                    <strong>{number(Number(record.weight_kg))} kg</strong>
                    <small>4 {t("fotos", "photos")}</small>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="monthly-next">
            {t("Próximo registro a partir de", "Next check-in available on")}{" "}
            {dateName(snapshot.next_due)}.
          </p>
        </>
      )}
      {notice && (
        <p role="status" className="monthly-success">
          {notice}
        </p>
      )}
      {error && (
        <div className="monthly-error" role="alert">
          <p>{error}</p>
          <button
            type="button"
            disabled={busy || !!uploading || loading}
            onClick={() => void load()}
          >
            <RefreshCw size={14} />
            {t("Recarregar registros", "Reload check-ins")}
          </button>
        </div>
      )}
    </section>
  );
}
