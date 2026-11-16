"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Trophy, Users, Flag, Plus, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { ChallengeList as ListData } from "@/lib/challenges";
import {
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

export function ChallengeList({
  initial,
  locale,
  admin = false,
}: {
  initial: ListData;
  locale: string;
  admin?: boolean;
}) {
  const en = locale === "en-US",
    t = (pt: string, english: string) => (en ? english : pt);
  const [data, setData] = useState(initial),
    [view, setView] = useState("all"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [filters, setFilters] = useState({ q: "", from: "", to: "" }),
    [search, setSearch] = useState({ q: "", from: "", to: "" }),
    [offset, setOffset] = useState(0);
  const [creating, setCreating] = useState(false),
    [title, setTitle] = useState("");
  const [start, setStart] = useState(() =>
    dateInput(new Date(Date.now() + 86400000).toISOString()),
  );
  const [end, setEnd] = useState(() =>
    dateInput(new Date(Date.now() + 30 * 86400000).toISOString()),
  );
  const requestId = useRef(crypto.randomUUID()),
    generation = useRef(0);
  const first = useRef(true);
  const load = useCallback(async () => {
    const version = ++generation.current;
    const query = new URLSearchParams({ view, offset: String(offset) });
    if (filters.q) query.set("q", filters.q);
    if (filters.from) query.set("from", dateISO(filters.from + "T00:00"));
    if (filters.to)
      query.set(
        "to",
        new Date(
          Date.parse(dateISO(filters.to + "T00:00")) + 86400000,
        ).toISOString(),
      );
    try {
      const result = await challengeRequest("?" + query);
      if (version === generation.current) {
        setData(result);
        setError("");
      }
    } catch (error) {
      setError((error as Error).message);
    }
  }, [view, filters, offset]);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    void load();
  }, [load]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (
        !document.hidden &&
        !creating &&
        !document.activeElement?.closest("input,select,textarea")
      )
        void load();
    }, 15000);
    return () => clearInterval(timer);
  }, [load, creating]);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await challengeSend({
        action: "create",
        title,
        start_date: dateISO(start),
        end_date: dateISO(end),
        request_id: requestId.current,
      });
      window.location.assign(`/${locale}/admin/desafios/${result.id}?edit=1`);
    } catch (error) {
      setError((error as Error).message);
      setBusy(false);
    }
  }
  return (
    <main className="challenges-page challenge-stack">
      <header className="challenge-heading">
        <div>
          <span className="challenge-kicker">
            <Flag size={16} />
            {t("EVOLUA A CADA CONQUISTA", "GROW WITH EVERY WIN")}
          </span>
          <h1>
            {admin
              ? t("Gerenciar desafios", "Challenge management")
              : t("Desafios", "Challenges")}
          </h1>
          <p>
            {admin
              ? t(
                  "Crie experiências, acompanhe a evolução e celebre os resultados.",
                  "Build experiences, follow progress and celebrate results.",
                )
              : t(
                  "Escolha seu próximo objetivo e conquiste mais, junto com a comunidade.",
                  "Choose your next goal and grow with your community.",
                )}
          </p>
        </div>
        {admin && (
          <Button onClick={() => setCreating(!creating)}>
            <Plus size={17} />
            {t("Novo desafio", "New challenge")}
          </Button>
        )}
      </header>
      {creating && (
        <form
          className="challenge-panel challenge-form-grid"
          onSubmit={(e) => void create(e)}
          data-panel-editing="true"
        >
          <Field title={t("Nome do desafio", "Challenge title")}>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={150}
            />
          </Field>
          <Field title={t("Início · Brasília", "Starts · Brasília")}>
            <Input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              required
            />
          </Field>
          <Field title={t("Fim · Brasília", "Ends · Brasília")}>
            <Input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              required
            />
          </Field>
          <Button type="submit" disabled={busy}>
            {t("Criar rascunho", "Create draft")}
          </Button>
        </form>
      )}
      {admin && data.metrics && (
        <section className="challenge-metrics">
          {[
            [t("Desafios criados", "Challenges"), data.metrics.total],
            [t("Ativos", "Active"), data.metrics.active],
            [t("Encerrados", "Ended"), data.metrics.ended],
            [t("Participações", "Enrollments"), data.metrics.participants],
            [
              t("Metas cumpridas", "Goal completions"),
              data.metrics.completed_goals,
            ],
          ].map(([label, value]) => (
            <div className="challenge-panel" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </section>
      )}
      <section className="challenge-panel challenge-stack">
        <div className="challenge-tabs">
          {[
            ["all", t("Disponíveis", "Available")],
            ["ongoing", t("Em andamento", "In progress")],
            ["future", t("Futuros", "Upcoming")],
            ["completed", t("Concluídos", "Ended")],
            ...(!admin ? [["mine", t("Meus desafios", "My challenges")]] : []),
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={view === value}
              onClick={() => {
                setOffset(0);
                setView(value);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <form
          className="challenge-filters"
          onSubmit={(e) => {
            e.preventDefault();
            setOffset(0);
            setFilters(search);
          }}
        >
          <Field title={t("Buscar desafio", "Search challenge")}>
            <Input
              value={search.q}
              onChange={(e) => setSearch({ ...search, q: e.target.value })}
              maxLength={150}
            />
          </Field>
          {admin && (
            <>
              <Field title={t("Criado a partir de", "Created from")}>
                <Input
                  type="date"
                  value={search.from}
                  onChange={(e) =>
                    setSearch({ ...search, from: e.target.value })
                  }
                />
              </Field>
              <Field title={t("Criado até", "Created through")}>
                <Input
                  type="date"
                  value={search.to}
                  onChange={(e) => setSearch({ ...search, to: e.target.value })}
                />
              </Field>
            </>
          )}
          <Button type="submit" variant="secondary">
            {t("Filtrar", "Filter")}
          </Button>
        </form>
      </section>
      <section className="challenge-card-grid">
        {data.items.slice(0, 20).map((challenge) => (
          <article className="challenge-tile" key={challenge.id}>
            <div className="challenge-tile-cover">
              {challenge.cover_image ? (
                <img
                  src={challengeAssetUrl(challenge.cover_image)}
                  alt={challenge.title}
                  loading="lazy"
                />
              ) : (
                <div className="challenge-cover-empty">
                  <Trophy size={58} />
                </div>
              )}
              <span className="challenge-badge">
                {statusName(challenge, en)}
              </span>
            </div>
            <div className="challenge-tile-body">
              <small>
                {categoryNames[challenge.category]?.[en ? 1 : 0] ||
                  challenge.category}
              </small>
              <h2>{challenge.title}</h2>
              <p className="challenge-clamp">{challenge.description}</p>
              <p className="challenge-meta">
                <CalendarDays size={15} />
                {challengeDate(challenge.start_date, locale)} —{" "}
                {challengeDate(challenge.end_date, locale)}
              </p>
              <p className="challenge-meta">
                <Users size={15} />
                {challenge.participant_count}{" "}
                {t("participantes", "participants")}
                {challenge.max_participants
                  ? ` / ${challenge.max_participants}`
                  : ""}
              </p>
              <p className="challenge-meta">
                <Trophy size={15} />
                {challenge.prizes?.map((p) => p.name).join(" · ") ||
                  t("Premiação em configuração", "Prizes being configured")}
              </p>
              <div className="challenge-between">
                <span>
                  {challenge.winner_count} {t("ganhador(es)", "winner(s)")}
                </span>
                {challenge.my_status && (
                  <span className="challenge-badge">
                    {challenge.my_status === "active"
                      ? t("Participando", "Enrolled")
                      : challenge.my_status === "pending"
                        ? t("Inscrição em análise", "Enrollment pending")
                        : t("Inscrição encerrada", "Enrollment ended")}
                  </span>
                )}
              </div>
              {view === "mine" && (
                <div className="challenge-stack">
                  <div className="challenge-between">
                    <strong>
                      {challenge.my_rank?.rank_position || "—"}º ·{" "}
                      {challenge.my_rank?.total_points || 0} pts
                    </strong>
                    <small>
                      {Math.max(
                        0,
                        Math.ceil(
                          (Date.parse(challenge.end_date) - Date.now()) /
                            86400000,
                        ),
                      )}{" "}
                      {t("dias restantes", "days remaining")}
                    </small>
                  </div>
                  <progress
                    max={100}
                    value={challenge.my_rank?.progress || 0}
                  />
                  <small>
                    {challenge.my_rank?.completed_goals || 0}/
                    {challenge.goal_count || 0}{" "}
                    {t("metas concluídas", "goals completed")} ·{" "}
                    {Math.max(
                      0,
                      (challenge.goal_count || 0) -
                        (challenge.my_rank?.completed_goals || 0),
                    )}{" "}
                    {t("pendentes", "pending")}
                  </small>
                </div>
              )}
              <Link
                className="challenge-link"
                href={`/${locale}/${admin ? "admin/" : ""}desafios/${challenge.id}`}
              >
                {t("Ver desafio", "View challenge")} →
              </Link>
            </div>
          </article>
        ))}
      </section>
      {!data.items.length && (
        <section className="challenge-panel challenge-empty">
          <Trophy size={36} />
          <h2>{t("Sua próxima conquista vem aí", "Your next win is ahead")}</h2>
          <p>
            {t(
              "Nenhum desafio encontrado para este filtro.",
              "No challenges match this filter.",
            )}
          </p>
        </section>
      )}
      <div className="challenge-between">
        <Button
          variant="secondary"
          disabled={!offset}
          onClick={() => setOffset(Math.max(0, offset - 20))}
        >
          {t("Anterior", "Previous")}
        </Button>
        <Button
          variant="secondary"
          disabled={data.items.length <= 20}
          onClick={() => setOffset(offset + 20)}
        >
          {t("Próximos", "Next")}
        </Button>
      </div>
      {admin && (
        <section className="challenge-dashboard-grid">
          <div className="challenge-panel">
            <h2>{t("Maior engajamento", "Most engaged challenges")}</h2>
            {data.engagement?.map((row) => (
              <Link
                key={row.id}
                className="challenge-dashboard-row"
                href={`/${locale}/admin/desafios/${row.id}`}
              >
                <span>{row.title}</span>
                <strong>{row.participants}</strong>
              </Link>
            ))}
          </div>
          <div className="challenge-panel">
            <h2>
              {t("Participantes mais ativos", "Most active participants")}
            </h2>
            {data.most_active?.map((row) => (
              <p key={row.user_id} className="challenge-dashboard-row">
                <span>{row.name}</span>
                <strong>{row.activities}</strong>
              </p>
            ))}
          </div>
          <div className="challenge-panel">
            <h2>{t("Ganhadores recentes", "Recent winners")}</h2>
            {data.recent_winners?.map((row, i) => (
              <p key={i} className="challenge-dashboard-row">
                <span>
                  {row.name}
                  <small>{row.title}</small>
                </span>
                <strong>{row.placement}º</strong>
              </p>
            ))}
          </div>
        </section>
      )}
      {error && (
        <p role="alert" className="challenge-error">
          {error}
        </p>
      )}
    </main>
  );
}
