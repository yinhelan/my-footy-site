import { json, type TrackEnv } from './_types';

type Env = TrackEnv & Record<string, string | undefined>;

export const onRequestGet: PagesFunction = async (context) => {
  const env = context.env as Env;
  const db = (env as any).DB as D1Database | undefined;
  if (!db) return json({ ok: false, error: 'DB binding missing (D1 not configured)' }, { status: 500 });

  const url = new URL(context.request.url);
  const matchId = url.searchParams.get('matchId');
  if (!matchId) return json({ ok: false, error: 'missing matchId' }, { status: 400 });

  const limit = Math.min(Number(url.searchParams.get('limit') || 50) || 50, 200);

  // odds_snapshot.payload_json contains different shapes. Filter to odds-api spreads snapshots.
  const rows = await db
    .prepare(
      `SELECT id, match_id, created_at, source, league_key, season, api_fixture_id, bookmaker_id, payload_json
       FROM odds_snapshot
       WHERE match_id = ? AND source = 'odds-api'
       ORDER BY created_at DESC
       LIMIT ?;`
    )
    .bind(matchId, limit)
    .all();

  const out = (rows.results || []).map((r: any) => {
    let payload: any = null;
    try { payload = r.payload_json ? JSON.parse(r.payload_json) : null; } catch {}
    const spreads = payload?.spreads || payload?.spreadsSnapshot || payload?.spreads_market || payload?.spreadsData || payload?.spreads;
    // We stored as { spreads: pick, meta }
    const sp = payload?.spreads || null;
    return {
      ...r,
      spreads: sp,
      meta: payload?.meta || null,
    };
  });

  return json({ ok: true, matchId, rows: out });
};
