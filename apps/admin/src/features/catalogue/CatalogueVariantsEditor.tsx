import { Plus, Trash2 } from "lucide-react";

export type EditableVariant = {
  id?: string;
  code?: string | null;
  label: string;
  attributes: Record<string, string>;
  unit: string;
  price?: string | number | null;
  compareAtPrice?: string | number | null;
  priceNote?: string | null;
  offerLabel?: string | null;
  offerStartsAt?: string | null;
  offerEndsAt?: string | null;
  inStock: boolean;
  isInStock?: boolean;
  availabilityStatus?: "IN_STOCK" | "OUT_OF_STOCK" | "CHECK_AVAILABILITY";
  stockQuantity?: string | number | null;
  minOrderQuantity?: string | number | null;
  quantityBreaks?: Array<{ minimumQuantity: number; unitPrice: number }>;
  sortOrder: number;
};

function toAttributesText(attributes: Record<string, string>) {
  return Object.entries(attributes).map(([name, value]) => `${name}: ${value}`).join("\n");
}

function fromAttributesText(value: string) {
  return Object.fromEntries(value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const colon = line.indexOf(":");
    return colon < 1 ? [line, ""] : [line.slice(0, colon).trim(), line.slice(colon + 1).trim()];
  }));
}

function toBreaksText(rows: EditableVariant["quantityBreaks"]) {
  return (rows || []).map((row) => `${row.minimumQuantity} = ${row.unitPrice}`).join("; ");
}

function fromBreaksText(value: string) {
  return value.split(";").map((entry) => entry.trim()).filter(Boolean).map((entry) => {
    const [minimumQuantity, unitPrice] = entry.split("=").map(Number);
    return { minimumQuantity, unitPrice };
  }).filter((row) => Number.isFinite(row.minimumQuantity) && row.minimumQuantity > 0 && Number.isFinite(row.unitPrice) && row.unitPrice >= 0).sort((a, b) => a.minimumQuantity - b.minimumQuantity);
}

const newVariant = (sortOrder: number): EditableVariant => ({
  label: "",
  attributes: {},
  unit: "",
  price: null,
  compareAtPrice: null,
  stockQuantity: null,
  minOrderQuantity: null,
  inStock: false,
  availabilityStatus: "CHECK_AVAILABILITY",
  quantityBreaks: [],
  sortOrder,
});

export default function CatalogueVariantsEditor({
  variants,
  onChange,
}: {
  variants: EditableVariant[];
  onChange: (variants: EditableVariant[]) => void;
}) {
  const update = (index: number, changes: Partial<EditableVariant>) => onChange(
    variants.map((variant, rowIndex) => rowIndex === index ? { ...variant, ...changes } : variant),
  );

  return (
    <section className="catalogue-variants-editor catalogue-wide" aria-labelledby="catalogue-variants-title">
      <header className="catalogue-variants-heading">
        <div>
          <h3 id="catalogue-variants-title">Sellable options</h3>
          <p>Add the actual shades, sizes, packs, finishes or grades the client carries.</p>
        </div>
        <button type="button" className="btn-sm btn-secondary" onClick={() => onChange([...variants, newVariant(variants.length)])}>
          <Plus size={14} /> Add option
        </button>
      </header>
      {variants.length === 0 ? (
        <p className="catalogue-no-variants">No options added. Add variants when the client confirms the exact product range.</p>
      ) : variants.map((variant, index) => (
        <fieldset className="catalogue-variant-card" key={variant.id || index}>
          <legend>Option {index + 1}</legend>
          <button type="button" className="catalogue-remove-variant" aria-label={`Remove option ${index + 1}`} onClick={() => onChange(variants.filter((_, rowIndex) => rowIndex !== index))}>
            <Trash2 size={15} /> Remove
          </button>
          <div className="catalogue-variant-grid">
            <label>Option name<input value={variant.label} maxLength={160} placeholder="1 L · Interior · Warm white" onChange={(event) => update(index, { label: event.target.value })} /></label>
            <label>Unit<input value={variant.unit} maxLength={100} placeholder="tin, bag, metre" onChange={(event) => update(index, { unit: event.target.value })} /></label>
            <label>Price per unit (₹)<input type="number" min="0" step="0.01" value={variant.price ?? ""} placeholder="Set when confirmed" onChange={(event) => update(index, { price: event.target.value === "" ? null : Number(event.target.value) })} /></label>
            <label>Original price / MRP (₹)<input type="number" min="0" step="0.01" value={variant.compareAtPrice ?? ""} placeholder="Optional" onChange={(event) => update(index, { compareAtPrice: event.target.value === "" ? null : Number(event.target.value) })} /></label>
            <label>Stock quantity<input type="number" min="0" step="0.001" value={variant.stockQuantity ?? ""} placeholder="Optional" onChange={(event) => update(index, { stockQuantity: event.target.value === "" ? null : Number(event.target.value) })} /></label>
            <label>Minimum order quantity<input type="number" min="0.001" step="0.001" value={variant.minOrderQuantity ?? ""} placeholder="Optional" onChange={(event) => update(index, { minOrderQuantity: event.target.value === "" ? null : Number(event.target.value) })} /></label>
            <label>Colour, size, finish or grade attributes<textarea rows={2} value={toAttributesText(variant.attributes || {})} placeholder={"Shade: Warm white\nPack size: 1 L"} onChange={(event) => update(index, { attributes: fromAttributesText(event.target.value) })} /></label>
            <label>Product code<input value={variant.code || ""} maxLength={80} placeholder="Optional client code" onChange={(event) => update(index, { code: event.target.value || null })} /></label>
            <label>Offer label<input value={variant.offerLabel || ""} maxLength={120} placeholder="Optional" onChange={(event) => update(index, { offerLabel: event.target.value || null })} /></label>
            <label>Offer starts<input type="date" value={(variant.offerStartsAt || "").slice(0, 10)} onChange={(event) => update(index, { offerStartsAt: event.target.value || null })} /></label>
            <label>Offer ends<input type="date" value={(variant.offerEndsAt || "").slice(0, 10)} onChange={(event) => update(index, { offerEndsAt: event.target.value || null })} /></label>
            <label>Price note<input value={variant.priceNote || ""} maxLength={120} placeholder="Optional" onChange={(event) => update(index, { priceNote: event.target.value || null })} /></label>
            <label className="catalogue-variant-breaks">Quantity breaks (minimum quantity = unit price)<input value={toBreaksText(variant.quantityBreaks)} placeholder="10 = 415; 30 = 405" onChange={(event) => update(index, { quantityBreaks: fromBreaksText(event.target.value) })} /></label>
            <label className="catalogue-variant-availability">Availability<select value={variant.availabilityStatus || (variant.inStock ? "IN_STOCK" : "CHECK_AVAILABILITY")} onChange={(event) => update(index, { availabilityStatus: event.target.value as EditableVariant["availabilityStatus"], inStock: event.target.value === "IN_STOCK" })}><option value="IN_STOCK">In stock</option><option value="OUT_OF_STOCK">Out of stock</option><option value="CHECK_AVAILABILITY">Check availability</option></select></label>
          </div>
        </fieldset>
      ))}
      <p className="catalogue-field-note">Prices, stock, MOQ and offers are optional. Add only client-confirmed values; an unavailable product can still stay visible.</p>
    </section>
  );
}
