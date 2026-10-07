import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { confirmAdminAction } from "../../components/confirmAdminAction";

type Product = {
  id: string;
  productName: string;
  brand: string;
  category: string;
  unit: string;
  minimumOrderQty: string | null;
  lastQuotedPrice: string | null;
  isActive: boolean;
};
type Supplier = {
  name: string;
  averageRating: number | null;
  products: Product[];
  ratings: {
    id: string;
    comment: string | null;
    createdAt: string;
    priceScore: number;
    deliveryScore: number;
    availabilityScore: number;
    qualityScore: number;
    serviceScore: number;
  }[];
};
type Request = <T>(path: string, method?: string, body?: unknown) => Promise<T>;

export default function SupplierProducts({
  supplierId,
  request,
  onClose,
}: {
  supplierId: string;
  request: Request;
  onClose: () => void;
}) {
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const refresh = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      setSupplier(await request<Supplier>(`/suppliers/${supplierId}`));
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }, [request, supplierId]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
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
          productName: form.get("name"),
          brand: form.get("brand"),
          category: form.get("category"),
          unit: form.get("unit"),
          minimumOrderQty: form.get("minimum")
            ? Number(form.get("minimum"))
            : null,
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
  return (
    <section className="bc-form">
      <h2>{supplier?.name || "Supplier details"}: products & ratings</h2>
      <button
        type="button"
        className="bc-button"
        disabled={busy}
        onClick={onClose}
      >
        Close supplier details
      </button>
      {error && (
        <p role="alert" className="bc-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="bc-success">
          {notice}
        </p>
      )}
      {busy && <p role="status">Loading or saving supplier details…</p>}
      {supplier && (
        <>
          <p>
            Average recorded rating:{" "}
            {supplier.averageRating == null
              ? "No ratings yet"
              : `${supplier.averageRating.toFixed(1)} / 5`}
          </p>
          {!supplier.products.length && (
            <p>No products listed for this supplier.</p>
          )}
          {supplier.products.map((product) => (
            <article className="business-record" key={product.id}>
              <div>
                <strong>
                  {product.productName} · {product.brand || "Brand unspecified"}
                </strong>
                <p>
                  {product.category} · {product.unit} ·{" "}
                  {product.isActive ? "Active" : "Inactive"}
                </p>
                <p>
                  Minimum quantity: {product.minimumOrderQty ?? "Not specified"}{" "}
                  · Last price: {product.lastQuotedPrice ?? "Not recorded"}
                </p>
              </div>
              <button
                type="button"
                className="bc-button"
                disabled={busy}
                onClick={() => setEditing(product)}
              >
                Edit supplied product
              </button>
              <button
                type="button"
                className="bc-button bc-danger"
                disabled={busy}
                onClick={async () => {
                  if (!(await confirmAdminAction({
                    title: "Move this supplier product to Recently deleted?",
                    message: `“${product.productName}” can be restored for 30 days.`,
                    confirmLabel: "Move to recently deleted",
                    tone: "danger",
                  }))) return;
                  setBusy(true);
                  setError("");
                  setNotice("");
                  try {
                    await request(
                      `/suppliers/${supplierId}/products/${product.id}`,
                      "DELETE",
                    );
                    setNotice("Supplier product moved to Recently deleted.");
                    await refresh();
                  } catch (cause) {
                    setError((cause as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Trash2 size={16} /> Delete product
              </button>
            </article>
          ))}
          {editing && (
            <form key={editing.id} onSubmit={save}>
              <h3>Edit {editing.productName}</h3>
              <fieldset disabled={busy} className="bc-fields">
                <label>
                  Supplied product name
                  <input
                    name="name"
                    required
                    maxLength={200}
                    defaultValue={editing.productName}
                  />
                </label>
                <label>
                  Supplied brand
                  <input
                    name="brand"
                    maxLength={100}
                    defaultValue={editing.brand}
                  />
                </label>
                <label>
                  Supplied category
                  <input
                    name="category"
                    required
                    maxLength={100}
                    defaultValue={editing.category}
                  />
                </label>
                <label>
                  Supplied unit
                  <input
                    name="unit"
                    required
                    maxLength={50}
                    defaultValue={editing.unit}
                  />
                </label>
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
                  <input
                    name="active"
                    type="checkbox"
                    defaultChecked={editing.isActive}
                  />{" "}
                  Available for supplier matching
                </label>
              </fieldset>
              <button className="bc-primary" disabled={busy}>
                Save supplied product
              </button>
              <button
                className="bc-button"
                type="button"
                disabled={busy}
                onClick={() => setEditing(null)}
              >
                Cancel product edit
              </button>
            </form>
          )}
          <h3>Recent ratings</h3>
          {supplier.ratings.map((rating) => (
            <p key={rating.id}>
              {new Date(rating.createdAt).toLocaleDateString("en-IN")} · Price{" "}
              {rating.priceScore}/5 · Delivery {rating.deliveryScore}/5 ·
              Availability {rating.availabilityScore}/5 · Quality{" "}
              {rating.qualityScore}/5 · Service {rating.serviceScore}/5
              {rating.comment ? ` · ${rating.comment}` : ""}
            </p>
          ))}
        </>
      )}
    </section>
  );
}
