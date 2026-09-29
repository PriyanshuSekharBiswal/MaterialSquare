import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  ShieldCheck,
  Truck,
  Layers,
  Phone,
  MessageCircle,
  CheckCircle2,
  FileText,
  Clock,
  Zap,
  Droplet,
  Package,
} from 'lucide-react';
import { COMPANY_INFO, CATEGORIES } from '../data/materialsData';
import { BRAND_LIST, BrandLogo } from '../components/icons/BrandBadges';
import HeroShowcaseCarousel from '../components/HeroShowcaseCarousel';
import SiteDeliveriesCarousel from '../components/SiteDeliveriesCarousel';
import WhatsAppIcon from '../components/icons/WhatsAppIcon';

export default function HomePage({ onOpenBOMDrawer, bomList = [], onToggleBOM }) {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/marketplace?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/marketplace');
    }
  };

  const categoryCards = [
    {
      id: 'cement',
      title: 'Cement & Aggregates',
      subtitle: 'UltraTech, Ambuja, JK Cement, Shree',
      image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80',
      badge: 'Immediate Depot Dispatch',
    },
    {
      id: 'pipes',
      title: 'Pipes & Fittings',
      subtitle: 'Astral CPVC, Supreme SWR, Finolex, Zoloto',
      image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80',
      badge: '100% Matched Fittings',
    },
    {
      id: 'wires',
      title: 'Wires & Electrical',
      subtitle: 'Polycab FR-LSH, Havells, Finolex Cables',
      image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80',
      badge: 'Electrolytic Copper',
    },
    {
      id: 'paints',
      title: 'Paints & Wall Finishes',
      subtitle: 'Asian Paints Apex, Birla Opus, Wall Putty',
      image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80',
      badge: 'Fresh Factory Batches',
    },
    {
      id: 'sanitary',
      title: 'Sanitaryware & Bath',
      subtitle: 'Jaquar Diverters, CERA Rimless EWC, Sinks',
      image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
      badge: '10-Year Warranty',
    },
  ];

  return (
    <div className="home-page-container">
      {/* Hero Section */}
      <section className="home-hero-section">
        <div className="container hero-grid">
          {/* Left Text */}
          <div className="hero-text-col">
            <div className="eyebrow-row">
              <span className="badge-pill badge-orange-pill">Direct to Consumer · D2C</span>
              <span className="serving-text">Dedicated Logistics across Delhi NCR</span>
            </div>

            <h1 className="hero-heading">
              Why Make 5 Calls? <br />
              <span className="accent-text">One Call. All Materials.</span>
            </h1>

            <div className="hero-hindi-quote">
              <span>"{COMPANY_INFO.sloganHindi}"</span>
            </div>

            <p className="hero-subtext">
              Material Square consolidates <strong>Cement, TMT Steel, CPVC/UPVC Pipes, Wires, Paints, and Sanitaryware</strong> onto
              a single delivery vehicle directly to your construction site with factory-certified pricing and zero counterfeit risk.
            </p>

            {/* Quick Search */}
            <form onSubmit={handleSearchSubmit} className="hero-search-form">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search products or brands (e.g. UltraTech, Astral CPVC, Polycab 2.5mm)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="btn btn-primary search-submit-btn">
                Search
              </button>
            </form>

            {/* Quick Action Buttons */}
            <div className="hero-cta-group">
              <Link to="/marketplace" className="btn btn-primary btn-lg">
                <span>Browse Full Marketplace</span>
                <ArrowRight size={16} />
              </Link>
              <Link to="/get-quote" className="btn btn-secondary btn-lg">
                <FileText size={16} />
                <span>Get a Quote</span>
              </Link>
            </div>
          </div>

          {/* Right Visual Carousel Card */}
          <div className="hero-showcase-col">
            <HeroShowcaseCarousel />
          </div>
        </div>
      </section>

      {/* 4 Pillars Trust Strip */}
      <section className="home-trust-strip">
        <div className="container trust-grid">
          <div className="trust-card">
            <div className="trust-icon-wrap">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4>Quality Materials</h4>
              <p>100% manufacturer authorized with test certs and GST bills</p>
            </div>
          </div>

          <div className="trust-card">
            <div className="trust-icon-wrap">
              <Clock size={20} />
            </div>
            <div>
              <h4>On-Time Delivery</h4>
              <p>Guaranteed site delivery slots to eliminate idle labor costs</p>
            </div>
          </div>

          <div className="trust-card">
            <div className="trust-icon-wrap">
              <Layers size={20} />
            </div>
            <div>
              <h4>Competitive Prices</h4>
              <p>Direct wholesale builder rates without multi-tier dealer markups</p>
            </div>
          </div>

          <div className="trust-card">
            <div className="trust-icon-wrap">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h4>Trusted Partner</h4>
              <p>Dedicated procurement coordinator tracking your casting dates</p>
            </div>
          </div>
        </div>
      </section>

      {/* Category Gateways */}
      <section className="home-categories-section">
        <div className="container">
          <div className="section-header-row">
            <div>
              <span className="badge-pill badge-orange-pill">Explore by Trade</span>
              <h2 className="section-title-clean">Everything You Need To Build. In One Place.</h2>
              <p className="section-subtitle-clean">
                Direct supply chains for every construction milestone from foundation to final sanitaryware.
              </p>
            </div>

            <Link to="/marketplace" className="view-all-link">
              <span>View All Products</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="category-cards-grid">
            {categoryCards.map((cat) => (
              <Link
                key={cat.id}
                to={`/marketplace?category=${cat.id}`}
                className="category-gateway-card"
              >
                <div className="category-img-wrapper">
                  <img src={cat.image} alt={cat.title} />
                  <span className="category-badge-chip">{cat.badge}</span>
                </div>
                <div className="category-card-info">
                  <h3 className="category-name">{cat.title}</h3>
                  <p className="category-sub">{cat.subtitle}</p>
                  <span className="explore-tag">Browse Category →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 16 Verified Brand Partners Ticker */}
      <section className="home-brands-strip">
        <div className="container">
          <div className="brands-intro">
            <span className="badge-pill">16 Authorized Brand Partners</span>
            <h3 className="brands-title">Top Brands. Genuine Products. One Source.</h3>
          </div>

          <div className="brands-logos-grid">
            {BRAND_LIST.map((brand) => (
              <Link
                key={brand.id}
                to={`/marketplace?brand=${encodeURIComponent(brand.name)}`}
                className="brand-badge-item"
                title={`Browse ${brand.name} Products`}
              >
                <div className="brand-logo-frame">
                  <BrandLogo id={brand.id} className="brand-logo-svg" />
                </div>
                <div className="brand-card-meta">
                  <span className="brand-tagline-text">{brand.tagline}</span>
                  <span className="brand-category-pill">{brand.category}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* "Why Make 5 Calls?" Highlight Teaser */}
      <section className="home-why-teaser-section">
        <div className="container why-teaser-box">
          <div className="why-teaser-content">
            <span className="badge-pill badge-orange-pill">The Material Square Difference</span>
            <h2>"Itna Kyu Bhagna? Sab Alag Alag Jagah."</h2>
            <p>
              Traditional building involves 5 separate calls, 5 different delivery schedules, multiple freight costs, and the risk of counterfeit materials. 
              Material Square consolidates your entire shopping list onto one truck with guaranteed site arrival.
            </p>
            <div className="why-actions">
              <Link to="/why-us" className="btn btn-primary">
                <span>See the 5-Call vs 1-Call Breakdown</span>
                <ArrowRight size={15} />
              </Link>
              <Link to="/guides" className="btn btn-secondary">
                <span>Explore Tools & Guides</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Live Site Deliveries Showcase Carousel (Auto + Manual Sliding) */}
      <SiteDeliveriesCarousel />

      {/* Engineering Tools Callout Strip */}
      <section className="home-tools-callout">
        <div className="container tools-callout-grid">
          <div className="tool-callout-card">
            <div className="tool-icon-box orange">
              <Zap size={22} />
            </div>
            <div>
              <h4>Wire Sizing Calculator</h4>
              <p>Calculate exact conductor gauge based on appliance wattage (1.0mm² to 16mm²).</p>
              <Link to="/guides?tab=wire" className="tool-card-link">
                Use Wire Calculator →
              </Link>
            </div>
          </div>

          <div className="tool-callout-card">
            <div className="tool-icon-box blue">
              <Droplet size={22} />
            </div>
            <div>
              <h4>Plumbing Basics & Compatibility</h4>
              <p>Compare PVC vs CPVC vs uPVC temperature limits and matched brass fittings.</p>
              <Link to="/guides?tab=plumbing" className="tool-card-link">
                View Plumbing Guide →
              </Link>
            </div>
          </div>

          <div className="tool-callout-card">
            <div className="tool-icon-box green">
              <Package size={22} />
            </div>
            <div>
              <h4>Site Wastage & Storage Tips</h4>
              <p>Field rules to prevent damaged pipes, bent lengths, and hardened cement bags.</p>
              <Link to="/guides?tab=storage" className="tool-card-link">
                Read Storage Rules →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Direct Quote Banner */}
      <section className="home-cta-banner">
        <div className="container banner-inner">
          <div>
            <span className="badge-pill badge-green-pill">Fast Site Quotation</span>
            <h2>"Ghar banana tha... Material ki list khatam hi nahi ho rahi!"</h2>
            <p>Send your handwritten list, architect schedule, or structural drawing to our WhatsApp desk for an immediate consolidated quote.</p>
          </div>
          <div className="banner-buttons">
            <Link to="/get-quote" className="btn btn-primary btn-lg">
              <FileText size={16} />
              <span>Get a Quote</span>
            </Link>
            <a
              href={COMPANY_INFO.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp btn-lg"
            >
              <WhatsAppIcon size={20} color="#ffffff" />
              <span>WhatsApp: {COMPANY_INFO.phoneDisplay}</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
