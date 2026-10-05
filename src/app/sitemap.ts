import type { MetadataRoute } from "next"
import { locales } from "@/i18n/config"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

const staticRoutes = [
  "",
  "/sobre",
  "/como-funciona",
  "/treinos",
  "/dietas",
  "/desempenho",
  "/mentoria",
  "/planos",
  "/faq",
  "/login",
  "/cadastro",
  "/termos",
  "/privacidade",
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const entries: MetadataRoute.Sitemap = []

  for (const locale of locales) {
    for (const route of staticRoutes) {
      entries.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: route === "" ? 1 : 0.8,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${baseUrl}/${l}${route}`])
          ),
        },
      })
    }
  }

  return entries
}
