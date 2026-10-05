import { lazy, Suspense, useEffect, useRef, useState } from "react";

const DirectionGoogleMaps = lazy(() => import("./DirectionGoogleMaps"));

/** Keep the illustrated animated map, but don't mount its large SVG until it is near the screen. */
export default function DeferredDirectionGoogleMaps() {
  const host = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    if (!("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setShouldLoad(true);
      observer.disconnect();
    }, { rootMargin: "900px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={host} className="deferred-direction-map" aria-busy={!shouldLoad}>
      {shouldLoad ? (
        <Suspense fallback={<div className="deferred-direction-map-placeholder" aria-hidden="true" />}>
          <DirectionGoogleMaps />
        </Suspense>
      ) : (
        <div className="deferred-direction-map-placeholder" aria-hidden="true" />
      )}
    </div>
  );
}
