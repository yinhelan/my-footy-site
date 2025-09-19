const KEY = 'ob-v1';
const box = document.getElementById('ob');
const btn = document.getElementById('ob-close');

if (box instanceof HTMLElement && !localStorage.getItem(KEY)) {
  box.style.display = 'block';
}

if (btn instanceof HTMLButtonElement) {
  btn.addEventListener('click', () => {
    localStorage.setItem(KEY, '1');
    if (box instanceof HTMLElement) box.remove();
  });
}
