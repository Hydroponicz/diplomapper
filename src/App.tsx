import { useEffect, useState } from 'react';
import countriesUrl from './data/countries.json?url';
import profilesUrl from './data/profiles.json?url';
import { buildCountryIndex, type CountryCollection } from './core/countries';
import type { ProfilesData } from './core/profiles';
import { readCountryParam } from './core/selection';
import { detectVisitorCountry } from './location/detectCountry';
import { WorldMap } from './map/WorldMap';
import { CountryPanel } from './panels/CountryPanel';
import { useAtlas } from './state/store';

export function App() {
  const [collection, setCollection] = useState<CountryCollection | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<ProfilesData | null>(null);
  const [profilesError, setProfilesError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(countriesUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<CountryCollection>;
      })
      .then((data) => {
        if (cancelled) return;
        setCollection(data);
        useAtlas.getState().loadCountries(buildCountryIndex(data), readCountryParam(location.search));
      })
      .catch((err: unknown) => {
        console.error(err);
        if (!cancelled) setLoadError('Country boundaries could not be loaded. Please reload the page.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Country figures load in parallel with the boundaries; the map never waits for them.
  useEffect(() => {
    let cancelled = false;
    fetch(profilesUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ProfilesData>;
      })
      .then((data) => {
        if (!cancelled) setProfiles(data);
      })
      .catch((err: unknown) => {
        console.error(err);
        if (!cancelled) setProfilesError('Country figures could not be loaded. Please reload the page.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Runs alongside the data load and never blocks the map. Skipped entirely when the link
  // already names a country, since the URL takes priority.
  useEffect(() => {
    if (readCountryParam(location.search)) return;
    let cancelled = false;
    detectVisitorCountry().then((iso2) => {
      if (!cancelled) useAtlas.getState().applyDetected(iso2);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Back/forward between selections.
  useEffect(() => {
    const onPopState = () => {
      const state = useAtlas.getState();
      const id = readCountryParam(location.search);
      if (id && state.countries?.byId.has(id)) state.select(id, 'url');
      else state.select(state.auto.id, state.auto.source);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return (
    <div className="app">
      <header className="brand">
        <span className="brand-mark" aria-hidden="true">◆</span> Diplomapper
      </header>
      <WorldMap collection={collection} />
      <CountryPanel loadError={loadError} profiles={profiles} profilesError={profilesError} />
    </div>
  );
}
