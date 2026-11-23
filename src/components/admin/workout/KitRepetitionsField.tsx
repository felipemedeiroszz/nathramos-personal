"use client";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { saveKitItemRepetitionsAction } from "@/app/actions/workouts";
export function KitRepetitionsField({
  itemId,
  value,
  locale,
  onSaved,
}: {
  itemId: string;
  value: string | null;
  locale: string;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState(/^\d+$/.test(value || "") ? value! : ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => setDraft(/^\d+$/.test(value || "") ? value! : ""), [value]);
  const en = locale === "en-US";
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Input
          aria-label={en ? "Repetitions per set" : "Repetições por série"}
          className="w-20 h-9"
          type="number"
          min={1}
          max={1000}
          step={1}
          value={draft}
          placeholder="—"
          disabled={busy}
          onChange={(event) => setDraft(event.target.value)}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={
            busy ||
            !/^\d+$/.test(draft) ||
            Number(draft) < 1 ||
            Number(draft) > 1000 ||
            draft === value
          }
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const result = await saveKitItemRepetitionsAction(
                itemId,
                Number(draft),
                value,
              );
              if (result.success) onSaved();
              else setError(result.message);
            } catch {
              setError(
                en
                  ? "Could not save. Try again."
                  : "Não foi possível salvar. Tente novamente.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "…" : en ? "Save" : "Salvar"}
        </Button>
      </div>
      {value && !/^\d+$/.test(value) && (
        <p className="text-xs text-text-secondary">
          {en ? "Current" : "Atual"}: {value}
        </p>
      )}
      {error && (
        <p role="alert" className="max-w-56 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
