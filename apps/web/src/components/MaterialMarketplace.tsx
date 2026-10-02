import type { MaterialItem, CatalogueProduct } from '../types';
import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Layers,
  MessageCircle,
  Plus,
  Check,
  Info,
  Truck,
  ShieldCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { CATEGORIES, PRODUCTS, COMPANY_INFO } from '../data/materialsData';
import { BrandLogo, getBrandMeta } from './icons/BrandBadges';

export default function MaterialMarketplace({
  searchQuery,
  setSearchQuery,
  selectedBrand,
  setSelectedBrand,
  onOpenProductModal,
  bomList,
  onToggleBOM,
}: { searchQuery: string; setSearchQuery: (query: string) => void; selectedBrand: string; setSelectedBrand: (brand: string) => void; onOpenProductModal: (product: CatalogueProduct) => void; bomList: MaterialItem[]; onToggleBOM: (product: MaterialItem) => void }) {
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Filter & Search Logic
  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((item) => {
      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      // Brand filter
      if (selectedBrand && !item.brand.toLowerCase().includes(selectedBrand.toLowerCase())) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(q);
        const matchBrand = item.brand.toLowerCase().includes(q);
        const matchCategory = item.categoryLabel.toLowerCase().includes(q);
        const matchGrade = item.grade.toLowerCase().includes(q);
        const matchCode = item.code.toLowerCase().includes(q);
        return matchName || matchBrand || matchCategory || matchGrade || matchCode;
      }

      return true;
    });
  }, [selectedCategory, selectedBrand, searchQuery]);

  const bomIds = useMemo(() => new Set(bomList.map((item) => item.id)), [bomList]);

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedBrand('');
    setSearchQuery('');
  };

  const hasActiveFilters = selectedCategory !== 'all' || Boolean(selectedBrand) || Boolean(searchQuery.trim());

  return (
    <section id="marketplace" className="ms-marketplace-section">
      <div className="container">
        {/* Header */}
        <div className="marketplace-section-header">
          <div>
            <span className="badge-orange">Direct Factory Sourced</span>
            <h2 className="section-title">Construction Material Marketplace</h2>
            <p className="section-subtitle">
              Browse wholesale building supplies with direct dispatch across Delhi NCR. Add to your project list or request an instant WhatsApp quotation.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="marketplace-stats-badge">
            <span className="stat-highlight">18+ Core Specs</span>
            <span className="stat-sub">100% Authorized Stock</span>
          </div>
        </div>

        {/* Category Navigation Bar */}
        <div className="category-tabs-scroll">
          <div className="category-tabs-row">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`category-tab-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <span>{cat.label}</span>
                <span className="tab-count-badge">
                  {cat.id === 'all'
                    ? PRODUCTS.length
                    : PRODUCTS.filter((p) => p.category === cat.id).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Active Filter Bar */}
        <div className="marketplace-toolbar">
          <div className="toolbar-left">
            <span className="results-counter">
              Showing <strong>{filteredProducts.length}</strong> of {PRODUCTS.length} construction materials
            </span>

            {hasActiveFilters && (
              <div className="active-tag-pills">
                {selectedCategory !== 'all' && (
                  <span className="active-tag">
                    Category: {CATEGORIES.find((c) => c.id === selectedCategory)?.label}
                    <button type="button" onClick={() => setSelectedCategory('all')}>×</button>
                  </span>
                )}
                {selectedBrand && (
                  <span className="active-tag">
                    Brand: {selectedBrand}
                    <button type="button" onClick={() => setSelectedBrand('')}>×</button>
                  </span>
                )}
                {searchQuery && (
                  <span className="active-tag">
                    Search: "{searchQuery}"
                    <button type="button" onClick={() => setSearchQuery('')}>×</button>
                  </span>
                )}
              </div>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              className="clear-all-filters-btn"
              onClick={handleResetFilters}
            >
              <RotateCcw size={14} /> Clear Filters
            </button>
          )}
        </div>

        {/* Product Cards Grid */}
        {filteredProducts.length > 0 ? (
          <div className="marketplace-cards-grid">
            {filteredProducts.map((product) => {
              const inBOM = bomIds.has(product.id);
              const waQuoteUrl = `https://wa.me/919773505015?text=Hello%20Material%20Square,%20I%20want%20to%20get%20wholesale%20site%20pricing%20for:%20${encodeURIComponent(product.name)}%20(${product.code})`;

              return (
                <div key={product.id} className="ms-product-card">
                  {/* Product Visual Container */}
                  <div className="product-media-box" onClick={() => onOpenProductModal(product)}>
                    <img
                      src={product.image}
                      alt={product.name}
                      className="product-img"
                      loading="lazy"
                    />{product.image.includes('illustration') && <span className="product-image-note">Illustrative product image</span>}

                    {/* Top Badges */}
                    <div className="product-badges-overlay">
                      <span className="product-code-pill mono">{product.code}</span>
                      <span className="product-stock-pill">
                        <Truck size={12} /> {product.dispatchTime}
                      </span>
                    </div>

                    <div className="product-hover-mask">
                      <span className="view-spec-action">
                        <Info size={15} /> View Technical Spec Sheet
                      </span>
                    </div>
                  </div>

                  {/* Product Content Details */}
                  <div className="product-card-body">
                    <div className="product-brand-strip">
                      <div className="brand-title-badge">
                        <div className="brand-mini-logo-frame">
                          <BrandLogo id={getBrandMeta(product.brand)?.id} className="brand-mini-svg" />
                        </div>
                        <span className="product-brand-name">{product.brand}</span>
                      </div>
                      <span className="product-unit-tag">{product.unit}</span>
                    </div>

                    <h3
                      className="product-title"
                      onClick={() => onOpenProductModal(product)}
                      title={product.name}
                    >
                      {product.name}
                    </h3>

                    <p className="product-grade-line">
                      <strong>Grade:</strong> {product.grade}
                    </p>

                    {/* Feature Bullets */}
                    <ul className="product-features-list">
                      {product.features.slice(0, 2).map((feat, idx) => (
                        <li key={idx}>
                          <Check size={12} className="feat-check" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Rate & Packaging Row */}
                    <div className="product-pricing-strip">
                      <div className="rate-info">
                        <span className="rate-label">Wholesale Rate:</span>
                        <span className="rate-value mono">{'Request a quotation'}</span>
                      </div>
                      <span className="min-order-pill">Min: {product.minOrderQty}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="product-card-actions">
                      <button
                        type="button"
                        className={`btn btn-sm ${inBOM ? 'btn-in-bom' : 'btn-outline'}`}
                        onClick={() => onToggleBOM(product)}
                      >
                        {inBOM ? (
                          <>
                            <Check size={14} /> In Material List
                          </>
                        ) : (
                          <>
                            <Plus size={14} /> Add to List
                          </>
                        )}
                      </button>

                      <a
                        href={waQuoteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-whatsapp btn-sm product-wa-btn"
                        title="Get live wholesale quote on WhatsApp"
                      >
                        <MessageCircle size={14} />
                        <span>Quote</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-marketplace-view">
            <Layers size={48} className="empty-icon" />
            <h3>No construction materials found</h3>
            <p>
              We couldn't find materials matching your search. Send your handwritten list or structural drawing to our WhatsApp procurement desk for an immediate response.
            </p>
            <div className="empty-actions">
              <button type="button" className="btn btn-orange" onClick={handleResetFilters}>
                Reset All Filters
              </button>
              <a
                href={COMPANY_INFO.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-whatsapp"
              >
                <MessageCircle size={16} /> WhatsApp Your Requirement
              </a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
