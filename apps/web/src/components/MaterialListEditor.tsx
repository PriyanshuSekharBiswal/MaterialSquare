import { materialId } from "../ids";
import type { CatalogueProduct, CatalogueVariant } from "../types";
import React, { useState } from "react";
import { useCustomer } from "../customer";
import ProductImage from "./ProductImage";
import { customerPriceNote } from "../catalogue/customer-display";
export default function MaterialListEditor({ products = [] }: { products?: CatalogueProduct[] }) {
  const { items, updateItems, canEdit } = useCustomer();
  const [custom, setCustom] = useState("");
  return (
    <div>
      <h2>
        Your quote list <small>({items.length})</small>
      </h2>
      <p>
        Select quantities and variants, then send the list to the team for a confirmed quote.
      </p>
      {!items.length && (
        <p>
          Your list is empty. Browse the catalogue and add the products you need.
        </p>
      )}
      {items.map((item) => {
        const product = products.find((candidate) => candidate.id === (item.catalogueId || item.id));
        const selectedVariant = product?.variants?.find((variant) => variant.id === item.variantId);
        const optionLabel = (variant: CatalogueVariant) => [
          variant.label,
          ...Object.entries(variant.attributes || {}).map(([key, value]) => `${key}: ${value}`),
        ].filter(Boolean).join(" · ");
        const changeVariant = (variantId: string) => {
          const variant = product?.variants?.find((candidate) => candidate.id === variantId);
          updateItems((old) => old.map((row) => row.id === item.id ? {
            ...row,
            variantId: variant?.id,
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
        return (
        <div className="material-editor" key={item.id}>
          {(product || item.image) && <ProductImage className="material-thumb" src={item.image || product?.image} alt={`${item.name} product`} />}
          <h3>{item.name}</h3>
          <span>
            {item.brand}
            {item.code ? ` · ${item.code}` : ""}
          </span>
          {item.price != null && <p className="catalogue-price-caveat">
            Indicative estimate: ₹{Number(item.price).toLocaleString("en-IN")} / {item.unit}
            {customerPriceNote(item.priceNote) ? ` · ${customerPriceNote(item.priceNote)}` : " · Confirm current price with staff"}
          </p>}
          <div className="material-fields">
            <label>
              Quantity
              <input
                aria-label={`Quantity for ${item.name}`}
                type="number"
                min={item.minOrderQuantity || 0.001}
                max="1000000"
                step="any"
                required
                value={item.quantity ?? 1}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (n > 0 && n <= 1000000)
                    updateItems((old) =>
                      old.map((i) =>
                        i.id === item.id ? { ...i, quantity: n } : i,
                      ),
                    );
                }}
              />
            </label>
            <label>
              Unit
              <select
                aria-label={`Unit for ${item.name}`}
                value={item.unit}
                disabled={Boolean(selectedVariant)}
                onChange={(e) =>
                  updateItems((old) =>
                    old.map((i) =>
                      i.id === item.id ? { ...i, unit: e.target.value } : i,
                    ),
                  )
                }
              >
                {Array.from(
                  new Set([
                    item.unit,
                    "Pieces",
                    "Metres",
                    "Bags",
                    "Kg",
                    "MT",
                    "Litres",
                    "Boxes",
                    "Rolls",
                  ]),
                ).map((unit) => (
                  <option key={unit}>{unit}</option>
                ))}
              </select>
            </label>
            <label className="material-spec">
              {selectedVariant ? "Selected product option" : "Size / specification / preferred variant"}
              <input
                maxLength={500}
                placeholder="Enter the required size or ask staff to confirm"
                value={item.specification || ""}
                readOnly={Boolean(selectedVariant)}
                onChange={(e) =>
                  updateItems((old) =>
                    old.map((i) =>
                      i.id === item.id
                        ? { ...i, specification: e.target.value }
                        : i,
                    ),
                  )
                }
              />
            </label>
            {product?.variants?.length ? <label className="material-spec">
              Product option
              <select aria-label={`Product option for ${item.name}`} value={selectedVariant?.id || ""} onChange={(event) => changeVariant(event.target.value)}>
                <option value="">Custom size or confirm with team</option>
                {product.variants.map((variant) => {
                  const status = variant.availabilityStatus || (variant.inStock ? "IN_STOCK" : "CHECK_AVAILABILITY");
                  return <option key={variant.id} value={variant.id}>{optionLabel(variant)}{variant.price != null ? ` · ₹${Number(variant.price).toLocaleString("en-IN")}/${variant.unit}` : ""}{status === "OUT_OF_STOCK" ? " · Out of stock" : ""}</option>;
                })}
              </select>
              {selectedVariant?.minOrderQuantity && <small>Minimum order for this option: {selectedVariant.minOrderQuantity} {selectedVariant.unit}</small>}
            </label> : null}
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={()=>updateItems(old=>[...old,{...item,id:`variant-${materialId()}`,catalogueId:item.catalogueId||item.id,variantId:undefined,minOrderQuantity:undefined,price:undefined,compareAtPrice:undefined,priceNote:undefined,specification:'',quantity:1}])}>{product?.variants?.length ? "Add another option" : "Add another size"}</button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() =>
              updateItems((old) => old.filter((i) => i.id !== item.id))
            }
          >
            Remove {item.name}
          </button>
        </div>
      );})}
      <div className="customer-form" style={{ marginTop: 20 }}>
        <label>
          Can't find a material?
          <input
            value={custom}
            maxLength={300}
            placeholder="Material name"
            onChange={(e) => setCustom(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={!canEdit || !custom.trim()}
          onClick={() => {
            const accepted = updateItems((old) => [
              ...old,
              {
                id: `custom-${materialId()}`,
                name: custom.trim(),
                brand: "To be confirmed",
                unit: "Pieces",
                quantity: 1,
              },
            ]);
            if (accepted) setCustom("");
          }}
        >
          Add custom material
        </button>
      </div>
    </div>
  );
}
