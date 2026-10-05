import {
  homeContentBlocks,
  homepageSectionOrder,
} from "@material-square/types";
import type { MaterialItem, CatalogueProduct } from "../types";
import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { BrandLogo, getBrandMeta } from "../components/icons/BrandBadges";
import HeroBuildingCanvas from "../components/HeroBuildingCanvas";
import SearchSuggestions from "../components/SearchSuggestions";
import WhatsAppIcon from "../components/icons/WhatsAppIcon";
import ArchitecturalTicker from "../components/ArchitecturalTicker";
import { useSiteContent } from "../site-content";
import { whatsappLink } from "../messages";

export default function HomePage({
  products,
  onOpenBOMDrawer,
  bomList = [],
  onToggleBOM,
}: {
  products: CatalogueProduct[];
  onOpenBOMDrawer: () => void;
  bomList?: MaterialItem[];
  onToggleBOM: (product: MaterialItem) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const siteContent = useSiteContent();
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(() => {
    return typeof window !== "undefined" ? window.innerWidth < 992 : false;
  });
  const searchRef = useRef<HTMLFormElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 992);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSuggestionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSuggestionsOpen(false);
    if (searchQuery.trim()) {
      navigate(`/marketplace?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/marketplace");
    }
  };

  const categoryImages: Record<string, string> = {
    cement: "/images/categories/cement-category.jpg",
    pipes: "/images/categories/pipes-category.jpg",
    wires: "/images/categories/wires-category.jpg",
    steel: "/images/categories/wires-category.jpg",
    paints: "/images/categories/paints-category.jpg",
    sanitary: "/images/categories/sanitary-category.jpg",
    adhesives: "/images/categories/pipes-category.jpg",
  };
  const categoryCards = Array.from(
    new Map(products.map((product) => [product.category, product.categoryLabel])).entries(),
  ).map(([id, title]) => ({
    id,
    title,
    subtitle: `Browse ${title.toLowerCase()} available in the catalogue.`,
    image: categoryImages[id],
    badge: title,
  }));
  const listedBrands = Array.from(
    new Map(products.filter((product) => product.brand.trim()).map((product) => [product.brand, product.categoryLabel])).entries(),
  ).map(([name, category]) => ({ name, category, meta: getBrandMeta(name) }));
  const searchBrandExamples = listedBrands
    .slice(0, 3)
    .map((brand) => brand.name)
    .join(", ");
  const customContentBlocks = homeContentBlocks(
    siteContent["home.contentBlocks"],
  ).filter((block) => block.visible);

  const sections: Record<string, import("react").ReactNode> = {
    hero: (
      <section className="home-hero-section">
        {siteContent["home.heroImage"] && (
          <img
            className="home-hero-image"
            src={siteContent["home.heroImage"]}
            alt=""
            aria-hidden="true"
          />
        )}
        {/* Desktop: Full-bleed 3D Isometric Building Simulation (borderless, full scale) */}
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
              <span className="badge-pill badge-orange-pill">
                {siteContent["home.eyebrow"]}
              </span>
              <span className="serving-text">Browse published inventory</span>
            </div>

            <h1 className="hero-heading">
              {siteContent["home.title"].split("\n").map((line, index) => (
                <span
                  className={`ms-mask-line${index ? " accent-text" : ""}`}
                  key={index}
                >
                  {line}
                </span>
              ))}
            </h1>

            {siteContent["home.slogan"] && <div className="hero-hindi-quote reveal-text">
              <span>"{siteContent["home.slogan"]}"</span>
            </div>}

            <p className="hero-subtext reveal-text">
              {siteContent["home.description"]}
            </p>

            {/* Quick Search with Autocomplete Suggestions */}
            <form
              ref={searchRef}
              onSubmit={handleSearchSubmit}
              className="hero-search-form"
            >
              <Search size={18} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder={`Search products or brands${searchBrandExamples ? ` (e.g. ${searchBrandExamples})` : ""}...`}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSuggestionsOpen(true);
                }}
                onFocus={() => setIsSuggestionsOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setIsSuggestionsOpen(false);
                }}
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => {
                    setSearchQuery("");
                    setIsSuggestionsOpen(true);
                  }}
                  aria-label="Clear search input"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    padding: "0 8px",
                    fontSize: "14px",
                  }}
                >
                  ✕
                </button>
              )}
              <button
                type="submit"
                className="btn btn-primary search-submit-btn"
              >
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
                  navigate(
                    `/marketplace?brand=${encodeURIComponent(brandName)}`,
                  );
                }}
                onSelectProduct={(product) => {
                  setIsSuggestionsOpen(false);
                  navigate(
                    `/marketplace?q=${encodeURIComponent(product.name)}`,
                  );
                }}
              />
            </form>

            {/* Quick Action Buttons */}
            <div className="hero-cta-group">
              <Link
                to={siteContent["home.primaryCtaPath"]}
                className="btn btn-primary btn-lg"
              >
                <span>{siteContent["home.primaryCtaLabel"]}</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                to={siteContent["home.secondaryCtaPath"]}
                className="btn btn-secondary btn-lg"
              >
                <FileText size={16} />
                <span>{siteContent["home.secondaryCtaLabel"]}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    ),
    trust: (
      <section className="home-trust-strip">
        <div className="container trust-grid reveal-stagger">
          <div className="trust-card">
            <div className="trust-icon-wrap">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4>Browse by category</h4>
              <p>
                Explore construction materials and review listed product
                details.
              </p>
            </div>
          </div>

          <div className="trust-card">
            <div className="trust-icon-wrap">
              <Clock size={20} />
            </div>
            <div>
              <h4>Save a material list</h4>
              <p>Your selected materials stay in this browser while you browse.</p>
            </div>
          </div>

          <div className="trust-card">
            <div className="trust-icon-wrap">
              <Layers size={20} />
            </div>
            <div>
              <h4>Review listed prices</h4>
              <p>
                Prices show the unit and any staff-provided tax or offer note.
              </p>
            </div>
          </div>

          <div className="trust-card">
            <div className="trust-icon-wrap">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h4>Contact the team</h4>
              <p>
                Prepare a request and continue the conversation by WhatsApp or
                email.
              </p>
            </div>
          </div>
        </div>
      </section>
    ),
    categories: (
      <section className="home-categories-section">
        <div className="container">
          <div className="section-header-row">
            <div>
              <span className="badge-pill badge-orange-pill">
                Explore by Trade
              </span>
              <h2 className="section-title-clean reveal-title">
                Browse materials from the current catalogue.
              </h2>
              <p className="section-subtitle-clean reveal-text">
                Browse material categories and check the current product
                listings.
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
                  {cat.image && <img src={cat.image} alt="" loading="lazy" />}
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
    ),
    brands: (
      <section className="home-brands-strip">
        <div className="container">
          <div className="brands-intro">
            <span className="badge-pill">Browse by brand</span>
            <h3 className="brands-title reveal-title">
              Find products from familiar brands.
            </h3>
          </div>

          <div className="brands-logos-grid reveal-stagger">
            {listedBrands.map((brand) => (
              <Link
                key={brand.name}
                to={`/marketplace?brand=${encodeURIComponent(brand.name)}`}
                className="brand-badge-item"
                title={`Browse ${brand.name} Products`}
              >
                <div className="brand-logo-frame" aria-label={brand.name}>
                  <BrandLogo id={brand.meta?.id || brand.name} className="brand-logo-svg" />
                </div>
                <div className="brand-card-meta">
                  <span className="brand-tagline-text">{brand.name}</span>
                  <span className="brand-category-pill">{brand.category}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    ),
    why: (
      <section className="home-why-teaser-section">
        <div className="container why-teaser-box">
          <div className="why-teaser-content">
            <span className="badge-pill badge-orange-pill">
              The Material Square Difference
            </span>
            <h2 className="reveal-title">
              "Itna Kyu Bhagna? Sab Alag Alag Jagah."
            </h2>
            <p className="reveal-text">
              Keep your material request organized in one list. Review product
              details, then contact the team to confirm price, availability,
              taxes, and delivery for your site.
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
    ),
    tools: (
      <section className="home-tools-callout">
        <div className="container tools-callout-grid reveal-stagger">
          <div className="tool-callout-card">
            <div className="tool-icon-box orange">
              <Zap size={22} />
            </div>
            <div>
              <h4>Wire Sizing Examples</h4>
              <p>
                Use our wire selection checklist to discuss your requirements
                with a qualified electrician.
              </p>
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
              <p>
                Explore common PVC, CPVC and uPVC systems. Confirm compatibility
                with manufacturer information.
              </p>
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
              <p>
                Read material storage examples and follow the product
                instructions for your site.
              </p>
              <Link to="/guides?tab=storage" className="tool-card-link">
                Read Storage Rules →
              </Link>
            </div>
          </div>
        </div>
      </section>
    ),
    contact: (
      <section className="home-cta-banner">
        <div className="container banner-inner">
          <div>
            <span className="badge-pill badge-green-pill">
              {siteContent["home.calloutBadge"]}
            </span>
            <h2 className="reveal-title">{siteContent["home.calloutTitle"]}</h2>
            <p className="reveal-text">
              {siteContent["home.calloutDescription"]}
            </p>
          </div>
          <div className="banner-buttons">
            <Link
              to={siteContent["home.calloutButtonPath"]}
              className="btn btn-primary btn-lg"
            >
              <FileText size={16} />
              <span>{siteContent["home.calloutButton"]}</span>
            </Link>
            {siteContent["contact.phone"] && <a
              href={whatsappLink("Material Square — General Enquiry", siteContent["contact.phone"])}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp btn-lg"
            >
              <WhatsAppIcon size={20} color="#ffffff" />
              <span>Connect on WhatsApp</span>
            </a>}
          </div>
        </div>
      </section>
    ),
    content: customContentBlocks.length ? (
      <section className="home-custom-content-section">
        <div className="container home-custom-content-grid">
          {customContentBlocks.map((block) => (
            <article className="home-custom-content-card" key={block.id}>
              <h2>{block.title}</h2>
              <p>{block.body}</p>
              {block.buttonLabel && block.buttonPath && (
                <Link to={block.buttonPath} className="btn btn-secondary">
                  {block.buttonLabel}
                  <ArrowRight size={15} />
                </Link>
              )}
            </article>
          ))}
        </div>
      </section>
    ) : null,
  };
  const hidden = new Set(siteContent["home.hiddenSections"].split(","));
  return (
    <div className="home-page-container">
      {homepageSectionOrder(siteContent["home.sectionOrder"])
        .filter((id) => !hidden.has(id))
        .map((id) => (
          <div key={id} style={{ display: "contents" }}>
            {sections[id]}
          </div>
        ))}
    </div>
  );
}
