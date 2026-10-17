import { useEffect } from 'react';
import { initGA, trackPageView, trackEvent } from '../utils/analytics.ts';

export function useAnalytics(currentScreen?: string) {
  useEffect(() => {
    initGA();
  }, []);

  useEffect(() => {
    if (currentScreen) {
      trackPageView(`/${currentScreen}`, `Screen: ${currentScreen}`);
    }
  }, [currentScreen]);

  return {
    trackEvent,
    trackPageView,
  };
}
