import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    try {
      if (typeof window.__locomotiveScroll?.scrollTo === 'function') {
        window.__locomotiveScroll.scrollTo(0, { immediate: true });
      } else if (typeof window.__lenis?.scrollTo === 'function') {
        window.__lenis.scrollTo(0, { immediate: true });
      } else {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'instant',
        });
      }
    } catch {
      window.scrollTo(0, 0);
    }
  }, [pathname, search]);

  return null;
}
