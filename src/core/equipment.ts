// Evidence-tiered equipment records (src/data/equipment.json). Rules are documented in
// docs/equipment-methodology.md; validateEquipment() enforces the machine-checkable ones.
//
// Each record is exactly one kind of evidence. Kinds are never merged or relabelled:
// holdings, operational counts, estimates, deliveries and presence answer different questions.

export type RecordKind =
  | 'reported' // a government's own published holdings figure
  | 'operational' // a government's own commissioned / deployable / active figure
  | 'published_estimate' // an estimate by a named organisation, rights cleared
  | 'our_estimate' // Diplomapper's calculation from cited inputs (methods M1–M3)
  | 'deliveries' // documented deliveries: a flow, never a stock
  | 'presence' // the type is in service; no count
  | 'no_figure'; // assessed, and no usable figure exists

export type Category =
  | 'main_battle_tanks'
  | 'combat_aircraft'
  | 'attack_helicopters'
  | 'major_surface_combatants'
  | 'submarines'
  | 'naval_battle_force';

export type CountBasis =
  | 'active'
  | 'in_service_may_include_stored'
  | 'forward_fleet'
  | 'total_inventory'
  | 'battle_force'
  | 'delivered'
  | 'not_stated';

export type MethodCode = 'M1' | 'M2' | 'M3';
export type Confidence = 'high' | 'medium';
export type PresenceEvidence = 'official' | 'state_media_claim' | 'independent_imagery';
export type NoFigureReason = 'insufficient_evidence' | 'rights_pending' | 'not_published';

export interface SourceRef {
  title: string;
  publisher: string;
  url: string;
  /** Publication date of the document, if stated. */
  published?: string;
  /** Table, page or section the figure comes from. */
  locator?: string;
  accessed: string;
}

export interface RightsReview {
  /**
   * cleared: the source's licence allows reuse (e.g. OGL, CC BY, public domain).
   * facts_cited: we state a fact with attribution and a link; nothing is copied.
   * pending: not yet cleared. Records with a figure may not ship while pending.
   */
  status: 'cleared' | 'facts_cited' | 'pending';
  licence: string;
  notes: string;
  reviewedOn: string;
}

export interface RejectedSource {
  name: string;
  url: string;
  why: string;
}

export interface EquipmentRecord {
  id: string;
  country: string;
  category: Category;
  kind: RecordKind;
  /** Equipment type for type-level rows, e.g. "Challenger 2". */
  label?: string;
  /** Id of the category-level record this row breaks down. */
  parent?: string;
  value?: number;
  range?: [number, number];
  basis: CountBasis;
  /** ISO date (or year) the figure describes. Deliveries use the date of the last delivery. */
  asOf: string;
  /** For deliveries: the period covered, e.g. "2017–2025". */
  period?: string;
  sources: SourceRef[];
  method?: {
    code: MethodCode;
    inputs: string[];
    formula: string;
    assumptions: string[];
  };
  confidence?: Confidence;
  evidence?: PresenceEvidence;
  reason?: NoFigureReason;
  /** Plain-language explanation, required for no_figure records. */
  reasonText?: string;
  /** Figures we looked at and did not use, with the reason. */
  rejected?: RejectedSource[];
  /** Uncertainty and interpretation notes shown with the record. */
  notes: string[];
  rights: RightsReview;
  checkedOn: string;
}

export interface EquipmentData {
  updated: string;
  records: EquipmentRecord[];
}

export const CATEGORY_INFO: Record<Category, { label: string; definition: string }> = {
  main_battle_tanks: {
    label: 'Main battle tanks',
    definition:
      'Tracked or wheeled armoured vehicles with a main gun of at least 75 mm, following the UN Register of Conventional Arms category "battle tanks".',
  },
  combat_aircraft: {
    label: 'Combat aircraft',
    definition:
      'Fixed-wing aircraft designed or equipped to engage targets with weapons, following the UN Register category "combat aircraft". Trainers and transports are excluded.',
  },
  attack_helicopters: {
    label: 'Attack helicopters',
    definition: 'Rotary-wing aircraft designed or equipped to engage targets with guided weapons (UN Register category).',
  },
  major_surface_combatants: {
    label: 'Major surface warships',
    definition: 'Carriers, cruisers, destroyers and frigates. Patrol vessels and auxiliaries are excluded.',
  },
  submarines: {
    label: 'Submarines',
    definition: 'Commissioned submarines of all types, including ballistic-missile submarines.',
  },
  naval_battle_force: {
    label: 'Naval battle force',
    definition:
      "The US Navy's count of deployable ships that contribute directly to warfighting and support. It is not the total number of hulls the Navy owns.",
  },
};

export const CATEGORY_ORDER: Category[] = [
  'main_battle_tanks',
  'combat_aircraft',
  'attack_helicopters',
  'major_surface_combatants',
  'submarines',
  'naval_battle_force',
];

export const KIND_LABELS: Record<RecordKind, string> = {
  reported: 'Reported',
  operational: 'Operational status',
  published_estimate: 'Published estimate',
  our_estimate: 'Our estimate',
  deliveries: 'Delivered',
  presence: 'Count unknown',
  no_figure: 'No figure',
};

export const KIND_DESCRIPTIONS: Record<RecordKind, string> = {
  reported: "The government's own published count of its equipment.",
  operational: "The government's own count of commissioned, deployable or active equipment. This is not total holdings.",
  published_estimate: 'An estimate published by the organisation named below, used with reuse rights cleared.',
  our_estimate: "Diplomapper's own calculation from the cited inputs. The method and assumptions are shown below.",
  deliveries: 'Documented deliveries. These are equipment received over a period, not current holdings.',
  presence: 'Evidence that this type is in service. No count is shown because none passes our rules.',
  no_figure: 'We looked for a usable figure and did not find one.',
};

export const BASIS_LABELS: Record<CountBasis, string> = {
  active: 'active',
  in_service_may_include_stored: 'in service, may include stored',
  forward_fleet: 'in effective forward fleet',
  total_inventory: 'inventory, not active count',
  battle_force: 'deployable battle force',
  delivered: 'delivered, not holdings',
  not_stated: 'basis not stated',
};

export const EVIDENCE_LABELS: Record<PresenceEvidence, string> = {
  official: 'official source',
  state_media_claim: 'state media claim',
  independent_imagery: 'independent imagery',
};

export const REASON_LABELS: Record<NoFigureReason, string> = {
  insufficient_evidence: 'Insufficient evidence',
  rights_pending: 'Rights pending',
  not_published: 'Not published',
};

export const METHOD_LABELS: Record<MethodCode, string> = {
  M1: 'M1: sum of sub-types from one source, one date and one count basis',
  M2: 'M2: official baseline plus officially documented changes',
  M3: 'M3: new type with its delivery programme officially complete',
};

const KINDS_WITH_FIGURES: RecordKind[] = ['reported', 'operational', 'published_estimate', 'our_estimate', 'deliveries'];

/** Returns every rule violation in the data set; an empty array means the data may ship. */
export function validateEquipment(data: EquipmentData): string[] {
  const errors: string[] = [];
  const byId = new Map<string, EquipmentRecord>();
  for (const r of data.records) {
    if (byId.has(r.id)) errors.push(`${r.id}: duplicate id`);
    byId.set(r.id, r);
  }

  for (const r of data.records) {
    const err = (msg: string) => errors.push(`${r.id}: ${msg}`);
    if (!CATEGORY_INFO[r.category]) err(`unknown category ${r.category}`);
    if (!KIND_LABELS[r.kind]) err(`unknown kind ${r.kind}`);
    if (!BASIS_LABELS[r.basis]) err(`unknown basis ${r.basis}`);
    if (!/^\d{4}(-\d{2}(-\d{2})?)?$/.test(r.asOf)) err('asOf must be an ISO date or year');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.checkedOn)) err('checkedOn must be an ISO date');
    if (!Array.isArray(r.notes)) err('notes must be a list');
    if (!r.rights?.licence || !r.rights.notes || !r.rights.reviewedOn) err('rights review is incomplete');

    const hasFigure = r.value !== undefined || r.range !== undefined;
    if (KINDS_WITH_FIGURES.includes(r.kind)) {
      if (!hasFigure) err('needs a value or range');
      if (r.value !== undefined && r.range !== undefined) err('use either value or range, not both');
      if (r.range && !(r.range[0] >= 0 && r.range[0] < r.range[1])) err('range must be [low, high] with low < high');
      if (r.value !== undefined && !(Number.isInteger(r.value) && r.value >= 0)) err('value must be a whole number');
      if (r.rights?.status === 'pending') err('a figure cannot ship while its reuse rights are pending');
    } else if (hasFigure) {
      err(`${r.kind} records must not carry a figure`);
    }

    if (r.kind !== 'no_figure') {
      if (!r.sources?.length) err('needs at least one source');
      for (const s of r.sources ?? []) {
        if (!s.title || !s.publisher || !/^https:\/\//.test(s.url) || !s.accessed) err(`incomplete source ${s.url}`);
      }
    }

    if ((r.kind === 'deliveries') !== (r.basis === 'delivered')) err('only deliveries use the "delivered" basis');
    if (r.kind === 'operational' && !['active', 'battle_force'].includes(r.basis)) err('operational records need an active or battle-force basis');
    if (r.kind === 'deliveries' && !r.period) err('deliveries need the period covered');
    if (r.kind === 'presence' && !r.evidence) err('presence records need an evidence type');
    if (r.kind === 'presence' && !r.label) err('presence records name the equipment type');
    if (r.kind === 'no_figure' && (!r.reason || !r.reasonText)) err('no_figure records need a reason and explanation');
    if (r.kind === 'published_estimate' && r.sources.length === 0) err('published estimates must name the publisher');

    if (r.parent) {
      const p = byId.get(r.parent);
      if (!p) err(`parent ${r.parent} does not exist`);
      else if (p.country !== r.country || p.category !== r.category) err('parent must be the same country and category');
    }

    if (r.kind === 'our_estimate') {
      const m = r.method;
      if (!m || !m.inputs.length || !m.formula || !m.assumptions.length) {
        err('our estimates need a method with inputs, formula and assumptions');
        continue;
      }
      if (!r.confidence) err('our estimates need a confidence level (low-confidence estimates are not published)');
      const inputs = m.inputs.map((id) => byId.get(id));
      if (inputs.some((i) => !i)) {
        err('an input record does not exist');
        continue;
      }
      const ins = inputs as EquipmentRecord[];
      if (ins.some((i) => i.country !== r.country)) err('inputs must be for the same country');
      if (m.code === 'M1') {
        if (ins.some((i) => i.kind !== 'reported')) err('M1 sums reported figures only');
        if (new Set(ins.map((i) => i.asOf)).size !== 1 || ins[0]!.asOf !== r.asOf) err('M1 inputs must share one date');
        if (ins.some((i) => i.basis !== r.basis)) err('M1 inputs must share the count basis');
        if (new Set(ins.map((i) => i.sources[0]?.url)).size !== 1) err('M1 inputs must come from one source');
        const sum = ins.reduce((t, i) => t + (i.value ?? NaN), 0);
        if (r.value !== sum) err(`M1 value ${r.value} does not equal the sum of inputs ${sum}`);
      }
      if (m.code === 'M3') {
        if (ins.length !== 1 || ins[0]!.kind !== 'deliveries') err('M3 takes exactly one completed-deliveries record');
        else if (r.value !== undefined && r.value > (ins[0]!.value ?? -1)) err('M3 cannot exceed documented deliveries');
        if (r.basis === 'active') err('M3 estimates inventory, never an active count');
      }
      if (m.code === 'M2' && !r.range) err('M2 estimates are ranges');
    }
  }
  return errors;
}

export interface EquipmentView {
  /** Category-level rows, each with its type-level breakdown rows. */
  rows: { record: EquipmentRecord; children: EquipmentRecord[] }[];
  deliveries: EquipmentRecord[];
}

const KIND_ORDER: RecordKind[] = ['reported', 'our_estimate', 'published_estimate', 'operational', 'presence', 'no_figure'];

export function equipmentForCountry(data: EquipmentData, countryId: string): EquipmentView | null {
  const records = data.records.filter((r) => r.country === countryId);
  if (!records.length) return null;
  const children = records.filter((r) => r.parent);
  const top = records
    .filter((r) => !r.parent && r.kind !== 'deliveries')
    .sort(
      (a, b) =>
        CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
        KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind),
    );
  return {
    rows: top.map((record) => ({ record, children: children.filter((c) => c.parent === record.id) })),
    deliveries: records.filter((r) => r.kind === 'deliveries' && !r.parent),
  };
}

export function formatCount(r: EquipmentRecord): string | null {
  if (r.value !== undefined) return r.value.toLocaleString('en-US');
  if (r.range) return `${r.range[0].toLocaleString('en-US')}–${r.range[1].toLocaleString('en-US')}`;
  return null;
}
