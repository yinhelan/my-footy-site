export type OddsFormat = 'decimal' | 'american' | 'fractional';

export function parseList(input: string): string[] {
  return String(input).split(/[\s,]+/).filter(Boolean);
}

export function toDecimalOne(fmt: OddsFormat, value: string): number {
  if (fmt === 'decimal') return Number(value);
  if (fmt === 'american') {
    const a = Number(value);
    if (!Number.isFinite(a)) return NaN;
    return a >= 0 ? 1 + a / 100 : 1 + 100 / Math.abs(a);
  }
  const [num, den] = String(value).split('/').map(Number);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return NaN;
  return 1 + num / den;
}

export function toDecimal(fmt: OddsFormat, input: string): number[] {
  return parseList(input)
    .map((token) => toDecimalOne(fmt, token))
    .filter((value) => Number.isFinite(value) && value > 1);
}
