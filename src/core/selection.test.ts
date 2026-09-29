import { describe, expect, it } from 'vitest';
import { buildCountryIndex, type CountryCollection } from './countries';
import {
  detectedSelection,
  readCountryParam,
  resolveInitialSelection,
  withCountryParam,
  withoutCountryParam,
} from './selection';

const feature = (id: string, iso2: string | null, name: string) => ({
  type: 'Feature' as const,
  properties: { id, iso2, name, nameLong: name, type: 'Sovereign country', sovereign: name, labelX: 0, labelY: 0 },
  geometry: { type: 'Polygon' as const, coordinates: [] },
});

const index = buildCountryIndex({
  type: 'FeatureCollection',
  features: [feature('USA', 'US', 'United States'), feature('FRA', 'FR', 'France'), feature('KOS', null, 'Kosovo')],
} as CountryCollection);

describe('readCountryParam', () => {
  it('reads and normalises ?c=', () => {
    expect(readCountryParam('?c=fra')).toBe('FRA');
    expect(readCountryParam('?x=1&c=JPN')).toBe('JPN');
  });
  it('ignores missing or malformed values', () => {
    expect(readCountryParam('')).toBeNull();
    expect(readCountryParam('?c=')).toBeNull();
    expect(readCountryParam('?c=FR')).toBeNull();
    expect(readCountryParam('?c=<script>')).toBeNull();
  });
});

describe('withCountryParam / withoutCountryParam', () => {
  it('sets the param while keeping others and the hash', () => {
    expect(withCountryParam('https://x.dev/?a=1#h', 'FRA')).toBe('https://x.dev/?a=1&c=FRA#h');
    expect(withCountryParam('https://x.dev/?c=USA', 'FRA')).toBe('https://x.dev/?c=FRA');
  });
  it('removes the param', () => {
    expect(withoutCountryParam('https://x.dev/?c=XYZ&a=1')).toBe('https://x.dev/?a=1');
  });
});

describe('resolveInitialSelection', () => {
  it('prefers a known country from the URL', () => {
    expect(resolveInitialSelection('FRA', index)).toEqual({ id: 'FRA', source: 'url' });
  });
  it('falls back to the USA default', () => {
    expect(resolveInitialSelection(null, index)).toEqual({ id: 'USA', source: 'default' });
    expect(resolveInitialSelection('XYZ', index)).toEqual({ id: 'USA', source: 'default' });
  });
});

describe('detectedSelection', () => {
  it('replaces the default with the visitor country', () => {
    expect(detectedSelection('FR', 'default', index)).toBe('FRA');
  });
  it('never overrides a URL or manual selection', () => {
    expect(detectedSelection('FR', 'url', index)).toBeNull();
    expect(detectedSelection('FR', 'map', index)).toBeNull();
    expect(detectedSelection('FR', 'list', index)).toBeNull();
  });
  it('ignores unknown or missing countries', () => {
    expect(detectedSelection(null, 'default', index)).toBeNull();
    expect(detectedSelection('ZZ', 'default', index)).toBeNull();
  });
});
