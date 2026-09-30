import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Zap,
  Droplet,
  Package,
  Plus,
  Check,
  AlertTriangle,
  Info,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { WIRE_SIZE_GUIDE, PLUMBING_GUIDE } from '../data/materialsData';

export default function EngineeringGuidesPage({ onAddCustomToBOM, onOpenBOMDrawer }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'wire';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Wire calculator state
  const [selectedLoadType, setSelectedLoadType] = useState('ac-geyser');
  const [customWatts, setCustomWatts] = useState(2500);
  const [wireAddedNotice, setWireAddedNotice] = useState(false);

  useEffect(() => {
    if (searchParams.get('tab')) {
      setActiveTab(searchParams.get('tab'));
    }
  }, [searchParams]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
  };

  // Wire recommendation logic
  const getWireRecommendation = () => {
    if (selectedLoadType === 'lighting') {
      return {
        gauge: '1.0 sq mm to 1.5 sq mm',
        amps: '11A - 14A',
        application: 'LED downlights, cove lighting, ceiling fans, exhaust fans',
        brands: 'Polycab Green Wire FR-LSH / Havells LifeLine Plus',
        wireCode: 'MS-ELE-WIRE-1.0',
        productName: 'Polycab 1.0 sq mm FR-LSH Copper Wire (90m)',
      };
    }
    if (selectedLoadType === 'general-sockets') {
      return {
        gauge: '1.5 sq mm',
        amps: '14A - 16A',
        application: '5A General Switchboard Sockets, TV, laptop chargers, setup boxes',
        brands: 'Polycab FR-LSH / Finolex Flame Retardant',
        wireCode: 'MS-ELE-WIRE-1.5',
        productName: 'Polycab 1.5 sq mm FR-LSH Copper Wire (90m)',
      };
    }
    if (selectedLoadType === 'kitchen-power') {
      return {
        gauge: '2.5 sq mm',
        amps: '19A - 22A',
        application: '16A Power Plugs: Refrigerator, microwave oven, mixer grinder, iron, washing machine',
        brands: 'Havells LifeLine HR-FR / Polycab',
        wireCode: 'MS-ELE-WIRE-2.5',
        productName: 'Havells 2.5 sq mm HR-FR Flame Retardant Wire (90m)',
      };
    }
    if (selectedLoadType === 'ac-geyser') {
      return {
        gauge: '4.0 sq mm',
        amps: '26A - 30A',
        application: '1.5 Ton / 2.0 Ton Inverter AC, 15L-25L Storage Water Geysers, Induction cooktop',
        brands: 'Polycab Green Wire / Havells LifeLine Plus',
        wireCode: 'MS-ELE-WIRE-4.0',
        productName: 'Polycab 4.0 sq mm FR-LSH Copper Wire (90m)',
      };
    }
    if (selectedLoadType === 'main-db') {
      return {
        gauge: '6.0 sq mm to 10.0 sq mm',
        amps: '35A - 50A',
        application: 'Incoming phase mains from energy meter to Distribution Board (DB)',
        brands: 'Finolex High Conductivity / Polycab 1100V',
        wireCode: 'MS-ELE-WIRE-6.0',
        productName: 'Finolex 6.0 sq mm Heavy Load Copper Cable (90m)',
      };
    }
    return {
      gauge: '16.0 sq mm Multi-Core',
      amps: '65A - 80A',
      application: 'Submains feeding duplex floors, independent builder floors, elevator panels',
      brands: 'Polycab Armoured / Havells Industrial',
      wireCode: 'MS-ELE-WIRE-16',
      productName: 'Polycab 16 sq mm Multi-Core Submain Cable (Per Meter)',
    };
  };

  const currentRec = getWireRecommendation();

  const handleAddWireToBOM = () => {
    if (onAddCustomToBOM) {
      onAddCustomToBOM({
        id: currentRec.wireCode,
        name: currentRec.productName,
        brand: currentRec.brands.split('/')[0].trim(),
        unit: '90m Coil',
        wholesaleRate: 'Trade Rate on Dispatch',
        specs: { standard: 'IS 694 Certified', size: currentRec.gauge },
        inStock: true,
      });
      setWireAddedNotice(true);
      setTimeout(() => setWireAddedNotice(false), 3000);
    }
  };

  return (
    <div className="guides-page">
      {/* Page Header */}
      <section className="page-hero-header">
        <div className="container">
          <div className="page-hero-content">
            <span className="badge-pill badge-orange-pill reveal-text">Engineering & On-Site Standards</span>
            <h1 className="page-title">
              <span className="ms-mask-line">
                <span className="ms-mask-text">Site Engineering & Material Guides</span>
              </span>
            </h1>
            <p className="page-subtitle reveal-text">
              Avoid costly site errors, short circuits, and wall leakages. Practical engineering formulas and manufacturer storage guidelines for Delhi NCR site engineers, contractors, and builders.
            </p>

            {/* Tab navigation */}
            <div className="guides-tab-bar">
              <button
                type="button"
                className={`guide-tab-btn ${activeTab === 'wire' ? 'active' : ''}`}
                onClick={() => handleTabChange('wire')}
              >
                <Zap size={16} />
                <span>Wire Sizing Load Calculator</span>
              </button>

              <button
                type="button"
                className={`guide-tab-btn ${activeTab === 'plumbing' ? 'active' : ''}`}
                onClick={() => handleTabChange('plumbing')}
              >
                <Droplet size={16} />
                <span>Plumbing Basics (PVC / CPVC / uPVC)</span>
              </button>

              <button
                type="button"
                className={`guide-tab-btn ${activeTab === 'storage' ? 'active' : ''}`}
                onClick={() => handleTabChange('storage')}
              >
                <Package size={16} />
                <span>Site Storage & Handling Rules</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="guide-content-section">
        <div className="container">
          {/* TAB 1: WIRE SIZING CALCULATOR */}
          {activeTab === 'wire' && (
            <div className="tab-pane-wire">
              <div className="guide-intro-card">
                <div className="intro-badge-row">
                  <span className="badge-pill">IS 694 Indian Electrical Standards</span>
                  <span className="note-text">Pure Electrolytic Copper Conductors</span>
                </div>
                <h2>Interactive Wire Gauge & Circuit Sizing</h2>
                <p>
                  Undersized wires overheat inside conduit pipes, trip MCBs prematurely, and cause electrical fire hazards. Use this calculator to match conductor cross-sections with specific appliances.
                </p>
              </div>

              {/* Interactive Calculator Card */}
              <div className="calculator-box-grid">
                <div className="calc-controls-col">
                  <h3>Select Circuit / Appliance Type:</h3>
                  <div className="load-options-list">
                    <button
                      type="button"
                      className={`load-select-btn ${selectedLoadType === 'lighting' ? 'active' : ''}`}
                      onClick={() => setSelectedLoadType('lighting')}
                    >
                      <div className="btn-icon">💡</div>
                      <div>
                        <strong>Lighting & Fan Points</strong>
                        <span>LED lights, cove lights, exhaust (Up to 800W)</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`load-select-btn ${selectedLoadType === 'general-sockets' ? 'active' : ''}`}
                      onClick={() => setSelectedLoadType('general-sockets')}
                    >
                      <div className="btn-icon">🔌</div>
                      <div>
                        <strong>5A General Sockets</strong>
                        <span>TV, phone chargers, audio, WiFi router (Up to 1500W)</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`load-select-btn ${selectedLoadType === 'kitchen-power' ? 'active' : ''}`}
                      onClick={() => setSelectedLoadType('kitchen-power')}
                    >
                      <div className="btn-icon">🍳</div>
                      <div>
                        <strong>16A Kitchen & Utility Plugs</strong>
                        <span>Microwave, refrigerator, mixer, washing machine</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`load-select-btn ${selectedLoadType === 'ac-geyser' ? 'active' : ''}`}
                      onClick={() => setSelectedLoadType('ac-geyser')}
                    >
                      <div className="btn-icon">❄️</div>
                      <div>
                        <strong>Air Conditioner (1.5T) & Geysers</strong>
                        <span>Continuous thermal loads: 1500W – 3000W</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`load-select-btn ${selectedLoadType === 'main-db' ? 'active' : ''}`}
                      onClick={() => setSelectedLoadType('main-db')}
                    >
                      <div className="btn-icon">⚡</div>
                      <div>
                        <strong>Main Distribution Board (DB) Line</strong>
                        <span>Incoming meter power supply per phase</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`load-select-btn ${selectedLoadType === 'floor-submains' ? 'active' : ''}`}
                      onClick={() => setSelectedLoadType('floor-submains')}
                    >
                      <div className="btn-icon">🏢</div>
                      <div>
                        <strong>Floor Submains / Heavy Feeder</strong>
                        <span>Multi-storey duplexes and builder floor risers</span>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="calc-result-col">
                  <div className="result-display-card">
                    <span className="rec-eyebrow">Calculated Engineering Recommendation</span>
                    <div className="rec-gauge-badge">{currentRec.gauge}</div>

                    <div className="rec-details-grid">
                      <div className="rec-detail-item">
                        <span className="lbl">Safe Continuous Amperage:</span>
                        <span className="val font-mono">{currentRec.amps}</span>
                      </div>
                      <div className="rec-detail-item">
                        <span className="lbl">Recommended Brands:</span>
                        <span className="val">{currentRec.brands}</span>
                      </div>
                      <div className="rec-detail-item full-width">
                        <span className="lbl">Typical Circuit Scope:</span>
                        <span className="val">{currentRec.application}</span>
                      </div>
                    </div>

                    <div className="rec-action-row">
                      <button
                        type="button"
                        className="btn btn-primary btn-block"
                        onClick={handleAddWireToBOM}
                      >
                        <Plus size={16} />
                        <span>Add This Wire Coil to Material List</span>
                      </button>

                      {wireAddedNotice && (
                        <div className="added-success-alert">
                          <CheckCircle2 size={16} /> Added to your Material List (BOM)!
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="engineer-pro-tip">
                    <Info size={16} className="tip-icon" />
                    <p>
                      <strong>Site Safety Tip:</strong> Always use <strong>FR-LSH (Flame Retardant Low Smoke Zero Halogen)</strong> grade wires inside residential conduits. Standard cheap PVC wires emit toxic halogen fumes that impair visibility during accidental fire hazards.
                    </p>
                  </div>
                </div>
              </div>

              {/* Reference Table */}
              <div className="wire-reference-table-wrap">
                <h3>Full IS 694 Conductor Sizing Reference Sheet</h3>
                <div className="table-responsive">
                  <table className="engineering-table">
                    <thead>
                      <tr>
                        <th>Wire Conductor Gauge</th>
                        <th>Recommended Application</th>
                        <th>Max Load Capacity</th>
                        <th>Recommended Brand Standards</th>
                      </tr>
                    </thead>
                    <tbody>
                      {WIRE_SIZE_GUIDE.map((row, idx) => (
                        <tr key={idx}>
                          <td className="font-mono">
                            <strong>{row.size}</strong>
                          </td>
                          <td>{row.apps}</td>
                          <td>{row.maxLoad}</td>
                          <td>{row.recommendedBrand}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PLUMBING BASICS (PVC vs CPVC vs uPVC) */}
          {activeTab === 'plumbing' && (
            <div className="tab-pane-plumbing">
              <div className="guide-intro-card">
                <div className="intro-badge-row">
                  <span className="badge-pill">ASTM D2846 & IS 15778 Standards</span>
                  <span className="note-text">Hot, Cold & Drainage Systems</span>
                </div>
                <h2>Plumbing Pipe Selection Matrix & Material Dating</h2>
                <p>
                  Selecting the wrong pipe material or mixing fittings results in hairline fractures behind expensive bathroom tiles. Here is the field guide to CPVC, uPVC, and PVC plumbing.
                </p>
              </div>

              {/* 3 Pipe Comparison Cards */}
              <div className="plumbing-cards-grid">
                {PLUMBING_GUIDE.map((pipe, idx) => (
                  <div key={idx} className="pipe-spec-card">
                    <div className="pipe-header">
                      <h3>{pipe.type}</h3>
                      <span className="pipe-use-badge">{pipe.waterType}</span>
                    </div>

                    <div className="pipe-specs-list">
                      <div className="pipe-spec-row">
                        <span className="spec-name">Best Suited For:</span>
                        <span className="spec-desc">{pipe.bestSuited}</span>
                      </div>
                      <div className="pipe-spec-row">
                        <span className="spec-name">Temperature Rating:</span>
                        <span className="spec-desc font-mono">{pipe.tempSuitability}</span>
                      </div>
                      <div className="pipe-spec-row">
                        <span className="spec-name">Pressure Class:</span>
                        <span className="spec-desc">{pipe.pressure}</span>
                      </div>
                    </div>

                    <div className="pipe-dos-donts">
                      <div className="do-box">
                        <strong>✓ Site Do's:</strong>
                        <p>{pipe.dos}</p>
                      </div>
                      <div className="dont-box">
                        <strong>✕ Site Don'ts:</strong>
                        <p>{pipe.donts}</p>
                      </div>
                    </div>

                    <div className="pipe-card-cta">
                      <Link
                        to={`/marketplace?category=pipes`}
                        className="btn btn-secondary btn-sm btn-block"
                      >
                        View {pipe.type} in Marketplace
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* Material Dating & Matched Fittings Section */}
              <div className="material-dating-banner">
                <div className="dating-col">
                  <div className="banner-icon-title">
                    <Calendar size={20} />
                    <h3>Material Dating: Check Manufacturing Stamp</h3>
                  </div>
                  <p>
                    Plumbing pipes stored in open local dealer yards for over 6-9 months suffer UV degradation, becoming brittle before installation.
                    Always verify the laser print batch stamp on the pipe length (e.g. <code>ASTRAL CPVC PRO SDR 11 BATCH: 2024-M08</code>). Material Square guarantees factory fresh consignments.
                  </p>
                </div>

                <div className="matched-fittings-col">
                  <div className="banner-icon-title">
                    <ShieldCheck size={20} />
                    <h3>The Golden Rule: 100% Matched Fittings</h3>
                  </div>
                  <p>
                    Never use unbranded or cheap local elbows, tees, or solvent cement on Astral or Supreme pipes. Outer diameter tolerances differ by microns, leading to joint blow-outs under high pressure. Always order matched manufacturer fittings.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SITE STORAGE RULES */}
          {activeTab === 'storage' && (
            <div className="tab-pane-storage">
              <div className="guide-intro-card">
                <div className="intro-badge-row">
                  <span className="badge-pill">On-Site Loss Prevention</span>
                  <span className="note-text">Prevent 8-15% Material Scrap</span>
                </div>
                <h2>"Pipe Kharid Liya... Rakhenge Kahan?" — Proper Site Storage Guide</h2>
                <p>
                  Improper site stacking causes bent pipes, premature cement hydration (lumping), and corroded TMT steel before casting begins. Protect your investment with these standard field rules.
                </p>
              </div>

              {/* 3 Pillar Storage Guidelines */}
              <div className="storage-rules-grid">
                {/* Cement Rule */}
                <div className="storage-card">
                  <div className="storage-card-header">
                    <span className="rule-badge">Cement & Putty</span>
                    <h3>Preventing Hard Lumps & Moisture Absorption</h3>
                  </div>
                  <div className="storage-visual-tips">
                    <div className="tip-bullet">
                      <span className="tip-num">1</span>
                      <p>
                        <strong>Never store directly on bare concrete/soil:</strong> Place wooden pallets or plastic sheets at least <strong>150mm - 200mm</strong> above the floor.
                      </p>
                    </div>
                    <div className="tip-bullet">
                      <span className="tip-num">2</span>
                      <p>
                        <strong>Maintain 600mm Wall Clearance:</strong> Keep cement stacks at least 2 feet away from exterior damp walls to prevent condensation.
                      </p>
                    </div>
                    <div className="tip-bullet">
                      <span className="tip-num">3</span>
                      <p>
                        <strong>Max Stack Height: 10 Bags:</strong> Do not stack more than 10 bags high. Excessive weight causes bottom bags to develop "warehouse set" compaction.
                      </p>
                    </div>
                    <div className="tip-bullet">
                      <span className="tip-num">4</span>
                      <p>
                        <strong>FIFO Method:</strong> First-In, First-Out. Use older delivery batches before opening new consignments.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pipes Rule */}
                <div className="storage-card">
                  <div className="storage-card-header">
                    <span className="rule-badge">CPVC / UPVC Pipes</span>
                    <h3>Preventing Sagging, Bends & UV Damage</h3>
                  </div>
                  <div className="storage-visual-tips">
                    <div className="tip-bullet">
                      <span className="tip-num">1</span>
                      <p>
                        <strong>Continuous Horizontal Racking:</strong> Store pipes on flat horizontal timber battens spaced no more than <strong>1 meter</strong> apart to prevent permanent sagging.
                      </p>
                    </div>
                    <div className="tip-bullet">
                      <span className="tip-num">2</span>
                      <p>
                        <strong>Shade Against Delhi Summer UV:</strong> Protect uninstalled CPVC and PVC pipes under tarpaulin or tin sheds. Direct scorching sun causes thermal warpage.
                      </p>
                    </div>
                    <div className="tip-bullet">
                      <span className="tip-num">3</span>
                      <p>
                        <strong>Separate Large and Small Diameters:</strong> Always place heavier large diameter pipes (110mm / 160mm) at the bottom and thinner conduits on top.
                      </p>
                    </div>
                    <div className="tip-bullet">
                      <span className="tip-num">4</span>
                      <p>
                        <strong>Protect Rubber Rings:</strong> Keep SWR rubber gaskets in cool boxes away from diesel, solvents, and direct sunlight.
                      </p>
                    </div>
                  </div>
                </div>

                {/* TMT Steel Rule */}
                <div className="storage-card">
                  <div className="storage-card-header">
                    <span className="rule-badge">TMT Steel Rebars</span>
                    <h3>Corrosion Protection & Pitting Prevention</h3>
                  </div>
                  <div className="storage-visual-tips">
                    <div className="tip-bullet">
                      <span className="tip-num">1</span>
                      <p>
                        <strong>Elevate Above Mud:</strong> Rest steel rebar bundles on concrete sleeper blocks or wooden beams minimum <strong>150mm</strong> off the ground.
                      </p>
                    </div>
                    <div className="tip-bullet">
                      <span className="tip-num">2</span>
                      <p>
                        <strong>Cover During Monsoons:</strong> While surface oxidation (golden hue) is normal, stagnant water causes pitting corrosion that weakens structural tensile strength.
                      </p>
                    </div>
                    <div className="tip-bullet">
                      <span className="tip-num">3</span>
                      <p>
                        <strong>Tag by Diameter:</strong> Segregate bundles by 8mm, 10mm, 12mm, 16mm, and 20mm with clearly visible factory tags to avoid bar-bending confusion.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CTA Footer */}
          <div className="guide-bottom-dispatch-card">
            <div>
              <h3>Have Structural or Plumbing Drawings for Your Site?</h3>
              <p>Our engineering procurement team can extract exact BOQ quantities for your project with zero wastage allowance.</p>
            </div>
            <Link to="/get-quote" className="btn btn-primary btn-lg">
              <span>Send Drawing / Schedule for BOQ</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
