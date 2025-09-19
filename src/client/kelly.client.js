function parseOdds(s){
  s = String(s).trim();
  if (!s) return NaN;
  if (/^[+-]?\d+$/.test(s)) { const a=Number(s); if (a>0) return 1+a/100; if (a<0) return 1+100/Math.abs(a); }
  if (s.includes('/')) { const [a,b]=s.split('/').map(Number); if (a>0&&b>0) return 1+a/b; }
  const d=Number(s); return isFinite(d)&&d>0?d:NaN;
}
function fmtOdds(o){ return Number(o).toFixed(2); }
function kellyFrac(p,odds){ const b=odds-1, q=1-p; const f=(b*p-q)/b; return Math.max(0, isFinite(f)?f:0); }
function stake(bank, frac, cap=0.1){ return bank*Math.max(0,Math.min(frac,cap)); }

(function init(){
  if (window.__KELLY_INIT__) return; window.__KELLY_INIT__=true;

  const rows = document.getElementById('rows');
  const tb   = document.getElementById('tb');

  function addRow(p='40', o='2.10'){
    const d=document.createElement('div'); d.className='row';
    d.innerHTML=`<input placeholder="概率% (如 40)" value="${p}"/><input placeholder="赔率 (可+120/13/10/2.1)" value="${o}"/><div></div><button aria-label="删除">×</button>`;
    rows.appendChild(d); d.querySelector('button').onclick=()=>d.remove();
  }
  ['40|2.10','30|3.40','28|3.60'].forEach(s=>{const [p,o]=s.split('|'); addRow(p,o);});
  document.getElementById('add')?.addEventListener('click',()=>addRow('33','3.00'));

  function calc(){
    const bank = Number(document.getElementById('bank').value.replace(',','.')) || 0;
    const cap  = Number(document.getElementById('cap').value.replace(',','.')) || 0.1;
    const items = Array.from(rows.querySelectorAll('.row')).map((r,i)=>{
      const ins = r.querySelectorAll('input'); const p = Math.max(0, Math.min(1, Number(ins[0].value)/100));
      const odds = parseOdds(ins[1].value); const frac = kellyFrac(p, odds); const st = stake(bank, frac, cap);
      return { i:i+1, p, odds, frac, st };
    });
    tb.innerHTML = items.map(x=>`<tr><td>${x.i}</td><td>${(x.p*100).toFixed(2)}%</td><td>${fmtOdds(x.odds)}</td><td>${(x.frac*100).toFixed(2)}%</td><td>${x.st.toFixed(2)}</td></tr>`).join('');
  }
  document.getElementById('calc')?.addEventListener('click',calc);
  calc();
})();
