"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Plus, AlertCircle } from "lucide-react";
import { WorkoutScheduleModal } from "./WorkoutScheduleModal";
import type { WorkoutKitRow } from "@/types";
import { Tooltip } from "@/components/ui/Tooltip";

export interface AssignWorkoutKitModalClientProps {
  today?: string;
  nextStart?: string;
  capacity?: number;
  studentId: string;
  kits: WorkoutKitRow[];
  locale?: string;
  disabled?: boolean;
  disabledReason?: string;
}

export function AssignWorkoutKitModalClient({
  studentId,
  kits,
  today = new Date().toISOString().slice(0, 10),
  nextStart = today,
  capacity = 6,
  locale = "pt-BR",
  disabled = false,
  disabledReason,
}: AssignWorkoutKitModalClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const label = locale === "pt-BR" ? "Programar kits" : "Schedule kits";

  const btn = (
    <Button
      type="button"
      variant="primary"
      size="md"
      onClick={() => !disabled && setIsOpen(true)}
      disabled={disabled}
    >
      <Plus size={16} className="mr-1.5" />
      {label}
    </Button>
  );

  const wrapped =
    disabled && disabledReason ? (
      <Tooltip content={disabledReason}>{btn}</Tooltip>
    ) : (
      btn
    );

  return (
    <>
      {wrapped}
      {isOpen && (
        <WorkoutScheduleModal
          studentId={studentId}
          kits={kits}
          locale={locale}
          today={today}
          nextStart={nextStart}
          capacity={capacity}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
