export type Primitive = string | number | boolean | null | undefined;

export function encodeState(obj: Record<string, Primitive>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || Number.isNaN(v as any)) continue;
    p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

export function decodeState<T extends Record<string, any>>(search: string, defaults: T): T {
  const q = new URLSearchParams(search || '');
  const out: any = { ...defaults };
  for (const k of Object.keys(defaults)) {
    if (!q.has(k)) continue;
    const raw = q.get(k)!;
    const def = defaults[k];
    if (typeof def === 'number') {
      const n = Number(raw);
      out[k] = Number.isFinite(n) ? n : def;
    } else if (typeof def === 'boolean') {
      out[k] = raw === 'true' || raw === '1';
    } else {
      out[k] = raw;
    }
  }
  return out;
}

export function syncToUrl(state: Record<string, Primitive>, replace = true) {
  const s = encodeState(state);
  const url = `${location.pathname}${s}${location.hash || ''}`;
  if (replace) history.replaceState(null, '', url);
  else history.pushState(null, '', url);
}
