import { describe, expect, it } from 'vitest';
import { equipmentForCountry, formatCount, validateEquipment, type EquipmentData, type EquipmentRecord } from './equipment';

const source = (url = 'https://example.gov/table') => ({
  title: 'Official table',
  publisher: 'Ministry',
  url,
  accessed: '2026-09-29',
});
const rights = { status: 'cleared' as const, licence: 'OGL v3', notes: 'ok', reviewedOn: '2026-09-29' };

const rec = (over: Partial<EquipmentRecord> & Pick<EquipmentRecord, 'id'>): EquipmentRecord => ({
  country: 'AAA',
  category: 'combat_aircraft',
  kind: 'reported',
  basis: 'in_service_may_include_stored',
  asOf: '2026-04-01',
  sources: [source()],
  notes: [],
  rights,
  checkedOn: '2026-09-29',
  value: 10,
  ...over,
});

const valid: EquipmentData = {
  updated: '2026-09-29',
  records: [
    rec({ id: 'a-total', kind: 'our_estimate', value: 30, method: { code: 'M1', inputs: ['a-x', 'a-y'], formula: 'x + y', assumptions: ['only types'] }, confidence: 'high' }),
    rec({ id: 'a-x', parent: 'a-total', label: 'X', value: 10 }),
    rec({ id: 'a-y', parent: 'a-total', label: 'Y', value: 20 }),
    rec({ id: 'a-del', kind: 'deliveries', basis: 'delivered', value: 5, period: '2020–2025', asOf: '2025-01-01' }),
    rec({ id: 'a-inv', kind: 'our_estimate', basis: 'total_inventory', value: 5, method: { code: 'M3', inputs: ['a-del'], formula: 'delivered', assumptions: ['new type'] }, confidence: 'medium' }),
    rec({ id: 'a-tank', category: 'main_battle_tanks', kind: 'presence', label: 'T-1', evidence: 'official', value: undefined }),
    rec({ id: 'b-none', country: 'BBB', kind: 'no_figure', reason: 'insufficient_evidence', reasonText: 'Nothing usable.', value: undefined, sources: [] }),
  ],
};

const withRecords = (...records: EquipmentRecord[]): EquipmentData => ({ updated: '2026-09-29', records });

describe('validateEquipment', () => {
  it('accepts a well-formed data set', () => {
    expect(validateEquipment(valid)).toEqual([]);
  });
  it('rejects an M1 total that is not the sum of its inputs', () => {
    const bad = structuredClone(valid);
    bad.records[0]!.value = 31;
    expect(validateEquipment(bad).join()).toMatch(/does not equal the sum/);
  });
  it('rejects M1 inputs from different dates or sources', () => {
    const bad = structuredClone(valid);
    bad.records[2]!.asOf = '2025-04-01';
    bad.records[2]!.sources = [source('https://example.gov/other')];
    const errors = validateEquipment(bad).join();
    expect(errors).toMatch(/share one date/);
    expect(errors).toMatch(/one source/);
  });
  it('never lets a deliveries-based estimate exceed deliveries or claim to be active', () => {
    const bad = structuredClone(valid);
    bad.records[4]!.value = 6;
    bad.records[4]!.basis = 'active';
    const errors = validateEquipment(bad).join();
    expect(errors).toMatch(/cannot exceed documented deliveries/);
    expect(errors).toMatch(/never an active count/);
  });
  it('keeps deliveries and holdings apart', () => {
    expect(validateEquipment(withRecords(rec({ id: 'x', basis: 'delivered' }))).join()).toMatch(/only deliveries/);
    expect(validateEquipment(withRecords(rec({ id: 'x', kind: 'deliveries', period: '2020' }))).join()).toMatch(/only deliveries/);
  });
  it('blocks figures whose reuse rights are pending', () => {
    const r = rec({ id: 'x', kind: 'published_estimate', rights: { ...rights, status: 'pending' } });
    expect(validateEquipment(withRecords(r)).join()).toMatch(/rights are pending/);
  });
  it('requires sources, confidence and reasons', () => {
    const errors = validateEquipment(
      withRecords(
        rec({ id: 'x', sources: [] }),
        rec({ id: 'y', kind: 'our_estimate', method: { code: 'M1', inputs: ['x'], formula: 'x', assumptions: ['a'] } }),
        rec({ id: 'z', kind: 'no_figure', value: undefined, sources: [] }),
        rec({ id: 'w', kind: 'presence', value: 3, evidence: 'official', label: 'T' }),
      ),
    ).join();
    expect(errors).toMatch(/x: needs at least one source/);
    expect(errors).toMatch(/y: our estimates need a confidence level/);
    expect(errors).toMatch(/z: no_figure records need a reason/);
    expect(errors).toMatch(/w: presence records must not carry a figure/);
  });
});

describe('equipmentForCountry', () => {
  it('nests type rows under their total and lists deliveries separately', () => {
    const view = equipmentForCountry(valid, 'AAA')!;
    const total = view.rows.find((r) => r.record.id === 'a-total')!;
    expect(total.children.map((c) => c.id)).toEqual(['a-x', 'a-y']);
    expect(view.deliveries.map((d) => d.id)).toEqual(['a-del']);
    expect(view.rows.some((r) => r.record.kind === 'deliveries')).toBe(false);
  });
  it('distinguishes "not assessed" (null) from assessed countries', () => {
    expect(equipmentForCountry(valid, 'ZZZ')).toBeNull();
    expect(equipmentForCountry(valid, 'BBB')?.rows[0]?.record.kind).toBe('no_figure');
  });
});

describe('formatCount', () => {
  it('formats values and ranges', () => {
    expect(formatCount(rec({ id: 'x', value: 1234 }))).toBe('1,234');
    expect(formatCount(rec({ id: 'x', value: undefined, range: [10, 20] }))).toBe('10–20');
    expect(formatCount(rec({ id: 'x', value: undefined }))).toBeNull();
  });
});
