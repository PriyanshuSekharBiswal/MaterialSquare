import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  ExternalLink,
  Compass,
  Plus,
  Minus,
  Phone,
  X,
  Layers,
} from 'lucide-react';
import WhatsAppIcon from './icons/WhatsAppIcon';
import { useSiteContent } from '../site-content';
import './DirectionGoogleMaps.css';

// The NCR illustration keeps its delivery hub aligned with the Ghaziabad map label.
export const OFFICE_HUB = {
  directionsUrl: (destination: string, origin = '') =>
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}${origin ? `&origin=${encodeURIComponent(origin)}` : ''}`,
  svgPos: { x: 760, y: 155 }, // Exactly at Ghaziabad on clean map
};

// Six route animations on the Delhi NCR illustration.
export const ROAD_ROUTES = [
  {
    id: 'delhi',
    name: 'Delhi',
    routeLabel: 'Delhi-Meerut Expressway (NH 9)',
    // Exactly at the 'Delhi' center label on the map
    pathD: 'M 760 155 Q 620 160 480 220',
    routePathId: 'road-office-to-delhi',
    startPos: { x: 480, y: 220 },
    speed: '7s',
  },
  {
    id: 'noida',
    name: 'Noida',
    routeLabel: 'Noida Expressway → NH 9 Corridor',
    // Exactly at the 'Noida' label east of Yamuna River
    pathD: 'M 760 155 Q 710 210 670 275',
    routePathId: 'road-office-to-noida',
    startPos: { x: 670, y: 275 },
    speed: '6.5s',
  },
  {
    id: 'greater-noida',
    name: 'Greater Noida',
    routeLabel: 'Greater Noida Link Rd → Hindon Bypass',
    // Exactly at the 'Greater Noida' label in southeast
    pathD: 'M 760 155 Q 770 235 785 330',
    routePathId: 'road-office-to-gr-noida',
    startPos: { x: 785, y: 330 },
    speed: '8s',
  },
  {
    id: 'gurugram',
    name: 'Gurugram',
    routeLabel: 'NH 48 → DND Flyway → Link Road',
    // Exactly at the 'Gurugram' label in southwest
    pathD: 'M 760 155 Q 470 290 268 440',
    routePathId: 'road-office-to-gurugram',
    startPos: { x: 268, y: 440 },
    speed: '10s',
  },
  {
    id: 'ghaziabad-local',
    name: 'Ghaziabad',
    routeLabel: 'Ghaziabad urban corridors',
    // Right at the 'Ghaziabad' label in northeast
    pathD: 'M 760 155 Q 800 145 830 165',
    routePathId: 'road-office-to-ghaziabad',
    startPos: { x: 830, y: 165 },
    speed: '4.5s',
  },
  {
    id: 'faridabad',
    name: 'Faridabad',
    routeLabel: 'Mathura Road → FNG Expressway Corridor',
    // Exactly at the 'Faridabad' label south of Delhi
    pathD: 'M 760 155 Q 670 340 595 520',
    routePathId: 'road-office-to-faridabad',
    startPos: { x: 595, y: 520 },
    speed: '9s',
  },
];

export default function DirectionGoogleMaps({ className = '' }) {
  const siteContent = useSiteContent();
  const [activeRoute, setActiveRoute] = useState<(typeof ROAD_ROUTES)[number] | null>(null);
  const [isOfficeModalOpen, setIsOfficeModalOpen] = useState(false);
  const [mapTheme, setMapTheme] = useState<'clean' | 'dark' | 'satellite'>('clean'); // 'clean' | 'dark' | 'satellite'
  const officeAddress = siteContent['contact.officeAddress'].trim();
  const serviceArea = siteContent['contact.location'].trim();
  const officeDestination = officeAddress;
  const officeName = siteContent['contact.officeName'].trim() || 'Material Square';
  const officePhone = siteContent['contact.phone'].trim();
  const officePhoneDisplay = siteContent['contact.phoneDisplay'].trim() || officePhone;

  // Open Google Maps only after the client has configured a destination.
  const handleOpenGoogleMaps = (cityName = '') => {
    if (!officeDestination) return;
    window.open(OFFICE_HUB.directionsUrl(officeDestination, cityName), '_blank', 'noopener,noreferrer');
  };

  return (
    <section className={`direction-google-maps-section ${className}`} id="transportation-map">
      <div className="container">
        {/* Section Header */}
        <div className="dmap-header">
          <div className="dmap-badge reveal-text">
            <span className="google-pin-icon">📍</span>
            <span>Illustrated service area</span>
          </div>
          <h2 className="dmap-title">
            <span className="ms-mask-line">
              <span className="ms-mask-text">Explore our</span>
            </span>{' '}
            <span className="ms-mask-line">
              <span className="ms-mask-text text-red delay-1">service network</span>
            </span>{' '}
            <span className="ms-mask-line">
              <span className="ms-mask-text delay-2">& delivery routes</span>
            </span>
          </h2>
          <p className="dmap-subtitle reveal-text">
            {siteContent['contact.coverageDescription']}
            {serviceArea && <> <strong>{serviceArea}</strong></>}
          </p>
        </div>

        {/* Clean, Full-Width Google Maps Window */}
        <div className="google-maps-card reveal-card">
          {/* Top Google Maps Search Bar Header */}
          <div className="gmaps-chrome-header">
            {/* Google Logo */}
            <div className="gmaps-brand-logo">
              <span className="g-blue">G</span>
              <span className="g-red">o</span>
              <span className="g-yellow">o</span>
              <span className="g-blue">g</span>
              <span className="g-green">l</span>
              <span className="g-red">e</span>
              <span className="gmaps-subtext">Maps</span>
            </div>

            {/* Google Maps Search Bar */}
            <div
              className="gmaps-search-box"
              onClick={officeDestination ? () => handleOpenGoogleMaps() : undefined}
              title="Click to open Google Maps Directions"
              role={officeDestination ? 'button' : undefined}
              aria-disabled={!officeDestination}
            >
              <MapPin size={16} color="#ea4335" style={{ flexShrink: 0 }} />
              <div className="search-input-mock">
                <span className="search-query">
                  <strong>{officeName}</strong>{officeAddress && <> · {officeAddress}</>}
                </span>
              </div>
            </div>

            {/* Direct Open Button */}
            <button
              type="button"
              className="btn-gmaps-launch"
              onClick={() => handleOpenGoogleMaps()}
              title="Open directions in Google Maps App / Website"
              disabled={!officeDestination}
            >
              <Navigation size={15} />
              <span>Get Directions</span>
              <ExternalLink size={13} />
            </button>
          </div>

          {/* Google Maps Interactive Region Route Chips */}
          <div className="gmaps-quick-regions-bar">
            <span className="regions-bar-title">Service area routes:</span>
            <button
              type="button"
              className={`region-chip-btn ${!activeRoute ? 'active' : ''}`}
              onClick={() => setActiveRoute(null)}
            >
              <span className="region-chip-dot all-hubs"></span>
              All 6 Regions
            </button>
            {ROAD_ROUTES.map((route) => {
              const isSelected = activeRoute?.id === route.id;
              return (
                <button
                  key={route.id}
                  type="button"
                  className={`region-chip-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => setActiveRoute(isSelected ? null : route)}
                >
                  <span className="region-chip-dot"></span>
                  {route.name}
                </button>
              );
            })}
          </div>

          {/* Full Interactive Google Maps Canvas */}
          <div className="gmaps-viewport">
            <svg
              className="gmaps-vector-svg"
              viewBox="0 0 1000 620"
              preserveAspectRatio="xMidYMid meet"
                aria-label={officeAddress ? `Illustrated delivery routes around ${officeName}` : 'Illustrated delivery service area map'}
            >
              <defs>
                {/* Google Maps Route Drop Shadows & Glow */}
                <filter id="route-casing-shadow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.22" />
                </filter>
                <filter id="route-active-glow" x="-40%" y="-40%" width="180%" height="180%">
                  <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#38bdf8" floodOpacity="0.75" />
                </filter>
                <filter id="gmap-pin-shadow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#0f172a" floodOpacity="0.35" />
                </filter>
                <filter id="dest-pin-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#ea4335" floodOpacity="0.5" />
                </filter>

                {/* Linear Gradients for Routes */}
                <linearGradient id="routeGradNoida" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1a73e8" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
                <linearGradient id="routeGradDelhi" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>

                {/* Radial Gradient for Office Radar Sweep */}
                <radialGradient id="officeRadarGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ea4335" stopOpacity="0.45" />
                  <stop offset="60%" stopColor="#ea4335" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#ea4335" stopOpacity="0" />
                </radialGradient>

                {/* Radial Gradient for City Origins */}
                <radialGradient id="originPulseGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
                  <stop offset="70%" stopColor="#1a73e8" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#1a73e8" stopOpacity="0" />
                </radialGradient>

                {/* Pattern: Subtle Urban Grid */}
                <pattern id="urbanGridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.8" opacity="0.65" />
                </pattern>

                {/* ========================================================
                    OLA / UBER STYLE DETAILED DELIVERY TRUCK
                    Top-down / 2.5D Commercial Fleet Vehicle Icon
                    ======================================================== */}
                <g id="ola-uber-truck-vehicle">
                  {/* Vehicle Ground Shadow */}
                  <ellipse cx="0" cy="5" rx="24" ry="12" fill="rgba(15, 23, 42, 0.4)" />

                  {/* 4 Rubber Tires on Road */}
                  <rect x="-16" y="-14" width="7" height="4" rx="1.5" fill="#0f172a" />
                  <rect x="7" y="-14" width="7" height="4" rx="1.5" fill="#0f172a" />
                  <rect x="-16" y="10" width="7" height="4" rx="1.5" fill="#0f172a" />
                  <rect x="7" y="10" width="7" height="4" rx="1.5" fill="#0f172a" />

                  {/* Cargo Container Body (Material Square Brand Orange) */}
                  <rect
                    x="-20"
                    y="-11"
                    width="26"
                    height="22"
                    rx="3.5"
                    fill="#ea580c"
                    stroke="#fed7aa"
                    strokeWidth="1.2"
                  />
                  {/* Container Ribs / Top texture */}
                  <line x1="-14" y1="-10" x2="-14" y2="10" stroke="#c2410c" strokeWidth="1" />
                  <line x1="-8" y1="-10" x2="-8" y2="10" stroke="#c2410c" strokeWidth="1" />
                  <line x1="-2" y1="-10" x2="-2" y2="10" stroke="#c2410c" strokeWidth="1" />

                  {/* "MS" Brand Logo on top of cargo container */}
                  <text
                    x="-7"
                    y="3.5"
                    fill="#ffffff"
                    fontSize="8.5"
                    fontWeight="900"
                    textAnchor="middle"
                    fontFamily="sans-serif"
                    letterSpacing="0.05em"
                  >
                    MS
                  </text>

                  {/* Driver Cabin (Glossy White with Amber Trim) */}
                  <path
                    d="M 6 -9 L 15 -9 L 20 -4 L 20 4 L 15 9 L 6 9 Z"
                    fill="#ffffff"
                    stroke="#ea580c"
                    strokeWidth="1.2"
                  />

                  {/* Windshield Glass (Reflective Sky Blue) */}
                  <path
                    d="M 8 -7 L 14 -7 L 17 -3 L 17 3 L 14 7 L 8 7 Z"
                    fill="#38bdf8"
                    stroke="#0284c7"
                    strokeWidth="0.6"
                  />

                  {/* Forward Headlight Beams (Glowing Gold Road Projection like Ola/Uber) */}
                  <polygon
                    points="20,-5 48,-14 48,14 20,5"
                    fill="rgba(250, 204, 21, 0.45)"
                  />

                  {/* Amber Warning Beacon on Cabin Roof */}
                  <circle cx="10" cy="0" r="2.5" fill="#fbbf24" stroke="#d97706" strokeWidth="0.8" />
                </g>
              </defs>

              {/* 1. Dynamic Map Style Graphic Layer */}
              <image
                href={
                  mapTheme === 'clean'
                    ? '/images/delhi_ncr_clean_map.jpg'
                    : mapTheme === 'dark'
                    ? '/images/delhi_ncr_dark_map.jpg'
                    : '/images/delhi_ncr_satellite_map.jpg'
                }
                x="0"
                y="0"
                width="1000"
                height="620"
                preserveAspectRatio="xMidYMid slice"
              />

              {/* Atmospheric Overlay for Crisp Readability */}
              {mapTheme === 'dark' ? (
                <rect width="1000" height="620" fill="#020617" opacity="0.15" />
              ) : mapTheme === 'satellite' ? (
                <rect width="1000" height="620" fill="#0f172a" opacity="0.2" />
              ) : (
                <rect width="1000" height="620" fill="#ffffff" opacity="0.04" />
              )}

              {/* Subtle Tech Grid Overlay */}
              <rect width="1000" height="620" fill="url(#urbanGridPattern)" opacity={mapTheme === 'clean' ? '0.2' : '0.35'} />

              {/* ========================================================
                  6. GOOGLE MAPS NAVIGATION ROUTES
                  Google Navigation Blue (#1a73e8) with moving flow dots
                  ======================================================== */}
              <g className="gmap-active-routes">
                {ROAD_ROUTES.map((route) => {
                  const isHighlighted = activeRoute ? activeRoute.id === route.id : true;

                  return (
                    <g key={route.id} className={`route-group ${isHighlighted ? 'highlight' : 'dimmed'}`}>
                      {/* Hidden SVG Path reference for animateMotion */}
                      <path id={route.routePathId} d={route.pathD} fill="none" stroke="transparent" />

                      {/* Soft Ambient Neon Glow when Active */}
                      {isHighlighted && (
                        <path
                          d={route.pathD}
                          fill="none"
                          stroke={activeRoute ? '#38bdf8' : '#60a5fa'}
                          strokeWidth={activeRoute ? '18' : '14'}
                          strokeLinecap="round"
                          opacity={activeRoute ? '0.45' : '0.22'}
                          filter="url(#route-active-glow)"
                        />
                      )}

                      {/* Crisp White Casing / Outer Border */}
                      <path
                        d={route.pathD}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="11"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        filter="url(#route-casing-shadow)"
                      />

                      {/* Google Maps Bold Navigation Blue Route */}
                      <path
                        d={route.pathD}
                        fill="none"
                        stroke={isHighlighted && activeRoute ? '#0284c7' : '#1a73e8'}
                        strokeWidth={isHighlighted && activeRoute ? '7.5' : '6.5'}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Flowing Animated Light-Speed Dash pulses */}
                      <path
                        d={route.pathD}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="3.2"
                        strokeDasharray="8 16"
                        strokeLinecap="round"
                        className="ola-uber-flow-dots"
                      >
                        <animate
                          attributeName="stroke-dashoffset"
                          from="0"
                          to="-48"
                          dur="1s"
                          repeatCount="indefinite"
                        />
                      </path>

                      {/* Second energetic amber trail on active routes */}
                      {isHighlighted && (
                        <path
                          d={route.pathD}
                          fill="none"
                          stroke="#fed7aa"
                          strokeWidth="2.2"
                          strokeDasharray="4 24"
                          strokeLinecap="round"
                          className="route-energy-pulse"
                        >
                          <animate
                            attributeName="stroke-dashoffset"
                            from="0"
                            to="-56"
                            dur="1.4s"
                            repeatCount="indefinite"
                          />
                        </path>
                      )}

                      {/* ========================================================
                          OLA / UBER STYLE MOVING TRUCK ON ROAD
                          Cruises continuously along the route to our Office!
                          ======================================================== */}
                      <g
                        className="moving-ola-uber-truck"
                        cursor="pointer"
                        onClick={() => handleOpenGoogleMaps(route.name)}
                      >
                        <use href="#ola-uber-truck-vehicle" xlinkHref="#ola-uber-truck-vehicle" />
                        <animateMotion
                          path={route.pathD}
                          dur={route.speed}
                          repeatCount="indefinite"
                          rotate="auto"
                        />
                      </g>
                    </g>
                  );
                })}
              </g>

              {/* 7. ORIGIN LOCATION MARKERS (Noida, Greater Noida, Delhi, Gurugram, Ghaziabad, Faridabad) */}
              <g className="origin-city-markers">
                {ROAD_ROUTES.map((route) => {
                  const isHovered = activeRoute?.id === route.id;

                  return (
                    <g
                      key={route.id}
                      className={`city-marker-pin ${isHovered ? 'marker-hovered' : ''}`}
                      transform={`translate(${route.startPos.x}, ${route.startPos.y})`}
                      onClick={() => setActiveRoute((prev) => (prev?.id === route.id ? null : route))}
                      cursor="pointer"
                      role="button"
                      aria-label={`Select ${route.name} Route`}
                    >
                      {/* Invisible, solid hit-area rectangle to prevent mouseLeave/mouseEnter fluttering */}
                      <rect
                        x="-60"
                        y="-26"
                        width="120"
                        height="68"
                        fill="transparent"
                        style={{ pointerEvents: 'all' }}
                      />

                      {/* Outer Pulse (pointer-events none so it never triggers hover flips) */}
                      <circle
                        cx="0"
                        cy="0"
                        r="12"
                        fill="#1a73e8"
                        opacity="0.3"
                        style={{ pointerEvents: 'none' }}
                      >
                        <animate attributeName="r" values="8;24;32" dur="2.4s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.7;0.2;0" dur="2.4s" repeatCount="indefinite" />
                      </circle>

                      {/* Google Maps Blue Start Origin Circle */}
                      <circle
                        cx="0"
                        cy="0"
                        r="10"
                        fill="#ffffff"
                        stroke="#dadce0"
                        strokeWidth="2"
                        filter="url(#gmap-pin-shadow)"
                        style={{ pointerEvents: 'none' }}
                      />
                      <circle cx="0" cy="0" r="6" fill="#1a73e8" style={{ pointerEvents: 'none' }} />

                      {/* City Name Label Box (Google Maps Card Style) */}
                      <g transform="translate(0, 16)" style={{ pointerEvents: 'none' }}>
                        <rect
                          x="-50"
                          y="0"
                          width="100"
                          height="22"
                          rx="4"
                          fill="#ffffff"
                          stroke={isHovered ? '#1a73e8' : '#dadce0'}
                          strokeWidth={isHovered ? '2' : '1'}
                          filter="url(#gmap-pin-shadow)"
                        />
                        <text
                          x="0"
                          y="15"
                          fill={isHovered ? '#1a73e8' : '#202124'}
                          fontSize="11"
                          fontWeight="700"
                          fontFamily="sans-serif"
                          textAnchor="middle"
                        >
                          {route.name}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </g>

              {/* ========================================================
                  8. CENTRAL OFFICE DESTINATION PIN (CLASSIC GOOGLE RED PIN 📍)
                  The destination where all routes and trucks lead!
                  ======================================================== */}
              <g
                className="office-dest-pin-group"
                transform={`translate(${OFFICE_HUB.svgPos.x}, ${OFFICE_HUB.svgPos.y})`}
                onClick={officeAddress ? () => setIsOfficeModalOpen(true) : undefined}
                cursor={officeAddress ? 'pointer' : undefined}
                role={officeAddress ? 'button' : undefined}
                aria-label={officeAddress ? `${officeName} (view office details)` : undefined}
              >
                {/* Animated Concentric Radar Rings & Glowing Core */}
                <circle cx="0" cy="0" r="20" fill="url(#officeRadarGrad)">
                  <animate attributeName="r" values="16;76;105" dur="2.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0.25;0" dur="2.8s" repeatCount="indefinite" />
                </circle>
                <circle cx="0" cy="0" r="14" fill="#ea4335" opacity="0.45">
                  <animate attributeName="r" values="12;50;75" dur="2.8s" begin="0.7s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.55;0.18;0" dur="2.8s" begin="0.7s" repeatCount="indefinite" />
                </circle>
                <circle cx="0" cy="0" r="10" fill="#ea4335" opacity="0.3">
                  <animate attributeName="r" values="8;30;50" dur="2.8s" begin="1.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;0.2;0" dur="2.8s" begin="1.4s" repeatCount="indefinite" />
                </circle>

                {/* Ground Shadow under Pin */}
                <ellipse cx="0" cy="3" rx="16" ry="6" fill="rgba(15, 23, 42, 0.45)" />

                {/* Classic Google Maps Red Location Teardrop Pin 📍 with Glow */}
                <g transform="translate(0, -30)" filter="url(#dest-pin-glow)">
                  <path
                    d="M 0 -8 C -15 -8 -22 1 -22 11 C -22 22 -4 34 0 42 C 4 34 22 22 22 11 C 22 1 15 -8 0 -8 Z"
                    fill="#ea4335"
                  />
                  {/* Inner White Dot */}
                  <circle cx="0" cy="11" r="8" fill="#ffffff" />
                  <circle cx="0" cy="11" r="4.5" fill="#ea4335" />
                </g>

                {/* Prominent Google Maps Location Callout Label */}
                <g transform="translate(0, -82)" filter="url(#gmap-pin-shadow)">
                  <rect
                    x="-130"
                    y="0"
                    width="260"
                    height="44"
                    rx="8"
                    fill="#ffffff"
                    stroke="#ea4335"
                    strokeWidth="2.2"
                  />
                  {/* Downward pointer triangle */}
                  <polygon points="0,44 -8,52 8,52" fill="#ffffff" />
                  <polygon points="0,46 -8,52 8,52" fill="#ea4335" opacity="0.4" />
                  <text
                    x="0"
                    y="18"
                    fill="#0f172a"
                    fontSize="12"
                    fontWeight="800"
                    fontFamily="sans-serif"
                    textAnchor="middle"
                    letterSpacing="0.02em"
                  >
                    🏢 MATERIAL SQUARE
                  </text>
                  <text
                    x="0"
                    y="34"
                    fill="#ea4335"
                    fontSize="10"
                    fontWeight="700"
                    fontFamily="sans-serif"
                    textAnchor="middle"
                  >
                    Service network hub
                  </text>
                </g>
              </g>

              {/* Google Maps Bottom Watermarks */}
              <g transform="translate(18, 604)">
                <text x="0" y="0" fill="#70757a" fontSize="10" fontFamily="sans-serif">
                  Material Square · Service area routes
                </text>
              </g>

              <g transform="translate(860, 604)">
                <text x="0" y="0" fill="#70757a" fontSize="9" fontFamily="sans-serif">
                  Illustrative map · Confirm current coverage with the team
                </text>
              </g>
            </svg>

            {/* Inside Map Corner: Style Switcher Badge (Top Left Corner) */}
            <div className="gmaps-corner-style-switcher">
              <span className="corner-switch-title">
                <Layers size={13} />
                Style:
              </span>
              <div className="corner-switch-buttons">
                <button
                  type="button"
                  className={`corner-style-btn ${mapTheme === 'clean' ? 'active' : ''}`}
                  onClick={() => setMapTheme('clean')}
                >
                  Clean Vector
                </button>
                <button
                  type="button"
                  className={`corner-style-btn ${mapTheme === 'dark' ? 'active' : ''}`}
                  onClick={() => setMapTheme('dark')}
                >
                  Dark Tech
                </button>
                <button
                  type="button"
                  className={`corner-style-btn ${mapTheme === 'satellite' ? 'active' : ''}`}
                  onClick={() => setMapTheme('satellite')}
                >
                  Satellite
                </button>
              </div>
            </div>

            {/* Floating Compass & Zoom Buttons */}
            <div className="gmaps-overlay-controls" aria-hidden="true">
              <button
                type="button"
                className="gmaps-ctrl-btn compass-btn"
                title="Google Maps Compass"
                onClick={() => handleOpenGoogleMaps()}
              >
                <Compass size={18} color="#ea4335" />
              </button>
              <div className="gmaps-zoom-stack">
                <button
                  type="button"
                  className="gmaps-ctrl-btn"
                  title="Zoom into Office"
                  onClick={() => handleOpenGoogleMaps()}
                >
                  <Plus size={18} />
                </button>
                <button
                  type="button"
                  className="gmaps-ctrl-btn"
                  title="Zoom Out"
                  onClick={() => handleOpenGoogleMaps()}
                >
                  <Minus size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Clean Google Maps Bottom Action Strip */}
          <div className="gmaps-bottom-bar">
            <div className="gmaps-bottom-left">
              <span className="dest-pin-badge">📍</span>
              <div>
                <strong>{officeName}</strong>
                <p>{officeAddress || serviceArea || 'Contact the team to confirm service coverage.'}</p>
              </div>
            </div>

            <div className="gmaps-bottom-actions">
              {officeDestination && <button
                type="button"
                className="btn btn-primary btn-directions-main"
                onClick={() => handleOpenGoogleMaps()}
              >
                <Navigation size={17} />
                <span>Open in Google Maps</span>
                <ExternalLink size={14} />
              </button>}

              {officeAddress && <button
                type="button"
                className="btn btn-secondary btn-office-popup"
                onClick={() => setIsOfficeModalOpen(true)}
              >
                <MapPin size={16} />
                <span>Office Details</span>
              </button>}
            </div>
          </div>
        </div>

        {/* Office Details Modal (When User Clicks the Pin or Office Details) */}
        {isOfficeModalOpen && (
          <div className="office-modal-backdrop" onClick={() => setIsOfficeModalOpen(false)}>
            <div
              className="office-modal-card animate-scale-up"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="dmap-modal-title"
            >
              <div className="office-modal-header">
                <div className="modal-header-badge">
                  <MapPin size={16} />
                  <span>GOOGLE MAPS DESTINATION</span>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setIsOfficeModalOpen(false)}
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="office-modal-body">
                <div className="office-hero-strip">
                  <div className="office-location-icon">
                    <MapPin size={32} />
                  </div>
                  <div>
                    <h2 id="dmap-modal-title">{officeName}</h2>
                    <span className="office-city-badge">📍 {serviceArea || 'Business location'}</span>
                  </div>
                </div>

                <div className="office-address-box">
                  <div className="address-label">Official Office & Dispatch Depot Address:</div>
                  <div className="address-text">{officeAddress}</div>
                  <div className="coordinates-tag">
                    Directions are matched to the address supplied by the client.
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="office-modal-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-lg btn-maps-redirect"
                    onClick={() => handleOpenGoogleMaps()}
                  >
                    <Navigation size={18} />
                    <span>Open Directions in Google Maps</span>
                    <ExternalLink size={16} />
                  </button>

                  {officePhone && <a href={`tel:${officePhone}`} className="btn btn-secondary btn-lg">
                    <Phone size={16} />
                    <span>Call: {officePhoneDisplay}</span>
                  </a>}

                  {officePhone && <a
                    href={`https://wa.me/${officePhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello Material Square, I need directions to ${officeName}.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-whatsapp btn-lg"
                  >
                    <WhatsAppIcon size={18} color="#ffffff" />
                    <span>Ask for a location pin</span>
                  </a>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
