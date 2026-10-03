import { productMessage, whatsappLink } from '../messages';
import type { MaterialItem, CatalogueProduct } from '../types';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Check,
  Plus,
  Info,
  ClipboardList,
  X,
  Phone,
  Package,
} from 'lucide-react';
import { COMPANY_INFO } from '../data/materialsData';
import { BRAND_LIST, BrandLogo, getBrandMeta } from '../components/icons/BrandBadges';
import BrandRoster from '../components/BrandRoster';
import SearchSuggestions from '../components/SearchSuggestions';
import WhatsAppIcon from '../components/icons/WhatsAppIcon';

export default function MarketplacePage({
  bomList = [],
  products,
  onToggleBOM,
  onOpenProductModal,
  onOpenBOMDrawer,
}: { products: CatalogueProduct[]; bomList?: MaterialItem[]; onToggleBOM: (product: MaterialItem) => void; onOpenProductModal: (product: CatalogueProduct) => void; onOpenBOMDrawer: () => void }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';
  const initialBrand = searchParams.get('brand') || '';
  const initialQuery = searchParams.get('q') || '';

  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [selectedBrand, setSelectedBrand] = useState(initialBrand);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [isStickyDismissed, setIsStickyDismissed] = useState(false);
  const prevBomCountRef = useRef(bomList.length);
  const searchRef = useRef<HTMLDivElement>(null);
  const catalogueCategories = useMemo(() => [
    { id: 'all', label: 'All Materials', count: products.length },
    ...Array.from(new Map(products.map((product) => [product.category, product.categoryLabel])).entries())
      .map(([id, label]) => ({ id, label, count: products.filter((product) => product.category === id).length })),
  ], [products]);

  // If user adds new items to BOM, re-show notification bar if it was dismissed
  useEffect(() => {
    if (bomList.length > prevBomCountRef.current) {
      setIsStickyDismissed(false);
    }
    prevBomCountRef.current = bomList.length;
  }, [bomList.length]);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync state when URL params change
  useEffect(() => {
    setActiveCategory(searchParams.get('category') || 'all');
    setSelectedBrand(searchParams.get('brand') || '');
    setSearchQuery(searchParams.get('q') || '');
  }, [searchParams]);

  // Handle category change
  const handleCategoryChange = (catId: string) => {
    setActiveCategory(catId);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (catId === 'all') {
        p.delete('category');
      } else {
        p.set('category', catId);
      }
      return p;
    });
  };

  // Handle brand filter
  const handleBrandChange = (brandName: string) => {
    setSelectedBrand(brandName);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (!brandName) {
        p.delete('brand');
      } else {
        p.set('brand', brandName);
      }
      return p;
    });
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      // Category filter
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }

      // Brand filter
      if (selectedBrand && !item.brand.toLowerCase().includes(selectedBrand.toLowerCase())) {
        return false;
      }

      // In-stock filter
      if (onlyInStock && !item.inStock) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(q);
        const matchBrand = item.brand.toLowerCase().includes(q);
        const matchCode = item.code.toLowerCase().includes(q);
        const matchGrade = item.grade ? item.grade.toLowerCase().includes(q) : false;
        const matchFeatures = item.features ? item.features.some((f) => f.toLowerCase().includes(q)) : false;
        const matchVariant = (item.variants || []).some(variant => variant.label.toLowerCase().includes(q) || Object.values(variant.attributes || {}).some(value => value.toLowerCase().includes(q)));
        return matchName || matchBrand || matchCode || matchGrade || matchFeatures || matchVariant;
      }

      return true;
    });
  }, [products, activeCategory, selectedBrand, onlyInStock, searchQuery]);

  // Check if item in BOM
  const isItemInBOM = (id: string) => bomList.some((item) => (item.catalogueId || item.id) === id);

  // Clear all filters
  const handleResetFilters = () => {
    setActiveCategory('all');
    setSelectedBrand('');
    setSearchQuery('');
    setOnlyInStock(false);
    setSearchParams({});
  };

  return (
    <div className="marketplace-page">
      {/* Page Header */}
      <section className="page-hero-header">
        <div className="container">
          <div className="page-hero-content">
            <span className="badge-pill badge-orange-pill reveal-text">Material Square marketplace</span>
            <h1 className="page-title">
              <span className="ms-mask-line">
                <span className="ms-mask-text">Construction Materials Catalog</span>
              </span>
            </h1>
            <p className="page-subtitle reveal-text">
              Browse construction materials, compare size and pack options, and save selections to your material list. Preview prices are indicative; confirm the current price, tax, stock and delivery with staff.
            </p>

            <div className="page-hero-metrics reveal-stagger">
              <div className="metric-tag">
                <Search size={14} className="metric-icon" />
                <span>Browse without signing in</span>
              </div>
              <div className="metric-tag">
                <ClipboardList size={14} className="metric-icon" />
                <span>Save a material list with an account</span>
              </div>
              <div className="metric-tag">
                <Phone size={14} className="metric-icon" />
                <span>Confirm details with the team</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog Section */}
      <section className="marketplace-main-section">
        <div className="container">
          {/* Controls Bar: Search, Category Tabs, Brand Filter */}
          <div className="catalog-controls-card reveal-card">
            {/* Search and Brand row */}
            <div className="controls-top-row">
              <div ref={searchRef} className="search-field-wrap">
                <Search size={18} className="search-field-icon" />
                <input
                  type="text"
                  placeholder="Search by material, brand, IS standard (e.g. UltraTech, Fe 550D, CPVC, 2.5mm)..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSuggestionsOpen(true);
                  }}
                  onFocus={() => setIsSuggestionsOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setIsSuggestionsOpen(false);
                  }}
                  className="catalog-search-input"
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setIsSuggestionsOpen(true);
                    }}
                    className="search-clear-btn"
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}

                {/* Instant Search Suggestions Dropdown */}
                <SearchSuggestions
                  products={products}
                  query={searchQuery}
                  isOpen={isSuggestionsOpen}
                  onSelectSuggestion={(val) => {
                    setSearchQuery(val);
                    setIsSuggestionsOpen(false);
                    setSearchParams((prev) => {
                      const p = new URLSearchParams(prev);
                      p.set('q', val);
                      return p;
                    });
                  }}
                  onSelectCategory={(catId) => {
                    setIsSuggestionsOpen(false);
                    handleCategoryChange(catId);
                  }}
                  onSelectBrand={(brandName) => {
                    setIsSuggestionsOpen(false);
                    handleBrandChange(brandName);
                  }}
                  onSelectProduct={(product) => {
                    setIsSuggestionsOpen(false);
                    if (onOpenProductModal) {
                      onOpenProductModal(product);
                    } else {
                      setSearchQuery(product.name);
                    }
                  }}
                />
              </div>

              {/* Brand Selector */}
              <div className="brand-select-wrap">
                <select
                  value={selectedBrand}
                  onChange={(e) => handleBrandChange(e.target.value)}
                  className="brand-dropdown-select"
                  aria-label="Filter by Manufacturer Brand"
                >
                  <option value="">All 16 Brands</option>
                  {BRAND_LIST.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name} ({b.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* In-Stock Toggle */}
              <label className="instock-checkbox-label">
                <input
                  type="checkbox"
                  checked={onlyInStock}
                  onChange={(e) => setOnlyInStock(e.target.checked)}
                />
                <span>Ready Depot Stock</span>
              </label>

              {(activeCategory !== 'all' || selectedBrand || searchQuery || onlyInStock) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="reset-filters-btn"
                >
                  <X size={14} /> Reset Filters
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="category-chips-scroll">
              {catalogueCategories.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`category-chip ${isActive ? 'active' : ''}`}
                    onClick={() => handleCategoryChange(cat.id)}
                  >
                    <span>{cat.label}</span>
                    <span className="chip-count">
                      {cat.id === 'all'
                        ? products.length
                        : products.filter((p) => p.category === cat.id).length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Interactive Brand Quick Logos Filter Strip */}
            <div className="marketplace-brand-filter-row">
              <div className="brand-filter-row-header">
                <span className="brand-filter-label">Filter by Brand:</span>
                {selectedBrand && (
                  <button
                    type="button"
                    className="clear-brand-chip-btn"
                    onClick={() => handleBrandChange('')}
                  >
                    <span>Clear Filter ({selectedBrand})</span>
                    <X size={12} />
                  </button>
                )}
              </div>
              <div className="brand-filter-chips-scroll">
                <button
                  type="button"
                  className={`brand-chip-btn ${!selectedBrand ? 'active' : ''}`}
                  onClick={() => handleBrandChange('')}
                >
                  <span>All Brands</span>
                </button>
                {BRAND_LIST.map((b) => {
                  const isSelected = selectedBrand.toLowerCase() === b.name.toLowerCase() || (selectedBrand && b.name.toLowerCase().includes(selectedBrand.toLowerCase()));
                  return (
                    <button
                      key={b.id}
                      type="button"
                      className={`brand-chip-btn ${isSelected ? 'active' : ''}`}
                      onClick={() => handleBrandChange(isSelected ? '' : b.name)}
                      title={`${b.name} — ${b.tagline}`}
                    >
                      <div className="brand-chip-logo-box">
                        <BrandLogo id={b.id} className="brand-chip-svg" />
                      </div>
                      <span className="brand-chip-name">{b.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Results Summary Bar */}
          <div className="results-summary-row reveal-text">
            <span className="results-count-text">
              Showing <strong>{filteredProducts.length}</strong> listed materials
              {activeCategory !== 'all' && ` in ${catalogueCategories.find((c) => c.id === activeCategory)?.label}`}
              {selectedBrand && ` by ${selectedBrand}`}
            </span>

            <div className="dispatch-help-note">
              <span>Need a custom quantity or site delivery information?</span>
              <a href={`tel:${COMPANY_INFO.phone}`} className="phone-quick-link">
                <Phone size={13} /> {COMPANY_INFO.phoneDisplay}
              </a>
            </div>
          </div>

          {/* Products Grid */}
          {filteredProducts.length > 0 ? (
            <div className="products-directory-grid reveal-stagger">
              {filteredProducts.map((product) => {
                const inBOM = isItemInBOM(product.id);
                const brandMeta = getBrandMeta(product.brand);
                return (
                  <div key={product.id} className="catalog-product-card">
                    {/* Top Image & Category Pill */}
                    <div className="product-media-box">
                      <img src={product.image} alt={product.name} loading="lazy" />{product.image.includes('illustration') && <span className="product-image-note">Illustrative image · confirm selected size</span>}
                      <div className="media-overlay-tags">
                        <span className="product-cat-tag">{product.categoryLabel}</span>
                        {product.inStock && (
                          <span className="stock-status-tag">
                            <span className="pulse-dot"></span> In Stock
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content Box */}
                    <div className="product-card-body">
                      <div className="brand-code-line">
                        <div className="brand-title-badge">
                          <div className="brand-mini-logo-frame">
                            <BrandLogo id={brandMeta?.id} className="brand-mini-svg" />
                          </div>
                          <span className="brand-title">{product.brand}</span>
                        </div>
                        <span className="product-sku-code">{product.code}</span>
                      </div>

                      <h3 className="product-card-title">{product.name}</h3>
                      {product.specs?.sizes && <p className="product-size-guide">Size guide: {product.specs.sizes}. Specify your requirement in product details.</p>}

                      {product.grade && (
                        <div className="grade-badge-chip">
                          <span>{product.grade}</span>
                        </div>
                      )}

                      {/* Key features */}
                      <ul className="product-features-preview">
                        {product.features.slice(0, 2).map((feat, idx) => (
                          <li key={idx}>
                            <Check size={13} className="check-icon-green" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Technical Specs Preview */}
                      <div className="product-spec-preview-box">
                        <div className="spec-item">
                          <span className="spec-label">Packaging:</span>
                          <span className="spec-val">{product.unit}</span>
                        </div>
                        {product.specs?.standard && (
                          <div className="spec-item">
                            <span className="spec-label">IS Standard:</span>
                            <span className="spec-val font-mono">{product.specs.standard}</span>
                          </div>
                        )}
                      </div>

                      {/* Pricing & Min Order */}
                      <div className="pricing-row">
                        <div>
                          <span className="rate-caption">{product.price == null && product.variants?.some(variant => variant.price != null) ? 'Starting from' : product.price == null ? 'Wholesale pricing' : 'Price per unit'}</span>
                          <span className="rate-amount">
                            {product.price == null ? product.variants?.some(variant => variant.price != null) ? `₹${Math.min(...product.variants.filter(variant => variant.price != null).map(variant => Number(variant.price))).toLocaleString('en-IN')}` : 'Contact for price' : `₹${Number(product.price).toLocaleString('en-IN')}`}
                          </span>
                          {product.compareAtPrice != null && product.price != null && Number(product.compareAtPrice) > Number(product.price) && (
                            <span className="catalogue-list-price"><del>₹{Number(product.compareAtPrice).toLocaleString('en-IN')}</del>{product.offerLabel && <strong>{product.offerLabel}</strong>}</span>
                          )}
                          {(product.price != null || product.variants?.some(variant => variant.price != null)) && <small className="catalogue-price-caveat">{product.priceNote || product.variants?.find(variant => variant.price != null)?.priceNote || "Final availability, GST and delivery charges confirmed by staff."}</small>}
                        </div>
                        <div className="min-order-pill">
                          <Package size={12} />
                          <span>MOQ: {product.minOrderQty}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="product-actions-grid">
                        <button
                          type="button"
                          className="btn-card-specs"
                          onClick={() => onOpenProductModal(product)}
                        >
                          <Info size={14} /> Specs
                        </button>

                        <button
                          type="button"
                          className={`btn-card-bom ${inBOM ? 'in-bom' : ''}`}
                          onClick={() => onToggleBOM(product)}
                        >
                          {inBOM ? (
                            <>
                              <Check size={14} /> Added to List
                            </>
                          ) : (
                            <>
                              <Plus size={14} /> {product.specs?.sizes ? "Choose size" : "Add to List"}
                            </>
                          )}
                        </button>

                        <a
                          href={whatsappLink(productMessage(product))}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-card-whatsapp"
                          title="Ask about this product on WhatsApp"
                        >
                          <WhatsAppIcon size={16} color="currentColor" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-products-state">
              <Package size={48} className="empty-icon" />
              <h3>No materials match your current criteria</h3>
              <p>Try adjusting your filters or contact the team to ask about an item that is not listed.</p>
              <div className="empty-state-actions">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="btn btn-secondary"
                >
                  Clear All Filters
                </button>
                <a
                  href={`https://wa.me/919773505015?text=${encodeURIComponent(
                    `Hello Material Square, I am looking for a material not listed: "${searchQuery}". Can you supply this to my site?`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-whatsapp"
                >
                  <WhatsAppIcon size={18} color="#ffffff" />
                  <span>Request Custom Material on WhatsApp</span>
                </a>
              </div>
            </div>
          )}

        </div>
      </section>

      {/* Authorized Manufacturer Partner Directory */}
      <BrandRoster onSelectBrand={handleBrandChange} selectedBrand={selectedBrand} />

      {/* Sticky BOM trigger floating bottom bar if items in list and not dismissed (Rendered via Portal to document.body so it is perfectly fixed to the viewport) */}
      {typeof document !== 'undefined' &&
        bomList.length > 0 &&
        !isStickyDismissed &&
        createPortal(
          <div className="sticky-bom-notification-bar" role="region" aria-label="Material List Notification">
            <div className="sticky-bom-content">
              <div className="sticky-bom-info">
                <span className="badge-count-pill">{bomList.length}</span>
                <div className="sticky-bom-text-wrap">
                  <strong className="sticky-bom-title">
                    {bomList.length} item{bomList.length > 1 ? 's' : ''} in your Material List
                  </strong>
                  <span className="sticky-bom-sub">Review your list and send it to the team</span>
                </div>
              </div>

              <div className="sticky-bom-actions">
                <button
                  type="button"
                  className="btn btn-primary sticky-bom-view-btn"
                  onClick={onOpenBOMDrawer}
                >
                  View Material List
                </button>
                <button
                  type="button"
                  className="sticky-bom-close-btn"
                  onClick={() => setIsStickyDismissed(true)}
                  title="Dismiss notification"
                  aria-label="Close notification"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
