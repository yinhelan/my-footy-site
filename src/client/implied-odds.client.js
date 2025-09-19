const rows = document.getElementById('rows');
const tb   = document.getElementById('tb');
const ovr  = document.getElementById('ovr');

function fmtPct(p){ return (p*100).toFixed(2)+'%'; }
function fmtOdds(o){ return Number(o).toFixed(2); }
function parseOdds(s){
  s = String(s).trim();
  if (!s) return NaN;
  if (/^[+-]?\d+$/.test(s)) { const a=Number(s); if (a>0) return 1+a/100; if (a<0) return 1+100/Math.abs(a); }
  if (s.includes('/')) { const [a,b]=s.split('/').map(Number); if (a>0&&b>0) return 1+a/b; }
  const d=Number(s); return isFinite(d)&&d>0?d:NaN;
}
function fairFromBook(odds){
  const imp = odds.map(o=>1/o);
  const sum = imp.reduce((a,b)=>a+b,0);
  const overround = sum - 1;
  const fairProb = imp.map(x=>x/sum);
  const fairOdds = fairProb.map(p=>1/p);
  return { fairProb, fairOdds, overround };
}
(function init(){
  if (window.__IO_INIT__) return; window.__IO_INIT__=true;

  function addRow(val='2.00'){
    const d = document.createElement('div'); d.className='row';
    d.innerHTML = `<input value="${val}"/><div></div><button aria-label="删除">×</button>`;
    rows.appendChild(d); d.querySelector('button').onclick = () => d.remove();
  }
  document.getElementById('add')?.addEventListener('click',()=>addRow('3.00'));
  ['2.10','3.40','3.60'].forEach(addRow);

  function calc(){
    const odds = Array.from(rows.querySelectorAll('input')).map(i=>parseOdds(i.value)).filter(Boolean);
    const { fairProb, fairOdds, overround } = fairFromBook(odds);
    tb.innerHTML = odds.map((o,i)=>`<tr><td>${i+1}</td><td>${fmtOdds(o)}</td><td>${fmtPct(1/o)}</td><td>${fmtPct(fairProb[i])}</td><td>${fmtOdds(fairOdds[i])}</td></tr>`).join('');
    ovr.textContent = `Overround: ${(overround*100).toFixed(2)}%`;
  }
  document.getElementById('calc')?.addEventListener('click', calc);
  calc();
})();
