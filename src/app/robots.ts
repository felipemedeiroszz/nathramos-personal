import type { MetadataRoute } from "next"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pt-BR", "/en-US"],
        disallow: [
          "/dashboard",
          "/treino",
          "/dieta",
          "/desempenho",
          "/suplementos",
          "/hidratacao",
          "/exames",
          "/ebooks",
          "/lista-compras",
          "/mentoria",
          "/account",
          "/admin",
          "/api",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
