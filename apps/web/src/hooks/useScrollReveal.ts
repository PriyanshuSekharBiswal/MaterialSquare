import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Universal scroll reveal hook inspired by materialsquare.in
 * Supports route changes, dynamic tab switching, and Locomotive Scroll / Lenis.
 * Uses high-performance IntersectionObserver + rAF throttled scroll fallback.
 */
export default function useScrollReveal() {
  const { pathname, search } = useLocation();
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    let observer: IntersectionObserver | undefined;
    let isCancelled = false;

    const checkAndReveal = () => {
      if (isCancelled) return;
      const targets = document.querySelectorAll(
        '.reveal-text, .reveal-title, .reveal-stagger, .reveal-card, .ms-mask-line, [data-reveal]'
      );

      if (!targets.length) return;

      const vh = window.innerHeight || document.documentElement.clientHeight;

      targets.forEach((el) => {
        if (el.classList.contains('is-revealed')) return;

        const rect = el.getBoundingClientRect();
        // If element is in viewport or above it (user already scrolled past)
        if (rect.top <= vh * 0.92 && rect.bottom >= 0) {
          el.classList.add('is-revealed');
        } else if (observer) {
          observer.observe(el);
        }
      });
    };

    const throttledCheck = () => {
      if (rafIdRef.current) return;
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        checkAndReveal();
      });
    };

    // Initialize IntersectionObserver with a gentle margin
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-revealed');
              observer?.unobserve(entry.target);
            }
          });
        },
        {
          root: null,
          rootMargin: '0px 0px -10px 0px',
          threshold: 0.01,
        }
      );
    }

    // Run immediately, and also after staggered delays for route transitions and tab changes
    checkAndReveal();
    const t1 = setTimeout(checkAndReveal, 60);
    const t2 = setTimeout(checkAndReveal, 180);
    const t3 = setTimeout(checkAndReveal, 400);

    // Listen to window scroll (Lenis & native scrolls trigger window scroll)
    window.addEventListener('scroll', throttledCheck, { passive: true });

    // Safely listen to Lenis scroll if available
    let lenisUnsub: (() => void) | null = null;
    if (window.__lenis && typeof window.__lenis.on === 'function') {
      lenisUnsub = window.__lenis.on('scroll', throttledCheck);
    }

    // Watch for dynamic DOM changes (e.g. tabs or filter changes)
    let mutationTimer: ReturnType<typeof setTimeout> | null = null;
    const mutationObserver = new MutationObserver(() => {
      if (mutationTimer) clearTimeout(mutationTimer);
      mutationTimer = setTimeout(checkAndReveal, 80);
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      isCancelled = true;
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (mutationTimer) clearTimeout(mutationTimer);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      window.removeEventListener('scroll', throttledCheck);
      if (typeof lenisUnsub === 'function') {
        lenisUnsub();
      } else if (window.__lenis && typeof window.__lenis.off === 'function') {
        window.__lenis.off('scroll', throttledCheck);
      }
      if (observer) {
        observer.disconnect();
      }
      mutationObserver.disconnect();
    };
  }, [pathname, search]);
}
