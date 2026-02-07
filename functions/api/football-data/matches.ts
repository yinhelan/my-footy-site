type Env = Record<string, string | undefined>;

/**
 * Proxy football-data.org competition matches.
 *
 * GET /api/football-data/matches?competition=PL&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
 *
 * competition: competition code (PL|PD|SA|BL1|FL1|CL...)
 */
export const onRequestGet: PagesFunction = async (context) => {
  const env = context.env as Env;
  const token = env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    return new Response(JSON.stringify({ ok: false, error: 'FOOTBALL_DATA_TOKEN missing' }), {
      status: 500,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  const url = new URL(context.request.url);
  const competition = url.searchParams.get('competition');
  const dateFrom = url.searchParams.get('dateFrom');
  const dateTo = url.searchParams.get('dateTo');

  if (!competition) {
    return new Response(JSON.stringify({ ok: false, error: 'missing required query: competition' }), {
      status: 400,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  const upstream = new URL(`https://api.football-data.org/v4/competitions/${encodeURIComponent(competition)}/matches`);
  if (dateFrom) upstream.searchParams.set('dateFrom', dateFrom);
  if (dateTo) upstream.searchParams.set('dateTo', dateTo);

  const r = await fetch(upstream.toString(), {
    headers: {
      'X-Auth-Token': token,
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
