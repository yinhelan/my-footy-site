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

function impliedNoVig(oddsA: number, oddsB: number) {
  const pa = 1 / oddsA;
  const pb = 1 / oddsB;
  const sum = pa + pb;
  return { pA: pa / sum, pB: pb / sum, overround: sum - 1 };
}

function pickSpreadsFromOddsApi(payload: any[], meta: { utcDate: string; home: string; away: string }, bookmakerHint = '') {
  const targetHome = normTeam(meta.home);
  const targetAway = normTeam(meta.away);
  const targetTime = String(meta.utcDate);

  const candidates = (payload || [])
    .map((ev: any) => {
      const h = normTeam(ev?.home_team);
      const a = normTeam(ev?.away_team);
      const sameTeams = (h === targetHome && a === targetAway) || (h === targetAway && a === targetHome);
      const mins = timeDistanceMinutes(String(ev?.commence_time || ''), targetTime);
      return { ev, sameTeams, mins };
    })
    .filter((c: any) => c.sameTeams)
    .sort((p: any, q: any) => p.mins - q.mins);

  const hit = candidates.find((c: any) => c.mins <= 12 * 60) || candidates[0];
  if (!hit) return null;

  const ev = hit.ev;
  const bms = ev?.bookmakers || [];
  const hint = String(bookmakerHint || '').toLowerCase().trim();
  const bm =
    (hint
      ? bms.find((b: any) => String(b.key || '').toLowerCase() === hint || String(b.title || '').toLowerCase().includes(hint))
      : null) ||
    bms.find((b: any) => String(b.key || '').toLowerCase() === 'pinnacle') ||
    bms[0];
  if (!bm) return null;

  const mkt = (bm?.markets || []).find((m: any) => m.key === 'spreads');
  if (!mkt) return null;

  const outs = mkt?.outcomes || [];
  // outcomes are typically two entries with same point magnitude (+/-)
  const homeOut = outs.find((o: any) => String(o.name || '').toLowerCase() === String(ev.home_team || '').toLowerCase());
  const awayOut = outs.find((o: any) => String(o.name || '').toLowerCase() === String(ev.away_team || '').toLowerCase());
  if (!homeOut || !awayOut) return null;

  const homePrice = Number(homeOut.price);
  const awayPrice = Number(awayOut.price);
  const homePoint = Number(homeOut.point);
  const awayPoint = Number(awayOut.point);

  if (!Number.isFinite(homePrice) || !Number.isFinite(awayPrice)) return null;

  const implied = impliedNoVig(homePrice, awayPrice);

  return {
    event: { id: ev.id, commence_time: ev.commence_time, home_team: ev.home_team, away_team: ev.away_team },
    bookmaker: bm.title || bm.key,
    key: bm.key,
    market: 'spreads',
    home: { team: ev.home_team, point: homePoint, price: homePrice },
    away: { team: ev.away_team, point: awayPoint, price: awayPrice },
    implied,
  };
}

export const onRequestPost: PagesFunction = async (context) => {
  const env = context.env as Env;
  const db = (env as any).DB as D1Database | undefined;
  if (!db) return json({ ok: false, error: 'DB binding missing (D1 not configured)' }, { status: 500 });

  const url = new URL(context.request.url);
  const matchId = url.searchParams.get('matchId');
  const leagueKey = url.searchParams.get('leagueKey');
  const bookmaker = url.searchParams.get('bookmaker') || '';

  const utcDate = url.searchParams.get('utcDate') || '';
  const home = url.searchParams.get('home') || '';
  const away = url.searchParams.get('away') || '';

  if (!matchId || !leagueKey) return json({ ok: false, error: 'missing matchId or leagueKey' }, { status: 400 });
  if (!(utcDate && home && away)) {
    return json({ ok: false, error: 'missing required meta: utcDate, home, away' }, { status: 400 });
  }

  const LEAGUE_TO_SPORT: Record<string, string> = {
    epl: 'soccer_epl',
    laliga: 'soccer_spain_la_liga',
    seriea: 'soccer_italy_serie_a',
    bundesliga: 'soccer_germany_bundesliga',
    ligue1: 'soccer_france_ligue_one',
  };
  const sport = LEAGUE_TO_SPORT[String(leagueKey)];
  if (!sport) return json({ ok: false, error: 'unknown leagueKey for odds-api', leagueKey }, { status: 400 });

  const origin = new URL(context.request.url).origin;
  const u = new URL('/api/odds/odds', origin);
  u.searchParams.set('sport', sport);
  u.searchParams.set('regions', 'eu');
  u.searchParams.set('markets', 'spreads');
  u.searchParams.set('oddsFormat', 'decimal');
  u.searchParams.set('dateFormat', 'iso');

  const r = await fetch(u);
  const j = await r.json();
  if (!r.ok) return json({ ok: false, error: 'odds-api error', detail: j }, { status: 502 });

  const meta = { utcDate, home, away };
  const pick = pickSpreadsFromOddsApi(j, meta, bookmaker);
  if (!pick) return json({ ok: false, error: 'could not match event or spreads market', meta }, { status: 404 });

  const createdAt = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO odds_snapshot (
          match_id, created_at, source, league_key, season,
          api_fixture_id, bookmaker_id,
          payload_json
        ) VALUES (?, ?, 'odds-api', ?, NULL, NULL, ?, ?);`
    )
    .bind(matchId, createdAt, leagueKey, bookmaker || null, JSON.stringify({ spreads: pick, meta }))
    .run();

  return json({ ok: true, matchId, leagueKey, createdAt, spreads: pick });
};
