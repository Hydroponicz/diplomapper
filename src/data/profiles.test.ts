import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { CountryCollection } from '../core/countries';
import type { ProfilesData } from '../core/profiles';

const read = <T>(file: string) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8')) as T;
const profiles = read<ProfilesData>('./profiles.json');
const mapIds = new Set(read<CountryCollection>('./countries.json').features.map((f) => f.properties.id));

describe('committed World Bank profile data', () => {
  it('names a source with licence and dates', () => {
    for (const s of Object.values(profiles.sources)) {
      expect(s.license).toBeTruthy();
      expect(s.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
  it('gives every indicator a known source, claim type and note', () => {
    for (const i of profiles.indicators) {
      expect(profiles.sources[i.source]).toBeDefined();
      expect(['official', 'compiled', 'estimate']).toContain(i.claim);
      expect(i.claimNote).toBeTruthy();
    }
  });
  it('only has countries that are on the map, each value with a plausible year', () => {
    const indicatorIds = new Set(profiles.indicators.map((i) => i.id));
    for (const [id, values] of Object.entries(profiles.countries)) {
      expect(mapIds.has(id)).toBe(true);
      for (const [indicatorId, [value, year]] of Object.entries(values)) {
        expect(indicatorIds.has(indicatorId)).toBe(true);
        expect(Number.isFinite(value)).toBe(true);
        expect(year).toBeGreaterThanOrEqual(Number(profiles.generatedAt.slice(0, 4)) - profiles.maxAgeYears);
        expect(year).toBeLessThanOrEqual(Number(profiles.generatedAt.slice(0, 4)));
      }
    }
  });
  it('has figures for major countries', () => {
    expect(profiles.countries.USA?.['NY.GDP.MKTP.CD']).toBeDefined();
    expect(profiles.countries.FRA?.['SP.POP.TOTL']).toBeDefined();
  });
});
