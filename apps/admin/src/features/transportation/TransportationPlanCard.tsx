import { useState, type FormEvent } from "react";
import {
  TRANSPORTATION_TRANSITIONS,
  type TransportationStatus,
} from "@material-square/types";
import { formatQuantityUnit } from "../../quantity-format";
import { formatEnumLabel } from "../../utils/formatEnumLabel";
export type TransportationPlan = {
  id: string;
  orderId: string;
  order?: {
    orderNumber: string;
    status: string;
    items: {
      id: string;
      productName: string;
      quantityMt: string;
      unit: string;
      deliveries: { quantity: string }[];
    }[];
  };
  status: string;
  destination: string;
  recipientName: string | null;
  recipientPhone: string | null;
  transporter: string | null;
  vehicleNumber: string | null;
  driverName: string | null;
  driverPhone: string | null;
  currentLocation: string | null;
  estimatedArrival: string | null;
  notes: string | null;
  createdAt: string;
  createdBy?: string | null;
};

function localDateTimeValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}
export default function TransportationPlanCard({
  plan,
  busy,
  mutate,
  openForEdit = false,
  onOpenForEdit,
}: {
  plan: TransportationPlan;
  busy: boolean;
  mutate: (path: string, method: string, body: unknown) => Promise<boolean>;
  openForEdit?: boolean;
  onOpenForEdit?: () => void;
}) {
  const [editing, setEditing] = useState(openForEdit);
  const [deliveryError, setDeliveryError] = useState("");
  const allowed = (
    TRANSPORTATION_TRANSITIONS[plan.status as TransportationStatus] || []
  ).filter((status) => status !== "PARTIALLY_DELIVERED");
  const orderItems = plan.order?.items || [];
  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    if (
      await mutate(`/transportation/${plan.orderId}`, "PUT", {
        status: values.get("status"),
        recipientName: values.get("recipientName") || null,
        recipientPhone: values.get("recipientPhone") || null,
        transporter: values.get("transporter") || null,
        vehicleNumber: values.get("vehicleNumber") || null,
        driverName: values.get("driverName") || null,
        driverPhone: values.get("driverPhone") || null,
        estimatedArrival: values.get("estimatedArrival")
          ? new Date(String(values.get("estimatedArrival"))).toISOString()
          : null,
        currentLocation: values.get("location") || null,
        notes: values.get("notes") || null,
      })
    )
      setEditing(false);
  }
  async function recordDelivery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDeliveryError("");
    const form = event.currentTarget;
    const values = new FormData(form);
    const items = orderItems
      .map((item) => ({
        orderItemId: item.id,
        quantity: Number(values.get(`quantity-${item.id}`) || 0),
      }))
      .filter((item) => item.quantity > 0);
    if (!items.length) {
      setDeliveryError("Enter a delivered quantity for at least one material.");
      return;
    }
    if (
      await mutate(`/transportation/${plan.orderId}/deliveries`, "POST", {
        items,
        notes: values.get("deliveryNotes") || undefined,
      })
    ) {
      form.reset();
    }
  }
  const canRecordDelivery = [
    "OUT_FOR_DELIVERY",
    "DELAYED",
    "PARTIALLY_DELIVERED",
  ].includes(plan.status);
  const destinationParts = plan.destination.split(";");
  const destinationContext =
    destinationParts.length > 1 ? destinationParts.shift()?.trim() : undefined;
  const destinationAddress = destinationParts.join(";").trim();
  return (
    <article className="business-record bc-record-block bc-transport-plan">
      <div className="bc-transport-plan-heading">
        <h3>{plan.order?.orderNumber || plan.orderId}</h3>
        <div className="bc-transport-plan-actions">
          {!!allowed.length && (
            <button
              className="bc-button bc-transport-status-toggle"
              disabled={busy}
              onClick={() => {
                if (!editing && onOpenForEdit) {
                  onOpenForEdit();
                  return;
                }
                setEditing((current) => !current);
              }}
            >
              {editing ? "Cancel delivery update" : "Update delivery status"}
            </button>
          )}
        </div>
      </div>
      <section className="bc-transport-plan-summary" aria-label="Delivery summary">
        <div className="bc-transport-destination">
          {destinationContext && (
            <p className="bc-transport-destination-context">{destinationContext}</p>
          )}
          <span className="bc-transport-detail-label">Delivery address</span>
          <p>{destinationAddress || plan.destination}</p>
          <div className="bc-transport-recipient">
            <div>
              <span className="bc-transport-detail-label">Recipient name</span>
              <p>{plan.recipientName || "Not provided"}</p>
            </div>
            <div>
              <span className="bc-transport-detail-label">Recipient number</span>
              <p>{plan.recipientPhone || "Not provided"}</p>
            </div>
          </div>
        </div>
        <dl className="bc-transport-meta">
          <div>
            <dt>Vehicle</dt>
            <dd>{plan.vehicleNumber || "Pending"}</dd>
          </div>
          <div>
            <dt>Delivery status</dt>
            <dd className={`bc-transport-status bc-transport-status-${plan.status.toLowerCase()}`}>
              {formatEnumLabel(plan.status)}
            </dd>
          </div>
          <div>
            <dt>Driver</dt>
            <dd>{plan.driverName || "Pending"}</dd>
          </div>
          <div>
            <dt>Estimated arrival</dt>
            <dd>
              {plan.estimatedArrival
                ? new Date(plan.estimatedArrival).toLocaleString("en-IN")
                : "Not set"}
            </dd>
          </div>
        </dl>
      </section>
      {plan.currentLocation && <p>Current location: {plan.currentLocation}</p>}
      {plan.notes && <p>{plan.notes}</p>}
      {orderItems.map((item) => {
        const delivered = item.deliveries.reduce(
          (total, delivery) => total + Number(delivery.quantity),
          0,
        );
        return (
          <p key={item.id}>
            {item.productName}: {formatQuantityUnit(delivered, item.unit)} /{" "}
            {formatQuantityUnit(item.quantityMt, item.unit)} delivered
          </p>
        );
      })}
      {canRecordDelivery && !!orderItems.length && (
        <form
          className="bc-form"
          onSubmit={(event) => void recordDelivery(event)}
        >
          <h4>Record received materials</h4>
          <p>
            Enter only the quantities delivered on this trip. The system tracks
            remaining quantities across deliveries.
          </p>
          {deliveryError && <p role="alert">{deliveryError}</p>}
          <div className="bc-fields">
            {orderItems.map((item) => {
              const delivered = item.deliveries.reduce(
                (total, delivery) => total + Number(delivery.quantity),
                0,
              );
              const remaining = Math.max(
                0,
                Number(item.quantityMt) - delivered,
              );
              if (remaining <= 0) return null;
              return (
                <label key={item.id}>
                  {item.productName} · {remaining.toLocaleString("en-IN")}{" "}
                  {item.unit} remaining
                  <input
                    name={`quantity-${item.id}`}
                    type="number"
                    min="0"
                    max={remaining}
                    step="0.001"
                    defaultValue="0"
                  />
                </label>
              );
            })}
            <label>
              Delivery note (optional)
              <textarea name="deliveryNotes" maxLength={3000} />
            </label>
          </div>
          <button className="bc-primary" disabled={busy}>
            Save delivered quantities
          </button>
        </form>
      )}
      {editing && (
        <form className="bc-fields" onSubmit={(event) => void update(event)}>
          <label>
            Recipient name
            <input
              name="recipientName"
              maxLength={150}
              placeholder="e.g. site contact name"
              defaultValue={plan.recipientName || ""}
            />
          </label>
          <label>
            Recipient number
            <input
              name="recipientPhone"
              type="tel"
              inputMode="tel"
              maxLength={30}
              placeholder="e.g. +91 98765 43210"
              defaultValue={plan.recipientPhone || ""}
            />
          </label>
          <label>
            Transporter
            <input
              name="transporter"
              maxLength={150}
              defaultValue={plan.transporter || ""}
            />
          </label>
          <label>
            Vehicle number
            <input
              name="vehicleNumber"
              maxLength={30}
              defaultValue={plan.vehicleNumber || ""}
            />
          </label>
          <label>
            Driver name
            <input
              name="driverName"
              maxLength={150}
              defaultValue={plan.driverName || ""}
            />
          </label>
          <label>
            Driver phone
            <input
              name="driverPhone"
              inputMode="numeric"
              pattern="[6-9][0-9]{9}"
              defaultValue={plan.driverPhone || ""}
            />
          </label>
          <label>
            Estimated arrival
            <input
              name="estimatedArrival"
              type="datetime-local"
              defaultValue={localDateTimeValue(plan.estimatedArrival)}
            />
          </label>
          <label>
            Delivery status
            <select name="status" defaultValue={plan.status}>
              <option value={plan.status}>
                {formatEnumLabel(plan.status)}
              </option>
              {allowed.map((status) => (
                <option key={status} value={status}>
                  {formatEnumLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Current location
            <input
              name="location"
              maxLength={300}
              defaultValue={plan.currentLocation || ""}
            />
          </label>
          <label>
            Delivery update notes
            <textarea
              name="notes"
              maxLength={3000}
              defaultValue={plan.notes || ""}
            />
          </label>
          <button
            className="bc-primary bc-transport-save-update"
            disabled={busy}
          >
            Save delivery update
          </button>
        </form>
      )}
      <footer className="bc-transport-plan-created">
        <span>Created by <strong>{plan.createdBy || "Unknown"}</strong></span>
        <time dateTime={plan.createdAt}>
          {new Date(plan.createdAt).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Asia/Kolkata",
          })}
        </time>
      </footer>
    </article>
  );
}
