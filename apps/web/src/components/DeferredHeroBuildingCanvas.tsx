import { lazy, Suspense, useEffect, useState } from "react";

const HeroBuildingCanvas = lazy(() => import("./HeroBuildingCanvas"));

/** Let the hero copy and search become interactive before starting the decorative canvas. */
export default function DeferredHeroBuildingCanvas({ centered = false }: { centered?: boolean }) {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    let timeoutId: number | undefined;
    let idleId: number | undefined;
    const load = () => setShouldLoad(true);
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (idleWindow.requestIdleCallback) {
      idleId = idleWindow.requestIdleCallback(load, { timeout: 1200 });
    } else {
      timeoutId = window.setTimeout(load, 500);
    }

    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      if (idleId !== undefined) idleWindow.cancelIdleCallback?.(idleId);
    };
  }, []);

  if (!shouldLoad) return null;

  return (
    <Suspense fallback={null}>
      <HeroBuildingCanvas centered={centered} />
    </Suspense>
  );
}
