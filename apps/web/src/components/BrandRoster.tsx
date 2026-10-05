import React, { useState } from 'react';
import type { CatalogueProduct } from '../types';
import { BrandLogo, getBrandMeta } from './icons/BrandBadges';
import { partnerBrandMatchesProduct, type PartnerBrand } from '../partner-brands';

export default function BrandRoster({ products, partnerBrands, onSelectBrand, selectedBrand }: { products: CatalogueProduct[]; partnerBrands: PartnerBrand[]; onSelectBrand: (brand: string) => void; selectedBrand: string }) {
  const [filterCategory, setFilterCategory] = useState('All');

  const brands = partnerBrands.map(({ name, category, id }) => ({ name, category, id, meta: getBrandMeta(id) }));
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
            <span className="badge-orange reveal-text">Authorised partner brands</span>
            <h2 className="section-title reveal-title">
              <span className="ms-mask-line">
                <span className="ms-mask-text">Explore brands.</span>
              </span>{' '}
              <span className="ms-mask-line">
                <span className="ms-mask-text delay-1">One Destination.</span>
              </span>
            </h2>
            <p className="section-subtitle reveal-text">
                Browse all partner brands. Availability and product variants depend on current listings.
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
              const listedCount = products.filter((product) => partnerBrandMatchesProduct(brand.name, product.brand, `${product.category} ${product.categoryLabel}`)).length;
              return (
              <button
                key={brand.name}
                className={`brand-partner-card ${isSelected ? 'selected-brand' : ''}`}
                type="button"
                onClick={() => onSelectBrand(brand.name === selectedBrand ? '' : brand.name)}
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
                  <p className="brand-tagline-text">{listedCount ? `${listedCount} product${listedCount === 1 ? '' : 's'} listed in ${brand.category.toLowerCase()}` : `Partner brand · ${brand.category}`}</p>
                </div>

                <div className="brand-card-footer">
                  <span className="click-to-filter">
                    {isSelected ? '✓ Showing Products' : 'Click to View Products →'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
