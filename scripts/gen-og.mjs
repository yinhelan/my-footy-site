import { mkdir, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';
import path from 'node:path';
const outDir = path.resolve('public/og');
await mkdir(outDir, { recursive: true });
const W = 1200, H = 630;
const base = ({title, subtitle}) => `<!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<defs>
  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#0ea5e9"/><stop offset="100%" stop-color="#1e293b"/>
  </linearGradient>
</defs>
<rect width="100%" height="100%" fill="url(#g)"/>
<rect x="24" y="24" rx="24" ry="24" width="${W-48}" height="${H-48}" fill="rgba(255,255,255,0.08)"/>
<g font-family="system-ui,-apple-system,Segoe UI,Roboto,Ubuntu" fill="#fff">
  <text x="60" y="220" font-size="72" font-weight="700">${escapeXml(title)}</text>
  ${subtitle?`<text x="60" y="310" font-size="36" opacity="0.9">${escapeXml(subtitle)}</text>`:''}
  <text x="60" y="${H-60}" font-size="28" opacity="0.85">my-footy-site.pages.dev</text>
</g>
</svg>`;
function escapeXml(s){return String(s).replace(/[&<>"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[m]))}
async function renderPng(name, title, subtitle){
  const svg = base({title, subtitle});
  const r = new Resvg(svg,{fitTo:{mode:'width',value:W}});
  const png = r.render().asPng();
  await writeFile(path.join(outDir, `${name}.png`), png);
}
await renderPng('default', 'Footy Analytics', 'Simple tools & notes');
await renderPng('home', 'Footy Analytics', 'Poisson · Implied Odds · Kelly');
await renderPng('poisson', 'Poisson Scoreline', 'BTTS / Over–Under');
await renderPng('implied', 'Implied → Fair Odds', 'Remove Overround');
await renderPng('kelly', 'Kelly Stake', 'Edge & Stake Sizing');
await renderPng('article', 'Footy Analytics', 'Guides & Playbooks');
console.log('OG images generated at /public/og/*.png');
