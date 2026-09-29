import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildCountryIndex, DEFAULT_COUNTRY_ID, type CountryCollection } from '../core/countries';

const collection = JSON.parse(
  readFileSync(new URL('./countries.json', import.meta.url), 'utf8'),
) as CountryCollection;
const index = buildCountryIndex(collection);

describe('bundled Natural Earth boundaries', () => {
  it('has unique ids for every feature', () => {
    expect(index.byId.size).toBe(collection.features.length);
  });
  it('includes the default country', () => {
    expect(index.byId.get(DEFAULT_COUNTRY_ID)?.name).toBe('United States of America');
  });
  it('maps alpha-2 codes Cloudflare may send to the main territory', () => {
    expect(index.byIso2.get('US')).toBe('USA');
    expect(index.byIso2.get('FR')).toBe('FRA');
    expect(index.byIso2.get('NO')).toBe('NOR');
    expect(index.byIso2.get('AU')).toBe('AUS');
    expect(index.byIso2.get('XK')).toBe('KOS');
  });
  it('gives every country a label point inside the world', () => {
    for (const c of index.list) {
      expect(Math.abs(c.labelX)).toBeLessThanOrEqual(180);
      expect(Math.abs(c.labelY)).toBeLessThanOrEqual(90);
    }
  });
});
