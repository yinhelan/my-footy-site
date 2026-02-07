type Env = Record<string, string | undefined>;

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
  const league = url.searchParams.get('league');
  const season = url.searchParams.get('season');
  const date = url.searchParams.get('date');
  const timezone = url.searchParams.get('timezone') ?? 'Asia/Shanghai';

  if (!league || !season || !date) {
    return new Response(
      JSON.stringify({ ok: false, error: 'missing required query: league, season, date (YYYY-MM-DD)' }),
      { status: 400, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }
    );
  }

  const upstream = new URL('https://v3.football.api-sports.io/fixtures');
  upstream.searchParams.set('league', league);
  upstream.searchParams.set('season', season);
  upstream.searchParams.set('date', date);
  upstream.searchParams.set('timezone', timezone);

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
