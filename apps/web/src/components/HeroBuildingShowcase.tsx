import React from 'react';
import HeroBuildingCanvas from './HeroBuildingCanvas';

/**
 * HeroBuildingShowcase
 * Pure 3D isometric building simulation with no border boxes, no cards, and no text.
 */
export default function HeroBuildingShowcase() {
  return (
    <div className="hero-3d-building-wrap">
      <HeroBuildingCanvas centered={true} />
    </div>
  );
}
