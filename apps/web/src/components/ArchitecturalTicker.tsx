import React from 'react';

export default function ArchitecturalTicker() {
  const items = [
    'GRADE A CEMENT',
    'TMT REBAR 550D',
    'CPVC & SWR PIPES',
    'RED BRICKS & AAC',
    'FR-LSH WIRES',
    'RIVER SAND & RO-ROD',
    'SANITARY & CP FITTINGS',
    'WEATHERPROOF PAINTS',
  ];

  return (
    <div className="ms-architectural-ticker-wrap" aria-hidden="true">
      <div className="ticker-track">
        {[0, 1, 2].map((loopIdx) => (
          <div key={loopIdx} className="ticker-segment">
            {items.map((item, idx) => (
              <span key={`${loopIdx}-${idx}`} className="ticker-item">
                <span className={`ticker-word ${idx % 2 === 1 ? 'is-outline' : ''}`}>
                  {item}
                </span>
                <span className="ticker-star">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
