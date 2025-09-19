export const prerender = true;
export function GET(){
  const items = [
    { match:'Man City vs Arsenal', odds:['1.95','3.70','3.80'], href:'/tools/poisson/?home=Man%20City&away=Arsenal' },
    { match:'Real Madrid vs Barca', odds:['2.20','3.40','3.00'], href:'/tools/poisson/?home=Real%20Madrid&away=Barcelona' },
    { match:'Liverpool vs Man Utd', odds:['2.10','3.50','3.30'], href:'/tools/poisson/?home=Liverpool&away=Man%20United' },
  ];
  return new Response(JSON.stringify({ items }), {
    headers:{ 'Content-Type':'application/json', 'Cache-Control':'no-store' }
  });
}
