import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PublicHome } from "@/components/public/PublicHome";
export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const en = locale === "en-US";
  const title = en
    ? "Train with direction. Grow with support."
    : "Treine com direção. Evolua com acompanhamento.";
  const description = en
    ? "Workouts, routine and progress with guidance from Nath Ramos. Explore the coaching and a platform designed to organize your day."
    : "Treinos, rotina e evolução com a orientação de Nath Ramos. Conheça o acompanhamento e uma plataforma feita para organizar seu dia.";
  const image = en ? "/hero-ingles-desktop.png" : "/hero-desktop.png";
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}`,
      languages: { "pt-BR": "/pt-BR", "en-US": "/en-US" },
    },
    openGraph: {
      title,
      description,
      locale: en ? "en_US" : "pt_BR",
      images: [{ url: image, alt: "Nath Ramos · Personal Trainer" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
export default async function HomePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const steps = [1, 2, 3].map((i) => ({
    title: t(`step${i}Title`),
    description: t(`step${i}Desc`),
  }));
  const faqs = [1, 2, 3, 4].map((i) => ({
    question: t(`faqQ${i}`),
    answer: t(`faqA${i}`),
  }));
  return <PublicHome locale={locale} steps={steps} faqs={faqs} />;
}
