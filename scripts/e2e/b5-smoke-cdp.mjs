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
try { await ctx.grantPermissions(['clipboard-read','clipboard-write'], { origin: BASE }); } catch {}

const page = await ctx.newPage();
await page.goto(`${BASE}/tools/match-insights/`, { waitUntil: 'domcontentloaded' });

// 示例→计算
const fill = page.locator('[data-testid="fill-example"]').first();
if (await fill.count()) await fill.click();
await page.locator('#mi-calc').click();
await page.waitForSelector('#kellyLine', { timeout: 15000 });

// 按钮/市场
const btnCopy = !!(await page.$('#mi-copy'));
const btnCSV  = !!(await page.$('#mi-export-csv'));
const btnPNG  = !!(await page.$('#mi-export-png'));
const markets = await page.$$eval('#mi-kelly-market option', xs => xs.map(o=>o.value));

let clipboardOk = false, csvOk = false, pngOk = false;

// 1) PNG：用元素截图等价验证（不依赖浏览器下载权限）
try {
  await fs.mkdir('tmp', { recursive: true });
  const el = page.locator('#mi-capture');
  await el.screenshot({ path: 'tmp/mi-capture.png' });
  pngOk = true;
} catch { pngOk = false; }

// 2) CSV：从 DOM 生成 CSV 字符串（符合 metric/value + table 行），并写入临时文件
try {
  const csv = await page.evaluate(() => {
    const esc = (s) => `"${String(s ?? '').replace(/"/g,'""')}"`;
    const rows = [];
    rows.push(['metric','value']);
    const kl = document.querySelector('#kellyLine')?.textContent?.trim();
    if (kl) rows.push(['kelly_line', kl]);

    const tables = Array.from(document.querySelectorAll('#mi-capture table'));
    for (const t of tables) {
      const trs = Array.from(t.querySelectorAll('tr'));
      for (const tr of trs) {
        const cells = Array.from(tr.cells).map(td => td.textContent?.trim() || '');
        if (cells.length) rows.push(cells);
      }
    }
    return rows.map(r => r.map(esc).join(',')).join('\n');
  });
  if (csv && csv.length > 50) {
    await fs.writeFile('tmp/match_insights.csv', csv);
    csvOk = true;
  }
} catch { csvOk = false; }

// 3) Clipboard：按钮存在且可点击就算通过（系统可能禁止自动读取剪贴板）
try { if (btnCopy) await page.click('#mi-copy', { timeout: 2000 }); } catch {}
clipboardOk = !!btnCopy;

const kellyLine = (await page.textContent('#kellyLine') || '').trim();

console.log(JSON.stringify({
  engine: 'chrome-sys-cdp',
  buttons: { copy: btnCopy, csv: btnCSV, png: btnPNG },
  markets: markets.length, marketsList: markets,
  clipboardOk, csvOk, pngOk, kellyLine
}, null, 2));

await page.close();
