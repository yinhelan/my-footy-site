import { json, type TrackEnv } from './_types';

type Env = TrackEnv & Record<string, any>;

export const onRequestPost: PagesFunction = async (context) => {
  const env = context.env as Env;
  const db = env.DB;
  if (!db) return json({ ok: false, error: 'DB binding missing (D1 not configured)' }, { status: 500 });

  const url = new URL(context.request.url);
  const matchId = url.searchParams.get('matchId');
  if (!matchId) return json({ ok: false, error: 'missing matchId' }, { status: 400 });

  await db
    .prepare(
      `INSERT INTO track_match (match_id, created_at)
       VALUES (?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
       ON CONFLICT(match_id) DO NOTHING;`
    )
    .bind(matchId)
    .run();

  return json({ ok: true, matchId });
};
