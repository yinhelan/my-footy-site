import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.BASE || 'http://localhost:4321';
const MAX_PAGES = 200;
const ORIGIN = new URL(BASE).origin;
const visited = new Set();
const queue = [new URL(BASE).toString()];
const urls = [];

function normalize(u){
  try{
    const url = new URL(u, BASE);
    if (url.origin !== ORIGIN) return null;
    // 去掉hash，统一目录页末尾斜杠
    url.hash = '';
    let s = url.toString().replace(/\/+$/, '/');
    return s;
  }catch{ return null; }
}

function extractLinks(document, baseUrl){
  const as = [...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href'));
  const good = [];
  for (const href of as){
    if (!href) continue;
    if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) continue;
    const u = normalize(href);
    if (u) good.push(u);
  }
  return [...new Set(good)];
}

function text(el){ return el?.textContent?.trim() || ''; }

function collectMeta(document){
  const head = document.querySelector('head');
  const get = (sel)=> head?.querySelector(sel);
  const metas = [...document.querySelectorAll('meta')];
  const og = {};
  for (const m of metas){
    const p = m.getAttribute('property') || m.getAttribute('name');
    if (p && (p.startsWith('og:') || p.startsWith('twitter:'))) {
      og[p] = m.getAttribute('content') || '';
    }
  }
  const ldjson = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s=>s.textContent?.trim()).filter(Boolean);

  const imgs = [...document.querySelectorAll('img')];
  const imgNoAlt = imgs.filter(i => !(i.getAttribute('alt')?.trim())).map(i => i.getAttribute('src') || '');

  const h1s = [...document.querySelectorAll('h1')].map(h=>text(h));

  return {
    title: text(get('title')),
    description: get('meta[name="description"]')?.getAttribute('content') || '',
    canonical: get('link[rel="canonical"]')?.getAttribute('href') || '',
    og,
    hasManifest: !!get('link[rel="manifest"]'),
    hasRobotsMeta: !!get('meta[name="robots"]'),
    ldjsonCount: ldjson.length,
    ldjsonSamples: ldjson.slice(0,2),
    h1Count: h1s.length,
    h1: h1s,
    imagesTotal: imgs.length,
    imagesMissingAlt: imgNoAlt,
    hasToolingJS: !![...document.querySelectorAll('script[src]')].find(s => (s.getAttribute('src')||'').includes('/tooling.js')),
  };
}

async function fetchText(u) {
  const res = await fetch(u);
  const text = await res.text();
  return {status: res.status, headers: Object.fromEntries(res.headers), text};
}

const summary = [];
while (queue.length && visited.size < MAX_PAGES){
  const u = queue.shift();
  if (!u || visited.has(u)) continue;
  visited.add(u);
  try{
    const {status, headers, text} = await fetchText(u);
    const dom = new JSDOM(text);
    const doc = dom.window.document;

    urls.push(u);
    const meta = collectMeta(doc);
    summary.push({ url: u, status, headers, ...meta });

    const links = extractLinks(doc, u);
    for (const l of links){
      if (!visited.has(l)) queue.push(l);
    }
  }catch(e){
    summary.push({ url: u, error: String(e) });
  }
}

fs.writeFileSync('audit/urls.txt', urls.join('\n'));
fs.writeFileSync('audit/report.json', JSON.stringify(summary, null, 2));

// 生成一个简要的 Markdown 汇总
function pct(n, d){ return d ? (100*n/d).toFixed(1) : '0.0'; }
const pages = summary.length;
const pagesWithTitle = summary.filter(s=>s.title).length;
const pagesWithDesc = summary.filter(s=>s.description).length;
const pagesWithOG = summary.filter(s=>Object.keys(s.og||{}).length>=3).length;
const pagesWithLD = summary.filter(s=>s.ldjsonCount>0).length;
const pagesWithH1 = summary.filter(s=>s.h1Count===1).length;
const imagesMissingAlt = summary.reduce((acc,s)=>acc + (s.imagesMissingAlt?.length||0), 0);

const md = `# 本地站点审计摘要
基址：${BASE}
已抓取页面：${pages} 个（上限 ${MAX_PAGES}）

- 有 <title> 的页面：${pagesWithTitle}/${pages}（${pct(pagesWithTitle,pages)}%）
- 有 meta description 的页面：${pagesWithDesc}/${pages}（${pct(pagesWithDesc,pages)}%）
- OG/Twitter（≥3项）的页面：${pagesWithOG}/${pages}（${pct(pagesWithOG,pages)}%）
- JSON-LD(结构化数据) 的页面：${pagesWithLD}/${pages}（${pct(pagesWithLD,pages)}%）
- H1 恰好 1 个的页面：${pagesWithH1}/${pages}（${pct(pagesWithH1,pages)}%）
- 站内累计无 ALT 图片：${imagesMissingAlt} 张

详见：audit/report.json
`;
fs.writeFileSync('audit/summary.md', md);
console.log(md);
