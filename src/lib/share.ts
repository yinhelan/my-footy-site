/**
 * 通用分享与参数工具（浏览器/SSR两用）
 * 提供：
 *  - normalizeDecimal：把任意赔率字符串 -> 十进制小数（支持全角、逗号、美式、分数）
 *  - readParams：从 ?s=（base64 JSON）或普通 query 读取状态对象
 *  - makeShareUrl：把任意 state 编码到 ?s= 链接
 */

declare const Buffer: any;

const hasGlobal = typeof globalThis !== "undefined";
const hasAtob = hasGlobal && typeof (globalThis as any).atob === "function";
const hasBtoa = hasGlobal && typeof (globalThis as any).btoa === "function";
const hasBuffer = typeof Buffer !== "undefined";

function b64encode(str: string): string {
  // 保持与前端 tooling.js 相同的编码管线（含 encodeURIComponent）
  if (hasBtoa) return (globalThis as any).btoa(unescape(encodeURIComponent(str)));
  if (hasBuffer) return Buffer.from(str, "utf-8").toString("base64");
  throw new Error("No base64 encoder available");
}

function b64decode(b64: string): string {
  // 先走与 tooling.js 对应的 decodeURIComponent(escape(atob()))
  if (hasAtob) {
    try {
      const raw = (globalThis as any).atob(b64);
      try { return decodeURIComponent(escape(raw)); } catch { return raw; }
    } catch { /* fallthrough */ }
  }
  if (hasBuffer) return Buffer.from(b64, "base64").toString("utf-8");
  throw new Error("No base64 decoder available");
}

// 全角→半角与常见标点归一
function toHalfwidthDigits(input: string): string {
  const map: Record<string, string> = {
    "０":"0","１":"1","２":"2","３":"3","４":"4","５":"5","６":"6","７":"7","８":"8","９":"9",
    "．":".","。":".","，":",","、":",","－":"-","—":"-","／":"/","＋":"+"," ":" "
  };
  return input.replace(/[０-９．。，、－—／＋]/g, (ch) => map[ch] ?? ch);
}

function tryParseNumberLike(s: string): number | null {
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * 将任意格式赔率规范化为十进制小数（decimal odds）。
 * 支持：
 *  - 十进制：2.10 / 2,10 / 全角数字
 *  - 美式：+120 / -150  => 1 + 1.20 或 1 + 100/150
 *  - 分数：13/10、5-2  => 1 + 13/10、1 + 5/2
 */
export function normalizeDecimal(input: number | string): number {
  if (typeof input === "number") return input;

  let s = toHalfwidthDigits(String(input).trim());

  // 去掉千分位
  s = s.replace(/(?<=\d),(?=\d{3}\b)/g, "");

  // 分数盘：a/b 或 a-b
  if (/^\s*\d+\s*([\/-])\s*\d+\s*$/.test(s)) {
    const [a, b] = s.split(/[\/-]/).map((x) => Number(x.trim()));
    if (b === 0) return NaN;
    return 1 + a / b;
  }

  // 逗号作为小数点的情况：2,10 -> 2.10（如果字符串里没有点）
  if (s.includes(",") && !s.includes(".")) s = s.replace(/,/g, ".");

  // 美式：+120 / -150（必须是纯整数，且有+/- 或 绝对值>=100 且不含小数点）
  if (/^[+-]?\d+$/.test(s) && !s.includes(".")) {
    const x = parseInt(s, 10);
    if (s.startsWith("+") || s.startsWith("-") || Math.abs(x) >= 100) {
      if (x > 0) return 1 + x / 100;
      if (x < 0) return 1 + 100 / Math.abs(x);
    }
  }

  // 十进制
  const n = tryParseNumberLike(s.replace(/,/g, ""));
  return n ?? NaN;
}

export type ShareState = {
  v?: number;
  path?: string;
  fields?: Array<{ k: string; p?: string; t?: string; v: any }>;
  [key: string]: any;
};

/**
 * 从 URL 读取状态：
 *  - 优先 ?s=（base64 JSON，与前端 tooling.js 兼容）
 *  - 否则把普通 query 转成对象（尝试把纯数字转 number）
 */
export function readParams<T = any>(): T {
  // SSR 场景（无 location）返回空对象
  if (typeof location === "undefined") return {} as T;

  const sp = new URLSearchParams(location.search);
  const packed = sp.get("s");
  if (packed) {
    try {
      const raw = b64decode(packed);
      return JSON.parse(raw) as T;
    } catch {
      // 兼容直接 atob 的情况
      try {
        const raw2 = hasAtob ? (globalThis as any).atob(packed) : packed;
        return JSON.parse(raw2) as T;
      } catch {
        return {} as T;
      }
    }
  }

  // 普通 query → 对象
  const obj: Record<string, any> = {};
  sp.forEach((v, k) => {
    const maybe = tryParseNumberLike(toHalfwidthDigits(v));
    obj[k] = maybe ?? v;
  });
  return obj as T;
}

/**
 * 生成带 ?s= 的可分享链接
 * - baseUrl 省略时，使用当前页面（含路径与 hash）
 */
export function makeShareUrl(state: any, baseUrl?: string): string {
  const href =
    baseUrl ||
    (typeof location !== "undefined" ? location.href : "http://localhost/");
  const url = new URL(href);
  url.searchParams.set("s", b64encode(JSON.stringify(state)));
  return url.toString();
}

export default {
  normalizeDecimal,
  readParams,
  makeShareUrl,
};
