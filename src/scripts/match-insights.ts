import { parseOdds, fairFromBook, fmtPct, fmtOdds } from '../lib/odds.ts';
import { scoreMatrix, probs1x2, topScorelines } from '../lib/poisson.ts';
import { kellyFrac, stake } from '../lib/kelly.ts';
import { copy as copyTxt, downloadCSV } from '../lib/share.ts';

const $ = (id: string) => document.getElementById(id)!;
const toNumber = (s: any) => Number(String(s).replace(',', '.'));

function calc(){
  const lh = toNumber(($('lh') as HTMLInputElement).value);
  const la = toNumber(($('la') as HTMLInputElement).value);
  const K  = Math.max(0, parseInt((($('K') as HTMLInputElement).value)||'8'));
  const bank = toNumber(($('bank') as HTMLInputElement).value);
  const cap  = toNumber((($('cap') as HTMLInputElement).value)||'0.10') || 0.10;
  const oh = parseOdds(($('oh') as HTMLInputElement).value);
  const od = parseOdds(($('od') as HTMLInputElement).value);
  const oa = parseOdds(($('oa') as HTMLInputElement).value);

  const { mat } = scoreMatrix(lh, la, K);
  const model = probs1x2(mat);
  const fair = { H: 1/model.H, D: 1/model.D, A: 1/model.A };

  $('modelLine')!.textContent = `Model prob  H ${fmtPct(model.H)} · D ${fmtPct(model.D)} · A ${fmtPct(model.A)}`;
  $('fairLine')!.textContent  = `Model fair  H ${fmtOdds(fair.H)} · D ${fmtOdds(fair.D)} · A ${fmtOdds(fair.A)}`;

  const tops = topScorelines(mat, 5).map(x => `Home ${x.h}-${x.a} Away ${fmtPct(x.p)}`).join('\n');
  $('tops')!.textContent = 'Top scorelines\n' + tops;

  const { overround } = fairFromBook([oh, od, oa]);
  $('marketLine')!.textContent = `Market odds  H ${fmtOdds(oh)} · D ${fmtOdds(od)} · A ${fmtOdds(oa)}   Overround ${(overround*100).toFixed(2)}%`;

  const kH = stake(bank, kellyFrac(model.H, oh), cap);
  const kD = stake(bank, kellyFrac(model.D, od), cap);
  const kA = stake(bank, kellyFrac(model.A, oa), cap);
  $('kellyLine')!.textContent = `Kelly stake(¥)  H ${kH.toFixed(2)} · D ${kD.toFixed(2)} · A ${kA.toFixed(2)}   (cap ${(cap*100).toFixed(0)}%)`;

  return { lh, la, K, bank, cap, oh, od, oa, model, overround, topsArr: topScorelines(mat, 5) };
}

(document.getElementById('calc') as HTMLButtonElement).addEventListener('click', () => calc());
(document.getElementById('copy') as HTMLButtonElement).addEventListener('click', async () => {
  const r = calc();
  const text = [
    `λ(H)=${r.lh}, λ(A)=${r.la}, K=${r.K}`,
    `Model prob H ${fmtPct(r.model.H)} · D ${fmtPct(r.model.D)} · A ${fmtPct(r.model.A)}`,
    `Market odds H ${fmtOdds(r.oh)} · D ${fmtOdds(r.od)} · A ${fmtOdds(r.oa)} · Overround ${(r.overround*100).toFixed(2)}%`,
    'Top scorelines: ' + r.topsArr.map(x => `${x.h}-${x.a} ${fmtPct(x.p)}`).join(', ')
  ].join('\n');
  await copyTxt(text);
  alert('已复制摘要');
});
(document.getElementById('csv') as HTMLButtonElement).addEventListener('click', () => {
  const r = calc();
  const rows = [['home','away','prob']];
  r.topsArr.forEach(x => rows.push([String(x.h), String(x.a), (x.p*100).toFixed(2)+'%']));
  downloadCSV('top-scorelines.csv', rows);
});
calc();
