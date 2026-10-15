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
import PartnerBrandLogo from '../components/PartnerBrandLogo';
import BrandRoster from '../components/BrandRoster';
import SearchSuggestions from '../components/SearchSuggestions';
import WhatsAppIcon from '../components/icons/WhatsAppIcon';
import ProductImage from '../components/ProductImage';
import FaqSection from '../components/FaqSection';
import { useSiteContent } from '../site-content';
import { matchesCatalogueSearch, scoreCatalogueSearch } from '../search/catalogue-search';
import { partnerBrandCategories, partnerBrandMatchesProduct, usePartnerBrands } from '../partner-brands';
import { bestMatchingVariant } from '../search/variant-match';
import RotatingSearchPlaceholder from '../components/RotatingSearchPlaceholder';
import { buildSearchExamples } from '../search/search-examples';
import { customerPriceNote } from '../catalogue/customer-display';
import { resolveCatalogueCategoryId } from '@material-square/types';
import { formatQuantityUnit, formatQuantityUnitText } from "../quantity-format";
import { useCatalogueCategories } from '../catalogue/useCatalogueCategories';

const CATALOGUE_PAGE_SIZE = 16;
const getAvailabilityStatus = (item: Pick<CatalogueProduct, 'availabilityStatus' | 'inStock'>) =>
  item.availabilityStatus || (item.inStock ? 'IN_STOCK' : 'CHECK_AVAILABILITY');
const availabilityLabel = (status: NonNullable<CatalogueProduct['availabilityStatus']>) => ({
  IN_STOCK: 'In stock',
  OUT_OF_STOCK: 'Out of stock',
  CHECK_AVAILABILITY: 'Check availability',
})[status];
export default function MarketplacePage({
  bomList = [],
  products,
  catalogueLoading = false,
  catalogueUnavailable = false,
  onRetryCatalogue,
  onToggleBOM,
  onOpenProduct,
  onOpenBOMDrawer,
}: { products: CatalogueProduct[]; bomList?: MaterialItem[]; catalogueLoading?: boolean; catalogueUnavailable?: boolean; onRetryCatalogue?: () => void; onToggleBOM: (product: MaterialItem) => void; onOpenProduct: (product: CatalogueProduct, query?: string, variantId?: string) => void; onOpenBOMDrawer: () => void }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const siteContent = useSiteContent();
  const partnerBrands = usePartnerBrands();
  const managedCategories = useCatalogueCategories();
  const categoryDirectory = useMemo(() => {
    return new Map(managedCategories.map(({ id, label }) => [id, label]));
  }, [managedCategories]);
  const initialCategory = searchParams.get('category') || 'all';
  const initialBrand = searchParams.get('brand') || '';
  const initialQuery = searchParams.get('q') || '';
  const initialAvailability = searchParams.get('availability') || '';
  const lastSearchParamRef = useRef(initialQuery);

  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [selectedBrand, setSelectedBrand] = useState(initialBrand);
  const [selectedAvailability, setSelectedAvailability] = useState(initialAvailability);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedVariantIds, setSelectedVariantIds] = useState<Record<string, string>>({});
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchExamples = buildSearchExamples(products);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [isStickyDismissed, setIsStickyDismissed] = useState(false);
  const [visibleProductCount, setVisibleProductCount] = useState(CATALOGUE_PAGE_SIZE);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
  const catalogueEndRef = useRef<HTMLDivElement>(null);
  const [hasReachedCatalogueEnd, setHasReachedCatalogueEnd] = useState(false);
  const prevBomCountRef = useRef(bomList.length);
  const searchRef = useRef<HTMLDivElement>(null);
  const catalogueBrands = useMemo(() => {
    const byBrand = new Map<string, { name: string; category: string; categories: string[]; logoUrl?: string | null }>();
    for (const product of products) {
      const name = product.brand.trim();
      if (!name) continue;
      const key = name.toLocaleLowerCase();
      if (!byBrand.has(key)) {
        byBrand.set(key, {
          name,
          category: product.categoryLabel || product.category,
          categories: [product.categoryLabel || product.category],
        });
      }
    }
    const configuredBrands = partnerBrands.map((brand) => ({
      name: brand.name,
      category: partnerBrandCategories(brand).map((value) => categoryDirectory.get(resolveCatalogueCategoryId(value, managedCategories)) || value).join(" · "),
      categories: partnerBrandCategories(brand).map((value) => categoryDirectory.get(resolveCatalogueCategoryId(value, managedCategories)) || value),
      logoUrl: brand.logoUrl,
    }));
    const productOnlyBrands = [...byBrand.values()]
      .filter((productBrand) => !partnerBrands.some((brand) =>
        partnerBrandMatchesProduct(
          brand.name,
          productBrand.name,
          productBrand.category,
        ),
      ))
      .sort((left, right) => left.name.localeCompare(right.name));
    return [...configuredBrands, ...productOnlyBrands];
  }, [partnerBrands, products, categoryDirectory, managedCategories]);
  const catalogueCategories = useMemo(() => {
    return [
      { id: 'all', label: 'All Materials' },
      ...[...categoryDirectory].map(([id, label]) => ({ id, label })),
    ];
  }, [categoryDirectory]);
  const activeCategoryLabel = activeCategory === "all"
    ? ""
    : catalogueCategories.find((category) => category.id === activeCategory)?.label
      || activeCategory.replace(/[-_]+/g, " ").replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase());
  const visibleCatalogueBrands = activeCategory === "all"
    ? catalogueBrands
    : catalogueBrands.filter((brand) => brand.categories.some((category) => {
        return resolveCatalogueCategoryId(category, managedCategories) === activeCategory;
      }));
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
    const requestedCategory = searchParams.get('category') || 'all';
    setActiveCategory(requestedCategory === 'all' ? 'all' : resolveCatalogueCategoryId(requestedCategory, managedCategories));
    setSelectedBrand(searchParams.get('brand') || '');
    setSelectedAvailability(searchParams.get('availability') || '');
    const queryFromUrl = searchParams.get('q') || '';
    if (queryFromUrl !== lastSearchParamRef.current) {
      lastSearchParamRef.current = queryFromUrl;
      setSearchQuery(queryFromUrl);
    }
  }, [searchParams, managedCategories]);

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

  const handleAvailabilityChange = (availability: string) => {
    setSelectedAvailability(availability);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (!availability) p.delete('availability');
      else p.set('availability', availability);
      return p;
    });
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    const matches = products.filter((item) => {
      // Category filter
      if (activeCategory !== 'all' && resolveCatalogueCategoryId(item.categoryLabel || item.category, managedCategories) !== activeCategory) {
        return false;
      }

      // Brand filter
      if (selectedBrand && !partnerBrandMatchesProduct(selectedBrand, item.brand, `${item.category} ${item.categoryLabel}`)) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        return matchesCatalogueSearch(item, searchQuery);
      }

      return true;
    });
    return searchQuery.trim()
      ? matches.sort((a, b) => scoreCatalogueSearch(b, searchQuery) - scoreCatalogueSearch(a, searchQuery))
      : matches;
  }, [products, activeCategory, selectedBrand, searchQuery]);

  // A catalogue listing is one product card. Variants are options on that card,
  // not separate products; availability filtering should keep the product if
  // at least one of its options matches.
  const listingCards = useMemo(() => filteredProducts.filter((product) => {
    if (!selectedAvailability) return true;
    const variants = product.variants || [];
    return variants.length
      ? variants.some((variant) => getAvailabilityStatus(variant) === selectedAvailability)
      : getAvailabilityStatus(product) === selectedAvailability;
  }), [filteredProducts, selectedAvailability]);

  const visibleListingCards = useMemo(
    () => listingCards.slice(0, visibleProductCount),
    [listingCards, visibleProductCount],
  );

  useEffect(() => {
    setVisibleProductCount(CATALOGUE_PAGE_SIZE);
    setHasReachedCatalogueEnd(false);
  }, [activeCategory, selectedBrand, selectedAvailability, searchQuery]);

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || visibleProductCount >= listingCards.length || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisibleProductCount((count) => Math.min(count + CATALOGUE_PAGE_SIZE, listingCards.length));
      }
    }, { rootMargin: '720px 0px', threshold: 0 });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleProductCount, listingCards.length]);

  useEffect(() => {
    const sentinel = catalogueEndRef.current;
    if (!sentinel || !listingCards.length || visibleListingCards.length < listingCards.length || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setHasReachedCatalogueEnd(true);
    }, { threshold: 0 });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleListingCards.length, listingCards.length]);

  const relatedProducts = useMemo(() => {
    if (listingCards.length) return [];
    // Suggestions may broaden an empty brand/category browse, but not an exact search.
    if (searchQuery.trim()) return [];
    const selectedPartner = partnerBrands.find((brand) => brand.name.toLocaleLowerCase() === selectedBrand.toLocaleLowerCase());
    const categoryHints: Record<string, string[]> = {
      cement: ["cement"], pipes: ["pipe", "plumb", "valve"], wires: ["wire", "cable"],
      paints: ["paint", "coating"], sanitary: ["sanitary", "bath", "tile", "faucet"],
      steel: ["steel", "rebar"], adhesives: ["adhesive", "tile"],
    };
    const hints = selectedPartner ? categoryHints[selectedPartner.category.toLocaleLowerCase()] || [selectedPartner.category.toLocaleLowerCase()] : [];
    return products
      .filter((product) => activeCategory === "all" || resolveCatalogueCategoryId(product.categoryLabel || product.category, managedCategories) === activeCategory)
      .filter((product) => !selectedPartner || hints.some((hint) => `${product.category} ${product.categoryLabel}`.toLocaleLowerCase().includes(hint)))
      .filter((product) => !selectedAvailability || getAvailabilityStatus(product) === selectedAvailability)
      .sort((a, b) => Number(b.inStock) - Number(a.inStock) || a.name.localeCompare(b.name))
      .slice(0, 4);
  }, [products, listingCards.length, activeCategory, selectedBrand, selectedAvailability, partnerBrands, searchQuery, managedCategories]);

  // Check if item in BOM
  const isItemInBOM = (id: string) => bomList.some((item) => (item.catalogueId || item.id) === id);

  // Clear all filters
  const handleResetFilters = () => {
    setActiveCategory('all');
    setSelectedBrand('');
    setSelectedAvailability('');
    setSearchQuery('');
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
            {/* Search and catalogue filters row */}
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
                  loading={catalogueLoading}
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
                  <option value="">All {visibleCatalogueBrands.length} Brands</option>
                  {visibleCatalogueBrands.map((brand) => (
                    <option key={brand.name} value={brand.name}>
                      {brand.name} ({brand.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="availability-select-wrap">
                <select
                  value={selectedAvailability}
                  onChange={(e) => handleAvailabilityChange(e.target.value)}
                  className="brand-dropdown-select"
                  aria-label="Availability"
                >
                  <option value="">All availability</option>
                  <option value="IN_STOCK">In stock</option>
                  <option value="OUT_OF_STOCK">Out of stock</option>
                  <option value="CHECK_AVAILABILITY">Check availability</option>
                </select>
              </div>

              {(activeCategory !== 'all' || selectedBrand || selectedAvailability || searchQuery) && (
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
                {visibleCatalogueBrands.map((brand) => {
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
                        <PartnerBrandLogo brand={brand} className="brand-chip-svg" />
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
          {catalogueLoading ? (
            <div className="catalogue-products-skeleton" role="status" aria-label="Loading materials">
              {Array.from({ length: 6 }, (_, index) => <div className="catalogue-product-skeleton" key={index}><i /><span><b /><b /><b /></span></div>)}
            </div>
          ) : listingCards.length > 0 ? (
            <div className={`products-directory-grid${searchQuery.trim() ? ' is-search-results-list' : ''}`}>
              {visibleListingCards.map((product) => {
                const variants = product.variants || [];
                const availabilityVariants = selectedAvailability
                  ? variants.filter((option) => getAvailabilityStatus(option) === selectedAvailability)
                  : variants;
                const selectedVariantId = selectedVariantIds[product.id];
                const queryVariant = availabilityVariants.find((option) => option.id === selectedVariantId)
                  || availabilityVariants.find((option) => option.id === bestMatchingVariant(product, searchQuery)?.id)
                  || availabilityVariants[0]
                  || bestMatchingVariant(product, searchQuery);
                const cardAvailability = getAvailabilityStatus(queryVariant || product);
                const productParams = new URLSearchParams();
                if (searchQuery.trim()) productParams.set("q", searchQuery.trim());
                if (queryVariant?.id) productParams.set("variant", queryVariant.id);
                const productHref = `/product/${encodeURIComponent(product.id)}${productParams.size ? `?${productParams.toString()}` : ""}`;
                const cardImage = queryVariant?.image || queryVariant?.galleryImages?.[0] || product.image;
                const optionAttributes = queryVariant
                  ? Object.entries(queryVariant.attributes || {})
                    .filter(([, value]) => !queryVariant.label.toLocaleLowerCase().includes(String(value).toLocaleLowerCase()))
                    .map(([key, value]) => `${key}: ${value}`)
                  : [];
                const optionLabel = queryVariant ? [queryVariant.label, ...optionAttributes].filter(Boolean).join(" · ") : "";
                const cardPrice = queryVariant?.price ?? product.price;
                const compareAtPrice = queryVariant?.compareAtPrice ?? product.compareAtPrice;
                const fullCardCode = queryVariant?.code || product.code;
                const variantCodeNumber = queryVariant?.code?.match(/-V(\d+)(?:-|$)/i)?.[1];
                const cardCode = variantCodeNumber ? `${product.code} · V${variantCodeNumber}` : fullCardCode;
                const inBOM = isItemInBOM(product.id);
                const matchedPartnerBrand = partnerBrands.find((brand) => partnerBrandMatchesProduct(brand.name, product.brand, `${product.category} ${product.categoryLabel}`));
                const productOffer = queryVariant?.offerLabel || product.offerLabel;
                const productCategoryLabel = categoryDirectory.get(resolveCatalogueCategoryId(product.categoryLabel || product.category, managedCategories)) || "";
                const cardDiscountPercent = cardPrice != null && compareAtPrice != null && Number(compareAtPrice) > Number(cardPrice)
                  ? Math.round(((Number(compareAtPrice) - Number(cardPrice)) / Number(compareAtPrice)) * 100)
                  : 0;
                const cardOfferLabel = productOffer || (cardDiscountPercent > 0 ? `${cardDiscountPercent}% OFF` : "");
                const priceNote = customerPriceNote(queryVariant?.priceNote || product.priceNote);
                return (
                    <article
                      key={product.id}
                      className="catalog-product-card"
                      tabIndex={0}
                      aria-label={`Open ${product.name}${optionLabel ? `, ${optionLabel}` : ""}`}
                      onClick={(event) => {
                        const target = event.target;
                        if (target instanceof Element && target.closest('a, button, input, select, textarea, [role="button"]')) return;
                        onOpenProduct(product, searchQuery, queryVariant?.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
                        event.preventDefault();
                        onOpenProduct(product, searchQuery, queryVariant?.id);
                      }}
                    >
                    {/* Top Image & Category Pill */}
                    <Link className="product-media-box" to={productHref} aria-label={`View ${product.name}${optionLabel ? `, ${optionLabel}` : ""}`}>
                      <ProductImage src={cardImage} alt={product.name} />
                      <div className="media-overlay-tags">
                        {productCategoryLabel && <span className="product-cat-tag">{productCategoryLabel}</span>}
                      </div>
                      {product.photoBanner && (
                        <span className="product-photo-banner">{product.photoBanner}</span>
                      )}
                      {cardOfferLabel && <span className="catalog-card-offer">{cardOfferLabel}</span>}
                    </Link>

                    {/* Content Box */}
                    <div className="product-card-body">
                      <div className="brand-code-line">
                        <div className="brand-title-badge">
                          <span className="brand-mini-logo-frame" aria-hidden="true">
                            <PartnerBrandLogo brand={matchedPartnerBrand || { name: product.brand }} className="marketplace-brand-logo" />
                          </span>
                          <span className="brand-title">{matchedPartnerBrand?.name || product.brand}</span>
                        </div>
                        <span className="product-sku-code" title={fullCardCode}>{cardCode}</span>
                      </div>

                      <h3 className="product-card-title"><Link to={productHref}>{product.name}</Link></h3>
                      {variants.length > 1 ? (
                        <fieldset className="catalogue-marketplace-option catalogue-marketplace-variant-options">
                          <legend>Options{queryVariant?.unit || product.unit ? ` · ${queryVariant?.unit || product.unit}` : ""}</legend>
                          <div className="catalogue-marketplace-variant-grid" role="group" aria-label={`Options for ${product.name}`}>
                            {availabilityVariants.map((option) => {
                              const optionPrice = option.price ?? product.price;
                              const isSelected = option.id === queryVariant?.id;
                              return (
                                <button
                                  key={option.id}
                                  type="button"
                                  className={`catalogue-marketplace-variant${isSelected ? " is-selected" : ""}`}
                                  aria-pressed={isSelected}
                                  onClick={() => setSelectedVariantIds((current) => ({ ...current, [product.id]: option.id }))}
                                >
                                  <strong title={option.label}>{option.label}</strong>
                                  {optionPrice != null && <span>₹{Number(optionPrice).toLocaleString("en-IN")}</span>}
                                </button>
                              );
                            })}
                          </div>
                        </fieldset>
                      ) : optionLabel ? (
                        <div className="catalogue-marketplace-option" aria-label={`Option ${optionLabel}`}><span>Option</span><strong>{optionLabel}</strong></div>
                      ) : null}
                      {!queryVariant && product.specs?.sizes && <p className="product-size-guide">Size guide: {product.specs.sizes}. Specify your requirement in product details.</p>}

                      {product.grade && (
                        <div className="grade-badge-chip">
                          <span>{product.grade}</span>
                        </div>
                      )}

                      {(() => {
                        const colourValues = queryVariant ? [] : Array.from(new Set((product.variants || []).flatMap((variant) => Object.entries(variant.attributes || {})
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
                        {product.features.slice(0, 2).map((feat, idx) => {
                          const categoryFeature = feat.match(/^(Category\s*[—:-]\s*)(.+)$/i);
                          const displayFeatureCategory = categoryFeature
                            ? categoryDirectory.get(resolveCatalogueCategoryId(categoryFeature[2], managedCategories))
                            : undefined;
                          if (categoryFeature && !displayFeatureCategory) return null;
                          const displayFeature = categoryFeature
                            ? `${categoryFeature[1]}${displayFeatureCategory}`
                            : feat;
                          return (
                          <li key={idx}>
                            <Check size={13} className="check-icon-green" />
                            <span>{displayFeature}</span>
                          </li>
                          );
                        })}
                      </ul>}

                      {/* Technical Specs Preview */}
                      <div className="product-spec-preview-box">
                        <div className="spec-item">
                          <span className="spec-label">Packaging</span>
                        <span className="spec-val">{queryVariant?.unit || product.unit}</span>
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
                          <span className="rate-caption">{queryVariant?.price != null || product.price != null ? 'Price per unit' : product.variants?.some(option => option.price != null) ? 'Starting from' : 'Pricing'}</span>
                          <span className="rate-amount">
                            {queryVariant?.price != null ? `₹${Number(queryVariant.price).toLocaleString('en-IN')}` : product.price == null ? product.variants?.some(option => option.price != null) ? `₹${Math.min(...product.variants.filter(option => option.price != null).map(option => Number(option.price))).toLocaleString('en-IN')}` : 'Request a quote' : `₹${Number(product.price).toLocaleString('en-IN')}`}
                          </span>
                          {cardPrice != null && compareAtPrice != null && Number(compareAtPrice) > Number(cardPrice) && <del className="catalogue-card-compare-price">₹{Number(compareAtPrice).toLocaleString("en-IN")}</del>}
                          {priceNote && <small className="catalogue-price-caveat">{priceNote}</small>}
                          <span className={`catalogue-stock-pill status-${cardAvailability.toLocaleLowerCase().replaceAll('_', '-')}`}>{availabilityLabel(cardAvailability)}</span>
                        </div>
                        <div className="min-order-pill">
                          <Package size={12} />
                          <span>MOQ: {queryVariant?.minOrderQuantity ? formatQuantityUnit(queryVariant.minOrderQuantity, queryVariant.unit || product.unit) : formatQuantityUnitText(product.minOrderQty, product.unit) || 'Confirm'}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="product-actions-grid">
                        <button
                          type="button"
                          className="btn-card-specs"
                          onClick={() => onOpenProduct(product, searchQuery, queryVariant?.id)}
                        >
                          <Info size={14} /> View details
                        </button>

                        <button
                          type="button"
                          className={`btn-card-bom ${inBOM ? 'in-bom' : ''}`}
                          onClick={() => queryVariant ? onOpenProduct(product, searchQuery, queryVariant.id) : inBOM ? onOpenBOMDrawer() : onToggleBOM(product)}
                        >
                          {queryVariant ? (
                            <>
                              <Plus size={14} /> Choose options
                            </>
                          ) : inBOM ? (
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
          {visibleListingCards.length < listingCards.length && (
            <div className="catalogue-load-more" ref={loadMoreSentinelRef}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setVisibleProductCount((count) => Math.min(count + CATALOGUE_PAGE_SIZE, listingCards.length))}
              >
                Load more listings <span>({listingCards.length - visibleListingCards.length} remaining)</span>
              </button>
              <span className="catalogue-load-more-hint" aria-live="polite">
                Showing {visibleListingCards.length} of {listingCards.length} products
              </span>
            </div>
          )}
          {listingCards.length > 0 && visibleListingCards.length === listingCards.length && (
            <>
              <div ref={catalogueEndRef} aria-hidden="true" />
              {hasReachedCatalogueEnd && <p className="catalogue-end-message" role="status">You’ve reached the end</p>}
            </>
          )}
          {!listingCards.length && relatedProducts.length > 0 && <section className="catalogue-related-section" aria-label="Other catalogue items">
            <div><h3>Other items to explore</h3><p>These are listed in a related materials category. Confirm the exact brand and specification with the team.</p></div>
            <div className="catalogue-related-grid">{relatedProducts.map((product) => <Link to={`/product/${encodeURIComponent(product.id)}`} key={product.id} className="catalogue-related-card">
              <ProductImage src={product.image} alt={product.name} />
              <small>{product.brand}</small><strong>{product.name}</strong>
            </Link>)}</div>
          </section>}

        </div>
      </section>

      {/* Brands currently represented in the catalogue */}
      {partnerBrands.length > 0 && !searchQuery.trim() && !selectedBrand && activeCategory === 'all' && <BrandRoster products={products} partnerBrands={partnerBrands} onSelectBrand={handleBrandChange} selectedBrand={selectedBrand} />}

      <FaqSection />

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
