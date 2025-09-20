import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE = 'http://localhost:4321';
const USER_DIR = path.resolve('.pw-data/b4');
const CRASH_DIR = path.resolve('.pw-data/b4-crashpad');
fs.mkdirSync(USER_DIR, { recursive: true });
fs.mkdirSync(CRASH_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    headless: true,
    chromiumSandbox: false,
    args: [
      '--headless=new',
      '--no-sandbox',
      '--disable-breakpad',
      '--disable-features=Crashpad',
      '--disable-crash-reporter',
      `--crash-dumps-dir=${CRASH_DIR}`,
    ]
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (compatible; B4-SMOKE)',
  });

  try {
    const page = await context.newPage();
    await page.goto(`${BASE}/tools/match-insights/`, { waitUntil:'domcontentloaded' });
    await page.click('[data-testid="fill-example"]');
    await page.click('#mi-calc');
    await page.waitForSelector('#kellyLine');
    const text = await page.textContent('#kellyLine');
    const cards = {
      p1x2: !!(await page.$('#mi-p1x2')),
      ou:   !!(await page.$('#mi-ou-card')),
      btts: !!(await page.$('#mi-btts')),
      top:  !!(await page.$('#mi-top')),
      kelly: !!(await page.$('#mi-kelly')),
    };
    console.log(JSON.stringify({ ok: !!text, kellyLine: (text||'').trim(), cards }, null, 2));
    await page.close();
  } finally {
    await context.close();
    await browser.close();
  }
})();
