// ===== lib/tools/kelly.ts =====
export function kelly(p: number, decimalOdds: number, cap = 0.1): number {
  // b = o-1; f* = (bp - q)/b ; 若≤0则 0
  const b = decimalOdds - 1;
  const q = 1 - p;
  const f = (b * p - q) / b;
  if (!isFinite(f) || f <= 0) return 0;
  return Math.min(cap, f);
}
