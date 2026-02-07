type Env = Record<string, string | undefined>;

// football-data.org: GET /v4/matches/{id}
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
  const id = url.searchParams.get('id');
  if (!id) {
    return new Response(JSON.stringify({ ok: false, error: 'missing required query: id' }), {
      status: 400,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  const upstream = `https://api.football-data.org/v4/matches/${encodeURIComponent(id)}`;
  const r = await fetch(upstream, {
    headers: { 'X-Auth-Token': token, accept: 'application/json' },
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
