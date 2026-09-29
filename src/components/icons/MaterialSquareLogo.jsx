import React from 'react';

export default function MaterialSquareLogo({ size = 42, showText = true, lightMode = false }) {
  const primaryColor = lightMode ? '#ffffff' : '#0f172a';
  const brickColor = '#ea580c';
  const frameColor = lightMode ? '#475569' : '#94a3b8';
  const subtextColor = lightMode ? '#94a3b8' : '#64748b';

  return (
    <div className="ms-logo-wrapper" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        {/* Rebar lines */}
        <line x1="38" y1="8" x2="38" y2="38" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="38" y1="13" x2="41" y2="16" stroke={primaryColor} strokeWidth="1.5" />
        <line x1="38" y1="21" x2="41" y2="24" stroke={primaryColor} strokeWidth="1.5" />
        <line x1="38" y1="29" x2="41" y2="32" stroke={primaryColor} strokeWidth="1.5" />

        <line x1="43" y1="4" x2="43" y2="36" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="43" y1="10" x2="46" y2="13" stroke={primaryColor} strokeWidth="1.5" />
        <line x1="43" y1="18" x2="46" y2="21" stroke={primaryColor} strokeWidth="1.5" />
        <line x1="43" y1="26" x2="46" y2="29" stroke={primaryColor} strokeWidth="1.5" />

        <line x1="48" y1="7" x2="48" y2="38" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="48" y1="14" x2="51" y2="17" stroke={primaryColor} strokeWidth="1.5" />
        <line x1="48" y1="22" x2="51" y2="25" stroke={primaryColor} strokeWidth="1.5" />

        {/* Concrete Lintel Frame */}
        <path
          d="M 50 16 L 85 16 L 85 58 L 73 58 L 73 28 L 50 28 Z"
          fill={frameColor}
        />

        {/* Bold 3D Architectonic Letter 'M' */}
        <path
          d="M 20 84 L 20 26 L 34 26 L 48 54 L 62 26 L 76 26 L 76 56 L 64 56 L 64 42 L 53 64 L 43 64 L 32 42 L 32 84 Z"
          fill={primaryColor}
        />

        {/* 3 Red Bricks */}
        <rect x="68" y="58" width="16" height="7.5" rx="0.5" fill={brickColor} stroke="#ffffff" strokeWidth="1" />
        <rect x="62" y="66" width="13" height="7.5" rx="0.5" fill={brickColor} stroke="#ffffff" strokeWidth="1" />
        <rect x="76" y="66" width="13" height="7.5" rx="0.5" fill={brickColor} stroke="#ffffff" strokeWidth="1" />
      </svg>

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '1.2rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: primaryColor,
            }}
          >
            MATERIAL
          </span>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              margin: '3px 0 2px 0',
            }}
          >
            <span style={{ height: '1.5px', width: '10px', backgroundColor: brickColor }}></span>
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: '0.68rem',
                fontWeight: 800,
                letterSpacing: '0.2em',
                color: brickColor,
              }}
            >
              SQUARE
            </span>
            <span style={{ height: '1.5px', width: '10px', backgroundColor: brickColor }}></span>
          </div>

          <span
            style={{
              fontSize: '0.52rem',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: subtextColor,
            }}
          >
            BUILDING BETTER TOGETHER
          </span>
        </div>
      )}
    </div>
  );
}
