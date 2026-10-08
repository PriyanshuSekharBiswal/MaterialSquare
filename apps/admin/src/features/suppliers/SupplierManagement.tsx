import { useEffect, useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { confirmAdminAction } from "../../components/confirmAdminAction";
import type { FormSubmit, Mutate } from "../business/form-contracts";
import SupplierProducts from "./SupplierProducts";

export type SupplierRecord = {
  id: string;
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
  servicePincodes: string[];
  notes?: string | null;
  _count?: { products: number };
  products?: {
    id: string;
    catalogVariant?: {
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
type CatalogueVariantOption = {
  id: string;
  label: string;
  unit: string;
  productName: string;
  brand: string;
  category: string;
};

export default function SupplierManagement({
  records,
  request,
  busy,
  mutate,
  submitForm,
}: Props) {
  const [supplierDetailId, setSupplierDetailId] = useState("");
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [directoryResults, setDirectoryResults] = useState<SupplierRecord[] | null>(null);
  const [directoryBusy, setDirectoryBusy] = useState(false);
  const [directoryError, setDirectoryError] = useState("");
  const [catalogueVariants, setCatalogueVariants] = useState<CatalogueVariantOption[]>([]);

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
  const [editingSupplier, setEditingSupplier] = useState<SupplierRecord | null>(
    null,
  );

  return (
    <>
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
            }),
            editingSupplier ? `/suppliers/${editingSupplier.id}` : "/suppliers",
            editingSupplier ? "PATCH" : "POST",
          ).then((saved) => {
            if (saved) setEditingSupplier(null);
          });
        }}
      >
        <h2>{editingSupplier ? "Edit supplier" : "Add a supplier"}</h2>
        <fieldset disabled={busy} className="bc-fields">
          <label>
            Name
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
        <button className="bc-primary" disabled={busy}>
          {editingSupplier ? "Save supplier changes" : "Save supplier"}
        </button>
        {editingSupplier && (
          <button
            type="button"
            className="bc-button"
            disabled={busy}
            onClick={() => setEditingSupplier(null)}
          >
            Cancel supplier edit
          </button>
        )}
      </form>
      {supplierDetailId && (
        <SupplierProducts
          key={supplierDetailId}
          supplierId={supplierDetailId}
          request={request}
          onClose={() => setSupplierDetailId("")}
        />
      )}
      <h2>Registered suppliers</h2>
      <form
        className="bc-inline-form"
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
        <input
          aria-label="Search suppliers and products"
          placeholder="Search product, brand, category, supplier or location"
          value={directoryQuery}
          onChange={(event) => setDirectoryQuery(event.currentTarget.value)}
        />
        <button className="bc-button" disabled={directoryBusy}>
          {directoryBusy ? "Searching…" : "Search suppliers"}
        </button>
        {directoryResults && (
          <button
            type="button"
            className="bc-button"
            onClick={() => {
              setDirectoryQuery("");
              setDirectoryResults(null);
            }}
          >
            Clear search
          </button>
        )}
      </form>
      {directoryError && <p role="alert" className="bc-error">{directoryError}</p>}
      {(directoryResults ?? records).map((s) => (
        <article className="business-record bc-record-block" key={s.id}>
          <div>
            <strong>{s.name}</strong>
            <p>
              {s.city} · {s.pincode} · {s._count?.products ?? 0} listed products
            </p>
            <small>{s.status}</small>
            {!!s.products?.length && (
              <ul>
                {s.products.slice(0, 5).map((product) => (
                  <li key={product.id}>
                    {product.productName} · {product.brand || "Brand unspecified"} · {product.category} · {product.unit} · Available: {product.availableQuantity ?? "Not checked"}
                    {product.availabilityCheckedAt
                      ? ` · checked ${new Date(product.availabilityCheckedAt).toLocaleDateString("en-IN")}`
                      : ""}
                    {product.catalogVariant
                      ? ` · linked to ${product.catalogVariant.listing.name} / ${product.catalogVariant.label}`
                      : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            className="bc-button"
            disabled={busy}
            onClick={() => setEditingSupplier(s)}
          >
            Edit supplier
          </button>
          <button
            className="bc-button bc-danger"
            disabled={busy}
            onClick={async () => {
              if (!(await confirmAdminAction({
                title: "Move this supplier to Recently deleted?",
                message: `“${s.name}” can be restored for 30 days.`,
                confirmLabel: "Move to recently deleted",
                tone: "danger",
              }))) return;
              void mutate(`/suppliers/${s.id}`, "DELETE", undefined);
            }}
          >
            <Trash2 size={16} /> Delete supplier
          </button>
          <button
            className="bc-button"
            disabled={busy}
            onClick={() => setSupplierDetailId(s.id)}
          >
            View supplier products & ratings
          </button>
          {s.status !== "ACTIVE" && (
            <button
              className="bc-button"
              onClick={() =>
                void mutate(`/suppliers/${s.id}`, "PATCH", {
                  status: "ACTIVE",
                })
              }
            >
              Activate supplier
            </button>
          )}
          <form
            className="bc-inline-form"
            onSubmit={(e) =>
              submitForm(
                e,
                (f) => ({
                  catalogVariantId: field(f, "catalogVariantId") || null,
                  productName: field(f, "product"),
                  brand: field(f, "brand"),
                  category: field(f, "category"),
                  unit: field(f, "unit"),
                  minimumOrderQty: f.get("minimum")
                    ? Number(f.get("minimum"))
                    : undefined,
                  lastQuotedPrice: f.get("price")
                    ? Number(f.get("price"))
                    : undefined,
                  availableQuantity: f.get("availableQuantity")
                    ? Number(f.get("availableQuantity"))
                    : f.get("availableQuantity") === "0"
                      ? 0
                      : null,
                }),
                `/suppliers/${s.id}/products`,
              )
            }
          >
            <select
              name="catalogVariantId"
              defaultValue=""
              onChange={(event) => {
                const selected = catalogueVariants.find(
                  (variant) => variant.id === event.currentTarget.value,
                );
                const form = event.currentTarget.form;
                if (!selected || !form) return;
                const setField = (name: string, value: string) => {
                  const field = form.elements.namedItem(name);
                  if (field instanceof HTMLInputElement) field.value = value;
                };
                setField("product", selected.productName);
                setField("brand", selected.brand);
                setField("category", selected.category);
                setField("unit", selected.unit);
              }}
            >
              <option value="">Link to client catalogue pack (optional)</option>
              {catalogueVariants.map((variant) => (
                <option value={variant.id} key={variant.id}>
                  {variant.productName} · {variant.brand} · {variant.label}
                </option>
              ))}
            </select>
            <input name="product" placeholder="Product supplied" required />
            <input name="brand" placeholder="Brand" />
            <input name="category" placeholder="Category" required />
            <input
              name="unit"
              placeholder="Unit"
              defaultValue="unit"
              required
            />
            <input
              name="minimum"
              type="number"
              min="0"
              step="0.001"
              placeholder="Min qty"
            />
            <input
              name="price"
              type="number"
              min="0"
              step="0.01"
              placeholder="Last quote ₹"
            />
            <input
              name="availableQuantity"
              type="number"
              min="0"
              step="0.001"
              placeholder="Available quantity"
              aria-label={`Available quantity from ${s.name}`}
            />
            <button className="bc-button">Add product</button>
          </form>
          <form
            className="bc-inline-form"
            onSubmit={(e) =>
              submitForm(
                e,
                (f) => ({
                  priceScore: Number(f.get("priceScore")),
                  deliveryScore: Number(f.get("deliveryScore")),
                  availabilityScore: Number(f.get("availabilityScore")),
                  qualityScore: Number(f.get("qualityScore")),
                  serviceScore: Number(f.get("serviceScore")),
                  comment: field(f, "comment") || undefined,
                }),
                `/suppliers/${s.id}/ratings`,
              )
            }
          >
            <input
              name="priceScore"
              type="number"
              min="1"
              max="5"
              defaultValue="5"
              aria-label="Price rating 1 to 5"
            />
            <input
              name="deliveryScore"
              type="number"
              min="1"
              max="5"
              defaultValue="5"
              aria-label="Delivery rating 1 to 5"
            />
            <input
              name="availabilityScore"
              type="number"
              min="1"
              max="5"
              defaultValue="5"
              aria-label="Availability rating 1 to 5"
            />
            <input
              name="qualityScore"
              type="number"
              min="1"
              max="5"
              defaultValue="5"
              aria-label="Quality rating 1 to 5"
            />
            <input
              name="serviceScore"
              type="number"
              min="1"
              max="5"
              defaultValue="5"
              aria-label="Service rating 1 to 5"
            />
            <input name="comment" placeholder="Rating notes" />
            <button className="bc-button">Record supplier rating</button>
          </form>
        </article>
      ))}
    </>
  );
}
