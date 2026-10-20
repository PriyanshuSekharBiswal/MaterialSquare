import { productMessage, whatsappLink } from '../messages';
import type { MaterialItem, CatalogueProduct } from '../types';
import React, { useState, useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import { Link, useLocation, useNavigationType, useSearchParams } from 'react-router-dom';
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
import { formatContactPhone, resolveCatalogueCategoryId } from '@material-square/types';
import { formatQuantityUnit, formatQuantityUnitText } from "../quantity-format";
import { useCatalogueCategories } from '../catalogue/useCatalogueCategories';
import { customerCardFeatures } from '../catalogue/customer-display';
import MarketplaceProductCard from '../../../../packages/storefront-ui/MarketplaceProductCard';

const CATALOGUE_PAGE_SIZE = 16;
const readVisibleProductCount = (locationKey: string) => {
  try {
    const value = Number(sessionStorage.getItem(`material-square-marketplace-count:${locationKey}`));
    return Number.isFinite(value) && value >= CATALOGUE_PAGE_SIZE ? value : CATALOGUE_PAGE_SIZE;
  } catch {
    return CATALOGUE_PAGE_SIZE;
  }
};
const getAvailabilityStatus = (item: Pick<CatalogueProduct, 'availabilityStatus' | 'inStock'>) =>
  item.availabilityStatus || (item.inStock ? 'IN_STOCK' : 'CHECK_AVAILABILITY');
const availabilityLabel = (status: NonNullable<CatalogueProduct['availabilityStatus']>) => ({
  IN_STOCK: 'In stock',
  OUT_OF_STOCK: 'Out of stock',
  CHECK_AVAILABILITY: 'Check availability',
})[status];
const compactProductSpecification = (product: CatalogueProduct, variant?: NonNullable<CatalogueProduct['variants']>[number]) => {
  const explicitSpecification = product.grade?.trim() || product.specs?.standard?.trim();
  if (explicitSpecification) return explicitSpecification;

  const technicalAttribute = /grade|standard|spec|volt|size|section|material|type|class|pressure|thickness|rating|insulation|fire|flame|core/i;
  const values = [
    ...Object.entries(product.specs || {}),
    ...Object.entries(variant?.attributes || {}),
  ]
    .map(([key, value]) => [key, value?.trim() || ''] as const)
    .filter(([key, value]) => technicalAttribute.test(key) && value)
    .map(([, value]) => value);
  return [...new Set(values)].slice(0, 3).join(' · ');
};
const getListingDealRank = (product: CatalogueProduct, variant?: NonNullable<CatalogueProduct['variants']>[number]) => {
  const price = variant?.price ?? product.price;
  const compareAtPrice = variant?.compareAtPrice ?? product.compareAtPrice;
  const priceDiscount = price != null && compareAtPrice != null && Number(compareAtPrice) > Number(price)
    ? ((Number(compareAtPrice) - Number(price)) / Number(compareAtPrice)) * 100
    : 0;
  const offerLabel = variant?.offerLabel || product.offerLabel || '';
  const labelledDiscount = Number(offerLabel.match(/(\d+(?:\.\d+)?)\s*%/)?.[1] || 0);
  const hasCalculatedOffer = priceDiscount > 0;
  const hasExplicitBanner = Boolean(offerLabel.trim()) || (!hasCalculatedOffer && Boolean(product.photoBanner?.trim()));
  const availability = getAvailabilityStatus(variant || product);
  return {
    discount: Math.max(priceDiscount, labelledDiscount),
    hasOfferLabel: Boolean(offerLabel.trim()),
    hasExplicitBanner,
    hasOffer: hasCalculatedOffer || Boolean(offerLabel.trim()) || Boolean(product.photoBanner?.trim()),
    isInStock: availability === 'IN_STOCK',
    availabilityRank: availability === 'IN_STOCK' ? 0 : availability === 'CHECK_AVAILABILITY' ? 1 : 2,
  };
};
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
  const location = useLocation();
  const navigationType = useNavigationType();
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
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchExamples = buildSearchExamples(products);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [isStickyDismissed, setIsStickyDismissed] = useState(false);
  const [visibleProductCount, setVisibleProductCount] = useState(() => readVisibleProductCount(location.key));
  const previousLocationKeyRef = useRef(location.key);
  const previousFilterStateRef = useRef({
    locationKey: location.key,
    filterKey: JSON.stringify([initialCategory, initialBrand, initialAvailability, initialQuery]),
  });
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
  }, [products, activeCategory, selectedBrand, searchQuery, managedCategories]);

  const listingCards = useMemo(() => {
    const cards = filteredProducts.flatMap((product) => {
      const variants = product.variants || [];
      const productCards = variants.length ? variants.map((variant) => ({ product, variant })) : [{ product, variant: undefined }];
      return selectedAvailability
        ? productCards.filter(({ product: cardProduct, variant }) => getAvailabilityStatus(variant || cardProduct) === selectedAvailability)
        : productCards;
    });
    return cards
      .map((card, index) => ({ ...card, index }))
      .sort((left, right) => {
        if (searchQuery.trim()) {
          const relevance = scoreCatalogueSearch(right.product, searchQuery) - scoreCatalogueSearch(left.product, searchQuery);
          if (relevance) return relevance;
        }
        const leftDeal = getListingDealRank(left.product, left.variant);
        const rightDeal = getListingDealRank(right.product, right.variant);
        const leftOfferGroup = leftDeal.isInStock && leftDeal.hasExplicitBanner ? 0 : leftDeal.isInStock && leftDeal.hasOffer ? 1 : 2;
        const rightOfferGroup = rightDeal.isInStock && rightDeal.hasExplicitBanner ? 0 : rightDeal.isInStock && rightDeal.hasOffer ? 1 : 2;
        return leftOfferGroup - rightOfferGroup
          || leftDeal.availabilityRank - rightDeal.availabilityRank
          || rightDeal.discount - leftDeal.discount
          || Number(rightDeal.hasOfferLabel) - Number(leftDeal.hasOfferLabel)
          || left.index - right.index;
      })
      .map(({ product, variant }) => ({ product, variant }));
  }, [filteredProducts, selectedAvailability, searchQuery]);

  const visibleListingCards = useMemo(
    () => listingCards.slice(0, visibleProductCount),
    [listingCards, visibleProductCount],
  );

  useLayoutEffect(() => {
    if (previousLocationKeyRef.current === location.key) return;
    previousLocationKeyRef.current = location.key;
    if (navigationType === 'POP') {
      setVisibleProductCount(readVisibleProductCount(location.key));
    }
  }, [location.key, navigationType]);

  useEffect(() => {
    try {
      sessionStorage.setItem(`material-square-marketplace-count:${location.key}`, String(visibleProductCount));
    } catch {
      // Keep the catalogue usable when session storage is unavailable.
    }
  }, [location.key, visibleProductCount]);

  useEffect(() => {
    const filterKey = JSON.stringify([activeCategory, selectedBrand, selectedAvailability, searchQuery]);
    const previous = previousFilterStateRef.current;
    const filtersChanged = previous.filterKey !== filterKey;
    const historyEntryChanged = previous.locationKey !== location.key;
    previousFilterStateRef.current = { locationKey: location.key, filterKey };
    if (!filtersChanged || (navigationType === 'POP' && historyEntryChanged)) return;
    setVisibleProductCount(CATALOGUE_PAGE_SIZE);
    setHasReachedCatalogueEnd(false);
  }, [activeCategory, selectedBrand, selectedAvailability, searchQuery, location.key, navigationType]);

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
                {(searchQuery || isSuggestionsOpen) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!searchQuery) {
                        setIsSuggestionsOpen(false);
                        return;
                      }
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
                    aria-label={searchQuery ? "Clear search" : "Close search suggestions"}
                    title={searchQuery ? "Clear search" : "Close search suggestions"}
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
                  const isSelected = selectedBrand.toLocaleLowerCase() === brand.name.toLocaleLowerCase();
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

          {bomList.length > 0 && !isStickyDismissed && (
            <div className="sticky-bom-notification-bar is-inline" role="region" aria-label="Material List Notification">
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
            </div>
          )}

          {/* Results Summary Bar */}
          <div className="results-summary-row reveal-text">
            <div className="dispatch-help-note">
              <span>Need a custom quantity or site delivery information?</span>
              {siteContent["contact.phone"] && (
                <a href={`tel:${siteContent["contact.phone"]}`} className="phone-quick-link">
                  <Phone size={13} /> {formatContactPhone(siteContent["contact.phone"])}
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
              {visibleListingCards.map(({ product, variant }) => {
                const queryVariant = variant || bestMatchingVariant(product, searchQuery);
                const cardSpecification = compactProductSpecification(product, queryVariant);
                const cardAvailability = getAvailabilityStatus(queryVariant || product);
                const productParams = new URLSearchParams();
                if (searchQuery.trim()) productParams.set("q", searchQuery.trim());
                if (variant?.id) productParams.set("variant", variant.id);
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
                const cardBannerLabel = cardOfferLabel || product.photoBanner || "";
                const hasExplicitCardBanner = Boolean(productOffer || (!cardOfferLabel && product.photoBanner));
                const cardMinOrderQuantity = queryVariant?.minOrderQuantity != null
                  ? formatQuantityUnit(queryVariant.minOrderQuantity, "")
                  : formatQuantityUnitText(product.minOrderQty, product.unit).replace(/\s*×\s*.*$/, "");
                const colourValues = queryVariant ? [] : Array.from(new Set((product.variants || []).flatMap((option) => Object.entries(option.attributes || {})
                  .filter(([key]) => /colou?r|shade|finish/i.test(key)).map(([, value]) => value.trim()).filter(Boolean))));
                const priceCaption = queryVariant?.price != null || product.price != null
                  ? 'Price per unit'
                  : product.variants?.some((option) => option.price != null) ? 'Starting from' : 'Pricing';
                const priceLabel = queryVariant?.price != null
                  ? `₹${Number(queryVariant.price).toLocaleString('en-IN')}`
                  : product.price == null
                    ? product.variants?.some((option) => option.price != null)
                      ? `₹${Math.min(...product.variants.filter((option) => option.price != null).map((option) => Number(option.price))).toLocaleString('en-IN')}`
                      : 'Request a quote'
                    : `₹${Number(product.price).toLocaleString('en-IN')}`;
                return (
                  <MarketplaceProductCard
                    key={`${product.id}:${queryVariant?.id || "product"}`}
                    name={product.name}
                    brand={matchedPartnerBrand || { name: product.brand }}
                    code={cardCode}
                    image={cardImage}
                    imageContent={<ProductImage src={cardImage} alt={product.name} />}
                    categoryLabel={productCategoryLabel}
                    bannerLabel={cardBannerLabel}
                    bannerKind={hasExplicitCardBanner ? "explicit" : "calculated"}
                    specification={cardSpecification}
                    optionLabel={optionLabel}
                    sizeGuide={!queryVariant ? product.specs?.sizes : undefined}
                    colours={colourValues}
                    features={customerCardFeatures(product.features).flatMap((feature) => {
                      const categoryFeature = feature.match(/^(Category\s*[—:-]\s*)(.+)$/i);
                      const displayCategory = categoryFeature && categoryDirectory.get(resolveCatalogueCategoryId(categoryFeature[2], managedCategories));
                      return categoryFeature ? displayCategory ? [`${categoryFeature[1]}${displayCategory}`] : [] : [feature];
                    })}
                    detailHref={productHref}
                    priceCaption={priceCaption}
                    priceLabel={priceLabel}
                    compareAtPriceLabel={cardPrice != null && compareAtPrice != null && Number(compareAtPrice) > Number(cardPrice) ? `₹${Number(compareAtPrice).toLocaleString("en-IN")}` : undefined}
                    availability={cardAvailability}
                    availabilityLabel={availabilityLabel(cardAvailability)}
                    minimumOrderLabel={`MOQ: ${cardMinOrderQuantity || "Confirm"}`}
                    chooseOptions={Boolean(queryVariant || product.specs?.sizes || product.variants?.length)}
                    inQuoteList={inBOM}
                    whatsappHref={siteContent["contact.whatsappPhone"] ? whatsappLink(productMessage(product), siteContent["contact.whatsappPhone"]) : undefined}
                    onOpenCard={() => onOpenProduct(product, searchQuery, queryVariant?.id)}
                    onViewDetails={() => onOpenProduct(product, searchQuery, queryVariant?.id)}
                    onChooseOptions={() => queryVariant ? onOpenProduct(product, searchQuery, queryVariant.id) : inBOM ? onOpenBOMDrawer() : onToggleBOM(product)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="no-products-state" role={catalogueUnavailable ? "alert" : "status"}>
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
                    {siteContent["contact.whatsappPhone"] && <a
                      href={whatsappLink(
                        `Hello Material Square, I am looking for a material not listed: "${searchQuery}". Can you supply this to my site?`,
                        siteContent["contact.whatsappPhone"],
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
                Showing {visibleListingCards.length} of {listingCards.length} marketplace cards
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

    </div>
  );
}
