import { describe, expect, it } from 'vitest';
import countries from './countries.json';
import equipment from './equipment.json';
import { validateEquipment, type EquipmentData } from '../core/equipment';

const data = equipment as EquipmentData;
const mapIds = new Set((countries as { features: { properties: { id: string } }[] }).features.map((f) => f.properties.id));

describe('committed equipment records', () => {
  it('pass every validation rule', () => {
    expect(validateEquipment(data)).toEqual([]);
  });
  it('only use countries on the map', () => {
    for (const r of data.records) expect(mapIds.has(r.country)).toBe(true);
  });
  it('never cite IISS-derived or reuse-prohibited sites as sources', () => {
    const banned = /iiss\.org|globalfirepower|globalmilitary\.net|wikipedia\.org|militarypowerrankings/i;
    for (const r of data.records) for (const s of r.sources) expect(s.url).not.toMatch(banned);
  });
  it('include at least one assessed country with no usable figure', () => {
    expect(data.records.some((r) => r.kind === 'no_figure' && r.reason === 'insufficient_evidence')).toBe(true);
  });
});
