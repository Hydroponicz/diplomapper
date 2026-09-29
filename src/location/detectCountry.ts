import { normalizeVisitorCountry } from '../core/visitorCountry';

const ENDPOINT = '/api/country';
const TIMEOUT_MS = 4000;

/**
 * Asks our Cloudflare Pages Function which country the request came from.
 * Country level only: no browser geolocation, no third-party lookup, no IP returned.
 *
 * Resolves to null whenever the answer isn't available, including in `vite dev`, where
 * `/api/country` is served by the SPA fallback as HTML rather than JSON.
 */
export async function detectVisitorCountry(): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
      credentials: 'omit',
    });
    if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) return null;
    const body: unknown = await res.json();
    return normalizeVisitorCountry((body as { country?: unknown } | null)?.country);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
