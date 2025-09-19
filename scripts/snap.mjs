import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:4321';
const urls = fs.readFileSync('audit/urls.txt', 'utf-8').trim().split('\n').filter(Boolean);
const widths = [375, 768, 1280];

function safeName(u){
  return u.replace(/^https?:\/\//,'').replace(/[^\w.-]+/g,'_').replace(/_$/,'');
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ deviceScaleFactor: 1 });
const page = await ctx.newPage();

for (const u of urls){
  for (const w of widths){
    await page.setViewportSize({ width: w, height: 1000 });
    await page.goto(u, { waitUntil: 'networkidle' });
    const file = `audit/shots/${w}/${safeName(u)}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log('shot:', file);
  }
}
await browser.close();
