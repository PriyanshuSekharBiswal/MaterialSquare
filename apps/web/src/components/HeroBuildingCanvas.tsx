import React, { useRef, useEffect } from 'react';

/**
 * HeroBuildingCanvas
 * Fully responsive 3D Isometric Building Construction simulation.
 * Recreates the clean minimal wireframe architecture from https://cmemp.vercel.app/
 * Adapts fluidly across Desktop, Laptop, Tablet, and Mobile with touch & mouse tracking.
 */
export default function HeroBuildingCanvas({ className = '', centered = false }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number | null = null;
    let canvasIsVisible = true;
    let lastFrameAt = 0;
    const startTime = performance.now();
    let targetTiltX = 0;
    let targetTiltY = 0;
    let currentTiltX = 0;
    let currentTiltY = 0;

    const getFocalCenter = (w: number, h: number, rect: DOMRect) => {
      if (centered) {
        return {
          x: w * 0.5,
          y: Math.min(h * 0.82, h - 35),
        };
      }
      const textCol = document.querySelector('.hero-text-col');
      if (textCol && rect) {
        const textRect = textCol.getBoundingClientRect();
        // Position the 3D building comfortably to the right so the entire ground grid clears the search bar and buttons
        const targetX = (textRect.right - rect.left) + 330;
        return {
          x: Math.max(w * 0.58, Math.min(targetX, w - 160)),
          y: h * 0.70,
        };
      }
      return {
        x: w * 0.62,
        y: h * 0.70,
      };
    };

    const handlePointerMove = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      const focal = getFocalCenter(w, h, rect);

      const mouseX = clientX - rect.left;
      const mouseY = clientY - rect.top;

      targetTiltX = ((mouseX - focal.x) / (w * 0.5)) * 12;
      targetTiltY = ((mouseY - focal.y) / (h * 0.5)) * 8;
    };

    const handleMouseMove = (e: MouseEvent) => {
      handlePointerMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handlePointerLeave = () => {
      targetTiltX = 0;
      targetTiltY = 0;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handlePointerLeave);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handlePointerLeave);

    const drawPoly = (p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }, p4: { x: number; y: number }, fillStyle: string | CanvasGradient | null, strokeStyle: string | null, lineWidth = 0.85) => {
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.closePath();
      if (fillStyle) {
        ctx.fillStyle = fillStyle;
        ctx.fill();
      }
      if (strokeStyle) {
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = strokeStyle;
        ctx.stroke();
      }
    };

    const render = (timestamp: number) => {
      animId = null;
      if (!canvasIsVisible || document.visibilityState === 'hidden') return;
      // The drawing is decorative; 30fps keeps its animation smooth while
      // substantially reducing CPU and battery use on high-refresh displays.
      if (timestamp - lastFrameAt < 1000 / 30) {
        scheduleFrame();
        return;
      }
      lastFrameAt = timestamp;
      // 14-second loop cycle matching cmemp.vercel.app
      const cycle = ((timestamp - startTime) / 1000) % 14;
      let buildProgress = 0;
      let globalAlpha = 1;

      if (cycle < 7.5) {
        const m = cycle / 7.5;
        buildProgress = m < 0.5 ? 2 * m * m : 1 - Math.pow(-2 * m + 2, 2) / 2;
      } else if (cycle < 12) {
        buildProgress = 1;
      } else {
        const m = (cycle - 12) / 2;
        buildProgress = 1;
        globalAlpha = 1 - Math.sin(m * Math.PI * 0.5);
      }

      currentTiltX += (targetTiltX - currentTiltX) * 0.05;
      currentTiltY += (targetTiltY - currentTiltY) * 0.05;

      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      if (w <= 0 || h <= 0) {
        scheduleFrame();
        return;
      }

      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = Math.max(0, Math.min(1, globalAlpha));

      const isWideHero = !centered && window.innerWidth >= 992;
      const isTablet = window.innerWidth < 992 && window.innerWidth >= 768;

      const focal = getFocalCenter(w, h, rect);
      const centerX = focal.x;
      const centerY = focal.y;

      // Fully responsive scale tuned to match cmemp.vercel.app exactly
      let scale;
      if (isWideHero) {
        scale = 1.0;
      } else if (isTablet) {
        scale = 0.88;
      } else {
        // Mobile / centered: fluid scale between 0.70 and 0.82 based on width
        scale = Math.min(0.82, Math.max(0.70, w / 450));
      }
      const zAspect = 0.58;

      const project = (x: number, y: number, z: number) => {
        const isoX = (x - y) * Math.cos(Math.PI / 6) * scale;
        const isoY = (x + y) * Math.sin(Math.PI / 6) * zAspect * scale;
        return {
          x: centerX + isoX + currentTiltX * 0.6,
          y: centerY + isoY - z * scale + currentTiltY * 0.45,
        };
      };

      // 1. Ground Construction Grid (Framed cleanly around building foundation)
      const gridExtent = 165 * scale;
      const gridStep = 18 * scale;
      const gridFade = Math.min(1, buildProgress * 4);

      ctx.save();
      ctx.lineWidth = 0.65;
      ctx.strokeStyle = `rgba(148, 163, 184, ${0.18 * gridFade})`;
      ctx.beginPath();
      for (let x = -gridExtent; x <= gridExtent; x += gridStep) {
        const p1 = project(x, -gridExtent, 0);
        const p2 = project(x, gridExtent, 0);
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
      }
      for (let y = -gridExtent; y <= gridExtent; y += gridStep) {
        const p1 = project(-gridExtent, y, 0);
        const p2 = project(gridExtent, y, 0);
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
      }
      ctx.stroke();

      // Main Crosshair Origin Axes
      ctx.lineWidth = 0.9;
      ctx.strokeStyle = `rgba(249, 115, 22, ${0.45 * gridFade})`;
      ctx.beginPath();
      const ax1 = project(-gridExtent, 0, 0);
      const ax2 = project(gridExtent, 0, 0);
      ctx.moveTo(ax1.x, ax1.y);
      ctx.lineTo(ax2.x, ax2.y);
      ctx.stroke();

      ctx.strokeStyle = `rgba(226, 232, 240, ${0.25 * gridFade})`;
      ctx.beginPath();
      const ay1 = project(0, -gridExtent, 0);
      const ay2 = project(0, gridExtent, 0);
      ctx.moveTo(ay1.x, ay1.y);
      ctx.lineTo(ay2.x, ay2.y);
      ctx.stroke();
      ctx.restore();

      // 2. Base Foundation Slab
      const baseFade = Math.min(1, buildProgress * 5);
      const b1 = project(-115, -45, 0);
      const b2 = project(105, -45, 0);
      const b3 = project(105, 55, 0);
      const b4 = project(-115, 55, 0);
      drawPoly(
        b1,
        b2,
        b3,
        b4,
        `rgba(30, 41, 59, ${0.35 * baseFade})`,
        `rgba(148, 163, 184, ${0.45 * baseFade})`,
        0.85
      );

      const maxBuildHeight = buildProgress * 240;

      // 3. Render Building Volume (cmemp.vercel.app 1:1 clean wireframe algorithm)
      const renderBlock = (x: number, y: number, baseZ: number, width: number, depth: number, totalHeight: number, numFloors: number, colsX = 4, colsY = 4, hasRooftop = false) => {
        if (maxBuildHeight <= baseZ) return;
        const currentTopZ = Math.min(baseZ + totalHeight, maxBuildHeight);
        if (currentTopZ - baseZ <= 0) return;

        const floorH = totalHeight / numFloors;
        const solidCutoff = Math.max(baseZ, currentTopZ - (buildProgress >= 1 ? 0 : 22));

        for (let floor = 0; floor < numFloors; floor++) {
          const floorBottom = baseZ + floor * floorH;
          const floorTop = baseZ + (floor + 1) * floorH;
          if (floorBottom >= currentTopZ) break;

          const activeFloorTop = Math.min(floorTop, currentTopZ);
          const isFloorComplete = activeFloorTop >= floorTop - 0.5;
          const isSolid = floorTop <= solidCutoff || buildProgress >= 1;

          const pA = project(x, y, floorBottom);
          const pB = project(x + width, y, floorBottom);
          const pC = project(x, y + depth, floorBottom);
          const pA_top = project(x, y, activeFloorTop);
          const pB_top = project(x + width, y, activeFloorTop);
          const pC_top = project(x + width, y + depth, activeFloorTop);
          const pD_top = project(x, y + depth, activeFloorTop);

          if (isSolid) {
            // Left shaded face - Clean, refined, translucent architectural shade
            const leftGrad = ctx.createLinearGradient(pA.x, pA.y, pD_top.x, pD_top.y);
            leftGrad.addColorStop(0, 'rgba(30, 45, 68, 0.45)');
            leftGrad.addColorStop(1, 'rgba(18, 28, 44, 0.55)');
            drawPoly(pA, pC, pD_top, pA_top, leftGrad, 'rgba(203, 213, 225, 0.55)', 0.85);

            // Right lit face - Clean, pure, luminous architectural glass
            const rightGrad = ctx.createLinearGradient(pA.x, pA.y, pB_top.x, pB_top.y);
            rightGrad.addColorStop(0, 'rgba(224, 238, 252, 0.65)');
            rightGrad.addColorStop(1, 'rgba(245, 250, 255, 0.82)');
            drawPoly(pA, pB, pB_top, pA_top, rightGrad, 'rgba(255, 255, 255, 0.75)', 0.85);

            // Vertical mullions / columns (fine hairline lines)
            for (let c = 1; c < colsY; c++) {
              const r = c / colsY;
              const m1 = project(x, y + depth * r, floorBottom);
              const m2 = project(x, y + depth * r, activeFloorTop);
              ctx.beginPath();
              ctx.moveTo(m1.x, m1.y);
              ctx.lineTo(m2.x, m2.y);
              ctx.strokeStyle = 'rgba(203, 213, 225, 0.35)';
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
            for (let c = 1; c < colsX; c++) {
              const r = c / colsX;
              const m1 = project(x + width * r, y, floorBottom);
              const m2 = project(x + width * r, y, activeFloorTop);
              ctx.beginPath();
              ctx.moveTo(m1.x, m1.y);
              ctx.lineTo(m2.x, m2.y);
              ctx.strokeStyle = 'rgba(226, 232, 240, 0.38)';
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }

            // Subtle window reflection dot on alternating floors
            if (floor % 2 === 0) {
              const winRef = project(x + width * 0.45, y, floorBottom + floorH * 0.4);
              ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
              ctx.fillRect(winRef.x - 3, winRef.y - 2, 6, 3);
            }
          } else {
            // Skeleton rebar & formwork under active construction
            drawPoly(pA, pC, pD_top, pA_top, 'rgba(249, 115, 22, 0.08)', 'rgba(249, 115, 22, 0.75)', 1.0);
            drawPoly(pA, pB, pB_top, pA_top, 'rgba(255, 255, 255, 0.15)', 'rgba(249, 115, 22, 0.8)', 1.0);

            for (let c = 1; c < colsX; c++) {
              const r = c / colsX;
              const m1 = project(x + width * r, y, floorBottom);
              const m2 = project(x + width * r, y, activeFloorTop);
              ctx.beginPath();
              ctx.moveTo(m1.x, m1.y);
              ctx.lineTo(m2.x, m2.y);
              ctx.strokeStyle = 'rgba(249, 115, 22, 0.65)';
              ctx.lineWidth = 0.75;
              ctx.stroke();
            }
            for (let c = 1; c < colsY; c++) {
              const r = c / colsY;
              const m1 = project(x, y + depth * r, floorBottom);
              const m2 = project(x, y + depth * r, activeFloorTop);
              ctx.beginPath();
              ctx.moveTo(m1.x, m1.y);
              ctx.lineTo(m2.x, m2.y);
              ctx.strokeStyle = 'rgba(249, 115, 22, 0.6)';
              ctx.lineWidth = 0.75;
              ctx.stroke();
            }

            // Diagonal rebar bracing
            ctx.strokeStyle = 'rgba(249, 115, 22, 0.4)';
            ctx.lineWidth = 0.65;
            ctx.beginPath();
            ctx.moveTo(pA.x, pA.y);
            ctx.lineTo(pB_top.x, pB_top.y);
            ctx.moveTo(pB.x, pB.y);
            ctx.lineTo(pA_top.x, pA_top.y);
            ctx.stroke();
          }

          // Floor slab top
          if (isFloorComplete) {
            drawPoly(
              pA_top,
              pB_top,
              pC_top,
              pD_top,
              isSolid ? 'rgba(248, 250, 252, 0.45)' : 'rgba(240, 243, 248, 0.35)',
              'rgba(255, 255, 255, 0.6)',
              0.85
            );
            ctx.beginPath();
            ctx.moveTo(pA_top.x, pA_top.y);
            ctx.lineTo(pD_top.x, pD_top.y);
            ctx.moveTo(pA_top.x, pA_top.y);
            ctx.lineTo(pB_top.x, pB_top.y);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
            ctx.lineWidth = 1.0;
            ctx.stroke();
          }
        }

        // Active construction edge guide & rebar vertex nodes
        if (buildProgress < 1 && currentTopZ < baseZ + totalHeight && currentTopZ > baseZ + 4) {
          const cornerA = project(x, y, currentTopZ);
          const cornerB = project(x + width, y, currentTopZ);
          const cornerC = project(x, y + depth, currentTopZ);
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cornerC.x, cornerC.y);
          ctx.lineTo(cornerA.x, cornerA.y);
          ctx.lineTo(cornerB.x, cornerB.y);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(cornerA.x, cornerA.y, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = '#f97316';
          ctx.fill();
        }

        // Roof slab and rooftop mechanical penthouse + antenna mast
        if (currentTopZ >= baseZ + totalHeight - 0.5) {
          const roofZ = baseZ + totalHeight;
          const r1 = project(x, y, roofZ);
          const r2 = project(x + width, y, roofZ);
          const r3 = project(x + width, y + depth, roofZ);
          const r4 = project(x, y + depth, roofZ);
          drawPoly(r1, r2, r3, r4, 'rgba(255, 255, 255, 0.85)', 'rgba(255, 255, 255, 0.75)', 1.0);

          if (hasRooftop) {
            const rw = width * 0.46;
            const rd = depth * 0.46;
            const rh = 15;
            const rx = x + (width - rw) * 0.5;
            const ry = y + (depth - rd) * 0.5;

            const tA = project(rx, ry, roofZ);
            const tB = project(rx + rw, ry, roofZ);
            const tC = project(rx, ry + rd, roofZ);
            const tA_top = project(rx, ry, roofZ + rh);
            const tB_top = project(rx + rw, ry, roofZ + rh);
            const tC_top = project(rx + rw, ry + rd, roofZ + rh);
            const tD_top = project(rx, ry + rd, roofZ + rh);

            drawPoly(tA, tC, tD_top, tA_top, 'rgba(30, 45, 68, 0.4)', 'rgba(203, 213, 225, 0.55)', 0.85);
            drawPoly(tA, tB, tB_top, tA_top, 'rgba(240, 245, 252, 0.75)', 'rgba(255, 255, 255, 0.65)', 0.85);
            drawPoly(tA_top, tB_top, tC_top, tD_top, 'rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.8)', 1.0);

            // Antenna mast with beacon light
            const mastBase = project(rx + rw * 0.5, ry + rd * 0.5, roofZ + rh);
            const mastTip = project(rx + rw * 0.5, ry + rd * 0.5, roofZ + rh + 28);
            ctx.beginPath();
            ctx.moveTo(mastBase.x, mastBase.y);
            ctx.lineTo(mastTip.x, mastTip.y);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.lineWidth = 1.3;
            ctx.stroke();

            // Beacon node
            ctx.beginPath();
            ctx.arc(mastTip.x, mastTip.y, 2.2, 0, Math.PI * 2);
            ctx.fillStyle = '#f97316';
            ctx.fill();
          }
        }
      };

      // Architectural cluster layout matching cmemp.vercel.app exactly:
      renderBlock(-105, -40, 0, 205, 90, 24, 2, 7, 5, false);
      renderBlock(-90, -10, 24, 60, 56, 118, 11, 4, 4, true);
      renderBlock(-18, -35, 24, 76, 76, 110, 11, 5, 5, false);
      if (maxBuildHeight > 134) renderBlock(-10, -27, 134, 60, 60, 50, 5, 4, 4, false);
      if (maxBuildHeight > 184) renderBlock(-2, -19, 184, 44, 44, 42, 4, 3, 3, true);
      renderBlock(48, -5, 24, 52, 52, 132, 12, 4, 4, true);

      ctx.globalAlpha = 1;
      scheduleFrame();
    };

    const scheduleFrame = () => {
      if (animId === null && canvasIsVisible && document.visibilityState !== 'hidden') {
        animId = requestAnimationFrame(render);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && animId !== null) {
        cancelAnimationFrame(animId);
        animId = null;
      } else {
        scheduleFrame();
      }
    };

    const visibilityObserver = 'IntersectionObserver' in window
      ? new IntersectionObserver(([entry]) => {
          canvasIsVisible = entry.isIntersecting;
          if (!canvasIsVisible && animId !== null) {
            cancelAnimationFrame(animId);
            animId = null;
          } else {
            scheduleFrame();
          }
        }, { rootMargin: '100px' })
      : null;
    visibilityObserver?.observe(canvas);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      ctx.resetTransform();
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    scheduleFrame();

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      visibilityObserver?.disconnect();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handlePointerLeave);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handlePointerLeave);
      if (animId !== null) cancelAnimationFrame(animId);
    };
  }, [centered]);

  return <canvas ref={canvasRef} className={`hero-3d-building-canvas ${className}`} aria-hidden="true" />;
}
