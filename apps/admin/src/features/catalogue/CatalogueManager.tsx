import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Image,
  PackagePlus,
  RefreshCw,
  Save,
  Search,
  Tags,
  Upload,
  X,
} from "lucide-react";
import CatalogueVariantsEditor, { type EditableVariant } from "./CatalogueVariantsEditor";
import PartnerBrandsManager from "./PartnerBrandsManager";
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
  availabilityStatus: "IN_STOCK" | "OUT_OF_STOCK" | "CHECK_AVAILABILITY";
  isPublished: boolean;
  features: string[];
  applications: string[];
  specifications: Record<string, string>;
  sortOrder: number;
};
type Variant = EditableVariant;
type ProductDraft = {
  savedAt: number;
  values: Record<string, string | boolean>;
  image: string;
  galleryImages: string[];
  variants: Variant[];
};
const PRODUCT_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const productDraftKey = (id: string) => `material-square:catalogue-draft:${id || "new"}`;

const blank: Listing = {
  id: "",
  slug: "",
  code: "",
  name: "",
  brand: "",
  brandTagline: "",
  category: "cement",
  categoryLabel: "Cement & Aggregates",
  unit: "",
  packaging: "",
  image: "",
  grade: "",
  description: "",
  minOrderQty: "",
  dispatchTime: "",
  galleryImages: [],
  variants: [],
  price: null,
  compareAtPrice: null,
  priceNote: "",
  offerLabel: "",
  isInStock: false,
  availabilityStatus: "CHECK_AVAILABILITY",
  offerStartsAt: null,
  offerEndsAt: null,
  isPublished: false,
  features: [],
  applications: [],
  specifications: {},
  sortOrder: 0,
};
const MAX_GALLERY_IMAGES = 4;
const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const fromLines = (value: FormDataEntryValue | null) =>
  String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
const specsFromLines = (value: FormDataEntryValue | null) =>
  Object.fromEntries(
    String(value || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf(":");
        return separator < 1
          ? [line, ""]
          : [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
      })
      .filter(([key]) => key),
  );
const lines = (values: string[]) => values.join("\n");
const dateField = (value: string | null) => (value ? value.slice(0, 10) : "");
export default function CatalogueManager({
  token,
  role,
  onSignOut,
}: {
  token: string;
  role: string;
  onSignOut: () => void;
}) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [editing, setEditing] = useState<Listing | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [catalogueQuery, setCatalogueQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [publicationFilter, setPublicationFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [managingBrands, setManagingBrands] = useState(false);
  const [partnerBrandOptions, setPartnerBrandOptions] = useState<string[]>([]);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [recoveredDraft, setRecoveredDraft] = useState<ProductDraft | null>(null);
  const [previewListing, setPreviewListing] = useState<Listing | null>(null);
  const productForm = useRef<HTMLFormElement>(null);
  const canManage = ["SUPER_ADMIN", "ADMIN", "CATALOG_MANAGER"].includes(role);

  const brands = [...new Set(listings.map((product) => product.brand).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  const categories = [...new Map(
    listings.filter((product) => product.category?.trim())
      .map((product) => [product.category, product.categoryLabel]),
  ).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const normalizedQuery = catalogueQuery.trim().toLocaleLowerCase();
  const visibleListings = listings.filter((product) => {
    const searchable = [
      product.name,
      product.brand,
      product.code,
      product.slug,
      product.categoryLabel,
      product.unit,
      product.grade,
      product.description,
      ...product.variants.flatMap((variant) => [variant.label, variant.code, variant.unit, ...Object.entries(variant.attributes || {}).flatMap(([key, value]) => [key, value])]),
      ...product.features,
      ...Object.values(product.specifications),
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();
    const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
    const matchesBrand = brandFilter === "all" || product.brand === brandFilter;
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    const matchesPublication =
      publicationFilter === "all" ||
      (publicationFilter === "published" ? product.isPublished : !product.isPublished);
    const availabilityStatuses = product.variants.length
      ? product.variants.map((variant) => variant.availabilityStatus)
      : [product.availabilityStatus];
    const matchesAvailability =
      availabilityFilter === "all" || availabilityStatuses.includes(availabilityFilter as Listing["availabilityStatus"]);
    return matchesQuery && matchesBrand && matchesCategory && matchesPublication && matchesAvailability;
  });

  const request = useCallback(
    async <T,>(path: string, method = "GET", body?: unknown): Promise<T> => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "/api"}${path}`,
        {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(65000),
        },
      );
      const result = await response.json().catch(() => null);
      if (response.status === 401) onSignOut();
      if (!response.ok)
        throw new Error(
          typeof result?.message === "string"
            ? result.message
            : "Could not save catalogue changes.",
        );
      return result as T;
    },
    [token, onSignOut],
  );

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

    setBusy(true);
    setError("");
    setNotice("");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "/api"}/storage/images`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body,
          signal: AbortSignal.timeout(60000),
        },
      );
      const result = (await response.json().catch(() => null)) as {
        url?: string;
        message?: string;
      } | null;
      if (response.status === 401) onSignOut();
      if (!response.ok || !result?.url)
        throw new Error(
          typeof result?.message === "string"
            ? result.message
            : "Could not upload this product image.",
        );
      setEditing((current) =>
        current ? { ...current, image: result.url! } : current,
      );
      setNotice("Image uploaded. Save the product to publish it.");
      input.value = "";
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not upload this product image.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function uploadVariantImage(file: File, input: HTMLInputElement, index: number) {
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
    setBusy(true);
    setError("");
    setNotice("");
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
      if (!response.ok || !result?.url) throw new Error(typeof result?.message === "string" ? result.message : "Could not upload this option image.");
      setEditing((current) => current ? {
        ...current,
        variants: current.variants.map((variant, rowIndex) => rowIndex === index ? { ...variant, image: result.url! } : variant),
      } : current);
      setNotice("Option photo uploaded. Save the product to keep it.");
      input.value = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload this option image.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadGalleryImages(files: FileList, input: HTMLInputElement) {
    const selected = Array.from(files);
    const galleryCount = editing?.galleryImages.length || 0;
    const remaining = MAX_GALLERY_IMAGES - galleryCount;
    if (
      selected.length > remaining ||
      selected.some(
        (file) =>
          !new Set(["image/png", "image/jpeg", "image/webp"]).has(file.type) ||
          file.size > 5 * 1024 * 1024,
      )
    ) {
      setError(
        remaining < 1
          ? "The gallery already has four images. Remove one before uploading another."
          : `Choose up to ${remaining} more PNG, JPEG, or WebP image${remaining === 1 ? "" : "s"}, each 5 MB or smaller.`,
      );
      input.value = "";
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const uploaded: string[] = [];
      for (const file of selected) {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || "/api"}/storage/images`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body,
            signal: AbortSignal.timeout(60000),
          },
        );
        const result = (await response.json().catch(() => null)) as {
          url?: string;
          message?: string;
        } | null;
        if (response.status === 401) onSignOut();
        if (!response.ok || !result?.url)
          throw new Error(
            typeof result?.message === "string"
              ? result.message
              : `Could not upload ${file.name}.`,
          );
        uploaded.push(result.url);
      }
      setEditing((current) =>
        current
          ? {
              ...current,
              galleryImages: Array.from(
                new Set([...(current.galleryImages || []), ...uploaded]),
              ),
            }
          : current,
      );
      setNotice(
        `${uploaded.length} gallery image${uploaded.length === 1 ? "" : "s"} uploaded. Save the product to keep them.`,
      );
      input.value = "";
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not upload these gallery images.",
      );
    } finally {
      setBusy(false);
    }
  }

  const refresh = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const rows = await request<Listing[]>("/products/catalogue");
      setListings(
        rows.map((row) => ({
          ...row,
          availabilityStatus: row.availabilityStatus || (row.isInStock ? "IN_STOCK" : "CHECK_AVAILABILITY"),
          galleryImages: Array.isArray(row.galleryImages)
            ? row.galleryImages
            : [],
          variants: Array.isArray(row.variants) ? row.variants.map((variant) => ({
            ...variant,
            galleryImages: Array.isArray(variant.galleryImages) ? variant.galleryImages : [],
            availabilityStatus: variant.availabilityStatus || (variant.isInStock ? "IN_STOCK" : "CHECK_AVAILABILITY"),
            inStock: variant.availabilityStatus ? variant.availabilityStatus === "IN_STOCK" : Boolean(variant.isInStock),
          })) : [],
          features: Array.isArray(row.features) ? row.features : [],
          applications: Array.isArray(row.applications) ? row.applications : [],
          specifications:
            row.specifications && typeof row.specifications === "object"
              ? row.specifications
              : {},
        })),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load the catalogue.",
      );
    } finally {
      setBusy(false);
    }
  }, [request]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    let active = true;
    void request<Array<{ name: string; isActive: boolean }>>("/products/catalogue/partner-brands")
      .then((brands) => { if (active) setPartnerBrandOptions(brands.filter((brand) => brand.isActive).map((brand) => brand.name)); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [request]);

  useEffect(() => {
    if (!editing || !recoveredDraft || !productForm.current) return;
    for (const [name, value] of Object.entries(recoveredDraft.values)) {
      const control = productForm.current.elements.namedItem(name);
      if (control instanceof HTMLInputElement && control.type === "checkbox")
        control.checked = Boolean(value);
      else if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement)
        control.value = String(value);
    }
    setDraftSavedAt(recoveredDraft.savedAt);
    setNotice("Recovered this product’s unsaved changes. They remain private until you save the product.");
    setRecoveredDraft(null);
  }, [editing?.id, recoveredDraft]);

  useEffect(() => {
    if (!editing) return;
    const key = productDraftKey(editing.id);
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const previous = JSON.parse(raw) as ProductDraft;
      const draft: ProductDraft = {
        ...previous,
        savedAt: Date.now(),
        image: editing.image || "",
        galleryImages: editing.galleryImages || [],
        variants: editing.variants || [],
      };
      localStorage.setItem(key, JSON.stringify(draft));
      setDraftSavedAt(draft.savedAt);
    } catch {
      // Keep editing available if browser recovery storage is unavailable.
    }
  }, [editing?.id, editing?.image, editing?.galleryImages, editing?.variants]);

  function captureProductDraft(event: ChangeEvent<HTMLFormElement>) {
    if (!editing) return;
    const values: ProductDraft["values"] = {};
    for (const [name, value] of new FormData(event.currentTarget).entries()) {
      const control = event.currentTarget.elements.namedItem(name);
      if (control instanceof HTMLInputElement && control.type === "checkbox") values[name] = control.checked;
      else values[name] = String(value);
    }
    const draft: ProductDraft = {
      savedAt: Date.now(),
      values,
      image: editing.image || "",
      galleryImages: editing.galleryImages || [],
      variants: editing.variants || [],
    };
    try {
      localStorage.setItem(productDraftKey(editing.id), JSON.stringify(draft));
      setDraftSavedAt(draft.savedAt);
    } catch {
      setNotice("This browser could not save a recovery copy. Save the product before leaving this page.");
    }
  }

  function recoverableDraftFor(product: Listing): ProductDraft | null {
    try {
      const raw = localStorage.getItem(productDraftKey(product.id));
      if (!raw) return null;
      const value = JSON.parse(raw) as ProductDraft;
      if (!value || !Number.isFinite(value.savedAt) || Date.now() - value.savedAt > PRODUCT_DRAFT_TTL_MS) {
        localStorage.removeItem(productDraftKey(product.id));
        return null;
      }
      return value;
    } catch {
      return null;
    }
  }

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
      availabilityStatus: String(values.get("availabilityStatus") || "CHECK_AVAILABILITY") as Listing["availabilityStatus"],
      isInStock: values.get("availabilityStatus") === "IN_STOCK",
      isPublished: values.get("isPublished") === "on",
      features: fromLines(values.get("features")),
      applications: fromLines(values.get("applications")),
      specifications: specsFromLines(values.get("specifications")),
      variants: (formProduct.variants || []).map((variant, sortOrder) => ({
        ...variant,
        isInStock: variant.availabilityStatus === "IN_STOCK",
        code: variant.code || null,
        price: variant.price === "" ? null : variant.price,
        compareAtPrice: variant.compareAtPrice === "" ? null : variant.compareAtPrice,
        stockQuantity: variant.stockQuantity === "" ? null : variant.stockQuantity,
        minOrderQuantity: variant.minOrderQuantity === "" ? null : variant.minOrderQuantity,
        quantityBreaks: variant.quantityBreaks || [],
        sortOrder,
      })),
      sortOrder: Number(values.get("sortOrder") || 0),
    };
    if (payload.galleryImages.length > MAX_GALLERY_IMAGES) {
      setError("A product can have up to four additional gallery images.");
      return;
    }
    if (rawCompare && rawPrice && Number(rawCompare) < Number(rawPrice)) {
      setError(
        "Original price must be equal to or greater than the selling price.",
      );
      return;
    }
    if (
      payload.offerStartsAt &&
      payload.offerEndsAt &&
      payload.offerEndsAt < payload.offerStartsAt
    ) {
      setError("Offer end date must be on or after its start date.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await request(
        `/products/catalogue${editing?.id ? `/${editing.id}` : ""}`,
        editing?.id ? "PATCH" : "POST",
        payload,
      );
      setNotice(
        payload.isPublished
          ? "Product saved and published to the website."
          : "Product saved as a draft.",
      );
      try { localStorage.removeItem(productDraftKey(editing?.id || "")); } catch { /* browser storage is optional */ }
      setEditing(null);
      setDraftSavedAt(null);
      setPreviewListing(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this product.");
    } finally {
      setBusy(false);
    }
  }

  async function unpublish(product: Listing) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await request(`/products/catalogue/${product.id}`, "DELETE");
      setNotice(`${product.name} is unpublished.`);
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not unpublish this product.",
      );
    } finally {
      setBusy(false);
    }
  }

  const startEdit = (product: Listing) => {
    const recovery = recoverableDraftFor(product);
    setPreviewListing(null);
    setEditing({ ...product, ...(recovery ? { image: recovery.image, galleryImages: recovery.galleryImages, variants: recovery.variants } : {}) });
    setRecoveredDraft(recovery);
    setDraftSavedAt(recovery?.savedAt ?? null);
  };
  const startNew = () => {
    const product = {
      ...blank,
      sortOrder: listings.length
        ? Math.max(...listings.map((p) => p.sortOrder)) + 1
        : 0,
    };
    const recovery = recoverableDraftFor(product);
    setPreviewListing(null);
    setEditing({ ...product, ...(recovery ? { image: recovery.image, galleryImages: recovery.galleryImages, variants: recovery.variants } : {}) });
    setRecoveredDraft(recovery);
    setDraftSavedAt(recovery?.savedAt ?? null);
  };
  const formProduct = editing;

  if (managingBrands) return <PartnerBrandsManager token={token} role={role} onSignOut={onSignOut} onBack={() => setManagingBrands(false)} />;

  return (
    <div className="catalogue-manager">
      <header className="catalogue-manager-head">
        <div>
          <span className="eyebrow">CUSTOMER WEBSITE CATALOGUE</span>
          <h2>Products, pricing & offers</h2>
          <p>
            {canManage
              ? "Changes appear on the public marketplace after saving and publishing."
              : "Read-only catalogue access. You can review products and pack prices; catalogue staff manage changes."}
          </p>
        </div>
        <div className="catalogue-manager-actions">
          <button className="btn-sm btn-secondary" onClick={() => setManagingBrands(true)}><Tags size={15} /> Partner brands</button>
          <button
            className="btn-sm btn-secondary"
            disabled={busy}
            onClick={() => void refresh()}
          >
            <RefreshCw size={15} /> Refresh
          </button>
          {canManage && (
            <button
              className="btn-sm btn-primary"
              disabled={busy}
              onClick={startNew}
            >
              <PackagePlus size={16} /> Add product
            </button>
          )}
        </div>
      </header>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="saved-notice" role="status">
          {notice}
        </p>
      )}
      {canManage && formProduct && (
        <form
          ref={productForm}
          className="panel-card catalogue-product-form"
          onSubmit={(event) => void save(event)}
          onChange={captureProductDraft}
        >
          <div className="catalogue-form-title">
            <h3>{formProduct.id ? "Edit product" : "Add a product"}</h3>
            <button
              type="button"
              className="btn-sm btn-secondary"
              onClick={() => setEditing(null)}
              aria-label="Close product form"
            >
              <X size={16} />
            </button>
          </div>
          <div className="catalogue-fields">
            <label>
              Product name
              <input
                name="name"
                required
                maxLength={180}
                defaultValue={formProduct.name}
              />
            </label>
            <label>
              Brand
              <input
                name="brand"
                list="catalogue-partner-brand-options"
                maxLength={120}
                defaultValue={formProduct.brand}
              />
              <datalist id="catalogue-partner-brand-options">{[...new Set([...partnerBrandOptions, ...brands, formProduct.brand].filter(Boolean))].map((brand) => <option key={brand} value={brand} />)}</datalist>
            </label>
            <label>
              Product code
              <input
                name="code"
                maxLength={80}
                defaultValue={formProduct.code || ""}
              />
            </label>
            <label>
              URL slug
              <input
                name="slug"
                maxLength={120}
                placeholder="Generated from code or name"
                defaultValue={formProduct.slug}
              />
            </label>
            <label>
              Category key
              <input
                name="category"
                required
                maxLength={80}
                defaultValue={formProduct.category}
              />
            </label>
            <label>
              Category name
              <input
                name="categoryLabel"
                required
                maxLength={120}
                defaultValue={formProduct.categoryLabel}
              />
            </label>
            <label>
              Unit shown to customer
              <input
                name="unit"
                required
                maxLength={100}
                placeholder="e.g. 50 kg bag"
                defaultValue={formProduct.unit}
              />
            </label>
            <label>
              Grade / type
              <input
                name="grade"
                maxLength={500}
                defaultValue={formProduct.grade || ""}
              />
            </label>
            <label>
              Minimum order
              <input
                name="minOrderQty"
                maxLength={500}
                defaultValue={formProduct.minOrderQty || ""}
              />
            </label>
            <label>
              Dispatch wording
              <input
                name="dispatchTime"
                maxLength={500}
                defaultValue={formProduct.dispatchTime || ""}
              />
            </label>
            <label>
              Price (₹ per unit)
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                defaultValue={formProduct.price || ""}
              />
            </label>
            <label>
              Compare-at price / MRP (₹, optional)
              <input
                name="compareAtPrice"
                type="number"
                min="0"
                step="0.01"
                defaultValue={formProduct.compareAtPrice || ""}
              />
            </label>
            <label>
              Price note
              <input
                name="priceNote"
                maxLength={120}
                placeholder="e.g. per bag, GST included"
                defaultValue={formProduct.priceNote || ""}
              />
            </label>
            <label>
              Offer label (optional)
              <input
                name="offerLabel"
                maxLength={120}
                placeholder="e.g. Launch offer"
                defaultValue={formProduct.offerLabel || ""}
              />
            </label>
            <label>
              Offer starts (optional)
              <input
                name="offerStartsAt"
                type="date"
                defaultValue={dateField(formProduct.offerStartsAt)}
              />
            </label>
            <label>
              Offer ends (optional)
              <input
                name="offerEndsAt"
                type="date"
                defaultValue={dateField(formProduct.offerEndsAt)}
              />
            </label>
            <label>
              Packaging
              <input
                name="packaging"
                maxLength={500}
                defaultValue={formProduct.packaging || ""}
              />
            </label>
            <label>
              Brand tagline
              <input
                name="brandTagline"
                maxLength={500}
                defaultValue={formProduct.brandTagline || ""}
              />
            </label>
            <label>
              Primary product image (optional)
              <input
                name="image"
                maxLength={1000}
                placeholder="/images/products/example.png"
                value={formProduct.image || ""}
                onChange={(event) =>
                  setEditing({ ...formProduct, image: event.target.value })
                }
              />
              <small>
                Add a client-approved photo when available. Leave blank to use
                the neutral product placeholder.
              </small>
              {formProduct.image && (
                <span className="catalogue-image-preview">
                  <img src={formProduct.image} alt="Primary product preview" />
                  <span>Main product photo</span>
                </span>
              )}
            </label>
            <label className="catalogue-image-upload">
              <span>
                <Upload size={14} /> Upload primary product image
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={busy}
                onChange={(event) => {
                  const input = event.currentTarget;
                  const file = input.files?.[0];
                  if (file) void uploadImage(file, input);
                }}
              />
              <small>
                Optional. PNG, JPEG or WebP, up to 5 MB. Uploading a new file
                replaces the primary photo.
              </small>
            </label>
            <label>
              Additional product images (optional, up to 4)
              <textarea
                name="galleryImages"
                rows={3}
                value={lines(formProduct.galleryImages || [])}
                onChange={(event) => {
                  setEditing({
                    ...formProduct,
                    galleryImages: fromLines(event.currentTarget.value),
                  });
                }}
              />
              <small>
                One site path or HTTPS URL per line. These four extra views are
                optional.
              </small>
              {formProduct.galleryImages.length > 0 && (
                <span className="catalogue-gallery-previews">
                  {formProduct.galleryImages.map((image, index) => (
                    <span
                      className="catalogue-image-preview"
                      key={`${image}-${index}`}
                    >
                      <img
                        src={image}
                        alt={`Additional product view ${index + 1}`}
                      />
                      <button
                        type="button"
                        className="btn-sm btn-secondary"
                        aria-label={`Remove additional image ${index + 1}`}
                        onClick={() =>
                          setEditing({
                            ...formProduct,
                            galleryImages: formProduct.galleryImages.filter(
                              (_, imageIndex) => imageIndex !== index,
                            ),
                          })
                        }
                      >
                        <X size={14} /> Remove
                      </button>
                    </span>
                  ))}
                </span>
              )}
            </label>
            <label className="catalogue-image-upload">
              <span>
                <Upload size={14} /> Upload gallery images
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                disabled={
                  busy || formProduct.galleryImages.length >= MAX_GALLERY_IMAGES
                }
                onChange={(event) => {
                  const input = event.currentTarget;
                  const files = input.files;
                  if (files?.length) void uploadGalleryImages(files, input);
                }}
              />
              <small>
                {Math.max(
                  0,
                  MAX_GALLERY_IMAGES - formProduct.galleryImages.length,
                )}{" "}
                of 4 additional images available. PNG/JPEG/WebP, 5 MB each.
              </small>
            </label>
            <p className="catalogue-field-note catalogue-wide">
              Offers are optional. Leave compare-at price, offer label and dates
              blank for a regular-price product. Add only the details that
              apply; offer dates control when the offer is shown.
            </p>
            <label>
              Display order
              <input
                name="sortOrder"
                type="number"
                min="0"
                step="1"
                defaultValue={formProduct.sortOrder}
              />
            </label>
            <label className="catalogue-wide">
              Short description
              <textarea
                name="description"
                rows={3}
                maxLength={3000}
                defaultValue={formProduct.description || ""}
              />
            </label>
            <label>
              Features (one per line)
              <textarea
                name="features"
                rows={5}
                defaultValue={lines(formProduct.features)}
              />
            </label>
            <label>
              Applications (one per line)
              <textarea
                name="applications"
                rows={5}
                defaultValue={lines(formProduct.applications)}
              />
            </label>
            <label className="catalogue-wide">
              Specifications (one “name: value” per line)
              <textarea
                name="specifications"
                rows={5}
                defaultValue={Object.entries(formProduct.specifications || {})
                  .map(([key, value]) => `${key}: ${value}`)
                  .join("\n")}
              />
            </label>
            <CatalogueVariantsEditor
              variants={formProduct.variants || []}
              onChange={(variants) => setEditing({ ...formProduct, variants })}
              onUploadImage={(file, input, index) => void uploadVariantImage(file, input, index)}
              defaultUnit={formProduct.unit}
              busy={busy}
            />
          </div>
          <div className="catalogue-form-checks">
            <label>
              Availability
              <select name="availabilityStatus" defaultValue={formProduct.availabilityStatus || (formProduct.isInStock ? "IN_STOCK" : "CHECK_AVAILABILITY")}>
                <option key="IN_STOCK" value="IN_STOCK">In stock</option>
                <option key="OUT_OF_STOCK" value="OUT_OF_STOCK">Out of stock</option>
                <option key="CHECK_AVAILABILITY" value="CHECK_AVAILABILITY">Check availability</option>
              </select>
            </label>
            <label>
              <input
                name="isPublished"
                type="checkbox"
                defaultChecked={formProduct.isPublished}
              />{" "}
              Publish on website
            </label>
          </div>
          <div className="catalogue-form-footer">
            <small>
              <Image size={14} /> Use approved product images; do not upload
              brand logos or alter brand artwork here.
            </small>
            <button className="btn-sm btn-primary" disabled={busy}>
              <Save size={15} />
              {busy ? "Saving…" : "Save product"}
            </button>
            <button type="button" className="btn-sm btn-secondary" disabled={busy} onClick={() => {
              const form = productForm.current;
              if (!form || !formProduct) return;
              const values = new FormData(form);
              const preview: Listing = {
                ...formProduct,
                name: String(values.get("name") || "").trim(),
                brand: String(values.get("brand") || "").trim(),
                categoryLabel: String(values.get("categoryLabel") || "").trim(),
                unit: String(values.get("unit") || "").trim(),
                price: String(values.get("price") || "").trim() || null,
                description: String(values.get("description") || "").trim() || null,
                isPublished: values.get("isPublished") === "on",
              };
              setPreviewListing(preview);
            }}>Preview listing</button>
          </div>
          {draftSavedAt && <p className="catalogue-draft-status" role="status">Recovery copy saved {new Date(draftSavedAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}. Kept in this browser for 7 days.</p>}
          {previewListing && <aside className="catalogue-live-preview" aria-label="Product listing preview">
            <div><span className="eyebrow">STOREFRONT PREVIEW</span><h4>{previewListing.name || "Product name"}</h4><p>{previewListing.brand || "Brand"} · {previewListing.categoryLabel}</p><p>{previewListing.description || "No description added."}</p><strong>{previewListing.price ? `₹${previewListing.price} / ${previewListing.unit || "unit"}` : "Request a quote"}</strong><small>{previewListing.isPublished ? "Would be visible after you save." : "Saved as a draft; hidden from customers."}</small></div>
            {previewListing.image && <img src={previewListing.image} alt={`Preview of ${previewListing.name || "product"}`} />}
          </aside>}
        </form>
      )}
      <section className="panel-card catalogue-filter-panel" aria-label="Filter catalogue">
        <label className="catalogue-search">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            value={catalogueQuery}
            onChange={(event) => setCatalogueQuery(event.target.value)}
            placeholder="Search products, brands, codes, colours or sizes"
            aria-label="Search catalogue"
          />
          {catalogueQuery && (
            <button
              type="button"
              className="catalogue-search-clear"
              onClick={() => setCatalogueQuery("")}
              aria-label="Clear catalogue search"
            >
              <X size={16} />
            </button>
          )}
        </label>
        <div className="catalogue-filter-fields">
          <label>
            Brand
            <select value={brandFilter} onChange={(event) => setBrandFilter(event.target.value)}>
              <option key="all" value="all">All brands</option>
              {brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
            </select>
          </label>
          <label>
            Category
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option key="all" value="all">All categories</option>
              {categories.map(([category, label]) => <option key={category} value={category}>{label}</option>)}
            </select>
          </label>
          <label>
            Website status
            <select value={publicationFilter} onChange={(event) => setPublicationFilter(event.target.value)}>
              <option key="all" value="all">Published and drafts</option>
              <option key="published" value="published">Published</option>
              <option key="draft" value="draft">Drafts</option>
            </select>
          </label>
          <label>
            Availability
            <select value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value)}>
              <option key="all" value="all">All availability</option>
              <option key="IN_STOCK" value="IN_STOCK">In stock</option>
              <option key="OUT_OF_STOCK" value="OUT_OF_STOCK">Out of stock</option>
              <option key="CHECK_AVAILABILITY" value="CHECK_AVAILABILITY">Check availability</option>
            </select>
          </label>
        </div>
      </section>
      <div className="catalogue-listing-count" aria-live="polite">
        Showing {visibleListings.length} of {listings.length} catalogue products ·{" "}
        {listings.filter((p) => p.isPublished).length} published
      </div>
      {listings.length === 0 && !busy && (
        <section className="panel-card catalogue-empty">
          <h3>No catalogue products yet</h3>
          <p>{canManage ? "Add the first client-approved product as a draft, then publish it after checking its details and options." : "A catalogue manager can add client-approved products here. No sample products are being shown."}</p>
          {canManage && <button className="btn-sm btn-primary" onClick={startNew}><PackagePlus size={15} /> Add first product</button>}
        </section>
      )}
      {listings.length > 0 && visibleListings.length === 0 && (
        <section className="panel-card catalogue-empty">
          <h3>No matching products</h3>
          <p>Try a different product name, brand, category or availability filter.</p>
          <button
            className="btn-sm btn-secondary"
            onClick={() => {
              setCatalogueQuery("");
              setBrandFilter("all");
              setCategoryFilter("all");
              setPublicationFilter("all");
              setAvailabilityFilter("all");
            }}
          >
            Clear all filters
          </button>
        </section>
      )}
      <div className="catalogue-listings">
        {visibleListings.map((product) => (
          <article className="panel-card catalogue-listing" key={product.id}>
            <div className="catalogue-listing-image">
              {product.image || product.galleryImages?.[0] ? (
                <img src={product.image || product.galleryImages?.[0] || ""} alt="" />
              ) : (
                <span className="catalogue-listing-image-placeholder" aria-label="Product image not provided">
                  <Image size={22} />
                  <small>No image</small>
                </span>
              )}
            </div>
            <div className="catalogue-listing-main">
              <div className="catalogue-listing-title">
                <h3>{product.name}</h3>
                <span
                  className={
                    product.isPublished
                      ? "catalogue-published"
                      : "catalogue-draft"
                  }
                >
                  {product.isPublished ? "Published" : "Draft"}
                </span>
              </div>
              <p>
                {product.brand || "Unbranded"} · {product.categoryLabel} ·{" "}
                {product.unit}
              </p>
              <div className="catalogue-price-line">
                {product.variants?.length ? (
                  <strong>{product.variants.length} sellable variants</strong>
                ) : product.price == null ? (
                  <span>Price not set</span>
                ) : (
                  <strong>
                    ₹{Number(product.price).toLocaleString("en-IN")} /{" "}
                    {product.unit}
                  </strong>
                )}
                {product.compareAtPrice != null && (
                  <del>
                    ₹{Number(product.compareAtPrice).toLocaleString("en-IN")}
                  </del>
                )}
                {product.priceNote && <span>{product.priceNote}</span>}
                {product.offerLabel && (
                  <span className="catalogue-offer">{product.offerLabel}</span>
                )}
              </div>
              {product.variants?.length > 0 && (
                <details>
                  <summary>View pack prices and availability</summary>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Pack / size</th>
                          <th>Price</th>
                          <th>Availability</th>
                          <th>Minimum order</th>
                        </tr>
                      </thead>
                      <tbody>
                        {product.variants.map((variant, index) => (
                          <tr key={variant.id || index}>
                            <td>{variant.label}</td>
                            <td>
                              {variant.price == null
                                ? "Price not set"
                                : `₹${Number(variant.price).toLocaleString("en-IN")} / ${variant.unit}`}
                              <small>{variant.priceNote}</small>
                              {variant.quantityBreaks?.map(
                                (tier, tierIndex) => (
                                  <small key={tierIndex}>
                                    {tier.minimumQuantity}+ {variant.unit}: ₹
                                    {Number(tier.unitPrice).toLocaleString(
                                      "en-IN",
                                    )}{" "}
                                    each
                                  </small>
                                ),
                              )}
                            </td>
                            <td>
                              {variant.availabilityStatus === "IN_STOCK" || variant.isInStock
                                ? "In stock"
                                : variant.availabilityStatus === "OUT_OF_STOCK"
                                  ? "Out of stock"
                                  : "Confirm availability"}
                            </td>
                            <td>
                              {variant.minOrderQuantity == null
                                ? "Confirm minimum"
                                : `${variant.minOrderQuantity} ${variant.unit}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </div>
            {canManage && (
              <div className="catalogue-listing-controls">
                <button
                  className="btn-sm btn-secondary"
                  disabled={busy}
                  onClick={() => startEdit(product)}
                >
                  Edit
                </button>
                {product.isPublished && (
                  <button
                    className="btn-sm btn-secondary"
                    disabled={busy}
                    onClick={() => void unpublish(product)}
                  >
                    Unpublish
                  </button>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
