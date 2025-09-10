export const prerender = true;

export function GET() {
  const js = `
export function makeShareUrl(path, params) {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://my-footy-site.pages.dev';
  const url = new URL(path, base);
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v == null) continue;
    const s = String(v);
    if (s.trim() === '') continue;
    sp.set(k, s);
  }
  url.search = sp.toString();
  return url.toString();
}
export function readParams(defaults) {
  if (typeof window === 'undefined') return defaults || {};
  const sp = new URL(window.location.href).searchParams;
  const out = Object.assign({}, defaults || {});
  sp.forEach((value, key) => {
    if (value === 'true' || value === 'false') out[key] = (value === 'true');
    else if (!Number.isNaN(Number(value)) && value.trim() !== '') out[key] = Number(value);
    else out[key] = value;
  });
  return out;
}
export function normalizeDecimal(input) {
  if (typeof input !== 'string') return String(input ?? '');
  const fullwidthDot = /[\\uFF0E\\uFF61]/g;
  let s = input.replace(/[，]/g, ',').replace(fullwidthDot, '.');
  if (s.includes(',') && !s.includes('.')) s = s.replace(',', '.');
  return s.trim();
}
`;
  return new Response(js, {
    headers: {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Cache-Control': 'no-store, must-revalidate'
    }
  });
}
