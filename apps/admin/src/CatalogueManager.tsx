import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Image, PackagePlus, RefreshCw, Save, Upload, X } from "lucide-react";
import "./catalogue-manager.css";

type Listing = {
  id: string;
  slug: string;
  code: string | null;
  name: string;
  brand: string;
  brandTagline: string | null;
  category: string;
  categoryLabel: string;
  unit: string;
  packaging: string | null;
  image: string | null;
  galleryImages: string[];
  variants: Variant[];
  grade: string | null;
  description: string | null;
  minOrderQty: string | null;
  dispatchTime: string | null;
  price: string | null;
  compareAtPrice: string | null;
  priceNote: string | null;
  offerLabel: string | null;
  offerStartsAt: string | null;
  offerEndsAt: string | null;
  isInStock: boolean;
  isPublished: boolean;
  features: string[];
  applications: string[];
  specifications: Record<string, string>;
  sortOrder: number;
};
type Variant = {
  id?: string; code?: string | null; label: string; attributes: Record<string, string>; unit: string;
  price?: string | number | null; compareAtPrice?: string | number | null; priceNote?: string | null;
  offerLabel?: string | null; offerStartsAt?: string | null; offerEndsAt?: string | null; inStock: boolean; stockQuantity?: string | number | null;
  minOrderQuantity?: string | number | null; quantityBreaks?: Array<{ minimumQuantity: number; unitPrice: number }>; sortOrder: number;
};

const blank: Listing = {
  id: "", slug: "", code: "", name: "", brand: "", brandTagline: "",
  category: "cement", categoryLabel: "Cement & Aggregates", unit: "", packaging: "",
  image: "", grade: "", description: "", minOrderQty: "", dispatchTime: "",
  galleryImages: [], variants: [],
  price: null, compareAtPrice: null, priceNote: "", offerLabel: "", isInStock: false,
  offerStartsAt: null, offerEndsAt: null,
  isPublished: false, features: [], applications: [], specifications: {}, sortOrder: 0,
};
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const fromLines = (value: FormDataEntryValue | null) => String(value || "").split("\n").map((line) => line.trim()).filter(Boolean);
const specsFromLines = (value: FormDataEntryValue | null) => Object.fromEntries(
  String(value || "").split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const separator = line.indexOf(":");
    return separator < 1 ? [line, ""] : [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
  }).filter(([key]) => key),
);
const lines = (values: string[]) => values.join("\n");
const dateField = (value: string | null) => value ? value.slice(0, 10) : "";
const parseVariants = (value: FormDataEntryValue | null): Variant[] => String(value || "").split("\n").map(line => line.trim()).filter(Boolean).map((line, sortOrder) => {
  const [label = "", unit = "", rawPrice = "", rawCompare = "", rawStock = "", availability = "no", rawAttributes = "", offerLabel = "", offerStartsAt = "", offerEndsAt = "", priceNote = "", code = "", rawQuantityBreaks = ""] = line.split("|").map(part => part.trim());
  const attributes = Object.fromEntries(rawAttributes.split(";").map(pair => pair.trim()).filter(Boolean).map(pair => { const index = pair.indexOf("="); return index < 1 ? [pair, ""] : [pair.slice(0, index).trim(), pair.slice(index + 1).trim()]; }));
  const quantityBreaks = rawQuantityBreaks.split(";").map(entry => entry.trim()).filter(Boolean).map(entry => { const [minimumQuantity, unitPrice] = entry.split("=").map(Number); return { minimumQuantity, unitPrice }; }).filter(row => Number.isFinite(row.minimumQuantity) && row.minimumQuantity > 0 && Number.isFinite(row.unitPrice) && row.unitPrice >= 0).sort((a, b) => a.minimumQuantity - b.minimumQuantity);
  return { label, unit, code: code || null, price: rawPrice ? Number(rawPrice) : null, compareAtPrice: rawCompare ? Number(rawCompare) : null, stockQuantity: rawStock ? Number(rawStock) : null, inStock: availability.toLowerCase() === "yes", attributes, offerLabel: offerLabel || null, offerStartsAt: offerStartsAt || null, offerEndsAt: offerEndsAt || null, priceNote: priceNote || null, quantityBreaks, sortOrder };
}).filter(variant => variant.label && variant.unit);
const variantLines = (variants: Variant[]) => variants.map(variant => [variant.label, variant.unit, variant.price ?? "", variant.compareAtPrice ?? "", variant.stockQuantity ?? "", variant.inStock ? "yes" : "no", Object.entries(variant.attributes || {}).map(([key, value]) => `${key}=${value}`).join("; "), variant.offerLabel || "", dateField(variant.offerStartsAt || null), dateField(variant.offerEndsAt || null), variant.priceNote || "", variant.code || "", (variant.quantityBreaks || []).map(row => `${row.minimumQuantity}=${row.unitPrice}`).join("; ")].join(" | ")).join("\n");

export default function CatalogueManager({ token, role, onSignOut }: { token: string; role: string; onSignOut: () => void }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [editing, setEditing] = useState<Listing | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const canManage = ["SUPER_ADMIN", "ADMIN", "CATALOG_MANAGER"].includes(role);

  const request = useCallback(async <T,>(path: string, method = "GET", body?: unknown): Promise<T> => {
    const response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}${path}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(65000),
    });
    const result = await response.json().catch(() => null);
    if (response.status === 401) onSignOut();
    if (!response.ok) throw new Error(typeof result?.message === "string" ? result.message : "Could not save catalogue changes.");
    return result as T;
  }, [token, onSignOut]);

  async function uploadImage(file: File, input: HTMLInputElement) {
    if (!new Set(["image/png", "image/jpeg", "image/webp"]).has(file.type)) {
      setError("Choose a PNG, JPEG, or WebP product image.");
      input.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Product images must be 5 MB or smaller.");
      input.value = "";
      return;
    }

    setBusy(true); setError(""); setNotice("");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}/storage/images`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
        signal: AbortSignal.timeout(60000),
      });
      const result = await response.json().catch(() => null) as { url?: string; message?: string } | null;
      if (response.status === 401) onSignOut();
      if (!response.ok || !result?.url)
        throw new Error(typeof result?.message === "string" ? result.message : "Could not upload this product image.");
      setEditing((current) => current ? { ...current, image: result.url! } : current);
      setNotice("Image uploaded. Save the product to publish it.");
      input.value = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload this product image.");
    } finally { setBusy(false); }
  }

  async function uploadGalleryImages(files: FileList, input: HTMLInputElement) {
    const selected = Array.from(files);
    if (selected.length > 8 || selected.some(file => !new Set(["image/png", "image/jpeg", "image/webp"]).has(file.type) || file.size > 5 * 1024 * 1024)) {
      setError("Choose up to 8 PNG, JPEG, or WebP images, each 5 MB or smaller.");
      input.value = "";
      return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const uploaded: string[] = [];
      for (const file of selected) {
        const body = new FormData(); body.append("file", file);
        const response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}/storage/images`, {
          method: "POST", headers: { Authorization: `Bearer ${token}` }, body,
          signal: AbortSignal.timeout(60000),
        });
        const result = await response.json().catch(() => null) as { url?: string; message?: string } | null;
        if (response.status === 401) onSignOut();
        if (!response.ok || !result?.url) throw new Error(typeof result?.message === "string" ? result.message : `Could not upload ${file.name}.`);
        uploaded.push(result.url);
      }
      setEditing(current => current ? { ...current, galleryImages: Array.from(new Set([...(current.galleryImages || []), ...uploaded])) } : current);
      setNotice(`${uploaded.length} gallery image${uploaded.length === 1 ? "" : "s"} uploaded. Save the product to keep them.`);
      input.value = "";
    } catch (e) { setError(e instanceof Error ? e.message : "Could not upload these gallery images."); }
    finally { setBusy(false); }
  }

  const refresh = useCallback(async () => {
    setBusy(true); setError("");
    try { setListings(await request<Listing[]>("/products/catalogue")); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load the catalogue."); }
    finally { setBusy(false); }
  }, [request]);
  useEffect(() => { void refresh(); }, [refresh]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const name = String(values.get("name") || "").trim();
    const code = String(values.get("code") || "").trim();
    const rawPrice = String(values.get("price") || "").trim();
    const rawCompare = String(values.get("compareAtPrice") || "").trim();
    const payload = {
      slug: slugify(String(values.get("slug") || code || name)),
      code: code || null,
      name,
      brand: String(values.get("brand") || "").trim(),
      brandTagline: String(values.get("brandTagline") || "").trim() || null,
      category: String(values.get("category") || "").trim(),
      categoryLabel: String(values.get("categoryLabel") || "").trim(),
      unit: String(values.get("unit") || "").trim(),
      packaging: String(values.get("packaging") || "").trim() || null,
      image: String(values.get("image") || "").trim() || null,
      galleryImages: fromLines(values.get("galleryImages")),
      grade: String(values.get("grade") || "").trim() || null,
      description: String(values.get("description") || "").trim() || null,
      minOrderQty: String(values.get("minOrderQty") || "").trim() || null,
      dispatchTime: String(values.get("dispatchTime") || "").trim() || null,
      price: rawPrice ? Number(rawPrice) : null,
      compareAtPrice: rawCompare ? Number(rawCompare) : null,
      priceNote: String(values.get("priceNote") || "").trim() || null,
      offerLabel: String(values.get("offerLabel") || "").trim() || null,
      offerStartsAt: String(values.get("offerStartsAt") || "") || null,
      offerEndsAt: String(values.get("offerEndsAt") || "") || null,
      isInStock: values.get("isInStock") === "on",
      isPublished: values.get("isPublished") === "on",
      features: fromLines(values.get("features")),
      applications: fromLines(values.get("applications")),
      specifications: specsFromLines(values.get("specifications")),
      variants: parseVariants(values.get("variants")),
      sortOrder: Number(values.get("sortOrder") || 0),
    };
    if (rawCompare && rawPrice && Number(rawCompare) < Number(rawPrice)) {
      setError("Original price must be equal to or greater than the selling price."); return;
    }
    if (payload.offerStartsAt && payload.offerEndsAt && payload.offerEndsAt < payload.offerStartsAt) {
      setError("Offer end date must be on or after its start date."); return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      await request(`/products/catalogue${editing?.id ? `/${editing.id}` : ""}`, editing?.id ? "PATCH" : "POST", payload);
      setNotice(payload.isPublished ? "Product saved and published to the website." : "Product saved as a draft.");
      setEditing(null);
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save this product."); }
    finally { setBusy(false); }
  }

  async function unpublish(product: Listing) {
    setBusy(true); setError(""); setNotice("");
    try {
      await request(`/products/catalogue/${product.id}`, "DELETE");
      setNotice(`${product.name} is unpublished.`);
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not unpublish this product."); }
    finally { setBusy(false); }
  }

  const startEdit = (product: Listing) => setEditing({ ...product });
  const startNew = () => setEditing({ ...blank, sortOrder: listings.length ? Math.max(...listings.map((p) => p.sortOrder)) + 1 : 0 });
  const formProduct = editing;

  return <div className="catalogue-manager">
    <header className="catalogue-manager-head">
      <div><span className="eyebrow">CUSTOMER WEBSITE CATALOGUE</span><h2>Products, pricing & offers</h2><p>Changes appear on the public marketplace after saving and publishing.</p></div>
      <div className="catalogue-manager-actions"><button className="btn-sm btn-secondary" disabled={busy} onClick={() => void refresh()}><RefreshCw size={15}/> Refresh</button>{canManage && <button className="btn-sm btn-primary" disabled={busy} onClick={startNew}><PackagePlus size={16}/> Add product</button>}</div>
    </header>
    {error && <p className="admin-error" role="alert">{error}</p>}{notice && <p className="saved-notice" role="status">{notice}</p>}
    {formProduct && <form className="panel-card catalogue-product-form" onSubmit={(event) => void save(event)}>
      <div className="catalogue-form-title"><h3>{formProduct.id ? "Edit product" : "Add a product"}</h3><button type="button" className="btn-sm btn-secondary" onClick={() => setEditing(null)} aria-label="Close product form"><X size={16}/></button></div>
      <div className="catalogue-fields">
        <label>Product name<input name="name" required maxLength={180} defaultValue={formProduct.name}/></label>
        <label>Brand<input name="brand" maxLength={120} defaultValue={formProduct.brand}/></label>
        <label>Product code<input name="code" maxLength={80} defaultValue={formProduct.code || ""}/></label>
        <label>URL slug<input name="slug" maxLength={120} placeholder="Generated from code or name" defaultValue={formProduct.slug}/></label>
        <label>Category key<input name="category" required maxLength={80} defaultValue={formProduct.category}/></label>
        <label>Category name<input name="categoryLabel" required maxLength={120} defaultValue={formProduct.categoryLabel}/></label>
        <label>Unit shown to customer<input name="unit" required maxLength={100} placeholder="e.g. 50 kg bag" defaultValue={formProduct.unit}/></label>
        <label>Grade / type<input name="grade" maxLength={500} defaultValue={formProduct.grade || ""}/></label>
        <label>Minimum order<input name="minOrderQty" maxLength={500} defaultValue={formProduct.minOrderQty || ""}/></label>
        <label>Dispatch wording<input name="dispatchTime" maxLength={500} defaultValue={formProduct.dispatchTime || ""}/></label>
        <label>Price (₹ per unit)<input name="price" type="number" min="0" step="0.01" defaultValue={formProduct.price || ""}/></label>
        <label>Original price (₹)<input name="compareAtPrice" type="number" min="0" step="0.01" defaultValue={formProduct.compareAtPrice || ""}/></label>
        <label>Price note<input name="priceNote" maxLength={120} placeholder="e.g. per bag, GST included" defaultValue={formProduct.priceNote || ""}/></label>
        <label>Offer label<input name="offerLabel" maxLength={120} placeholder="e.g. Launch offer" defaultValue={formProduct.offerLabel || ""}/></label>
        <label>Offer starts<input name="offerStartsAt" type="date" defaultValue={dateField(formProduct.offerStartsAt)}/></label>
        <label>Offer ends<input name="offerEndsAt" type="date" defaultValue={dateField(formProduct.offerEndsAt)}/></label>
        <label>Packaging<input name="packaging" maxLength={500} defaultValue={formProduct.packaging || ""}/></label>
        <label>Brand tagline<input name="brandTagline" maxLength={500} defaultValue={formProduct.brandTagline || ""}/></label>
        <label>Product image path or HTTPS URL<input name="image" maxLength={1000} placeholder="/images/products/example.png" value={formProduct.image || ""} onChange={(event) => setEditing({ ...formProduct, image: event.target.value })}/></label>
        <label>More product images (one site path or HTTPS URL per line)<textarea name="galleryImages" rows={3} value={lines(formProduct.galleryImages || [])} onChange={event => setEditing({ ...formProduct, galleryImages: fromLines(event.currentTarget.value) })}/><small>Use specific product images when available; category illustrations are illustrative.</small></label>
        <label className="catalogue-image-upload"><span><Upload size={14}/> Upload gallery images</span><input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={busy} onChange={(event) => { const input = event.currentTarget; const files = input.files; if (files?.length) void uploadGalleryImages(files, input); }}/><small>Up to 8 at a time, PNG/JPEG/WebP, 5 MB each.</small></label>
        <label className="catalogue-image-upload"><span><Upload size={14}/> Upload product image</span><input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(event) => { const input = event.currentTarget; const file = input.files?.[0]; if (file) void uploadImage(file, input); }}/><small>PNG, JPEG or WebP, up to 5 MB. Storage must be configured.</small></label>
        <label>Display order<input name="sortOrder" type="number" min="0" step="1" defaultValue={formProduct.sortOrder}/></label>
        <label className="catalogue-wide">Short description<textarea name="description" rows={3} maxLength={3000} defaultValue={formProduct.description || ""}/></label>
        <label>Features (one per line)<textarea name="features" rows={5} defaultValue={lines(formProduct.features)}/></label>
        <label>Applications (one per line)<textarea name="applications" rows={5} defaultValue={lines(formProduct.applications)}/></label>
        <label className="catalogue-wide">Specifications (one “name: value” per line)<textarea name="specifications" rows={5} defaultValue={Object.entries(formProduct.specifications || {}).map(([key, value]) => `${key}: ${value}`).join("\n")}/></label>
        <label className="catalogue-wide">Sellable variants<textarea aria-label="Sellable variants" name="variants" rows={6} placeholder={'1 L | tin | 187 | 258 | 12 | yes | pack=1 L; shade=Base White | Sample offer | 2026-10-01 | 2026-10-15 | Confirm current price | SKU-001 | 10=170; 30=160'} defaultValue={variantLines(formProduct.variants || [])}/><small>One per line: label | unit | price | original price | stock qty | in stock yes/no | attributes | offer label | start date | end date | price note | variant code | quantity breaks. Add quantity breaks as minimum quantity=unit price, separated by semicolons (for example 10=415; 30=405; 50=395). Each later break must use a lower or equal price. Leave price blank if not confirmed.</small></label>
      </div>
      <div className="catalogue-form-checks"><label><input name="isInStock" type="checkbox" defaultChecked={formProduct.isInStock}/> Show as in stock</label><label><input name="isPublished" type="checkbox" defaultChecked={formProduct.isPublished}/> Publish on website</label></div>
      <div className="catalogue-form-footer"><small><Image size={14}/> Use approved product images; do not upload brand logos or alter brand artwork here.</small><button className="btn-sm btn-primary" disabled={busy}><Save size={15}/>{busy ? "Saving…" : "Save product"}</button></div>
    </form>}
    <div className="catalogue-listing-count">{listings.length} catalogue products · {listings.filter((p) => p.isPublished).length} published</div>
    {listings.length === 0 && !busy && <section className="panel-card catalogue-empty"><h3>No products found</h3><p>Refresh the catalogue or add the first product.</p></section>}
    <div className="catalogue-listings">
      {listings.map((product) => <article className="panel-card catalogue-listing" key={product.id}>
        <div className="catalogue-listing-image"><img src={product.image || "/images/products/material-sack-illustration.png"} alt=""/></div>
        <div className="catalogue-listing-main"><div className="catalogue-listing-title"><h3>{product.name}</h3><span className={product.isPublished ? "catalogue-published" : "catalogue-draft"}>{product.isPublished ? "Published" : "Draft"}</span></div>
          <p>{product.brand || "Unbranded"} · {product.categoryLabel} · {product.unit}</p>
          <div className="catalogue-price-line">{product.variants?.length ? <strong>{product.variants.length} sellable variants</strong> : product.price == null ? <span>Price not set</span> : <strong>₹{Number(product.price).toLocaleString("en-IN")} / {product.unit}</strong>}{product.compareAtPrice != null && <del>₹{Number(product.compareAtPrice).toLocaleString("en-IN")}</del>}{product.priceNote && <span>{product.priceNote}</span>}{product.offerLabel && <span className="catalogue-offer">{product.offerLabel}</span>}</div>
        </div>
        {canManage && <div className="catalogue-listing-controls"><button className="btn-sm btn-secondary" disabled={busy} onClick={() => startEdit(product)}>Edit</button>{product.isPublished && <button className="btn-sm btn-secondary" disabled={busy} onClick={() => void unpublish(product)}>Unpublish</button>}</div>}
      </article>)}
    </div>
  </div>;
}
