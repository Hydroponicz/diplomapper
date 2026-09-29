import { describe, expect, it } from 'vitest';
import { normalizeVisitorCountry } from './visitorCountry';

describe('normalizeVisitorCountry', () => {
  it('accepts ISO alpha-2 codes', () => {
    expect(normalizeVisitorCountry('FR')).toBe('FR');
    expect(normalizeVisitorCountry(' de ')).toBe('DE');
  });
  it('rejects Cloudflare placeholders and junk', () => {
    expect(normalizeVisitorCountry('XX')).toBeNull();
    expect(normalizeVisitorCountry('T1')).toBeNull();
    expect(normalizeVisitorCountry('')).toBeNull();
    expect(normalizeVisitorCountry(undefined)).toBeNull();
    expect(normalizeVisitorCountry(null)).toBeNull();
    expect(normalizeVisitorCountry('USA')).toBeNull();
  });
});
