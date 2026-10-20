import { useEffect, useId, useRef, useState } from "react";
import { normalizeCatalogueCategory, resolveCatalogueCategoryId, STOREFRONT_CATEGORIES, type ManagedCatalogueCategory } from "@material-square/types";

export type SupplierCatalogueVariant = {
  id: string;
  label: string;
  unit: string;
  productName: string;
  brand: string;
  category: string;
};
export type SupplierBrandCatalogEntry = { brand: string; categories: string[] };
export type SupplierBrandOption = { name: string; categories: string[] };

type Props = {
  variants: SupplierCatalogueVariant[];
  brandOptions?: SupplierBrandOption[];
  selectedProductNames: string[];
  onProductNamesChange: (productNames: string[]) => void;
  onBrandCatalogChange?: (brandCatalog: SupplierBrandCatalogEntry[]) => void;
  onDraftStateChange?: (hasDraft: boolean) => void;
  saveLabel?: string;
};

const displayBrand = (brand: string) =>
  brand.trim().toLocaleLowerCase() === "supreme (as written on sample quotation)"
    ? "Supreme Industries"
    : brand.trim();

const categoryKey = (category: string) => normalizeCatalogueCategory(category);
const displayCategory = (category: string, directory: ManagedCatalogueCategory[]) => {
  const key = categoryKey(category);
  return directory.find((item) => item.id === resolveCatalogueCategoryId(category, directory))?.label
    ?? STOREFRONT_CATEGORIES.find((item) => item.id === key)?.label
    ?? (key === "steel" ? "Steel & Reinforcement" : category.trim());
};

export default function SupplierCataloguePicker({ variants, brandOptions = [], selectedProductNames, onProductNamesChange, onBrandCatalogChange, onDraftStateChange, saveLabel }: Props) {
  const [brands, setBrands] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [productDraft, setProductDraft] = useState("");
  const [productFocused, setProductFocused] = useState(false);
  const [managedCategories, setManagedCategories] = useState<ManagedCatalogueCategory[]>(() => STOREFRONT_CATEGORIES.map(({ id, label }) => ({ id, label, active: true, aliases: [] })));
  const [open, setOpen] = useState<"brands" | "categories" | null>(null);
  const pickerRef = useRef<HTMLElement>(null);
  const productSuggestionsId = useId();
  useEffect(() => {
    onDraftStateChange?.(Boolean(productDraft.trim()));
  }, [onDraftStateChange, productDraft]);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.VITE_API_URL || "/api"}/products/categories`, { headers: { Accept: "application/json" }, signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<ManagedCatalogueCategory[]> : null)
      .then((result) => { if (result && !controller.signal.aborted) setManagedCategories(result.filter((category) => category.active)); })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
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
  const availableBrands = [...new Set([
    ...brandOptions.map((brand) => displayBrand(brand.name)),
    ...variants.map((variant) => displayBrand(variant.brand)),
  ].filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const categoryChoices = new Map<string, string>();
  for (const category of managedCategories) categoryChoices.set(category.id, category.label);
  const activeCategoryIds = new Set(managedCategories.map((category) => category.id));
  for (const category of [...brandOptions.flatMap((brand) => brand.categories), ...variants.map((variant) => variant.category)]) {
    const key = resolveCatalogueCategoryId(category, managedCategories);
    const label = displayCategory(category, managedCategories);
    if (activeCategoryIds.has(key) && label) categoryChoices.set(key, managedCategories.find((item) => item.id === key)?.label || label);
  }
  const availableCategories = [...categoryChoices.values()].sort((a, b) => a.localeCompare(b));
  const productSuggestions = productDraft.trim()
    ? [...new Set(variants.map((variant) => variant.productName.trim()).filter((name) => name && name.toLocaleLowerCase().includes(productDraft.trim().toLocaleLowerCase()) && !selectedProductNames.some((selected) => selected.toLocaleLowerCase() === name.toLocaleLowerCase())))].sort((a, b) => a.localeCompare(b)).slice(0, 8)
    : [];
  const notifyBrandCatalog = (nextBrands: string[], nextCategories: string[]) => {
    onBrandCatalogChange?.(nextBrands.map((brand) => ({
      brand,
      categories: nextCategories,
    })));
  };
  const previewGroups = brands.map((brand) => {
    return {
      brand,
      categories,
    };
  });
  const toggle = (values: string[], value: string) => values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
  const addProductName = (value = productDraft) => {
    const productName = value.trim();
    if (!productName || selectedProductNames.length >= 200 || selectedProductNames.some((item) => item.toLocaleLowerCase() === productName.toLocaleLowerCase())) return;
    onProductNamesChange([...selectedProductNames, productName]);
    setProductDraft("");
  };

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
                <input type="checkbox" checked={brands.includes(brand)} onChange={() => { const nextBrands = toggle(brands, brand); setBrands(nextBrands); setCategories([]); notifyBrandCatalog(nextBrands, []); }} />
                <span>{brand}</span>
              </label>)}
            </div>}
          </div>
          {!!brands.length && <div className="supplier-selected-values" aria-label="Selected brands">{brands.map((brand) => <span key={brand}>{brand}<button type="button" className="supplier-chip-remove" aria-label={`Remove ${brand}`} onClick={() => { const nextBrands = brands.filter((item) => item !== brand); setBrands(nextBrands); setCategories([]); notifyBrandCatalog(nextBrands, []); }}>×</button></span>)}</div>}
        </div>
        <div className="supplier-choice-group">
          <h4><span className="supplier-step-title"><b>2</b> Categories <em>Optional</em></span><small>{categories.length} selected</small></h4>
          <p className="supplier-choice-help">Choose the categories they carry from those brands, or skip this.</p>
          <div className={`supplier-multiselect${open === "categories" ? " is-open" : ""}`}>
            <button type="button" className="supplier-dropdown-trigger" aria-expanded={open === "categories"} onClick={() => setOpen((current) => current === "categories" ? null : "categories")}><span>Choose one or more categories</span><b aria-hidden="true" /></button>
            {open === "categories" && <div className="supplier-multiselect-options" role="group" aria-label="Categories">
              {!brands.length ? <p className="supplier-empty-option">Choose one or more brands first.</p> : availableCategories.length ? availableCategories.map((category) => <label className="supplier-multiselect-option" key={category}>
                <input type="checkbox" checked={categories.includes(category)} onChange={() => { const nextCategories = toggle(categories, category); setCategories(nextCategories); notifyBrandCatalog(brands, nextCategories); }} />
                <span>{category}</span>
              </label>) : <p className="supplier-empty-option" role="status">No categories are available for the selected brands right now.</p>}
            </div>}
          </div>
          {!!categories.length && <div className="supplier-selected-values" aria-label="Selected categories">{categories.map((category) => <span key={category}>{category}<button type="button" className="supplier-chip-remove" aria-label={`Remove ${category}`} onClick={() => { const nextCategories = categories.filter((item) => item !== category); setCategories(nextCategories); notifyBrandCatalog(brands, nextCategories); }}>×</button></span>)}</div>}
        </div>
        <div className="supplier-choice-group supplier-products-choice">
          <h4><span className="supplier-step-title"><b>3</b> Products <em>Optional</em></span><small>{selectedProductNames.length} listed</small></h4>
          <p className="supplier-choice-help">List any products this supplier carries. Inventory selection is not required; press Enter after each product.</p>
          <div className="supplier-product-entry">
            <input
              aria-label="Product name"
              aria-autocomplete="list"
              aria-controls={productSuggestionsId}
              aria-expanded={productFocused && productSuggestions.length > 0}
              maxLength={200}
              placeholder="Write product name with proper details"
              value={productDraft}
              onChange={(event) => setProductDraft(event.currentTarget.value)}
              onFocus={() => setProductFocused(true)}
              onBlur={() => setProductFocused(false)}
              onKeyDown={(event) => {
                if (event.key === "Escape" && productFocused && productSuggestions.length > 0) {
                  event.preventDefault();
                  event.stopPropagation();
                  setProductFocused(false);
                  return;
                }
                if (event.key === "Enter") {
                  event.preventDefault();
                  addProductName();
                }
              }}
            />
            {productFocused && productSuggestions.length > 0 && <div id={productSuggestionsId} className="supplier-product-suggestions" role="listbox" aria-label="Suggested products">
              {productSuggestions.map((name) => <button type="button" role="option" aria-selected="false" key={name} onMouseDown={(event) => event.preventDefault()} onClick={() => addProductName(name)}>{name}</button>)}
            </div>}
          </div>
          {!!selectedProductNames.length && <div className="supplier-selected-values" aria-label="Listed products">{selectedProductNames.map((name) => <span key={name}>{name}<button type="button" className="supplier-chip-remove" aria-label={`Remove ${name}`} onClick={() => onProductNamesChange(selectedProductNames.filter((item) => item !== name))}>×</button></span>)}</div>}
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
                  <p><strong>Products:</strong> {selectedProductNames.length ? selectedProductNames.join(", ") : "Not specified"}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="supplier-selection-preview-empty">Choose a brand above to preview its card.</p>
          )}
          {!previewGroups.length && selectedProductNames.length > 0 && <p className="supplier-selection-preview-empty"><strong>Products:</strong> {selectedProductNames.join(", ")}</p>}
        </div>
      </details>
    </section>
  );
}
