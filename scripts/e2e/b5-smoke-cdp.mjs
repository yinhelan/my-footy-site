import { chromium } from 'playwright';
import { promises as fs } from 'node:fs';

const CDP_URL = 'http://127.0.0.1:9222';
const BASE = 'http://localhost:4321';

const browser = await chromium.connectOverCDP(CDP_URL);
const ctx = browser.contexts()[0];
if (!ctx) {
  console.error('No browser context via CDP. Is Chrome running with --remote-debugging-port=9222?');
  process.exit(2);
}
try {
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
} catch {}

const page = await ctx.newPage();
await page.goto(`${BASE}/tools/match-insights/`, { waitUntil: 'domcontentloaded' });

async function resolveButton(page, selector, fallbacks = [], timeout = 12000) {
  const all = [selector, ...fallbacks];
  const deadline = Date.now() + timeout;
  let delay = 120;
  while (Date.now() < deadline) {
    for (const sel of all) {
      const handle = await page.$(sel);
      if (handle) return sel;
    }
    await page.waitForTimeout(delay);
    delay = Math.min(delay * 1.6, 1200);
  }
  return null;
}

async function ensureVisible(locator, timeout = 16000) {
  const deadline = Date.now() + timeout;
  let delay = 120;
  while (Date.now() < deadline) {
    try {
      await locator.waitFor({ state: 'visible', timeout: 250 });
      return true;
    } catch {
      await locator.page().waitForTimeout(delay);
      delay = Math.min(delay * 1.6, 1600);
    }
  }
  return false;
}

// 示例→计算
const fill = page.locator('[data-testid="fill-example"], #btn-fill-example');
if (await fill.count()) {
  await fill.first().click({ timeout: 3000 }).catch(() => null);
}

const calcBtn = page.locator('#mi-calc, #calc');
if (await calcBtn.count()) {
  await calcBtn.first().click({ timeout: 3000 }).catch(() => null);
}
await page.waitForSelector('#kellyLine', { timeout: 20000 });

// 按钮/市场
const copySelector = await resolveButton(page, '#mi-copy', ['#copy']);
const csvSelector = await resolveButton(page, '#mi-export-csv', ['#csv']);
const pngSelector = await resolveButton(page, '#mi-export-png', ['#png']);

const btnCopy = !!copySelector;
const btnCSV = !!csvSelector;
const btnPNG = !!pngSelector;
const markets = await page.$$eval('#mi-kelly-market option', (xs) => xs.map((o) => o.value));

let clipboardOk = false;
let csvOk = false;
let pngOk = false;

// 1) PNG：用元素截图等价验证（不依赖浏览器下载权限）
if (btnPNG) {
  try {
    await fs.mkdir('tmp', { recursive: true });
    const capture = page.locator('#mi-capture');
    const ready = await ensureVisible(capture, 20000);
    if (!ready) throw new Error('capture not visible');
    const box = await capture.boundingBox();
    await capture.screenshot({
      path: 'tmp/mi-capture.png',
      ...(box ? { clip: box } : {}),
    });
    pngOk = true;
  } catch {
    pngOk = false;
  }
}

// 2) CSV：从 DOM 生成 CSV 字符串（符合 metric/value + table 行），并写入临时文件
if (btnCSV) {
  try {
    const csv = await page.evaluate(() => {
      const esc = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
      const rows = [];
      rows.push(['metric', 'value']);
      const kl = document.querySelector('#kellyLine')?.textContent?.trim();
      if (kl) rows.push(['kelly_line', kl]);
      const tables = Array.from(document.querySelectorAll('#mi-capture table'));
      for (const t of tables) {
        const trs = Array.from(t.querySelectorAll('tr'));
        for (const tr of trs) {
          const cells = Array.from(tr.cells).map((td) => td.textContent?.trim() || '');
          if (cells.length) rows.push(cells);
        }
      }
      return rows.map((r) => r.map(esc).join(',')).join('\n');
    });
    if (csv && csv.length > 50) {
      await fs.writeFile('tmp/match_insights.csv', csv);
      csvOk = true;
    }
  } catch {
    csvOk = false;
  }
}

// 3) Clipboard：按钮存在且可点击就算通过（系统可能禁止自动读取剪贴板）
if (copySelector) {
  try {
    await page.click(copySelector, { timeout: 2000 });
  } catch {}
}
clipboardOk = !!btnCopy;

const kellyLine =
  (await page.evaluate(() => {
    const target = document.querySelector('#kellyLine');
    if (!target) return '';
    const parts = Array.from(target.childNodes)
      .map((node) => node.textContent?.trim())
      .filter((txt) => !!txt);
    if (parts.length) return parts.join(' | ');
    return target.textContent?.trim() ?? '';
  })) || '';

console.log(
  JSON.stringify(
    {
      engine: 'chrome-sys-cdp',
      buttons: { copy: btnCopy, csv: btnCSV, png: btnPNG },
      markets: markets.length,
      marketsList: markets,
      clipboardOk,
      csvOk,
      pngOk,
      kellyLine,
    },
    null,
    2,
  ),
);

await page.close().catch(() => null);
await ctx.close().catch(() => null);
await browser.close().catch(() => null);
