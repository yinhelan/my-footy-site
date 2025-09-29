export function readQuery<T>(parse: (q: URLSearchParams) => T, init: T): T {
  if (typeof window === "undefined") return init;
  try {
    return parse(new URLSearchParams(window.location.search));
  } catch {
    return init;
  }
}

export function writeQuery(obj: Record<string, string | number | undefined>) {
  if (typeof window === "undefined") return;
  const q = new URLSearchParams();
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined) q.set(key, String(value));
  });
  const url = `${window.location.pathname}?${q.toString()}`;
  window.history.replaceState(null, "", url);
}
