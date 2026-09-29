import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';

/** Properties kept from Natural Earth by scripts/build-countries.mjs. */
export interface CountryProps {
  /** ISO 3166-1 alpha-3 where one exists, otherwise Natural Earth's ADM0_A3 (e.g. "KOS"). */
  id: string;
  /** ISO 3166-1 alpha-2, used only to match Cloudflare's visitor country. */
  iso2: string | null;
  name: string;
  nameLong: string;
  /** Natural Earth feature class, e.g. "Sovereign country", "Dependency", "Disputed". */
  type: string;
  sovereign: string;
  labelX: number;
  labelY: number;
}

export type CountryCollection = FeatureCollection<Polygon | MultiPolygon, CountryProps>;

export interface CountryIndex {
  byId: ReadonlyMap<string, CountryProps>;
  byIso2: ReadonlyMap<string, string>;
  /** Sorted by display name. */
  list: readonly CountryProps[];
}

export const DEFAULT_COUNTRY_ID = 'USA';

export function buildCountryIndex(collection: CountryCollection): CountryIndex {
  const byId = new Map<string, CountryProps>();
  const byIso2 = new Map<string, string>();
  for (const { properties } of collection.features) {
    byId.set(properties.id, properties);
    if (properties.iso2) byIso2.set(properties.iso2, properties.id);
  }
  const list = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  return { byId, byIso2, list };
}
