import {
  CLAIM_LABELS,
  GROUP_LABELS,
  countryFacts,
  formatValue,
  indicatorUrl,
  type FactRow,
  type IndicatorGroup,
  type ProfilesData,
} from '../core/profiles';
import { EquipmentSection } from './EquipmentSection';

// World Bank codes that differ from map ids (keep in sync with scripts/lib/profiles.mjs).
const WB_CODE_BY_MAP_ID: Record<string, string> = { KOS: 'XKX' };

const CLAIM_SHORT: Record<FactRow['indicator']['claim'], string> = {
  official: 'Official',
  compiled: 'Compiled',
  estimate: 'Estimate',
};

function Fact({ row, countryId, maxAgeYears }: { row: FactRow; countryId: string; maxAgeYears: number }) {
  const { indicator, source } = row;
  const hasData = row.value !== null && row.year !== null;
  const wbCode = hasData ? (WB_CODE_BY_MAP_ID[countryId] ?? countryId) : null;

  return (
    <details className="fact">
      <summary>
        <span className="fact-label">{indicator.label}</span>
        <span className={hasData ? 'fact-value' : 'fact-value no-data'}>
          {hasData ? formatValue(row.value!, indicator.format) : 'No recent figure'}
        </span>
        <span className="fact-meta">
          {hasData ? (
            <>
              <span className={row.isOld ? 'fact-year old' : 'fact-year'}>
                {row.year}
                {row.isOld && ' · older data'}
              </span>
              <span className={`claim claim-${indicator.claim}`} title={CLAIM_LABELS[indicator.claim]}>
                {CLAIM_SHORT[indicator.claim]}
              </span>
            </>
          ) : (
            <span>None in the last {maxAgeYears} years</span>
          )}
        </span>
      </summary>
      <div className="fact-detail">
        <p>
          <strong>{CLAIM_LABELS[indicator.claim]}.</strong> {indicator.claimNote}
        </p>
        {hasData ? (
          <p>Figure for {row.year}.</p>
        ) : (
          <p>
            The source has no figure for this country from the last {maxAgeYears} years. Older
            figures are not shown because they would be misleading next to current ones.
          </p>
        )}
        {row.seriesIsOld && (
          <p className="warn">
            This series has not been updated since {indicator.latestYear} for any country.
          </p>
        )}
        <p>Series: {indicator.name}.</p>
        {indicator.originalSources.length > 0 && (
          <p>Original sources: {indicator.originalSources.join('; ')}.</p>
        )}
        {source && (
          <p>
            Via {source.publisher}, {source.name}.{' '}
            <a href={indicatorUrl(indicator, wbCode)} target="_blank" rel="noopener">
              View the series
            </a>
          </p>
        )}
      </div>
    </details>
  );
}

const GROUPS: IndicatorGroup[] = ['people', 'economy', 'military'];

export function CountryFacts({
  data,
  error,
  countryId,
}: {
  data: ProfilesData | null;
  error: string | null;
  countryId: string;
}) {
  if (error) return <p className="panel-error" role="alert">{error}</p>;
  if (!data) return <p className="muted small">Loading country data…</p>;

  const groups = countryFacts(data, countryId);
  const sources = Object.values(data.sources);

  return (
    <div className="facts">
      <p className="facts-hint">Select a figure for its definition and source.</p>
      {GROUPS.map((group) => (
        <section key={group} className="fact-group" aria-labelledby={`group-${group}`}>
          <h2 id={`group-${group}`}>{GROUP_LABELS[group]}</h2>
          {groups[group].map((row) => (
            <Fact key={row.indicator.id} row={row} countryId={countryId} maxAgeYears={data.maxAgeYears} />
          ))}
        </section>
      ))}
      <EquipmentSection countryId={countryId} />
      <footer className="sources">
        {sources.map((s) => (
          <p key={s.name}>
            Data: {s.publisher},{' '}
            <a href={s.url} target="_blank" rel="noopener">{s.name}</a>{' '}
            (<a href={s.licenseUrl} target="_blank" rel="noopener">{s.license}</a>).
            {s.lastUpdated && <> Updated by the source {s.lastUpdated};</>} retrieved {s.retrievedAt}.
          </p>
        ))}
        <p>Relationships (alliances, trade, agreements, tensions, conflicts) come in a later version.</p>
      </footer>
    </div>
  );
}
