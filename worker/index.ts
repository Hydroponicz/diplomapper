// Cloudflare Worker for Diplomapper.
//
// Static files (the built app in dist/) are served directly by Workers static assets.
// Only /api/* reaches this script (see run_worker_first in wrangler.jsonc).

import { normalizeVisitorCountry } from '../src/core/visitorCountry';

interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // GET /api/country -> { "country": "FR" } or { "country": null }
    // Returns only the two-letter country Cloudflare already derives for every request
    // (request.cf.country, the same value as the CF-IPCountry header). The IP address is
    // never returned, logged or stored, and nothing is cached across visitors.
    if (url.pathname === '/api/country') {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
      }
      const country = normalizeVisitorCountry(request.cf?.country);
      return Response.json({ country }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    if (url.pathname.startsWith('/api/')) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
