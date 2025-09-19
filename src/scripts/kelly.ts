import { kellyFrac, stake } from '../lib/kelly.ts';
import { parseOdds, fmtOdds } from '../lib/odds.ts';

const rows = document.getElementById('rows')!;
const tb = document.getElementById('tb')!;
function addRow(p='40', o='2.10'){
  const d=document.createElement('div'); d.className='row';
  d.innerHTML=`<input placeholder="概率% (如 40)" value="${p}"/><input placeholder="赔率 (可+120/13/10/2.1)" value="${o}"/><div></div><button aria-label="删除">×</button>`;
  rows.appendChild(d); (d.querySelector('button') as HTMLButtonElement).onclick=()=>d.remove();
}
['40|2.10','30|3.40','28|3.60'].forEach(s=>{const [p,o]=s.split('|'); addRow(p,o);});
(document.getElementById('add') as HTMLButtonElement).addEventListener('click',()=>addRow('33','3.00'));

function calc(){
  const bank = Number((document.getElementById('bank') as HTMLInputElement).value.replace(',','.')) || 0;
  const cap  = Number((document.getElementById('cap') as HTMLInputElement).value.replace(',','.')) || 0.1;
  const items = Array.from(rows.querySelectorAll('.row')).map((r,i)=>{
    const ins = r.querySelectorAll('input'); const p = Math.max(0, Math.min(1, Number((ins[0] as HTMLInputElement).value)/100));
    const odds = parseOdds((ins[1] as HTMLInputElement).value); const frac = kellyFrac(p, odds); const st = stake(bank, frac, cap);
    return { i:i+1, p, odds, frac, st };
  });
  (tb as HTMLElement).innerHTML = items.map(x=>`<tr><td>${x.i}</td><td>${(x.p*100).toFixed(2)}%</td><td>${fmtOdds(x.odds)}</td><td>${(x.frac*100).toFixed(2)}%</td><td>${x.st.toFixed(2)}</td></tr>`).join('');
}
(document.getElementById('calc') as HTMLButtonElement).addEventListener('click',calc);
calc();
