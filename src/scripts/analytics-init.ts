// 从脚本 URL 查询参数读配置
const url = new URL(import.meta.url);
const GAID = url.searchParams.get('gaid') || '';
const DEFAULT = (url.searchParams.get('default') || 'denied') as 'granted'|'denied';

if (GAID) {
  const DNT = navigator.doNotTrack === '1' || (window as any).doNotTrack === '1';
  const KEY = 'consent.analytics';
  let saved: string | null = null;
  try { saved = localStorage.getItem(KEY); } catch {}
  const consent = DNT ? 'denied' : (saved || DEFAULT);

  (window as any).dataLayer = (window as any).dataLayer || [];
  function gtag(){ (window as any).dataLayer.push(arguments as any); }
  (window as any).gtag = gtag;

  gtag('consent','default',{ ad_storage: consent, analytics_storage: consent });
  gtag('js', new Date());

  function loadGA(){
    if (document.querySelector('script[src*="gtag/js?id="]')) return;
    const s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GAID;
    document.head.appendChild(s);
    gtag('config', GAID, { anonymize_ip: true });
  }
  if (consent !== 'denied') loadGA();

  (window as any).__setAnalyticsConsent = function(v: 'granted'|'denied'){
    try { localStorage.setItem(KEY, v); } catch {}
    gtag('consent','update',{ ad_storage: v, analytics_storage: v });
    if (v !== 'denied') loadGA();
  };
}
