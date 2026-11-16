"use client";
import { useCallback, useState } from "react";
import { Plus, Trash2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  challengeCategories,
  challengeGoalTypes,
  challengeConfigSchema,
  type ChallengeDetail,
  type ChallengePrize,
} from "@/lib/challenges";
import {
  ChallengeUpload,
  Field,
  categoryNames,
  goalNames,
  dateInput,
  dateISO,
  defaultGoal,
  challengeSend,
} from "./shared";

export function ChallengeEditor({
  detail,
  locale,
  onSaved,
}: {
  detail: ChallengeDetail;
  locale: string;
  onSaved: () => Promise<void>;
}) {
  const en = locale === "en-US",
    t = (pt: string, english: string) => (en ? english : pt);
  const c = detail.challenge;
  const [form, setForm] = useState({
    ...c,
    goals: detail.goals.length ? detail.goals : [{ ...defaultGoal(), id: "" }],
    prizes: detail.prizes.length
      ? detail.prizes
      : [
          {
            id: "",
            placement: 1,
            name: "",
            description: "",
            image: null,
            estimated_value: null,
            notes: "",
            delivery_instructions: "",
          },
        ],
    audience: detail.audience || [],
  });
  const [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState(false);
  const [search, setSearch] = useState(""),
    [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [uploadCount, setUploadCount] = useState(0);
  const trackUpload = useCallback(
    (active: boolean) =>
      setUploadCount((count) => Math.max(0, count + (active ? 1 : -1))),
    [],
  );
  const fixed = c.status !== "draft" && Date.now() >= Date.parse(c.start_date);
  function change<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }
  function prizeCount(count: number) {
    change("winner_count", count);
    change(
      "prizes",
      Array.from(
        { length: count },
        (_, i) =>
          form.prizes[i] || {
            id: "",
            placement: i + 1,
            name: "",
            description: "",
            image: null,
            estimated_value: null,
            notes: "",
            delivery_instructions: "",
          },
      ),
    );
  }
  function prize(index: number, patch: Partial<ChallengePrize>) {
    setForm((previous) => ({
      ...previous,
      prizes: previous.prizes.map((p, i) =>
        i === index ? { ...p, ...patch } : p,
      ),
    }));
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (uploadCount) return;
    setBusy(true);
    setError("");
    try {
      const payload = challengeConfigSchema.parse(form);
      await challengeSend({
        ...payload,
        action: "save",
        challenge_id: c.id,
        version: c.version,
        reason,
      });
      await onSaved();
    } catch (error) {
      setError(
        (error as Error).name === "ZodError"
          ? t(
              "Confira os campos e complete todas as metas e prêmios.",
              "Check all fields, goals and prizes.",
            )
          : (error as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  async function findStudents() {
    try {
      const { challengeRequest } = await import("./shared");
      setStudents(
        await challengeRequest("?students=" + encodeURIComponent(search)),
      );
    } catch (error) {
      setError((error as Error).message);
    }
  }
  return (
    <form
      onSubmit={(e) => void save(e)}
      className="challenge-editor challenge-stack"
      data-panel-editing="true"
    >
      <section className="challenge-panel">
        <h2>{t("Informações do desafio", "Challenge details")}</h2>
        {fixed && (
          <p className="challenge-notice">
            {t(
              "O desafio já começou. Metas, prêmios, datas e critérios ficam preservados. Alterações de textos e capa exigem justificativa e avisam os participantes.",
              "The challenge has started. Goals, prizes, dates and scoring stay fixed. Text and cover updates require a reason and notify participants.",
            )}
          </p>
        )}
        <div className="challenge-form-grid">
          <Field title={t("Nome", "Title")}>
            <Input
              required
              maxLength={150}
              value={form.title}
              onChange={(e) => change("title", e.target.value)}
            />
          </Field>
          <Field title={t("Categoria", "Category")}>
            <select
              value={form.category}
              disabled={fixed}
              onChange={(e) =>
                change("category", e.target.value as typeof form.category)
              }
            >
              {challengeCategories.map((key) => (
                <option key={key} value={key}>
                  {categoryNames[key][en ? 1 : 0]}
                </option>
              ))}
            </select>
          </Field>
          <Field
            title={t("Início · horário de Brasília", "Starts · Brasília time")}
          >
            <Input
              type="datetime-local"
              required
              disabled={fixed}
              value={dateInput(form.start_date)}
              onChange={(e) =>
                e.target.value && change("start_date", dateISO(e.target.value))
              }
            />
          </Field>
          <Field
            title={t(
              "Encerramento · horário de Brasília",
              "Ends · Brasília time",
            )}
          >
            <Input
              type="datetime-local"
              required
              disabled={fixed}
              value={dateInput(form.end_date)}
              onChange={(e) =>
                e.target.value && change("end_date", dateISO(e.target.value))
              }
            />
          </Field>
        </div>
        <Field title={t("Descrição", "Description")}>
          <textarea
            required
            maxLength={10000}
            rows={4}
            value={form.description}
            onChange={(e) => change("description", e.target.value)}
          />
        </Field>
        <Field title={t("Objetivo principal", "Main objective")}>
          <textarea
            maxLength={2000}
            value={form.objective}
            onChange={(e) => change("objective", e.target.value)}
          />
        </Field>
        <Field
          title={t(
            "Regras de participação e desempate",
            "Participation and tie rules",
          )}
        >
          <textarea
            required
            maxLength={10000}
            rows={4}
            value={form.rules}
            onChange={(e) => change("rules", e.target.value)}
          />
        </Field>
        <Field title={t("Instruções", "Instructions")}>
          <textarea
            maxLength={5000}
            value={form.instructions}
            onChange={(e) => change("instructions", e.target.value)}
          />
        </Field>
        <Field title={t("Imagem de capa", "Cover image")}>
          <ChallengeUpload
            challengeId={c.id}
            kind="cover"
            onBusy={trackUpload}
            disabled={busy}
            value={form.cover_image}
            onChange={(value) => change("cover_image", value)}
            en={en}
          />
        </Field>
      </section>
      <fieldset className="challenge-panel challenge-stack" disabled={fixed}>
        <h2>{t("Participação e apuração", "Enrollment and settlement")}</h2>
        <div className="challenge-form-grid">
          <Field
            title={t(
              "Limite de participantes (opcional)",
              "Participant limit (optional)",
            )}
          >
            <Input
              type="number"
              min={1}
              max={100000}
              value={form.max_participants ?? ""}
              onChange={(e) =>
                change(
                  "max_participants",
                  e.target.value ? Number(e.target.value) : null,
                )
              }
            />
          </Field>
          <Field title={t("Visibilidade", "Visibility")}>
            <select
              value={form.visibility}
              onChange={(e) =>
                change("visibility", e.target.value as "public" | "exclusive")
              }
            >
              <option value="public">
                {t("Todos os alunos", "All students")}
              </option>
              <option value="exclusive">
                {t("Alunos selecionados", "Selected students")}
              </option>
            </select>
          </Field>
          <Field
            title={t(
              "Registros retroativos (horas)",
              "Backdating window (hours)",
            )}
          >
            <Input
              type="number"
              min={0}
              max={168}
              value={form.max_backdate_hours}
              onChange={(e) =>
                change("max_backdate_hours", Number(e.target.value))
              }
            />
          </Field>
          <Field
            title={t(
              "Pendências no encerramento",
              "Pending activities at closing",
            )}
          >
            <select
              value={form.pending_policy}
              onChange={(e) =>
                change("pending_policy", e.target.value as "review" | "reject")
              }
            >
              <option value="review">
                {t("Aguardar revisão manual", "Wait for manual review")}
              </option>
              <option value="reject">
                {t("Recusar automaticamente", "Reject automatically")}
              </option>
            </select>
          </Field>
        </div>
        <Field
          title={t(
            "Requisitos de participação · deixe vazio para participação livre",
            "Entry requirements · leave blank for open enrollment",
          )}
        >
          <textarea
            maxLength={2000}
            value={form.requirements}
            onChange={(e) => change("requirements", e.target.value)}
          />
        </Field>
        {[
          [
            "allow_late_entry",
            t("Permitir entrada após o início", "Allow late enrollment"),
          ],
          ["allow_exit", t("Permitir saída do desafio", "Allow leaving")],
          [
            "approval_entry",
            t(
              "Exigir aprovação da inscrição pelo admin",
              "Require admin enrollment approval",
            ),
          ],
        ].map(([key, title]) => (
          <label className="challenge-check" key={key}>
            <input
              type="checkbox"
              checked={Boolean(form[key as "allow_exit"])}
              onChange={(e) => change(key as "allow_exit", e.target.checked)}
            />
            {title}
          </label>
        ))}
        {form.visibility === "exclusive" && (
          <div className="challenge-audience">
            <Field
              title={t("Buscar aluno por nome", "Search students by name")}
            >
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Field>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void findStudents()}
            >
              {t("Buscar alunos", "Find students")}
            </Button>
            <p>
              {form.audience.length}{" "}
              {t("alunos selecionados", "students selected")}
            </p>
            {students.map((student) => (
              <label className="challenge-check" key={student.id}>
                <input
                  type="checkbox"
                  checked={form.audience.includes(student.id)}
                  onChange={(e) =>
                    change(
                      "audience",
                      e.target.checked
                        ? [...form.audience, student.id]
                        : form.audience.filter((id) => id !== student.id),
                    )
                  }
                />
                {student.name}
              </label>
            ))}
          </div>
        )}
        <h3>
          {t(
            "Critérios de desempate, em ordem",
            "Tie-break criteria, in order",
          )}
        </h3>
        {[0, 1, 2].map((index) => (
          <Field
            key={index}
            title={t("Prioridade ", "Priority ") + (index + 1)}
          >
            <select
              value={form.tie_breakers[index] || ""}
              onChange={(e) => {
                const next = [...form.tie_breakers];
                if (e.target.value)
                  next[index] = e.target.value as (typeof next)[number];
                else next.splice(index, 1);
                change("tie_breakers", next);
              }}
            >
              <option value="">{t("Sem critério", "No criterion")}</option>
              <option value="goals">
                {t("Mais metas concluídas", "More completed goals")}
              </option>
              <option value="primary">
                {t("Mais objetivos principais", "More primary goals")}
              </option>
              <option value="earliest">
                {t("Pontuação obtida primeiro", "Score achieved first")}
              </option>
            </select>
          </Field>
        ))}
        <Field title={t("Se o empate persistir", "If still tied")}>
          <select
            value={form.tie_policy}
            onChange={(e) =>
              change("tie_policy", e.target.value as "manual" | "shared")
            }
          >
            <option value="manual">
              {t(
                "Decisão administrativa justificada",
                "Justified admin decision",
              )}
            </option>
            <option value="shared">
              {t("Premiação compartilhada", "Shared prizes")}
            </option>
          </select>
        </Field>
      </fieldset>
      <fieldset className="challenge-panel challenge-stack" disabled={fixed}>
        <h2>{t("Metas do desafio", "Challenge goals")}</h2>
        {form.goals.map((goal, index) => (
          <section className="challenge-nested" key={index}>
            <div className="challenge-between">
              <h3>{t("Meta ", "Goal ") + (index + 1)}</h3>
              <button
                type="button"
                onClick={() =>
                  change(
                    "goals",
                    form.goals.filter((_, i) => i !== index),
                  )
                }
                aria-label={t("Remover meta", "Remove goal")}
              >
                <Trash2 size={17} />
              </button>
            </div>
            <div className="challenge-form-grid">
              <Field title={t("Nome da meta", "Goal title")}>
                <Input
                  required
                  value={goal.title}
                  maxLength={150}
                  onChange={(e) =>
                    change(
                      "goals",
                      form.goals.map((g, i) =>
                        i === index ? { ...g, title: e.target.value } : g,
                      ),
                    )
                  }
                />
              </Field>
              <Field title={t("Tipo de meta", "Goal type")}>
                <select
                  value={goal.goal_type}
                  onChange={(e) =>
                    change(
                      "goals",
                      form.goals.map((g, i) =>
                        i === index
                          ? {
                              ...g,
                              goal_type: e.target.value as typeof g.goal_type,
                            }
                          : g,
                      ),
                    )
                  }
                >
                  {challengeGoalTypes.map((key) => (
                    <option key={key} value={key}>
                      {goalNames[key][en ? 1 : 0]}
                    </option>
                  ))}
                </select>
              </Field>
              {(["target_value", "unit", "points", "max_points"] as const).map(
                (key) => (
                  <Field
                    key={key}
                    title={
                      {
                        target_value: t(
                          "Quantidade necessária",
                          "Target value",
                        ),
                        unit: t("Unidade", "Unit"),
                        points: t(
                          "Pontos por cumprimento",
                          "Points per completion",
                        ),
                        max_points: t(
                          "Teto de pontos da meta",
                          "Maximum goal points",
                        ),
                      }[key]
                    }
                  >
                    <Input
                      required
                      type={key === "unit" ? "text" : "number"}
                      min={key === "target_value" ? 0.01 : 0}
                      step={key === "target_value" ? "any" : 1}
                      value={goal[key]}
                      onChange={(e) =>
                        change(
                          "goals",
                          form.goals.map((g, i) =>
                            i === index
                              ? {
                                  ...g,
                                  [key]:
                                    key === "unit"
                                      ? e.target.value
                                      : Number(e.target.value),
                                }
                              : g,
                          ),
                        )
                      }
                    />
                  </Field>
                ),
              )}
              <Field title={t("Frequência", "Frequency")}>
                <select
                  value={goal.frequency}
                  onChange={(e) =>
                    change(
                      "goals",
                      form.goals.map((g, i) =>
                        i === index
                          ? {
                              ...g,
                              frequency: e.target.value as typeof g.frequency,
                            }
                          : g,
                      ),
                    )
                  }
                >
                  <option value="daily">{t("Diária", "Daily")}</option>
                  <option value="weekly">{t("Semanal", "Weekly")}</option>
                  <option value="total">
                    {t("Total do desafio", "Challenge total")}
                  </option>
                </select>
              </Field>
              <Field title={t("Comprovação", "Proof")}>
                <select
                  value={goal.proof_type}
                  onChange={(e) =>
                    change(
                      "goals",
                      form.goals.map((g, i) =>
                        i === index
                          ? {
                              ...g,
                              proof_type: e.target.value as typeof g.proof_type,
                            }
                          : g,
                      ),
                    )
                  }
                >
                  <option value="none">
                    {t("Registro declarado", "Self-reported")}
                  </option>
                  <option value="photo">
                    {t("Foto obrigatória", "Photo required")}
                  </option>
                  <option value="document">
                    {t("Foto ou PDF obrigatório", "Photo or PDF required")}
                  </option>
                </select>
              </Field>
            </div>
            <Field title={t("Descrição da meta", "Goal description")}>
              <textarea
                maxLength={2000}
                value={goal.description}
                onChange={(e) =>
                  change(
                    "goals",
                    form.goals.map((g, i) =>
                      i === index ? { ...g, description: e.target.value } : g,
                    ),
                  )
                }
              />
            </Field>
            <label className="challenge-check">
              <input
                type="checkbox"
                checked={goal.requires_approval}
                onChange={(e) =>
                  change(
                    "goals",
                    form.goals.map((g, i) =>
                      i === index
                        ? { ...g, requires_approval: e.target.checked }
                        : g,
                    ),
                  )
                }
              />
              {t("Exigir aprovação manual", "Require manual approval")}
            </label>
            <label className="challenge-check">
              <input
                type="checkbox"
                checked={goal.is_primary}
                onChange={(e) =>
                  change(
                    "goals",
                    form.goals.map((g, i) =>
                      i === index ? { ...g, is_primary: e.target.checked } : g,
                    ),
                  )
                }
              />
              {t("Objetivo principal para desempate", "Primary tie-break goal")}
            </label>
          </section>
        ))}
        <Button
          type="button"
          variant="secondary"
          disabled={form.goals.length >= 20}
          onClick={() =>
            change("goals", [...form.goals, { ...defaultGoal(), id: "" }])
          }
        >
          <Plus size={16} />
          {t("Adicionar meta", "Add goal")}
        </Button>
      </fieldset>
      <fieldset className="challenge-panel challenge-stack" disabled={fixed}>
        <div className="challenge-between">
          <h2>
            <Trophy size={20} /> {t("Premiação", "Prizes")}
          </h2>
          <button type="button" onClick={() => setPreview(!preview)}>
            {preview
              ? t("Editar prêmios", "Edit prizes")
              : t("Prévia dos prêmios", "Preview prizes")}
          </button>
        </div>
        <div className="challenge-form-grid">
          <Field title={t("Modalidade", "Prize mode")}>
            <select
              value={form.winner_type}
              onChange={(e) => {
                const value = e.target.value as typeof form.winner_type;
                change("winner_type", value);
                prizeCount(value === "top3" ? 3 : 1);
              }}
            >
              <option value="single">{t("Um ganhador", "One winner")}</option>
              <option value="top3">Top 3</option>
              <option value="custom">{t("Personalizada", "Custom")}</option>
            </select>
          </Field>
          {form.winner_type === "custom" && (
            <Field title={t("Quantidade de ganhadores", "Winner count")}>
              <Input
                type="number"
                min={1}
                max={100}
                value={form.winner_count}
                onChange={(e) =>
                  prizeCount(Math.min(100, Math.max(1, Number(e.target.value))))
                }
              />
            </Field>
          )}
        </div>
        <div className={preview ? "challenge-prize-grid" : "challenge-stack"}>
          {form.prizes.map((p, index) => (
            <section className="challenge-nested" key={index}>
              <h3>
                {index + 1}º {t("lugar", "place")}
              </h3>
              {preview ? (
                <>
                  <h4>{p.name}</h4>
                  {p.image && (
                    <img
                      className="challenge-prize-image"
                      src={
                        "/api/challenges/asset?path=" +
                        encodeURIComponent(p.image)
                      }
                      alt={p.name}
                    />
                  )}
                  <p>{p.description}</p>
                  <p>{p.delivery_instructions}</p>
                </>
              ) : (
                <>
                  <Field title={t("Nome do prêmio", "Prize name")}>
                    <Input
                      required
                      maxLength={150}
                      value={p.name}
                      onChange={(e) => prize(index, { name: e.target.value })}
                    />
                  </Field>
                  <Field title={t("Imagem individual", "Prize image")}>
                    <ChallengeUpload
                      challengeId={c.id}
                      kind="prize"
                      onBusy={trackUpload}
                      disabled={busy}
                      value={p.image}
                      onChange={(value) => prize(index, { image: value })}
                      en={en}
                    />
                  </Field>
                  <Field title={t("Descrição do prêmio", "Prize description")}>
                    <textarea
                      maxLength={2000}
                      value={p.description}
                      onChange={(e) =>
                        prize(index, { description: e.target.value })
                      }
                    />
                  </Field>
                  <Field
                    title={t(
                      "Valor estimado (R$, opcional)",
                      "Estimated value (BRL, optional)",
                    )}
                  >
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={p.estimated_value ?? ""}
                      onChange={(e) =>
                        prize(index, {
                          estimated_value: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                    />
                  </Field>
                  <Field title={t("Observações", "Notes")}>
                    <textarea
                      maxLength={2000}
                      value={p.notes}
                      onChange={(e) => prize(index, { notes: e.target.value })}
                    />
                  </Field>
                  <Field
                    title={t("Retirada ou recebimento", "Prize collection")}
                  >
                    <textarea
                      maxLength={2000}
                      value={p.delivery_instructions}
                      onChange={(e) =>
                        prize(index, { delivery_instructions: e.target.value })
                      }
                    />
                  </Field>
                </>
              )}
            </section>
          ))}
        </div>
      </fieldset>
      <section className="challenge-panel">
        <Field
          title={t(
            "Justificativa da alteração (obrigatória após o início)",
            "Change reason (required after start)",
          )}
        >
          <textarea
            value={reason}
            maxLength={2000}
            required={fixed}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        <Button type="submit" disabled={busy || uploadCount > 0}>
          {busy
            ? t("Salvando…", "Saving…")
            : t("Salvar configuração", "Save configuration")}
        </Button>
        {error && (
          <p role="alert" className="challenge-error">
            {error}
          </p>
        )}
      </section>
    </form>
  );
}
