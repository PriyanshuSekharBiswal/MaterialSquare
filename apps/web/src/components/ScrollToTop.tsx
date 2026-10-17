import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { cancelInitialScrollRestore, isInitialReloadForCurrentLocation } from '../scroll-position';

export default function ScrollToTop() {
  const { pathname, search, key } = useLocation();
  const navigationType = useNavigationType();
  const previousLocation = useRef({ pathname, search, key });

  useLayoutEffect(() => {
    const previous = previousLocation.current;
    previousLocation.current = { pathname, search, key };
    const pathnameChanged = previous.pathname !== pathname;
    const historyEntryChanged = previous.key !== key;
    if (!historyEntryChanged && !pathnameChanged) return;
    if (navigationType === 'POP') return;
    // Query-only updates often represent an in-page choice (such as a product
    // variant). Keep the customer's current viewport for those changes.
    if (!pathnameChanged) return;
    if (isInitialReloadForCurrentLocation()) return;
    cancelInitialScrollRestore();
    if (pathname === '/material-list' && new URLSearchParams(search).has('item')) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, search, key, navigationType]);

  return null;
}
