import type { CatalogueProduct } from '../types';
import React, { useMemo } from 'react';
import {
  Search,
  TrendingUp,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import './SearchSuggestions.css';
import ProductImage from "./ProductImage";
import { matchesCatalogueSearch, scoreCatalogueSearch } from '../search/catalogue-search';
import { BrandLogo } from "./icons/BrandBadges";
import { partnerBrandMatchesProduct, type PartnerBrand } from "../partner-brands";
import { bestMatchingVariant } from "../search/variant-match";

export default function SearchSuggestions({
  products = [],
  partnerBrands = [],
  query = '',
  isOpen = false,
  onSelectSuggestion,
  onSelectCategory,
  onSelectBrand,
  onSelectProduct,
  className = '',
}: { products?: CatalogueProduct[]; partnerBrands?: PartnerBrand[]; query?: string; isOpen?: boolean; onSelectSuggestion?: (query: string) => void; onSelectCategory?: (category: string) => void; onSelectBrand?: (brand: string) => void; onSelectProduct?: (product: CatalogueProduct, query: string) => void; className?: string }) {
  const trimmed = query.trim().toLowerCase();
  const categories = useMemo(() => Array.from(new Map(products.map((product) => [product.category, product.categoryLabel])).entries()).map(([id, label]) => ({ id, label })), [products]);
  const brands = useMemo(() => {
    const directory = partnerBrands.map((brand) => ({ name: brand.name, category: brand.category, id: brand.id }));
    const known = new Set(directory.map((brand) => brand.name.toLocaleLowerCase()));
    const listed = Array.from(new Set(products.map((product) => product.brand).filter(Boolean)))
      .filter((name) => !known.has(name.toLocaleLowerCase()))
      .map((name) => ({ name, category: products.find((product) => product.brand === name)?.categoryLabel || "", id: name }));
    return [...directory, ...listed];
  }, [partnerBrands, products]);

  // Filter matching products
  const matchingProducts = useMemo(() => {
    if (!isOpen || !trimmed) return [];
    return products.filter((item) => matchesCatalogueSearch(item, trimmed))
      .sort((a, b) => scoreCatalogueSearch(b, trimmed) - scoreCatalogueSearch(a, trimmed))
      .slice(0, 5);
  }, [isOpen, trimmed, products]);

  // Filter matching brands
  const matchingBrands = useMemo(() => {
    if (!isOpen || !trimmed) return [];
    return brands.filter(
      (b) =>
        b.name.toLowerCase().includes(trimmed) ||
        b.category.toLowerCase().includes(trimmed)
    ).slice(0, 5);
  }, [isOpen, trimmed, brands]);

  // Filter matching categories
  const matchingCategories = useMemo(() => {
    if (!isOpen || !trimmed) return [];
    return categories.filter(
      (c) => c.label.toLowerCase().includes(trimmed)
    ).slice(0, 2);
  }, [isOpen, trimmed, categories]);

  if (!isOpen) return null;

  const hasMatches =
    matchingProducts.length > 0 ||
    matchingBrands.length > 0 ||
    matchingCategories.length > 0;

  return (
    <div
      className={`search-suggestions-dropdown animate-scale-down ${className}`}
      onMouseDown={(e) => e.preventDefault()} // Prevent blur from firing before click
      role="listbox"
      aria-label="Search Suggestions"
    >
      {/* CASE 1: Query is EMPTY — Show Trending Searches & Category Quick Chips */}
      {!trimmed && (
        <div className="suggestions-empty-state">
          {/* Search guidance */}
          <div className="suggestions-section">
            <div className="section-title-row">
              <TrendingUp size={14} className="trending-icon" />
              <span>Find materials</span>
            </div>
            <p className="suggestions-search-hint">Search by product, brand, size, pack, colour or product code.</p>
          </div>

          {/* Quick Categories Bar */}
          <div className="suggestions-section categories-section">
            <div className="section-title-row">
              <Layers size={14} className="categories-icon" />
              <span>Explore by Construction Trade</span>
            </div>
            <div className="quick-category-pills">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className="quick-cat-pill"
                  onClick={() => onSelectCategory && onSelectCategory(cat.id)}
                >
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CASE 2: Query has MATCHES */}
      {trimmed && hasMatches && (
        <div className="suggestions-results-state">
          {/* Matching Products */}
          {matchingProducts.length > 0 && (
            <div className="suggestions-section">
              <div className="section-title-row">
                <Package size={14} className="product-icon" />
                <span>Matching Products</span>
              </div>
              <div className="products-suggestion-list">
                {matchingProducts.map((prod) => (
                  (() => {
                    const matchingVariant = bestMatchingVariant(prod, trimmed);
                    const variantImage = matchingVariant?.image || prod.image;
                    const variantPrice = matchingVariant?.price ?? prod.price;
                    const variantState = matchingVariant?.availabilityStatus || (matchingVariant?.inStock ? "IN_STOCK" : prod.availabilityStatus || "CHECK_AVAILABILITY");
                    return (
                  <button
                    key={prod.id}
                    type="button"
                    className="product-suggestion-item"
                    onClick={() => {
                      if (onSelectProduct) {
                        onSelectProduct(prod, query);
                      } else if (onSelectSuggestion) {
                        onSelectSuggestion(prod.name);
                      }
                    }}
                  >
                    <ProductImage src={variantImage} alt={prod.name} className="product-suggest-thumb" />
                    <div className="product-suggest-info">
                      <div className="suggest-title">{prod.name}</div>
                      <div className="suggest-meta">
                        <span className="suggest-brand">{prod.brand} · {prod.categoryLabel}</span>
                        <span className="suggest-dot">•</span>
                        <span className="suggest-price">{variantPrice != null ? `₹${Number(variantPrice).toLocaleString('en-IN')}` : prod.variants?.some(variant => variant.price != null) ? `From ₹${Math.min(...prod.variants.filter(variant => variant.price != null).map(variant => Number(variant.price))).toLocaleString('en-IN')}` : 'Request a quotation'}</span>
                      </div>
                      <div className="suggest-detail">
                        {matchingVariant ? `${matchingVariant.label}${Object.values(matchingVariant.attributes || {}).length ? ` · ${Object.values(matchingVariant.attributes).join(" · ")}` : ""}` : prod.packaging || prod.unit}
                        <span className={`suggest-stock ${variantState === "IN_STOCK" ? "is-stock" : ""}`}>{variantState === "IN_STOCK" ? "In stock" : variantState === "OUT_OF_STOCK" ? "Out of stock" : "Check availability"}</span>
                      </div>
                    </div>
                    <ArrowRight size={14} className="suggest-arrow" />
                  </button>
                    );
                  })()
                ))}
              </div>
            </div>
          )}

          {/* Matching Brands */}
          {matchingBrands.length > 0 && (
            <div className="suggestions-section">
              <div className="section-title-row">
                <ShieldCheck size={14} className="brand-icon" />
                <span>Brands</span>
              </div>
              <div className="brands-suggestion-list">
                {matchingBrands.map((brand) => (
                  <button
                    key={brand.name}
                    type="button"
                    className="brand-suggestion-item"
                    onClick={() => onSelectBrand && onSelectBrand(brand.name)}
                  >
                    <span className="brand-suggest-thumb"><BrandLogo id={brand.id} className="brand-suggest-logo" /></span>
                    <span className="brand-suggest-info">
                      <strong>{brand.name}</strong>
                      <span>{brand.category} · {products.filter((product) => partnerBrandMatchesProduct(brand.name, product.brand, `${product.category} ${product.categoryLabel}`)).length} listed products</span>
                    </span>
                    <span className="brand-suggest-link">Browse brand <ArrowRight size={13} /></span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matching Categories */}
          {matchingCategories.length > 0 && (
            <div className="suggestions-section">
              <div className="section-title-row">
                <Tag size={14} className="tag-icon" />
                <span>Categories</span>
              </div>
              <div className="quick-category-pills">
                {matchingCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className="quick-cat-pill"
                    onClick={() => onSelectCategory && onSelectCategory(cat.id)}
                  >
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Direct View All */}
          <div className="suggestions-footer">
            <button
              type="button"
              className="view-all-results-btn"
              onClick={() => onSelectSuggestion && onSelectSuggestion(query)}
            >
              <Search size={14} />
              <span>Search full marketplace for "{query}"</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* CASE 3: Query has NO MATCHES */}
      {trimmed && !hasMatches && (
        <div className="suggestions-no-results">
          <p>No exact product matches found for <strong>"{query}"</strong></p>
          <span className="no-res-hint">
            Try a brand, product type, size, pack, colour or product code, or press Enter to search the catalogue.
          </span>
          <button
            type="button"
            className="no-res-search-btn"
            onClick={() => onSelectSuggestion && onSelectSuggestion(query)}
          >
            <span>Search marketplace anyway →</span>
          </button>
        </div>
      )}
    </div>
  );
}
