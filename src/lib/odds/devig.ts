export type DevigMethod = 'basic' | 'multiplicative' | 'power' | 'shin';

const EPS = 1e-9;
const MAX_IT = 200;

function sum(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0);
}

function bsearch(lo: number, hi: number, f: (x: number) => number, eps = EPS): number {
  let flo = f(lo);
  let fhi = f(hi);

  let iter = 0;
  while (flo > 0 && fhi > 0 && iter++ < 32) {
    hi *= 2;
    fhi = f(hi);
  }

  iter = 0;
  while (flo < 0 && fhi < 0 && iter++ < 32) {
    lo /= 2;
    flo = f(lo);
  }

  for (let i = 0; i < MAX_IT; i++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (Math.abs(fm) <= eps) return mid;
    if ((flo <= 0 && fm > 0) || (flo >= 0 && fm < 0)) {
      hi = mid;
      fhi = fm;
    } else {
      lo = mid;
      flo = fm;
    }
  }
  return (lo + hi) / 2;
}

export function devig(method: DevigMethod, oddsDecimal: number[]) {
  const raw = oddsDecimal.map((o) => 1 / o);
  const overround = sum(raw) - 1;

  let fair: number[];

  if (method === 'basic') {
    fair = raw.map((x) => x / sum(raw));
  } else if (method === 'multiplicative') {
    const g = (k: number) => sum(raw.map((x) => x / (1 + k * x))) - 1;
    const k = bsearch(0, 1, g, EPS);
    fair = raw.map((x) => x / (1 + k * x));
    const Z = sum(fair);
    fair = fair.map((x) => x / Z);
  } else if (method === 'power') {
    const h = (a: number) => sum(raw.map((x) => Math.pow(x, a))) - 1;
    const alpha = bsearch(1, 2, h, EPS);
    fair = raw.map((x) => Math.pow(x, alpha));
    const Z = sum(fair);
    fair = fair.map((x) => x / Z);
  } else {
    const pmin = Math.max(1e-12, Math.min(...raw) - 1e-12);
    const f = (z: number) => {
      const denom = 2 * (1 - z);
      const q = raw.map((pi) => (Math.sqrt(z * z + 4 * (1 - z) * pi) - z) / denom);
      return sum(q) - 1;
    };
    const z = bsearch(0, pmin, f, EPS);
    const denom = 2 * (1 - z);
    fair = raw.map((pi) => (Math.sqrt(z * z + 4 * (1 - z) * pi) - z) / denom);
    const Z = sum(fair);
    fair = fair.map((x) => x / Z);
  }

  const fairSum = sum(fair);
  if (Math.abs(fairSum - 1) > 1e-6) {
    fair = fair.map((x) => x / fairSum);
  }

  return { overround, raw, fair };
}
