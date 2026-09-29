# Diplomapper

An interactive world atlas with a grand-strategy feel. This is milestone 1: a world map you
can pan and zoom, with country hover, click-to-select, a country panel and shareable links.

Economy, military and relationship data are **not** included yet. They'll be added only once
every figure can be backed by a cited source and a reporting date.

## How it works

- **Map:** [MapLibre GL JS](https://maplibre.org/), drawn entirely from bundled
  [Natural Earth](https://www.naturalearthdata.com/) 1:50m country boundaries. There are no
  basemap tiles, API keys or third-party requests.
- **Which country is selected first:**
  1. The `?c=` code in the URL (ISO 3166-1 alpha-3, e.g. `?c=FRA`), if it names a country
     on the map.
  2. Otherwise, the visitor's country from Cloudflare (see below), if one is available.
  3. Otherwise, the United States.

  A country the user picks (on the map or from the list) is never replaced automatically,
  even if detection finishes later. Picking a country writes `?c=` to the URL, so the
  address bar is always shareable, and the Back button steps through selections.
- **Country detection:** `functions/api/country.ts` is a Cloudflare Pages Function that
  returns only the two-letter country Cloudflare already works out for every request
  (`request.cf.country`, the same value as the `CF-IPCountry` header). The IP address is
  never returned or stored, and the browser's geolocation API is never used. `_headers`
  also disables it with `Permissions-Policy: geolocation=()`. The map renders straight
  away without waiting for detection, which gives up after 4 seconds. Detection isn't
  requested at all when the URL already names a country.

## Project layout

```
src/
  core/        Framework-free domain logic: country index, selection rules, URL param
  state/       Zustand store (selection state and URL updates)
  map/         MapLibre map, layer styling, worker setup
  panels/      Country panel
  location/    Client for the country-detection endpoint
  data/        countries.json (generated from Natural Earth; committed)
functions/
  api/country.ts   Cloudflare Pages Function: GET /api/country
scripts/
  build-countries.mjs   Regenerates src/data/countries.json from Natural Earth
public/
  _headers     Cloudflare Pages response headers
```

## Run locally

Requires Node.js 22 or later (see `.node-version`).

```bash
npm install
npm run dev          # http://localhost:5173
```

`npm run dev` serves the front end only. `/api/country` doesn't exist there, so the app
quietly falls back to the United States. That's expected. To run the site with the
Pages Function as Cloudflare would:

```bash
npm run build
npx wrangler pages dev dist   # http://localhost:8788 (Wrangler is downloaded on first use)
```

## Checks and build

```bash
npm run check        # ESLint + TypeScript + unit tests (Vitest)
npm run build        # type-check and build into dist/
npm run preview      # serve dist/ locally (without the Pages Function)
```

GitHub Actions (`.github/workflows/ci.yml`) runs `npm run check` and `npm run build` on
every push and pull request.

## Deploy to Cloudflare Pages

The site deploys as a Cloudflare Pages project connected to this GitHub repository.
Cloudflare builds it on every push. Every non-production branch and pull request also
gets its own preview URL.

**Build settings**

| Setting                  | Value            |
| ------------------------ | ---------------- |
| Framework preset         | `React (Vite)`   |
| Build command            | `npm run build`  |
| Build output directory   | `dist`           |
| Root directory           | *(leave empty)*  |
| Environment variables    | none required    |

Node.js 22 is picked up from `.node-version`. The `functions/` directory is detected
automatically, and Cloudflare generates the routing so that only `/api/country` runs a
Function; everything else is served as free static assets.

**Dashboard steps (one-time)**

1. Sign in at <https://dash.cloudflare.com> and open **Workers & Pages**.
2. Select **Create application**, then the **Pages** tab (not Workers), then
   **Import an existing Git repository**.
3. Connect GitHub if prompted. When GitHub asks which repositories to allow, grant access
   to `diplomapper`.
4. Select the `diplomapper` repository, then **Begin setup**.
5. **Project name:** this becomes your URL, `https://<project-name>.pages.dev`.
6. **Production branch:** the branch you want live at that URL (normally `main`).
7. Enter the build settings from the table above.
8. Select **Save and Deploy**. When the build finishes, open the `*.pages.dev` link shown
   on the deployment page.

**Checking it works on the live site**

- `https://<project-name>.pages.dev/api/country` should return something like
  `{"country":"GB"}`.
- Opening the site should select your country. If Cloudflare can't determine it (or
  you're on Tor), it selects the United States.
- `https://<project-name>.pages.dev/?c=JPN` should open on Japan wherever you are.

## Data and attribution

- **Country boundaries:** [Natural Earth](https://www.naturalearthdata.com/) 1:50m
  Admin 0 – Countries, v5.1.2. Natural Earth is in the public domain, so no attribution is
  legally required; we credit it on the map and in the panel anyway. It shows
  *de facto* boundaries. How a border is drawn does not imply endorsement of any
  territorial claim. To regenerate the data: `npm run data:countries`.
- **Map library:** [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js),
  BSD-3-Clause.
