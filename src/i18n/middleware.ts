import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./config";

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
});

export const config = {
  matcher: ["/", "/(pt-BR|en-US)/:path*"],
};
