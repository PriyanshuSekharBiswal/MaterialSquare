import React from 'react';
import {
  CheckCircle2,
  XCircle,
  Umbrella,
  Shield,
  Layers,
  Archive,
  RefreshCw,
  Lightbulb,
} from 'lucide-react';

export default function StorageTips() {
  const categories = [
    {
      name: 'PVC Pipes',
      dos: ['Flat aur level surface par rakhein.', 'Direct sunlight se bachayein.', 'Proper horizontal support dein.'],
      donts: ['Uneven surface par na rakhein.', 'Excessive weight ke neeche na rakhein.'],
    },
    {
      name: 'CPVC Pipes',
      dos: ['Shade mein store karein.', 'Straight alignment maintain karein.', 'Heat se protect karein.'],
      donts: ['Direct heat/sunlight mein na rakhein.', 'Pipes ko unnecessarily bend na karein.'],
    },
    {
      name: 'UPVC Pipes',
      dos: ['Horizontal support ke saath rakhein.', 'Clean aur dry area choose karein.', 'Different sizes ko separate rakhein.'],
      donts: ['Random stacking na karein.', 'Sharp edges ke paas na rakhein.'],
    },
    {
      name: 'Pipe Fittings & Valves',
      dos: ['Fittings ko clean aur dry rakhein.', 'Small components ko organized boxes mein rakhein.', 'Category-wise labeling karein.'],
      donts: ['Floor par scattered na rakhein.', 'Dusty/open storage na karein.'],
    },
  ];

  const generalTips = [
    { icon: Umbrella, label: 'Covered & Protected', desc: 'Protect from heavy monsoon rains & harsh sunlight.' },
    { icon: Layers, label: 'Proper Horizontal Support', desc: 'Prevent pipe sagging and curvature distortion.' },
    { icon: Archive, label: 'Category Wise Storage', desc: 'Separate sizes (1/2" to 2") into marked racks.' },
    { icon: RefreshCw, label: 'FIFO Follow Karein', desc: 'First In First Out ensures cement stays fresh.' },
  ];

  return (
    <section className="ms-storage-tips-section">
      <div className="container">
        {/* Header */}
        <div className="storage-header">
          <span className="badge-orange">Field Knowledge & Best Practices</span>
          <h2 className="section-title">Pipe Kharid Liya... Rakhenge Kahan?</h2>
          <p className="section-subtitle">
            *"Galat storage se pipes scratch, deform ya damage ho sakte hain. Sahi jagah, sahi tarike se store karein."*
          </p>
        </div>

        {/* 4 Storage Category Columns Grid */}
        <div className="storage-cards-grid">
          {categories.map((cat, idx) => (
            <div key={idx} className="storage-cat-card">
              <h3 className="cat-card-title">{cat.name}</h3>

              <div className="rules-group dos-group">
                <span className="rules-heading do-heading">
                  <CheckCircle2 size={13} /> Sahi Tareeka (Do's)
                </span>
                <ul className="rules-list">
                  {cat.dos.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="rules-group donts-group">
                <span className="rules-heading dont-heading">
                  <XCircle size={13} /> Yeh Na Karein (Don'ts)
                </span>
                <ul className="rules-list">
                  {cat.donts.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* General Storage Strip */}
        <div className="general-tips-strip">
          <div className="general-tips-grid">
            {generalTips.map((tip, idx) => {
              const Icon = tip.icon;
              return (
                <div key={idx} className="general-tip-box">
                  <div className="tip-icon-wrap">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h4>{tip.label}</h4>
                    <p>{tip.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Big Advantage Banner from poster */}
        <div className="storage-bada-fayda-banner">
          <div className="fayda-left">
            <Lightbulb size={36} className="fayda-bulb-icon" />
            <div>
              <h3>Sahi Storage, Better Quality, Bada Fayda!</h3>
              <p>Be Informed · Choose Right · Build Better Together</p>
            </div>
          </div>

          <div className="fayda-right-points">
            <div className="f-point">✓ Pipes ki shape bani rahegi</div>
            <div className="f-point">✓ Scratches aur damage kam honge</div>
            <div className="f-point">✓ Wastage kam hoga</div>
            <div className="f-point">✓ Installation smoothly chalega</div>
          </div>
        </div>
      </div>
    </section>
  );
}
