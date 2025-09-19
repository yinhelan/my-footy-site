import { parseOdds, fairFromBook, fmtPct, fmtOdds } from '../lib/odds.ts';
const rows = document.getElementById('rows')!;
const tb = document.getElementById('tb')!;
const ovr = document.getElementById('ovr')!;
function addRow(val='2.00'){
  const d = document.createElement('div'); d.className='row';
  d.innerHTML = `<input value="${val}"/><div></div><button aria-label="删除">×</button>`;
  rows.appendChild(d);
  (d.querySelector('button') as HTMLButtonElement).onclick = () => d.remove();
}
(document.getElementById('add') as HTMLButtonElement).addEventListener('click',()=>addRow('3.00'));
['2.10','3.40','3.60'].forEach(addRow);
function calc(){
  const odds = Array.from(rows.querySelectorAll('input')).map(i=>parseOdds((i as HTMLInputElement).value)).filter(Boolean);
  const { fairProb, fairOdds, overround } = fairFromBook(odds);
  (tb as HTMLElement).innerHTML = odds.map((o,i)=>`<tr><td>${i+1}</td><td>${fmtOdds(o)}</td><td>${fmtPct(1/o)}</td><td>${fmtPct(fairProb[i])}</td><td>${fmtOdds(fairOdds[i])}</td></tr>`).join('');
  ovr!.textContent = `Overround: ${(overround*100).toFixed(2)}%`;
}
(document.getElementById('calc') as HTMLButtonElement).addEventListener('click', calc);
calc();
