import type { CatalogueProduct, CatalogueVariant, MaterialItem } from "../types";
import { formatQuantityUnit } from "../quantity-format";
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCustomer } from "../customer";
import ProductImage from "./ProductImage";
import { BookmarkPlus, Check, ChevronDown, RotateCcw, Trash2 } from "lucide-react";

const savedItemsStorageKey = "material-square-bom-saved";

function parseMinimumOrder(value: number | string | null | undefined): number {
  if (value == null) return Number.NaN;
  const match = String(value).replace(/,/g, "").match(/^\s*(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : Number.NaN;
}

function readSavedItems(): MaterialItem[] {
  try {
    const value = JSON.parse(localStorage.getItem(savedItemsStorageKey) || "[]");
    return Array.isArray(value) ? value.filter((item) => item && typeof item.id === "string").slice(0, 100) : [];
  } catch {
    return [];
  }
}

export default function MaterialListEditor({ products = [] }: { products?: CatalogueProduct[] }) {
  const { items, updateItems, error } = useCustomer();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const focusItemId = searchParams.get("item");
  const [savedItems, setSavedItems] = useState<MaterialItem[]>(readSavedItems);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => new Set());
  const [focusedItemId, setFocusedItemId] = useState("");
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  const focusItemAvailable = items.some((item) => item.id === focusItemId);
  const uniqueProductCount = new Set(items.map((item) => item.catalogueId || item.id)).size;
  const selectedQuoteCount = items.filter((item) => item.includeInQuote !== false).length;

  useEffect(() => {
    try {
      localStorage.setItem(savedItemsStorageKey, JSON.stringify(savedItems));
    } catch {
      // Saved-for-later is a convenience; the active quote list remains available.
    }
  }, [savedItems]);

  useEffect(() => {
    updateItems((old) => {
      let changed = false;
      const normalized = old.map((item) => {
        const product = products.find((candidate) => candidate.id === (item.catalogueId || item.id));
        const variant = product?.variants?.find((candidate) => candidate.id === item.variantId);
        const productMinimumOrder = product?.minOrderQty?.match(/[\d.]+/)?.[0];
        const minimumOrderRaw = variant?.minOrderQuantity ?? item.minOrderQuantity ?? productMinimumOrder;
        const minimumOrder = parseMinimumOrder(minimumOrderRaw);
        const requiredMinimum = Number.isFinite(minimumOrder) && minimumOrder > 0 ? minimumOrder : 1;
        const currentQuantity = Number(item.quantity ?? 1);
        const quantity = Number.isFinite(currentQuantity) && currentQuantity >= requiredMinimum
          ? currentQuantity
          : requiredMinimum;
        const storedMinimum = Number.isFinite(minimumOrder) && minimumOrder > 0 ? minimumOrder : undefined;
        if (quantity === currentQuantity && String(item.minOrderQuantity ?? "") === String(storedMinimum ?? "")) return item;
        changed = true;
        return { ...item, quantity, minOrderQuantity: storedMinimum };
      });
      return changed ? normalized : old;
    });
  }, [items, products, updateItems]);

  useEffect(() => {
    if (!focusItemId || !focusItemAvailable) return;
    setFocusedItemId(focusItemId);
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    const alignTarget = () => {
      const target = document.getElementById(`material-item-${focusItemId}`);
      if (!target) return;
      const top = target.getBoundingClientRect().top + window.scrollY - 150;
      window.scrollTo({ top: Math.max(0, top), left: 0, behavior: "auto" });
    };
    const frame = window.requestAnimationFrame(() => window.requestAnimationFrame(alignTarget));
    // A hard reload can restore the browser's previous scroll position after the
    // initial render. Re-align briefly while layout and scroll restoration settle.
    const realignTimers = [80, 250].map((delay) => window.setTimeout(alignTarget, delay));
    const cancelRealignment = () => realignTimers.forEach(window.clearTimeout);
    window.addEventListener("wheel", cancelRealignment, { once: true, passive: true });
    window.addEventListener("touchstart", cancelRealignment, { once: true, passive: true });
    window.addEventListener("keydown", cancelRealignment, { once: true });
    const consumeFocusMarker = window.setTimeout(() => navigate("/material-list", { replace: true }), 300);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(consumeFocusMarker);
      realignTimers.forEach(window.clearTimeout);
      window.removeEventListener("wheel", cancelRealignment);
      window.removeEventListener("touchstart", cancelRealignment);
      window.removeEventListener("keydown", cancelRealignment);
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, [focusItemId, focusItemAvailable, navigate]);

  useEffect(() => {
    if (!focusedItemId) return;
    const clearHighlight = window.setTimeout(() => setFocusedItemId(""), 5000);
    return () => window.clearTimeout(clearHighlight);
  }, [focusedItemId]);

  const saveForLater = (item: MaterialItem) => {
    if (!updateItems((old) => old.filter((row) => row.id !== item.id))) return;
    setSavedItems((old) => [item, ...old.filter((row) => row.id !== item.id)]);
  };

  const restoreSavedItem = (item: MaterialItem) => {
    if (!updateItems((old) => [...old, item])) return;
    setSavedItems((old) => old.filter((row) => row.id !== item.id));
  };

  return (
    <div>
      <div className="material-list-heading-row">
        <h2>Your cart</h2>
        <div className="material-list-counts" aria-label={`${items.length} quote lines across ${uniqueProductCount} products`}>
          <span><strong>{items.length}</strong> cart line{items.length === 1 ? "" : "s"}</span>
          <span><strong>{selectedQuoteCount}</strong> quote line{selectedQuoteCount === 1 ? "" : "s"} selected</span>
        </div>
      </div>
      <p>
        Keep items here for later. Select only the products or options you want included in a quotation now.
      </p>
      {error && <p className="customer-error" role="alert">{error}</p>}
      {!items.length && (
        <p>
          Your list is empty. Add products if you know what you need, or attach a project plan in the request form and our team can help you work out a list.
        </p>
      )}
      {items.map((item) => {
        const product = products.find((candidate) => candidate.id === (item.catalogueId || item.id));
        const selectedVariant = product?.variants?.find((variant) => variant.id === item.variantId);
        const productHref = product ? `/product/${encodeURIComponent(product.id)}` : undefined;
        const optionsExpanded = expandedItems.has(item.id);
        const itemPrice = item.price == null ? null : Number(item.price);
        const lineEstimate = itemPrice != null && Number.isFinite(itemPrice)
          ? itemPrice * Number(item.quantity || 1)
          : null;
        const productMinimumOrder = product?.minOrderQty?.match(/[\d.]+/)?.[0];
        const minimumOrderRaw = selectedVariant?.minOrderQuantity ?? item.minOrderQuantity ?? productMinimumOrder;
        const minimumOrderNumber = parseMinimumOrder(minimumOrderRaw);
        const hasMinimumOrder = Number.isFinite(minimumOrderNumber) && minimumOrderNumber > 0;
        const requiredMinimum = hasMinimumOrder ? minimumOrderNumber : 1;
        const minimumOrderLabel = hasMinimumOrder
          ? minimumOrderNumber.toLocaleString("en-IN", { maximumFractionDigits: 3 })
          : "Confirm";
        const optionLabel = (variant: CatalogueVariant) => [
          variant.label,
          ...Object.entries(variant.attributes || {}).map(([key, value]) => `${key}: ${value}`),
        ].filter(Boolean).join(" · ");
        const changeVariant = (variantId: string) => {
          const variant = product?.variants?.find((candidate) => candidate.id === variantId);
          updateItems((old) => old.map((row) => row.id === item.id ? {
            ...row,
            variantId: variant?.id,
            code: variant?.code || product?.code || row.code,
            specification: variant ? optionLabel(variant) : "",
            unit: variant?.unit || product?.unit || row.unit,
            price: variant?.price ?? undefined,
            compareAtPrice: variant?.compareAtPrice ?? undefined,
            priceNote: variant?.priceNote || undefined,
            minOrderQuantity: variant?.minOrderQuantity ?? undefined,
            inStock: variant?.inStock,
            image: variant?.image || product?.image || undefined,
            galleryImages: variant?.galleryImages || product?.galleryImages,
            quantity: variant?.minOrderQuantity && Number(row.quantity || 1) < Number(variant.minOrderQuantity) ? Number(variant.minOrderQuantity) : row.quantity,
          } : row));
        };
        const productDescription = <div className="material-item-description">
            <h3>{item.name}</h3>
            <span className="material-item-brand">{item.brand}{product?.code ? ` · ${product.code}` : !item.variantId && item.code ? ` · ${item.code}` : ""}</span>
            {selectedVariant && <span className="material-selected-option"><Check size={14} aria-hidden="true" /> Selected option: {selectedVariant.label}</span>}
            {!selectedVariant && item.specification && <span className="material-selected-option">Specification: {item.specification}</span>}
            {item.price != null && <p className="catalogue-price-caveat">
              Indicative estimate: ₹{Number(item.price).toLocaleString("en-IN")}
            </p>}
          </div>;
        return (
        <article
          id={`material-item-${item.id}`}
          className={`material-editor${productHref ? " material-editor-linked" : ""}`}
          data-focused={focusedItemId === item.id || undefined}
          key={item.id}
          onClick={(event) => {
            const target = event.target;
            if (!productHref || !(target instanceof Element) || target.closest("a,button,input,select,label,.material-fields,.material-item-actions,.material-option-editor")) return;
            navigate(productHref);
          }}
        >
          <div className="material-item-heading">
            {(product || item.image) && (productHref
              ? <Link className="material-thumb-link" to={productHref}><ProductImage className="material-thumb" src={item.image || product?.image} alt={`${item.name} product`} /></Link>
              : <ProductImage className="material-thumb" src={item.image || product?.image} alt={`${item.name} product`} />)}
            <div className="material-item-content">
              {productHref ? <Link className="material-product-link" to={productHref}>{productDescription}</Link> : productDescription}
              <span className="material-unit-description">Unit: {selectedVariant?.unit || item.unit}</span>
            </div>
          </div>
          <div className="material-fields">
            {lineEstimate != null && <div className="material-line-estimate">
              <span>Estimated line total</span>
              <strong>₹{lineEstimate.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</strong>
            </div>}
            <label className="material-quantity-field">
              <span className="material-quantity-label">
                <span>Quantity</span>
                <small className="material-min-order-pill">MOQ: {minimumOrderLabel}</small>
              </span>
              <input
                aria-label={`Quantity for ${item.name}`}
                type="number"
                min={requiredMinimum}
                max="1000000"
                step="any"
                required
                value={quantityDrafts[item.id] ?? String(Math.max(Number(item.quantity) || 1, requiredMinimum))}
                onChange={(e) => {
                  const value = e.target.value;
                  setQuantityDrafts((old) => ({ ...old, [item.id]: value }));
                  const n = Number(value);
                  if (value !== "" && Number.isFinite(n) && n >= requiredMinimum && n <= 1000000)
                    updateItems((old) =>
                      old.map((i) =>
                        i.id === item.id ? { ...i, quantity: n } : i,
                      ),
                    );
                }}
                onBlur={() => {
                  if (quantityDrafts[item.id] != null) {
                    setQuantityDrafts((old) => {
                      const next = { ...old };
                      delete next[item.id];
                      return next;
                    });
                  }
                }}
              />
            </label>
          </div>
          <div className="material-item-actions">
            <label className="material-quote-toggle">
              <input
                type="checkbox"
                checked={item.includeInQuote !== false}
                aria-label={`Include ${item.name} in this quotation`}
                onChange={(event) => updateItems((old) => old.map((row) => row.id === item.id ? { ...row, includeInQuote: event.target.checked } : row))}
              />
              Include in quote
            </label>
            <button
              type="button"
              className="material-edit-option"
              aria-expanded={optionsExpanded}
              onClick={() => setExpandedItems((old) => {
                const next = new Set(old);
                if (next.has(item.id)) next.delete(item.id);
                else next.add(item.id);
                return next;
              })}
            >
              {optionsExpanded ? "Hide options" : selectedVariant || item.specification ? "Change option" : "Choose option"}
              <ChevronDown size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="material-save-action"
              onClick={() => saveForLater(item)}
            >
              <BookmarkPlus size={15} aria-hidden="true" /> Save for later
            </button>
            <button
              type="button"
              className="material-remove-action"
              aria-label={`Remove ${item.name} from quote list`}
              onClick={() => updateItems((old) => old.filter((row) => row.id !== item.id))}
            >
              <Trash2 size={15} aria-hidden="true" /> Delete
            </button>
          </div>
          {optionsExpanded && <div className="material-option-editor">
            {product?.variants && product.variants.length > 1 ? <label className="material-spec">
              Choose product option
              <div className="material-select-wrap">
                <select aria-label={`Product option for ${item.name}`} value={selectedVariant?.id || ""} onChange={(event) => changeVariant(event.target.value)}>
                  <option value="">Custom size or confirm with team</option>
                  {product.variants.map((variant) => {
                    const status = variant.availabilityStatus || (variant.inStock ? "IN_STOCK" : "CHECK_AVAILABILITY");
                    return <option key={variant.id} value={variant.id}>{optionLabel(variant)}{variant.price != null ? ` · ₹${Number(variant.price).toLocaleString("en-IN")}/${variant.unit}` : ""}{status === "OUT_OF_STOCK" ? " · Out of stock" : ""}</option>;
                  })}
                </select>
                <ChevronDown size={18} aria-hidden="true" />
              </div>
              {selectedVariant?.minOrderQuantity && <small>Minimum order for this option: {formatQuantityUnit(selectedVariant.minOrderQuantity, selectedVariant.unit)}</small>}
            </label> : <>
              <p className="material-option-note">
                {product?.variants?.length === 1
                  ? `This product has one listed option: ${optionLabel(product.variants[0])}. For other sizes or requirements, `
                  : "This product has no listed options. For sizes or specifications, "}
                <Link to="/contact">contact our team</Link>.
              </p>
              <label className="material-spec">
                {product?.variants?.length === 1 ? "Different size or requirement (optional)" : "Size / specification (optional)"}
                <input
                  maxLength={500}
                  placeholder="Tell us what you need"
                  value={item.specification || ""}
                  onChange={(event) => updateItems((old) => old.map((row) => row.id === item.id ? { ...row, specification: event.target.value } : row))}
                />
              </label>
            </>}
          </div>}
        </article>
      );})}
      {savedItems.length > 0 && <section className="material-saved-section" aria-labelledby="material-saved-title">
        <h3 id="material-saved-title">Saved for later <span>{savedItems.length}</span></h3>
        <p>These items stay saved on this device and won’t be included in your quote until you move them back.</p>
        {savedItems.map((item) => <div className="material-saved-row" key={item.id}>
          <div><strong>{item.name}</strong><span>{item.brand}{item.specification ? ` · ${item.specification}` : ""}</span></div>
          <button type="button" onClick={() => restoreSavedItem(item)}><RotateCcw size={14} aria-hidden="true" /> Move to quote list</button>
          <button type="button" className="material-remove-action" aria-label={`Delete saved ${item.name}`} onClick={() => setSavedItems((old) => old.filter((row) => row.id !== item.id))}><Trash2 size={14} aria-hidden="true" /> Delete</button>
        </div>)}
      </section>}
    </div>
  );
}
