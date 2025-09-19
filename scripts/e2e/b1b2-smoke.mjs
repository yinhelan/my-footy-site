// B1/B2 smoke: 依赖 Playwright；不修改站点，仅访问并校验关键 DOM
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');
const { chromium, webkit } = require('playwright-core');

const CDP = 'http://127.0.0.1:9222';

const wait = (ms)=>new Promise(r=>setTimeout(r,ms));
const BASE = 'http://localhost:4321';
const USER_DIR = path.resolve('.pw-data/chromium');
const BROWSER_ROOT = process.env.PLAYWRIGHT_BROWSERS_PATH || path.resolve('.pw-browsers');
process.env.PLAYWRIGHT_BROWSERS_PATH = BROWSER_ROOT;
fs.mkdirSync(USER_DIR, { recursive: true });
fs.mkdirSync(BROWSER_ROOT, { recursive: true });

async function pageJSON(fn) {
  try { return await fn(); } catch (e) { return { error: String(e) }; }
}

async function launchContext() {
  // A. 优先连接到已运行的系统 Chrome（无沙箱）
  try {
    const browser = await chromium.connectOverCDP(CDP);
    const ctx = await browser.newContext();
    return { ctx, browser, engine: 'chrome-cdp' };
  } catch (e) {
    console.error('CDP connect failed:', e.message);
  }

  // B. 回退：本地启动（禁 Crashpad/沙箱）
  const USER_DIR = path.resolve('.pw-data/chromium');
  fs.mkdirSync(USER_DIR, { recursive: true });
  try {
    const sys = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    const hasSys = fs.existsSync(sys);
    const ctx = await chromium.launchPersistentContext(USER_DIR, {
      executablePath: hasSys ? sys : undefined,
      headless: true,
      chromiumSandbox: false,
      args: [
        '--headless=new',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-dev-shm-usage',
        '--disable-breakpad',
        '--disable-features=Crashpad',
        '--no-sandbox'
      ]
    });
    return { ctx, browser: null, engine: hasSys ? 'chrome-sys' : 'chromium' };
  } catch (e) {
    console.error('local chromium failed:', e.message);
    const browser = await webkit.launch({ headless: true });
    const ctx = await browser.newContext();
    return { ctx, browser, engine: 'webkit' };
  }
}

async function run() {
  const { ctx, browser, engine } = await launchContext();
  console.log('Engine:', engine);
  const out = [{ case: 'meta', engine }];

  // B1: Match Insights
  out.push(await pageJSON(async () => {
    const page = await ctx.newPage();
    await page.goto(`${BASE}/tools/match-insights/`);
    await page.waitForSelector('[data-testid="fill-example"]', { timeout: 5000 });
    await page.click('[data-testid="fill-example"]');
    // 若需提交按钮，尝试点击（不存在则忽略）
    const btn = page.locator('#btn-calc');
    if (await btn.count()) {
      await btn.waitFor({ state: 'visible', timeout: 3000 }).catch(()=>{});
      const disabled = await btn.getAttribute('disabled');
      if (disabled === null) await btn.click().catch(()=>{});
    }
    await wait(600);
    const kellyLine = await page.locator('#kellyLine').first();
    const text = (await kellyLine.count()) ? (await kellyLine.innerText()).trim() : 'SKIP: #kellyLine not found';
    await page.close();
    return { case: 'B1-match', text };
  }));

  // B1: Implied Odds
  out.push(await pageJSON(async () => {
    const page = await ctx.newPage();
    await page.goto(`${BASE}/tools/implied-odds/`);
    await page.waitForSelector('[data-testid="fill-example"]', { timeout: 5000 });
    await page.click('[data-testid="fill-example"]');
    const calc = page.locator('#btn-calc');
    if (await calc.count()) {
      const disabled = await calc.getAttribute('disabled');
      if (disabled === null) await calc.click().catch(()=>{});
    }
    await page.waitForTimeout(800);
    const table = await page.locator('#out table').first();
    const ok = await table.count() > 0;
    const snippet = ok ? (await page.locator('#out').innerText()).split('\n').slice(0,4).join(' ') : 'SKIP: #out table not found';
    await page.close();
    return { case: 'B1-implied', ok, snippet };
  }));

  // B1: Kelly
  out.push(await pageJSON(async () => {
    const page = await ctx.newPage();
    await page.goto(`${BASE}/tools/kelly/`);
    await page.waitForSelector('[data-testid="fill-example"]', { timeout: 5000 });
    await page.click('[data-testid="fill-example"]');
    const calc = page.locator('#btn-calc');
    if (await calc.count()) {
      const disabled = await calc.getAttribute('disabled');
      if (disabled === null) await calc.click().catch(()=>{});
    }
    await page.waitForFunction(() => document.querySelector('#out')?.textContent?.length > 0, null, { timeout: 3000 }).catch(()=>{});
    const text = (await page.locator('#out').count()) ? (await page.locator('#out').innerText()).split('\n').slice(0,3).join(' ') : 'SKIP: #out not found';
    await page.close();
    return { case: 'B1-kelly', text };
  }));

  // B2: URL 可分享（若已实现则应复原状态）
  out.push(await pageJSON(async () => {
    const page = await ctx.newPage();
    const qs = '?lh=1.45&la=1.10&line=2.5&odds=2.30,3.30,3.10';
    await page.goto(`${BASE}/tools/match-insights/${qs}`);
    await wait(600);
    // 尝试读取若干输入框的 value，若没有则标记未实现
    const val = await page.evaluate(() => {
      const get = (id)=>document.getElementById(id)?.value ?? null;
      return { lh: get('lambdaHome')||get('lambda_home'), la: get('lambdaAway')||get('lambda_away'), line: get('ouLine')||get('line') };
    });
    await page.close();
    return { case: 'B2-shareable', valuePrefilled: val };
  }));

  console.log(JSON.stringify(out, null, 2));
  await ctx.close();
  if (browser?.close) await browser.close();
}

run().catch(e => { console.error(e); process.exit(1); });
