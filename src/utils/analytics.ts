/**
 * Google Analytics (GA4) Client Service
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const GA_MEASUREMENT_ID =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GA_MEASUREMENT_ID) ||
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
  '';

export function initGA(): void {
  if (typeof window === 'undefined') return;
  if (!GA_MEASUREMENT_ID) return;

  // Dynamically load gtag script if not already present
  if (!document.getElementById('ga-gtag-script')) {
    const script = document.createElement('script');
    script.id = 'ga-gtag-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    window.gtag?.('config', GA_MEASUREMENT_ID, {
      send_page_view: false,
    });
  }
}

export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean | undefined>
): void {
  if (typeof window === 'undefined') return;
  if (window.gtag) {
    window.gtag('event', eventName, params);
  }
}

export function trackPageView(pagePath: string, pageTitle?: string): void {
  trackEvent('page_view', {
    page_path: pagePath,
    page_title: pageTitle,
  });
}
