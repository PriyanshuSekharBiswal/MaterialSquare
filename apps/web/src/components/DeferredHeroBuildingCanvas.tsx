import { lazy, Suspense, useEffect, useState } from "react";
import type { RefObject } from "react";

const HeroBuildingCanvas = lazy(() => import("./HeroBuildingCanvas"));

/** Load the hero canvas as soon as the home hero mounts. */
export default function DeferredHeroBuildingCanvas({
  centered = false,
  focalAnchorRef,
}: {
  centered?: boolean;
  focalAnchorRef?: RefObject<HTMLElement | null>;
}) {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    setShouldLoad(true);
  }, []);

  if (!shouldLoad) return null;

  return (
    <Suspense fallback={null}>
      <HeroBuildingCanvas centered={centered} focalAnchorRef={focalAnchorRef} />
    </Suspense>
  );
}
