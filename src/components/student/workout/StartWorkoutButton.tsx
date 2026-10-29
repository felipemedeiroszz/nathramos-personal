"use client";
import { useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { startWorkoutSessionAction } from "@/app/actions/workouts";
export function StartWorkoutButton({
  dayId,
  programId,
}: {
  dayId: string;
  programId: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const router = useRouter(),
    en = useLocale() === "en-US";
  return (
    <div className="space-y-3">
      <Button
        className="min-h-12 w-full sm:w-auto"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const result = await startWorkoutSessionAction({
              dayId,
              programId,
            });
            if (result.success) router.refresh();
            else setError(result.message);
          } catch {
            setError(
              en
                ? "Could not start your workout. Try again."
                : "Não foi possível iniciar o treino. Tente novamente.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Play size={16} />
        )}{" "}
        {busy
          ? en
            ? "Starting…"
            : "Iniciando…"
          : en
            ? "Start workout"
            : "Iniciar treino"}
      </Button>
      <p role="status" className="text-xs text-rose-300">
        {error}
      </p>
    </div>
  );
}
