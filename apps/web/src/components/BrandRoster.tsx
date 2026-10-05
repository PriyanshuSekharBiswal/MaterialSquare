import React, { useState } from 'react';
import type { CatalogueProduct } from '../types';
import { BrandLogo, getBrandMeta } from './icons/BrandBadges';

export default function BrandRoster({ products, onSelectBrand, selectedBrand }: { products: CatalogueProduct[]; onSelectBrand: (brand: string) => void; selectedBrand: string }) {
  const [filterCategory, setFilterCategory] = useState('All');

  const brands = Array.from(new Map(products.filter((product) => product.brand.trim()).map((product) => [product.brand, product.categoryLabel])).entries())
    .map(([name, category]) => ({ name, category, meta: getBrandMeta(name) }));
  const categories = ['All', ...Array.from(new Set(brands.map((brand) => brand.category)))];

  const filteredBrands = filterCategory === 'All'
    ? brands
    : brands.filter((brand) => brand.category === filterCategory);

  return (
    <section id="brands" className="ms-brand-roster-section">
      <div className="container">
        {/* Section Header */}
        <div className="brand-roster-header">
          <div className="roster-header-text">
            <span className="badge-orange reveal-text">Brands in the catalogue</span>
            <h2 className="section-title reveal-title">
              <span className="ms-mask-line">
                <span className="ms-mask-text">Explore brands.</span>
              </span>{' '}
              <span className="ms-mask-line">
                <span className="ms-mask-text delay-1">One Destination.</span>
              </span>
            </h2>
            <p className="section-subtitle reveal-text">
                Choose a brand to see the products currently listed in the catalogue.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="roster-filter-pills reveal-text">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`roster-pill ${filterCategory === cat ? 'active' : ''}`}
                onClick={() => setFilterCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Brand Cards Grid */}
        <div className="brand-cards-grid reveal-stagger">
          {filteredBrands.map((brand) => {
            const isSelected = selectedBrand === brand.name;
            return (
              <div
                key={brand.name}
                className={`brand-partner-card ${isSelected ? 'selected-brand' : ''}`}
                onClick={() => onSelectBrand(brand.name === selectedBrand ? '' : brand.name)}
                role="button"
                tabIndex={0}
                title={`Filter products by ${brand.name}`}
              >
                <div className="brand-card-top">
                  <span className="brand-category-badge">{brand.category}</span>
                  <span className="brand-category-badge">View catalogue</span>
                </div>

                <div className="brand-logo-frame">
                  <BrandLogo id={brand.meta?.id || brand.name} className="brand-logo-svg" />
                </div>

                <div className="brand-info-plate">
                  <p className="brand-tagline-text">Products listed in {brand.category.toLowerCase()}</p>
                </div>

                <div className="brand-card-footer">
                  <span className="click-to-filter">
                    {isSelected ? '✓ Showing Products' : 'Click to View Products →'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
