import { useState, type FormEvent } from "react";
export type RevisablePurchaseOrder = {
  id: string;
  revisionNumber: number;
  updatedAt: string;
  shippingAddress: string;
  shippingContact: string;
  subtotal: string;
  taxAmount: string;
  freightAmount: string;
  notes: string | null;
  items?: { productName: string; quantity: number; unit: string }[];
  revisionHistory: {
    revisionNumber: number;
    reason: string;
    revisedAt: string;
    totalAmount: string;
    status: string;
  }[];
};
export default function PurchaseOrderRevision({
  order,
  busy,
  mutate,
}: {
  order: RevisablePurchaseOrder;
  busy: boolean;
  mutate: (path: string, method: string, body: unknown) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (
      await mutate(`/purchase-orders/${order.id}/revisions`, "POST", {
        expectedUpdatedAt: order.updatedAt,
        shippingAddress: form.get("address"),
        shippingContact: form.get("contact"),
        subtotal: Number(form.get("subtotal")),
        taxAmount: Number(form.get("tax")),
        freightAmount: Number(form.get("freight")),
        reason: form.get("reason"),
        notes: form.get("notes") || undefined,
      })
    )
      setEditing(false);
  }
  return (
    <div>
      <button
        className="bc-button"
        disabled={busy}
        onClick={() => setEditing((current) => !current)}
      >
        {editing ? "Cancel PO revision" : "Revise PO"}
      </button>
      {editing && (
        <form className="bc-form" onSubmit={(event) => void save(event)}>
          <h4>Revise purchase order</h4>
          <p>
            The previous terms are retained in history. This revision requires
            approval before it can be sent. Confirm any change with the
            supplier.
          </p>
          <div className="bc-fields">
            <label>
              Revised shipping address
              <input
                name="address"
                required
                minLength={2}
                maxLength={500}
                defaultValue={order.shippingAddress}
              />
            </label>
            <label>
              Revised shipping contact
              <input
                name="contact"
                required
                minLength={10}
                maxLength={100}
                defaultValue={order.shippingContact}
              />
            </label>
            <label>
              Revised subtotal (₹)
              <input
                name="subtotal"
                type="number"
                required
                min="0"
                max="999999999"
                step="0.01"
                defaultValue={order.subtotal}
              />
            </label>
            <label>
              Revised tax (₹)
              <input
                name="tax"
                type="number"
                required
                min="0"
                max="999999999"
                step="0.01"
                defaultValue={order.taxAmount}
              />
            </label>
            <label>
              Revised freight (₹)
              <input
                name="freight"
                type="number"
                required
                min="0"
                max="999999999"
                step="0.01"
                defaultValue={order.freightAmount}
              />
            </label>
            <label>
              Revision reason
              <textarea name="reason" required minLength={5} maxLength={2000} />
            </label>
            <label>
              Revised PO notes
              <textarea
                name="notes"
                maxLength={5000}
                defaultValue={order.notes || ""}
              />
            </label>
          </div>
          <button className="bc-primary" disabled={busy}>
            Save PO revision
          </button>
        </form>
      )}
      {!!order.revisionHistory?.length && (
        <details>
          <summary>PO revision history</summary>
          {order.revisionHistory.map((version) => (
            <p key={version.revisionNumber}>
              Revision {version.revisionNumber} · {version.status} · ₹
              {Number(version.totalAmount).toLocaleString("en-IN")} ·{" "}
              {version.reason} ·{" "}
              {new Date(version.revisedAt).toLocaleString("en-IN")}
            </p>
          ))}
        </details>
      )}
    </div>
  );
}
