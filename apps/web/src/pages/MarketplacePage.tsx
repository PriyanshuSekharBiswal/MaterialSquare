import { productMessage, whatsappLink } from '../messages';
import type { MaterialItem, CatalogueProduct } from '../types';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
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
import { BrandLogo, getBrandMeta } from '../components/icons/BrandBadges';
import BrandRoster from '../components/BrandRoster';
import SearchSuggestions from '../components/SearchSuggestions';
import WhatsAppIcon from '../components/icons/WhatsAppIcon';
import ProductImage from '../components/ProductImage';
import { useSiteContent } from '../site-content';
import { matchesCatalogueSearch, scoreCatalogueSearch } from '../search/catalogue-search';
import { partnerBrandMatchesProduct, usePartnerBrands } from '../partner-brands';
import { bestMatchingVariant } from '../search/variant-match';
import RotatingSearchPlaceholder from '../components/RotatingSearchPlaceholder';
import { buildSearchExamples } from '../search/search-examples';

export default function MarketplacePage({
  bomList = [],
  products,
  catalogueUnavailable = false,
  onRetryCatalogue,
  onToggleBOM,
  onOpenProduct,
  onOpenBOMDrawer,
}: { products: CatalogueProduct[]; bomList?: MaterialItem[]; catalogueUnavailable?: boolean; onRetryCatalogue?: () => void; onToggleBOM: (product: MaterialItem) => void; onOpenProduct: (product: CatalogueProduct, query?: string) => void; onOpenBOMDrawer: () => void }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const siteContent = useSiteContent();
  const partnerBrands = usePartnerBrands();
  const initialCategory = searchParams.get('category') || 'all';
  const initialBrand = searchParams.get('brand') || '';
  const initialQuery = searchParams.get('q') || '';
  const lastSearchParamRef = useRef(initialQuery);

  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [selectedBrand, setSelectedBrand] = useState(initialBrand);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchExamples = buildSearchExamples(products);
  const [availability, setAvailability] = useState('all');
  const [variantFilters, setVariantFilters] = useState<Record<string, string>>({});
  const [sortBy, setSortBy] = useState('relevance');
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [isStickyDismissed, setIsStickyDismissed] = useState(false);
  const prevBomCountRef = useRef(bomList.length);
  const searchRef = useRef<HTMLDivElement>(null);
  const catalogueBrands = useMemo(() => partnerBrands.map((brand) => ({ name: brand.name, category: brand.category, meta: getBrandMeta(brand.id) })), [partnerBrands]);
  const catalogueCategories = useMemo(() => [
    { id: 'all', label: 'All Materials', count: products.length },
    ...Array.from(new Map(products.map((product) => [product.category, product.categoryLabel])).entries())
      .map(([id, label]) => ({ id, label, count: products.filter((product) => product.category === id).length })),
  ], [products]);
  const activeCategoryLabel = activeCategory === "all"
    ? ""
    : catalogueCategories.find((category) => category.id === activeCategory)?.label
      || activeCategory.replace(/[-_]+/g, " ").replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase());
  const variantFilterGroups = useMemo(() => {
    const groups = new Map<string, { label: string; values: Set<string> }>();
    for (const product of products) {
      if (activeCategory !== 'all' && product.category !== activeCategory) continue;
      if (selectedBrand && !partnerBrandMatchesProduct(selectedBrand, product.brand, `${product.category} ${product.categoryLabel}`)) continue;
      for (const variant of product.variants || []) for (const [rawKey, rawValue] of Object.entries(variant.attributes || {})) {
        const key = rawKey.trim().toLocaleLowerCase();
        const value = String(rawValue || '').trim();
        if (!key || !value) continue;
        const group = groups.get(key) || { label: rawKey.trim(), values: new Set<string>() };
        group.values.add(value);
        groups.set(key, group);
      }
    }
    return Array.from(groups.entries()).map(([key, group]) => ({ key, label: group.label, values: Array.from(group.values).sort((a, b) => a.localeCompare(b)) })).filter((group) => group.values.length > 1).slice(0, 5);
  }, [products, activeCategory, selectedBrand]);

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
    const queryFromUrl = searchParams.get('q') || '';
    if (queryFromUrl !== lastSearchParamRef.current) {
      lastSearchParamRef.current = queryFromUrl;
      setSearchQuery(queryFromUrl);
    }
  }, [searchParams]);

  // Handle category change
  const handleCategoryChange = (catId: string) => {
    setActiveCategory(catId);
    setVariantFilters({});
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
    setVariantFilters({});
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
    const matches = products.filter((item) => {
      // Category filter
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }

      // Brand filter
      if (selectedBrand && !partnerBrandMatchesProduct(selectedBrand, item.brand, `${item.category} ${item.categoryLabel}`)) {
        return false;
      }
      const activeVariantFilters = Object.entries(variantFilters).filter(([, value]) => value);
      if (activeVariantFilters.length && !(item.variants || []).some((variant) => activeVariantFilters.every(([key, value]) => Object.entries(variant.attributes || {}).some(([variantKey, variantValue]) => variantKey.trim().toLocaleLowerCase() === key && String(variantValue).toLocaleLowerCase() === value.toLocaleLowerCase())))) return false;

      // Unavailable listings remain visible unless the user filters them out.
      const itemAvailability = item.availabilityStatus || (item.inStock ? 'IN_STOCK' : 'CHECK_AVAILABILITY');
      const variantStatuses = (item.variants || []).map((variant) => variant.availabilityStatus || (variant.inStock ? 'IN_STOCK' : 'CHECK_AVAILABILITY'));
      const effectiveAvailability = itemAvailability === 'IN_STOCK' || variantStatuses.includes('IN_STOCK')
        ? 'IN_STOCK'
        : (itemAvailability === 'OUT_OF_STOCK' || (variantStatuses.length > 0 && variantStatuses.every((status) => status === 'OUT_OF_STOCK')))
          ? 'OUT_OF_STOCK'
          : 'CHECK_AVAILABILITY';
      if (availability !== 'all' && availability !== effectiveAvailability) return false;

      // Search query
      if (searchQuery.trim()) {
        return matchesCatalogueSearch(item, searchQuery);
      }

      return true;
    });
    return matches.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'brand') return a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name);
      if (sortBy === 'availability') {
        const inStockA = a.inStock || (a.variants || []).some((variant) => variant.inStock);
        const inStockB = b.inStock || (b.variants || []).some((variant) => variant.inStock);
        return Number(inStockB) - Number(inStockA) || a.name.localeCompare(b.name);
      }
      if (searchQuery.trim()) return scoreCatalogueSearch(b, searchQuery) - scoreCatalogueSearch(a, searchQuery);
      return 0;
    });
  }, [products, activeCategory, selectedBrand, availability, searchQuery, sortBy, variantFilters]);

  const relatedProducts = useMemo(() => {
    if (filteredProducts.length) return [];
    const selectedPartner = partnerBrands.find((brand) => brand.name.toLocaleLowerCase() === selectedBrand.toLocaleLowerCase());
    const categoryHints: Record<string, string[]> = {
      cement: ["cement"], pipes: ["pipe", "plumb", "valve"], wires: ["wire", "cable"],
      paints: ["paint", "coating"], sanitary: ["sanitary", "bath", "tile", "faucet"],
      steel: ["steel", "rebar"], adhesives: ["adhesive", "tile"],
    };
    const hints = selectedPartner ? categoryHints[selectedPartner.category.toLocaleLowerCase()] || [selectedPartner.category.toLocaleLowerCase()] : [];
    return products
      .filter((product) => activeCategory === "all" || product.category === activeCategory)
      .filter((product) => !selectedPartner || hints.some((hint) => `${product.category} ${product.categoryLabel}`.toLocaleLowerCase().includes(hint)))
      .sort((a, b) => Number(b.inStock) - Number(a.inStock) || a.name.localeCompare(b.name))
      .slice(0, 4);
  }, [products, filteredProducts.length, activeCategory, selectedBrand, partnerBrands]);

  // Check if item in BOM
  const isItemInBOM = (id: string) => bomList.some((item) => (item.catalogueId || item.id) === id);

  // Clear all filters
  const handleResetFilters = () => {
    setActiveCategory('all');
    setSelectedBrand('');
    setSearchQuery('');
    setAvailability('all');
    setVariantFilters({});
    setSortBy('relevance');
    lastSearchParamRef.current = '';
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
              Search products in the catalogue by name, brand, colour, finish or pack size. Check listed availability, compare options and add what you need to a quote list.
            </p>

            <div className="page-hero-metrics reveal-stagger">
              <div className="metric-tag">
                <Search size={14} className="metric-icon" />
                <span>Browse and build a list as a guest</span>
              </div>
              <div className="metric-tag">
                <ClipboardList size={14} className="metric-icon" />
                <span>Choose sizes, colours and quantities</span>
              </div>
              <div className="metric-tag">
                <Phone size={14} className="metric-icon" />
                <span>Request a quote when you’re ready</span>
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
                  aria-label="Search materials catalogue"
                  placeholder=""
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSuggestionsOpen(true);
                  }}
                  onFocus={() => {
                    setIsSearchFocused(true);
                    setIsSuggestionsOpen(true);
                  }}
                  onBlur={() => setIsSearchFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setIsSuggestionsOpen(false);
                    if (e.key === 'Enter') {
                      const submittedQuery = e.currentTarget.value.trim();
                      setIsSuggestionsOpen(false);
                      lastSearchParamRef.current = submittedQuery;
                      setSearchParams((prev) => {
                        const p = new URLSearchParams(prev);
                        if (submittedQuery) p.set('q', submittedQuery);
                        else p.delete('q');
                        return p;
                      });
                    }
                  }}
                  className="catalog-search-input"
                  autoComplete="off"
                />
                <RotatingSearchPlaceholder
                  examples={searchExamples}
                  visible={!searchQuery && !isSearchFocused}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setIsSuggestionsOpen(true);
                      lastSearchParamRef.current = '';
                      setSearchParams((prev) => {
                        const p = new URLSearchParams(prev);
                        p.delete('q');
                        return p;
                      });
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
                  partnerBrands={partnerBrands}
                  query={searchQuery}
                  isOpen={isSuggestionsOpen}
                  onSelectSuggestion={(val) => {
                    setSearchQuery(val);
                    setIsSuggestionsOpen(false);
                    lastSearchParamRef.current = val;
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
                  onSelectProduct={(product, query) => {
                    setIsSuggestionsOpen(false);
                    onOpenProduct(product, query);
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
                  <option value="">All {catalogueBrands.length} Brands</option>
                  {catalogueBrands.map((brand) => (
                    <option key={brand.name} value={brand.name}>
                      {brand.name} ({brand.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="catalog-select-wrap">
                <label className="sr-only" htmlFor="catalog-availability">Availability</label>
                <select id="catalog-availability" value={availability} onChange={(e) => setAvailability(e.target.value)} className="brand-dropdown-select">
                  <option value="all">All availability</option>
                  <option value="IN_STOCK">In stock</option>
                  <option value="OUT_OF_STOCK">Out of stock</option>
                  <option value="CHECK_AVAILABILITY">Check availability</option>
                </select>
              </div>

              {variantFilterGroups.map((group) => <div className="catalog-select-wrap" key={group.key}>
                <label className="sr-only" htmlFor={`catalog-option-${group.key}`}>Filter by {group.label}</label>
                <select id={`catalog-option-${group.key}`} value={variantFilters[group.key] || ''} onChange={(event) => setVariantFilters((previous) => ({ ...previous, [group.key]: event.target.value }))} className="brand-dropdown-select">
                  <option value="">All {group.label.toLocaleLowerCase()}s</option>
                  {group.values.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>)}

              <div className="catalog-select-wrap">
                <label className="sr-only" htmlFor="catalog-sort">Sort products</label>
                <select id="catalog-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="brand-dropdown-select">
                  <option value="relevance">Sort: relevance</option>
                  <option value="name">Name: A to Z</option>
                  <option value="brand">Brand</option>
                  <option value="availability">Availability</option>
                </select>
              </div>

              {(activeCategory !== 'all' || selectedBrand || searchQuery || availability !== 'all' || sortBy !== 'relevance' || Object.values(variantFilters).some(Boolean)) && (
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
                {catalogueBrands.map((brand) => {
                  const isSelected = selectedBrand.toLowerCase() === brand.name.toLowerCase() || (selectedBrand && brand.name.toLowerCase().includes(selectedBrand.toLowerCase()));
                  return (
                    <button
                      key={brand.name}
                      type="button"
                      className={`brand-chip-btn ${isSelected ? 'active' : ''}`}
                      onClick={() => handleBrandChange(isSelected ? '' : brand.name)}
                      title={`${brand.name} — products listed in ${brand.category}`}
                    >
                      <div className="brand-chip-logo-box">
                        <BrandLogo id={brand.meta?.id || brand.name} className="brand-chip-svg" />
                      </div>
                      <span className="brand-chip-name">{brand.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Results Summary Bar */}
          <div className="results-summary-row reveal-text">
            <span className="results-count-text">
              Showing <strong>{filteredProducts.length}</strong> products in this catalogue
              {activeCategoryLabel && ` in ${activeCategoryLabel}`}
              {selectedBrand && ` by ${selectedBrand}`}
            </span>

            <div className="dispatch-help-note">
              <span>Need a custom quantity or site delivery information?</span>
              {siteContent["contact.phone"] && (
                <a href={`tel:${siteContent["contact.phone"]}`} className="phone-quick-link">
                  <Phone size={13} /> {siteContent["contact.phoneDisplay"] || siteContent["contact.phone"]}
                </a>
              )}
            </div>
          </div>

          {/* Products Grid */}
          {filteredProducts.length > 0 ? (
            <div className={`products-directory-grid reveal-stagger${searchQuery.trim() ? ' is-search-results-list' : ''}`}>
              {filteredProducts.map((product) => {
                const queryVariant = bestMatchingVariant(product, searchQuery);
                const productHref = `/product/${encodeURIComponent(product.id)}${searchQuery.trim() ? `?q=${encodeURIComponent(searchQuery.trim())}` : ""}`;
                const cardImage = queryVariant?.image || product.image;
                const inBOM = isItemInBOM(product.id);
                const brandMeta = getBrandMeta(product.brand);
                const productOffer = queryVariant?.offerLabel || product.offerLabel || product.variants?.find((variant) => variant.offerLabel)?.offerLabel;
                const referencePriceNote = queryVariant?.priceNote || product.priceNote || product.variants?.find(variant => variant.price != null)?.priceNote || "Final availability, GST and delivery charges confirmed by staff.";
                const isReferencePrice = /reference/i.test(product.priceNote || "") || /reference/i.test(referencePriceNote);
                const itemAvailability = product.availabilityStatus || (product.inStock ? 'IN_STOCK' : 'CHECK_AVAILABILITY');
                const variantStatuses = (product.variants || []).map((variant) => variant.availabilityStatus || (variant.inStock ? 'IN_STOCK' : 'CHECK_AVAILABILITY'));
                const effectiveAvailability = queryVariant
                  ? queryVariant.availabilityStatus || (queryVariant.inStock ? 'IN_STOCK' : 'CHECK_AVAILABILITY')
                  : itemAvailability === 'IN_STOCK' || variantStatuses.includes('IN_STOCK')
                  ? 'IN_STOCK'
                  : (itemAvailability === 'OUT_OF_STOCK' || (variantStatuses.length > 0 && variantStatuses.every((status) => status === 'OUT_OF_STOCK')))
                    ? 'OUT_OF_STOCK'
                    : 'CHECK_AVAILABILITY';
                return (
                    <article key={product.id} className="catalog-product-card">
                    {/* Top Image & Category Pill */}
                    <Link className="product-media-box" to={productHref} aria-label={`View ${product.name}`}>
                      <ProductImage src={cardImage} alt={product.name} />
                      <div className="media-overlay-tags">
                        <span className="product-cat-tag">{product.categoryLabel}</span>
                        <span className={`stock-status-tag ${effectiveAvailability === 'IN_STOCK' ? '' : 'is-unavailable'}`}>
                          <span className="pulse-dot"></span> {effectiveAvailability === 'IN_STOCK' ? 'In stock' : effectiveAvailability === 'OUT_OF_STOCK' ? 'Out of stock' : 'Check availability'}
                        </span>
                      </div>
                      {productOffer && <span className="catalog-card-offer">{productOffer}</span>}
                    </Link>

                    {/* Content Box */}
                    <div className="product-card-body">
                      <div className="brand-code-line">
                        <div className="brand-title-badge">
                          <div className="brand-mini-logo-frame">
                            <BrandLogo id={brandMeta?.id || product.brand} className="brand-mini-svg" />
                          </div>
                          <span className="brand-title">{product.brand}</span>
                        </div>
                        <span className="product-sku-code">{product.code}</span>
                      </div>

                      <h3 className="product-card-title"><Link to={productHref}>{product.name}</Link></h3>
                      {product.specs?.sizes && <p className="product-size-guide">Size guide: {product.specs.sizes}. Specify your requirement in product details.</p>}

                      {product.grade && (
                        <div className="grade-badge-chip">
                          <span>{product.grade}</span>
                        </div>
                      )}

                      {(() => {
                        const colourValues = Array.from(new Set((product.variants || []).flatMap((variant) => Object.entries(variant.attributes || {})
                          .filter(([key]) => /colou?r|shade|finish/i.test(key))
                          .map(([, value]) => value.trim()).filter(Boolean))));
                        return colourValues.length > 0 ? (
                          <div className="catalog-colour-preview" aria-label={`Available colours and finishes: ${colourValues.join(', ')}`}>
                            <span>Colours &amp; finishes</span>
                            <div className="catalog-colour-values">{colourValues.slice(0, 3).map((colour) => <small key={colour}>{colour}</small>)}{colourValues.length > 3 && <small>+{colourValues.length - 3}</small>}</div>
                          </div>
                        ) : null;
                      })()}

                      {/* Key features */}
                      {product.features.length > 0 && <ul className="product-features-preview">
                        {product.features.slice(0, 2).map((feat, idx) => (
                          <li key={idx}>
                            <Check size={13} className="check-icon-green" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>}

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
                          <span className="rate-caption">{isReferencePrice ? 'Online reference price' : product.price == null && product.variants?.some(variant => variant.price != null) ? 'Starting from' : product.price == null ? 'Wholesale pricing' : 'Price per unit'}</span>
                          <span className="rate-amount">
                            {queryVariant?.price != null ? `₹${Number(queryVariant.price).toLocaleString('en-IN')}` : product.price == null ? product.variants?.some(variant => variant.price != null) ? `₹${Math.min(...product.variants.filter(variant => variant.price != null).map(variant => Number(variant.price))).toLocaleString('en-IN')}` : 'Request a quote' : `₹${Number(product.price).toLocaleString('en-IN')}`}
                          </span>
                          {product.compareAtPrice != null && product.price != null && Number(product.compareAtPrice) > Number(product.price) && (
                            <span className="catalogue-list-price"><del>₹{Number(product.compareAtPrice).toLocaleString('en-IN')}</del>{productOffer && <strong>{productOffer}</strong>}</span>
                          )}
                          {(product.price != null || product.variants?.some(variant => variant.price != null)) && <small className="catalogue-price-caveat">{referencePriceNote}</small>}
                        </div>
                        <div className="min-order-pill">
                          <Package size={12} />
                          <span>MOQ: {queryVariant?.minOrderQuantity ? `${queryVariant.minOrderQuantity} ${queryVariant.unit || product.unit}` : product.minOrderQty || 'Confirm'}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="product-actions-grid">
                        <button
                          type="button"
                          className="btn-card-specs"
                          onClick={() => onOpenProduct(product, searchQuery)}
                        >
                          <Info size={14} /> View details
                        </button>

                        <button
                          type="button"
                          className={`btn-card-bom ${inBOM ? 'in-bom' : ''}`}
                          onClick={() => inBOM ? onOpenBOMDrawer() : onToggleBOM(product)}
                        >
                          {inBOM ? (
                            <>
                              <Check size={14} /> View quote list
                            </>
                          ) : (
                            <>
                              <Plus size={14} /> {product.specs?.sizes || product.variants?.length ? "Choose options" : "Add to quote list"}
                            </>
                          )}
                        </button>

                        {siteContent["contact.phone"] && <a
                          href={whatsappLink(productMessage(product), siteContent["contact.phone"])}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-card-whatsapp"
                          title="Ask about this product on WhatsApp"
                        >
                          <WhatsAppIcon size={16} color="currentColor" />
                        </a>}
                      </div>
                    </div>
                    </article>
                );
              })}
            </div>
          ) : (
            <div className="no-products-state">
              {catalogueUnavailable ? (
                <>
                  <h3>Published inventory is temporarily unavailable</h3>
                  <p>We couldn’t load the client’s current catalogue. Please retry shortly; no sample products are shown.</p>
                  <div className="empty-state-actions">
                    {onRetryCatalogue && <button type="button" onClick={onRetryCatalogue} className="btn btn-primary">Retry inventory</button>}
                  </div>
                </>
              ) : (
                <>
                  <Package size={48} className="empty-icon" />
                  <h3>{products.length ? "No products match your search" : "Material listings are being prepared"}</h3>
                  <p>{products.length ? "Try adjusting your filters or contact the team to ask about an item that is not listed." : "Tell us what you need and our team can help confirm availability while the client’s approved inventory is being added."}</p>
                  <div className="empty-state-actions">
                    {products.length ? <button type="button" onClick={handleResetFilters} className="btn btn-secondary">Clear All Filters</button> : <Link to="/contact" className="btn btn-primary">Request a material</Link>}
                    {siteContent["contact.phone"] && <a
                      href={whatsappLink(
                        `Hello Material Square, I am looking for a material not listed: "${searchQuery}". Can you supply this to my site?`,
                        siteContent["contact.phone"],
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-whatsapp"
                    >
                      <WhatsAppIcon size={18} color="#ffffff" />
                      <span>Request Custom Material on WhatsApp</span>
                    </a>}
                  </div>
                </>
              )}
            </div>
          )}
          {!filteredProducts.length && relatedProducts.length > 0 && <section className="catalogue-related-section" aria-label="Other catalogue items">
            <div><h3>Other items to explore</h3><p>These are listed in a related materials category. Confirm the exact brand and specification with the team.</p></div>
            <div className="catalogue-related-grid">{relatedProducts.map((product) => <Link to={`/product/${encodeURIComponent(product.id)}`} key={product.id} className="catalogue-related-card">
              <ProductImage src={product.image} alt={product.name} />
              <small>{product.brand}</small><strong>{product.name}</strong>
              <span>{product.availabilityStatus === "IN_STOCK" ? "In stock" : product.availabilityStatus === "OUT_OF_STOCK" ? "Out of stock" : "Check availability"}</span>
            </Link>)}</div>
          </section>}

        </div>
      </section>

      {/* Brands currently represented in the catalogue */}
      {partnerBrands.length > 0 && !searchQuery.trim() && !selectedBrand && activeCategory === 'all' && <BrandRoster products={products} partnerBrands={partnerBrands} onSelectBrand={handleBrandChange} selectedBrand={selectedBrand} />}

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
