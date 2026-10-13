import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { cancelInitialScrollRestore, isInitialReloadForCurrentLocation } from '../scroll-position';

export default function ScrollToTop() {
  const { pathname, search } = useLocation();
  const previousLocation = useRef({ pathname, search });

  useLayoutEffect(() => {
    const previous = previousLocation.current;
    previousLocation.current = { pathname, search };
    const pathnameChanged = previous.pathname !== pathname;
    // Query-only updates often represent an in-page choice (such as a product
    // variant). Keep the customer's current viewport for those changes.
    if (!pathnameChanged) return;
    if (isInitialReloadForCurrentLocation()) return;
    cancelInitialScrollRestore();
    if (pathname === '/material-list' && new URLSearchParams(search).has('item')) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, search]);

  return null;
}
