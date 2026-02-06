export const onRequestGet: PagesFunction = async (context) => {
  const env = context.env as Record<string, string | undefined>;

  // Note: do NOT return secrets.
  const has = {
    footballData: Boolean(env.FOOTBALL_DATA_TOKEN),
    apiSports: Boolean(env.APISPORTS_KEY),
    oddsApi: Boolean(env.ODDS_API_KEY),
  };

  const checks: Record<string, any> = { ...has };

  async function check(name: string, fn: () => Promise<Response>) {
    if (!has[name as keyof typeof has]) {
      checks[`${name}Check`] = { ok: false, error: 'missing_env' };
      return;
    }
    try {
      const r = await fn();
      const ok = r.ok;
      checks[`${name}Check`] = {
        ok,
        status: r.status,
        // surface basic rate-limit-ish headers when present
        headers: {
          'x-requestcounter-reset': r.headers.get('x-requestcounter-reset'),
          'x-ratelimit-remaining': r.headers.get('x-ratelimit-remaining'),
          'x-ratelimit-limit': r.headers.get('x-ratelimit-limit'),
          'x-ratelimit-reset': r.headers.get('x-ratelimit-reset'),
        },
      };
    } catch (e: any) {
      checks[`${name}Check`] = { ok: false, error: String(e?.message ?? e) };
    }
  }

  await Promise.all([
    check('footballData', () =>
      fetch('https://api.football-data.org/v4/competitions?plan=TIER_ONE', {
        headers: { 'X-Auth-Token': env.FOOTBALL_DATA_TOKEN ?? '' },
      })
    ),
    check('apiSports', () =>
      fetch('https://v3.football.api-sports.io/timezone', {
        headers: { 'x-apisports-key': env.APISPORTS_KEY ?? '' },
      })
    ),
    check('oddsApi', () => {
      const url = new URL('https://api.the-odds-api.com/v4/sports');
      url.searchParams.set('apiKey', env.ODDS_API_KEY ?? '');
      return fetch(url.toString());
    }),
  ]);

  return new Response(JSON.stringify({ ok: true, ...checks }, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
};
