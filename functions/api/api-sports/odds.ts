type Env = Record<string, string | undefined>;

/**
 * Fetch 1X2 odds for a given fixture.
 *
 * Query:
 * - fixture: number (required)
 * - bookmaker: number (optional)
 * - bet: number (optional)  (API-Football bet id for 1X2; if omitted we'll fetch all and pick by name)
 */
export const onRequestGet: PagesFunction = async (context) => {
  const env = context.env as Env;
  const key = env.APISPORTS_KEY;
  if (!key) {
    return new Response(JSON.stringify({ ok: false, error: 'APISPORTS_KEY missing' }), {
      status: 500,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  const url = new URL(context.request.url);
  const fixture = url.searchParams.get('fixture');
  const bookmaker = url.searchParams.get('bookmaker');
  const bet = url.searchParams.get('bet');

  if (!fixture) {
    return new Response(JSON.stringify({ ok: false, error: 'missing required query: fixture' }), {
      status: 400,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  const upstream = new URL('https://v3.football.api-sports.io/odds');
  upstream.searchParams.set('fixture', fixture);
  // Keep payload small & deterministic
  upstream.searchParams.set('page', '1');
  if (bookmaker) upstream.searchParams.set('bookmaker', bookmaker);
  if (bet) upstream.searchParams.set('bet', bet);

  const r = await fetch(upstream.toString(), {
    headers: {
      'x-apisports-key': key,
      accept: 'application/json',
    },
  });

  const body = await r.text();
  return new Response(body, {
    status: r.status,
    headers: {
      'content-type': r.headers.get('content-type') ?? 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
};
