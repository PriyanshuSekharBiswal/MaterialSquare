import { useEffect, useRef, useState } from "react";

export type SupplierCatalogueVariant = {
  id: string;
  label: string;
  unit: string;
  productName: string;
  brand: string;
  category: string;
};
export type SupplierBrandCatalogEntry = { brand: string; categories: string[] };

type Props = {
  variants: SupplierCatalogueVariant[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  onBrandCatalogChange?: (brandCatalog: SupplierBrandCatalogEntry[]) => void;
  saveLabel?: string;
};

const displayBrand = (brand: string) =>
  brand.trim().toLocaleLowerCase() === "supreme (as written on sample quotation)"
    ? "Supreme Industries"
    : brand.trim();

export default function SupplierCataloguePicker({ variants, selectedIds, onChange, onBrandCatalogChange, saveLabel }: Props) {
  const [brands, setBrands] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [open, setOpen] = useState<"brands" | "categories" | "products" | null>(null);
  const pickerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setOpen(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);
  const availableBrands = [...new Set(variants.map((variant) => displayBrand(variant.brand)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const availableCategories = [...new Set(variants.filter((variant) => brands.includes(displayBrand(variant.brand))).map((variant) => variant.category.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const availableProducts = variants.filter((variant) => brands.includes(displayBrand(variant.brand)) && categories.includes(variant.category));
  const selectedProducts = variants.filter((variant) => selectedIds.includes(variant.id));
  const notifyBrandCatalog = (nextBrands: string[], nextCategories: string[]) => {
    onBrandCatalogChange?.(nextBrands.map((brand) => ({
      brand,
      categories: nextCategories.filter((category) => variants.some((variant) => displayBrand(variant.brand) === brand && variant.category.trim() === category)),
    })));
  };
  const previewGroups = brands.map((brand) => {
    const brandVariants = variants.filter((variant) => displayBrand(variant.brand) === brand);
    return {
      brand,
      categories: categories.filter((category) => brandVariants.some((variant) => variant.category.trim() === category)),
      products: [...new Set(selectedProducts.filter((product) => displayBrand(product.brand) === brand).map((product) => product.productName.trim()).filter(Boolean))],
    };
  });
  const toggle = (values: string[], value: string) => values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

  return (
    <section ref={pickerRef} className="supplier-catalogue-picker" aria-labelledby="supplier-catalogue-heading">
      <div className="supplier-catalogue-picker-heading">
        <h3 id="supplier-catalogue-heading">What this supplier sells</h3>
        <p>Supplier catalogue details are optional. Add brands, categories, and products now or later.</p>
      </div>
      {saveLabel && <div className="supplier-save-hint" role="note"><strong>Remember to save:</strong> your selections are saved when you click <b>{saveLabel}</b> below.</div>}
      <div className="supplier-selection-steps">
        <div className="supplier-choice-group">
          <h4><span className="supplier-step-title"><b>1</b> Brands</span><small>{brands.length} selected</small></h4>
          <p className="supplier-choice-help">Choose all brands this supplier sells.</p>
          <div className={`supplier-multiselect${open === "brands" ? " is-open" : ""}`}>
            <button type="button" className="supplier-dropdown-trigger" aria-expanded={open === "brands"} onClick={() => setOpen((current) => current === "brands" ? null : "brands")}><span>Choose one or more brands</span><b aria-hidden="true" /></button>
            {open === "brands" && <div className="supplier-multiselect-options" role="group" aria-label="Brands">
              {availableBrands.map((brand) => <label className="supplier-multiselect-option" key={brand}>
                <input type="checkbox" checked={brands.includes(brand)} onChange={() => { const nextBrands = toggle(brands, brand); setBrands(nextBrands); setCategories([]); onChange([]); notifyBrandCatalog(nextBrands, []); }} />
                <span>{brand}</span>
              </label>)}
            </div>}
          </div>
          {!!brands.length && <div className="supplier-selected-values" aria-label="Selected brands">{brands.map((brand) => <span key={brand}>{brand}<button type="button" className="supplier-chip-remove" aria-label={`Remove ${brand}`} onClick={() => { const nextBrands = brands.filter((item) => item !== brand); setBrands(nextBrands); setCategories([]); onChange([]); notifyBrandCatalog(nextBrands, []); }}>×</button></span>)}</div>}
        </div>
        <div className="supplier-choice-group">
          <h4><span className="supplier-step-title"><b>2</b> Categories <em>Optional</em></span><small>{categories.length} selected</small></h4>
          <p className="supplier-choice-help">Choose the categories they carry from those brands, or skip this.</p>
          <div className={`supplier-multiselect${open === "categories" ? " is-open" : ""}`}>
            <button type="button" className="supplier-dropdown-trigger" aria-expanded={open === "categories"} onClick={() => setOpen((current) => current === "categories" ? null : "categories")}><span>Choose one or more categories</span><b aria-hidden="true" /></button>
            {open === "categories" && <div className="supplier-multiselect-options" role="group" aria-label="Categories">
              {!brands.length ? <p className="supplier-empty-option">Choose one or more brands first.</p> : availableCategories.length ? availableCategories.map((category) => <label className="supplier-multiselect-option" key={category}>
                <input type="checkbox" checked={categories.includes(category)} onChange={() => { const nextCategories = toggle(categories, category); setCategories(nextCategories); onChange([]); notifyBrandCatalog(brands, nextCategories); }} />
                <span>{category}</span>
              </label>) : <p className="supplier-empty-option">No categories are available for the selected brands right now.</p>}
            </div>}
          </div>
          {!!categories.length && <div className="supplier-selected-values" aria-label="Selected categories">{categories.map((category) => <span key={category}>{category}<button type="button" className="supplier-chip-remove" aria-label={`Remove ${category}`} onClick={() => { const nextCategories = categories.filter((item) => item !== category); setCategories(nextCategories); onChange([]); notifyBrandCatalog(brands, nextCategories); }}>×</button></span>)}</div>}
        </div>
        <div className="supplier-choice-group supplier-products-choice">
          <h4><span className="supplier-step-title"><b>3</b> Products <em>Optional</em></span><small>{selectedIds.length} selected</small></h4>
          <p className="supplier-choice-help">Select matching catalogue products now or add them later.</p>
          <div className={`supplier-multiselect supplier-product-multiselect${open === "products" ? " is-open" : ""}`}>
            <button type="button" className="supplier-dropdown-trigger" aria-expanded={open === "products"} onClick={() => setOpen((current) => current === "products" ? null : "products")}><span>{selectedIds.length ? `${selectedIds.length} catalogue products selected` : "Choose catalogue products"}</span><b aria-hidden="true" /></button>
            {open === "products" && <div className="supplier-multiselect-options supplier-product-options" role="group" aria-label="Products">
              {!brands.length || !categories.length ? <p className="supplier-empty-option">Choose a brand and category to see matching products.</p> : !availableProducts.length ? <p className="supplier-empty-option">No products are available for the selected brands and categories right now.</p> : availableProducts.map((product) => <label className="supplier-multiselect-option supplier-product-option" key={product.id}>
                <input type="checkbox" checked={selectedIds.includes(product.id)} onChange={() => onChange(toggle(selectedIds, product.id))} />
                <span><strong>{product.productName}</strong><small>{product.brand} · {product.category} · {product.label} · {product.unit}</small></span>
              </label>)}
            </div>}
          </div>
          {!!selectedProducts.length && <div className="supplier-selected-products"><strong>{selectedProducts.length} selected</strong>{selectedProducts.map((product) => <span key={product.id}>{product.productName} · {product.label}</span>)}</div>}
        </div>
      </div>
      <details className="supplier-selection-preview">
        <summary>Preview</summary>
        <div className="supplier-selection-preview-content">
          <p className="supplier-selection-preview-help">Review how this supplier’s brand and product cards will look.</p>
          {previewGroups.length ? (
            <div className="bc-supplier-brand-groups">
              {previewGroups.map((group) => (
                <article className="bc-supplier-brand-card" key={group.brand.toLocaleLowerCase()}>
                  <p><strong>Brands Name:</strong> {group.brand || "Not specified"}</p>
                  <p><strong>Categories:</strong> {group.categories.length ? group.categories.join(", ") : "Not specified"}</p>
                  <p><strong>Products:</strong> {group.products.length ? group.products.join(", ") : "Not specified"}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="supplier-selection-preview-empty">Choose a brand above to preview its card.</p>
          )}
        </div>
      </details>
    </section>
  );
}
