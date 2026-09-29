import React, { useState } from 'react';
import {
  Droplet,
  Flame,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldCheck,
  Thermometer,
  Layers,
  ArrowRight,
  MessageCircle,
} from 'lucide-react';
import { PLUMBING_GUIDE, COMPANY_INFO } from '../data/materialsData';

export default function PlumbingGuide() {
  const [selectedPipe, setSelectedPipe] = useState(1); // Default CPVC

  const currentPipe = PLUMBING_GUIDE[selectedPipe];

  return (
    <section id="plumbing-guide" className="ms-plumbing-guide-section">
      <div className="container">
        {/* Section Header */}
        <div className="plumbing-header">
          <span className="badge-orange">Plumbing Engineering & Site Guide</span>
          <h2 className="section-title">Plumbing Basics: Know Your Pipes, Choose Right</h2>
          <p className="section-subtitle">
            Choosing the wrong pipe for hot water or mixing unmatched fittings causes internal wall leaks after tiles are laid.
            Understand PVC vs CPVC vs uPVC before running concealed lines.
          </p>
        </div>

        {/* 3 Pipe Type Selector Tabs */}
        <div className="pipe-tabs-row">
          {PLUMBING_GUIDE.map((pipe, index) => (
            <button
              key={pipe.type}
              type="button"
              className={`pipe-tab-btn ${selectedPipe === index ? 'active' : ''}`}
              onClick={() => setSelectedPipe(index)}
            >
              <span className="pipe-number">0{index + 1}</span>
              <span className="pipe-name">{pipe.type}</span>
              <span className="pipe-use-hint">
                {index === 0 ? 'Drainage & Waste' : index === 1 ? 'Hot & Cold Water' : 'Cold Potable Water'}
              </span>
            </button>
          ))}
        </div>

        {/* Active Pipe Detail Card */}
        <div className="pipe-detail-card">
          <div className="pipe-card-grid">
            {/* Left Col: Core Specs */}
            <div className="pipe-info-col">
              <div className="pipe-tag-strip">
                <span className="badge-orange mono">{currentPipe.type}</span>
                <span className="badge-green">Authorized Brands: Astral / Supreme / Finolex</span>
              </div>

              <h3 className="pipe-suited-title">Best Suited For:</h3>
              <p className="pipe-suited-desc">{currentPipe.bestSuited}</p>

              <div className="pipe-features-grid">
                {currentPipe.features.map((feat, idx) => (
                  <div key={idx} className="pipe-feature-item">
                    <CheckCircle2 size={16} className="feat-icon" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              {/* Storage Dos & Don'ts from poster */}
              <div className="pipe-storage-rules">
                <div className="rule-box do-box">
                  <div className="rule-title">
                    <CheckCircle2 size={15} /> Sahi Storage (Do's)
                  </div>
                  <p>{currentPipe.dos}</p>
                </div>

                <div className="rule-box dont-box">
                  <div className="rule-title">
                    <XCircle size={15} /> Galat Tareeka (Don'ts)
                  </div>
                  <p>{currentPipe.donts}</p>
                </div>
              </div>
            </div>

            {/* Right Col: Technical Comparison Table */}
            <div className="pipe-specs-col">
              <h4 className="specs-table-title">Engineering Parameters</h4>

              <div className="pipe-parameters-table">
                <div className="param-row">
                  <span className="param-label">Common Use</span>
                  <span className="param-val">{currentPipe.waterType}</span>
                </div>
                <div className="param-row">
                  <span className="param-label">Max Temperature</span>
                  <span className="param-val mono highlight-temp">
                    <Thermometer size={14} /> {currentPipe.tempSuitability}
                  </span>
                </div>
                <div className="param-row">
                  <span className="param-label">Pressure Rating</span>
                  <span className="param-val">{currentPipe.pressure}</span>
                </div>
                <div className="param-row">
                  <span className="param-label">Relative Cost</span>
                  <span className="param-val">{currentPipe.cost}</span>
                </div>
                <div className="param-row">
                  <span className="param-label">Jointing System</span>
                  <span className="param-val">Solvent Cement Fast Welding</span>
                </div>
              </div>

              {/* Material Dating Card from poster */}
              <div className="material-dating-box">
                <div className="dating-header">
                  <span className="heart-icon">❤️</span>
                  <h4>"Material Dating: Right Match Matters"</h4>
                </div>
                <p>
                  Never mix a generic unbranded brass elbow with an Astral or Supreme pipe.
                  Thread discrepancies and unequal thermal expansion cause concealed leaks.
                  Material Square supplies <strong>100% matched system fittings</strong>.
                </p>
                <a
                  href={`https://wa.me/919773505015?text=Hello%20Material%20Square,%20I%20need%20a%20full%20plumbing%20BOQ%20quote%20for%20${encodeURIComponent(currentPipe.type)}%20pipes%20and%20fittings.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-whatsapp btn-sm dating-action-btn"
                >
                  <MessageCircle size={14} /> Get Plumbing BOQ Quote
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
