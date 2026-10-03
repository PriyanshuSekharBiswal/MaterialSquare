import type { MaterialItem, CatalogueProduct } from '../types';
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  ShieldCheck,
  Truck,
  Layers,
  Phone,
  CheckCircle2,
  FileText,
  Clock,
  Zap,
  Droplet,
  Package,
} from 'lucide-react';
import { COMPANY_INFO } from '../data/materialsData';
import { BRAND_LIST, BrandLogo } from '../components/icons/BrandBadges';
import HeroBuildingCanvas from '../components/HeroBuildingCanvas';
import SiteDeliveriesCarousel from '../components/SiteDeliveriesCarousel';
import SearchSuggestions from '../components/SearchSuggestions';
import WhatsAppIcon from '../components/icons/WhatsAppIcon';
import ArchitecturalTicker from '../components/ArchitecturalTicker';

export default function HomePage({ products, onOpenBOMDrawer, bomList = [], onToggleBOM }: { products: CatalogueProduct[]; onOpenBOMDrawer: () => void; bomList?: MaterialItem[]; onToggleBOM: (product: MaterialItem) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth < 992 : false;
  });
  const searchRef = useRef<HTMLFormElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 992);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSuggestionsOpen(false);
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
      subtitle: 'Cement, aggregates and construction materials',
      image: '/images/categories/cement-category.jpg',
      badge: 'Cement & aggregates',
    },
    {
      id: 'pipes',
      title: 'Pipes & Fittings',
      subtitle: 'Water supply, drainage and plumbing fittings',
      image: '/images/categories/pipes-category.jpg',
      badge: 'Pipes & fittings',
    },
    {
      id: 'wires',
      title: 'Wires & Electrical',
      subtitle: 'Wires, cables and electrical products',
      image: '/images/categories/wires-category.jpg',
      badge: 'Wires & electrical',
    },
    {
      id: 'paints',
      title: 'Paints & Wall Finishes',
      subtitle: 'Paints, wall finishes and surface preparation',
      image: '/images/categories/paints-category.jpg',
      badge: 'Paints & finishes',
    },
    {
      id: 'sanitary',
      title: 'Sanitaryware & Bath',
      subtitle: 'Bath fittings, sanitaryware and sinks',
      image: '/images/categories/sanitary-category.jpg',
      badge: 'Sanitaryware & bath',
    },
  ];

  return (
    <div className="home-page-container">
      {/* Hero Section */}
      <section className="home-hero-section">
        {/* Desktop: Full-bleed 3D Isometric Building Simulation */}
        {!isMobileView && (
          <div className="hero-desktop-canvas-wrap">
            <HeroBuildingCanvas centered={false} />
          </div>
        )}

        <div className="container hero-grid">
          {/* Mobile: 3D Building Showcase at the top before text */}
          {isMobileView && (
            <div className="hero-mobile-building-col">
              <div className="hero-mobile-building-frame">
                <HeroBuildingCanvas centered={true} />
              </div>
            </div>
          )}

          {/* Left Text */}
          <div className="hero-text-col">
            <div className="eyebrow-row reveal-text">
              <span className="badge-pill badge-orange-pill">Browse without an account</span>
              <span className="serving-text">Serving Delhi NCR</span>
            </div>

            <h1 className="hero-heading">
              <span className="ms-mask-line">Why Make 5 Calls?</span>
              <span className="ms-mask-line accent-text">One Call. All Materials.</span>
            </h1>

            <div className="hero-hindi-quote reveal-text">
              <span>"{COMPANY_INFO.sloganHindi}"</span>
            </div>

            <p className="hero-subtext reveal-text">
              Browse <strong>cement, steel, pipes, electricals, paints, and sanitaryware</strong> in one place.
              Save the products you need, then send your request to the Material Square team by WhatsApp or email.
              Staff confirms current price, stock, taxes, and delivery details with you.
            </p>

            {/* Quick Search with Autocomplete Suggestions */}
            <form ref={searchRef} onSubmit={handleSearchSubmit} className="hero-search-form">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search products or brands (e.g. UltraTech, Astral, Polycab)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSuggestionsOpen(true);
                }}
                onFocus={() => setIsSuggestionsOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsSuggestionsOpen(false);
                }}
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => {
                    setSearchQuery('');
                    setIsSuggestionsOpen(true);
                  }}
                  aria-label="Clear search input"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '0 8px',
                    fontSize: '14px',
                  }}
                >
                  ✕
                </button>
              )}
              <button type="submit" className="btn btn-primary search-submit-btn">
                Search
              </button>

              {/* Live Search Suggestions Dropdown */}
              <SearchSuggestions
                products={products}
                query={searchQuery}
                isOpen={isSuggestionsOpen}
                onSelectSuggestion={(val) => {
                  setSearchQuery(val);
                  setIsSuggestionsOpen(false);
                  navigate(`/marketplace?q=${encodeURIComponent(val)}`);
                }}
                onSelectCategory={(catId) => {
                  setIsSuggestionsOpen(false);
                  navigate(`/marketplace?category=${catId}`);
                }}
                onSelectBrand={(brandName) => {
                  setIsSuggestionsOpen(false);
                  navigate(`/marketplace?brand=${encodeURIComponent(brandName)}`);
                }}
                onSelectProduct={(product) => {
                  setIsSuggestionsOpen(false);
                  navigate(`/marketplace?q=${encodeURIComponent(product.name)}`);
                }}
              />
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

          {/* Right Visual Column (Space reserved for 3D building rendering) */}
          <div className="hero-showcase-col" aria-hidden="true" />
        </div>
      </section>

      {/* Seamless Architectural Materials Ticker Marquee (Inspired by materialsquare.in) */}
      <ArchitecturalTicker />

      {/* 4 Pillars Trust Strip */}
      <section className="home-trust-strip">
        <div className="container trust-grid reveal-stagger">
          <div className="trust-card">
            <div className="trust-icon-wrap">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4>Browse by category</h4>
              <p>Explore construction materials and review listed product details.</p>
            </div>
          </div>

          <div className="trust-card">
            <div className="trust-icon-wrap">
              <Clock size={20} />
            </div>
            <div>
              <h4>Save a material list</h4>
              <p>Sign in to keep your selected materials with your account.</p>
            </div>
          </div>

          <div className="trust-card">
            <div className="trust-icon-wrap">
              <Layers size={20} />
            </div>
            <div>
              <h4>Review listed prices</h4>
              <p>Prices show the unit and any staff-provided tax or offer note.</p>
            </div>
          </div>

          <div className="trust-card">
            <div className="trust-icon-wrap">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h4>Contact the team</h4>
              <p>Prepare a request and continue the conversation by WhatsApp or email.</p>
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
              <h2 className="section-title-clean reveal-title">Everything You Need To Build. In One Place.</h2>
              <p className="section-subtitle-clean reveal-text">
                Browse material categories and check the current product listings.
              </p>
            </div>

            <Link to="/marketplace" className="view-all-link">
              <span>View All Products</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="category-cards-grid reveal-stagger">
            {categoryCards.map((cat) => (
              <Link
                key={cat.id}
                to={`/marketplace?category=${cat.id}`}
                className="category-gateway-card"
              >
                <div className="category-img-wrapper">
                  <img src={cat.image} alt={cat.title} loading="lazy" />
                  <span className="category-image-note">Illustrative image</span>
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

      {/* Brand Directory */}
      <section className="home-brands-strip">
        <div className="container">
          <div className="brands-intro">
            <span className="badge-pill">Browse by brand</span>
            <h3 className="brands-title reveal-title">Find products from familiar brands.</h3>
          </div>

          <div className="brands-logos-grid reveal-stagger">
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
            <h2 className="reveal-title">"Itna Kyu Bhagna? Sab Alag Alag Jagah."</h2>
            <p className="reveal-text">
              Keep your material request organized in one list. Review product details, then contact the team to confirm price,
              availability, taxes, and delivery for your site.
            </p>
            <div className="why-actions">
              <Link to="/why-us" className="btn btn-primary">
                <span>See how the website works</span>
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
        <div className="container tools-callout-grid reveal-stagger">
          <div className="tool-callout-card">
            <div className="tool-icon-box orange">
              <Zap size={22} />
            </div>
            <div>
              <h4>Wire Sizing Examples</h4>
              <p>Review illustrative cable-sizing examples. Confirm conductor selection with a qualified electrician.</p>
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
              <h4>Pipe Types & Fittings</h4>
              <p>Explore common PVC, CPVC and uPVC systems. Confirm compatibility with manufacturer information.</p>
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
              <h4>Site Material Handling</h4>
              <p>Read material storage examples and follow the product instructions for your site.</p>
              <Link to="/guides?tab=storage" className="tool-card-link">
                Read Storage Rules →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Material Request Banner */}
      <section className="home-cta-banner">
        <div className="container banner-inner">
          <div>
            <span className="badge-pill badge-green-pill">Prepare a material request</span>
            <h2 className="reveal-title">"Ghar banana tha... Material ki list khatam hi nahi ho rahi!"</h2>
            <p className="reveal-text">Add products to your list or describe your requirements. Review the message, then send it to the team by WhatsApp or email.</p>
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
              <span>Connect on WhatsApp</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
