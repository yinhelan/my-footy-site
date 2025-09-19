// --- implied-fallback.js (plain JS) ---
if (typeof window.__implied_calc__ !== 'function') {
  function parseOdds(val){ return String(val).split(/[,\s]+/).map(Number).filter(n=>n>1&&isFinite(n)); }
  function renderTable(out, odds){
    const raw = odds.map(o=>1/o);
    const sum = raw.reduce((a,b)=>a+b,0);
    const fair = raw.map(p=>p/sum);
    const rows = odds.map((o,i)=>`<tr><td>${i+1}</td><td>${o.toFixed(2)}</td><td>${raw[i].toFixed(6)}</td><td>${fair[i].toFixed(6)}</td></tr>`).join('');
    out.innerHTML = `<table><thead><tr><th>#</th><th>odds</th><th>raw</th><th>fair_basic</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan=\"4\">overround: ${(sum-1).toFixed(6)}</td></tr></tfoot></table>`;
  }
  window.__implied_calc__ = function(){
    const out = document.getElementById('out');
    const oddsEl = document.getElementById('odds');
    if (!out || !oddsEl) return;
    const odds = parseOdds(oddsEl.value||'');
    if (odds.length>=2) renderTable(out, odds);
  };
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btn-calc');
    if (btn) btn.addEventListener('click', (e)=>{ e.preventDefault(); window.__implied_calc__(); });
    const fill = document.querySelector('[data-testid="fill-example"], #btn-fill-example');
    if (fill) fill.addEventListener('click', ()=>{
      const el = document.getElementById('odds');
      if (el && !el.value) el.value = '2.30,3.30,3.10';
      const calcBtn = document.getElementById('btn-calc');
      if (calcBtn) calcBtn.removeAttribute('disabled');
      window.__implied_calc__();
    });
  });
}
