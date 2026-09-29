// Builds src/data/countries.json from Natural Earth 1:50m Admin 0 – Countries.
//
// Natural Earth is public domain (https://www.naturalearthdata.com/about/terms-of-use/).
// The output is committed so normal builds never need network access; re-run this
// script (npm run data:countries) only when upgrading the Natural Earth version.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const NE_VERSION = 'v5.1.2';
const SOURCE_URL = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${NE_VERSION}/geojson/ne_50m_admin_0_countries.geojson`;
const OUT_FILE = fileURLToPath(new URL('../src/data/countries.json', import.meta.url));

// ~110 m precision; plenty for 1:50m source data and roughly halves the file size.
const round = (n) => Math.round(n * 1000) / 1000;

function roundCoords(coords) {
  return typeof coords[0] === 'number' ? coords.map(round) : coords.map(roundCoords);
}

const isCode = (v, len) => typeof v === 'string' && v.length === len && v !== '-99';

console.log(`Downloading ${SOURCE_URL}`);
const res = await fetch(SOURCE_URL);
if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
const source = await res.json();

const adm0Codes = new Set(source.features.map((f) => f.properties.ADM0_A3));

const features = source.features.map((f) => {
  const p = f.properties;
  // Prefer the ISO 3166-1 alpha-3 code (ISO_A3_EH fixes France/Norway), but fall back to
  // Natural Earth's ADM0_A3 when there is no ISO code (e.g. Kosovo, Somaliland) or when the
  // ISO code belongs to another feature (e.g. Australian dependencies coded "AUS").
  const iso3 = p.ISO_A3_EH;
  const useIso = isCode(iso3, 3) && (iso3 === p.ADM0_A3 || !adm0Codes.has(iso3));
  const id = useIso ? iso3 : p.ADM0_A3;
  // Alpha-2 is only used to match Cloudflare's visitor country, so drop it when the code
  // belongs to another feature's main territory (e.g. "AU" on Australian dependencies).
  // Kosovo has no ISO alpha-3 but keeps its user-assigned alpha-2 "XK".
  const ownsIso2 = useIso || !isCode(iso3, 3);
  const iso2 = ownsIso2 && isCode(p.ISO_A2_EH, 2) ? p.ISO_A2_EH : null;

  return {
    type: 'Feature',
    properties: {
      id,
      iso2,
      name: p.NAME,
      nameLong: p.NAME_LONG,
      type: p.TYPE,
      sovereign: p.SOVEREIGNT,
      labelX: round(p.LABEL_X),
      labelY: round(p.LABEL_Y),
    },
    geometry: { type: f.geometry.type, coordinates: roundCoords(f.geometry.coordinates) },
  };
});

const ids = features.map((f) => f.properties.id);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dupes.length) throw new Error(`Duplicate country ids: ${dupes.join(', ')}`);
const iso2s = features.map((f) => f.properties.iso2).filter(Boolean);
const iso2Dupes = iso2s.filter((c, i) => iso2s.indexOf(c) !== i);
if (iso2Dupes.length) throw new Error(`Duplicate alpha-2 codes: ${iso2Dupes.join(', ')}`);

features.sort((a, b) => a.properties.id.localeCompare(b.properties.id));

const out = {
  type: 'FeatureCollection',
  source: `Natural Earth 1:50m Admin 0 – Countries ${NE_VERSION} (public domain)`,
  features,
};

await writeFile(OUT_FILE, JSON.stringify(out) + '\n');
console.log(`Wrote ${features.length} countries to ${OUT_FILE}`);
