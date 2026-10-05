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
import { matchesCatalogueSearch } from '../search/catalogue-search';

export default function SearchSuggestions({
  products = [],
  query = '',
  isOpen = false,
  onSelectSuggestion,
  onSelectCategory,
  onSelectBrand,
  onSelectProduct,
  className = '',
}: { products?: CatalogueProduct[]; query?: string; isOpen?: boolean; onSelectSuggestion?: (query: string) => void; onSelectCategory?: (category: string) => void; onSelectBrand?: (brand: string) => void; onSelectProduct?: (product: CatalogueProduct) => void; className?: string }) {
  const trimmed = query.trim().toLowerCase();
  const categories = useMemo(() => Array.from(new Map(products.map((product) => [product.category, product.categoryLabel])).entries()).map(([id, label]) => ({ id, label })), [products]);
  const brands = useMemo(() => Array.from(new Set(products.map((product) => product.brand).filter(Boolean))).map((name) => ({ name, category: products.find((product) => product.brand === name)?.categoryLabel || "" })), [products]);

  // Filter matching products
  const matchingProducts = useMemo(() => {
    if (!isOpen || !trimmed) return [];
    return products.filter((item) => matchesCatalogueSearch(item, trimmed)).sort((a, b) => {
      const score = (item: CatalogueProduct) => {
        const name = item.name.toLowerCase();
        const brand = item.brand.toLowerCase();
        return (name.startsWith(trimmed) ? 5 : 0)
          + (brand.startsWith(trimmed) ? 4 : 0)
          + (item.inStock || item.variants?.some((variant) => variant.inStock) ? 2 : 0)
          + (name.includes(trimmed) ? 1 : 0);
      };
      return score(b) - score(a);
    }).slice(0, 5); // Prioritize exact and in-stock matches, then show a short list.
  }, [isOpen, trimmed, products]);

  // Filter matching brands
  const matchingBrands = useMemo(() => {
    if (!isOpen || !trimmed) return [];
    return brands.filter(
      (b) =>
        b.name.toLowerCase().includes(trimmed) ||
        b.category.toLowerCase().includes(trimmed)
    ).slice(0, 3);
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
                  <button
                    key={prod.id}
                    type="button"
                    className="product-suggestion-item"
                    onClick={() => {
                      if (onSelectProduct) {
                        onSelectProduct(prod);
                      } else if (onSelectSuggestion) {
                        onSelectSuggestion(prod.name);
                      }
                    }}
                  >
                    <ProductImage src={prod.image} alt={prod.name} className="product-suggest-thumb" />
                    <div className="product-suggest-info">
                      <div className="suggest-title">{prod.name}</div>
                      <div className="suggest-meta">
                        <span className="suggest-brand">{prod.brand}</span>
                        <span className="suggest-dot">•</span>
                        <span className="suggest-price">{prod.price != null ? `₹${Number(prod.price).toLocaleString('en-IN')}` : prod.variants?.some(variant => variant.price != null) ? `From ₹${Math.min(...prod.variants.filter(variant => variant.price != null).map(variant => Number(variant.price))).toLocaleString('en-IN')}` : 'Request a quotation'}</span>
                      </div>
                    </div>
                    <ArrowRight size={14} className="suggest-arrow" />
                  </button>
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
              <div className="brands-suggestion-chips">
                {matchingBrands.map((brand) => (
                  <button
                    key={brand.name}
                    type="button"
                    className="brand-suggest-chip"
                    onClick={() => onSelectBrand && onSelectBrand(brand.name)}
                  >
                    <span className="brand-dot" />
                    <strong>{brand.name}</strong>
                    <span className="brand-category">({brand.category})</span>
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
