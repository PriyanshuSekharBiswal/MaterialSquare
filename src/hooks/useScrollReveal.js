import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Universal scroll reveal hook inspired by materialsquare.in
 * Uses IntersectionObserver to trigger luxurious upward fade & kinetic text reveals
 * with Apple/Quintic easing: cubic-bezier(0.22, 1, 0.36, 1)
 */
export default function useScrollReveal() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Small timeout to allow DOM to mount after route transition
    const timer = setTimeout(() => {
      const targets = document.querySelectorAll(
        '.reveal-text, .reveal-title, .reveal-stagger, .reveal-card, .ms-mask-line, [data-reveal]'
      );

      if (!targets.length) return;

      if (!('IntersectionObserver' in window)) {
        // Fallback for older browsers
        targets.forEach((el) => el.classList.add('is-revealed'));
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-revealed');
              observer.unobserve(entry.target);
            }
          });
        },
        {
          root: null,
          rootMargin: '0px 0px -60px 0px',
          threshold: 0.08,
        }
      );

      targets.forEach((el) => {
        // If element is already high in the viewport (e.g. hero), reveal immediately
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.85) {
          el.classList.add('is-revealed');
        } else {
          observer.observe(el);
        }
      });

      return () => {
        targets.forEach((el) => observer.unobserve(el));
      };
    }, 40);

    return () => clearTimeout(timer);
  }, [pathname]);
}
