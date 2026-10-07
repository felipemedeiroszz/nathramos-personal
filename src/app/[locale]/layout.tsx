import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales } from "@/i18n/config";
import "../globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  title: {
    default: "Nath Ramos — Personal Trainer",
    template: "%s | Nath Ramos",
  },
  description:
    "Acompanhamento fitness personalizado com treinos, dietas, hidratação, suplementação e mentoria.",
  applicationName: "Nath Ramos Personal Trainer",
  authors: [{ name: "Nath Ramos" }],
  keywords: [
    "personal trainer",
    "treino personalizado",
    "dieta",
    "hidratação",
    "suplementação",
    "mentoria fitness",
    "academia",
    "hipertrofia",
    "emagrecimento",
  ],
  icons: {
    icon: "/logo.png",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nath Ramos",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    title: "Nath Ramos — Personal Trainer",
    description:
      "Acompanhamento fitness personalizado com treinos, dietas e mentoria.",
    siteName: "Nath Ramos Personal Trainer",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nath Ramos — Personal Trainer",
    description:
      "Acompanhamento fitness personalizado com treinos, dietas e mentoria.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: Readonly<{
  children: React.ReactNode;
  params: { locale: string };
}>) {
  if (!locales.includes(locale as any)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <body className={cn("min-h-dvh bg-background", inter.variable)}>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
