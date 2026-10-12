import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Search, Trash2, X } from "lucide-react";
import { confirmAdminAction } from "../../components/confirmAdminAction";
import type { FormSubmit, Mutate } from "../business/form-contracts";
import ServiceAreaPincodes from "./ServiceAreaPincodes";
import SupplierCataloguePicker, { type SupplierBrandCatalogEntry, type SupplierCatalogueVariant } from "./SupplierCataloguePicker";
import SupplierProducts from "./SupplierProducts";

export type SupplierRecord = {
  id: string;
  createdAt: string;
  registeredBy?: { name: string } | null;
  name: string;
  legalName?: string | null;
  gstin?: string | null;
  phone: string;
  email?: string | null;
  address: string;
  city: string;
  state?: string | null;
  pincode: string;
  status: "PENDING" | "ACTIVE" | "SUSPENDED";
  _count?: { products: number; ratings?: number };
  ratings?: SupplierRatingRecord[];
  servicePincodes: string[];
  brandCatalog?: SupplierBrandCatalogEntry[];
  notes?: string | null;
  products?: {
    id: string;
    catalogVariantId?: string | null;
    catalogVariant?: {
      id: string;
      label: string;
      listing: { name: string };
    } | null;
    productName: string;
    brand: string;
    category: string;
    unit: string;
    availableQuantity: string | number | null;
    availabilityCheckedAt: string | null;
    isActive: boolean;
  }[];
};

type SupplierRatingRecord = {
  id: string;
  priceScore: number;
  deliveryScore: number;
  availabilityScore: number;
  qualityScore: number;
  serviceScore: number;
  comment?: string | null;
  createdAt: string;
};
type SupplierCreationAuditPage = {
  items: { entityId: string; staff: { name: string } | null }[];
  total: number;
  pageSize: number;
};

type Request = <T>(url: string, method?: string, body?: unknown) => Promise<T>;
type Props = {
  records: SupplierRecord[];
  request: Request;
  busy: boolean;
  mutate: Mutate;
  submitForm: FormSubmit;
};

const field = (data: FormData, key: string) =>
  String(data.get(key) || "").trim();
const catalogueBrandLabel = (brand: string) =>
  brand.trim().toLowerCase() === "supreme (as written on sample quotation)"
    ? "Supreme Industries"
    : brand.trim();
const supplierBrandGroups = (supplier: SupplierRecord) => {
  const groups = new Map<string, { brand: string; categories: Map<string, string>; products: Map<string, string> }>();
  for (const entry of supplier.brandCatalog ?? []) {
    const brand = entry.brand.trim() || "Not specified";
    const key = brand.toLocaleLowerCase();
    const group = groups.get(key) ?? { brand, categories: new Map(), products: new Map() };
    for (const category of entry.categories ?? []) {
      const normalizedCategory = category.trim();
      if (normalizedCategory) group.categories.set(normalizedCategory.toLocaleLowerCase(), normalizedCategory);
    }
    groups.set(key, group);
  }
  for (const product of supplier.products ?? []) {
    const brand = product.brand.trim() || "Not specified";
    const key = brand.toLocaleLowerCase();
    const group = groups.get(key) ?? { brand, categories: new Map(), products: new Map() };
    const category = product.category.trim();
    const productName = product.productName.trim() || product.catalogVariant?.listing.name.trim() || "";
    if (category) group.categories.set(category.toLocaleLowerCase(), category);
    if (productName) group.products.set(productName.toLocaleLowerCase(), productName);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => a.brand.localeCompare(b.brand));
};
export default function SupplierManagement({
  records,
  request,
  busy,
  mutate,
  submitForm,
}: Props) {
  const [view, setView] = useState<"add" | "list" | "edit" | "details">("add");
  const [supplierDetailId, setSupplierDetailId] = useState("");
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [directoryResults, setDirectoryResults] = useState<SupplierRecord[] | null>(null);
  const [directoryBusy, setDirectoryBusy] = useState(false);
  const [directoryError, setDirectoryError] = useState("");
  const [supplierSort, setSupplierSort] = useState<"newest" | "oldest" | "az" | "za" | "most-rated">("newest");
  const [supplierStatusFilter, setSupplierStatusFilter] = useState("all");
  const [supplierDateFilter, setSupplierDateFilter] = useState("all");
  const [supplierRatingFilter, setSupplierRatingFilter] = useState("all");
  const [supplierProductFilter, setSupplierProductFilter] = useState("all");
  const [supplierCityFilter, setSupplierCityFilter] = useState("all");
  const [catalogueVariants, setCatalogueVariants] = useState<SupplierCatalogueVariant[]>([]);
  const [selectedProductVariantIds, setSelectedProductVariantIds] = useState<string[]>([]);
  const [selectedBrandCatalog, setSelectedBrandCatalog] = useState<SupplierBrandCatalogEntry[]>([]);
  const [ratingEditorSupplier, setRatingEditorSupplier] = useState<SupplierRecord | null>(null);
  const [ratingHasChanges, setRatingHasChanges] = useState(false);
  const [confirmRatingClose, setConfirmRatingClose] = useState(false);
  const [ratingDetailsBySupplier, setRatingDetailsBySupplier] = useState<Record<string, SupplierRatingRecord[]>>({});
  const [ratingDetailsLoaded, setRatingDetailsLoaded] = useState<Record<string, boolean>>({});
  const [ratingDetailsLoading, setRatingDetailsLoading] = useState<Record<string, boolean>>({});
  const [ratingDetailsErrors, setRatingDetailsErrors] = useState<Record<string, string>>({});
  const [registeredStaffBySupplier, setRegisteredStaffBySupplier] = useState<Record<string, { name: string } | null>>({});
  const registrationLookupStarted = useRef(new Set<string>());
  const supplierDetailsRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (view !== "details" || !supplierDetailId) return;
    const frame = window.requestAnimationFrame(() => {
      supplierDetailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [supplierDetailId, view]);

  useEffect(() => {
    const supplierIds = records
      .filter((supplier) =>
        !supplier.registeredBy && !registrationLookupStarted.current.has(supplier.id),
      )
      .map((supplier) => supplier.id);
    if (!supplierIds.length) return;
    supplierIds.forEach((id) => registrationLookupStarted.current.add(id));

    let cancelled = false;
    void (async () => {
      const unresolved = new Set(supplierIds);
      const creators: Record<string, { name: string } | null> = {};
      let page = 1;
      let totalPages = 1;
      while (unresolved.size && page <= totalPages) {
        const auditPage = await request<SupplierCreationAuditPage>(
          `/admin/audit?entityType=SUPPLIER&action=SUPPLIER_CREATED&page=${page}`,
        );
        totalPages = Math.ceil(auditPage.total / auditPage.pageSize);
        for (const entry of auditPage.items) {
          if (unresolved.has(entry.entityId)) {
            creators[entry.entityId] = entry.staff;
            unresolved.delete(entry.entityId);
          }
        }
        page += 1;
      }
      for (const id of unresolved) creators[id] = null;
      if (!cancelled) setRegisteredStaffBySupplier((current) => ({ ...current, ...creators }));
    })().catch(() => {
      if (!cancelled)
        setRegisteredStaffBySupplier((current) => ({
          ...current,
          ...Object.fromEntries(supplierIds.map((id) => [id, null])),
        }));
    });
    return () => { cancelled = true; };
  }, [records, request]);

  useEffect(() => {
    void request<{
      name: string;
      brand: string;
      category: string;
      variants: { id: string; label: string; unit: string }[];
    }[]>("/products/catalogue")
      .then((listings) => {
        const variants = listings.flatMap((listing) => listing.variants.map((variant) => ({
          ...variant,
          productName: listing.name,
          brand: listing.brand,
          category: listing.category,
        })));
        setCatalogueVariants(variants);
      })
      .catch(() => setCatalogueVariants([]));
  }, [request]);

  const [editingSupplier, setEditingSupplier] = useState<SupplierRecord | null>(
    null,
  );
  const selectedProducts = catalogueVariants.filter((variant) => selectedProductVariantIds.includes(variant.id));
  const sourceRecords = directoryResults ?? records;
  const supplierCities = [...new Set(sourceRecords.map((supplier) => supplier.city.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const supplierRows = [...sourceRecords]
    .filter((supplier) => supplierStatusFilter === "all" || supplier.status === supplierStatusFilter)
    .filter((supplier) => supplierCityFilter === "all" || supplier.city === supplierCityFilter)
    .filter((supplier) => {
      const age = Date.now() - new Date(supplier.createdAt).getTime();
      if (supplierDateFilter === "7days") return age <= 7 * 24 * 60 * 60 * 1000;
      if (supplierDateFilter === "30days") return age <= 30 * 24 * 60 * 60 * 1000;
      if (supplierDateFilter === "older") return age > 30 * 24 * 60 * 60 * 1000;
      return true;
    })
    .filter((supplier) => supplierRatingFilter === "all" || (supplier._count?.ratings ?? 0) > 0 === (supplierRatingFilter === "rated"))
    .filter((supplier) => supplierProductFilter === "all" || (supplier._count?.products ?? supplier.products?.length ?? 0) > 0 === (supplierProductFilter === "has-products"))
    .sort((a, b) => {
      if (supplierSort === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (supplierSort === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (supplierSort === "az") return a.name.localeCompare(b.name);
      if (supplierSort === "za") return b.name.localeCompare(a.name);
      return (b._count?.ratings ?? 0) - (a._count?.ratings ?? 0) || a.name.localeCompare(b.name);
    });
  const clearSupplierFilters = () => {
    setSupplierStatusFilter("all");
    setSupplierDateFilter("all");
    setSupplierRatingFilter("all");
    setSupplierProductFilter("all");
    setSupplierCityFilter("all");
    setSupplierSort("newest");
  };
  const canSaveSupplier = !busy;
  const loadSupplierRatings = async (supplierId: string) => {
    if (ratingDetailsLoaded[supplierId] || ratingDetailsLoading[supplierId]) return;
    setRatingDetailsLoading((current) => ({ ...current, [supplierId]: true }));
    setRatingDetailsErrors((current) => ({ ...current, [supplierId]: "" }));
    try {
      const detail = await request<{ ratings?: SupplierRatingRecord[] }>(`/suppliers/${supplierId}`);
      setRatingDetailsBySupplier((current) => ({ ...current, [supplierId]: detail.ratings ?? [] }));
      setRatingDetailsLoaded((current) => ({ ...current, [supplierId]: true }));
    } catch (cause) {
      setRatingDetailsErrors((current) => ({
        ...current,
        [supplierId]: cause instanceof Error ? cause.message : "Could not load this supplier's rating.",
      }));
    } finally {
      setRatingDetailsLoading((current) => ({ ...current, [supplierId]: false }));
    }
  };
  const requestRatingClose = () => {
    if (ratingHasChanges) setConfirmRatingClose(true);
    else {
      setRatingEditorSupplier(null);
      setConfirmRatingClose(false);
    }
  };

  useEffect(() => {
    if (!ratingEditorSupplier) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestRatingClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [ratingEditorSupplier, ratingHasChanges]);

  return (
    <>
      {view === "edit" || view === "details" ? (
        <button
          ref={view === "details" ? supplierDetailsRef : undefined}
          type="button"
          className="bc-button btn-orange-outline supplier-page-back"
          onClick={() => {
            setSupplierDetailId("");
            setEditingSupplier(null);
            setView("list");
          }}
        >
          <ArrowLeft size={15} aria-hidden="true" /> Back to registered suppliers
        </button>
      ) : <div className="supplier-management-switch" aria-label="Supplier pages">
        <button
          type="button"
          className={`supplier-page-tab${view === "add" ? " active" : ""}`}
          onClick={() => {
            setSupplierDetailId("");
            setEditingSupplier(null);
            setSelectedProductVariantIds([]);
            setView("add");
          }}
        >
          Add supplier
        </button>
        <button
          type="button"
          className={`supplier-page-tab${view === "list" ? " active" : ""}`}
          onClick={() => { setSupplierDetailId(""); setEditingSupplier(null); setView("list"); }}
        >
          Registered suppliers
        </button>
      </div>}
      {(view === "add" || view === "edit") && (
      <form
        key={editingSupplier?.id || "new-supplier"}
        className="bc-form"
        onSubmit={(e) => {
          void submitForm(
            e,
            (f) => ({
              name: field(f, "name"),
              legalName: field(f, "legalName"),
              gstin: field(f, "gstin"),
              phone: field(f, "phone"),
              email: field(f, "email"),
              address: field(f, "address"),
              city: field(f, "city"),
              state: field(f, "state"),
              pincode: field(f, "pincode"),
              servicePincodes: field(f, "servicePincodes")
                .split(/[ ,]+/)
                .filter(Boolean),
              notes: field(f, "notes"),
              status: field(f, "status"),
              ...(!editingSupplier ? {
                brandCatalog: selectedBrandCatalog,
                products: selectedProducts.map((variant) => ({
                  catalogVariantId: variant.id,
                  productName: variant.productName,
                  brand: catalogueBrandLabel(variant.brand),
                  category: variant.category,
                  unit: variant.unit,
                })),
              } : {}),
            }),
            editingSupplier ? `/suppliers/${editingSupplier.id}` : "/suppliers",
            editingSupplier ? "PATCH" : "POST",
          ).then((saved) => {
            if (saved) { setSupplierDetailId(""); setEditingSupplier(null); setSelectedProductVariantIds([]); setSelectedBrandCatalog([]); setView("list"); }
          });
        }}
      >
        <h2>{editingSupplier ? "Edit supplier" : "Add a supplier"}</h2>
        <fieldset disabled={busy} className="bc-fields">
          <label>
            Company Name
            <input
              name="name"
              required
              minLength={2}
              maxLength={150}
              defaultValue={editingSupplier?.name}
            />
          </label>
          <label>
            Legal name
            <input
              name="legalName"
              maxLength={200}
              defaultValue={editingSupplier?.legalName || ""}
            />
          </label>
          <label>
            GSTIN
            <input
              name="gstin"
              maxLength={15}
              defaultValue={editingSupplier?.gstin || ""}
            />
          </label>
          <label>
            Phone
            <input
              name="phone"
              inputMode="numeric"
              pattern="[6-9][0-9]{9}"
              required
              defaultValue={editingSupplier?.phone}
            />
          </label>
          <label>
            Email
            <input
              name="email"
              type="email"
              defaultValue={editingSupplier?.email || ""}
            />
          </label>
          <label>
            Address
            <input
              name="address"
              required
              minLength={2}
              maxLength={500}
              defaultValue={editingSupplier?.address}
            />
          </label>
          <label>
            City
            <input
              name="city"
              required
              minLength={2}
              maxLength={100}
              defaultValue={editingSupplier?.city}
            />
          </label>
          <label>
            State
            <input
              name="state"
              maxLength={100}
              defaultValue={editingSupplier?.state || "Uttar Pradesh"}
            />
          </label>
          <label>
            PIN code
            <input
              name="pincode"
              pattern="[1-9][0-9]{5}"
              required
              defaultValue={editingSupplier?.pincode}
            />
          </label>
          <label>
            Supplier status
            <select
              name="status"
              defaultValue={editingSupplier?.status || "PENDING"}
            >
              <option value="PENDING">Pending review</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </label>
          <label className="bc-wide">
            Service PIN codes (comma separated)
            <input
              name="servicePincodes"
              placeholder="201301, 201310"
              defaultValue={editingSupplier?.servicePincodes?.join(", ") || ""}
            />
          </label>
          <label className="bc-wide">
            Supplier notes
            <textarea
              name="notes"
              maxLength={5000}
              defaultValue={editingSupplier?.notes || ""}
            />
          </label>
        </fieldset>
        {!editingSupplier && <SupplierCataloguePicker
          variants={catalogueVariants}
          selectedIds={selectedProductVariantIds}
          onChange={setSelectedProductVariantIds}
          onBrandCatalogChange={setSelectedBrandCatalog}
          saveLabel="Save supplier"
        />}
        <div className="bc-form-actions">
          {editingSupplier && (
            <button
              type="button"
              className="bc-button bc-danger bc-edit-delete-supplier"
              disabled={busy}
              onClick={async () => {
                const supplierToDelete = editingSupplier;
                if (!(await confirmAdminAction({
                  title: "Move this supplier to Recently deleted?",
                  message: `“${supplierToDelete.name}” can be restored for 30 days.`,
                  confirmLabel: "Move to recently deleted",
                  tone: "danger",
                }))) return;
                const deleted = await mutate(`/suppliers/${supplierToDelete.id}`, "DELETE", undefined);
                if (deleted) {
                  setSupplierDetailId("");
                  setEditingSupplier(null);
                  setDirectoryResults(null);
                  setDirectoryQuery("");
                  setView("list");
                }
              }}
            >
              <Trash2 size={16} /> Delete supplier
            </button>
          )}
          <button className="bc-primary" disabled={!canSaveSupplier}>
            {editingSupplier ? "Save supplier changes" : "Save supplier"}
          </button>
          {editingSupplier && (
            <button
              type="button"
            className="bc-button btn-orange-outline"
            disabled={busy}
            onClick={() => { setSupplierDetailId(""); setEditingSupplier(null); setSelectedProductVariantIds([]); setView("list"); }}
            >
              Cancel supplier edit
            </button>
          )}
        </div>
      </form>
      )}
      {view === "details" && supplierDetailId && (
        <div className="bc-supplier-details-anchor">
          <SupplierProducts
            key={supplierDetailId}
            supplierId={supplierDetailId}
            request={request}
          />
        </div>
      )}
      {view === "list" && (
      <>
      <h2>Registered suppliers</h2>
      <form
        className="bc-supplier-search"
        onSubmit={async (event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          setDirectoryBusy(true);
          setDirectoryError("");
          try {
            const query = directoryQuery.trim();
            const result = await request<SupplierRecord[]>(
              `/suppliers${query ? `?q=${encodeURIComponent(query)}` : ""}`,
            );
            setDirectoryResults(result);
          } catch (cause) {
            setDirectoryError(cause instanceof Error ? cause.message : "Supplier search failed.");
          } finally {
            setDirectoryBusy(false);
          }
        }}
      >
        <label className="bc-supplier-search-field">
          <Search size={19} aria-hidden="true" />
          <input
            type="search"
            aria-label="Search registered suppliers"
            placeholder="Supplier, product, brand, category…"
            value={directoryQuery}
            onChange={(event) => setDirectoryQuery(event.currentTarget.value)}
          />
          {directoryResults && (
            <button
              type="button"
              className="bc-supplier-search-clear"
              aria-label="Clear supplier search"
              title="Clear search"
              onClick={() => {
                setDirectoryQuery("");
                setDirectoryResults(null);
              }}
            >
              <X size={17} aria-hidden="true" />
            </button>
          )}
        </label>
        <button className="bc-button bc-supplier-search-submit" disabled={directoryBusy}>
          {directoryBusy ? "Searching…" : "Search suppliers"}
        </button>
      </form>
      {directoryError && <p role="alert" className="bc-error">{directoryError}</p>}
      <div className="bc-supplier-directory-toolbar">
        <div className="bc-supplier-filter-grid" aria-label="Filter registered suppliers">
          <label>Sort by
            <select aria-label="Sort suppliers" value={supplierSort} onChange={(event) => setSupplierSort(event.currentTarget.value as typeof supplierSort)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="az">Name: A to Z</option>
              <option value="za">Name: Z to A</option>
              <option value="most-rated">Most rated</option>
            </select>
          </label>
          <label>Status
            <select aria-label="Filter suppliers by status" value={supplierStatusFilter} onChange={(event) => setSupplierStatusFilter(event.currentTarget.value)}>
              <option value="all">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending review</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </label>
          <label>Registered
            <select aria-label="Filter suppliers by registration date" value={supplierDateFilter} onChange={(event) => setSupplierDateFilter(event.currentTarget.value)}>
              <option value="all">Any time</option>
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="older">Over 30 days ago</option>
            </select>
          </label>
          <label>Ratings
            <select aria-label="Filter suppliers by ratings" value={supplierRatingFilter} onChange={(event) => setSupplierRatingFilter(event.currentTarget.value)}>
              <option value="all">Any ratings</option>
              <option value="rated">Has ratings</option>
              <option value="unrated">No ratings yet</option>
            </select>
          </label>
          <label>Products
            <select aria-label="Filter suppliers by products" value={supplierProductFilter} onChange={(event) => setSupplierProductFilter(event.currentTarget.value)}>
              <option value="all">Any products</option>
              <option value="has-products">Products listed</option>
              <option value="no-products">No products listed</option>
            </select>
          </label>
          <label>City
            <select aria-label="Filter suppliers by city" value={supplierCityFilter} onChange={(event) => setSupplierCityFilter(event.currentTarget.value)}>
              <option value="all">All cities</option>
              {supplierCities.map((city) => <option key={city} value={city}>{city}</option>)}
            </select>
          </label>
        </div>
        <button type="button" className="bc-supplier-filter-reset" onClick={clearSupplierFilters}>Reset filters</button>
      </div>
      {(directoryResults || records.length > 0) && supplierRows.length > 0 && (
        <p className="bc-supplier-search-summary" role="status">
          Showing {supplierRows.length} {supplierRows.length === 1 ? "supplier" : "suppliers"}
          {directoryQuery.trim() ? <> for <strong>“{directoryQuery.trim()}”</strong></> : null}
        </p>
      )}
      {supplierRows.length === 0 && (
        <div className="bc-supplier-search-empty" role="status">
          <strong>{sourceRecords.length ? "No suppliers match these filters" : "No suppliers found"}</strong>
          <span>{sourceRecords.length ? "Try changing a filter or reset them to see all registered suppliers." : "Try a supplier name, product, brand, category, or location."}</span>
        </div>
      )}
      {supplierRows.map((s) => {
        const latestRating = ratingDetailsLoaded[s.id]
          ? ratingDetailsBySupplier[s.id]?.[0]
          : s.ratings?.[0];
        const registeredBy = s.registeredBy ?? registeredStaffBySupplier[s.id];
        return (
        <article className="business-record bc-record-block" key={s.id}>
          <div>
            <strong>{s.name.toUpperCase()}</strong>
            <p>
              {[s.city, s.state, s.pincode].filter(Boolean).join(" · ")}
            </p>
            <div className="bc-supplier-record-meta">
              <span className={`bc-supplier-status is-${s.status.toLowerCase()}`}>{s.status}</span>
              <span className="bc-supplier-created">
                Registered{registeredBy?.name ? ` by ${registeredBy.name}` : ""} · On {new Date(s.createdAt).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
            <div className="bc-supplier-card-details">
              <div>
                <span>Legal name</span>
                <strong>{s.legalName?.trim() || "Not provided"}</strong>
              </div>
              <div>
                <span>Phone number</span>
                <strong>{s.phone || "Not provided"}</strong>
              </div>
              <div>
                <span>GSTIN</span>
                <strong>{s.gstin?.trim() || "Not provided"}</strong>
              </div>
              <div>
                <span>Address</span>
                <strong>{[s.address, s.city, s.state, s.pincode].filter(Boolean).join(", ") || "Not provided"}</strong>
              </div>
              <div>
                <span>Service area</span>
                <ServiceAreaPincodes pincodes={s.servicePincodes} className="bc-service-area-list" />
              </div>
            </div>
          </div>
          <div className="bc-supplier-record-actions">
            <button
              className="bc-button btn-orange-outline"
              disabled={busy}
              onClick={() => {
              setSupplierDetailId("");
                setEditingSupplier(s);
                setView("edit");
              }}
            >
              Edit supplier
            </button>
            {s.status !== "ACTIVE" && (
              <button
                className="bc-button btn-orange-outline"
                onClick={() =>
                  void mutate(`/suppliers/${s.id}`, "PATCH", {
                    status: "ACTIVE",
                  })
                }
              >
                Activate supplier
              </button>
            )}
          </div>
          <details className="supplier-quick-actions bc-supplier-brands-accordion">
            <summary>Brands &amp; Products</summary>
            {supplierBrandGroups(s).length ? (
              <div className="bc-supplier-brand-groups">
                {supplierBrandGroups(s).map((group) => (
                  <section className="bc-supplier-brand-card" key={group.brand.toLocaleLowerCase()}>
                    <p><strong>Brands Name:</strong> {group.brand}</p>
                    <p><strong>Categories:</strong> {group.categories.size ? [...group.categories.values()].join(", ") : "Not specified"}</p>
                    <p><strong>Products:</strong> {group.products.size ? [...group.products.values()].join(", ") : "Not specified"}</p>
                  </section>
                ))}
              </div>
            ) : (
              <p className="bc-supplier-brands-empty">No brands or products specified.</p>
            )}
          </details>
          <button
            className="bc-button btn-orange-outline bc-supplier-view-details"
            disabled={busy}
            onClick={() => {
              setEditingSupplier(null);
              setSupplierDetailId(s.id);
              setView("details");
            }}
          >
            View supplier products & ratings
          </button>
          <details className="supplier-quick-actions" onToggle={(event) => { if (event.currentTarget.open) void loadSupplierRatings(s.id); }}>
          <summary>Supplier ratings &amp; feedback</summary>
          {ratingDetailsLoading[s.id] ? (
            <div className="bc-rating-readonly" role="status">Loading saved rating…</div>
          ) : ratingDetailsErrors[s.id] ? (
            <div className="bc-rating-readonly bc-rating-readonly-empty" role="alert">
              <span>{ratingDetailsErrors[s.id]}</span>
              <button type="button" className="bc-button btn-orange-outline" onClick={() => void loadSupplierRatings(s.id)}>Try again</button>
            </div>
          ) : latestRating ? (
            <div className="bc-rating-readonly">
              <div className="bc-rating-readonly-heading">
                <div>
                  <strong>Supplier rating score: {Math.round(((latestRating.priceScore + latestRating.deliveryScore + latestRating.availabilityScore + latestRating.qualityScore + latestRating.serviceScore) / 25) * 100)}%</strong>
                  <time dateTime={latestRating.createdAt}>Recorded {new Date(latestRating.createdAt).toLocaleString()}</time>
                </div>
                <button type="button" className="bc-button btn-orange-outline" onClick={() => { setRatingEditorSupplier({ ...s, ratings: [latestRating] }); setRatingHasChanges(false); setConfirmRatingClose(false); }}>Edit rating</button>
              </div>
              <dl className="bc-rating-score-list">
                <div><dt>Price</dt><dd>{latestRating.priceScore}/5</dd></div>
                <div><dt>Delivery</dt><dd>{latestRating.deliveryScore}/5</dd></div>
                <div><dt>Availability</dt><dd>{latestRating.availabilityScore}/5</dd></div>
                <div><dt>Quality</dt><dd>{latestRating.qualityScore}/5</dd></div>
                <div><dt>Service</dt><dd>{latestRating.serviceScore}/5</dd></div>
              </dl>
              <div className="bc-rating-readonly-note"><strong>Note</strong><p>{latestRating.comment?.trim() || "No note added."}</p></div>
            </div>
          ) : (
            <div className="bc-rating-readonly bc-rating-readonly-empty">
              <span>{ratingDetailsLoaded[s.id] ? "No rating recorded yet." : "Checking for saved ratings…"}</span>
              {ratingDetailsLoaded[s.id] && <button type="button" className="bc-button btn-orange-outline" onClick={() => { setRatingEditorSupplier({ ...s, ratings: [] }); setRatingHasChanges(false); setConfirmRatingClose(false); }}>Record rating</button>}
            </div>
          )}
          </details>
        </article>
      ); })}
      </>
      )}
      {ratingEditorSupplier && (() => {
        const rating = ratingEditorSupplier.ratings?.[0];
        const saveRating = async (event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          const body = {
            priceScore: Number(data.get("priceScore")),
            deliveryScore: Number(data.get("deliveryScore")),
            availabilityScore: Number(data.get("availabilityScore")),
            qualityScore: Number(data.get("qualityScore")),
            serviceScore: Number(data.get("serviceScore")),
            comment: field(data, "comment") || undefined,
          };
          const url = rating
            ? `/suppliers/${ratingEditorSupplier.id}/ratings/${rating.id}`
            : `/suppliers/${ratingEditorSupplier.id}/ratings`;
          const saved = await mutate(url, rating ? "PATCH" : "POST", body);
          if (saved) {
            try {
              const detail = await request<{ ratings?: SupplierRatingRecord[] }>(`/suppliers/${ratingEditorSupplier.id}`);
              setRatingDetailsBySupplier((current) => ({ ...current, [ratingEditorSupplier.id]: detail.ratings ?? [] }));
              setRatingDetailsLoaded((current) => ({ ...current, [ratingEditorSupplier.id]: true }));
              setRatingDetailsErrors((current) => ({ ...current, [ratingEditorSupplier.id]: "" }));
            } catch {
              setRatingDetailsLoaded((current) => ({ ...current, [ratingEditorSupplier.id]: false }));
            }
            setRatingEditorSupplier(null);
            setRatingHasChanges(false);
            setConfirmRatingClose(false);
          }
        };
        return (
          <div className="supplier-rating-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) requestRatingClose(); }}>
            <form
              key={`${ratingEditorSupplier.id}-${rating?.id ?? "new"}`}
              className="supplier-rating-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="supplier-rating-modal-title"
              onSubmit={(event) => void saveRating(event)}
              onChange={() => setRatingHasChanges(true)}
              onReset={() => setRatingHasChanges(false)}
            >
              <header className="supplier-rating-modal-header">
                <div>
                  <span>SUPPLIER RATING</span>
                  <h2 id="supplier-rating-modal-title">{rating ? "Edit supplier rating" : "Record supplier rating"}</h2>
                  <p>{ratingEditorSupplier.name}</p>
                </div>
                <button type="button" className="bc-button supplier-rating-close" aria-label="Close rating editor" onClick={requestRatingClose}><X size={17} /></button>
              </header>
              <div className="supplier-rating-modal-body">
                <div className="supplier-rating-score-grid">
                  {(["Price", "Delivery", "Availability", "Quality", "Service"] as const).map((label) => {
                    const key = `${label.toLowerCase()}Score` as "priceScore" | "deliveryScore" | "availabilityScore" | "qualityScore" | "serviceScore";
                    return <label className="bc-rating-field" key={key}>{label}<input required name={key} type="number" min="1" max="5" defaultValue={rating?.[key] ?? ""} placeholder="1–5" aria-label={`${label} rating 1 to 5`} /></label>;
                  })}
                </div>
                <label className="supplier-rating-note">Rating notes (optional)<textarea name="comment" rows={3} defaultValue={rating?.comment ?? ""} placeholder="Add a note about this rating" /></label>
                <p className="supplier-rating-reset-help">Enter a score from 1 to 5 for each category. Reset restores saved scores or clears a new rating.</p>
              </div>
              <footer className="supplier-rating-modal-actions">
                <button type="reset" className="bc-button" disabled={busy}>Reset scores</button>
                <div>
                  <button type="button" className="bc-button" disabled={busy} onClick={requestRatingClose}>Close</button>
                  <button type="submit" className="bc-primary" disabled={busy}>{busy ? "Saving…" : "Save rating"}</button>
                </div>
              </footer>
              {confirmRatingClose && (
                <div className="supplier-rating-confirm-overlay">
                  <section className="supplier-rating-confirm" role="alertdialog" aria-modal="true" aria-labelledby="supplier-rating-confirm-title" aria-describedby="supplier-rating-confirm-description">
                    <h3 id="supplier-rating-confirm-title">Close without saving?</h3>
                    <p id="supplier-rating-confirm-description">Your rating changes haven’t been saved. Closing now will discard them.</p>
                    <div>
                      <button type="button" className="bc-button" onClick={() => setConfirmRatingClose(false)}>Keep editing</button>
                      <button type="button" className="bc-primary" onClick={() => { setRatingEditorSupplier(null); setRatingHasChanges(false); setConfirmRatingClose(false); }}>Close without saving</button>
                    </div>
                  </section>
                </div>
              )}
            </form>
          </div>
        );
      })()}
    </>
  );
}
