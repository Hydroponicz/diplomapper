import { describe, expect, it } from 'vitest';
import { INDICATORS, buildProfiles, parseSourceOrganization, parseWbPage, roundValue } from './profiles.mjs';

// Shaped like real World Bank API v2 responses (`[meta, rows]`).
const row = (iso3, date, value) => ({
  indicator: { id: 'X', value: 'X' },
  country: { id: iso3.slice(0, 2), value: iso3 },
  countryiso3code: iso3,
  date: String(date),
  value,
  unit: '',
  obs_status: '',
  decimal: 0,
});

const filler = Array.from({ length: 120 }, (_, i) => `Q${String(i).padStart(2, '0')}`);
const mapIds = ['USA', 'FRA', 'KOS', 'TWN', 'NGA', ...filler];

function fakeDownload(overrides = {}) {
  const series = {};
  const indicatorInfo = {};
  for (const { id } of INDICATORS) {
    series[id] = {
      meta: { page: 1, pages: 1, lastupdated: '2026-07-01' },
      rows: [
        row('USA', 2024, 1234.567),
        row('FRA', 2023, 42.4242),
        row('XKX', 2022, 7), // Kosovo's World Bank code
        row('WLD', 2024, 99999), // aggregate, not on the map
        row('TWN', 2024, null), // no value
        row('NGA', 1960, 26), // decades-old "most recent value"
        ...filler.map((c) => row(c, 2020, 1)),
      ],
    };
    indicatorInfo[id] = { id, name: `WB name ${id}`, sourceOrganization: ` Source org for ${id} ` };
  }
  return { mapIds, series, indicatorInfo, retrievedAt: '2026-09-29', ...overrides };
}

describe('parseWbPage', () => {
  it('returns meta and rows', () => {
    expect(parseWbPage([{ page: 1 }, [1, 2]], 'x').rows).toEqual([1, 2]);
  });
  it('throws on API error messages and bad shapes', () => {
    expect(() => parseWbPage([{ message: [{ id: '120', value: 'Invalid value' }] }], 'x')).toThrow(/Invalid value/);
    expect(() => parseWbPage({}, 'x')).toThrow();
    expect(() => parseWbPage([{ page: 1 }, null], 'x')).toThrow();
  });
});

describe('roundValue', () => {
  it('rounds rates to 2 decimals and counts to integers', () => {
    expect(roundValue(2.34567, 'percent')).toBe(2.35);
    expect(roundValue(1234.6, 'usd')).toBe(1235);
  });
});

describe('buildProfiles', () => {
  const out = buildProfiles(fakeDownload());

  it('keeps the latest value and its year for countries on the map', () => {
    const gdp = out.countries.USA['NY.GDP.MKTP.CD'];
    expect(gdp).toEqual([1235, 2024]);
    expect(out.countries.FRA['NY.GDP.MKTP.KD.ZG']).toEqual([42.42, 2023]);
  });
  it('maps World Bank codes that differ from map ids', () => {
    expect(out.countries.KOS['SP.POP.TOTL']).toEqual([7, 2022]);
  });
  it('leaves missing values out instead of inventing them', () => {
    expect(out.countries.TWN).toEqual({});
    expect(out.countries.WLD).toBeUndefined();
  });
  it('drops figures more than 10 years older than the download', () => {
    expect(out.countries.NGA).toEqual({});
    expect(out.maxAgeYears).toBe(10);
    expect(out.indicators[0].countriesTooOld).toBe(1);
  });
  it('carries source, licence and dates', () => {
    expect(out.sources.wdi).toMatchObject({ license: 'CC BY 4.0', lastUpdated: '2026-07-01', retrievedAt: '2026-09-29' });
    const mil = out.indicators.find((i) => i.id === 'MS.MIL.XPND.CD');
    expect(mil).toMatchObject({ claim: 'compiled', originalSources: ['Source org for MS.MIL.XPND.CD'], latestYear: 2024, source: 'wdi' });
  });
  it('refuses to write when a download is mostly empty', () => {
    const bad = fakeDownload();
    bad.series['SP.POP.TOTL'].rows = [row('USA', 2024, 1)];
    expect(() => buildProfiles(bad)).toThrow(/refusing/);
  });
  it('gives every indicator a claim type and note', () => {
    for (const i of INDICATORS) {
      expect(['official', 'compiled', 'estimate']).toContain(i.claim);
      expect(i.claimNote.length).toBeGreaterThan(10);
    }
  });
});

describe('parseSourceOrganization', () => {
  it('keeps source names and drops URLs, publishers and access dates', () => {
    expect(
      parseSourceOrganization(
        'World Population Prospects, United Nations (UN), uri: https://population.un.org/wpp/, publisher: UN Population Division;\nEurostat: Demographic Statistics, Eurostat (ESTAT), uri: https://ec.europa.eu/x, publisher: Eurostat',
      ),
    ).toEqual(['World Population Prospects, United Nations (UN)', 'Eurostat: Demographic Statistics, Eurostat (ESTAT)']);
    expect(
      parseSourceOrganization('ILO Modelled Estimates database (ILOEST), International Labour Organization (ILO), uri: https://x, publisher: ILOSTAT, type: external database, date accessed: January 17, 2026'),
    ).toEqual(['ILO Modelled Estimates database (ILOEST), International Labour Organization (ILO)']);
    expect(parseSourceOrganization('The Military Balance, International Institute for Strategic Studies')).toEqual([
      'The Military Balance, International Institute for Strategic Studies',
    ]);
    expect(parseSourceOrganization(undefined)).toEqual([]);
  });
});
