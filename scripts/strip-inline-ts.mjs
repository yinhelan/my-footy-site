import fs from 'fs'; import path from 'path';
const roots = ['src/layouts', 'src/components']; const files=[];
function walk(d){ for(const f of fs.readdirSync(d)){ const p=path.join(d,f); const s=fs.statSync(p);
  if(s.isDirectory()) walk(p); else if(p.endsWith('.astro')) files.push(p); } }
roots.filter(fs.existsSync).forEach(walk);
const reScript=/<script\b[^>]*>([\s\S]*?)<\/script>/gi;
const isTSy = b => /\sas\s[A-Za-z_{<]/.test(b) || /[A-Za-z0-9_\)\]]!\s*[\.\(\[]/.test(b);
let changed=0;
for(const file of files){
  const src=fs.readFileSync(file,'utf8');
  let out=src, any=false;
  out = out.replace(reScript,(m,body)=> isTSy(body) ? (any=true, m.replace(body,'')) : m);
  if(any && out!==src){ fs.copyFileSync(file, file+'.bak'); fs.writeFileSync(file,out); changed++; console.log('stripped:',file); }
}
console.log('done, changed:', changed);
