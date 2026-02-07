import { json, type TrackEnv } from './_types';

type Env = TrackEnv & Record<string, string | undefined>;

function normTeam(s: string) {
  return String(s || '')
    .toLowerCase()
    .replace(/\b(fc|cf|sc|afc)\b/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, ' ')
    .trim();
}

function timeDistanceMinutes(aIso: string, bIso: string) {
  const a = Date.parse(aIso);
  const b = Date.parse(bIso);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Infinity;
  return Math.abs(a - b) / 60000;
}

async function apiSportsFindFixture(params: {
  origin: string;
  leagueId: string;
  season: string;
  utcDate: string;
  home: string;
  away: string;
}) {
  const date = String(params.utcDate).slice(0, 10);
  const u = new URL('/api/api-sports/fixtures', params.origin);
  u.searchParams.set('league', params.leagueId);
  u.searchParams.set('season', params.season);
  u.searchParams.set('date', date);
  u.searchParams.set('timezone', 'UTC');

  const r = await fetch(u);
  const j = await r.json();
  if (!r.ok) throw new Error(`API-Sports fixtures error: ${r.status} ${JSON.stringify(j)}`);

  const list = j?.response || [];
  const th = normTeam(params.home);
  const ta = normTeam(params.away);
  const targetTime = String(params.utcDate);

  const candidates = list
    .map((x: any) => {
      const h = normTeam(x?.teams?.home?.name);
      const a = normTeam(x?.teams?.away?.name);
      const sameTeams = (h === th && a === ta) || (h === ta && a === th);
      const mins = timeDistanceMinutes(String(x?.fixture?.date || ''), targetTime);
      return { x, sameTeams, mins };
    })
    .filter((c: any) => c.sameTeams)
    .sort((p: any, q: any) => p.mins - q.mins);

  const hit = candidates.find((c: any) => c.mins <= 12 * 60) || candidates[0];
  return hit?.x?.fixture?.id || null;
}

function impliedNoVig(oddsA: number, oddsB: number) {
  const pa = 1 / oddsA;
  const pb = 1 / oddsB;
  const sum = pa + pb;
  return { pA: pa / sum, pB: pb / sum, overround: sum - 1 };
}

function pickAsianHandicapFromApiSportsOdds(payload: any, meta: { home: string; away: string }) {
  const entry = (payload?.response || [])[0];
  if (!entry) return null;

  const bm = (entry?.bookmakers || [])[0];
  if (!bm) return null;

  const bets = bm?.bets || [];
  const bet =
    bets.find((b: any) => String(b?.name || '').toLowerCase().includes('asian handicap')) ||
    bets.find((b: any) => String(b?.name || '').toLowerCase().includes('handicap'));
  if (!bet) return null;

  const vals = bet?.values || [];
  const byLine = new Map<string, { value: string; odd: number }[]>();

  for (const v of vals) {
    const value = String(v?.value || '');
    const odd = Number(v?.odd);
    if (!Number.isFinite(odd)) continue;

    // extract handicap line like -0.25, +0.5
    const m = value.match(/([+-]?\d+(?:\.\d+)?)/);
    const line = m ? m[1] : '';
    if (!line) continue;

    const arr = byLine.get(line) || [];
    arr.push({ value, odd });
    byLine.set(line, arr);
  }

  // pick the first line that has >=2 outcomes
  const entries = [...byLine.entries()]
    .map(([line, arr]) => ({ line, arr }))
    .filter((x) => x.arr.length >= 2);
  const best = entries[0];
  if (!best) return null;

  const homeKey = meta.home.toLowerCase();
  const awayKey = meta.away.toLowerCase();

  // Try assign sides
  const findSide = (s: string) => {
    const t = s.toLowerCase();
    if (t.includes('home') || t.includes(homeKey)) return 'home';
    if (t.includes('away') || t.includes(awayKey)) return 'away';
    return null;
  };

  let homeOdd: number | null = null;
  let awayOdd: number | null = null;
  for (const o of best.arr) {
    const side = findSide(o.value);
    if (side === 'home') homeOdd = o.odd;
    else if (side === 'away') awayOdd = o.odd;
  }
  // fallback: just take first two
  if (!homeOdd || !awayOdd) {
    homeOdd = best.arr[0]?.odd ?? null;
    awayOdd = best.arr[1]?.odd ?? null;
  }

  const implied = homeOdd && awayOdd ? impliedNoVig(homeOdd, awayOdd) : null;

  return {
    bookmaker: bm?.name,
    betName: bet?.name,
    line: best.line,
    homeOdd,
    awayOdd,
    implied, // {pA(home), pB(away), overround}
    outcomes: best.arr,
  };
}

export const onRequestPost: PagesFunction = async (context) => {
  const env = context.env as Env;
  const db = (env as any).DB as D1Database | undefined;
  if (!db) return json({ ok: false, error: 'DB binding missing (D1 not configured)' }, { status: 500 });

  const url = new URL(context.request.url);
  const matchId = url.searchParams.get('matchId');
  const leagueKey = url.searchParams.get('leagueKey');
  const season = url.searchParams.get('season') || '2024';
  const bookmakerId = url.searchParams.get('bookmaker'); // optional numeric

  if (!matchId || !leagueKey) return json({ ok: false, error: 'missing matchId or leagueKey' }, { status: 400 });

  const origin = new URL(context.request.url).origin;

  // 1) load match meta from football-data
  const uMatch = new URL('/api/football-data/match', origin);
  uMatch.searchParams.set('id', matchId);
  const rMatch = await fetch(uMatch);
  const jMatch = await rMatch.json();
  if (!rMatch.ok) return json({ ok: false, error: 'football-data match error', detail: jMatch }, { status: 502 });

  const meta = {
    utcDate: String(jMatch?.utcDate || ''),
    home: String(jMatch?.homeTeam?.name || ''),
    away: String(jMatch?.awayTeam?.name || ''),
  };

  const LEAGUE_MAP: Record<string, string> = {
    epl: '39',
    laliga: '140',
    seriea: '135',
    bundesliga: '78',
    ligue1: '61',
  };
  const leagueId = LEAGUE_MAP[String(leagueKey)] || '';
  if (!leagueId) return json({ ok: false, error: 'unknown leagueKey for api-sports' }, { status: 400 });

  // 2) map to api-sports fixture
  const fixtureId = await apiSportsFindFixture({ origin, leagueId, season, ...meta });
  if (!fixtureId) return json({ ok: false, error: 'api-sports fixture not found', meta }, { status: 404 });

  // 3) fetch odds (all bets) then parse asian handicap
  const uOdds = new URL('/api/api-sports/odds', origin);
  uOdds.searchParams.set('fixture', String(fixtureId));
  if (bookmakerId && /^\d+$/.test(bookmakerId)) uOdds.searchParams.set('bookmaker', bookmakerId);

  const rOdds = await fetch(uOdds);
  const jOdds = await rOdds.json();
  if (!rOdds.ok) return json({ ok: false, error: 'api-sports odds error', detail: jOdds }, { status: 502 });

  const ah = pickAsianHandicapFromApiSportsOdds(jOdds, meta);

  const createdAt = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO odds_snapshot (
          match_id, created_at, source, league_key, season,
          api_fixture_id, bookmaker_id,
          payload_json
        ) VALUES (?, ?, 'api-sports', ?, ?, ?, ?, ?);`
    )
    .bind(matchId, createdAt, leagueKey, season, String(fixtureId), bookmakerId || null, JSON.stringify({ ah }))
    .run();

  return json({ ok: true, matchId, leagueKey, season, fixtureId, ah, createdAt });
};
