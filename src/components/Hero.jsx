import React from 'react';
import {
  Search,
  Phone,
  MessageCircle,
  Truck,
  ShieldCheck,
  CheckCircle2,
  FileText,
  BadgePercent,
  Clock,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { COMPANY_INFO } from '../data/materialsData';
import HeroBuildingCanvas from './HeroBuildingCanvas';

export default function Hero({
  searchQuery,
  setSearchQuery,
  onSelectCategory,
  onOpenBOM,
  onNavigateSection,
}) {
  const quickSearches = [
    { label: 'UltraTech Cement', query: 'UltraTech' },
    { label: 'Astral CPVC Pro', query: 'Astral' },
    { label: 'Polycab 2.5 sq mm Wire', query: 'Polycab' },
    { label: 'Asian Paints Apex', query: 'Apex' },
    { label: 'Supreme SWR Pipe', query: 'Supreme' },
    { label: 'CERA Wall Hung EWC', query: 'CERA' },
  ];

  return (
    <section className="ms-hero-section">
      <div className="hero-desktop-canvas-wrap">
        <HeroBuildingCanvas centered={false} />
      </div>
      <div className="container hero-layout-grid">
        {/* Mobile 3D Building Showcase (Visible on < 992px at the top before text) */}
        <div className="hero-mobile-building-col">
          <div className="hero-mobile-building-frame">
            <HeroBuildingCanvas centered={true} />
          </div>
        </div>

        {/* Left Column: Core Value Proposition */}
        <div className="hero-content-col">
          {/* Eyebrow Tag */}
          <div className="hero-eyebrow-strip">
            <span className="badge-orange">Direct to Consumer · D2C</span>
            <span className="hero-tagline-text">India's Smarter Construction Marketplace</span>
          </div>

          {/* Main Slogan / Headline */}
          <h1 className="hero-main-title">
            Why Make 5 Calls? <br />
            <span className="highlight-text">One Call. All Materials.</span>
          </h1>

          <p className="hero-hindi-slogan">
            "{COMPANY_INFO.sloganHindi}"
          </p>

          <p className="hero-desc-text">
            From foundation casting to final bathroom fittings. Material Square consolidates
            <strong> Cement, TMT Steel, CPVC/UPVC Pipes, Wires, Paints, and Sanitaryware</strong> onto
            a single delivery vehicle with genuine factory warranties and wholesale pricing across <strong>Delhi NCR</strong>.
          </p>

          {/* Search Box */}
          <div className="hero-search-wrapper">
            <div className="search-bar-inner">
              <Search className="search-bar-icon" size={20} />
              <input
                type="text"
                className="search-bar-input"
                placeholder="Search by brand or material (e.g. UltraTech, Astral, Polycab 2.5mm, Asian Paints)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => onNavigateSection('marketplace')}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => setSearchQuery('')}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Quick Keyword Pills */}
            <div className="quick-keywords">
              <span className="quick-label">Trending on Sites:</span>
              <div className="quick-pill-list">
                {quickSearches.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className="keyword-pill"
                    onClick={() => {
                      setSearchQuery(item.query);
                      onNavigateSection('marketplace');
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Core Action Triggers */}
          <div className="hero-actions-row">
            <button
              type="button"
              className="btn btn-orange btn-lg"
              onClick={onOpenBOM}
            >
              <FileText size={18} />
              <span>Send Material List (BOM)</span>
            </button>

            <a
              href={COMPANY_INFO.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp btn-lg"
            >
              <WhatsAppIcon size={20} color="#ffffff" />
              <span>Connect on WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Right Column Spacer (Space reserved for 3D building rendering) */}
        <div className="hero-visual-col" aria-hidden="true" />
      </div>

      {/* 4 Pillars Trust Strip */}
      <div className="hero-trust-bar">
        <div className="container trust-items-grid">
          <div className="trust-item">
            <div className="trust-icon-box">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h4>Quality Materials</h4>
              <p>100% genuine manufacturer warranty & test certs</p>
            </div>
          </div>

          <div className="trust-item">
            <div className="trust-icon-box">
              <Clock size={22} />
            </div>
            <div>
              <h4>On-Time Delivery</h4>
              <p>Guaranteed site dispatch slots, zero idle labor</p>
            </div>
          </div>

          <div className="trust-item">
            <div className="trust-icon-box">
              <BadgePercent size={22} />
            </div>
            <div>
              <h4>Competitive Prices</h4>
              <p>Wholesale contractor pricing without retail markups</p>
            </div>
          </div>

          <div className="trust-item">
            <div className="trust-icon-box">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <h4>Trusted Partner</h4>
              <p>Dedicated procurement coordinator for your site</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
