import {
  Bell,
  BookOpen,
  CalendarDays,
  CreditCard,
  Droplets,
  Dumbbell,
  FileText,
  House,
  MessageCircle,
  Pill,
  ShoppingBasket,
  TrendingUp,
  UserRound,
  Utensils,
  type LucideIcon,
} from "lucide-react";
export type StudentNavItem = {
  path: string;
  pt: string;
  en: string;
  icon: LucideIcon;
  description: string;
  descriptionEn: string;
};
export const studentNavigation: {
  pt: string;
  en: string;
  items: StudentNavItem[];
}[] = [
  {
    pt: "Sua rotina",
    en: "Your routine",
    items: [
      {
        path: "dashboard",
        pt: "Meu dia",
        en: "My day",
        icon: House,
        description: "Tudo o que importa para hoje",
        descriptionEn: "Everything that matters today",
      },
      {
        path: "treino",
        pt: "Meus treinos",
        en: "My workouts",
        icon: Dumbbell,
        description: "Seu programa e suas séries",
        descriptionEn: "Your program and sets",
      },
      {
        path: "dieta",
        pt: "Alimentação",
        en: "Nutrition",
        icon: Utensils,
        description: "Refeições e plano alimentar",
        descriptionEn: "Meals and nutrition plan",
      },
      {
        path: "suplementos",
        pt: "Suplementos",
        en: "Supplements",
        icon: Pill,
        description: "Suas doses e orientações",
        descriptionEn: "Your doses and guidance",
      },
      {
        path: "hidratacao",
        pt: "Hidratação",
        en: "Hydration",
        icon: Droplets,
        description: "Água, meta e lembretes",
        descriptionEn: "Water, goal and reminders",
      },
    ],
  },
  {
    pt: "Seu acompanhamento",
    en: "Your coaching",
    items: [
      {
        path: "progresso",
        pt: "Minha evolução",
        en: "My progress",
        icon: TrendingUp,
        description: "Registros, resultados e histórico",
        descriptionEn: "Logs, results and history",
      },
      {
        path: "conversas",
        pt: "Minha treinadora",
        en: "My coach",
        icon: MessageCircle,
        description: "Converse sobre seu acompanhamento",
        descriptionEn: "Talk about your coaching",
      },
      {
        path: "reunioes",
        pt: "Meus encontros",
        en: "My meetings",
        icon: CalendarDays,
        description: "Agenda e reuniões",
        descriptionEn: "Schedule and meetings",
      },
      {
        path: "exames",
        pt: "Meus exames",
        en: "My exams",
        icon: FileText,
        description: "Envios e pareceres",
        descriptionEn: "Uploads and reviews",
      },
    ],
  },
  {
    pt: "Para você",
    en: "For you",
    items: [
      {
        path: "ebooks",
        pt: "Minha biblioteca",
        en: "My library",
        icon: BookOpen,
        description: "Conteúdo para a sua jornada",
        descriptionEn: "Content for your journey",
      },
      {
        path: "lista-compras",
        pt: "Lista de compras",
        en: "Shopping list",
        icon: ShoppingBasket,
        description: "Organize os alimentos da dieta",
        descriptionEn: "Organize your diet ingredients",
      },
      {
        path: "notificacoes",
        pt: "Notificações",
        en: "Notifications",
        icon: Bell,
        description: "Atualizações do seu acompanhamento",
        descriptionEn: "Updates about your coaching",
      },
    ],
  },
  {
    pt: "Sua conta",
    en: "Your account",
    items: [
      {
        path: "account",
        pt: "Meu perfil",
        en: "My profile",
        icon: UserRound,
        description: "Dados pessoais e preferências",
        descriptionEn: "Personal details and preferences",
      },
      {
        path: "assinatura",
        pt: "Assinatura e pagamentos",
        en: "Subscription & payments",
        icon: CreditCard,
        description: "Seu plano e suas transações",
        descriptionEn: "Your plan and transactions",
      },
    ],
  },
];
export const studentPrimaryPaths = [
  "dashboard",
  "treino",
  "dieta",
  "progresso",
];
