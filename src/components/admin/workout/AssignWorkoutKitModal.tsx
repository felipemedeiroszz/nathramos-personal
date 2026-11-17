"use client";
import { WorkoutScheduleModal } from "./WorkoutScheduleModal";
import type { WorkoutKitRow } from "@/types";
interface AssignWorkoutKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  student_id: string;
  student_label?: string;
  kits?: WorkoutKitRow[];
  locale?: string;
  today?: string;
  onSuccess?: () => void | Promise<void>;
}
export function AssignWorkoutKitModal({
  isOpen,
  onClose,
  student_id,
  kits = [],
  locale = "pt-BR",
  today = new Date().toISOString().slice(0, 10),
}: AssignWorkoutKitModalProps) {
  return isOpen ? (
    <WorkoutScheduleModal
      studentId={student_id}
      kits={kits}
      locale={locale}
      today={today}
      nextStart={today}
      onClose={onClose}
    />
  ) : null;
}
export default AssignWorkoutKitModal;
