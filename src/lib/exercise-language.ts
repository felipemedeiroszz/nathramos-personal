import type { ExerciseDbExercise } from "./exercisedb";
import names from "../data/exercise-names-portuguese.json";
const normalizeName = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");
const namesById = new Map(names.map((row) => [row.id, row.namePt]));
const namesByEnglish = new Map(
  names.map((row) => [normalizeName(row.nameEn), row.namePt]),
);

const terms: Record<string, string> = {
  back: "Costas",
  chest: "Peito",
  shoulders: "Ombros",
  "upper arms": "Braços",
  "lower arms": "Antebraços",
  "upper legs": "Coxas",
  "lower legs": "Pernas",
  waist: "Cintura",
  neck: "Pescoço",
  cardio: "Cardio",
  cardiovascular: "Cardiovascular",
  abs: "Abdominais",
  abdominals: "Abdominais",
  biceps: "Bíceps",
  triceps: "Tríceps",
  deltoids: "Deltoides",
  delts: "Deltoides",
  pectorals: "Peitorais",
  quads: "Quadríceps",
  quadriceps: "Quadríceps",
  hamstrings: "Posteriores da coxa",
  glutes: "Glúteos",
  calves: "Panturrilhas",
  soleus: "Sóleo",
  gastrocnemius: "Gastrocnêmio",
  forearms: "Antebraços",
  traps: "Trapézio",
  trapezius: "Trapézio",
  lats: "Dorsais",
  latissimus: "Dorsais",
  "latissimus dorsi": "Latíssimo do dorso",
  adductors: "Adutores",
  abductors: "Abdutores",
  "erector spinae": "Eretores da coluna",
  "levator scapulae": "Elevador da escápula",
  "serratus anterior": "Serrátil anterior",
  "hip flexors": "Flexores do quadril",
  "lower back": "Lombar",
  "upper back": "Parte superior das costas",
  spine: "Coluna",
  obliques: "Oblíquos",
  core: "Centro do corpo",
  "full body": "Corpo inteiro",
  rhomboids: "Romboides",
  "rotator cuff": "Manguito rotador",
  "tibialis anterior": "Tibial anterior",
  bodyweight: "Peso corporal",
  "body weight": "Peso corporal",
  barbell: "Barra",
  dumbbell: "Halter",
  kettlebell: "Kettlebell",
  cable: "Cabo",
  band: "Elástico",
  "resistance band": "Elástico de resistência",
  "leverage machine": "Máquina de alavanca",
  "lever machine": "Máquina de alavanca",
  machine: "Máquina",
  "smith machine": "Máquina Smith",
  smith: "Smith",
  "stability ball": "Bola suíça",
  "exercise ball": "Bola de exercícios",
  "medicine ball": "Bola medicinal",
  "bosu ball": "Bola Bosu",
  roller: "Rolo",
  "foam roller": "Rolo de liberação",
  "ez barbell": "Barra EZ",
  "ez bar": "Barra EZ",
  "olympic barbell": "Barra olímpica",
  "trap bar": "Barra hexagonal",
  weighted: "Carga adicional",
  assisted: "Assistência",
  rope: "Corda",
  "skierg machine": "Máquina SkiErg",
  "ski ergometer": "Ergômetro de esqui",
  "elliptical machine": "Elíptico",
  "stationary bike": "Bicicleta ergométrica",
  "stepmill machine": "Escada ergométrica",
  treadmill: "Esteira",
  "wheel roller": "Roda abdominal",
  "sled machine": "Máquina de trenó",
  hammer: "Martelo",
  tire: "Pneu",
  "steppmill machine": "Escada ergométrica",
  "upper body ergometer": "Ergômetro de braços",
  bench: "Banco",
  "pull-up bar": "Barra fixa",
  "suspension trainer": "Fita de suspensão",
  other: "Outro",
};
export function exerciseTerm(value: string, locale: string) {
  return locale === "pt-BR"
    ? terms[value.trim().toLowerCase().replaceAll("_", " ")] || value
    : value;
}
export function exerciseContent(exercise: ExerciseDbExercise, locale: string) {
  return {
    name:
      locale === "pt-BR"
        ? namesById.get(exercise.exerciseId) ||
          namesByEnglish.get(normalizeName(exercise.name)) ||
          exercise.namePt ||
          exercise.name
        : exercise.name,
    instructions:
      locale === "pt-BR"
        ? exercise.instructionsPt || exercise.instructions
        : exercise.instructions,
  };
}
