export const onRequestGet: PagesFunction = async (context) => {
  const env = context.env as Record<string, string | undefined>;
  const key = env.ODDS_API_KEY;
  if (!key) {
    return new Response(JSON.stringify({ ok: false, error: 'ODDS_API_KEY missing' }), {
      status: 500,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }

  const url = new URL('https://api.the-odds-api.com/v4/sports');
  url.searchParams.set('apiKey', key);

  const r = await fetch(url.toString(), {
    headers: { accept: 'application/json' },
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
