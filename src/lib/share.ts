export const copy = (text: string) => navigator.clipboard?.writeText(text);
export function downloadCSV(filename: string, rows: string[][]){
  const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click(); a.remove();
}
export function buildShareURL(base: string, params: Record<string,string|number>){
  const u = new URL(base, location.origin);
  for (const [k,v] of Object.entries(params)) u.searchParams.set(k, String(v));
  return u.toString();
}
