type AnalyticsProvider = 'plausible' | 'ga4';

interface AnalyticsOptions {
  provider?: AnalyticsProvider;
  domain?: string;
  debug?: boolean;
}

declare global {
  interface Window {
    plausible?: ((eventName: string, options?: { props?: Record<string, unknown> }) => void) & { q?: any[] };
    gtag?: (...args: any[]) => void;
    dataLayer?: Array<Record<string, any>>;
    __analyticsAdapterLoaded?: boolean;
  }
}

export default function getAnalyticsAdapter(options: AnalyticsOptions = {}): string | null {
  const envProvider = (import.meta.env.PUBLIC_ANALYTICS_PROVIDER ?? '').toLowerCase() as AnalyticsProvider | '';
  const provider = (options.provider ?? envProvider) as AnalyticsProvider | '';
  if (!provider) return null;

  const domain = options.domain ?? (import.meta.env.PUBLIC_PLAUSIBLE_DOMAIN ?? '');
  const scriptUrl = import.meta.env.PUBLIC_PLAUSIBLE_SCRIPT ?? 'https://plausible.io/js/script.js';
  const debugEnabled = options.debug ?? (typeof import.meta.env.DEV === 'boolean' ? import.meta.env.DEV : false);

  const scriptBody = `(() => {
    if (window.__analyticsAdapterLoaded) return;
    window.__analyticsAdapterLoaded = true;
    const provider = ${JSON.stringify(provider)};
    const debug = ${JSON.stringify(debugEnabled)};
    const domain = ${JSON.stringify(domain)};
    const scriptUrl = ${JSON.stringify(scriptUrl)};
    const log = (...args) => { if (debug) console.debug('[analytics]', ...args); };
    const forward = (name, props) => {
      if (!name) return;
      if (provider === 'plausible') {
        const send = window.plausible || ((eventName, opts) => log('queue', eventName, opts));
        send(name, props && Object.keys(props).length ? { props } : undefined);
      } else if (provider === 'ga4') {
        if (typeof window.gtag === 'function') {
          window.gtag('event', name, props || {});
        } else {
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({ event: name, ...(props || {}) });
          log('buffered', name, props);
        }
      }
    };
    if (provider === 'plausible' && !window.plausible) {
      window.plausible = function() {
        (window.plausible.q = window.plausible.q || []).push(arguments);
      };
      const script = document.createElement('script');
      script.defer = true;
      script.src = scriptUrl;
      if (domain) script.setAttribute('data-domain', domain);
      document.head.appendChild(script);
      log('plausible loader attached', { scriptUrl, domain });
    }
    window.addEventListener('analytics', (event) => {
      const detail = event.detail || {};
      const { event: name, ...props } = detail;
      log('event', name, props);
      forward(name, props);
    });
    window.dispatchEvent(new CustomEvent('analytics:ready', { detail: { provider } }));
    log('adapter ready', provider);
  })();`;

  return scriptBody;
}
