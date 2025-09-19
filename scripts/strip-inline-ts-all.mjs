import fs from 'fs'; import path from 'path';
const root = 'src';
const files=[];
(function walk(d){ for (const f of fs.readdirSync(d)) {
  const p = path.join(d,f); const s = fs.statSync(p);
  if (s.isDirectory()) walk(p); else if (p.endsWith('.astro')) files.push(p);
}})(root);

const reScript = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
// TS 断言（ a as T ）与非空断言（expr!）的简易检测
const isTSy = (body) => /\sas\s[A-Za-z_{<]/.test(body) || /[A-Za-z0-9_\)\]]!\s*[\.\(\[]/.test(body);

// dry-run: 先列出命中项
let hits=[];
for (const file of files) {
  const src = fs.readFileSync(file,'utf8');
  let m, any=false;
  while ((m = reScript.exec(src))) { if (isTSy(m[1])) { any=true; break; } }
  if (any) hits.push(file);
}
if (hits.length===0){ console.log('no TS-like inline scripts found under src/'); process.exit(0); }
console.log('will strip inline TS in:\n' + hits.join('\n') + '\n--- applying ---');

let changed=0;
for (const file of hits) {
  const src = fs.readFileSync(file,'utf8');
  const out = src.replace(reScript, (m, body) => isTSy(body) ? m.replace(body, '') : m);
  if (out !== src) {
    fs.copyFileSync(file, file+'.bak');
    fs.writeFileSync(file, out);
    changed++; console.log('stripped:', file);
  }
}
console.log('done, changed:', changed);
