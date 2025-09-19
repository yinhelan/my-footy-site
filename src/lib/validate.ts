export interface ValidationResult {
  ok: boolean;
  msg?: string;
}

export type Validator<T = unknown> = (value: T) => ValidationResult;

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value === null || value === undefined) return NaN;
  const str = String(value).trim();
  if (!str) return NaN;
  const normalized = str.replace(/,/g, '.');
  const num = Number(normalized);
  return Number.isFinite(num) ? num : NaN;
}

export function required(msg = '必填'): Validator {
  return (value) => {
    if (value === null || value === undefined) {
      return { ok: false, msg };
    }
    const str = typeof value === 'string' ? value.trim() : String(value).trim();
    return str ? { ok: true } : { ok: false, msg };
  };
}

export function isNumber(msg = '请输入数字'): Validator {
  return (value) => {
    const num = toNumber(value);
    return Number.isFinite(num) ? { ok: true } : { ok: false, msg };
  };
}

export function inRange(min: number, max: number, msg?: string): Validator {
  const message = msg ?? `范围 ${min}~${max}`;
  return (value) => {
    const num = toNumber(value);
    if (!Number.isFinite(num)) return { ok: true };
    return num >= min && num <= max
      ? { ok: true }
      : { ok: false, msg: message };
  };
}

export function compose<T>(...validators: Array<Validator<T>>): Validator<T> {
  return (value: T) => {
    for (const validator of validators) {
      const result = validator(value);
      if (!result.ok) return result;
    }
    return { ok: true };
  };
}
