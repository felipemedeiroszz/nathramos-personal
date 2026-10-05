"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Trash2, Loader2 } from "lucide-react";
import { unassignWorkoutKitAction } from "@/app/actions/workouts";

export interface UnassignWorkoutButtonProps {
  swkId: string;
  locale?: string;
}

export function UnassignWorkoutButton({ swkId, locale = "pt-BR" }: UnassignWorkoutButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  const label = locale === "pt-BR" ? "Desatribuir" : "Unassign";
  const confirmLabel = locale === "pt-BR" ? "Confirmar?" : "Confirm?";

  const handle = () => {
    if (!confirm) {
      setConfirm(true);
      const t = window.setTimeout(() => setConfirm(false), 4000);
      return;
    }
    startTransition(async () => {
      await unassignWorkoutKitAction(swkId);
    });
  };

  return (
    <Button
      type="button"
      variant={confirm ? "destructive" : "ghost"}
      size="sm"
      className="h-8 text-xs"
      onClick={handle}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 size={14} className="mr-1 animate-spin" />
      ) : (
        <Trash2 size={14} className="mr-1" />
      )}
      {confirm ? confirmLabel : label}
    </Button>
  );
}
