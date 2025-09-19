(()=>{ "use strict";
  // ---------- 样式 ----------
  const css = `
  #lyra-toolbar{position:fixed;right:16px;bottom:16px;z-index:2147483647;
    display:flex;gap:8px;flex-wrap:wrap;max-width:min(92vw,560px);
    background:rgba(17,17,20,.85);backdrop-filter:saturate(120%) blur(6px);
    padding:12px;border:1px solid rgba(255,255,255,.12);border-radius:14px}
  #lyra-toolbar button{appearance:none;border:1px solid rgba(255,255,255,.16);
    background:#222;color:#fff;padding:8px 10px;border-radius:10px;
    font:600 12px/1 ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial;
    cursor:pointer;white-space:nowrap}
  #lyra-toolbar button:hover{background:#2b2b2b}
  #lyra-toast{position:fixed;left:50%;bottom:80px;transform:translateX(-50%);
    background:#111;color:#fff;padding:10px 14px;border-radius:10px;
    border:1px solid rgba(255,255,255,.12);opacity:0;pointer-events:none;
    transition:opacity .2s ease;z-index:2147483647}
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  // ---------- 工具函数 ----------
  const $main = ()=> document.querySelector("main") || document.body;
  const KEY = (path)=> `lyra:${path}`;
  const debounce=(fn,ms=250)=>{let t;return (...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}};
  const domPath = (el)=>{ let p=[]; for(let n=el; n&&n.nodeType===1; n=n.parentElement){
      let i=0,sib=n; while(sib=sib.previousElementSibling) i++;
      p.push(`${n.tagName.toLowerCase()}:nth-child(${i+1})`);
    } return p.reverse().join(">") };
  const getFields=()=>{
    const root=$main();
    const els=[...root.querySelectorAll("input,select,textarea")].filter(e=>!e.disabled);
    return els.map((el,idx)=>{
      let v;
      if(el.type==="checkbox") v=!!el.checked;
      else if(el.type==="radio") v=el.checked?el.value:null;
      else if(el.tagName==="SELECT") v=el.value;
      else v=el.value;
      const key=el.name||el.id||el.getAttribute("data-key")||el.placeholder||`idx_${idx}`;
      return {k:key,t:(el.type||el.tagName).toLowerCase(),p:domPath(el),v}
    });
  };
  const setField=(el,val)=>{
    const type=(el.type||el.tagName).toLowerCase();
    if(type==="checkbox") el.checked=!!val;
    else if(type==="radio"){ if(el.value==val){ el.checked=true; } }
    else el.value = (val==null?"":val);
    el.dispatchEvent(new Event("input",{bubbles:true}));
    el.dispatchEvent(new Event("change",{bubbles:true}));
  };
  const indexControls=()=>{
    const root=$main();
    const els=[...root.querySelectorAll("input,select,textarea")].filter(e=>!e.disabled);
    return {
      list: els,
      byName:new Map(els.map(e=>[e.name,e])),
      byId:new Map(els.map(e=>[e.id,e])),
      byKey:new Map(els.map(e=>[e.getAttribute("data-key"),e])),
      byPh:new Map(els.map(e=>[e.placeholder,e])),
      byIdx:new Map(els.map((e,i)=>[`idx_${i}`,e]))
    };
  };
  const toast=(msg)=>{
    let el=document.getElementById("lyra-toast");
    if(!el){ el=document.createElement("div"); el.id="lyra-toast"; document.body.appendChild(el); }
    el.textContent=msg; el.style.opacity="1"; setTimeout(()=>el.style.opacity="0", 1400);
  };
  const saveLS=()=>{ try{
      const state={v:2, path:location.pathname, fields:getFields(), ts:Date.now()};
      localStorage.setItem(KEY(location.pathname), JSON.stringify(state));
      toast("已保存到本地");
      return state;
    }catch(e){ console.warn(e); toast("保存失败"); return null; }
  };
  const loadLS=()=>{ try{
      const raw=localStorage.getItem(KEY(location.pathname)); return raw?JSON.parse(raw):null;
    }catch(e){ return null } };
  const clearLS=()=>{ localStorage.removeItem(KEY(location.pathname)); toast("本地已清空"); };
  const encode=(obj)=> btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  const decode=(s)=> JSON.parse(decodeURIComponent(escape(atob(s))));
  const copy = async (txt)=>{ try{ await navigator.clipboard.writeText(txt); return true }catch{ return false } };

  const applyState=(state)=>{
    if(!state||!state.fields) return;
    const cur=indexControls();
    state.fields.forEach(f=>{
      const el=cur.byName.get(f.k)||cur.byId.get(f.k)||cur.byKey.get(f.k)||cur.byPh.get(f.k)||cur.byIdx.get(f.k);
      if(!el) return;
      setField(el,f.v);
    });
    toast("已从状态恢复");
  };

  // ---------- 赔率格式化（与 src/lib/share.ts 保持一致） ----------
  const toHalf=(s)=>s.replace(/[０-９．。，、－—／＋]/g,(ch)=>({
    "０":"0","１":"1","２":"2","３":"3","４":"4","５":"5","６":"6","７":"7","８":"8","９":"9",
    "．":".","。":".","，":",","、":",","－":"-","—":"-","／":"/","＋":"+"}[ch]||ch);
  );
  const parseDecimal=(input)=>{
    if(typeof input==="number") return input;
    let s=toHalf(String(input).trim());
    s=s.replace(/(?<=\d),(?=\d{3}\b)/g,"");
    if(/^\s*\d+\s*([\/-])\s*\d+\s*$/.test(s)){
      const [a,b]=s.split(/[\/-]/).map(x=>Number(x.trim()));
      if(!b) return NaN; return 1 + a/b;
    }
    if(s.includes(",") && !s.includes(".")) s=s.replace(/,/g,".");
    if(/^[+-]?\d+$/.test(s) && !s.includes(".")){
      const x=parseInt(s,10);
      if(s.startsWith("+") || s.startsWith("-") || Math.abs(x)>=100){
        if(x>0) return 1 + x/100;
        if(x<0) return 1 + 100/Math.abs(x);
      }
    }
    const n=Number(s.replace(/,/g,"")); return Number.isFinite(n)?n:NaN;
  };

  // ---------- Poisson/Skellam 计算 ----------
  const fact = (n)=>{ let r=1; for(let i=2;i<=n;i++) r*=i; return r; };
  const pois = (k,lambda)=> Math.exp(-lambda)*Math.pow(lambda,k)/fact(k);
  const detectPoissonParams = ()=>{
    const nums=[...indexControls().list].filter(e=>e.type==="number"||e.type==="text").map(e=>e.value||e.placeholder||"");
    const parsed = nums.map(parseDecimal).filter(x=>Number.isFinite(x));
    // 经验：两个 λ 大多在 [0,6]；K 在[5,20]
    const lambdas = parsed.filter(x=>x>=0 && x<=6).slice(0,2);
    let K = parsed.find(x=>Number.isInteger(x) && x>=5 && x<=20);
    if(!Number.isInteger(K)) K = 10;
    const [lh,la]=[lambdas[0]??1.4, lambdas[1]??1.2];
    return { lh, la, K: Math.max(1, Math.min(20, Math.round(K))) };
  };
  const matrixProbs = (lh,la,K)=>{
    const m = Array.from({length:K+1},()=>Array(K+1).fill(0));
    const ph = Array.from({length:K+1},(_,i)=>pois(i,lh));
    const pa = Array.from({length:K+1},(_,j)=>pois(j,la));
    let sum=0;
    for(let i=0;i<=K;i++){ for(let j=0;j<=K;j++){ const p=ph[i]*pa[j]; m[i][j]=p; sum+=p; } }
    return { m, sum };
  };
  const deriveMetrics = (lh,la,K)=>{
    const {m,sum} = matrixProbs(lh,la,K);
    let pH=0,pD=0,pA=0;
    const scores=[];
    for(let i=0;i<=K;i++){
      for(let j=0;j<=K;j++){
        const p = m[i][j];
        if(i>j) pH+=p; else if(i===j) pD+=p; else pA+=p;
        scores.push({i,j,p});
      }
    }
    scores.sort((a,b)=>b.p-a.p);
    const top5 = scores.slice(0,5);
    // BTTS（独立闭式）：1 - e^{-λH} - e^{-λA} + e^{-(λH+λA)}
    const btts = 1 - Math.exp(-lh) - Math.exp(-la) + Math.exp(-(lh+la));
    // OU2.5（近似用截断矩阵求和）：P(i+j>2.5)
    let pOver25=0, pUnder25=0;
    for(let i=0;i<=K;i++){ for(let j=0;j<=K;j++){
      if(i+j>=3) pOver25+=m[i][j]; else pUnder25+=m[i][j];
    } }
    const fairOdds = (p)=> p>0 ? (1/p) : Infinity;
    return {
      pH, pD, pA,
      fh: fairOdds(pH/sum), fd: fairOdds(pD/sum), fa: fairOdds(pA/sum),
      btts, ou25_over:pOver25/sum, ou25_under:pUnder25/sum,
      top5, K, lh, la
    };
  };

  // ---------- CSV/JSON 导出 ----------
  const download = (filename, content, mime="text/plain")=>{
    const blob=new Blob([content],{type:`${mime};charset=utf-8`});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=filename;
    document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();}, 0);
  };
  const exportJSON = ()=>{
    const data = { path:location.pathname, ts:new Date().toISOString(), fields:getFields() };
    download("snapshot.json", JSON.stringify(data,null,2), "application/json");
    toast("已导出 JSON");
  };
  const importJSON = async ()=>{
    const ip=document.createElement("input"); ip.type="file"; ip.accept=".json,application/json";
    ip.onchange=async ()=>{
      const f=ip.files?.[0]; if(!f) return;
      const txt=await f.text(); try{
        const obj=JSON.parse(txt);
        if(obj && obj.fields){ applyState(obj); toast("JSON 已导入并应用"); }
        else toast("文件不含 fields 字段");
      }catch{ toast("JSON 解析失败"); }
    };
    ip.click();
  };
  const exportPoissonCSV = ()=>{
    const {lh,la,K} = detectPoissonParams();
    const {m} = matrixProbs(lh,la,K);
    // CSV：第一行："" , 0..K；第一列为 Home goals
    let lines = [];
    lines.push(["", ...Array.from({length:K+1},(_,j)=>String(j))].join(","));
    for(let i=0;i<=K;i++){
      lines.push([String(i), ...m[i].map(x=>x.toFixed(6))].join(","));
    }
    download(`poisson_${lh}_${la}_K${K}.csv`, lines.join("\n"), "text/csv");
    toast("Poisson 矩阵CSV已导出");
  };

  // ---------- 复制摘要 ----------
  const copySummary = async ()=>{
    const {lh,la,K} = detectPoissonParams();
    const M = deriveMetrics(lh,la,K);
    // 尝试读取三路市场价（如存在）
    const nums=[...indexControls().list].map(e=>e.value||"").map(parseDecimal).filter(x=>Number.isFinite(x));
    const [oh,od,oa] = nums.filter(x=>x>1.05 && x<50).slice(0,3);
    const lines = [
      `模型摘要`,
      `λ_H=${lh.toFixed(2)}, λ_A=${la.toFixed(2)}, K=${K}`,
      `Top5比分：`+M.top5.map(s=>`${s.i}-${s.j} ${(s.p*100).toFixed(2)}%`).join("， "),
      `公平赔率 1X2：主 ${M.fh.toFixed(3)} / 平 ${M.fd.toFixed(3)} / 客 ${M.fa.toFixed(3)}`,
      `BTTS≈${(M.btts*100).toFixed(2)}% | OU2.5 Over≈${(M.ou25_over*100).toFixed(2)}% Under≈${(M.ou25_under*100).toFixed(2)}%`,
      (oh&&od&&oa)?`市场赔率(猜测)：主 ${oh} / 平 ${od} / 客 ${oa}`:`（未检测到市场价输入，已跳过）`,
      `仅学习演示，非投注建议。`
    ];
    const ok = await navigator.clipboard.writeText(lines.join("\n")).then(()=>true,()=>false);
    toast(ok?"摘要已复制":"复制失败");
  };

  // ---------- 工具条 ----------
  const bar = document.createElement("div");
  bar.id="lyra-toolbar";
  bar.innerHTML = `
    <button data-act="restore">恢复</button>
    <button data-act="save">保存</button>
    <button data-act="share">复制深链</button>
    <button data-act="preset">样例填充</button>
    <button data-act="summary">复制摘要</button>
    <button data-act="csv">导出CSV</button>
    <button data-act="json">导出JSON</button>
    <button data-act="import">导入JSON</button>
    <button data-act="clear">清空</button>
    <button data-act="auto">自动保存: 开</button>
  `;
  document.addEventListener("DOMContentLoaded",()=>document.body.appendChild(bar),{once:true});

  let auto=true;
  const onInput = debounce(()=>{ if(auto) saveLS(); }, 200);
  const hook = ()=>{ $main().addEventListener("input", onInput, true); $main().addEventListener("change", onInput, true); };
  document.addEventListener("DOMContentLoaded", hook, {once:true});

  bar.addEventListener("click", async (e)=>{
    const btn = e.target.closest("button"); if(!btn) return;
    const act = btn.getAttribute("data-act");
    if(act==="save"){ saveLS(); }
    else if(act==="restore"){ const st=loadLS(); if(st) applyState(st); else toast("暂无本地状态"); }
    else if(act==="share"){
      const st = saveLS() || {v:2, path:location.pathname, fields:getFields(), ts:Date.now()};
      const url=new URL(location.href); url.searchParams.set("s", encode(st));
      const ok = await copy(url.toString()); toast(ok?"链接已复制":"复制失败");
    }
    else if(act==="preset"){
      const page=location.pathname;
      const cur=indexControls();
      const byName=(name)=>cur.byName.get(name)||cur.byId.get(name)||null;
      if(page.includes("/poisson")){
        const pairs=[["lambdaHome","1.45"],["lambdaAway","1.20"],["K","8"],["homeLambda","1.45"],["awayLambda","1.20"],["maxGoals","8"],["k","8"]];
        let c=0; pairs.forEach(([k,v])=>{ const el=byName(k); if(el){ setField(el,v); c++; } });
        if(c<3){ let nums=cur.list.filter(e=>e.type==="number"); if(nums[0]) setField(nums[0],"1.45"); if(nums[1]) setField(nums[1],"1.20"); if(nums[2]) setField(nums[2],"8"); }
        toast("Poisson 示例已填充：λH=1.45, λA=1.20, K=8");
      } else if(page.includes("/implied-odds")){
        const nums=cur.list.filter(e=>e.type==="number"||e.tagName==="INPUT");
        if(nums[0]) setField(nums[0],"2.10"); if(nums[1]) setField(nums[1],"3.40"); if(nums[2]) setField(nums[2],"3.65");
        toast("Implied Odds 示例已填充：2.10 / 3.40 / 3.65");
      } else if(page.includes("/kelly")){
        const candidates=[["prob","0.38"],["p","0.38"],["winProb","0.38"],["odds","2.50"],["decimal","2.50"],["bankroll","1000"],["cap","2"]];
        let hits=0; candidates.forEach(([k,v])=>{ const el=byName(k); if(el){ setField(el,v); hits++; } });
        if(hits<4){ let nums=cur.list.filter(e=>e.type==="number");
          if(nums[0]) setField(nums[0],"0.38"); if(nums[1]) setField(nums[1],"2.50"); if(nums[2]) setField(nums[2],"1000"); if(nums[3]) setField(nums[3],"2"); }
        toast("Kelly 示例已填充：p=0.38, o=2.50, B=1000, cap=2%");
      } else {
        let nums=cur.list.filter(e=>e.type==="number");
        if(nums[0]) setField(nums[0],"1.23"); if(nums[1]) setField(nums[1],"2.34"); if(nums[2]) setField(nums[2],"3");
        toast("示例已填充（通用回退）");
      }
    }
    else if(act==="summary"){ copySummary(); }
    else if(act==="csv"){ exportPoissonCSV(); }
    else if(act==="json"){ exportJSON(); }
    else if(act==="import"){ importJSON(); }
    else if(act==="clear"){
      clearLS();
      indexControls().list.forEach(el=>{
        if(el.type==="checkbox"||el.type==="radio"){ el.checked=false; }
        else setField(el,"");
      });
    }
    else if(act==="auto"){ auto=!auto; btn.textContent=`自动保存: ${auto?"开":"关"}`; toast(`自动保存${auto?"已开启":"已关闭"}`); }
  });

  // 启动：优先 URL ?s= 还原；无则本地还原
  const boot=()=>{
    const sp=new URLSearchParams(location.search);
    const s=sp.get("s");
    if(s){ try{ applyState(JSON.parse(decodeURIComponent(escape(atob(s))))); }catch{ /* ignore */ } }
    else { const st=loadLS(); if(st) applyState(st); }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, {once:true});
  else boot();
})();
