import { useEffect } from 'react';

/**
 * Locomotive Scroll v5 setup
 * Combines Locomotive's scroll detection & parallax with instantaneous, buttery smooth momentum
 */
export default function useSmoothScroll() {
  useEffect(() => {
    // Respect prefers-reduced-motion
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let cancelled = false;
    let locomotiveScroll: import('locomotive-scroll').default | undefined;
    let idleHandle: number | undefined;
    let fallbackHandle: ReturnType<typeof setTimeout> | undefined;

    const startSmoothScroll = async () => {
      const [{ default: LocomotiveScroll }] = await Promise.all([
        import('locomotive-scroll'),
        import('locomotive-scroll/dist/locomotive-scroll.css'),
      ]);
      if (cancelled) return;

      locomotiveScroll = new LocomotiveScroll({
        lenisOptions: {
          wrapper: window,
          content: document.documentElement,
          lerp: 0.095, // Snappy & ultra-responsive momentum without sluggish delay
          duration: 0.85,
          smoothWheel: true,
          wheelMultiplier: 1.15,
          touchMultiplier: 1.8,
          infinite: false,
        },
      });

      window.__locomotiveScroll = locomotiveScroll;
      window.__lenis = locomotiveScroll.lenisInstance;
    };

    // Let the first screen render and respond before loading the optional
    // smooth-scrolling enhancement. Native scrolling works during this time.
    if ('requestIdleCallback' in window) {
      idleHandle = window.requestIdleCallback(() => void startSmoothScroll(), { timeout: 1200 });
    } else {
      fallbackHandle = setTimeout(() => void startSmoothScroll(), 250);
    }

    return () => {
      cancelled = true;
      if (idleHandle !== undefined && 'cancelIdleCallback' in window)
        window.cancelIdleCallback(idleHandle);
      if (fallbackHandle !== undefined) clearTimeout(fallbackHandle);
      locomotiveScroll?.destroy();
      delete window.__locomotiveScroll;
      delete window.__lenis;
    };
  }, []);
}
