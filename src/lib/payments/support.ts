import "server-only";
import { getPublicPlatformSettings } from "@/services/PlatformSettingsService";
export async function paymentSupportHref(locale: string) {
  const settings = await getPublicPlatformSettings();
  if (/^[1-9]\d{7,14}$/.test(settings.support_whatsapp))
    return `https://wa.me/${settings.support_whatsapp}`;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.support_email))
    return `mailto:${settings.support_email}`;
  return `/${locale}/faq`;
}
