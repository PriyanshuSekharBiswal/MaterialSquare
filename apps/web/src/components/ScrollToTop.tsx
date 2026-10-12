import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { cancelInitialScrollRestore, isInitialReloadForCurrentLocation } from '../scroll-position';

export default function ScrollToTop() {
  const { pathname, search } = useLocation();
  const previousLocation = useRef({ pathname, search });

  useLayoutEffect(() => {
    const previous = previousLocation.current;
    previousLocation.current = { pathname, search };
    if (isInitialReloadForCurrentLocation()) return;
    cancelInitialScrollRestore();
    const focusMarkerWasConsumed = pathname === '/material-list'
      && previous.pathname === pathname
      && new URLSearchParams(previous.search).has('item')
      && !new URLSearchParams(search).has('item');
    if (focusMarkerWasConsumed) return;
    if (pathname === '/material-list' && new URLSearchParams(search).has('item')) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, search]);

  return null;
}
