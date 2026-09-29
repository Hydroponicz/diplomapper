import { useState } from 'react';
import type { ProfilesData } from '../core/profiles';
import { withCountryParam, type SelectionSource } from '../core/selection';
import { useAtlas } from '../state/store';
import { CountryFacts } from './CountryFacts';

const sourceNotes: Record<SelectionSource, string> = {
  url: 'From the link in the address bar.',
  detected: 'Chosen from your approximate country (no precise location is used).',
  default: 'Default view.',
  map: 'Selected on the map.',
  list: 'Selected from the list.',
};

interface Props {
  loadError: string | null;
  profiles: ProfilesData | null;
  profilesError: string | null;
}

export function CountryPanel({ loadError, profiles, profilesError }: Props) {
  const countries = useAtlas((s) => s.countries);
  const selectedId = useAtlas((s) => s.selectedId);
  const source = useAtlas((s) => s.source);
  const select = useAtlas((s) => s.select);
  const [copied, setCopied] = useState(false);

  const country = countries?.byId.get(selectedId);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(withCountryParam(location.href, selectedId));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (e.g. insecure context); the address bar still has the link
      // after any manual selection.
    }
  };

  return (
    <aside className="country-panel" aria-labelledby="country-name">
      <p className="eyebrow">Selected country</p>

      {loadError ? (
        <p className="panel-error" role="alert">{loadError}</p>
      ) : !country ? (
        <p className="muted">Loading map data…</p>
      ) : (
        <>
          <h1 id="country-name" aria-live="polite">{country.name}</h1>
          {country.nameLong !== country.name && <p className="long-name">{country.nameLong}</p>}
          <p className="muted small">{sourceNotes[source]}</p>

          <div className="panel-actions">
            <button type="button" onClick={copyLink}>{copied ? 'Link copied' : 'Copy link'}</button>
            <label className="country-picker">
              <span className="visually-hidden">Go to country</span>
              <select value={selectedId} onChange={(e) => select(e.target.value, 'list')}>
                {countries!.list.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
          </div>

          <CountryFacts data={profiles} error={profilesError} countryId={selectedId} />
        </>
      )}

      <p className="fine-print">
        Boundaries from <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a>{' '}
        (public domain), which shows de facto boundaries. Their depiction does not imply
        endorsement of any territorial claim.
      </p>
    </aside>
  );
}
