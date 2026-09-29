// Builds src/data/profiles.json: the latest available value of each country-panel indicator
// from the World Bank's World Development Indicators (CC BY 4.0).
//
// Run with `npm run data:profiles`. Needs network access to api.worldbank.org; the
// "Refresh data" GitHub Actions workflow runs it and commits the result.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { INDICATORS, buildProfiles, parseWbPage } from './lib/profiles.mjs';

const API = 'https://api.worldbank.org/v2';
const COUNTRIES_FILE = fileURLToPath(new URL('../src/data/countries.json', import.meta.url));
const OUT_FILE = fileURLToPath(new URL('../src/data/profiles.json', import.meta.url));

async function getJson(url, attempts = 4) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i >= attempts) throw new Error(`Failed to fetch ${url}: ${err.message}`, { cause: err });
      await new Promise((r) => setTimeout(r, 2000 * 2 ** (i - 1)));
    }
  }
}

const mapIds = JSON.parse(await readFile(COUNTRIES_FILE, 'utf8')).features.map((f) => f.properties.id);

const series = {};
const indicatorInfo = {};
for (const { id } of INDICATORS) {
  console.log(`Fetching ${id}`);
  // mrnev=1: the most recent non-empty value for each economy.
  series[id] = parseWbPage(await getJson(`${API}/country/all/indicator/${id}?format=json&mrnev=1&per_page=1000`), id);
  if (series[id].meta.pages > 1) throw new Error(`${id} has more than one page of results`);
  indicatorInfo[id] = parseWbPage(await getJson(`${API}/indicator/${id}?format=json`), `${id} metadata`).rows[0];
}

const retrievedAt = new Date().toISOString().slice(0, 10);
const profiles = buildProfiles({ mapIds, series, indicatorInfo, retrievedAt });

await writeFile(OUT_FILE, JSON.stringify(profiles, null, 1) + '\n');
for (const i of profiles.indicators) {
  console.log(`${i.id.padEnd(20)} ${String(i.countriesWithData).padStart(3)} countries, latest year ${i.latestYear}`);
}
console.log(`Wrote ${OUT_FILE}`);
