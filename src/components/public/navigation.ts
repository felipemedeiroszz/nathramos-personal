import { Activity, Dumbbell, MessageCircle, Utensils } from "lucide-react";
export const publicServices = [
  {
    path: "treinos",
    pt: "Treinos",
    en: "Workouts",
    detailPt: "Direção para cada treino.",
    detailEn: "Direction for every workout.",
    icon: Dumbbell,
  },
  {
    path: "dietas",
    pt: "Alimentação",
    en: "Nutrition",
    detailPt: "Sua rotina alimentar organizada.",
    detailEn: "Your nutrition routine, organized.",
    icon: Utensils,
  },
  {
    path: "desempenho",
    pt: "Evolução",
    en: "Progress",
    detailPt: "Registros que contam sua jornada.",
    detailEn: "Logs that tell your story.",
    icon: Activity,
  },
  {
    path: "mentoria",
    pt: "Mentoria",
    en: "Coaching",
    detailPt: "Orientação para seguir em frente.",
    detailEn: "Guidance to keep moving forward.",
    icon: MessageCircle,
  },
];
export const publicLinks = [
  { path: "sobre", pt: "A Nath", en: "About Nath" },
  { path: "como-funciona", pt: "Como funciona", en: "How it works" },
  { path: "planos", pt: "O plano", en: "The plan" },
  { path: "faq", pt: "Dúvidas", en: "FAQ" },
];
