import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronDown, Search, ShoppingCart } from "lucide-react";
import { materialId } from "../ids";
import { useCustomer } from "../customer";
import { trackWebsiteEvent } from "../analytics";
import { matchesCatalogueSearch, scoreCatalogueSearch } from "../search/catalogue-search";
import type { CatalogueProduct, MaterialItem } from "../types";
import ProductImage from "./ProductImage";

export default function MaterialCartFinder({ products = [], loading = false }: { products?: CatalogueProduct[]; loading?: boolean }) {
  const { items, updateItems, canEdit } = useCustomer();
  const [query, setQuery] = useState("");
  const [suggestionVariants, setSuggestionVariants] = useState<Record<string, string>>({});
  const suggestedProducts = useMemo(() => {
    const search = query.trim();
    if (search.length < 2) return [];
    return products
      .filter((product) => matchesCatalogueSearch(product, search))
      .sort((a, b) => scoreCatalogueSearch(b, search) - scoreCatalogueSearch(a, search))
      .slice(0, 5);
  }, [products, query]);

  const addProduct = (product: CatalogueProduct) => {
    const variants = product.variants || [];
    const variant = variants.find((candidate) => candidate.id === suggestionVariants[product.id]) || variants[0];
    const minimum = Number(variant?.minOrderQuantity || product.minOrderQty?.match(/[\d.]+/)?.[0] || 1) || 1;
    const specification = variant
      ? [variant.label, ...Object.entries(variant.attributes || {}).map(([key, value]) => `${key}: ${value}`)].filter(Boolean).join(" · ")
      : "";
    const item: MaterialItem = {
      ...product,
      ...(variant ? {
        code: variant.code || product.code,
        variantId: variant.id,
        price: variant.price ?? product.price,
        compareAtPrice: variant.compareAtPrice ?? product.compareAtPrice,
        priceNote: variant.priceNote || product.priceNote,
        minOrderQuantity: variant.minOrderQuantity,
        inStock: variant.inStock,
        image: variant.image || product.image,
        galleryImages: variant.galleryImages || product.galleryImages,
      } : {}),
      catalogueId: product.id,
      id: `${product.id}-${materialId()}`,
      unit: variant?.unit || product.unit,
      quantity: minimum,
      specification,
    };
    if (updateItems((previous) => [...previous, item])) {
      trackWebsiteEvent({ type: "add_to_list", target: product.id });
      setQuery("");
    }
  };

  const addCustomMaterial = () => {
    const name = query.trim();
    if (!name) return;
    const accepted = updateItems((old) => [...old, {
      id: `custom-${materialId()}`,
      name,
      brand: "To be confirmed",
      unit: "Pieces",
      quantity: 1,
    }]);
    if (accepted) setQuery("");
  };

  return <section className="material-cart-finder" aria-labelledby="material-cart-finder-title">
    <div className="material-cart-finder-heading">
      <span>ADD TO YOUR CART</span>
      <h3 id="material-cart-finder-title">Find another material</h3>
      <p>Enter a material name to see matching catalogue products.</p>
    </div>
    <label className="material-cart-search">
      <Search size={18} aria-hidden="true" />
      <input
        value={query}
        maxLength={300}
        placeholder="Enter a material name"
        aria-label="Enter a material name"
        aria-controls="material-cart-suggestions"
        onChange={(event) => setQuery(event.target.value)}
      />
    </label>
    {query.trim().length >= 2 && <div id="material-cart-suggestions" className="material-cart-suggestions" aria-live="polite">
      {loading ? <div className="material-cart-suggestion-skeletons" role="status" aria-label="Loading material suggestions">
        {Array.from({ length: 3 }, (_, index) => <div className="material-cart-suggestion-skeleton" key={index}><span /><div><i /><i /><i /></div><b /></div>)}
      </div> : suggestedProducts.length ? suggestedProducts.map((product) => {
        const variants = product.variants || [];
        const chosenVariant = variants.find((variant) => variant.id === suggestionVariants[product.id]) || variants[0];
        const existingItem = items.find((item) => (item.catalogueId || item.id) === product.id);
        const price = chosenVariant?.price ?? product.price;
        return <article className="material-cart-suggestion" key={product.id}>
          <ProductImage className="material-cart-suggestion-image" src={chosenVariant?.image || product.image} alt={`${product.name} product`} />
          <div className="material-cart-suggestion-info">
            <span className="material-cart-suggestion-meta">{product.brand} · {product.categoryLabel}</span>
            <strong>{product.name}</strong>
            <small>{chosenVariant ? `${chosenVariant.label} · ${chosenVariant.unit}` : product.packaging || product.unit}</small>
            {variants.length > 1 && <label className="material-cart-suggestion-option">
              <span>Option</span>
              <span className="material-select-wrap">
                <select
                  aria-label={`Choose option for ${product.name}`}
                  value={chosenVariant?.id || ""}
                  onChange={(event) => setSuggestionVariants((previous) => ({ ...previous, [product.id]: event.target.value }))}
                >
                  {variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.label} · {variant.unit}</option>)}
                </select>
                <ChevronDown size={14} aria-hidden="true" />
              </span>
            </label>}
            <small className="material-cart-suggestion-price">{price != null ? `₹${Number(price).toLocaleString("en-IN")} / ${chosenVariant?.unit || product.unit}` : "Price confirmed with the team"}</small>
          </div>
          {existingItem
            ? <Link className="material-cart-suggestion-action is-in-cart" to={`/material-list?item=${encodeURIComponent(existingItem.id)}`}><Check size={15} /> In cart</Link>
            : <button className="material-cart-suggestion-action" type="button" disabled={!canEdit} onClick={() => addProduct(product)}><ShoppingCart size={15} /> Add to cart</button>}
        </article>;
      }) : <p className="material-cart-no-results">No catalogue matches found.</p>}
    </div>}
    {query.trim().length >= 2 && !loading && suggestedProducts.length === 0 && <div className="material-custom-entry">
      <span>Can’t find a material?</span>
      <button type="button" className="btn btn-secondary" disabled={!canEdit} onClick={addCustomMaterial}>Add as custom material</button>
    </div>}
  </section>;
}
