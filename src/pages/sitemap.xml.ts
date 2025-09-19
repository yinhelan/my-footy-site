import type { APIRoute } from 'astro';

const BASE = 'https://my-footy-site.pages.dev';
const PATHS = [
  '/', '/tools', '/tools/poisson', '/tools/implied-odds', '/tools/kelly', '/tools/match-insights', '/articles/'
];

export const GET: APIRoute = () => {
  const urls = PATHS.map(p => `<url><loc>${BASE}${p}</loc><changefreq>weekly</changefreq><priority>${p==='/'?'1.0':'0.7'}</priority></url>`).join('');
  const body = `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
