// Pure helpers for scripts/build-profiles.mjs. Kept free of network and file access so they
// can be unit-tested against sample API responses (scripts/lib/profiles.test.mjs).

/**
 * How each figure should be read. Set per indicator from the World Bank's own description of
 * the series; never guessed per value.
 *  - official:  official statistics as compiled by the source (recent years may be revised)
 *  - compiled:  compiled by a research body from official and open sources; some values are
 *               the compiler's estimates and the World Bank data does not mark which
 *  - estimate:  modelled or estimated figures, not direct official counts
 */
export const CLAIM_TYPES = ['official', 'compiled', 'estimate'];

/** Indicators shown in the country panel, in display order. */
export const INDICATORS = [
  {
    id: 'SP.POP.TOTL',
    label: 'Population',
    group: 'people',
    format: 'count',
    claim: 'estimate',
    claimNote: 'Mid-year estimates of everyone living in the country, based on censuses and UN population estimates.',
  },
  {
    id: 'NY.GDP.MKTP.CD',
    label: 'GDP',
    group: 'economy',
    format: 'usd',
    claim: 'compiled',
    claimNote: 'National accounts from official statistics and the OECD, converted to US dollars at official exchange rates. The World Bank fills some gaps with its own staff estimates, and recent years may be preliminary.',
  },
  {
    id: 'NY.GDP.PCAP.CD',
    label: 'GDP per person',
    group: 'economy',
    format: 'usd',
    claim: 'compiled',
    claimNote: 'GDP divided by mid-year population, in current US dollars. Some values are World Bank staff estimates.',
  },
  {
    id: 'NY.GDP.MKTP.KD.ZG',
    label: 'GDP growth',
    group: 'economy',
    format: 'percent',
    claim: 'compiled',
    claimNote: 'Annual change in GDP at constant prices (adjusted for inflation). Some values are World Bank staff estimates.',
  },
  {
    id: 'FP.CPI.TOTL.ZG',
    label: 'Inflation',
    group: 'economy',
    format: 'percent',
    claim: 'official',
    claimNote: 'Annual change in consumer prices, as reported to the IMF.',
  },
  {
    id: 'SL.UEM.TOTL.ZS',
    label: 'Unemployment',
    group: 'economy',
    format: 'percent',
    claim: 'estimate',
    claimNote: 'Modelled estimate by the International Labour Organization (ILO), not a national survey figure.',
  },
  {
    id: 'NE.TRD.GNFS.ZS',
    label: 'Trade',
    group: 'economy',
    format: 'percentOfGdp',
    claim: 'compiled',
    claimNote: 'Exports plus imports of goods and services, as a share of GDP. Some values are World Bank staff estimates.',
  },
  {
    id: 'MS.MIL.XPND.CD',
    label: 'Military spending',
    group: 'military',
    format: 'usd',
    claim: 'compiled',
    claimNote: 'Compiled by SIPRI from official and open sources. Some values are SIPRI estimates; the World Bank data does not mark which.',
  },
  {
    id: 'MS.MIL.XPND.GD.ZS',
    label: 'Military spending',
    group: 'military',
    format: 'percentOfGdp',
    claim: 'compiled',
    claimNote: 'SIPRI military expenditure as a share of GDP. Some values are SIPRI estimates.',
  },
  {
    id: 'MS.MIL.TOTL.P1',
    label: 'Armed forces personnel',
    group: 'military',
    format: 'count',
    claim: 'estimate',
    claimNote: 'Active-duty military and paramilitary personnel, as estimated by the International Institute for Strategic Studies (IISS).',
  },
];

/**
 * Turns the World Bank's `sourceOrganization` text into a list of source names, dropping the
 * URLs, publishers and access dates it appends, e.g.
 * "SIPRI Military Expenditure Database, Stockholm ... (SIPRI), uri: https://..." ->
 * ["SIPRI Military Expenditure Database, Stockholm ... (SIPRI)"].
 */
export function parseSourceOrganization(text) {
  if (typeof text !== 'string') return [];
  return text
    .split(/;\s*\n|\n/)
    .map((part) => part.split(/,\s*(?:uri|publisher|type|date accessed):/i)[0].trim().replace(/;$/, ''))
    .filter(Boolean);
}

/** World Bank codes that differ from the map's country ids. */
export const WB_CODE_BY_MAP_ID = { KOS: 'XKX' };

/**
 * Validates one page of a World Bank API v2 response: `[meta, rows]`.
 * Throws on anything unexpected so a broken download never overwrites good data.
 */
export function parseWbPage(body, what) {
  if (!Array.isArray(body) || body.length < 2 || typeof body[0] !== 'object') {
    const message = Array.isArray(body) && body[0]?.message ? JSON.stringify(body[0].message) : 'unexpected shape';
    throw new Error(`World Bank API error for ${what}: ${message}`);
  }
  const [meta, rows] = body;
  if (!Array.isArray(rows)) throw new Error(`World Bank API returned no rows for ${what}`);
  return { meta, rows };
}

/** Keeps a readable precision: whole numbers for money and people, 2 decimals for rates. */
export function roundValue(value, format) {
  if (format === 'percent' || format === 'percentOfGdp') return Math.round(value * 100) / 100;
  return Math.round(value);
}

/**
 * Builds the committed data file from downloaded World Bank series.
 *
 * @param {object} args
 * @param {string[]} args.mapIds        Country ids on the map.
 * @param {Record<string, {meta: object, rows: object[]}>} args.series   Latest-value rows per indicator.
 * @param {Record<string, object>} args.indicatorInfo  World Bank indicator metadata per indicator.
 * @param {string} args.retrievedAt     ISO date of the download.
 */
export function buildProfiles({ mapIds, series, indicatorInfo, retrievedAt }) {
  const mapIdByWbCode = new Map(mapIds.map((id) => [WB_CODE_BY_MAP_ID[id] ?? id, id]));
  const countries = Object.fromEntries(mapIds.map((id) => [id, {}]));
  const indicators = [];
  const lastUpdated = new Set();

  for (const def of INDICATORS) {
    const s = series[def.id];
    const info = indicatorInfo[def.id];
    if (!s || !info) throw new Error(`Missing download for ${def.id}`);
    if (s.meta.lastupdated) lastUpdated.add(s.meta.lastupdated);

    let latestYear = 0;
    let matched = 0;
    for (const row of s.rows) {
      const mapId = mapIdByWbCode.get(row.countryiso3code);
      const year = Number(row.date);
      if (!mapId || typeof row.value !== 'number' || !Number.isFinite(row.value) || !Number.isInteger(year)) continue;
      countries[mapId][def.id] = [roundValue(row.value, def.format), year];
      latestYear = Math.max(latestYear, year);
      matched++;
    }
    // Guards against a partial or failed download silently wiping most of the data.
    if (matched < 100) throw new Error(`Only ${matched} countries had data for ${def.id}; refusing to write`);

    indicators.push({
      ...def,
      name: info.name,
      originalSources: parseSourceOrganization(info.sourceOrganization),
      url: `https://data.worldbank.org/indicator/${def.id}`,
      source: 'wdi',
      latestYear,
      countriesWithData: matched,
    });
  }

  return {
    generatedAt: retrievedAt,
    sources: {
      wdi: {
        name: 'World Development Indicators',
        publisher: 'World Bank',
        url: 'https://datacatalog.worldbank.org/search/dataset/0037712',
        license: 'CC BY 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
        lastUpdated: [...lastUpdated].sort().at(-1) ?? null,
        retrievedAt,
      },
    },
    indicators,
    countries,
  };
}
