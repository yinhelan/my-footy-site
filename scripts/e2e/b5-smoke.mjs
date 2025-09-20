import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox','--disable-breakpad','--disable-features=Crashpad']
  });
  const ctx = await browser.newContext({
    permissions: ['clipboard-read','clipboard-write']
  });
  const page = await ctx.newPage();

  const BASE = 'http://localhost:4321';
  await page.goto(`${BASE}/tools/match-insights/`, { waitUntil: 'domcontentloaded' });

  // 基本操作：填充示例 → 计算 → 等待结果
  const fill = page.locator('[data-testid="fill-example"]').first();
  if (await fill.count()) await fill.click();
  await page.locator('#mi-calc').click();
  await page.waitForSelector('#kellyLine', { timeout: 15000 });

  // 三按钮存在性
  const btnCopy = !!(await page.$('#mi-copy'));
  const btnCSV  = !!(await page.$('#mi-export-csv'));
  const btnPNG  = !!(await page.$('#mi-export-png'));

  // 市场选项数量（期望 7: H/D/A/Over/Under/Yes/No）
  const markets = await page.$$eval('#mi-kelly-market option', opts => opts.map(o => o.value));
  const marketsCount = markets.length;

  // 复制摘要（尽量读取剪贴板，失败则标注 false）
  let clipboardOk = false;
  try {
    await page.click('#mi-copy', { timeout: 5000 });
    // 给页面一点时间写剪贴板
    await page.waitForTimeout(300);
    const text = await page.evaluate(async () => {
      try { return await navigator.clipboard.readText(); } catch { return ''; }
    });
    clipboardOk = !!(text && /Match Insights/i.test(text) && /Kelly/.test(text));
  } catch { /* ignore */ }

  // CSV 下载
  let csvOk = false;
  if (btnCSV) {
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
      page.click('#mi-export-csv').catch(() => null),
    ]);
    csvOk = !!(dl && /match_insights.*\.csv$/i.test(dl.suggestedFilename()));
  }

  // PNG 下载
  let pngOk = false;
  if (btnPNG) {
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 12000 }).catch(() => null),
      page.click('#mi-export-png').catch(() => null),
    ]);
    pngOk = !!(dl && /match_insights.*\.png$/i.test(dl.suggestedFilename()));
  }

  // 汇总
  const kellyLine = (await page.textContent('#kellyLine') || '').trim();
  console.log(JSON.stringify({
    buttons: { copy: btnCopy, csv: btnCSV, png: btnPNG },
    markets: marketsCount,
    marketsList: markets,
    clipboardOk, csvOk, pngOk,
    kellyLine
  }, null, 2));

  await ctx.close();
  await browser.close();
})();
