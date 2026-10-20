import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { confirmAdminAction } from "../../components/confirmAdminAction";
import { formatQuantityUnit } from "../../quantity-format";
import SupplierCataloguePicker, { type SupplierBrandCatalogEntry, type SupplierBrandOption, type SupplierCatalogueVariant } from "./SupplierCataloguePicker";

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
  lastQuotedPriceAt: string | null;
  isActive: boolean;
  updatedAt?: string;
};
type Supplier = {
  name: string;
  updatedAt?: string;
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
  const editForm = useRef<HTMLFormElement>(null);
  const addModal = useRef<HTMLElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [catalogueVariants, setCatalogueVariants] = useState<SupplierCatalogueVariant[]>([]);
  const [catalogueBrandOptions, setCatalogueBrandOptions] = useState<SupplierBrandOption[]>([]);
  const [adding, setAdding] = useState(false);
  const [selectedProductNames, setSelectedProductNames] = useState<string[]>([]);
  const [selectedBrandCatalog, setSelectedBrandCatalog] = useState<SupplierBrandCatalogEntry[]>([]);
  const [pickerHasDraft, setPickerHasDraft] = useState(false);
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
  const requestEditClose = useCallback(async () => {
    if (busy) return;
    const form = editForm.current;
    const values = form ? new FormData(form) : null;
    const hasChanges = !!(editing && values && (
      String(values.get("minimum") ?? "") !== String(editing.minimumOrderQty ?? "") ||
      String(values.get("price") ?? "") !== String(editing.lastQuotedPrice ?? "") ||
      String(values.get("availableQuantity") ?? "") !== String(editing.availableQuantity ?? "") ||
      (values.get("active") === "on") !== editing.isActive ||
      values.get("confirmPrice") === "on" ||
      values.get("confirmAvailability") === "on"
    ));
    if (hasChanges && !(await confirmAdminAction({
      title: "Discard unsaved product changes?",
      message: "Your availability and pricing edits haven’t been saved.",
      confirmLabel: "Discard changes",
      tone: "danger",
    }))) return;
    setEditing(null);
  }, [busy, editing]);
  const requestAddClose = useCallback(async () => {
    if (busy) return;
    const hasChanges = pickerHasDraft || selectedProductNames.length > 0 || selectedBrandCatalog.length > 0;
    if (hasChanges && !(await confirmAdminAction({
      title: "Discard supplier selections?",
      message: "Your selected brands, categories, and products haven’t been saved.",
      confirmLabel: "Discard selections",
      tone: "danger",
    }))) return;
    setAdding(false);
    setSelectedProductNames([]);
    setSelectedBrandCatalog([]);
    setPickerHasDraft(false);
  }, [busy, pickerHasDraft, selectedBrandCatalog.length, selectedProductNames.length]);
  const handlePickerDraftChange = useCallback((hasDraft: boolean) => setPickerHasDraft(hasDraft), []);
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
    void request<{ name: string; category?: string; categories?: string[] }[]>("/products/catalogue/partner-brands")
      .then((directory) => setCatalogueBrandOptions(directory.map((brand) => ({
        name: brand.name,
        categories: [...new Set([...(brand.categories || []), ...(brand.category ? [brand.category] : [])])],
      }))))
      .catch(() => setCatalogueBrandOptions([]));
  }, [request]);
  useEffect(() => {
    if (!adding && !editing) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || busy) return;
      if (adding && addModal.current?.querySelector('[aria-expanded="true"]')) return;
      if (adding) void requestAddClose();
      else if (editing) void requestEditClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [adding, editing, busy, requestAddClose, requestEditClose]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    const nextAvailability = form.get("availableQuantity") === ""
      ? null
      : Number(form.get("availableQuantity"));
    const availabilityChanged = nextAvailability !== (editing.availableQuantity == null ? null : Number(editing.availableQuantity));
    const confirmAvailability = form.get("confirmAvailability") === "on" && nextAvailability != null;
    const nextPrice = form.get("price") === "" ? null : Number(form.get("price"));
    const priceChanged = nextPrice !== (editing.lastQuotedPrice == null ? null : Number(editing.lastQuotedPrice));
    const confirmPrice = form.get("confirmPrice") === "on" && nextPrice != null;
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
          ...(availabilityChanged || confirmAvailability ? { availableQuantity: nextAvailability } : {}),
          ...(confirmAvailability ? { confirmAvailability: true } : {}),
          ...(priceChanged || confirmPrice ? { lastQuotedPrice: nextPrice } : {}),
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
    if (!selectedProductNames.length && !selectedBrandCatalog.length) return;
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
      for (const productName of selectedProductNames) {
        await request(`/suppliers/${supplierId}/products`, "POST", {
          productName,
          brand: selectedBrandCatalog.length === 1 ? selectedBrandCatalog[0].brand : "",
          category: selectedBrandCatalog.length === 1 && selectedBrandCatalog[0].categories.length === 1 ? selectedBrandCatalog[0].categories[0] : "",
          unit: "",
        });
      }
      setAdding(false);
      setSelectedProductNames([]);
      setSelectedBrandCatalog([]);
      setPickerHasDraft(false);
      setNotice(selectedProductNames.length
        ? `${selectedProductNames.length} supplied product${selectedProductNames.length === 1 ? "" : "s"} added.`
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
          <h3 className="bc-supplier-detail-title">{supplier?.name || "Supplier details"}</h3>
          <p>Products carried and feedback recorded for this supplier.{supplier?.updatedAt ? ` Supplier record updated ${new Date(supplier.updatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}.` : " Supplier record update time is unavailable."}</p>
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
              <div><h4>Products supplied</h4><p>Manage this supplier’s brands, products, and availability.</p></div>
              <button type="button" className="bc-primary bc-supplier-add-product-button" disabled={busy} onClick={() => { if (adding) { void requestAddClose(); return; } setAdding(true); setSelectedProductNames([]); setSelectedBrandCatalog([]); setPickerHasDraft(false); setEditing(null); setError(""); setNotice(""); }}>
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
                <section
                  ref={addModal}
                  className="bc-product-add-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="bc-product-add-modal-title"
                  onKeyDown={(event) => {
                    if (event.key !== "Escape" || addModal.current?.querySelector('[aria-expanded="true"]')) return;
                    event.preventDefault();
                    event.stopPropagation();
                    void requestAddClose();
                  }}
                >
                  <button type="button" className="bc-product-add-modal-close" aria-label="Close add products" disabled={busy} onClick={() => void requestAddClose()}><X size={19} /></button>
                  <div className="bc-product-modal-scroll-area">
                    <header className="bc-product-add-modal-header">
                      <div><h3 id="bc-product-add-modal-title">Add supplied products</h3><p>Optionally list the brands, categories, and products this supplier carries.</p></div>
                    </header>
                    <form className="bc-supplier-product-add-form" onSubmit={addProduct}>
                      <SupplierCataloguePicker
                        variants={catalogueVariants.filter((variant) => !(supplier.products ?? []).some((product) => product.catalogVariantId === variant.id))}
                        brandOptions={catalogueBrandOptions}
                        selectedProductNames={selectedProductNames}
                        onProductNamesChange={setSelectedProductNames}
                        onBrandCatalogChange={setSelectedBrandCatalog}
                        onDraftStateChange={handlePickerDraftChange}
                      />
                      <div className="bc-supplier-product-form-actions">
                        <button className="bc-primary" disabled={busy || (!selectedProductNames.length && !selectedBrandCatalog.length)}>{selectedProductNames.length ? "Add listed products" : "Save selected brands"}</button>
                        <button className="bc-button btn-orange-outline" type="button" disabled={busy} onClick={() => void requestAddClose()}>Cancel</button>
                      </div>
                    </form>
                  </div>
                </section>
              </div>
            )}
            {!supplier.products.length && <div className="bc-supplier-detail-empty" role="status"><span className="bc-supplier-empty-icon" aria-hidden="true">＋</span><div><strong>No products listed yet</strong><p>Add products from the supplier card to show what they carry.</p></div></div>}
            {supplier.products.map((product) => (
              <article className="bc-supplier-product-card" key={product.id}>
                <div className="bc-supplier-product-copy">
                  <p className="bc-supplier-product-name"><strong>Product name:</strong> {product.productName || "Not specified"}</p>
                  <div className="bc-supplier-product-details">
                    <p><strong>Brand:</strong> {product.brand || "Not specified"}</p>
                    <p><strong>Category:</strong> {product.category || "Not specified"}</p>
                    <p><strong>Unit:</strong> {product.unit || "Not specified"}</p>
                    <p><strong>Status:</strong> <span className={product.isActive ? "is-active" : "is-inactive"}>{product.isActive ? "Active" : "Inactive"}</span></p>
                    <p><strong>Minimum order:</strong> {product.minimumOrderQty == null ? "Not specified" : formatQuantityUnit(product.minimumOrderQty, product.unit)}</p>
                    <p><strong>Last quoted price:</strong> {product.lastQuotedPrice ?? "Not recorded"}{product.lastQuotedPrice != null ? product.lastQuotedPriceAt ? ` · recorded ${new Date(product.lastQuotedPriceAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}` : " · record date unknown" : ""}</p>
                    <p><strong>Available quantity:</strong> {product.availableQuantity == null ? "Not checked" : formatQuantityUnit(product.availableQuantity, product.unit)}{product.availabilityCheckedAt ? ` · checked ${new Date(product.availabilityCheckedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}${Date.now() - Date.parse(product.availabilityCheckedAt) > 30 * 24 * 60 * 60 * 1000 ? " · OUTDATED (over 30 days)" : ""}` : " · Unknown until checked"}</p>
                    <p><strong>Product record updated:</strong> {product.updatedAt ? new Date(product.updatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Not recorded"}</p>
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
              <section
                className="bc-product-add-modal bc-product-edit-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="bc-product-edit-modal-title"
                onKeyDown={(event) => {
                  if (event.key !== "Escape") return;
                  event.preventDefault();
                  event.stopPropagation();
                  void requestEditClose();
                }}
              >
                <button type="button" className="bc-product-add-modal-close" aria-label="Close edit product" disabled={busy} onClick={() => void requestEditClose()}><X size={19} /></button>
                <div className="bc-product-modal-scroll-area">
                  <header className="bc-product-add-modal-header">
                    <div><h3 id="bc-product-edit-modal-title">Edit supplied product</h3><p>{editing.productName} · Update this supplier’s availability and pricing details.</p></div>
                  </header>
                  <form ref={editForm} className="bc-supplier-product-edit-form" key={editing.id} onSubmit={save}>
                    <fieldset disabled={busy} className="bc-fields">
                    <legend className="admin-sr-only">Supplier product details</legend>
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
                    <label className="bc-check">
                      <input name="confirmPrice" type="checkbox" />
                      I confirmed this price is current
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
                    <label className="bc-check">
                      <input name="confirmAvailability" type="checkbox" />
                      I confirmed this available quantity is current
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
                        onClick={() => void requestEditClose()}
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
            <header className="bc-supplier-detail-section-heading"><div><h4>Recent ratings</h4><p>Feedback scores and notes recorded by your team.</p></div></header>
            {!supplier.ratings.length ? (
              <div className="bc-supplier-detail-empty bc-supplier-rating-empty" role="status"><span className="bc-supplier-empty-icon" aria-hidden="true">☆</span><div><strong>No ratings yet</strong><p>Ratings will appear here after one is recorded for this supplier.</p></div></div>
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
