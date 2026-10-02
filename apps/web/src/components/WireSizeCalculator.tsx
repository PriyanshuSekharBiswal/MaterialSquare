import type { MaterialItem, CatalogueProduct } from '../types';
import React, { useState } from 'react';
import {
  Zap,
  Calculator,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  Plus,
  MessageCircle,
} from 'lucide-react';
import { WIRE_SIZE_GUIDE, COMPANY_INFO } from '../data/materialsData';

export default function WireSizeCalculator({ onAddCustomToBOM }: { onAddCustomToBOM: (item: MaterialItem) => void }) {
  const [selectedAppIdx, setSelectedAppIdx] = useState(2); // Default to 2.5mm² 15A sockets
  const [selectedBrand, setSelectedBrand] = useState('Polycab');

  const currentSelection = WIRE_SIZE_GUIDE[selectedAppIdx];

  const handleAddWireToBOM = () => {
    if (onAddCustomToBOM) {
      onAddCustomToBOM({
        id: `wire-calc-${selectedAppIdx}-${selectedBrand.toLowerCase()}`,
        name: `${selectedBrand} ${currentSelection.size} FR Building Wire (90m Coil)`,
        brand: selectedBrand,
        category: 'wires',
        unit: '90m Coil',
        code: `MS-WIR-${currentSelection.size.split(' ')[0]}`,
      });
    }
  };

  const waWireUrl = `https://wa.me/919773505015?text=Hello%20Material%20Square,%20I%20need%20pricing%20for%20${encodeURIComponent(selectedBrand)}%20${encodeURIComponent(currentSelection.size)}%20wire%20coils%20for%20my%20site.`;

  return (
    <section id="wire-guide" className="ms-wire-calculator-section">
      <div className="container">
        {/* Section Header */}
        <div className="wire-section-header">
          <span className="badge-orange">Interactive Site Engineering Tool</span>
          <h2 className="section-title">Sahi Wire Choose Kare! Wire Sizing Guide</h2>
          <p className="section-subtitle">
            *"Wire kharidne nikle the... size ka confusion le aaye!"* Sirf colour ya price dekh kar wire mat choose karo.
            Match appliance wattage with the exact conductor gauge for 100% electrical safety.
          </p>
        </div>

        {/* Formula Banner */}
        <div className="wire-formula-banner">
          <div className="formula-step">
            <span className="step-badge">1. Electrical Load</span>
            <span className="step-icon">⚡</span>
          </div>
          <span className="formula-plus">+</span>
          <div className="formula-step">
            <span className="step-badge">2. Application</span>
            <span className="step-icon">🏠</span>
          </div>
          <span className="formula-plus">+</span>
          <div className="formula-step">
            <span className="step-badge">3. Distance</span>
            <span className="step-icon">📍</span>
          </div>
          <span className="formula-equal">=</span>
          <div className="formula-result">
            <span className="result-badge">Right Wire Size</span>
            <span className="result-sub">Safe & Long-Lasting Wiring</span>
          </div>
        </div>

        {/* Interactive Calculator Workspace */}
        <div className="wire-calculator-grid">
          {/* Left: Appliance / Load Selector */}
          <div className="wire-inputs-card">
            <h3 className="card-heading">
              <Zap size={18} className="heading-icon" /> Select Appliance or Circuit
            </h3>

            <div className="appliance-options-list">
              {WIRE_SIZE_GUIDE.map((item, index) => (
                <div
                  key={index}
                  className={`appliance-select-box ${selectedAppIdx === index ? 'selected' : ''}`}
                  onClick={() => setSelectedAppIdx(index)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="app-box-header">
                    <span className="app-name">{item.applianceIcons}</span>
                    <span className="app-gauge-pill mono">{item.size}</span>
                  </div>
                  <p className="app-details-text">{item.apps}</p>
                  <span className="app-load-limit">Max Load: {item.maxLoad}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Technical Output & Order Card */}
          <div className="wire-recommendation-card">
            <div className="recom-header">
              <span className="recom-badge">Recommended Conductor Gauge</span>
              <div className="recommended-size-display mono">
                {currentSelection.size}
              </div>
              <p className="recom-target-desc">
                Ideal for: <strong>{currentSelection.apps}</strong>
              </p>
            </div>

            <div className="recom-specs-box">
              <div className="spec-item-row">
                <span className="spec-k">Rated Power Capacity:</span>
                <span className="spec-v mono">{currentSelection.maxLoad}</span>
              </div>
              <div className="spec-item-row">
                <span className="spec-k">Preferred Brands:</span>
                <span className="spec-v">Polycab / Havells / Finolex</span>
              </div>
              <div className="spec-item-row">
                <span className="spec-k">Safety Standard:</span>
                <span className="spec-v">IS 694 FR-LSH Flame Retardant</span>
              </div>
              <div className="spec-item-row">
                <span className="spec-k">Standard Coil Length:</span>
                <span className="spec-v">90 Meters Box Pack</span>
              </div>
            </div>

            {/* Brand Toggle */}
            <div className="brand-select-row">
              <label>Select Preferred Manufacturer:</label>
              <div className="brand-toggle-buttons">
                {['Polycab', 'Havells', 'Finolex'].map((brand) => (
                  <button
                    key={brand}
                    type="button"
                    className={`b-toggle-btn ${selectedBrand === brand ? 'active' : ''}`}
                    onClick={() => setSelectedBrand(brand)}
                  >
                    {brand}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="recom-actions-row">
              <button
                type="button"
                className="btn btn-orange btn-block"
                onClick={handleAddWireToBOM}
              >
                <Plus size={16} />
                <span>Add {selectedBrand} {currentSelection.size} to List</span>
              </button>

              <a
                href={waWireUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-whatsapp btn-block"
              >
                <MessageCircle size={16} />
                <span>Get Trade Price on WhatsApp</span>
              </a>
            </div>

            <div className="wire-safety-disclaimer">
              <ShieldCheck size={14} />
              <span>100% Electrolytic Oxygen-Free Copper. Tested against thermal breakdown.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
