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

function pickAsianHandicapFromApiSportsOdds(payload: any) {
  const entry = (payload?.response || [])[0];
  if (!entry) return null;

  const bm = (entry?.bookmakers || [])[0];
  if (!bm) return null;

  // Find Asian Handicap bet
  const bets = bm?.bets || [];
  const bet =
    bets.find((b: any) => String(b?.name || '').toLowerCase().includes('asian handicap')) ||
    bets.find((b: any) => String(b?.name || '').toLowerCase().includes('handicap'));
  if (!bet) return null;

  // values typically include line like "-0.5" for Home/Away
  const vals = bet?.values || [];
  const lines = new Map<string, any[]>();
  for (const v of vals) {
    const value = String(v?.value || '');
    // try split: "Home -0.5" / "Away +0.5" / or "-0.5"
    const m = value.match(/([+-]?\d+(?:\.\d+)?)/);
    const line = m ? m[1] : '';
    if (!line) continue;
    const arr = lines.get(line) || [];
    arr.push(v);
    lines.set(line, arr);
  }
  const bestLine = [...lines.keys()][0];
  if (!bestLine) return null;

  const pack = lines.get(bestLine) || [];
  // try pick two odds
  const odds = pack
    .map((v) => ({ name: String(v?.value || ''), odd: Number(v?.odd) }))
    .filter((x) => Number.isFinite(x.odd));

  return { bookmaker: bm?.name, betName: bet?.name, line: bestLine, odds };
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

  const ah = pickAsianHandicapFromApiSportsOdds(jOdds);

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
