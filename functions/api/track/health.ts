import { json, type TrackEnv } from './_types';

type Env = TrackEnv & Record<string, any>;

export const onRequestGet: PagesFunction = async (context) => {
  const env = context.env as Env;
  const hasDB = !!env.DB;
  return json({ ok: true, hasDB });
};
