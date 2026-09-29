// Types and presentation helpers for src/data/profiles.json (built by scripts/build-profiles.mjs).

export type ClaimType = 'official' | 'compiled' | 'estimate';
export type IndicatorGroup = 'people' | 'economy' | 'military';
export type IndicatorFormat = 'count' | 'usd' | 'percent' | 'percentOfGdp';

export interface SourceInfo {
  name: string;
  publisher: string;
  url: string;
  license: string;
  licenseUrl: string;
  lastUpdated: string | null;
  retrievedAt: string;
}

export interface IndicatorMeta {
  id: string;
  label: string;
  group: IndicatorGroup;
  format: IndicatorFormat;
  claim: ClaimType;
  claimNote: string;
  /** The World Bank's own name for the series. */
  name: string;
  /** Organisations the World Bank credits for the figures, e.g. SIPRI. */
  originalSources: string[];
  url: string;
  source: string;
  /** Most recent year any country has data for. */
  latestYear: number;
  countriesWithData: number;
  countriesTooOld: number;
}

export interface ProfilesData {
  generatedAt: string;
  /** Figures older than this many years before `generatedAt` were left out by the pipeline. */
  maxAgeYears: number;
  sources: Record<string, SourceInfo>;
  indicators: IndicatorMeta[];
  /** Per map country id: indicator id -> [value, year]. Missing indicators have no data. */
  countries: Record<string, Record<string, [number, number]>>;
}

export interface FactRow {
  indicator: IndicatorMeta;
  source: SourceInfo | undefined;
  /** null when the source has no figure for this country. */
  value: number | null;
  year: number | null;
  /** Figure is from more than OLD_AFTER_YEARS before the data was retrieved. */
  isOld: boolean;
  /** No country has a recent figure in this series (the whole series has stopped updating). */
  seriesIsOld: boolean;
}

export const GROUP_LABELS: Record<IndicatorGroup, string> = {
  people: 'People',
  economy: 'Economy',
  military: 'Military',
};

export const CLAIM_LABELS: Record<ClaimType, string> = {
  official: 'Official statistics',
  compiled: 'Compiled; may include estimates',
  estimate: 'Estimate',
};

/** The World Bank usually lags one or two years; anything older than this is flagged. */
export const OLD_AFTER_YEARS = 3;

export function countryFacts(data: ProfilesData, countryId: string): Record<IndicatorGroup, FactRow[]> {
  const values = data.countries[countryId] ?? {};
  const groups: Record<IndicatorGroup, FactRow[]> = { people: [], economy: [], military: [] };
  const retrievedYear = Number(data.generatedAt.slice(0, 4));
  for (const indicator of data.indicators) {
    const entry = values[indicator.id];
    groups[indicator.group].push({
      indicator,
      source: data.sources[indicator.source],
      value: entry ? entry[0] : null,
      year: entry ? entry[1] : null,
      isOld: entry ? retrievedYear - entry[1] > OLD_AFTER_YEARS : false,
      seriesIsOld: retrievedYear - indicator.latestYear > OLD_AFTER_YEARS,
    });
  }
  return groups;
}

const SCALES: [number, string][] = [
  [1e12, 'trillion'],
  [1e9, 'billion'],
  [1e6, 'million'],
];

function scaled(value: number): string {
  const abs = Math.abs(value);
  for (const [size, word] of SCALES) {
    if (abs >= size) {
      const n = value / size;
      return `${n.toLocaleString('en-US', { maximumFractionDigits: Math.abs(n) < 10 ? 2 : 1 })} ${word}`;
    }
  }
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function formatValue(value: number, format: IndicatorFormat): string {
  switch (format) {
    case 'usd':
      return `${value < 0 ? '−' : ''}$${scaled(Math.abs(value))}`;
    case 'count':
      return scaled(value);
    case 'percent':
      return `${value.toLocaleString('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`;
    case 'percentOfGdp':
      return `${value.toLocaleString('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}% of GDP`;
  }
}

/** World Bank indicator page filtered to one country, when the World Bank covers it. */
export function indicatorUrl(indicator: IndicatorMeta, wbCode: string | null): string {
  return wbCode ? `${indicator.url}?locations=${wbCode}` : indicator.url;
}
