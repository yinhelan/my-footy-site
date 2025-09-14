export function poissonPmf(lambda: number, K: number): number[] {
  if (lambda < 0 || K < 0) throw new Error('invalid params');
  const p: number[] = new Array(K+1).fill(0), e = Math.exp(-lambda);
  p[0]=e; for (let k=0;k<K;k++) p[k+1]=p[k]*(lambda/(k+1)); return p;
}
export function scoreMatrix(lh: number, la: number, K: number){
  const ph = poissonPmf(lh, K), pa = poissonPmf(la, K);
  const mat: number[][] = Array.from({length:K+1}, ()=> new Array(K+1).fill(0));
  for (let i=0;i<=K;i++) for (let j=0;j<=K;j++) mat[i][j] = ph[i]*pa[j];
  return { mat, ph, pa };
}
export function probs1x2(mat: number[][]){
  let H=0,D=0,A=0; const K = mat.length-1;
  for (let i=0;i<=K;i++) for (let j=0;j<=K;j++){
    const v = mat[i][j]; if (i>j) H+=v; else if (i===j) D+=v; else A+=v;
  }
  const sum = H+D+A, scale = 1/sum;
  return { H:H*scale, D:D*scale, A:A*scale, cutoff: 1-sum };
}
export function topScorelines(mat: number[][], n=5){
  const K = mat.length-1;
  const arr: {h:number,a:number,p:number}[] = [];
  for (let i=0;i<=K;i++) for (let j=0;j<=K;j++) arr.push({h:i,a:j,p:mat[i][j]});
  return arr.sort((x,y)=>y.p-x.p).slice(0,n);
}
