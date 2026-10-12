import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { confirmAdminAction } from "../../components/confirmAdminAction";
import SupplierCataloguePicker, { type SupplierBrandCatalogEntry, type SupplierCatalogueVariant } from "./SupplierCataloguePicker";

type Product = {
  id: string;
  catalogVariantId: string | null;
  catalogVariant: {
    id: string;
    label: string;
    listing: { name: string; brand: string; category: string };
  } | null;
  productName: string;
  brand: string;
  category: string;
  unit: string;
  minimumOrderQty: string | null;
  availableQuantity: string | number | null;
  availabilityCheckedAt: string | null;
  lastQuotedPrice: string | null;
  isActive: boolean;
};
type Supplier = {
  name: string;
  averageRating: number | null;
  brandCatalog?: SupplierBrandCatalogEntry[];
  products: Product[];
  ratings: {
    id: string;
    comment: string | null;
    createdAt: string;
    staff: { name: string } | null;
    priceScore: number;
    deliveryScore: number;
    availabilityScore: number;
    qualityScore: number;
    serviceScore: number;
  }[];
};
type RatingAuditPage = {
  items: {
    action: string;
    createdAt: string;
    metadata: unknown;
    staff: { name: string; role?: string } | null;
  }[];
};
type Request = <T>(path: string, method?: string, body?: unknown) => Promise<T>;

export default function SupplierProducts({
  supplierId,
  request,
}: {
  supplierId: string;
  request: Request;
}) {
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [catalogueVariants, setCatalogueVariants] = useState<SupplierCatalogueVariant[]>([]);
  const [adding, setAdding] = useState(false);
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);
  const [selectedBrandCatalog, setSelectedBrandCatalog] = useState<SupplierBrandCatalogEntry[]>([]);
  const selectedVariants = catalogueVariants.filter((variant) => selectedVariantIds.includes(variant.id));
  const brandGroups = useMemo(() => {
    const groups = new Map<string, { brand: string; categories: Set<string>; products: Set<string> }>();
    for (const entry of supplier?.brandCatalog ?? []) {
      const brand = entry.brand.trim() || "Not specified";
      const key = brand.toLocaleLowerCase();
      const group = groups.get(key) ?? { brand, categories: new Set<string>(), products: new Set<string>() };
      for (const category of entry.categories ?? []) if (category.trim()) group.categories.add(category.trim());
      groups.set(key, group);
    }
    for (const product of supplier?.products ?? []) {
      const brand = product.brand.trim() || "Not specified";
      const key = brand.toLocaleLowerCase();
      const group = groups.get(key) ?? { brand, categories: new Set<string>(), products: new Set<string>() };
      if (product.category.trim()) group.categories.add(product.category.trim());
      if (product.productName.trim()) group.products.add(product.productName.trim());
      groups.set(key, group);
    }
    return [...groups.values()].sort((left, right) => left.brand.localeCompare(right.brand));
  }, [supplier?.brandCatalog, supplier?.products]);
  const refresh = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const auditPath = `/admin/audit?entityType=SUPPLIER&entityId=${encodeURIComponent(supplierId)}&page=1`;
      const [record, createdRatings, updatedRatings] = await Promise.all([
        request<Supplier>(`/suppliers/${supplierId}`),
        request<RatingAuditPage>(`${auditPath}&action=SUPPLIER_RATED`),
        request<RatingAuditPage>(`${auditPath}&action=SUPPLIER_RATING_UPDATED`),
      ]);
      const activityByRatingId = new Map<string, RatingAuditPage["items"][number]>();
      [...createdRatings.items, ...updatedRatings.items]
        .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
        .forEach((activity) => {
          const metadata = activity.metadata;
          const ratingId =
            metadata &&
            typeof metadata === "object" &&
            !Array.isArray(metadata) &&
            typeof (metadata as Record<string, unknown>).ratingId === "string"
              ? ((metadata as Record<string, unknown>).ratingId as string)
              : null;
          if (ratingId && !activityByRatingId.has(ratingId))
            activityByRatingId.set(ratingId, activity);
        });
      setSupplier({
        ...record,
        ratings: record.ratings.map((rating) => {
          const activity = activityByRatingId.get(rating.id);
          return {
            ...rating,
            ...(activity ? { createdAt: activity.createdAt } : {}),
            staff: activity?.staff ?? rating.staff ?? null,
          };
        }),
      });
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }, [request, supplierId]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    void request<{
      name: string;
      brand: string;
      category: string;
      variants: { id: string; label: string; unit: string }[];
    }[]>("/products/catalogue")
      .then((listings) =>
        setCatalogueVariants(
          listings.flatMap((listing) =>
            listing.variants.map((variant) => ({
              ...variant,
              productName: listing.name,
              brand: listing.brand,
              category: listing.category,
            })),
          ),
        ),
      )
      .catch(() => setCatalogueVariants([]));
  }, [request]);
  useEffect(() => {
    if (!adding && !editing) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        setAdding(false);
        setEditing(null);
        setSelectedVariantIds([]);
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [adding, editing, busy]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await request(
        `/suppliers/${supplierId}/products/${editing.id}`,
        "PATCH",
        {
          minimumOrderQty: form.get("minimum")
            ? Number(form.get("minimum"))
            : null,
          availableQuantity:
            form.get("availableQuantity") === ""
              ? null
              : Number(form.get("availableQuantity")),
          lastQuotedPrice: form.get("price") ? Number(form.get("price")) : null,
          isActive: form.get("active") === "on",
        },
      );
      setEditing(null);
      setNotice("Supplier product updated.");
      await refresh();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function addProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedVariants.length && !selectedBrandCatalog.length) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const brandCatalog = new Map((supplier?.brandCatalog ?? []).map((entry) => [entry.brand.toLocaleLowerCase(), { brand: entry.brand, categories: [...(entry.categories ?? [])] }]));
      for (const entry of selectedBrandCatalog) {
        const key = entry.brand.toLocaleLowerCase();
        const existing = brandCatalog.get(key);
        brandCatalog.set(key, {
          brand: existing?.brand ?? entry.brand,
          categories: [...new Set([...(existing?.categories ?? []), ...entry.categories])],
        });
      }
      await request(`/suppliers/${supplierId}`, "PATCH", { brandCatalog: [...brandCatalog.values()] });
      for (const variant of selectedVariants) {
        await request(`/suppliers/${supplierId}/products`, "POST", {
          catalogVariantId: variant.id,
          productName: variant.productName,
          brand: variant.brand,
          category: variant.category,
          unit: variant.unit,
        });
      }
      setAdding(false);
      setSelectedVariantIds([]);
      setSelectedBrandCatalog([]);
      setNotice(selectedVariants.length
        ? `${selectedVariants.length} supplied product${selectedVariants.length === 1 ? "" : "s"} added.`
        : "Supplier brands saved.");
      await refresh();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="bc-form bc-supplier-detail">
      <header className="bc-supplier-detail-header">
        <div>
          <span className="bc-supplier-detail-eyebrow">Supplier overview</span>
          <h2>{supplier?.name || "Supplier details"}</h2>
          <p>Products carried and feedback recorded for this supplier.</p>
        </div>
      </header>
      {error && <p role="alert" className="bc-error">{error}</p>}
      {notice && <p role="status" className="bc-success">{notice}</p>}
      {busy && <p role="status">Loading or saving supplier details…</p>}
      {supplier && (
        <>
          <div className="bc-supplier-detail-stats" aria-label="Supplier summary">
            <div><span>Average rating</span><strong>{supplier.averageRating == null ? "—" : `${supplier.averageRating.toFixed(1)} / 5`}</strong><small>{supplier.averageRating == null ? "No ratings yet" : "Across recorded ratings"}</small></div>
            <div><span>Listed products</span><strong>{supplier.products.length}</strong><small>{supplier.products.length === 1 ? "Product carried" : "Products carried"}</small></div>
            <div><span>Ratings received</span><strong>{supplier.ratings.length}</strong><small>{supplier.ratings.length ? "Most recent shown below" : "Customer feedback"}</small></div>
          </div>
          <section className="bc-supplier-detail-section">
            <header className="bc-supplier-detail-section-heading">
              <div><h3>Products supplied</h3><p>Manage this supplier’s brands, products, and availability.</p></div>
              <button type="button" className="bc-primary bc-supplier-add-product-button" disabled={busy || !catalogueVariants.length} onClick={() => { setAdding((current) => !current); setSelectedVariantIds([]); setSelectedBrandCatalog([]); setEditing(null); setError(""); setNotice(""); }}>
                <Plus size={16} aria-hidden="true" /> {adding ? "Close add product" : "Add supplied product"}
              </button>
            </header>
            {brandGroups.length > 0 && (
              <div className="bc-supplier-brand-groups" aria-label="Brands and products supplied">
                {brandGroups.map((group) => (
                  <article className="bc-supplier-brand-card" key={group.brand.toLocaleLowerCase()}>
                    <p><strong>Brands Name:</strong> {group.brand}</p>
                    <p><strong>Categories:</strong> {group.categories.size ? [...group.categories].join(", ") : "Not specified"}</p>
                    <p><strong>Products:</strong> {group.products.size ? [...group.products].join(", ") : "Not specified"}</p>
                  </article>
                ))}
              </div>
            )}
            {adding && (
              <div className="bc-product-add-modal-backdrop">
                <section className="bc-product-add-modal" role="dialog" aria-modal="true" aria-labelledby="bc-product-add-modal-title">
                  <button type="button" className="bc-product-add-modal-close" aria-label="Close add products" disabled={busy} onClick={() => { setAdding(false); setSelectedVariantIds([]); }}><X size={19} /></button>
                  <div className="bc-product-modal-scroll-area">
                    <header className="bc-product-add-modal-header">
                      <div><h3 id="bc-product-add-modal-title">Add supplied products</h3><p>Choose the brands, categories, and products this supplier carries.</p></div>
                    </header>
                    <form className="bc-supplier-product-add-form" onSubmit={addProduct}>
                      <SupplierCataloguePicker
                        variants={catalogueVariants.filter((variant) => !(supplier.products ?? []).some((product) => product.catalogVariantId === variant.id))}
                        selectedIds={selectedVariantIds}
                        onChange={setSelectedVariantIds}
                        onBrandCatalogChange={setSelectedBrandCatalog}
                      />
                      <div className="bc-supplier-product-form-actions">
                        <button className="bc-primary" disabled={busy || (!selectedVariants.length && !selectedBrandCatalog.length)}>{selectedVariants.length ? "Add selected products" : "Save selected brands"}</button>
                        <button className="bc-button btn-orange-outline" type="button" disabled={busy} onClick={() => { setAdding(false); setSelectedVariantIds([]); }}>Cancel</button>
                      </div>
                    </form>
                  </div>
                </section>
              </div>
            )}
            {!supplier.products.length && <div className="bc-supplier-detail-empty"><span className="bc-supplier-empty-icon" aria-hidden="true">＋</span><div><strong>No products listed yet</strong><p>Add products from the supplier card to show what they carry.</p></div></div>}
            {supplier.products.map((product) => (
              <article className="bc-supplier-product-card" key={product.id}>
                <div className="bc-supplier-product-copy">
                  <p className="bc-supplier-product-name"><strong>Product name:</strong> {product.productName || "Not specified"}</p>
                  <div className="bc-supplier-product-details">
                    <p><strong>Brand:</strong> {product.brand || "Not specified"}</p>
                    <p><strong>Category:</strong> {product.category || "Not specified"}</p>
                    <p><strong>Unit:</strong> {product.unit || "Not specified"}</p>
                    <p><strong>Status:</strong> <span className={product.isActive ? "is-active" : "is-inactive"}>{product.isActive ? "Active" : "Inactive"}</span></p>
                    <p><strong>Minimum order:</strong> {product.minimumOrderQty ?? "Not specified"}</p>
                    <p><strong>Last quoted price:</strong> {product.lastQuotedPrice ?? "Not recorded"}</p>
                    <p><strong>Available quantity:</strong> {product.availableQuantity ?? "Not checked"}{product.availabilityCheckedAt ? ` · checked ${new Date(product.availabilityCheckedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}` : ""}</p>
                    <p className="bc-supplier-product-linked"><strong>Linked client pack:</strong> {product.catalogVariant ? `${product.catalogVariant.listing.name} · ${product.catalogVariant.label}` : "Not linked"}</p>
                  </div>
                </div>
                <div className="bc-supplier-product-actions">
                <button type="button" className="bc-button bc-supplier-product-action" disabled={busy} onClick={() => { setAdding(false); setEditing(product); setError(""); setNotice(""); }}>Edit supplied product</button>
                <button type="button" className="bc-button bc-danger bc-supplier-product-action" disabled={busy} onClick={async () => {
                  if (!(await confirmAdminAction({ title: "Move this supplier product to Recently deleted?", message: `“${product.productName}” can be restored for 30 days.`, confirmLabel: "Move to recently deleted", tone: "danger" }))) return;
                  setBusy(true); setError(""); setNotice("");
                  try { await request(`/suppliers/${supplierId}/products/${product.id}`, "DELETE"); setNotice("Supplier product moved to Recently deleted."); await refresh(); }
                  catch (cause) { setError((cause as Error).message); }
                  finally { setBusy(false); }
                }}><Trash2 size={16} /> Delete product</button>
                </div>
              </article>
            ))}
          </section>
          {editing && (
            <div className="bc-product-add-modal-backdrop">
              <section className="bc-product-add-modal bc-product-edit-modal" role="dialog" aria-modal="true" aria-labelledby="bc-product-edit-modal-title">
                <button type="button" className="bc-product-add-modal-close" aria-label="Close edit product" disabled={busy} onClick={() => setEditing(null)}><X size={19} /></button>
                <div className="bc-product-modal-scroll-area">
                  <header className="bc-product-add-modal-header">
                    <div><h3 id="bc-product-edit-modal-title">Edit supplied product</h3><p>{editing.productName} · Update this supplier’s availability and pricing details.</p></div>
                  </header>
                  <form className="bc-supplier-product-edit-form" key={editing.id} onSubmit={save}>
                    <fieldset disabled={busy} className="bc-fields">
                    <label>
                      Minimum supplied quantity
                      <input
                        name="minimum"
                        type="number"
                        min="0.001"
                        step="0.001"
                        defaultValue={editing.minimumOrderQty || ""}
                      />
                    </label>
                    <label>
                      Last quoted price
                      <input
                        name="price"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={editing.lastQuotedPrice || ""}
                      />
                    </label>
                    <label>
                      Available quantity (leave blank if unknown)
                      <input
                        name="availableQuantity"
                        type="number"
                        min="0"
                        step="0.001"
                        defaultValue={editing.availableQuantity ?? ""}
                      />
                    </label>
                    <label className="bc-check bc-supplier-matching-check">
                      <input
                        name="active"
                        type="checkbox"
                        defaultChecked={editing.isActive}
                      />{" "}
                      Available for supplier matching
                    </label>
                    </fieldset>
                    <div className="bc-supplier-product-form-actions">
                      <button className="bc-primary" disabled={busy}>
                        Save supplied product
                      </button>
                      <button
                        className="bc-button btn-orange-outline"
                        type="button"
                        disabled={busy}
                        onClick={() => setEditing(null)}
                      >
                        Cancel product edit
                      </button>
                    </div>
                  </form>
                </div>
              </section>
            </div>
          )}
          <section className="bc-supplier-detail-section bc-supplier-rating-section">
            <header className="bc-supplier-detail-section-heading"><div><h3>Recent ratings</h3><p>Feedback scores and notes recorded by your team.</p></div></header>
            {!supplier.ratings.length ? (
              <div className="bc-supplier-detail-empty bc-supplier-rating-empty"><span className="bc-supplier-empty-icon" aria-hidden="true">☆</span><div><strong>No ratings yet</strong><p>Ratings will appear here after one is recorded for this supplier.</p></div></div>
            ) : supplier.ratings.map((rating) => (
              <article className="bc-supplier-rating-card" key={rating.id}>
                <div className="bc-supplier-rating-copy">
                  <strong>{((rating.priceScore + rating.deliveryScore + rating.availabilityScore + rating.qualityScore + rating.serviceScore) / 5).toFixed(1)} / 5</strong>
                  <p>Price {rating.priceScore}/5 · Delivery {rating.deliveryScore}/5 · Availability {rating.availabilityScore}/5 · Quality {rating.qualityScore}/5 · Service {rating.serviceScore}/5</p>
                </div>
                <div className="bc-supplier-rating-meta">
                  <time dateTime={rating.createdAt}>{new Date(rating.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</time>
                  {rating.staff?.name && <span>By {rating.staff.name}</span>}
                </div>
                {rating.comment && <blockquote>{rating.comment}</blockquote>}
              </article>
            ))}
          </section>
        </>
      )}
    </section>
  );
}
