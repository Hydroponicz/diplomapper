import equipmentJson from '../data/equipment.json';
import {
  BASIS_LABELS,
  CATEGORY_INFO,
  EVIDENCE_LABELS,
  KIND_DESCRIPTIONS,
  KIND_LABELS,
  METHOD_LABELS,
  REASON_LABELS,
  equipmentForCountry,
  formatCount,
  type EquipmentData,
  type EquipmentRecord,
} from '../core/equipment';

// Small, hand-curated and validated at build time (src/data/equipment.test.ts), so it is
// bundled rather than fetched.
const data = equipmentJson as EquipmentData;
const byId = new Map(data.records.map((r) => [r.id, r]));

const RIGHTS_LABELS = {
  cleared: 'Reuse permitted by the licence',
  facts_cited: 'Fact cited with attribution; nothing copied',
  pending: 'Pending',
} as const;

function badge(r: EquipmentRecord): { text: string; className: string } {
  if (r.kind === 'no_figure' && r.reason) return { text: REASON_LABELS[r.reason], className: 'kind kind-no_figure' };
  return { text: KIND_LABELS[r.kind], className: `kind kind-${r.kind}` };
}

function Sources({ record }: { record: EquipmentRecord }) {
  if (!record.sources.length) return null;
  return (
    <ul className="eq-sources">
      {record.sources.map((s) => (
        <li key={s.url}>
          <a href={s.url} target="_blank" rel="noopener">{s.title}</a>, {s.publisher}
          {s.published && <>, {s.published}</>}
          {s.locator && <> ({s.locator})</>}. Accessed {s.accessed}.
        </li>
      ))}
    </ul>
  );
}

function RecordDetail({ record }: { record: EquipmentRecord }) {
  const info = CATEGORY_INFO[record.category];
  return (
    <div className="fact-detail">
      <p>
        <strong>{KIND_LABELS[record.kind]}.</strong> {KIND_DESCRIPTIONS[record.kind]}
      </p>
      {record.reasonText && <p>{record.reasonText}</p>}
      <p>
        <strong>Category:</strong> {info.definition}
      </p>
      {record.kind !== 'no_figure' && record.kind !== 'presence' && (
        <p>
          <strong>Counts:</strong> {BASIS_LABELS[record.basis]}.{' '}
          {record.period ? <>Period {record.period}.</> : <>As of {record.asOf}.</>}
        </p>
      )}
      {record.method && (
        <>
          <p>
            <strong>Method:</strong> {METHOD_LABELS[record.method.code]}. {record.method.formula}
          </p>
          <p>
            <strong>Inputs:</strong>{' '}
            {record.method.inputs
              .map((id) => byId.get(id))
              .map((i) => i && `${i.label ?? CATEGORY_INFO[i.category].label} ${formatCount(i)} (${KIND_LABELS[i.kind].toLowerCase()}, ${i.period ?? i.asOf})`)
              .join('; ')}
          </p>
          <p>
            <strong>Assumptions:</strong> {record.method.assumptions.join(' ')}
          </p>
          {record.confidence && (
            <p>
              <strong>Confidence:</strong> {record.confidence}.
            </p>
          )}
        </>
      )}
      {record.notes.map((n) => (
        <p key={n}>{n}</p>
      ))}
      {record.rejected && record.rejected.length > 0 && (
        <>
          <p>
            <strong>Figures we did not use:</strong>
          </p>
          <ul className="eq-sources">
            {record.rejected.map((x) => (
              <li key={x.url}>
                <a href={x.url} target="_blank" rel="noopener nofollow">{x.name}</a>: {x.why}
              </li>
            ))}
          </ul>
        </>
      )}
      <Sources record={record} />
      <p className="eq-rights">
        Reuse rights: {RIGHTS_LABELS[record.rights.status]} ({record.rights.licence}). Checked {record.checkedOn}.
      </p>
    </div>
  );
}

function EquipmentRow({ record, sub = false }: { record: EquipmentRecord; sub?: boolean }) {
  const count = formatCount(record);
  const b = badge(record);
  const categoryLabel = CATEGORY_INFO[record.category].label;
  let title: string | undefined;
  if (record.parent) title = record.label;
  else if (record.label && record.kind !== 'presence') title = `${categoryLabel} (${record.label})`;
  else title = categoryLabel;
  let value: string;
  if (count) value = count;
  else if (record.kind === 'presence') value = record.label ?? '';
  else value = '—';

  return (
    <details className={sub ? 'fact eq-sub' : 'fact'}>
      <summary>
        <span className="fact-label">
          {sub && '↳ '}
          {title}
          {!sub && record.kind === 'presence' && ' (type in service)'}
        </span>
        <span className={count ? 'fact-value' : 'fact-value no-data'}>{value}</span>
        <span className="fact-meta">
          {record.kind !== 'no_figure' && record.kind !== 'presence' && (
            <span>
              {record.period ?? record.asOf} · {BASIS_LABELS[record.basis]}
            </span>
          )}
          {record.kind === 'presence' && record.evidence && (
            <span>
              {EVIDENCE_LABELS[record.evidence]} · {record.asOf}
            </span>
          )}
          {record.confidence && <span>{record.confidence} confidence</span>}
          <span className={b.className}>{b.text}</span>
        </span>
      </summary>
      <RecordDetail record={record} />
    </details>
  );
}

export function EquipmentSection({ countryId }: { countryId: string }) {
  const view = equipmentForCountry(data, countryId);

  return (
    <section className="fact-group" aria-labelledby="group-equipment">
      <h2 id="group-equipment">Equipment (pilot)</h2>
      <p className="facts-hint">
        Each row says what kind of evidence it is. Holdings, estimates, deliveries and operational
        counts measure different things and are never combined. Stored and active equipment are
        often counted together.
      </p>
      {!view ? (
        <details className="fact">
          <summary>
            <span className="fact-label">Tanks, aircraft, ships</span>
            <span className="fact-value no-data">Not yet assessed</span>
            <span className="fact-meta">Pilot covers a few countries</span>
          </summary>
          <div className="fact-detail">
            <p>
              Equipment figures are added country by country, each checked against its sources and
              reuse rights. This country hasn't been assessed yet, so nothing is shown. That is
              different from "insufficient evidence", which means we looked and found no usable figure.
            </p>
          </div>
        </details>
      ) : (
        <>
          {view.rows.map(({ record, children }) => (
            <div key={record.id}>
              <EquipmentRow record={record} />
              {children.map((c) => (
                <EquipmentRow key={c.id} record={c} sub />
              ))}
            </div>
          ))}
          {view.deliveries.length > 0 && (
            <>
              <h3 className="eq-subhead">Deliveries (not current holdings)</h3>
              {view.deliveries.map((r) => (
                <EquipmentRow key={r.id} record={r} />
              ))}
            </>
          )}
        </>
      )}
      <p className="eq-method">
        Method and rules:{' '}
        <a
          href="https://github.com/Hydroponicz/diplomapper/blob/main/docs/equipment-methodology.md"
          target="_blank"
          rel="noopener"
        >
          how equipment figures are sourced
        </a>
        .
      </p>
    </section>
  );
}
