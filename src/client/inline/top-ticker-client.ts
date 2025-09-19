async function renderTicker(){
  const el = document.getElementById('ticker-row');
  if (!el) return;
  el.querySelectorAll('.item').forEach((node) => node.remove());
  try {
    const res = await fetch('/api/ticker.json', { cache: 'no-store' });
    const data = await res.json();
    for (const item of (data.items || []).slice(0, 5)) {
      const node = document.createElement('span');
      node.className = 'item';
      node.innerHTML = `
        <strong>${item.match}</strong>
        <span>H ${item.odds[0]}</span>
        <span>D ${item.odds[1]}</span>
        <span>A ${item.odds[2]}</span>
        <a class="btn brand" href="${item.href}">去分析</a>
      `;
      el.appendChild(node);
    }
  } catch (err) {
    // ignore fetch errors in dev
  }
}

renderTicker();
setInterval(renderTicker, 30000);
