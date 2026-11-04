/** Preserve localized paths and reject executable or protocol-relative URLs. */
export function contentHref(value: string, locale: string): string | null {
  const url = value.trim();
  if (!url || /[\u0000-\u0020\\]/.test(url)) return null;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(url)) return url;
  if (url.startsWith("//") || /^[a-z][a-z\d+.-]*:/i.test(url)) return null;
  if (url.startsWith("#")) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return /^\/(pt-BR|en-US)(\/|$|[?#])/.test(path) ? path : `/${locale}${path}`;
}
