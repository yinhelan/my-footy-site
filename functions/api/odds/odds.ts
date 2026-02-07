type Env = Record<string, string | undefined>;

/**
 * Proxy the-odds-api.com odds endpoint.
 *
 * GET /api/odds/odds?sport=soccer_epl&regions=eu&markets=h2h&oddsFormat=decimal
 */
export const onRequestGet: PagesFunction = async (context) => {
  const env = context.env as Env;
  const key = env.ODDS_API_KEY;
  if (!key) {
    return new Response(JSON.stringify({ ok: false, error: 'ODDS_API_KEY missing' }), {
      status: 500,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  const url = new URL(context.request.url);
  const sport = url.searchParams.get('sport');
  if (!sport) {
    return new Response(JSON.stringify({ ok: false, error: 'missing required query: sport' }), {
      status: 400,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  const regions = url.searchParams.get('regions') ?? 'eu';
  const markets = url.searchParams.get('markets') ?? 'h2h';
  const oddsFormat = url.searchParams.get('oddsFormat') ?? 'decimal';
  const dateFormat = url.searchParams.get('dateFormat') ?? 'iso';
  const bookmakers = url.searchParams.get('bookmakers');

  const upstream = new URL(`https://api.the-odds-api.com/v4/sports/${encodeURIComponent(sport)}/odds`);
  upstream.searchParams.set('apiKey', key);
  upstream.searchParams.set('regions', regions);
  upstream.searchParams.set('markets', markets);
  upstream.searchParams.set('oddsFormat', oddsFormat);
  upstream.searchParams.set('dateFormat', dateFormat);
  if (bookmakers) upstream.searchParams.set('bookmakers', bookmakers);

  const r = await fetch(upstream.toString(), { headers: { accept: 'application/json' } });
  const body = await r.text();
  return new Response(body, {
    status: r.status,
    headers: {
      'content-type': r.headers.get('content-type') ?? 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
};
