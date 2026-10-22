/**
 * Rótulos localizados de músculo / equipamento / dificuldade usados pelos
 * componentes de treino (catálogo próprio de exercícios, modais de upsert).
 */

export const MUSCLE_LABELS_PT: Record<string, string> = {
  chest: "Peito", back: "Costas", shoulders: "Ombros", biceps: "Bíceps",
  triceps: "Tríceps", forearms: "Antebraços", core: "Core", abs: "Abdômen",
  obliques: "Oblíquos", quads: "Quadríceps", hamstrings: "Posteriores",
  glutes: "Glúteos", calves: "Panturrilhas", adductors: "Adutores",
  abductors: "Abductores", lower_back: "Lombar", traps: "Trapézio",
  full_body: "Corpo Todo", cardio: "Cardio",
};

export const MUSCLE_LABELS_EN: Record<string, string> = {
  chest: "Chest", back: "Back", shoulders: "Shoulders", biceps: "Biceps",
  triceps: "Triceps", forearms: "Forearms", core: "Core", abs: "Abs",
  obliques: "Obliques", quads: "Quads", hamstrings: "Hamstrings",
  glutes: "Glutes", calves: "Calves", adductors: "Adductors",
  abductors: "Abductors", lower_back: "Lower Back", traps: "Traps",
  full_body: "Full Body", cardio: "Cardio",
};

export const EQUIPMENT_LABELS_PT: Record<string, string> = {
  body_weight: "Peso Corporal", barbell: "Barra", dumbbell: "Halteres",
  kettlebell: "Kettlebell", cable: "Polia", machine: "Máquina",
  smith: "Smith", resistance_band: "Elástico", medicine_ball: "Bola Medicinal",
  bosu_ball: "Bosu", foam_roller: "Rolo de Liberação", treadmill: "Esteira",
  elliptical: "Elíptico", bike: "Bicicleta", rowing: "Remo",
  jump_rope: "Corda", bench: "Banco", pull_up_bar: "Barra Fixa", other: "Outro",
};

export const EQUIPMENT_LABELS_EN: Record<string, string> = {
  body_weight: "Body Weight", barbell: "Barbell", dumbbell: "Dumbbell",
  kettlebell: "Kettlebell", cable: "Cable", machine: "Machine",
  smith: "Smith Machine", resistance_band: "Resistance Band",
  medicine_ball: "Medicine Ball", bosu_ball: "Bosu Ball",
  foam_roller: "Foam Roller", treadmill: "Treadmill", elliptical: "Elliptical",
  bike: "Bike", rowing: "Rowing", jump_rope: "Jump Rope", bench: "Bench",
  pull_up_bar: "Pull Up Bar", other: "Other",
};

export const DIFFICULTY_LABELS_PT: Record<string, string> = {
  beginner: "Iniciante", intermediate: "Intermediário", advanced: "Avançado",
};

export const DIFFICULTY_LABELS_EN: Record<string, string> = {
  beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced",
};

export function getWorkoutLabels(locale: string) {
  const isPt = locale === "pt-BR";
  return {
    muscle: isPt ? MUSCLE_LABELS_PT : MUSCLE_LABELS_EN,
    equipment: isPt ? EQUIPMENT_LABELS_PT : EQUIPMENT_LABELS_EN,
    difficulty: isPt ? DIFFICULTY_LABELS_PT : DIFFICULTY_LABELS_EN,
  };
}
