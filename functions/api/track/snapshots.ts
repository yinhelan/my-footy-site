import { json, type TrackEnv } from './_types';

type Env = TrackEnv & Record<string, any>;

export const onRequestGet: PagesFunction = async (context) => {
  const env = context.env as Env;
  const db = env.DB;
  if (!db) return json({ ok: false, error: 'DB binding missing (D1 not configured)' }, { status: 500 });

  const url = new URL(context.request.url);
  const matchId = url.searchParams.get('matchId');
  if (!matchId) return json({ ok: false, error: 'missing matchId' }, { status: 400 });

  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') || 50)));

  const res = await db
    .prepare(
      `SELECT id, match_id, created_at, source, league_key, season, api_fixture_id, bookmaker_id, payload_json
       FROM odds_snapshot
       WHERE match_id = ?
       ORDER BY created_at DESC
       LIMIT ?;`
    )
    .bind(matchId, limit)
    .all();

  const rows = (res.results || []).map((r: any) => ({
    ...r,
    payload: (() => {
      try {
        return JSON.parse(r.payload_json);
      } catch {
        return null;
      }
    })(),
  }));

  return json({ ok: true, matchId, rows });
};
