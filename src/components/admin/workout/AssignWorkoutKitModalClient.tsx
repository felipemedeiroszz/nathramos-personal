"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Plus, AlertCircle } from "lucide-react";
import { AssignWorkoutKitModal } from "./AssignWorkoutKitModal";
import type { WorkoutKitRow, WorkoutProgramRow } from "@/types";
import { Tooltip } from "@/components/ui/Tooltip";

export interface AssignWorkoutKitModalClientProps {
  studentId: string;
  kits: WorkoutKitRow[];
  programs: WorkoutProgramRow[];
  locale?: string;
  disabled?: boolean;
  disabledReason?: string;
}

export function AssignWorkoutKitModalClient({
  studentId,
  kits,
  programs,
  locale = "pt-BR",
  disabled = false,
  disabledReason,
}: AssignWorkoutKitModalClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const label = locale === "pt-BR" ? "Atribuir novo" : "Assign new";

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
      <Tooltip content={disabledReason}>
        {btn}
      </Tooltip>
    ) : (
      btn
    );

  return (
    <>
      {wrapped}
      <AssignWorkoutKitModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        student_id={studentId}
        kits={kits}
        programs={programs}
      />
    </>
  );
}
