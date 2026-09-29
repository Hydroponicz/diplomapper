import { DEFAULT_COUNTRY_ID, type CountryIndex } from './countries';

/**
 * Where the current selection came from. Priority on load is:
 * URL (`?c=`) > visitor country (detected) > default (USA).
 * `map` and `list` are manual choices by the user and are never overridden automatically.
 */
export type SelectionSource = 'url' | 'detected' | 'default' | 'map' | 'list';

export const COUNTRY_PARAM = 'c';

export function isManualSource(source: SelectionSource): boolean {
  return source === 'map' || source === 'list';
}

/** Reads `?c=XXX` from a query string. Returns an upper-case code or null. */
export function readCountryParam(search: string): string | null {
  const raw = new URLSearchParams(search).get(COUNTRY_PARAM);
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : null;
}

/** Returns `href` with `?c=` set to `id`, keeping any other params and the hash. */
export function withCountryParam(href: string, id: string): string {
  const url = new URL(href);
  url.searchParams.set(COUNTRY_PARAM, id);
  return url.toString();
}

/** Returns `href` without `?c=`. */
export function withoutCountryParam(href: string): string {
  const url = new URL(href);
  url.searchParams.delete(COUNTRY_PARAM);
  return url.toString();
}

/** A URL selection wins if it names a known country; otherwise fall back to the default. */
export function resolveInitialSelection(
  urlId: string | null,
  index: CountryIndex,
): { id: string; source: SelectionSource } {
  if (urlId && index.byId.has(urlId)) return { id: urlId, source: 'url' };
  return { id: DEFAULT_COUNTRY_ID, source: 'default' };
}

/**
 * The detected visitor country only replaces the USA default. It never replaces a URL
 * selection or anything the user picked, even if detection resolves late.
 */
export function detectedSelection(
  iso2: string | null,
  currentSource: SelectionSource,
  index: CountryIndex,
): string | null {
  if (!iso2 || currentSource !== 'default') return null;
  return index.byIso2.get(iso2) ?? null;
}
