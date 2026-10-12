type ScrollPosition = { left: number; top: number };

const storagePrefix = "material-square-admin-scroll:";
let initialReloadPosition: { key: string; position: ScrollPosition } | null = null;
let restoringInitialPosition = false;
let cancelPendingRestore: (() => void) | null = null;

function locationKey() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function isInitialReloadForCurrentLocation() {
  return Boolean(initialReloadPosition && initialReloadPosition.key === locationKey());
}

function readPosition(key: string): ScrollPosition | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(`${storagePrefix}${key}`) || "null");
    if (Number.isFinite(value?.top) && Number.isFinite(value?.left)) {
      return { top: Math.max(0, value.top), left: Math.max(0, value.left) };
    }
  } catch {
    // Scroll restoration is a convenience; an unavailable session store is safe.
  }
  return null;
}

function savePosition(key = locationKey(), position = { left: window.scrollX, top: window.scrollY }) {
  try {
    sessionStorage.setItem(`${storagePrefix}${key}`, JSON.stringify(position));
  } catch {
    // Keep the workspace usable when storage is unavailable or full.
  }
}

/** Install before React renders so refresh restoration waits for the full workspace layout. */
export function installScrollPositionPersistence() {
  if (typeof window === "undefined") return;
  window.history.scrollRestoration = "manual";
  document.documentElement.dataset.msScrollReady = "false";
  const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  initialReloadPosition = navigation?.type === "reload"
    ? { key: locationKey(), position: readPosition(locationKey()) || { left: 0, top: 0 } }
    : null;
  restoringInitialPosition = Boolean(initialReloadPosition);
  if (initialReloadPosition) {
    const root = document.getElementById("root");
    if (root) root.style.minHeight = `${initialReloadPosition.position.top + window.innerHeight}px`;
    window.scrollTo({ ...initialReloadPosition.position, behavior: "instant" });
  }

  let saveFrame = 0;
  const saveCurrentPosition = () => {
    if (restoringInitialPosition) return;
    if (saveFrame) cancelAnimationFrame(saveFrame);
    saveFrame = requestAnimationFrame(() => {
      saveFrame = 0;
      savePosition();
    });
  };
  const flushPosition = () => {
    if (!restoringInitialPosition) savePosition();
  };
  const userMoved = () => {
    if (!restoringInitialPosition) return;
    cancelPendingRestore?.();
    restoringInitialPosition = false;
    initialReloadPosition = null;
  };
  window.addEventListener("scroll", saveCurrentPosition, { passive: true });
  window.addEventListener("pagehide", flushPosition);
  window.addEventListener("wheel", userMoved, { passive: true, once: true });
  window.addEventListener("touchstart", userMoved, { passive: true, once: true });
  window.addEventListener("keydown", userMoved, { once: true });
}

export function restoreInitialScrollPosition(): (() => void) | null {
  const pending = initialReloadPosition;
  if (!pending || pending.key !== locationKey()) return null;

  let cancelled = false;
  let completed = false;
  let frame = 0;
  const startedAt = Date.now();
  let interval = 0;
  let lastHeight = -1;
  let heightStableSince = startedAt;
  let mutations: MutationObserver;
  let observer: ResizeObserver;
  const cleanup = () => {
    cancelled = true;
    observer.disconnect();
    mutations.disconnect();
    window.clearInterval(interval);
    if (frame) window.cancelAnimationFrame(frame);
    if (cancelPendingRestore === cleanup) cancelPendingRestore = null;
  };
  const finish = (position: ScrollPosition) => {
    if (cancelled || completed) return;
    completed = true;
    window.scrollTo({ left: position.left, top: position.top, behavior: "instant" });
    restoringInitialPosition = false;
    initialReloadPosition = null;
    savePosition(pending.key, position);
    cleanup();
    window.dispatchEvent(new Event("ms-scroll-restored"));
  };
  const attempt = () => {
    if (cancelled || completed) return;
    const pageHeight = document.documentElement.scrollHeight;
    if (pageHeight !== lastHeight) {
      lastHeight = pageHeight;
      heightStableSince = Date.now();
    }
    const maxTop = Math.max(0, pageHeight - window.innerHeight);
    const appReady = document.documentElement.dataset.msScrollReady !== "false";
    const layoutSettled = Date.now() - heightStableSince >= 350;
    if ((appReady && layoutSettled) || Date.now() - startedAt >= 10000) {
      finish({
        left: Math.min(pending.position.left, Math.max(0, document.documentElement.scrollWidth - window.innerWidth)),
        top: Math.min(pending.position.top, maxTop),
      });
    }
  };
  observer = new ResizeObserver(() => {
    if (!frame) frame = window.requestAnimationFrame(() => {
      frame = 0;
      attempt();
    });
  });
  mutations = new MutationObserver(() => {
    if (!frame) frame = window.requestAnimationFrame(() => {
      frame = 0;
      attempt();
    });
  });
  observer.observe(document.documentElement);
  mutations.observe(document.body, { childList: true, subtree: true });
  interval = window.setInterval(attempt, 150);
  frame = window.requestAnimationFrame(() => {
    frame = 0;
    attempt();
  });
  cancelPendingRestore?.();
  cancelPendingRestore = cleanup;
  return cleanup;
}
