import { create } from 'zustand';
import { DEFAULT_COUNTRY_ID, type CountryIndex } from '../core/countries';
import {
  detectedSelection,
  isManualSource,
  resolveInitialSelection,
  withCountryParam,
  withoutCountryParam,
  type SelectionSource,
} from '../core/selection';

interface AtlasState {
  countries: CountryIndex | null;
  selectedId: string;
  source: SelectionSource;
  /** The automatic choice (default or detected) to show when history returns to a URL without `?c=`. */
  auto: { id: string; source: 'default' | 'detected' };
  /** Visitor country that arrived before the boundaries finished loading. */
  pendingDetected: string | null;

  loadCountries: (index: CountryIndex, urlId: string | null) => void;
  /** Manual selections are written to the URL as a new history entry. */
  select: (id: string, source: SelectionSource) => void;
  applyDetected: (iso2: string | null) => void;
}

export const useAtlas = create<AtlasState>()((set, get) => ({
  countries: null,
  selectedId: DEFAULT_COUNTRY_ID,
  source: 'default',
  auto: { id: DEFAULT_COUNTRY_ID, source: 'default' },
  pendingDetected: null,

  loadCountries: (index, urlId) => {
    const initial = resolveInitialSelection(urlId, index);
    if (urlId && initial.source !== 'url') {
      // Unknown code in the link: fall back quietly and tidy the address bar.
      history.replaceState(history.state, '', withoutCountryParam(location.href));
    }
    set({ countries: index, selectedId: initial.id, source: initial.source });
    const pending = get().pendingDetected;
    if (pending) get().applyDetected(pending);
  },

  select: (id, source) => {
    const { countries, selectedId } = get();
    if (countries && !countries.byId.has(id)) return;
    if (isManualSource(source) && id !== selectedId) {
      history.pushState(history.state, '', withCountryParam(location.href, id));
    }
    set({ selectedId: id, source });
  },

  applyDetected: (iso2) => {
    const { countries, source } = get();
    if (!countries) {
      set({ pendingDetected: iso2 });
      return;
    }
    const id = detectedSelection(iso2, source, countries);
    // Remember the detected country for "back to the start" even if it can't apply now.
    const autoId = iso2 ? countries.byIso2.get(iso2) : undefined;
    set({
      pendingDetected: null,
      ...(autoId ? { auto: { id: autoId, source: 'detected' as const } } : {}),
      ...(id ? { selectedId: id, source: 'detected' as const } : {}),
    });
  },
}));
