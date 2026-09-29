import { describe, expect, it } from 'vitest';
import { countryFacts, formatValue, type IndicatorMeta, type ProfilesData } from './profiles';

describe('formatValue', () => {
  it('formats money with scale words', () => {
    expect(formatValue(30769700000000, 'usd')).toBe('$30.8 trillion');
    expect(formatValue(997309000000, 'usd')).toBe('$997.3 billion');
    expect(formatValue(1234567890, 'usd')).toBe('$1.23 billion');
    expect(formatValue(90027, 'usd')).toBe('$90,027');
  });
  it('formats counts and rates', () => {
    expect(formatValue(341784857, 'count')).toBe('341.8 million');
    expect(formatValue(1395000, 'count')).toBe('1.4 million');
    expect(formatValue(22500, 'count')).toBe('22,500');
    expect(formatValue(2.16, 'percent')).toBe('2.2%');
    expect(formatValue(-0.5, 'percent')).toBe('-0.5%');
    expect(formatValue(3.42, 'percentOfGdp')).toBe('3.4% of GDP');
  });
});

const indicator = (id: string, group: IndicatorMeta['group'], latestYear: number): IndicatorMeta => ({
  id,
  label: id,
  group,
  format: 'count',
  claim: 'estimate',
  claimNote: 'note',
  name: id,
  originalSources: [],
  url: `https://data.worldbank.org/indicator/${id}`,
  source: 'wdi',
  latestYear,
  countriesWithData: 150,
  countriesTooOld: 0,
});

const data: ProfilesData = {
  generatedAt: '2026-09-29',
  maxAgeYears: 10,
  sources: {},
  indicators: [indicator('POP', 'people', 2025), indicator('GDP', 'economy', 2025), indicator('MIL', 'military', 2020)],
  countries: { AAA: { POP: [10, 2025], GDP: [5, 2021], MIL: [3, 2020] }, BBB: {} },
};

describe('countryFacts', () => {
  it('groups rows and keeps value and year', () => {
    const facts = countryFacts(data, 'AAA');
    expect(facts.people[0]).toMatchObject({ value: 10, year: 2025, isOld: false, seriesIsOld: false });
  });
  it('flags figures more than 3 years older than the retrieval date', () => {
    const facts = countryFacts(data, 'AAA');
    expect(facts.economy[0]?.isOld).toBe(true);
    expect(facts.military[0]).toMatchObject({ isOld: true, seriesIsOld: true });
  });
  it('returns explicit no-data rows rather than dropping them', () => {
    const facts = countryFacts(data, 'BBB');
    expect(facts.people[0]).toMatchObject({ value: null, year: null, isOld: false });
    expect(countryFacts(data, 'ZZZ').economy).toHaveLength(1);
  });
});
