import { parseOdds, fairFromBook, fmtPct, fmtOdds } from '../lib/odds';
import { scoreMatrix, probs1x2, topScorelines } from '../lib/poisson';
import { kellyFrac, stake } from '../lib/kelly';
import { copy as copyTxt, downloadCSV } from '../lib/share';

type FixtureMeta = { utcDate: string; home: string; away: string; leagueKey: string };

declare global {
  interface Window {
    __fixturesMeta?: Record<string, FixtureMeta>;
  }
}

const $ = (id: string) => document.getElementById(id) as any;
const toNumber = (s: any) => Number(String(s ?? '').replace(',', '.'));

function setStatus(s?: string) {
  const el = $('dataStatus') as HTMLElement | null;
  if (el) el.textContent = s || '';
}

function todayISO() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function normTeam(s: string) {
  return String(s || '')
    .toLowerCase()
    .replace(/\b(fc|cf|sc|afc)\b/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, ' ')
    .trim();
}

function pickH2HOddsFromOddsApi(events: any[], meta: FixtureMeta, bookmakerHint?: string) {
  const targetHome = normTeam(meta.home);
  const targetAway = normTeam(meta.away);
  const targetDate = String(meta.utcDate || '').slice(0, 10);

  const candidates = (events || []).filter((ev) => {
    const h = normTeam(ev?.home_team);
    const a = normTeam(ev?.away_team);
    const d = String(ev?.commence_time || '').slice(0, 10);
    const sameTeams = (h === targetHome && a === targetAway) || (h === targetAway && a === targetHome);
    return sameTeams && (!targetDate || d === targetDate);
  });

  const ev = candidates[0];
  if (!ev) return null;

  const hint = String(bookmakerHint || '').toLowerCase().trim();
  const bms = ev.bookmakers || [];
  const bm = hint
    ? bms.find(
        (b: any) =>
          String(b.key || '').toLowerCase() === hint || String(b.title || '').toLowerCase().includes(hint)
      )
    : bms[0];
  if (!bm) return null;

  const mkt = (bm.markets || []).find((m: any) => m.key === 'h2h');
  if (!mkt) return null;

  const outs = mkt.outcomes || [];
  const getPrice = (name: string) => {
    const hit = outs.find((o: any) => String(o.name || '').toLowerCase() === String(name || '').toLowerCase());
    const p = hit ? Number(hit.price) : NaN;
    return Number.isFinite(p) ? p : null;
  };

  const homeP = getPrice(ev.home_team);
  const awayP = getPrice(ev.away_team);
  const drawP = getPrice('Draw') ?? getPrice('draw');
  if (!homeP || !awayP || !drawP) return null;

  return { home: homeP, draw: drawP, away: awayP, bookmaker: bm.title || bm.key };
}

function calc() {
  const lh = toNumber($('lh')?.value);
  const la = toNumber($('la')?.value);
  const K = Math.max(0, parseInt(String($('K')?.value || '8')));
  const bank = toNumber($('bank')?.value);
  const cap = toNumber($('cap')?.value || '0.10') || 0.1;

  const oh = parseOdds($('oh')?.value);
  const od = parseOdds($('od')?.value);
  const oa = parseOdds($('oa')?.value);

  const { mat } = scoreMatrix(lh, la, K);
  const model = probs1x2(mat);
  const fair = { H: 1 / model.H, D: 1 / model.D, A: 1 / model.A };

  $('modelLine').textContent = `Model prob  H ${fmtPct(model.H)} · D ${fmtPct(model.D)} · A ${fmtPct(model.A)}`;
  $('fairLine').textContent = `Model fair  H ${fmtOdds(fair.H)} · D ${fmtOdds(fair.D)} · A ${fmtOdds(fair.A)}`;

  const topsArr = topScorelines(mat, 5);
  const tops = topsArr.map((x) => `Home ${x.h}-${x.a} Away ${fmtPct(x.p)}`).join('\n');
  $('tops').textContent = 'Top scorelines\n' + tops;

  const { overround } = fairFromBook([oh, od, oa]);
  $('marketLine').textContent = `Market odds  H ${fmtOdds(oh)} · D ${fmtOdds(od)} · A ${fmtOdds(oa)}   Overround ${(overround * 100).toFixed(2)}%`;

  const kH = stake(bank, kellyFrac(model.H, oh), cap);
  const kD = stake(bank, kellyFrac(model.D, od), cap);
  const kA = stake(bank, kellyFrac(model.A, oa), cap);
  $('kellyLine').textContent = `Kelly stake(¥)  H ${kH.toFixed(2)} · D ${kD.toFixed(2)} · A ${kA.toFixed(2)}   (cap ${(cap * 100).toFixed(0)}%)`;

  return { lh, la, K, bank, cap, oh, od, oa, model, overround, topsArr };
}

async function loadFixtures() {
  const leagueKey = String($('league')?.value);
  const date = String($('date')?.value);
  setStatus('Loading fixtures...');
  $('fixture').innerHTML = '';

  const LEAGUES: Record<string, { footballData: string; oddsApiSport: string }> = {
    epl: { footballData: 'PL', oddsApiSport: 'soccer_epl' },
    laliga: { footballData: 'PD', oddsApiSport: 'soccer_spain_la_liga' },
    seriea: { footballData: 'SA', oddsApiSport: 'soccer_italy_serie_a' },
    bundesliga: { footballData: 'BL1', oddsApiSport: 'soccer_germany_bundesliga' },
    ligue1: { footballData: 'FL1', oddsApiSport: 'soccer_france_ligue_one' },
  };
  const cfg = LEAGUES[leagueKey];
  if (!cfg) {
    setStatus('Unknown league');
    return;
  }

  const u = new URL('/api/football-data/matches', window.location.origin);
  u.searchParams.set('competition', cfg.footballData);
  u.searchParams.set('dateFrom', date);
  u.searchParams.set('dateTo', date);

  const r = await fetch(u);
  const j = await r.json();
  if (!r.ok) {
    setStatus(`Fixtures error: ${r.status} ${JSON.stringify(j)}`);
    return;
  }

  const list = (j?.matches || [])
    .map((m: any) => {
      const id = m?.id;
      const dt = m?.utcDate;
      const home = m?.homeTeam?.name;
      const away = m?.awayTeam?.name;
      const status = m?.status;
      return { id, label: `${home} vs ${away} · ${dt} · ${status}`, meta: { utcDate: dt, home, away, leagueKey } };
    })
    .filter((x: any) => x.id);

  window.__fixturesMeta = Object.fromEntries(list.map((x: any) => [String(x.id), x.meta]));

  if (!list.length) {
    setStatus('No fixtures found for this date/league.');
    return;
  }

  list.forEach((x: any, i: number) => {
    const opt = document.createElement('option');
    opt.value = String(x.id);
    opt.textContent = x.label;
    if (i === 0) opt.selected = true;
    $('fixture').appendChild(opt);
  });

  setStatus(`Fixtures loaded: ${list.length}`);
}

async function loadOdds() {
  const matchId = String($('fixture')?.value || '');
  if (!matchId) {
    setStatus('Pick a fixture first.');
    return;
  }
  const meta = window.__fixturesMeta?.[matchId];
  if (!meta) {
    setStatus('Missing fixture meta; reload fixtures.');
    return;
  }

  const LEAGUES: Record<string, { oddsApiSport: string }> = {
    epl: { oddsApiSport: 'soccer_epl' },
    laliga: { oddsApiSport: 'soccer_spain_la_liga' },
    seriea: { oddsApiSport: 'soccer_italy_serie_a' },
    bundesliga: { oddsApiSport: 'soccer_germany_bundesliga' },
    ligue1: { oddsApiSport: 'soccer_france_ligue_one' },
  };
  const cfg = LEAGUES[meta.leagueKey];
  if (!cfg) {
    setStatus('Unknown league for odds');
    return;
  }

  const oddsSource = String($('oddsSource')?.value || 'odds-api');
  setStatus(`Loading odds (${oddsSource})...`);

  if (oddsSource !== 'odds-api') {
    setStatus('API-Sports odds mapping from football-data match → api-sports fixture is not implemented yet. Use the-odds-api for now.');
    return;
  }

  const u = new URL('/api/odds/odds', window.location.origin);
  u.searchParams.set('sport', cfg.oddsApiSport);
  u.searchParams.set('regions', 'eu');
  u.searchParams.set('markets', 'h2h');
  u.searchParams.set('oddsFormat', 'decimal');
  u.searchParams.set('dateFormat', 'iso');

  const r = await fetch(u);
  const j = await r.json();
  if (!r.ok) {
    setStatus(`Odds error: ${r.status} ${JSON.stringify(j)}`);
    return;
  }

  const hint = String($('bookmaker')?.value || '');
  const pick = pickH2HOddsFromOddsApi(j, meta, hint);
  if (!pick) {
    setStatus('Odds loaded but could not match event or find h2h 1X2. Try another date/league or leave bookmaker empty.');
    return;
  }

  $('oh').value = String(pick.home);
  $('od').value = String(pick.draw);
  $('oa').value = String(pick.away);
  setStatus(`Odds OK (${pick.bookmaker}) → filled Market odds.`);
  calc();
}

export function initMatchInsights() {
  // defaults
  const dateEl = $('date') as HTMLInputElement | null;
  if (dateEl && !dateEl.value) dateEl.value = todayISO();

  const fixtureEl = $('fixture') as HTMLSelectElement | null;
  if (fixtureEl && !fixtureEl.childElementCount) {
    fixtureEl.innerHTML = '<option value="">(load fixtures first)</option>';
  }

  $('loadFixtures')?.addEventListener('click', () => loadFixtures().catch((e) => setStatus(String(e))));
  $('loadOdds')?.addEventListener('click', () => loadOdds().catch((e) => setStatus(String(e))));
  $('calc')?.addEventListener('click', () => calc());

  $('copy')?.addEventListener('click', async () => {
    const r = calc();
    const text = [
      `λ(H)=${r.lh}, λ(A)=${r.la}, K=${r.K}`,
      `Model prob H ${fmtPct(r.model.H)} · D ${fmtPct(r.model.D)} · A ${fmtPct(r.model.A)}`,
      `Market odds H ${fmtOdds(r.oh)} · D ${fmtOdds(r.od)} · A ${fmtOdds(r.oa)} · Overround ${(r.overround * 100).toFixed(2)}%`,
      'Top scorelines: ' + r.topsArr.map((x) => `${x.h}-${x.a} ${fmtPct(x.p)}`).join(', '),
    ].join('\n');
    await copyTxt(text);
    alert('已复制摘要');
  });

  $('csv')?.addEventListener('click', () => {
    const r = calc();
    const rows = [['home', 'away', 'prob']];
    r.topsArr.forEach((x) => rows.push([x.h, x.a, (x.p * 100).toFixed(2) + '%'] as any));
    downloadCSV('top-scorelines.csv', rows as any);
  });

  // initial calc (static inputs)
  calc();
}
