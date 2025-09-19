// ---- 小工具 ----
const alias = {
  lh: ['lh', 'lambdaHome'],
  la: ['la', 'lambdaAway'],
  calc: ['calc', 'btn-calc'],
};
const $ = (id) => {
  const candidates = alias[id] || [id];
  for (const candidate of candidates) {
    const el = document.getElementById(candidate);
    if (el) return el;
  }
  return null;
};
const toNumber = (s) => Number(String(s ?? '').replace(',', '.'));
const fmtPct = (p) => (p*100).toFixed(2)+'%';
const fmtOdds = (o) => (Number(o).toFixed(2));
function parseOdds(s){
  s = String(s).trim();
  if (!s) return NaN;
  if (/^[+-]?\d+$/.test(s)) { // American
    const a = Number(s);
    if (a > 0) return 1 + a/100;
    if (a < 0) return 1 + 100/Math.abs(a);
  }
  if (s.includes('/')) { // fractional a/b
    const [a,b] = s.split('/').map(Number);
    if (a>0 && b>0) return 1 + a/b;
  }
  const d = Number(s);
  return isFinite(d) && d>0 ? d : NaN;
}
function fairFromBook(odds){
  const imp = odds.map(o => 1/o);
  const sum = imp.reduce((a,b)=>a+b,0);
  const overround = sum - 1;
  const fairProb = imp.map(x=>x/sum);
  const fairOdds = fairProb.map(p=>1/p);
  return { fairProb, fairOdds, overround };
}
function poissonPmf(lambda, K){
  const p = new Array(K+1).fill(0);
  p[0] = Math.exp(-lambda);
  for (let k=1;k<=K;k++) p[k] = p[k-1] * lambda / k;
  return p;
}
function scoreMatrix(lh, la, K){
  const ph = poissonPmf(lh, K), pa = poissonPmf(la, K);
  const mat = Array.from({length:K+1},()=>new Array(K+1).fill(0));
  for(let h=0;h<=K;h++) for(let a=0;a<=K;a++) mat[h][a]=ph[h]*pa[a];
  return { mat };
}
function probs1x2(mat){
  let H=0,D=0,A=0; const K=mat.length-1;
  for(let h=0;h<=K;h++) for(let a=0;a<=K;a++){
    const p=mat[h][a]; if (h>a) H+=p; else if (h===a) D+=p; else A+=p;
  }
  return { H,D,A };
}
function topScorelines(mat, n=5){
  const K=mat.length-1, arr=[];
  for(let h=0;h<=K;h++) for(let a=0;a<=K;a++) arr.push({h,a,p:mat[h][a]});
  return arr.sort((x,y)=>y.p-x.p).slice(0,n);
}
function kellyFrac(p, odds){
  const b = odds - 1; const q = 1 - p;
  const f = (b*p - q) / b;
  return Math.max(0, isFinite(f) ? f : 0);
}
function stake(bank, frac, cap=0.1){
  const f = Math.max(0, Math.min(frac, cap));
  return bank * f;
}
async function copyText(text){
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy'); ta.remove();
  }
}
function downloadCSV(filename, rows){
  const csv = rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click(); URL.revokeObjectURL(a.href);
}

// ---- 初始化（只执行一次）----
const emitAnalytics = (event, detail = {}) => {
  window.dispatchEvent(new CustomEvent('analytics', { detail: { event, tool: 'match-insights', ...detail } }));
};

(function init(){
  if (window.__MI_INIT__) return; window.__MI_INIT__=true;

  const form = $('f'); form?.addEventListener('submit', e=>e.preventDefault());

  function calc(){
    emitAnalytics('match_insights_calc_started');
    const lh = toNumber($('lh').value);
    const la = toNumber($('la').value);
    const K  = Math.max(0, parseInt(($('K').value || '8')));
    const bank = toNumber($('bank').value);
    const cap  = toNumber(($('cap').value || '0.10')) || 0.10;
    const oh = parseOdds($('oh').value);
    const od = parseOdds($('od').value);
    const oa = parseOdds($('oa').value);

    const { mat } = scoreMatrix(lh, la, K);
    const model = probs1x2(mat);
    const fair  = { H: 1/model.H, D: 1/model.D, A: 1/model.A };

    $('modelLine').textContent = `Model prob  H ${fmtPct(model.H)} · D ${fmtPct(model.D)} · A ${fmtPct(model.A)}`;
    $('fairLine').textContent  = `Model fair  H ${fmtOdds(fair.H)} · D ${fmtOdds(fair.D)} · A ${fmtOdds(fair.A)}`;

    const tops = topScorelines(mat, 5).map(x => `Home ${x.h}-${x.a} Away ${fmtPct(x.p)}`).join('\n');
    $('tops').textContent = 'Top scorelines\n' + tops;

    const { overround } = fairFromBook([oh, od, oa]);
    $('marketLine').textContent = `Market odds  H ${fmtOdds(oh)} · D ${fmtOdds(od)} · A ${fmtOdds(oa)}   Overround ${(overround*100).toFixed(2)}%`;

    const kH = stake(bank, kellyFrac(model.H, oh), cap);
    const kD = stake(bank, kellyFrac(model.D, od), cap);
    const kA = stake(bank, kellyFrac(model.A, oa), cap);
    $('kellyLine').textContent = `Kelly stake(¥)  H ${kH.toFixed(2)} · D ${kD.toFixed(2)} · A ${kA.toFixed(2)}   (cap ${(cap*100).toFixed(0)}%)`;
    emitAnalytics('match_insights_calculated', { overround: Number((overround*100).toFixed(2)), cap });
  }

  $('calc')?.addEventListener('click', () => {
    emitAnalytics('match_insights_calc_click');
    calc();
  });
  $('copy')?.addEventListener('click', async () => {
    const text = [
      $('modelLine').textContent,
      $('fairLine').textContent,
      $('marketLine').textContent,
      $('tops').textContent
    ].join('\n');
    await copyText(text);
    emitAnalytics('match_insights_copy_summary');
    alert('已复制摘要');
  });
  $('csv')?.addEventListener('click', () => {
    emitAnalytics('match_insights_export_top5');
    const tops = $('tops').textContent.split('\n').slice(1).filter(Boolean);
    const rows = [['home','away','prob']];
    for (const line of tops){
      const m = /Home (\d+)-(\d+) Away (\d+(\.\d+)?)%/.exec(line);
      if (m) rows.push([m[1], m[2], m[3]+'%']);
    }
    downloadCSV('top-scorelines.csv', rows);
  });

  calc();
  emitAnalytics('tool_view', { tool: 'match-insights' });
})();
