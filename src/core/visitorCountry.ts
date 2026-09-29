// Shared by the Cloudflare Pages Function (functions/api/country.ts) and the browser.
// Keep this file free of DOM and Workers APIs.

/**
 * Cloudflare reports "XX" when the country is unknown and "T1" for Tor exit nodes.
 * Anything that isn't a plain ISO 3166-1 alpha-2 code is treated as "no country".
 */
export function normalizeVisitorCountry(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code) || code === 'XX') return null;
  return code;
}
