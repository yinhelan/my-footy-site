export function poissonPMFArray(lambda: number, maxGoals: number): number[] {
  const p: number[] = new Array(maxGoals + 1).fill(0);
  p[0] = Math.exp(-lambda);
  for (let k = 1; k <= maxGoals; k++) p[k] = p[k - 1] * (lambda / k);
  return p;
}
export function computeInsights(lambdaHome: number, lambdaAway: number, maxGoals: number, ouLine = 2.5) {
  const pH = poissonPMFArray(lambdaHome, maxGoals);
  const pA = poissonPMFArray(lambdaAway, maxGoals);
  const M: number[][] = Array.from({ length: maxGoals + 1 }, () => new Array(maxGoals + 1).fill(0));
  for (let i = 0; i <= maxGoals; i++) for (let j = 0; j <= maxGoals; j++) M[i][j] = pH[i] * pA[j];

  let pHwin=0, pDraw=0, pAwin=0, pOver=0, pBTTS=0;
  for (let i = 0; i <= maxGoals; i++) for (let j = 0; j <= maxGoals; j++) {
    const prob = M[i][j];
    if (i > j) pHwin += prob; else if (i === j) pDraw += prob; else pAwin += prob;
    if (i + j > ouLine) pOver += prob;
    if (i > 0 && j > 0) pBTTS += prob;
  }
  const pUnder = 1 - pOver, pBTTSno = 1 - pBTTS;
  const flat: Array<{score:string; prob:number}> = [];
  for (let i = 0; i <= maxGoals; i++) for (let j = 0; j <= maxGoals; j++) flat.push({ score: `${i}:${j}`, prob: M[i][j] });
  flat.sort((a,b)=> b.prob - a.prob);
  const top = flat.slice(0, 5);
  const clamp = (x:number,lo=1e-12,hi=1-1e-12)=>Math.min(hi,Math.max(lo,x));
  const p1x2 = { H: pHwin, D: pDraw, A: pAwin };
  const fairPrice = { H: 1/clamp(pHwin), D: 1/clamp(pDraw), A: 1/clamp(pAwin) };
  const overUnder = { over: pOver, under: 1 - pOver };
  const btts = { yes: pBTTS, no: pBTTSno };
  return { p1x2, fairPrice, overUnder, btts, topCorrectScores: top };
}
