import React from 'react';

export const BRAND_LIST = [
  {
    id: 'ultratech',
    name: 'UltraTech Cement',
    tagline: "The Engineer's Choice",
    category: 'Cement',
    color: '#ffcc00',
  },
  {
    id: 'ambuja',
    name: 'Ambuja Cement',
    tagline: 'Giant Compressive Strength',
    category: 'Cement',
    color: '#0b2d64',
  },
  {
    id: 'jk-cement',
    name: 'JK Cement',
    tagline: 'Build Safe & Strong',
    category: 'Cement',
    color: '#5c2d91',
  },
  {
    id: 'shree-cement',
    name: 'Shree Cement',
    tagline: 'Master Concrete Solution',
    category: 'Cement',
    color: '#d32f2f',
  },
  {
    id: 'astral',
    name: 'Astral Pipes',
    tagline: 'CPVC Pro & Lead Free',
    category: 'Pipes',
    color: '#0054a6',
  },
  {
    id: 'supreme',
    name: 'Supreme Industries',
    tagline: 'People who know plastics best',
    category: 'Pipes',
    color: '#e31e24',
  },
  {
    id: 'finolex-pipes',
    name: 'Finolex Pipes',
    tagline: 'Pipes & Fittings',
    category: 'Pipes',
    color: '#1a3b68',
  },
  {
    id: 'zoloto',
    name: 'Zoloto Valves',
    tagline: 'Forged Brass & Bronze Valves',
    category: 'Pipes',
    color: '#00843d',
  },
  {
    id: 'polycab',
    name: 'Polycab Wires',
    tagline: 'Wires & Cables',
    category: 'Wires',
    color: '#e21b22',
  },
  {
    id: 'havells',
    name: 'Havells India',
    tagline: 'Wires That Never Catch Fire',
    category: 'Wires',
    color: '#e31b23',
  },
  {
    id: 'finolex-cables',
    name: 'Finolex Cables Limited',
    tagline: 'Cables Limited',
    category: 'Wires',
    color: '#00508f',
  },
  {
    id: 'asian-paints',
    name: 'Asian Paints',
    tagline: 'Har Ghar Kuch Kehta Hai',
    category: 'Paints',
    color: '#e21e25',
  },
  {
    id: 'birla-opus',
    name: 'Birla Opus Paints',
    tagline: 'Rich Colours, Superior Finish',
    category: 'Paints',
    color: '#e65100',
  },
  {
    id: 'jaquar',
    name: 'Jaquar Bath + Light',
    tagline: 'Bath + Light',
    category: 'Sanitary',
    color: '#006570',
  },
  {
    id: 'cera',
    name: 'CERA Sanitaryware',
    tagline: 'Sanitaryware | Faucets | Tiles',
    category: 'Sanitary',
    color: '#00a0e3',
  },
  {
    id: 'tata-tiscon',
    name: 'Tata Tiscon',
    tagline: 'Desh Ka Saria',
    category: 'Steel',
    color: '#005696',
  },
  {
    id: 'myk-laticrete',
    name: 'MYK Laticrete',
    tagline: 'World Leader in Tile Adhesives',
    category: 'Adhesives',
    color: '#00529b',
  },
];

/**
 * Universal Brand Lookup helper to find brand by ID, name, or substring
 */
export function getBrandMeta(brandNameOrId?: string) {
  if (!brandNameOrId) return null;
  const q = String(brandNameOrId).toLowerCase().trim();
  
  if (q.includes('ultratech')) return BRAND_LIST.find((b) => b.id === 'ultratech');
  if (q.includes('ambuja')) return BRAND_LIST.find((b) => b.id === 'ambuja');
  if (q.includes('jk') || q.includes('jkcement')) return BRAND_LIST.find((b) => b.id === 'jk-cement');
  if (q.includes('shree')) return BRAND_LIST.find((b) => b.id === 'shree-cement');
  if (q.includes('astral')) return BRAND_LIST.find((b) => b.id === 'astral');
  if (q.includes('supreme')) return BRAND_LIST.find((b) => b.id === 'supreme');
  if (q.includes('finolex') && q.includes('pipe')) return BRAND_LIST.find((b) => b.id === 'finolex-pipes');
  if (q.includes('finolex') && (q.includes('cable') || q.includes('wire'))) return BRAND_LIST.find((b) => b.id === 'finolex-cables');
  if (q.includes('finolex')) return BRAND_LIST.find((b) => b.id === 'finolex-pipes');
  if (q.includes('zoloto')) return BRAND_LIST.find((b) => b.id === 'zoloto');
  if (q.includes('polycab')) return BRAND_LIST.find((b) => b.id === 'polycab');
  if (q.includes('havells')) return BRAND_LIST.find((b) => b.id === 'havells');
  if (q.includes('tata') || q.includes('tiscon')) return BRAND_LIST.find((b) => b.id === 'tata-tiscon');
  if (q.includes('asian') || q.includes('apex')) return BRAND_LIST.find((b) => b.id === 'asian-paints');
  if (q.includes('birla') || q.includes('opus')) return BRAND_LIST.find((b) => b.id === 'birla-opus');
  if (q.includes('jaquar')) return BRAND_LIST.find((b) => b.id === 'jaquar');
  if (q.includes('cera')) return BRAND_LIST.find((b) => b.id === 'cera');
  if (q.includes('laticrete') || q.includes('myk')) return BRAND_LIST.find((b) => b.id === 'myk-laticrete');

  return BRAND_LIST.find((b) => b.id === q || b.name.toLowerCase() === q) || null;
}

/**
 * Authentic vector brand logos based directly on Material Square brand creatives
 */
export function BrandLogo({ id, className = '', style = {} }: { id?: string; className?: string; style?: React.CSSProperties }) {
  // If a full name or unrecognized id was passed, resolve via getBrandMeta
  const resolvedId = getBrandMeta(id)?.id || id;
  const isMini = className.includes('mini');

  switch (resolvedId) {
    case 'ultratech':
      if (isMini) {
        return (
          <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="UltraTech Icon">
            <rect x="2" y="2" width="28" height="28" rx="4" fill="#FFCC00" />
            <text x="16" y="23" fontFamily="system-ui, -apple-system, sans-serif" fontSize="21" fontWeight="900" fontStyle="italic" fill="#000000" textAnchor="middle">U</text>
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 160 50" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="UltraTech Cement Logo">
          {/* Yellow banner background */}
          <rect x="2" y="3" width="156" height="44" rx="3" fill="#FFCC00" />
          {/* UltraTech bold italic black text */}
          <text x="80" y="23" fontFamily="system-ui, -apple-system, sans-serif" fontSize="19" fontWeight="900" fontStyle="italic" fill="#000000" textAnchor="middle" letterSpacing="-0.5">UltraTech</text>
          {/* Black CEMENT stencil pill */}
          <rect x="22" y="27" width="116" height="9" rx="1.5" fill="#000000" />
          <text x="80" y="34.5" fontFamily="system-ui, -apple-system, sans-serif" fontSize="7.5" fontWeight="900" fill="#FFCC00" textAnchor="middle" letterSpacing="5">CEMENT</text>
          {/* Tagline */}
          <text x="80" y="44" fontFamily="system-ui, -apple-system, sans-serif" fontSize="6.5" fontStyle="italic" fontWeight="700" fill="#000000" textAnchor="middle">The Engineer's Choice</text>
        </svg>
      );

    case 'ambuja':
      if (isMini) {
        return (
          <img
            src="/images/brands/ambuja_giant_emblem.png"
            alt="Ambuja Cement Icon"
            className={className}
            style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block', ...style }}
          />
        );
      }
      return (
        <img
          src="/images/brands/ambuja_horizontal_official.png"
          alt="Ambuja Cement Official Logo"
          className={className}
          style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block', ...style }}
        />
      );

    case 'jk-cement':
      if (isMini) {
        return (
          <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="JK Cement Icon">
            <circle cx="16" cy="16" r="14" fill="#ffffff" />
            <path d="M5 16 A11 11 0 0 1 16 5 L16 16 Z" fill="#2E7D32" />
            <path d="M16 16 L16 5 A11 11 0 0 1 27 12 L16 16 Z" fill="#66BB6A" />
            <path d="M5 16 A11 11 0 0 0 16 27 L16 16 Z" fill="#4A148C" />
            <path d="M16 16 L16 27 A11 11 0 0 0 27 16 L16 16 Z" fill="#7B1FA2" />
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 150 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="JK Cement Logo">
          {/* Pie emblem: green and purple halves */}
          <path d="M18 22 A11 11 0 0 1 29 11 L29 22 Z" fill="#2E7D32" />
          <path d="M29 22 L29 11 A11 11 0 0 1 38 18 L29 22 Z" fill="#66BB6A" />
          <path d="M18 22 A11 11 0 0 0 29 33 L29 22 Z" fill="#4A148C" />
          <path d="M29 22 L29 33 A11 11 0 0 0 40 22 L29 22 Z" fill="#7B1FA2" />
          <text x="46" y="29" fontFamily="system-ui, -apple-system, sans-serif" fontSize="20" fontWeight="900" fill="#1A1A1A" letterSpacing="-0.5">JKCement</text>
        </svg>
      );

    case 'shree-cement':
      if (isMini) {
        return (
          <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Shree Cement Icon">
            <rect x="2" y="2" width="28" height="28" rx="4" fill="#D32F2F" />
            <text x="16" y="22" fontFamily="Georgia, serif" fontSize="19" fontStyle="italic" fontWeight="900" fill="#FFFFFF" textAnchor="middle">sh</text>
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 150 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Shree Cement Logo">
          {/* Red stylized 'sh' lettermark badge */}
          <rect x="12" y="8" width="28" height="28" rx="4" fill="#D32F2F" />
          <text x="26" y="28" fontFamily="Georgia, serif" fontSize="17" fontStyle="italic" fontWeight="900" fill="#FFFFFF" textAnchor="middle">sh</text>
          {/* Text */}
          <text x="46" y="22" fontFamily="system-ui, -apple-system, sans-serif" fontSize="16" fontWeight="900" fill="#1A1A1A" letterSpacing="-0.3">Shree</text>
          <text x="46" y="36" fontFamily="system-ui, -apple-system, sans-serif" fontSize="13" fontWeight="700" fill="#D32F2F" letterSpacing="0.2">Cement</text>
        </svg>
      );

    case 'astral':
      if (isMini) {
        return (
          <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Astral Icon">
            <polygon points="16,3 29,27 3,27" stroke="#D9531E" strokeWidth="3.2" strokeLinejoin="round" fill="none" />
            <polygon points="16,10 24,24 8,24" stroke="#E67E22" strokeWidth="2" strokeLinejoin="round" fill="#FDF2E9" />
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 160 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Astral Pipes Logo">
          {/* Double outlined orange/gold isometric triangle */}
          <polygon points="24,6 40,36 8,36" stroke="#D9531E" strokeWidth="4" strokeLinejoin="round" fill="none" />
          <polygon points="24,14 34,32 14,32" stroke="#E67E22" strokeWidth="2.5" strokeLinejoin="round" fill="#FDF2E9" />
          <text x="48" y="24" fontFamily="system-ui, -apple-system, sans-serif" fontSize="19" fontWeight="900" fill="#0054A6" letterSpacing="0.5">ASTRAL</text>
          <text x="49" y="40" fontFamily="system-ui, -apple-system, sans-serif" fontSize="14" fontWeight="800" fill="#0054A6" letterSpacing="3">PIPES</text>
        </svg>
      );

    case 'supreme':
      if (isMini) {
        return (
          <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Supreme Icon">
            <circle cx="16" cy="16" r="14" fill="#E31E24" />
            <text x="16" y="22" fontFamily="'Brush Script MT', 'Segoe Script', cursive, sans-serif" fontSize="20" fontStyle="italic" fontWeight="900" fill="#FFFFFF" textAnchor="middle">S</text>
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 160 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Supreme Industries Logo">
          <text x="80" y="27" fontFamily="'Brush Script MT', 'Segoe Script', cursive, sans-serif" fontSize="28" fontStyle="italic" fontWeight="900" fill="#E31E24" textAnchor="middle">Supreme</text>
          <text x="80" y="41" fontFamily="system-ui, -apple-system, sans-serif" fontSize="7" fontStyle="italic" fontWeight="600" fill="#E31E24" textAnchor="middle">People who know plastics best</text>
        </svg>
      );

    case 'finolex-pipes':
      if (isMini) {
        return (
          <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Finolex Pipes Icon">
            <rect x="2" y="2" width="28" height="28" rx="4" fill="#FFD100" />
            <text x="16" y="23" fontFamily="system-ui, -apple-system, sans-serif" fontSize="20" fontWeight="900" fill="#003875" textAnchor="middle">F</text>
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 150 46" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Finolex Pipes & Fittings Logo">
          {/* Authentic vibrant yellow box from brand creative */}
          <rect x="5" y="4" width="140" height="38" rx="2" fill="#FFD100" />
          <text
            x="75"
            y="22"
            fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
            fontSize="18"
            fontWeight="900"
            fill="#003875"
            textAnchor="middle"
            letterSpacing="0.6"
          >
            FINOLEX
          </text>
          <text
            x="75"
            y="35"
            fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
            fontSize="8.5"
            fontWeight="800"
            fill="#003875"
            textAnchor="middle"
            letterSpacing="1"
          >
            PIPES & FITTINGS
          </text>
        </svg>
      );

    case 'zoloto':
      if (isMini) {
        return (
          <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Zoloto Valves Icon">
            <rect x="2" y="2" width="28" height="28" rx="4" fill="#00843D" />
            <path d="M7 8 H25 L10 24 H28" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 150 46" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Zoloto Valves Logo">
          {/* Green hexagon gear badge */}
          <rect x="8" y="9" width="28" height="28" rx="4" fill="#00843D" />
          <path d="M15 15 H29 L17 31 H31" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <text x="42" y="24" fontFamily="system-ui, -apple-system, sans-serif" fontSize="17" fontWeight="900" fill="#1A1A1A" letterSpacing="0.8">ZOLOTO</text>
          <text x="43" y="37" fontFamily="system-ui, -apple-system, sans-serif" fontSize="10.5" fontWeight="800" fill="#00843D" letterSpacing="2">VALVES</text>
        </svg>
      );

    case 'polycab':
      if (isMini) {
        return (
          <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Polycab Icon">
            <circle cx="16" cy="16" r="14" fill="#E21B22" />
            <text x="16" y="22" fontFamily="system-ui, -apple-system, sans-serif" fontSize="19" fontWeight="900" fill="#FFFFFF" textAnchor="middle">P</text>
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 160 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Polycab Wires Logo">
          <text x="80" y="26" fontFamily="system-ui, -apple-system, sans-serif" fontSize="20" fontWeight="900" fill="#E21B22" textAnchor="middle" letterSpacing="1">POLYCAB</text>
          {/* Red curved connection arc over O */}
          <path d="M47 8 Q56 4 65 8" stroke="#E21B22" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <text x="80" y="39" fontFamily="system-ui, -apple-system, sans-serif" fontSize="7.5" fontWeight="700" fill="#1A1A1A" textAnchor="middle" letterSpacing="2.5">WIRES & CABLES</text>
        </svg>
      );

    case 'havells':
      if (isMini) {
        return (
          <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Havells Icon">
            <rect x="2" y="2" width="28" height="28" rx="4" fill="#E31B23" />
            <text x="16" y="22" fontFamily="system-ui, -apple-system, sans-serif" fontSize="19" fontWeight="900" fill="#FFFFFF" textAnchor="middle">H</text>
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 150 46" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Havells Logo">
          {/* Dual red arc emblem */}
          <path d="M12 14 C12 8, 22 8, 22 14 C22 20, 12 24, 12 32 C12 38, 22 38, 22 32" stroke="#E31B23" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <path d="M28 14 C28 8, 18 8, 18 14 C18 20, 28 24, 28 32 C28 38, 18 38, 18 32" stroke="#E31B23" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <text x="36" y="29" fontFamily="system-ui, -apple-system, sans-serif" fontSize="20" fontWeight="900" fill="#E31B23" letterSpacing="0.5">HAVELLS</text>
        </svg>
      );

    case 'finolex-cables':
      if (isMini) {
        return (
          <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Finolex Cables Icon">
            <rect x="2" y="2" width="28" height="28" rx="4" fill="#0072CE" />
            <text x="16" y="23" fontFamily="system-ui, -apple-system, sans-serif" fontSize="20" fontWeight="900" fill="#FFFFFF" textAnchor="middle">F</text>
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 150 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Finolex Cables Limited Logo">
          <text
            x="75"
            y="23"
            fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
            fontSize="24"
            fontWeight="800"
            fill="#0072CE"
            textAnchor="middle"
            letterSpacing="-0.3"
          >
            Finolex
          </text>
          {/* Authentic blue divider line */}
          <line x1="24" y1="28" x2="126" y2="28" stroke="#0072CE" strokeWidth="2" strokeLinecap="round" />
          <text
            x="75"
            y="41"
            fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
            fontSize="11"
            fontWeight="700"
            fill="#0072CE"
            textAnchor="middle"
            letterSpacing="0.4"
          >
            Cables Limited
          </text>
        </svg>
      );

    case 'asian-paints':
      if (isMini) {
        return (
          <svg viewBox="0 0 34 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Asian Paints Icon">
            <circle cx="11" cy="14" r="6.5" stroke="#F15A24" strokeWidth="3.5" fill="none" />
            <path d="M14.5 14 V26" stroke="#F15A24" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="23" cy="18" r="6.5" stroke="#9E1F63" strokeWidth="3.5" fill="none" />
            <path d="M19.5 10 V26" stroke="#9E1F63" strokeWidth="3.5" strokeLinecap="round" />
          </svg>
        );
      }
      return (
        <img
          src="/images/brands/asian_paints_official_transparent.png"
          alt="Asian Paints Official Logo"
          className={className}
          style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block', ...style }}
        />
      );

    case 'birla-opus':
      if (isMini) {
        return (
          <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Birla Opus Icon">
            <circle cx="10" cy="10" r="5" fill="#00A651" />
            <circle cx="22" cy="10" r="5" fill="#2E3192" />
            <circle cx="10" cy="22" r="5" fill="#F7941D" />
            <circle cx="22" cy="22" r="5" fill="#ED1C24" />
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 160 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Birla Opus Paints Logo">
          {/* Mosaic geometric dots (green, blue, orange, red) */}
          <circle cx="120" cy="14" r="5" fill="#00A651" />
          <circle cx="132" cy="16" r="4.5" fill="#2E3192" />
          <circle cx="118" cy="26" r="4" fill="#F7941D" />
          <circle cx="130" cy="27" r="5" fill="#ED1C24" />
          {/* Text */}
          <text x="12" y="18" fontFamily="system-ui, -apple-system, sans-serif" fontSize="11" fontWeight="900" fill="#1A1A1A" letterSpacing="1">BIRLA</text>
          <text x="12" y="37" fontFamily="system-ui, -apple-system, sans-serif" fontSize="21" fontWeight="900" fill="#1A1A1A" letterSpacing="-0.5">opus</text>
          <text x="66" y="37" fontFamily="system-ui, -apple-system, sans-serif" fontSize="10" fontWeight="800" fill="#E65100" letterSpacing="1">PAINTS</text>
        </svg>
      );

    case 'jaquar':
      if (isMini) {
        return (
          <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Jaquar Icon">
            <rect x="2" y="2" width="28" height="28" rx="4" fill="#006570" />
            <text x="16" y="23" fontFamily="Georgia, serif" fontSize="20" fontStyle="italic" fontWeight="900" fill="#FFFFFF" textAnchor="middle">J</text>
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 150 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Jaquar Logo">
          <text x="75" y="26" fontFamily="Georgia, serif" fontSize="25" fontStyle="italic" fontWeight="900" fill="#006570" textAnchor="middle" letterSpacing="-0.5">Jaquar</text>
          <text x="75" y="40" fontFamily="system-ui, -apple-system, sans-serif" fontSize="8" fontWeight="800" fill="#006570" textAnchor="middle" letterSpacing="2.5">BATH + LIGHT</text>
        </svg>
      );

    case 'cera':
      if (isMini) {
        return (
          <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="CERA Icon">
            <rect x="2" y="2" width="28" height="28" rx="4" fill="#0099DA" />
            <text x="16" y="23" fontFamily="system-ui, -apple-system, sans-serif" fontSize="19" fontWeight="900" fill="#FFFFFF" textAnchor="middle">C</text>
          </svg>
        );
      }
      return (
        <img
          src="/images/brands/cera_official_transparent.png"
          alt="CERA Sanitaryware Official Logo"
          className={className}
          style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block', ...style }}
        />
      );

    case 'tata-tiscon':
      if (isMini) {
        return (
          <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Tata Tiscon Icon">
            <rect x="2" y="2" width="28" height="28" rx="4" fill="#005696" />
            <text x="16" y="23" fontFamily="system-ui, -apple-system, sans-serif" fontSize="19" fontWeight="900" fill="#FFFFFF" textAnchor="middle">T</text>
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 160 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Tata Tiscon Logo">
          {/* Blue backdrop with TATA emblem */}
          <rect x="4" y="6" width="152" height="36" rx="3" fill="#005696" />
          <text x="80" y="23" fontFamily="system-ui, -apple-system, sans-serif" fontSize="16" fontWeight="900" fill="#FFFFFF" textAnchor="middle" letterSpacing="2.5">TATA TISCON</text>
          <text x="80" y="35" fontFamily="system-ui, -apple-system, sans-serif" fontSize="8" fontWeight="700" fill="#FFCC00" textAnchor="middle" letterSpacing="1">550D SUPER DUCTILE</text>
        </svg>
      );

    case 'myk-laticrete':
      if (isMini) {
        return (
          <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="MYK Laticrete Icon">
            <rect x="2" y="2" width="28" height="28" rx="3" fill="#00529B" />
            <rect x="6" y="6" width="20" height="20" rx="1.5" fill="#002B5C" stroke="#FFFFFF" strokeWidth="1" />
            <line x1="6" y1="12.6" x2="26" y2="12.6" stroke="#FFFFFF" strokeWidth="0.8" />
            <line x1="6" y1="19.3" x2="26" y2="19.3" stroke="#FFFFFF" strokeWidth="0.8" />
            <line x1="12.6" y1="6" x2="12.6" y2="26" stroke="#FFFFFF" strokeWidth="0.8" />
            <line x1="19.3" y1="6" x2="19.3" y2="26" stroke="#FFFFFF" strokeWidth="0.8" />
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 180 46" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="MYK Laticrete Logo">
          {/* Blue badge */}
          <rect x="4" y="8" width="172" height="30" rx="3" fill="#00529B" />
          {/* Grid icon */}
          <rect x="10" y="13" width="18" height="20" rx="1.5" fill="#002B5C" stroke="#FFFFFF" strokeWidth="1" />
          <line x1="10" y1="19.7" x2="28" y2="19.7" stroke="#FFFFFF" strokeWidth="0.8" />
          <line x1="10" y1="26.3" x2="28" y2="26.3" stroke="#FFFFFF" strokeWidth="0.8" />
          <line x1="16" y1="13" x2="16" y2="33" stroke="#FFFFFF" strokeWidth="0.8" />
          <line x1="22" y1="13" x2="22" y2="33" stroke="#FFFFFF" strokeWidth="0.8" />
          {/* Centered text with ample breathing room to prevent cropping */}
          <text
            x="103"
            y="27.5"
            fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
            fontSize="12"
            fontWeight="900"
            fill="#FFFFFF"
            textAnchor="middle"
            letterSpacing="0.6"
          >
            MYK LATICRETE
          </text>
        </svg>
      );

    default:
      return null;
  }
}
