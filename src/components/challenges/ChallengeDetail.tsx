"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Trophy,
  Flag,
  Clock3,
  Users,
  Medal,
  CheckCircle2,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import type {
  ChallengeDetail as Detail,
  ChallengeRank,
} from "@/lib/challenges";
import { ChallengeEditor } from "./ChallengeEditor";
import {
  ChallengeUpload,
  Field,
  challengeAssetUrl,
  challengeDate,
  challengeRequest,
  challengeSend,
  dateInput,
  dateISO,
  statusName,
  categoryNames,
} from "./shared";
import "./challenges.css";

function Remaining({
  start,
  end,
  en,
}: {
  start: string;
  end: string;
  en: boolean;
}) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  if (!now) return <span>—</span>;
  const future = now < Date.parse(start);
  const seconds = Math.max(
    0,
    Math.floor((Date.parse(future ? start : end) - now) / 1000),
  );
  return (
    <span>
      {future
        ? en
          ? "Starts in "
          : "Começa em "
        : en
          ? "Time left "
          : "Restam "}
      {Math.floor(seconds / 86400)}d {Math.floor((seconds % 86400) / 3600)}h{" "}
      {Math.floor((seconds % 3600) / 60)}m
    </span>
  );
}
function Ranking({
  rows,
  en,
  userId,
}: {
  rows: ChallengeRank[];
  en: boolean;
  userId: string;
}) {
  return (
    <div className="challenge-ranking">
      {rows.map((row) => (
        <div
          className={`challenge-ranking-row ${row.user_id === userId ? "challenge-me" : ""}`}
          key={row.user_id}
        >
          <span className="challenge-rank-number">
            {row.rank_position <= 3
              ? ["🥇", "🥈", "🥉"][row.rank_position - 1]
              : row.rank_position + "º"}
          </span>
          <Avatar
            src={row.avatar || undefined}
            fallback={row.name?.slice(0, 2)}
          />
          <div>
            <strong>
              {row.name}
              {row.user_id === userId ? (en ? " · You" : " · Você") : ""}
            </strong>
            <small>
              {row.completed_goals}{" "}
              {en ? "goals completed" : "metas concluídas"} · {row.progress}%
            </small>
          </div>
          <strong className="challenge-score">
            {row.total_points}
            <small>pts</small>
          </strong>
        </div>
      ))}
    </div>
  );
}

export function ChallengeDetail({
  initial,
  locale,
  userId,
  admin = false,
  edit = false,
  winnersOnly = false,
}: {
  initial: Detail;
  locale: string;
  userId: string;
  admin?: boolean;
  edit?: boolean;
  winnersOnly?: boolean;
}) {
  const en = locale === "en-US",
    t = (pt: string, english: string) => (en ? english : pt);
  const [data, setData] = useState(initial),
    [tab, setTab] = useState(
      winnersOnly ? "winners" : edit ? "config" : "overview",
    ),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false),
    [activityOffset, setActivityOffset] = useState(0),
    [participantOffset, setParticipantOffset] = useState(0),
    [rankOffset, setRankOffset] = useState(0),
    [validation, setValidation] = useState("");
  const [goalId, setGoalId] = useState(initial.goals[0]?.id || ""),
    [value, setValue] = useState(""),
    [date, setDate] = useState(() => dateInput(new Date().toISOString())),
    [proof, setProof] = useState<string | null>(null),
    [notes, setNotes] = useState("");
  const [dateChanged, setDateChanged] = useState(false);
  const [proofUploading, setProofUploading] = useState(false);
  const [customWinners, setCustomWinners] = useState(false),
    [winners, setWinners] = useState<Record<number, string>>({}),
    [finalReason, setFinalReason] = useState("");
  const [resultRevision, setResultRevision] = useState("");
  const [adjustParticipant, setAdjustParticipant] = useState(""),
    [adjustPoints, setAdjustPoints] = useState(""),
    [adjustReason, setAdjustReason] = useState("");
  const activityRequest = useRef(crypto.randomUUID()),
    adjustRequest = useRef(crypto.randomUUID()),
    duplicateRequest = useRef(crypto.randomUUID()),
    generation = useRef(0);
  const c = data.challenge,
    goal = data.goals.find((g) => g.id === goalId);
  const load = useCallback(async () => {
    const version = ++generation.current;
    const params = new URLSearchParams({
      id: initial.challenge.id,
      offset: String(activityOffset),
      rank_offset: String(rankOffset),
      participant_offset: String(participantOffset),
    });
    if (validation) params.set("validation", validation);
    if (resultRevision) params.set("result_revision", resultRevision);
    const result = await challengeRequest("?" + params);
    if (version === generation.current) setData(result);
  }, [
    initial.challenge.id,
    activityOffset,
    rankOffset,
    participantOffset,
    validation,
    resultRevision,
  ]);
  useEffect(() => {
    void load().catch((error) => setError(error.message));
  }, [load]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (
        !document.hidden &&
        tab !== "config" &&
        !document.activeElement?.closest("input,textarea,select")
      )
        void load().catch((error) => setError(error.message));
    }, 15000);
    return () => clearInterval(timer);
  }, [load, tab]);
  async function run(input: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await challengeSend({ ...input, challenge_id: c.id });
      if (input.action === "duplicate") {
        if (result.warning) window.alert(result.warning);
        window.location.assign(`/${locale}/admin/desafios/${result.id}?edit=1`);
      } else {
        await load();
        setNotice(t("Alteração salva.", "Changes saved."));
      }
      return true;
    } catch (error) {
      setError((error as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function adminStatus(action: string) {
    if (
      ["cancel", "close"].includes(action) &&
      !window.confirm(
        t("Confirmar esta ação no desafio?", "Confirm this challenge action?"),
      )
    )
      return;
    const reason = window.prompt(
      t("Justificativa administrativa", "Administrative reason"),
    );
    if (!reason?.trim()) return;
    await run({ action, reason });
  }
  async function record(e: React.FormEvent) {
    e.preventDefault();
    if (proofUploading) return;
    if (
      await run({
        action: "activity",
        goal_id: goalId,
        recorded_value: Number(value),
        activity_date: dateChanged ? dateISO(date) : null,
        proof_image: proof,
        notes,
        request_id: activityRequest.current,
      })
    ) {
      activityRequest.current = crypto.randomUUID();
      setValue("");
      setProof(null);
      setNotes("");
      setTab("activities");
    }
  }
  async function review(activityId: string, approved: boolean) {
    const reason = window.prompt(t("Motivo da validação", "Validation reason"));
    if (reason?.trim())
      await run({
        action: "review",
        activity_id: activityId,
        approved,
        reason,
      });
  }
  async function adjust(e: React.FormEvent) {
    e.preventDefault();
    if (
      await run({
        action: "adjust",
        participant_id: adjustParticipant,
        points: Number(adjustPoints),
        reason: adjustReason,
        request_id: adjustRequest.current,
      })
    ) {
      adjustRequest.current = crypto.randomUUID();
      setAdjustPoints("");
      setAdjustReason("");
    }
  }
  const open =
    c.status === "published" &&
    Date.now() >= Date.parse(c.start_date) &&
    Date.now() < Date.parse(c.end_date);
  const tabs = [
    ["overview", t("Visão geral", "Overview")],
    ["ranking", "Ranking"],
    [
      "activities",
      admin
        ? t("Validar registros", "Review activities")
        : t("Meus registros", "My activities"),
    ],
    ...(data.winners.length ? [["winners", t("Vencedores", "Winners")]] : []),
    ...(admin
      ? [
          ["participants", t("Participantes", "Participants")],
          ["config", t("Configuração", "Configuration")],
          ["result", t("Apuração e prêmios", "Results and prizes")],
          ["audit", t("Histórico", "History")],
        ]
      : []),
  ];
  return (
    <main className="challenges-page challenge-stack">
      <Link
        href={`/${locale}/${admin ? "admin/" : ""}desafios`}
        className="challenge-back"
      >
        ← {t("Todos os desafios", "All challenges")}
      </Link>
      <header className="challenge-hero">
        {c.cover_image ? (
          <img src={challengeAssetUrl(c.cover_image)} alt={c.title} />
        ) : (
          <div className="challenge-hero-placeholder">
            <Trophy size={90} />
          </div>
        )}
        <div className="challenge-hero-content">
          <span className="challenge-badge">{statusName(c, en)}</span>
          <span className="challenge-kicker">
            {categoryNames[c.category]?.[en ? 1 : 0]}
          </span>
          <h1>{c.title}</h1>
          <p>{c.objective}</p>
        </div>
      </header>
      <section className="challenge-summary">
        <div>
          <Clock3 size={18} />
          <Remaining start={c.start_date} end={c.end_date} en={en} />
        </div>
        <div>
          <Users size={18} />
          {data.participant_count}
          {c.max_participants ? "/" + c.max_participants : ""}{" "}
          {t("participantes", "participants")}
        </div>
        <div>
          <Trophy size={18} />
          {c.winner_count} {t("ganhador(es)", "winner(s)")}
        </div>
        <div>
          <Flag size={18} />
          {data.goals.length} {t("metas", "goals")}
        </div>
      </section>
      {admin && (
        <section className="challenge-admin-actions challenge-panel">
          {c.status === "draft" && (
            <Button
              disabled={busy}
              onClick={() => void run({ action: "publish" })}
            >
              {t("Publicar desafio", "Publish challenge")}
            </Button>
          )}
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void run({
                action: "duplicate",
                request_id: duplicateRequest.current,
              })
            }
          >
            {t("Duplicar", "Duplicate")}
          </Button>
          {c.status === "published" && (
            <Button
              variant="secondary"
              disabled={busy || Date.now() >= Date.parse(c.end_date)}
              onClick={() => void adminStatus("pause")}
            >
              {t("Pausar", "Pause")}
            </Button>
          )}
          {c.status === "paused" && (
            <Button
              variant="secondary"
              disabled={busy || Date.now() >= Date.parse(c.end_date)}
              onClick={() => void adminStatus("resume")}
            >
              {t("Retomar", "Resume")}
            </Button>
          )}
          {["published", "paused"].includes(c.status) && (
            <>
              <Button
                variant="secondary"
                disabled={busy || Date.now() < Date.parse(c.start_date)}
                onClick={() => void adminStatus("close")}
              >
                {t("Encerrar", "Close")}
              </Button>
              <Button
                variant="destructive"
                disabled={busy || Date.now() >= Date.parse(c.end_date)}
                onClick={() => void adminStatus("cancel")}
              >
                {t("Cancelar desafio", "Cancel challenge")}
              </Button>
            </>
          )}
          {c.status === "completed" && (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void adminStatus("correct")}
            >
              {t("Abrir revisão do resultado", "Open result correction")}
            </Button>
          )}
        </section>
      )}
      {error && (
        <p role="alert" className="challenge-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="challenge-success">
          {notice}
        </p>
      )}
      <nav
        className="challenge-tabs"
        aria-label={t("Seções do desafio", "Challenge sections")}
      >
        {tabs.map(([key, label]) => (
          <button
            type="button"
            key={key}
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === "overview" && (
        <div className="challenge-detail-grid">
          <div className="challenge-stack">
            <section className="challenge-panel challenge-stack">
              <h2>{t("Sobre o desafio", "About the challenge")}</h2>
              <p className="challenge-text">{c.description}</p>
              <h3>{t("Como participar", "How to participate")}</h3>
              <p className="challenge-text">{c.instructions}</p>
              <p className="challenge-meta">
                {challengeDate(c.start_date, locale)} —{" "}
                {challengeDate(c.end_date, locale)} · Brasília
              </p>
              {c.requirements && (
                <p className="challenge-notice">{c.requirements}</p>
              )}
              <details>
                <summary>{t("Regras completas", "Full rules")}</summary>
                <p className="challenge-text">{c.rules}</p>
                <p>
                  {t("Desempate: ", "Tie-breaking: ")}
                  {c.tie_breakers
                    .map(
                      (key) =>
                        ({
                          goals: t("metas concluídas", "completed goals"),
                          primary: t("objetivos principais", "primary goals"),
                          earliest: t(
                            "pontuação obtida primeiro",
                            "score achieved first",
                          ),
                        })[key],
                    )
                    .join(" → ")}{" "}
                  ·{" "}
                  {c.tie_policy === "shared"
                    ? t(
                        "prêmios compartilhados em empate",
                        "shared prizes if tied",
                      )
                    : t(
                        "decisão administrativa justificada em empate",
                        "justified admin decision if tied",
                      )}
                </p>
                <p>
                  {t(
                    "Pendências ao encerrar: ",
                    "Pending activities at closing: ",
                  )}
                  {c.pending_policy === "review"
                    ? t("aguardar aprovação manual", "wait for manual approval")
                    : t("recusar automaticamente", "reject automatically")}
                </p>
              </details>
              {!admin &&
                !data.participant &&
                c.status === "published" &&
                Date.now() < Date.parse(c.end_date) && (
                  <form
                    className="challenge-enrollment"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void run({
                        action: "join",
                        accept_rules: true,
                        version: c.version,
                      });
                    }}
                  >
                    <label className="challenge-check">
                      <input
                        type="checkbox"
                        required
                        checked={accepted}
                        onChange={(e) => setAccepted(e.target.checked)}
                      />
                      {t(
                        "Li e aceito as regras e requisitos deste desafio.",
                        "I have read and accept the challenge rules and requirements.",
                      )}
                    </label>
                    <Button
                      type="submit"
                      disabled={
                        busy ||
                        !accepted ||
                        (!c.allow_late_entry &&
                          Date.now() >= Date.parse(c.start_date))
                      }
                    >
                      {t("Participar do desafio", "Join challenge")}
                    </Button>
                  </form>
                )}
              {data.participant && (
                <div className="challenge-enrollment">
                  <p>
                    {data.participant.status === "active"
                      ? t(
                          "Você está participando deste desafio.",
                          "You are enrolled in this challenge.",
                        )
                      : data.participant.status === "pending"
                        ? t(
                            "Sua inscrição aguarda aprovação dos requisitos.",
                            "Your enrollment is awaiting requirements approval.",
                          )
                        : t(
                            "Sua participação foi encerrada.",
                            "Your enrollment has ended.",
                          )}
                  </p>
                  {c.allow_exit &&
                    ["active", "pending"].includes(data.participant.status) &&
                    ["published", "paused"].includes(c.status) &&
                    Date.now() < Date.parse(c.end_date) && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (
                            window.confirm(
                              t(
                                "Sair do desafio? Você não poderá se inscrever novamente.",
                                "Leave this challenge? You will not be able to rejoin.",
                              ),
                            )
                          )
                            void run({ action: "leave" });
                        }}
                      >
                        {t("Sair do desafio", "Leave challenge")}
                      </button>
                    )}
                </div>
              )}
            </section>
            {data.participant?.status === "active" && (
              <section className="challenge-personal challenge-panel">
                <h2>{t("Minha evolução", "My progress")}</h2>
                <div className="challenge-personal-numbers">
                  <strong>
                    {data.my_rank?.rank_position || "—"}º
                    <small>{t("posição", "position")}</small>
                  </strong>
                  <strong>
                    {data.participant.total_points}
                    <small>{t("pontos", "points")}</small>
                  </strong>
                  <strong>
                    {data.my_rank?.completed_goals || 0}/{data.goals.length}
                    <small>{t("metas concluídas", "goals completed")}</small>
                  </strong>
                </div>
                <progress max={100} value={data.my_rank?.progress || 0} />
                <p>
                  {data.my_rank?.progress || 0}%{" "}
                  {t("do desafio", "of the challenge")}
                </p>
              </section>
            )}
            <section className="challenge-panel challenge-stack">
              <h2>
                <Target size={20} />
                {t("Metas e progresso", "Goals and progress")}
              </h2>
              {data.goals.map((g) => {
                const progress = data.progress.find((p) => p.goal_id === g.id);
                return (
                  <div className="challenge-goal" key={g.id}>
                    <div className="challenge-between">
                      <h3>{g.title}</h3>
                      <span className="challenge-badge">{g.points} pts</span>
                    </div>
                    <p>{g.description}</p>
                    <p>
                      {g.target_value} {g.unit} ·{" "}
                      {g.frequency === "daily"
                        ? t("por dia", "per day")
                        : g.frequency === "weekly"
                          ? t("por semana", "per week")
                          : t("no desafio", "in this challenge")}
                    </p>
                    <p className="challenge-hint">
                      {t("Teto: ", "Cap: ")}
                      {g.max_points} pts ·{" "}
                      {g.requires_approval
                        ? t("aprovação manual", "manual approval")
                        : t(
                            "validação automática do registro",
                            "automatic record validation",
                          )}
                    </p>
                    {data.participant?.status === "active" && (
                      <>
                        <progress max={100} value={progress?.progress || 0} />
                        <div className="challenge-between">
                          <span>
                            {g.frequency === "total"
                              ? `${progress?.current_value || 0}/${g.target_value} ${g.unit}`
                              : `${progress?.completed_periods || 0}/${progress?.required_periods || 0} ${t("períodos concluídos", "completed periods")}`}
                          </span>
                          <strong>{progress?.progress || 0}%</strong>
                        </div>
                        <Button
                          variant="secondary"
                          disabled={!open || busy}
                          onClick={() => {
                            setGoalId(g.id);
                            setTab("record");
                          }}
                        >
                          {t("Registrar atividade", "Record activity")}
                        </Button>
                      </>
                    )}
                  </div>
                );
              })}
            </section>
            {!!data.winners.length && <Winners data={data} en={en} />}
          </div>
          <aside className="challenge-stack">
            <Prizes data={data} en={en} />
            <section className="challenge-panel">
              <h2>{t("Pódio atual", "Current podium")}</h2>
              <Ranking
                rows={data.ranking.slice(0, 3)}
                en={en}
                userId={userId}
              />
              <button type="button" onClick={() => setTab("ranking")}>
                {t("Ver ranking completo", "View full ranking")} →
              </button>
            </section>
          </aside>
        </div>
      )}
      {tab === "ranking" && (
        <section className="challenge-panel challenge-stack">
          <h2>
            <Medal size={22} />
            {t("Ranking do desafio", "Challenge ranking")}
          </h2>
          {data.my_rank && (
            <p className="challenge-notice">
              {t("Sua posição: ", "Your position: ")}
              {data.my_rank.rank_position}º · {data.my_rank.total_points} pts
            </p>
          )}
          <Ranking rows={data.ranking} en={en} userId={userId} />
          <div className="challenge-between">
            <Button
              variant="secondary"
              disabled={!rankOffset}
              onClick={() => setRankOffset(Math.max(0, rankOffset - 50))}
            >
              {t("Anterior", "Previous")}
            </Button>
            <Button
              variant="secondary"
              disabled={rankOffset + 50 >= data.ranking_count}
              onClick={() => setRankOffset(rankOffset + 50)}
            >
              {t("Próximos", "Next")}
            </Button>
          </div>
        </section>
      )}
      {tab === "winners" &&
        (data.winners.length ? (
          <>
            <Winners data={data} en={en} />
            <Link
              className="challenge-link"
              href={`/${locale}/desafios/${c.id}/vencedores`}
            >
              {t("Abrir página dos vencedores", "Open winners page")}
            </Link>
          </>
        ) : (
          <p className="challenge-notice">
            {t(
              "O resultado oficial ainda não foi publicado.",
              "Official results have not been published yet.",
            )}
          </p>
        ))}
      {tab === "record" && goal && (
        <form
          className="challenge-panel challenge-stack"
          onSubmit={(e) => void record(e)}
          data-panel-editing="true"
        >
          <h2>{t("Registrar atividade", "Record activity")}</h2>
          <p className="challenge-notice">
            {t(
              "Envie um único total consolidado por meta e dia. Registros pendentes só pontuam após aprovação. Para corrigir um envio, solicite revisão ao administrador.",
              "Submit one consolidated total per goal per day. Pending records score after approval. Ask the administrator to review incorrect submissions.",
            )}
          </p>
          <Field title={t("Meta", "Goal")}>
            <select
              value={goalId}
              disabled={busy || proofUploading}
              onChange={(e) => {
                setGoalId(e.target.value);
                setProof(null);
              }}
            >
              {data.goals.map((g) => (
                <option value={g.id} key={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </Field>
          <Field title={t("Quantidade em ", "Amount in ") + goal.unit}>
            <Input
              type="number"
              min="0.01"
              step="any"
              max={100000000}
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </Field>
          {c.max_backdate_hours > 0 && (
            <Field
              title={t("Data e horário · Brasília", "Date and time · Brasília")}
            >
              <Input
                type="datetime-local"
                required
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setDateChanged(true);
                }}
              />
            </Field>
          )}
          <Field title={t("Foto ou comprovante", "Photo or proof")}>
            <ChallengeUpload
              key={goalId}
              challengeId={c.id}
              kind="proof"
              onBusy={setProofUploading}
              disabled={busy}
              value={proof}
              onChange={setProof}
              en={en}
              pdf={goal.proof_type !== "photo"}
            />
          </Field>
          <Field title={t("Observações", "Notes")}>
            <textarea
              maxLength={2000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          <Button
            type="submit"
            disabled={
              busy ||
              proofUploading ||
              !open ||
              (goal.proof_type !== "none" && !proof)
            }
          >
            {t("Enviar registro", "Submit activity")}
          </Button>
        </form>
      )}
      {tab === "activities" && (
        <section className="challenge-panel challenge-stack">
          <div className="challenge-between">
            <h2>{t("Registros de atividades", "Activity records")}</h2>
            <select
              aria-label={t("Filtrar validação", "Filter validation")}
              value={validation}
              onChange={(e) => {
                setActivityOffset(0);
                setValidation(e.target.value);
              }}
            >
              <option value="">{t("Todos", "All")}</option>
              <option value="pending">{t("Pendentes", "Pending")}</option>
              <option value="approved">{t("Aprovados", "Approved")}</option>
              <option value="rejected">{t("Recusados", "Rejected")}</option>
            </select>
          </div>
          {data.activities.slice(0, 50).map((activity) => (
            <article key={activity.id} className="challenge-activity">
              <div className="challenge-between">
                <h3>{activity.goal_title}</h3>
                <span
                  className={`challenge-badge challenge-${activity.validation_status}`}
                >
                  {
                    {
                      pending: t("Pendente", "Pending"),
                      approved: t("Aprovado", "Approved"),
                      rejected: t("Recusado", "Rejected"),
                    }[activity.validation_status as "pending"]
                  }
                </span>
              </div>
              <p>
                {activity.name} · {activity.recorded_value} ·{" "}
                {challengeDate(activity.activity_date, locale)}
              </p>
              <p>{activity.notes}</p>
              {activity.validation_reason && (
                <p>{activity.validation_reason}</p>
              )}
              {activity.proof_image && (
                <a
                  href={challengeAssetUrl(activity.proof_image)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("Abrir comprovante", "Open proof")}
                </a>
              )}
              {admin &&
                ["published", "paused", "review"].includes(c.status) && (
                  <div className="challenge-inline-actions">
                    <Button
                      variant="secondary"
                      disabled={
                        busy || activity.validation_status === "approved"
                      }
                      onClick={() => void review(activity.id, true)}
                    >
                      {t("Aprovar", "Approve")}
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={
                        busy || activity.validation_status === "rejected"
                      }
                      onClick={() => void review(activity.id, false)}
                    >
                      {t("Recusar", "Reject")}
                    </Button>
                  </div>
                )}
            </article>
          ))}
          {!data.activities.length && (
            <p className="challenge-hint">
              {t("Nenhum registro encontrado.", "No activity records found.")}
            </p>
          )}
          <div className="challenge-between">
            <Button
              variant="secondary"
              disabled={!activityOffset}
              onClick={() =>
                setActivityOffset(Math.max(0, activityOffset - 50))
              }
            >
              {t("Anterior", "Previous")}
            </Button>
            <Button
              variant="secondary"
              disabled={data.activities.length <= 50}
              onClick={() => setActivityOffset(activityOffset + 50)}
            >
              {t("Próximos", "Next")}
            </Button>
          </div>
          <h3>{t("Lançamentos de pontos", "Point entries")}</h3>
          {data.points.map((point) => (
            <p key={point.id} className="challenge-dashboard-row">
              <span>{point.description}</span>
              <strong>{point.points} pts</strong>
            </p>
          ))}
        </section>
      )}
      {tab === "participants" && admin && (
        <section className="challenge-panel challenge-stack">
          <h2>{t("Participantes", "Participants")}</h2>
          {data.participants?.slice(0, 50).map((p) => (
            <div className="challenge-activity" key={p.id}>
              <div className="challenge-between">
                <strong>{p.name}</strong>
                <span>
                  {p.total_points} pts · {p.status}
                </span>
              </div>
              {p.status === "pending" && (
                <div className="challenge-inline-actions">
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() =>
                      void run({
                        action: "approve_entry",
                        participant_id: p.id,
                        approved: true,
                        reason: "Requisitos conferidos",
                      })
                    }
                  >
                    {t("Aprovar inscrição", "Approve enrollment")}
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={busy}
                    onClick={() => {
                      const reason = window.prompt(
                        t("Motivo da recusa", "Rejection reason"),
                      );
                      if (reason)
                        void run({
                          action: "approve_entry",
                          participant_id: p.id,
                          approved: false,
                          reason,
                        });
                    }}
                  >
                    {t("Recusar inscrição", "Reject enrollment")}
                  </Button>
                </div>
              )}
            </div>
          ))}
          <div className="challenge-between">
            <Button
              variant="secondary"
              disabled={!participantOffset}
              onClick={() =>
                setParticipantOffset(Math.max(0, participantOffset - 50))
              }
            >
              {t("Anterior", "Previous")}
            </Button>
            <Button
              variant="secondary"
              disabled={(data.participants?.length || 0) <= 50}
              onClick={() => setParticipantOffset(participantOffset + 50)}
            >
              {t("Próximos", "Next")}
            </Button>
          </div>
          {["published", "paused", "review"].includes(c.status) && (
            <form
              onSubmit={(e) => void adjust(e)}
              className="challenge-nested challenge-stack"
            >
              <h3>
                {t(
                  "Ajuste administrativo de pontos",
                  "Administrative score adjustment",
                )}
              </h3>
              <Field title={t("Participante", "Participant")}>
                <select
                  required
                  value={adjustParticipant}
                  onChange={(e) => setAdjustParticipant(e.target.value)}
                >
                  <option value="">{t("Selecione", "Select")}</option>
                  {data.participants
                    ?.filter((p) => p.status === "active")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field
                title={t(
                  "Pontos positivos ou negativos",
                  "Positive or negative points",
                )}
              >
                <Input
                  type="number"
                  min={-1000000}
                  max={1000000}
                  required
                  value={adjustPoints}
                  onChange={(e) => setAdjustPoints(e.target.value)}
                />
              </Field>
              <Field title={t("Justificativa", "Reason")}>
                <textarea
                  required
                  maxLength={2000}
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                />
              </Field>
              <Button disabled={busy} type="submit">
                {t("Aplicar ajuste", "Apply adjustment")}
              </Button>
            </form>
          )}
        </section>
      )}
      {tab === "config" &&
        admin &&
        (["draft", "published", "paused"].includes(c.status) ? (
          <ChallengeEditor
            key={c.version}
            detail={data}
            locale={locale}
            onSaved={load}
          />
        ) : (
          <p className="challenge-notice">
            {t(
              "Configuração encerrada. O histórico do desafio foi preservado.",
              "Configuration is closed. The challenge history is preserved.",
            )}
          </p>
        ))}
      {tab === "result" && admin && (
        <section className="challenge-panel challenge-stack">
          <h2>
            <Trophy size={22} />
            {t("Apuração e premiação", "Results and prizes")}
          </h2>
          {!!data.result_history?.length && (
            <Field
              title={t(
                "Histórico de apurações imutáveis",
                "Immutable results history",
              )}
            >
              <select
                value={resultRevision}
                onChange={(e) => setResultRevision(e.target.value)}
              >
                <option value="">
                  {t("Apuração atual", "Current result")}
                </option>
                {data.result_history.map((row) => (
                  <option key={row.revision} value={row.revision}>
                    {row.revision} · {row.reason}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {data.result && (
            <>
              <p>
                {t("Versão ", "Revision ")}
                {data.result.revision} ·{" "}
                {data.result.published_at
                  ? t("Publicada", "Published")
                  : t("Prévia para revisão", "Review draft")}
              </p>
              <Ranking
                rows={data.result.snapshot.ranking.slice(0, 100)}
                en={en}
                userId={userId}
              />
            </>
          )}
          {c.status === "review" && !resultRevision && (
            <form
              className="challenge-stack"
              onSubmit={(e) => {
                e.preventDefault();
                if (
                  window.confirm(
                    t(
                      "Publicar os ganhadores oficialmente?",
                      "Publish the official winners?",
                    ),
                  )
                )
                  void run({
                    action: "confirm",
                    reason: finalReason,
                    winners: customWinners
                      ? Object.entries(winners)
                          .filter(([, user]) => user)
                          .map(([placement, user_id]) => ({
                            placement: Number(placement),
                            user_id,
                          }))
                      : [],
                  });
              }}
            >
              <p className="challenge-notice">
                {t(
                  "Resolva todos os registros pendentes antes de confirmar. Empates manuais exigem seleção dos ganhadores e justificativa.",
                  "Resolve all pending records before confirming. Manual ties require winner selection and a reason.",
                )}
              </p>
              <label className="challenge-check">
                <input
                  type="checkbox"
                  checked={customWinners}
                  onChange={(e) => setCustomWinners(e.target.checked)}
                />
                {t("Definir ganhadores manualmente", "Choose winners manually")}
              </label>
              {customWinners &&
                Array.from(
                  { length: Math.min(c.winner_count, data.ranking_count) },
                  (_, i) => (
                    <Field key={i} title={i + 1 + "º " + t("lugar", "place")}>
                      <select
                        required
                        value={winners[i + 1] || ""}
                        onChange={(e) =>
                          setWinners({ ...winners, [i + 1]: e.target.value })
                        }
                      >
                        <option value="">
                          {t("Selecione o participante", "Select participant")}
                        </option>
                        {(data.result?.snapshot.ranking || data.ranking).map(
                          (row) => (
                            <option value={row.user_id} key={row.user_id}>
                              {row.name} · {row.total_points} pts
                            </option>
                          ),
                        )}
                      </select>
                    </Field>
                  ),
                )}
              <Field
                title={t("Justificativa da confirmação", "Confirmation reason")}
              >
                <textarea
                  required={customWinners}
                  maxLength={2000}
                  value={finalReason}
                  onChange={(e) => setFinalReason(e.target.value)}
                />
              </Field>
              <Button type="submit" disabled={busy}>
                {t(
                  "Confirmar e publicar resultado",
                  "Confirm and publish results",
                )}
              </Button>
            </form>
          )}
          {!!data.winners.length && (
            <>
              <Winners data={data} en={en} />
              {data.winners.map((w) => (
                <div className="challenge-nested" key={w.id}>
                  <h3>
                    {w.placement}º · {w.name} · {w.prize_name}
                  </h3>
                  <p>{w.delivery_notes}</p>
                  <select
                    aria-label={
                      t("Status da entrega de ", "Delivery status for ") +
                      w.name
                    }
                    value={w.delivery_status}
                    disabled={busy}
                    onChange={(e) => {
                      const notes = window.prompt(
                        t("Observações da entrega", "Delivery notes"),
                        w.delivery_notes,
                      );
                      if (notes !== null)
                        void run({
                          action: "delivery",
                          winner_id: w.id,
                          status: e.target.value,
                          notes,
                        });
                    }}
                  >
                    <option value="pending">
                      {t("Entrega pendente", "Delivery pending")}
                    </option>
                    <option value="contacted">
                      {t("Contato realizado", "Contacted")}
                    </option>
                    <option value="delivered">
                      {t("Prêmio entregue", "Delivered")}
                    </option>
                  </select>
                </div>
              ))}
            </>
          )}
        </section>
      )}
      {tab === "audit" && admin && (
        <section className="challenge-panel challenge-stack">
          <h2>{t("Histórico administrativo", "Administrative history")}</h2>
          {data.audit?.map((row) => (
            <article className="challenge-activity" key={row.id}>
              <strong>{row.action}</strong>
              <p>{row.description}</p>
              <small>
                {row.admin_name ||
                  t("Processamento automático", "Automatic processing")}{" "}
                · {challengeDate(row.created_at, locale)}
              </small>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

function Prizes({ data, en }: { data: Detail; en: boolean }) {
  return (
    <section className="challenge-panel challenge-stack">
      <h2>
        <Trophy size={22} />
        {en ? "Prizes" : "Premiações"}
      </h2>
      {data.prizes.map((prize) => (
        <article key={prize.id} className="challenge-prize">
          <span className="challenge-badge">
            {prize.placement}º {en ? "place" : "lugar"}
          </span>
          {prize.image && (
            <img
              src={challengeAssetUrl(prize.image)}
              alt={prize.name}
              loading="lazy"
            />
          )}
          <h3>{prize.name}</h3>
          <p>{prize.description}</p>
          {prize.estimated_value !== null && (
            <small>
              {Number(prize.estimated_value).toLocaleString(
                en ? "en-US" : "pt-BR",
                { style: "currency", currency: "BRL" },
              )}
            </small>
          )}
          <p>{prize.notes}</p>
          <small>{prize.delivery_instructions}</small>
        </article>
      ))}
    </section>
  );
}
function Winners({ data, en }: { data: Detail; en: boolean }) {
  return (
    <section className="challenge-winners challenge-panel">
      <span className="challenge-kicker">
        <CheckCircle2 size={18} />
        {en ? "OFFICIAL RESULTS" : "RESULTADO OFICIAL"}
      </span>
      <h2>
        {en
          ? "Every effort deserves celebration"
          : "Cada esforço merece ser celebrado"}
      </h2>
      <p>{data.challenge.title}</p>
      <div className="challenge-podium">
        {data.winners.map((w) => (
          <article
            className={`challenge-podium-place challenge-place-${w.placement}`}
            key={w.id}
          >
            <span className="challenge-medal">
              {w.placement <= 3 ? (
                ["🥇", "🥈", "🥉"][w.placement - 1]
              ) : (
                <Trophy size={26} />
              )}
            </span>
            <Avatar
              src={w.avatar || undefined}
              fallback={w.name?.slice(0, 2)}
              size="lg"
            />
            <h3>{w.name}</h3>
            <strong>
              {w.placement}º · {w.final_points} pts
            </strong>
            {w.prize_image && (
              <img
                className="challenge-prize-image"
                src={challengeAssetUrl(w.prize_image)}
                alt={w.prize_name}
                loading="lazy"
              />
            )}
            <h4>{w.prize_name}</h4>
            <p>{w.delivery_instructions}</p>
            <span>
              {en
                ? "Congratulations on your achievement!"
                : "Parabéns pela sua conquista!"}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
