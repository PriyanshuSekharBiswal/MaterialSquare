import { useEffect, useState } from "react";
import { Plus, Trash2, Upload } from "lucide-react";

const customerPriceNote = (note: string | null | undefined) => {
  const value = String(note || "").trim();
  return !value || /reference|observed|source listing|rate can change|confirm (?:the )?(?:current )?(?:local )?(?:price|availability)|local availability|availability before ordering|seller listing|local price and taxes may differ/i.test(value) ? "" : value;
};

export type EditableVariant = {
  id?: string;
  draftKey?: string;
  code?: string | null;
  label: string;
  attributes: Record<string, string>;
  unit: string;
  image?: string | null;
  galleryImages?: string[];
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

function toBreaksText(rows: EditableVariant["quantityBreaks"]) {
  return (rows || []).map((row) => `${row.minimumQuantity} = ${row.unitPrice}`).join("; ");
}

function fromBreaksText(value: string) {
  const rows: NonNullable<EditableVariant["quantityBreaks"]> = [];
  for (const entry of value.split(";").map((part) => part.trim()).filter(Boolean)) {
    const parts = entry.split("=");
    if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) return null;
    const [minimumQuantity, unitPrice] = parts.map(Number);
    if (!Number.isFinite(minimumQuantity) || minimumQuantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) return null;
    rows.push({ minimumQuantity, unitPrice });
  }
  return rows.sort((a, b) => a.minimumQuantity - b.minimumQuantity);
}

function QuantityBreaksInput({ value, onChange }: {
  value: EditableVariant["quantityBreaks"];
  onChange: (rows: NonNullable<EditableVariant["quantityBreaks"]>) => void;
}) {
  const [text, setText] = useState(() => toBreaksText(value));
  const serialized = toBreaksText(value);
  useEffect(() => setText(serialized), [serialized]);
  const commit = () => {
    const rows = fromBreaksText(text);
    if (rows === null) return;
    setText(toBreaksText(rows));
    onChange(rows);
  };
  const invalid = fromBreaksText(text) === null;
  return <>
    <input value={text} aria-invalid={invalid} placeholder="10 = 415; 30 = 405" onChange={(event) => setText(event.target.value)} onBlur={commit} onKeyDown={(event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        commit();
      }
    }} />
    {invalid && <small role="alert">Use “quantity = price” pairs separated by semicolons. This text is not saved.</small>}
  </>;
}

let nextVariantDraftKey = 0;
const newVariant = (sortOrder: number): EditableVariant => ({
  draftKey: `draft-${Date.now().toString(36)}-${(++nextVariantDraftKey).toString(36)}-${Math.random().toString(36).slice(2)}`,
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

const MAX_VARIANTS = 1000;

export default function CatalogueVariantsEditor({
  variants,
  onChange,
  imageOptions = [],
  onUploadImage,
  defaultUnit = "",
  busy = false,
}: {
  variants: EditableVariant[];
  onChange: (variants: EditableVariant[]) => void;
  imageOptions?: string[];
  onUploadImage?: (file: File, input: HTMLInputElement, index: number, photoIndex: number) => void;
  defaultUnit?: string;
  busy?: boolean;
}) {
  const [attributeNameDrafts, setAttributeNameDrafts] = useState<Record<string, string>>({});

  function removeVariant(index: number) {
    onChange(variants.filter((_, rowIndex) => rowIndex !== index));
    setAttributeNameDrafts({});
  }

  const update = (index: number, changes: Partial<EditableVariant>) => onChange(
    variants.map((variant, rowIndex) => rowIndex === index ? { ...variant, ...changes } : variant),
  );

  const addAttribute = (index: number, suggestedName?: string) => {
    const attributes = variants[index]?.attributes || {};
    let number = Object.keys(attributes).length + 1;
    let key = suggestedName || `Option ${number}`;
    while (Object.keys(attributes).some((existing) => existing.toLocaleLowerCase() === key.toLocaleLowerCase())) {
      if (suggestedName) return;
      key = `Option ${++number}`;
    }
    update(index, { attributes: { ...attributes, [key]: "" } });
  };

  const variantPhoto = (variant: EditableVariant, photoIndex: number) =>
    photoIndex === 0 ? variant.image || "" : variant.galleryImages?.[photoIndex - 1] || "";

  const updateVariantPhoto = (index: number, photoIndex: number, image: string) => {
    if (photoIndex === 0) {
      update(index, { image: image || null });
      return;
    }
    const galleryImages = [...(variants[index]?.galleryImages || [])];
    galleryImages[photoIndex - 1] = image;
    update(index, { galleryImages: galleryImages.slice(0, 3) });
  };

  return (
    <section className="catalogue-variants-editor catalogue-wide" aria-labelledby="catalogue-variants-title">
      <header className="catalogue-variants-heading">
        <div>
          <h3 id="catalogue-variants-title">Sellable options</h3>
          <p>Add each choice directly, then manage its price, availability, photo and client or staff code on its card.</p>
        </div>
        <button type="button" className="btn-sm btn-secondary" disabled={variants.length >= MAX_VARIANTS} onClick={() => {
          onChange([...variants, { ...newVariant(variants.length), unit: defaultUnit }]);
        }}>
          <Plus size={14} /> Add option
        </button>
      </header>
      {variants.length === 0 ? (
        <div className="catalogue-no-variants">
          <strong>This product can be published without options</strong>
          <span>Add an option only when customers need to choose a size, colour, pack or another variation.</span>
        </div>
      ) : (
        variants.map((variant, index) => (
        <fieldset className="catalogue-variant-card" key={variant.id || variant.draftKey || index}>
          <legend>Option {index + 1}</legend>
          <button type="button" className="catalogue-remove-variant" aria-label={`Remove option ${index + 1}`} onClick={() => removeVariant(index)}>
            <Trash2 size={15} /> Remove
          </button>
          <div className="catalogue-variant-grid">
            <label>Option name<input value={variant.label} maxLength={160} placeholder="Enter option name" onChange={(event) => update(index, { label: event.target.value })} /></label>
            <label>Price (₹)<input type="number" min="0" step="0.01" value={variant.price ?? ""} placeholder="Set when confirmed" onChange={(event) => update(index, { price: event.target.value === "" ? null : Number(event.target.value) })} /></label>
            <label>Client / staff option code<input required value={variant.code || ""} maxLength={80} placeholder="Enter code for this option" onChange={(event) => update(index, { code: event.target.value })} /></label>
            <fieldset className="catalogue-variant-photos">
              <legend>Photos <span>Optional · upload, paste a URL or reuse a product photo</span></legend>
              <div className="catalogue-variant-photo-grid">
                {[0, 1, 2, 3].map((photoIndex) => {
                  const photo = variantPhoto(variant, photoIndex);
                  return <div className="catalogue-variant-photo-slot" key={photoIndex}>
                    <strong>Photo {photoIndex + 1}{photoIndex === 0 ? " · Main" : " · Optional"}</strong>
                    <select aria-label={`Choose shared product photo for option ${index + 1}, photo ${photoIndex + 1}`} value={imageOptions.includes(photo) ? photo : ""} onChange={(event) => updateVariantPhoto(index, photoIndex, event.target.value)}>
                      <option value="">Upload or paste URL</option>
                      {imageOptions.map((image, imageIndex) => <option value={image} key={`${image}-${imageIndex}`}>Product photo {imageIndex + 1}{imageIndex === 0 ? " · Hero" : ""}</option>)}
                    </select>
                    <label className="catalogue-variant-photo-upload"><span><Upload size={14} /> Upload photo</span><input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(event) => { const input = event.currentTarget; const file = input.files?.[0]; if (file) onUploadImage?.(file, input, index, photoIndex); }} /></label>
                    <input aria-label={`Photo ${photoIndex + 1} URL for option ${index + 1}`} value={photo} maxLength={1000} placeholder="Or paste image URL" onChange={(event) => updateVariantPhoto(index, photoIndex, event.target.value)} />
                    {photo && <img className="catalogue-variant-photo-preview" src={photo} alt={`${variant.label || `Option ${index + 1}`} photo ${photoIndex + 1}`} />}
                  </div>;
                })}
              </div>
              <small>Recommended size: 1200 × 1200 px (1:1) · PNG, JPEG or WebP · Up to 20 MB each</small>
            </fieldset>
            <fieldset className="catalogue-variant-attributes">
              <legend>Add variations <span>(Optional)</span></legend>
              <p>Choose the details that describe this option. Add a value for each one.</p>
              <div className="catalogue-attribute-presets" aria-label="Common option fields">
                {(["Size", "Colour", "Pack", "Material", "Type", "Style"] as const).map((name) => <button type="button" key={name} disabled={Object.keys(variant.attributes || {}).some((key) => key.toLocaleLowerCase() === name.toLocaleLowerCase())} onClick={() => addAttribute(index, name)}>{name}</button>)}
              </div>
              {Object.entries(variant.attributes || {}).map(([key, value], attributeIndex) => {
                const variantDraftKey = variant.id || String(index);
                const draftKey = `${variantDraftKey}:${attributeIndex}`;
                const draftName = attributeNameDrafts[draftKey] ?? key;
                const duplicateName = Object.keys(variant.attributes || {}).some(
                  (existing, rowIndex) => rowIndex !== attributeIndex &&
                    existing.trim().toLocaleLowerCase() === draftName.trim().toLocaleLowerCase(),
                );
                const commitName = () => {
                  if (duplicateName || !draftName.trim()) {
                    setAttributeNameDrafts((current) => {
                      const next = { ...current };
                      delete next[draftKey];
                      return next;
                    });
                    return;
                  }
                  const entries = Object.entries(variant.attributes || {});
                  entries[attributeIndex] = [draftName.trim(), value];
                  update(index, { attributes: Object.fromEntries(entries) });
                  setAttributeNameDrafts((current) => {
                    const next = { ...current };
                    delete next[draftKey];
                    return next;
                  });
                };
                return (
                  <div className="catalogue-attribute-row" key={attributeIndex}>
                    <label>Variation<input value={draftName} maxLength={80} placeholder="Variation name" aria-invalid={duplicateName || !draftName.trim()} onChange={(event) => setAttributeNameDrafts((current) => ({ ...current, [draftKey]: event.target.value }))} onBlur={commitName} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commitName(); } }} />{duplicateName && <small role="alert">Use a unique variation name.</small>}{!draftName.trim() && <small role="alert">Enter a variation name.</small>}</label>
                    <label>Value<input value={value} maxLength={120} placeholder="Enter value" onChange={(event) => { const entries = Object.entries(variant.attributes || {}); entries[attributeIndex] = [key, event.target.value]; update(index, { attributes: Object.fromEntries(entries) }); }} /></label>
                    <button type="button" className="catalogue-remove-attribute" aria-label={`Remove variation ${attributeIndex + 1} from option ${index + 1}`} onClick={() => {
                      setAttributeNameDrafts((current) => {
                        const next = Object.fromEntries(
                          Object.entries(current).filter(([draft]) => !draft.startsWith(`${variantDraftKey}:`)),
                        );
                        return next;
                      });
                      update(index, { attributes: Object.fromEntries(Object.entries(variant.attributes || {}).filter((_, rowIndex) => rowIndex !== attributeIndex)) });
                    }}><Trash2 size={14} /></button>
                  </div>
                );
              })}
              <button type="button" className="btn-sm btn-secondary" onClick={() => addAttribute(index)}><Plus size={13} /> Add custom variation</button>
            </fieldset>
            <details className="catalogue-variant-more">
              <summary>More option details <span>MRP, extra photos, stock, offers and custom fields</span></summary>
              <div className="catalogue-variant-grid catalogue-variant-grid-nested">
            <label>Availability<select value={variant.availabilityStatus || (variant.inStock ? "IN_STOCK" : "CHECK_AVAILABILITY")} onChange={(event) => update(index, { availabilityStatus: event.target.value as EditableVariant["availabilityStatus"], inStock: event.target.value === "IN_STOCK" })}><option value="IN_STOCK">In stock</option><option value="OUT_OF_STOCK">Out of stock</option><option value="CHECK_AVAILABILITY">Check availability</option></select></label>
            <label>Original price / MRP (₹)<input type="number" min="0" step="0.01" value={variant.compareAtPrice ?? ""} placeholder="Optional" onChange={(event) => update(index, { compareAtPrice: event.target.value === "" ? null : Number(event.target.value) })} /></label>
            <label>Stock quantity<input type="number" min="0" step="0.001" value={variant.stockQuantity ?? ""} placeholder="Optional" onChange={(event) => update(index, { stockQuantity: event.target.value === "" ? null : Number(event.target.value) })} /></label>
            <label>Minimum order quantity<input type="number" min="0.001" step="0.001" value={variant.minOrderQuantity ?? ""} placeholder="Optional" onChange={(event) => update(index, { minOrderQuantity: event.target.value === "" ? null : Number(event.target.value) })} /></label>
            <label>Offer label<input value={variant.offerLabel || ""} maxLength={120} placeholder="Optional" onChange={(event) => update(index, { offerLabel: event.target.value || null })} /></label>
            <label>Offer starts<input type="date" value={(variant.offerStartsAt || "").slice(0, 10)} onChange={(event) => update(index, { offerStartsAt: event.target.value || null })} /></label>
            <label>Offer ends<input type="date" value={(variant.offerEndsAt || "").slice(0, 10)} onChange={(event) => update(index, { offerEndsAt: event.target.value || null })} /></label>
            <label>Price / tax note (optional)<input value={customerPriceNote(variant.priceNote)} maxLength={120} placeholder="e.g. GST included" onChange={(event) => update(index, { priceNote: event.target.value || null })} /></label>
            <label className="catalogue-variant-breaks">Quantity breaks (minimum quantity = unit price)<QuantityBreaksInput key={variant.id || variant.draftKey || index} value={variant.quantityBreaks} onChange={(quantityBreaks) => update(index, { quantityBreaks })} /></label>
              </div>
            </details>
          </div>
        </fieldset>
        ))
      )}
      <p className="catalogue-field-note">Prices, stock, MOQ and offers are optional. Add only client-confirmed values; an unavailable product can still stay visible.</p>
    </section>
  );
}
