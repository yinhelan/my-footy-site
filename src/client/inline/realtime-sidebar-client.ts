const oddsContainer = document.querySelector('#odds');
const eventsContainer = document.querySelector('#events');
const dock = document.querySelector('#mobile-dock');

async function loadRealtime(){
  try {
    const res = await fetch('/api/realtime.json');
    const data = await res.json();

    if (oddsContainer instanceof HTMLElement) {
      oddsContainer.innerHTML = (data.odds || []).map((o) => (
        `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #eee">` +
        `<span>${o.match}</span>` +
        `<span>主胜 <b style="color:${o.delta > 0 ? 'var(--down)' : 'var(--up)'}">${Number(o.price).toFixed(2)} ${o.delta > 0 ? '↑' : '↓'}</b></span>` +
        `</div>`
      )).join('');
    }

    if (eventsContainer instanceof HTMLElement) {
      eventsContainer.innerHTML = (data.events || []).map((e) => (
        `<div style="display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px dashed #eee">` +
        `<span class="tag">${e.minute}'</span>` +
        `<span>${e.text}</span>` +
        `</div>`
      )).join('');
    }

    if (dock instanceof HTMLElement && window.matchMedia('(max-width: 959px)').matches) {
      dock.hidden = false;
    }
  } catch (err) {
    // ignore fetch errors during development
  }
}

loadRealtime();
setInterval(loadRealtime, 30000);
