import { useEffect, useState } from 'react';
import countriesUrl from './data/countries.json?url';
import { buildCountryIndex, type CountryCollection } from './core/countries';
import { readCountryParam } from './core/selection';
import { detectVisitorCountry } from './location/detectCountry';
import { WorldMap } from './map/WorldMap';
import { CountryPanel } from './panels/CountryPanel';
import { useAtlas } from './state/store';

export function App() {
  const [collection, setCollection] = useState<CountryCollection | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

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
      <CountryPanel loadError={loadError} />
    </div>
  );
}
