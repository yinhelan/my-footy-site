// ===== lib/tools/odds.ts =====
export type OneX2 = { home: number; draw: number; away: number };

export function decimalToProb(odds: number): number {
  return 1 / odds;
}

export function probsToDecimal(p: OneX2): OneX2 {
  return { home: 1 / p.home, draw: 1 / p.draw, away: 1 / p.away };
}

export function normalizeProbs(p: OneX2): OneX2 {
  const s = p.home + p.draw + p.away || 1;
  return { home: p.home / s, draw: p.draw / s, away: p.away / s };
}

export function overroundOfOdds(h: number, d: number, a: number): number {
  const s = 1 / h + 1 / d + 1 / a; // >1 表示有水位
  return s - 1;
}
