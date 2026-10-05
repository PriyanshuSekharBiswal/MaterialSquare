import { materialId } from "../ids";
import type { CatalogueProduct } from "../types";
import React, { useState } from "react";
import { useCustomer } from "../customer";
import ProductImage from "./ProductImage";
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
      {items.map((item) => (
        <div className="material-editor" key={item.id}>
          {(() => { const product=products.find(p=>p.id===(item.catalogueId||item.id)); return product ? <ProductImage className="material-thumb" src={product.image} alt={`${item.name} product`} /> : null; })()}
          <h3>{item.name}</h3>
          <span>
            {item.brand}
            {item.code ? ` · ${item.code}` : ""}
          </span>
          {item.price != null && <p className="catalogue-price-caveat">
            Indicative estimate: ₹{Number(item.price).toLocaleString("en-IN")} / {item.unit}
            {item.compareAtPrice != null && Number(item.compareAtPrice) > Number(item.price) ? ` (reference ₹${Number(item.compareAtPrice).toLocaleString("en-IN")})` : ""}
            {item.priceNote ? ` · ${item.priceNote}` : " · Confirm current price with staff"}
          </p>}
          <div className="material-fields">
            <label>
              Quantity
              <input
                aria-label={`Quantity for ${item.name}`}
                type="number"
                min="0.001"
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
                value={item.unit}
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
              Size / specification / preferred variant
              <input
                maxLength={500}
                placeholder="Enter the required size or ask staff to confirm"
                value={item.specification || ""}
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
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={()=>updateItems(old=>[...old,{...item,id:`variant-${materialId()}`,catalogueId:item.catalogueId||item.id,variantId:undefined,price:undefined,compareAtPrice:undefined,priceNote:undefined,specification:'',quantity:1}])}>Add another size</button>
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
      ))}
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
