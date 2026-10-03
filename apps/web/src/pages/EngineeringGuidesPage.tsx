import type { MaterialItem, CatalogueProduct } from '../types';
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
import { useSiteContent } from '../site-content';

export default function EngineeringGuidesPage({ onAddCustomToBOM, onOpenBOMDrawer }: { onAddCustomToBOM: (item: MaterialItem) => void; onOpenBOMDrawer: () => void }) {
  const siteContent = useSiteContent();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'wire';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Collect an enquiry topic only; this page does not calculate cable sizes.
  const [selectedLoadType, setSelectedLoadType] = useState('ac-geyser');
  const [wireAddedNotice, setWireAddedNotice] = useState(false);

  useEffect(() => {
    if (searchParams.get('tab')) {
      setActiveTab(searchParams.get('tab') || 'wire');
    }
  }, [searchParams]);

  const handleTabChange = (tabKey: string) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
  };

  // Never infer a safe conductor size or current rating from an appliance name.
  const getWireRecommendation = () => {
    return {
      gauge: 'Confirm with a qualified electrician',
      amps: 'Not calculated by this website',
      application: selectedLoadType,
      brands: 'Confirm the specified brand and product with staff',
      wireCode: 'MS-ELE-WIRE-ENQUIRY',
      productName: 'Electrical cable enquiry',
    };
  };

  const currentRec = getWireRecommendation();

  const handleAddWireToBOM = () => {
    if (onAddCustomToBOM) {
      onAddCustomToBOM({
        id: `wire-enquiry-${currentRec.wireCode}`,
        code: currentRec.wireCode,
        name: currentRec.productName,
        brand: 'To confirm',
        category: 'wires',
        unit: 'Quantity and unit to confirm',
        specification: `Enquiry topic: ${currentRec.application}. This website does not calculate cable size or rating. Please confirm the design with a qualified electrician.`,
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
            <span className="badge-pill badge-orange-pill reveal-text">Tools & Guides</span>
            <h1 className="page-title">
              <span className="ms-mask-line">
                <span className="ms-mask-text">{siteContent["guides.title"]}</span>
              </span>
            </h1>
            <p className="page-subtitle reveal-text">
              {siteContent["guides.description"]}
            </p>

            {/* Tab navigation */}
            <div className="guides-tab-bar">
              <button
                type="button"
                className={`guide-tab-btn ${activeTab === 'wire' ? 'active' : ''}`}
                onClick={() => handleTabChange('wire')}
              >
                <Zap size={16} />
                <span>Wire Selection Checklist</span>
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
          <div className="guide-review-warning" role="note">
            <AlertTriangle size={18} />
            <p><strong>Professional verification required.</strong> This page does not calculate cable sizes or approve plumbing designs. Have a qualified professional confirm the design, exact product and applicable standards.</p>
          </div>
          {/* TAB 1: WIRE SIZING CALCULATOR */}
          {activeTab === 'wire' && (
            <div className="tab-pane-wire">
              <div className="guide-intro-card reveal-card">
                <div className="intro-badge-row">
                  <span className="badge-pill">Prepare an enquiry</span>
                  <span className="note-text">No cable sizing provided</span>
                </div>
                <h2 className="reveal-title">
                  <span className="ms-mask-line">
                    <span className="ms-mask-text">Prepare a Wire</span>
                  </span>{' '}
                  <span className="ms-mask-line">
                    <span className="ms-mask-text delay-1">Enquiry</span>
                  </span>
                </h2>
                <p className="reveal-text">
                  Select the kind of work you are planning and prepare a question for the team. Cable size, protection, route and installation must be specified by a qualified electrical professional.
                </p>
              </div>

              {/* Interactive Calculator Card */}
              <div className="calculator-box-grid reveal-card">
                <div className="calc-controls-col">
                    <h3>What kind of work is this for?</h3>
                  <div className="load-options-list">
                    <button
                      type="button"
                      className={`load-select-btn ${selectedLoadType === 'lighting' ? 'active' : ''}`}
                      onClick={() => setSelectedLoadType('lighting')}
                    >
                      <div className="btn-icon">💡</div>
                      <div>
                        <strong>Lighting & Fan Points</strong>
                        <span>Describe the lighting or fan circuit to your electrician.</span>
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
                        <span>Describe the intended socket use and connected equipment.</span>
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
                        <span>List each appliance and its nameplate rating.</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`load-select-btn ${selectedLoadType === 'ac-geyser' ? 'active' : ''}`}
                      onClick={() => setSelectedLoadType('ac-geyser')}
                    >
                      <div className="btn-icon">❄️</div>
                      <div>
                        <strong>Air conditioner, water heater or other appliance</strong>
                        <span>Provide the appliance nameplate and installation details.</span>
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
                        <span>Provide the approved project electrical drawings.</span>
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
                        <span>Provide the approved project electrical drawings.</span>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="calc-result-col">
                  <div className="result-display-card">
                    <span className="rec-eyebrow">Design decision</span>
                    <div className="rec-gauge-badge">Qualified electrician</div>

                    <div className="rec-details-grid">
                      <div className="rec-detail-item">
                        <span className="lbl">Current rating:</span>
                        <span className="val font-mono">{currentRec.amps}</span>
                      </div>
                      <div className="rec-detail-item">
                        <span className="lbl">Brand:</span>
                        <span className="val">{currentRec.brands}</span>
                      </div>
                      <div className="rec-detail-item full-width">
                        <span className="lbl">Enquiry topic:</span>
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
                        <span>Add Electrical Cable Enquiry to Material List</span>
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
                      Cable size and type depend on design current, installation method, route length, ambient conditions, protective devices and applicable standards. Have a qualified electrical professional specify and verify them.
                    </p>
                  </div>
                </div>
              </div>

              {/* Reference Table */}
              <div className="wire-reference-table-wrap reveal-card">
                <h3>Information to confirm before selecting cable</h3>
                <div className="table-responsive">
                  <table className="engineering-table">
                    <thead>
                      <tr>
                        <th>Project information</th>
                        <th>Why it matters</th>
                        <th>Who verifies it</th>
                        <th>Website calculation</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td>Connected load and appliance nameplate ratings</td><td>Establishes design demand</td><td>Qualified electrical professional</td><td>Not calculated</td></tr>
                      <tr><td>Cable route, installation method and environment</td><td>Affects cable selection and derating</td><td>Qualified electrical professional</td><td>Not calculated</td></tr>
                      <tr><td>Supply, protective devices and project standards</td><td>Required to coordinate circuit protection</td><td>Qualified electrical professional</td><td>Not calculated</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PLUMBING BASICS (PVC vs CPVC vs uPVC) */}
          {activeTab === 'plumbing' && (
            <div className="tab-pane-plumbing">
              <div className="guide-intro-card reveal-card">
                <div className="intro-badge-row">
                  <span className="badge-pill">General comparison examples</span>
                  <span className="note-text">Confirm current product documentation</span>
                </div>
                <h2 className="reveal-title">
                  <span className="ms-mask-line">
                    <span className="ms-mask-text">Plumbing Pipe Selection Matrix</span>
                  </span>{' '}
                  <span className="ms-mask-line">
                    <span className="ms-mask-text delay-1">& Material Dating</span>
                  </span>
                </h2>
                <p className="reveal-text">
                  Pipe selection depends on the system design, operating conditions, local standards, and manufacturer instructions. Use this comparison only as a starting point for professional review.
                </p>
              </div>

              {/* 3 Pipe Comparison Cards */}
              <div className="plumbing-cards-grid reveal-stagger">
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
              <div className="material-dating-banner reveal-card">
                <div className="dating-col">
                  <div className="banner-icon-title">
                    <Calendar size={20} />
                    <h3>Material Dating: Check Manufacturing Stamp</h3>
                  </div>
                  <p>
                    Follow the storage conditions and shelf-life guidance provided by the pipe manufacturer. Check product markings and batch information against the manufacturer's documentation.
                  </p>
                </div>

                <div className="matched-fittings-col">
                  <div className="banner-icon-title">
                    <ShieldCheck size={20} />
                    <h3>Check pipe and fitting compatibility</h3>
                  </div>
                  <p>
                    Confirm that pipes, fittings, joining methods, and solvent cement are compatible according to the manufacturer's installation instructions and the project design.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SITE STORAGE RULES */}
          {activeTab === 'storage' && (
            <div className="tab-pane-storage">
              <div className="guide-intro-card reveal-card">
                <div className="intro-badge-row">
                  <span className="badge-pill">On-Site Loss Prevention</span>
                  <span className="note-text">General storage examples</span>
                </div>
                <h2 className="reveal-title">
                  <span className="ms-mask-line">
                    <span className="ms-mask-text">"Pipe Kharid Liya... Rakhenge Kahan?"</span>
                  </span>{' '}
                  <span className="ms-mask-line">
                    <span className="ms-mask-text delay-1">— Proper Site Storage Guide</span>
                  </span>
                </h2>
                <p className="reveal-text">
                  Storage requirements vary by material and manufacturer. Use current product documentation and the site safety plan to set handling and storage procedures.
                </p>
              </div>

              {/* 3 Pillar Storage Guidelines */}
              <div className="storage-rules-grid reveal-stagger">
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
                        <strong>Keep dry and raised:</strong> Store bags off the ground in a dry, covered area. Follow the cement manufacturer's storage instructions.
                      </p>
                    </div>
                    <div className="tip-bullet">
                      <span className="tip-num">2</span>
                      <p>
                        <strong>Protect from moisture:</strong> Keep stacks away from damp surfaces and protect them from rain and water exposure.
                      </p>
                    </div>
                    <div className="tip-bullet">
                      <span className="tip-num">3</span>
                      <p>
                        <strong>Follow safe stacking limits:</strong> Use the manufacturer's instructions and the site's safe manual-handling and stacking procedure.
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
                        <strong>Support along their length:</strong> Store pipes on an even rack using the support spacing recommended by the manufacturer.
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
                        <strong>Keep products sorted:</strong> Separate sizes and types so pipes and fittings are not crushed or damaged.
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
                        <strong>Keep steel off standing water and soil:</strong> Use the storage method specified by the project and supplier.
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
          <div className="guide-bottom-dispatch-card reveal-card">
            <div>
              <h3>Have Structural or Plumbing Drawings for Your Site?</h3>
              <p>Share a drawing or material schedule with the team. A qualified project professional should verify quantities and specifications.</p>
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
