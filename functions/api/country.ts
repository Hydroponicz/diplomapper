// GET /api/country -> { "country": "FR" } or { "country": null }
//
// Returns only the two-letter country Cloudflare already derives for every request
// (request.cf.country, the same value as the CF-IPCountry header). The IP address is
// never returned, logged or stored, and nothing is cached across visitors.

import { normalizeVisitorCountry } from '../../src/core/visitorCountry';

export const onRequestGet: PagesFunction = ({ request }) => {
  const country = normalizeVisitorCountry(request.cf?.country);
  return Response.json(
    { country },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
};
