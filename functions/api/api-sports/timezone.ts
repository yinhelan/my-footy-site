export const onRequestGet: PagesFunction = async (context) => {
  const env = context.env as Record<string, string | undefined>;
  const key = env.APISPORTS_KEY;
  if (!key) {
    return new Response(JSON.stringify({ ok: false, error: 'APISPORTS_KEY missing' }), {
      status: 500,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }

  const r = await fetch('https://v3.football.api-sports.io/timezone', {
    headers: {
      'x-apisports-key': key,
      'accept': 'application/json',
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
