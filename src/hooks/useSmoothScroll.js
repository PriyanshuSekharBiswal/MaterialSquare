import { useEffect } from 'react';
import LocomotiveScroll from 'locomotive-scroll';
import 'locomotive-scroll/dist/locomotive-scroll.css';

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

    const locomotiveScroll = new LocomotiveScroll({
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

    return () => {
      locomotiveScroll.destroy();
      delete window.__locomotiveScroll;
      delete window.__lenis;
    };
  }, []);
}
