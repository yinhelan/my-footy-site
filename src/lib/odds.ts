// 统一赔率解析/去水位/格式化（Decimal/Fractional/American + 全角容错）
const FULLWIDTH: Record<string,string> = {
  '０':'0','１':'1','２':'2','３':'3','４':'4','５':'5','６':'6','７':'7','８':'8','９':'9','．':'.','，':',','／':'/'
};
export function normalize(str: string): string {
  return str.trim().replace(/[０-９．，／]/g, ch => FULLWIDTH[ch] || ch);
}
export function parseOdds(input: string): number {
  const s = normalize(input);
  if (!s) throw new Error('empty odds');
  if (/^\s*\d+\s*\/\s*\d+\s*$/.test(s)) { const [a,b]=s.split('/').map(Number); if (b===0) throw new Error('invalid fractional'); return 1 + a/b; }
  if (/^[+-]?\d+$/.test(s)) { const n = Number(s); if (n>=100) return 1+n/100; if (n<=-100) return 1+100/Math.abs(n); }
  const d = Number(s.replace(',', '.')); if (!isFinite(d) || d<=1) throw new Error('invalid decimal odds'); return d;
}
export const impliedProb = (odds: number) => 1 / odds;
export function fairFromBook(oddsList: number[]) {
  const implied = oddsList.map(impliedProb), sum = implied.reduce((a,b)=>a+b,0);
  const fairProb = implied.map(p => p / sum), fairOdds = fairProb.map(p => 1/p);
  return { fairProb, fairOdds, overround: sum - 1 };
}
export function withMargin(fairProb: number[], targetMarginPct: number) {
  const t = 1 + targetMarginPct / 100, p = fairProb.map(x => x * t);
  const sum = p.reduce((a,b)=>a+b,0); return p.map(x => x / sum);
}
export const fmtPct = (x:number,d=2)=> (x*100).toFixed(d)+'%';
export const fmtOdds = (x:number,d=2)=> x.toFixed(d);
