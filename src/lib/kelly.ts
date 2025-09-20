export function kelly(decimalOdds: number, fairProb: number, bankroll: number, fraction = 1, cap?: number) {
  const d = decimalOdds, q = fairProb;
  const fStar = Math.max(0, Math.min(1, (d * q - 1) / (d - 1)));
  let stakeAmt = bankroll * fStar * fraction;
  if (typeof cap === 'number') stakeAmt = Math.min(stakeAmt, cap);
  return { fStar, stake: stakeAmt };
}

export function kellyFrac(p: number, decOdds: number){
  const { fStar } = kelly(decOdds, p, 1);
  return fStar;
}
export function stake(bankroll: number, frac: number, capRatio=0.1){
  return Math.max(0, Math.min(bankroll * frac, bankroll * capRatio));
}
