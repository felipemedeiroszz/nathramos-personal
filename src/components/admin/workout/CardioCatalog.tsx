"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { saveCardioActivityAction } from "@/app/actions/cardio";
import type { CardioActivity } from "@/lib/cardio";
export function CardioCatalog({
  activities,
  locale,
}: {
  activities: CardioActivity[];
  locale: string;
}) {
  const en = locale === "en-US",
    router = useRouter(),
    [editing, setEditing] = useState<CardioActivity | null>(null),
    [pt, setPt] = useState(""),
    [english, setEnglish] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function save(input: unknown) {
    if (busy) return;
    setBusy(true);
    try {
      const r = await saveCardioActivityAction(input);
      setMessage(
        r.success ? (en ? "Saved." : "Salvo com sucesso.") : r.message,
      );
      if (r.success) {
        setEditing(null);
        setPt("");
        setEnglish("");
        router.refresh();
      }
    } catch {
      setMessage(en ? "Could not save." : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <form
        className="rounded-2xl border border-border bg-surface p-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save({
            id: editing?.id,
            name_pt: pt,
            name_en: english,
            is_active: editing?.is_active ?? true,
          });
        }}
      >
        <h2 className="font-semibold">
          {editing
            ? en
              ? "Edit activity"
              : "Editar modalidade"
            : en
              ? "New activity"
              : "Nova modalidade"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            {en ? "Name in Portuguese" : "Nome em português"}
            <Input
              required
              maxLength={100}
              value={pt}
              onChange={(e) => setPt(e.target.value)}
            />
          </label>
          <label className="text-sm">
            {en ? "Name in English" : "Nome em inglês"}
            <Input
              required
              maxLength={100}
              value={english}
              onChange={(e) => setEnglish(e.target.value)}
            />
          </label>
        </div>
        <div className="flex gap-3">
          <Button disabled={busy}>{en ? "Save" : "Salvar"}</Button>
          {editing && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setEditing(null);
                setPt("");
                setEnglish("");
              }}
            >
              {en ? "Cancel" : "Cancelar"}
            </Button>
          )}
        </div>
      </form>
      {message && <p role="status">{message}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {activities.map((a) => (
          <article
            key={a.id}
            className="rounded-2xl border border-border bg-surface p-5 space-y-4"
          >
            <div>
              <h3 className="font-bold">{en ? a.name_en : a.name_pt}</h3>
              <p className="text-sm text-text-secondary">
                {a.is_active
                  ? en
                    ? "Available to students"
                    : "Disponível para alunos"
                  : en
                    ? "Archived"
                    : "Arquivada"}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setEditing(a);
                  setPt(a.name_pt);
                  setEnglish(a.name_en);
                }}
              >
                {en ? "Edit" : "Editar"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void save({ ...a, is_active: !a.is_active })}
              >
                {a.is_active
                  ? en
                    ? "Archive"
                    : "Arquivar"
                  : en
                    ? "Reactivate"
                    : "Reativar"}
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
