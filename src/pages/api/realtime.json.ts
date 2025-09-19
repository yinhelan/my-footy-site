export const prerender = true;
export function GET(){
  const payload = {
    odds: [
      { match:'Man City vs Arsenal', price:1.95, delta:-0.03 },
      { match:'Real Madrid vs Barca', price:2.20, delta:+0.02 },
      { match:'Liverpool vs Man Utd', price:2.10, delta:-0.01 },
    ],
    events: [
      { minute: 12, text: 'Liverpool ⚽️ 1–0 Man Utd' },
      { minute: 33, text: 'Arsenal 🔴 红牌（VAR）' }
    ]
  };
  return new Response(JSON.stringify(payload), {
    headers:{ 'Content-Type':'application/json', 'Cache-Control':'no-store' }
  });
}
