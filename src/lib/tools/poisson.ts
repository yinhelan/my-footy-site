// ===== lib/tools/poisson.ts =====
export function factorial(n: number): number {
  if (n < 0) throw new Error("n>=0");
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

export function poissonPMF(lambda: number, k: number): number {
  // P(X=k) = e^{-λ} λ^k / k!
  return Math.exp(-lambda) * Math.pow(lambda, k) / factorial(k);
}

export type ScoreCell = { h: number; a: number; p: number };

export function buildScoreMatrix(lambdaH: number, lambdaA: number, K: number): ScoreCell[][] {
  const mat: ScoreCell[][] = [];
  const probsH = Array.from({ length: K + 1 }, (_, k) => poissonPMF(lambdaH, k));
  const probsA = Array.from({ length: K + 1 }, (_, k) => poissonPMF(lambdaA, k));
  for (let h = 0; h <= K; h++) {
    const row: ScoreCell[] = [];
    for (let a = 0; a <= K; a++) {
      row.push({ h, a, p: probsH[h] * probsA[a] });
    }
    mat.push(row);
  }
  // 归一化（因为K截断，和略<1，统一归一到1）
  const sum = mat.flat().reduce((s, c) => s + c.p, 0);
  if (sum > 0) {
    for (const c of mat.flat()) c.p /= sum;
  }
  return mat;
}

export function oneX2FromMatrix(mat: ScoreCell[][]) {
  let pH = 0, pD = 0, pA = 0;
  for (const row of mat) {
    for (const c of row) {
      if (c.h > c.a) pH += c.p; else if (c.h === c.a) pD += c.p; else pA += c.p;
    }
  }
  const s = pH + pD + pA || 1;
  return { home: pH / s, draw: pD / s, away: pA / s };
}

export function topScorelines(mat: ScoreCell[][], home: string, away: string, n = 5) {
  return mat
    .flat()
    .sort((a, b) => b.p - a.p)
    .slice(0, n)
    .map((c) => ({ label: `${home} ${c.h}-${c.a} ${away}`.replace(/\s+/g, " "), p: c.p }));
}
