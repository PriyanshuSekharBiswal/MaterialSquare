import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Search, Trash2, Upload } from "lucide-react";

export type EditableVariant = {
  id?: string;
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

type OptionAxis = { name: string; values: string };
const MAX_VARIANTS = 1000;
const VARIANTS_PER_PAGE = 10;

function normalizedAttributes(attributes: Record<string, string>) {
  return Object.entries(attributes)
    .map(([name, value]) => [name.trim().toLocaleLowerCase(), value.trim().toLocaleLowerCase()] as const)
    .filter(([name, value]) => name && value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${name}:${value}`)
    .join("|");
}

function parseOptionValues(value: string) {
  const seen = new Set<string>();
  return value.split(/[,;\n]/).map((entry) => entry.trim()).filter((entry) => {
    if (!entry) return false;
    const normalized = entry.toLocaleLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

export default function CatalogueVariantsEditor({
  variants,
  onChange,
  onUploadImage,
  defaultUnit = "",
  busy = false,
}: {
  variants: EditableVariant[];
  onChange: (variants: EditableVariant[]) => void;
  onUploadImage?: (file: File, input: HTMLInputElement, index: number) => void;
  defaultUnit?: string;
  busy?: boolean;
}) {
  const [axes, setAxes] = useState<OptionAxis[]>([{ name: "", values: "" }]);
  const [builderMessage, setBuilderMessage] = useState("");
  const [builderError, setBuilderError] = useState(false);
  const [variantSearch, setVariantSearch] = useState("");
  const [page, setPage] = useState(0);

  const filteredVariants = variants
    .map((variant, index) => ({ variant, index }))
    .filter(({ variant }) => !variantSearch.trim() || [
      variant.label,
      variant.code,
      variant.unit,
      ...Object.entries(variant.attributes || {}).flatMap(([key, value]) => [key, value]),
    ].join(" ").toLocaleLowerCase().includes(variantSearch.trim().toLocaleLowerCase()));
  const pageCount = Math.max(1, Math.ceil(filteredVariants.length / VARIANTS_PER_PAGE));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleVariants = filteredVariants.slice(
    currentPage * VARIANTS_PER_PAGE,
    (currentPage + 1) * VARIANTS_PER_PAGE,
  );

  function removeVariant(index: number) {
    onChange(variants.filter((_, rowIndex) => rowIndex !== index));
    setPage(Math.min(currentPage, Math.max(0, Math.ceil((filteredVariants.length - 1) / VARIANTS_PER_PAGE) - 1)));
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

  const buildCombinations = () => {
    const completedAxes = axes.map((axis) => ({ name: axis.name.trim(), values: parseOptionValues(axis.values) }));
    if (completedAxes.length === 0 || completedAxes.some((axis) => !axis.name || axis.values.length === 0)) {
      setBuilderError(true);
      setBuilderMessage("Add a name and at least one value for every option group.");
      return;
    }
    const axisNames = completedAxes.map((axis) => axis.name.toLocaleLowerCase());
    if (new Set(axisNames).size !== axisNames.length) {
      setBuilderError(true);
      setBuilderMessage("Each option group needs a different name.");
      return;
    }
    const total = completedAxes.reduce((count, axis) => count * axis.values.length, 1);
    if (total > MAX_VARIANTS) {
      setBuilderError(true);
      setBuilderMessage(`These groups create ${total} combinations. Reduce the values to ${MAX_VARIANTS} combinations or fewer.`);
      return;
    }

    const combinations = completedAxes.reduce<Record<string, string>[]>((rows, axis) => rows.flatMap((row) => axis.values.map((value) => ({ ...row, [axis.name]: value }))), [{}]);
    const existing = new Set(variants.map((variant) => normalizedAttributes(variant.attributes || {})).filter(Boolean));
    const additions = combinations.filter((attributes) => !existing.has(normalizedAttributes(attributes)));
    if (!additions.length) {
      setBuilderError(false);
      setBuilderMessage("All these combinations are already in the list.");
      return;
    }
    if (variants.length + additions.length > MAX_VARIANTS) {
      setBuilderError(true);
      setBuilderMessage(`There is room for ${MAX_VARIANTS - variants.length} more options, but ${additions.length} new combinations are needed. Remove an option or reduce the groups.`);
      return;
    }
    const created = additions.map((attributes, index) => ({
      ...newVariant(variants.length + index),
      label: Object.values(attributes).join(" · "),
      attributes,
      unit: defaultUnit,
    }));
    onChange([...variants, ...created]);
    setVariantSearch("");
    setPage(Math.floor(variants.length / VARIANTS_PER_PAGE));
    setBuilderError(false);
    setBuilderMessage(`${created.length} option ${created.length === 1 ? "combination" : "combinations"} added. Add client-confirmed prices, photos, units and stock to each option.`);
  };

  return (
    <section className="catalogue-variants-editor catalogue-wide" aria-labelledby="catalogue-variants-title">
      <header className="catalogue-variants-heading">
        <div>
          <h3 id="catalogue-variants-title">Sellable options</h3>
          <p>Add the actual shades, sizes, packs, finishes or grades the client carries.</p>
        </div>
        <button type="button" className="btn-sm btn-secondary" disabled={variants.length >= MAX_VARIANTS} onClick={() => {
          onChange([...variants, newVariant(variants.length)]);
          setVariantSearch("");
          setPage(Math.floor(variants.length / VARIANTS_PER_PAGE));
        }}>
          <Plus size={14} /> Add option
        </button>
      </header>
      <div className="catalogue-combination-builder">
        <div>
          <strong>Create options from groups</strong>
          <p>For example, Pack size (1 L, 4 L) and Colour (White, Black) creates four editable combinations. Enter values separated by commas.</p>
        </div>
        <div className="catalogue-combination-axes">
          {axes.map((axis, index) => <div className="catalogue-combination-axis" key={index}>
            <label>Option group<input value={axis.name} maxLength={80} placeholder="Pack size" onChange={(event) => setAxes(axes.map((row, rowIndex) => rowIndex === index ? { ...row, name: event.target.value } : row))} /></label>
            <label>Values<input value={axis.values} maxLength={20000} placeholder="1 L, 4 L" onChange={(event) => setAxes(axes.map((row, rowIndex) => rowIndex === index ? { ...row, values: event.target.value } : row))} /></label>
            {axes.length > 1 && <button type="button" className="catalogue-remove-attribute" aria-label={`Remove option group ${index + 1}`} onClick={() => setAxes(axes.filter((_, rowIndex) => rowIndex !== index))}><Trash2 size={14} /></button>}
          </div>)}
        </div>
        <div className="catalogue-combination-actions">
          <button type="button" className="btn-sm btn-secondary" disabled={axes.length >= 5} onClick={() => setAxes([...axes, { name: "", values: "" }])}><Plus size={13} /> Add option group</button>
          <button type="button" className="btn-sm btn-primary" disabled={variants.length >= MAX_VARIANTS} onClick={buildCombinations}>Create combinations</button>
          <span className="catalogue-combination-count">{variants.length} / {MAX_VARIANTS} options</span>
        </div>
        {builderMessage && <p className={`catalogue-combination-message${builderError ? " is-error" : ""}`} role={builderError ? "alert" : "status"}>{builderMessage}</p>}
      </div>
      {variants.length === 0 ? (
        <p className="catalogue-no-variants">No options added. Add variants when the client confirms the exact product range.</p>
      ) : <>
        <div className="catalogue-variant-toolbar">
          <label className="catalogue-variant-search"><Search size={15} /><span className="sr-only">Search product options</span><input value={variantSearch} onChange={(event) => { setVariantSearch(event.target.value); setPage(0); }} placeholder="Find a colour, pack, code or option" /></label>
          <span>{filteredVariants.length === 0 ? "No matching options" : `Showing ${currentPage * VARIANTS_PER_PAGE + 1}–${Math.min((currentPage + 1) * VARIANTS_PER_PAGE, filteredVariants.length)} of ${filteredVariants.length} options`}</span>
          <div className="catalogue-variant-pagination">
            <button type="button" className="btn-sm btn-secondary" aria-label="Previous options page" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={15} /> Previous</button>
            <span>Page {currentPage + 1} of {pageCount}</span>
            <button type="button" className="btn-sm btn-secondary" aria-label="Next options page" disabled={currentPage + 1 >= pageCount} onClick={() => setPage(currentPage + 1)}>Next <ChevronRight size={15} /></button>
          </div>
        </div>
        {visibleVariants.length === 0 ? <p className="catalogue-no-variants">No options match that search.</p> : visibleVariants.map(({ variant, index }) => (
        <fieldset className="catalogue-variant-card" key={variant.id || index}>
          <legend>Option {index + 1}</legend>
          <button type="button" className="catalogue-remove-variant" aria-label={`Remove option ${index + 1}`} onClick={() => removeVariant(index)}>
            <Trash2 size={15} /> Remove
          </button>
          <div className="catalogue-variant-grid">
            <label>Option name<input value={variant.label} maxLength={160} placeholder="1 L · Interior · Warm white" onChange={(event) => update(index, { label: event.target.value })} /></label>
            <label>Unit<input value={variant.unit} maxLength={100} placeholder="tin, bag, metre" onChange={(event) => update(index, { unit: event.target.value })} /></label>
            <label>Variant image URL<input value={variant.image || ""} maxLength={1000} placeholder="Optional client-approved photo" onChange={(event) => update(index, { image: event.target.value || null })} /></label>
            {variant.image && <span className="catalogue-image-preview"><img src={variant.image} alt={`${variant.label || `Option ${index + 1}`} preview`} /><span>Selected option photo</span></span>}
            <label className="catalogue-image-upload"><span><Upload size={14} /> Upload this option’s photo</span><input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(event) => { const input = event.currentTarget; const file = input.files?.[0]; if (file) onUploadImage?.(file, input, index); }} /><small>Optional. Use the client’s photo for this exact colour, pack or specification.</small></label>
            <label>Additional option photos (one URL per line)<textarea rows={2} value={(variant.galleryImages || []).join("\n")} placeholder="Optional HTTPS URL or site image path" onChange={(event) => update(index, { galleryImages: event.target.value.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 4) })} /></label>
            <label>Price per unit (₹)<input type="number" min="0" step="0.01" value={variant.price ?? ""} placeholder="Set when confirmed" onChange={(event) => update(index, { price: event.target.value === "" ? null : Number(event.target.value) })} /></label>
            <label>Original price / MRP (₹)<input type="number" min="0" step="0.01" value={variant.compareAtPrice ?? ""} placeholder="Optional" onChange={(event) => update(index, { compareAtPrice: event.target.value === "" ? null : Number(event.target.value) })} /></label>
            <label>Stock quantity<input type="number" min="0" step="0.001" value={variant.stockQuantity ?? ""} placeholder="Optional" onChange={(event) => update(index, { stockQuantity: event.target.value === "" ? null : Number(event.target.value) })} /></label>
            <label>Minimum order quantity<input type="number" min="0.001" step="0.001" value={variant.minOrderQuantity ?? ""} placeholder="Optional" onChange={(event) => update(index, { minOrderQuantity: event.target.value === "" ? null : Number(event.target.value) })} /></label>
            <fieldset className="catalogue-variant-attributes">
              <legend>Customer-selectable options</legend>
              <p>Choose the fields shoppers can select. Reuse an option name across combinations, then enter each combination’s value.</p>
              <div className="catalogue-attribute-presets" aria-label="Common option fields">
                {(["Pack size", "Colour", "Wire size", "Core", "Finish", "Grade"] as const).map((name) => <button type="button" key={name} disabled={Object.keys(variant.attributes || {}).some((key) => key.toLocaleLowerCase() === name.toLocaleLowerCase())} onClick={() => addAttribute(index, name)}>{name}</button>)}
              </div>
              {Object.entries(variant.attributes || {}).map(([key, value], attributeIndex) => (
                <div className="catalogue-attribute-row" key={`${key}-${attributeIndex}`}>
                  <label>Option name<input value={key} maxLength={80} placeholder="Colour" onChange={(event) => { const entries = Object.entries(variant.attributes || {}); entries[attributeIndex] = [event.target.value, value]; update(index, { attributes: Object.fromEntries(entries) }); }} /></label>
                  <label>Value<input value={value} maxLength={120} placeholder="Black" onChange={(event) => { const entries = Object.entries(variant.attributes || {}); entries[attributeIndex] = [key, event.target.value]; update(index, { attributes: Object.fromEntries(entries) }); }} /></label>
                  <button type="button" className="catalogue-remove-attribute" aria-label={`Remove option ${attributeIndex + 1} from variant ${index + 1}`} onClick={() => update(index, { attributes: Object.fromEntries(Object.entries(variant.attributes || {}).filter((_, rowIndex) => rowIndex !== attributeIndex)) })}><Trash2 size={14} /></button>
                </div>
              ))}
              <button type="button" className="btn-sm btn-secondary" onClick={() => addAttribute(index)}><Plus size={13} /> Add custom field</button>
            </fieldset>
            <label>Product code<input value={variant.code || ""} maxLength={80} placeholder="Optional client code" onChange={(event) => update(index, { code: event.target.value || null })} /></label>
            <label>Offer label<input value={variant.offerLabel || ""} maxLength={120} placeholder="Optional" onChange={(event) => update(index, { offerLabel: event.target.value || null })} /></label>
            <label>Offer starts<input type="date" value={(variant.offerStartsAt || "").slice(0, 10)} onChange={(event) => update(index, { offerStartsAt: event.target.value || null })} /></label>
            <label>Offer ends<input type="date" value={(variant.offerEndsAt || "").slice(0, 10)} onChange={(event) => update(index, { offerEndsAt: event.target.value || null })} /></label>
            <label>Price note<input value={variant.priceNote || ""} maxLength={120} placeholder="Optional" onChange={(event) => update(index, { priceNote: event.target.value || null })} /></label>
            <label className="catalogue-variant-breaks">Quantity breaks (minimum quantity = unit price)<input value={toBreaksText(variant.quantityBreaks)} placeholder="10 = 415; 30 = 405" onChange={(event) => update(index, { quantityBreaks: fromBreaksText(event.target.value) })} /></label>
            <label className="catalogue-variant-availability">Availability<select value={variant.availabilityStatus || (variant.inStock ? "IN_STOCK" : "CHECK_AVAILABILITY")} onChange={(event) => update(index, { availabilityStatus: event.target.value as EditableVariant["availabilityStatus"], inStock: event.target.value === "IN_STOCK" })}><option key="IN_STOCK" value="IN_STOCK">In stock</option><option key="OUT_OF_STOCK" value="OUT_OF_STOCK">Out of stock</option><option key="CHECK_AVAILABILITY" value="CHECK_AVAILABILITY">Check availability</option></select></label>
          </div>
        </fieldset>
      ))}
      </>}
      <p className="catalogue-field-note">Prices, stock, MOQ and offers are optional. Add only client-confirmed values; an unavailable product can still stay visible.</p>
    </section>
  );
}
