export function kellyFrac(p: number, decOdds: number){
  const b = decOdds - 1;
  const f = (p*decOdds - 1) / b;
  return Math.max(0, f);
}
export function stake(bankroll: number, frac: number, capRatio=0.1){
  return Math.max(0, Math.min(bankroll * frac, bankroll * capRatio));
}
