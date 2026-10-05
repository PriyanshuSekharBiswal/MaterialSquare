import { useState, type FormEvent } from "react";
import {
  TRANSPORTATION_TRANSITIONS,
  type TransportationStatus,
} from "@material-square/types";
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
  vehicleNumber: string | null;
  driverName: string | null;
  currentLocation: string | null;
  estimatedArrival: string | null;
  notes: string | null;
};
export default function TransportationPlanCard({
  plan,
  busy,
  mutate,
}: {
  plan: TransportationPlan;
  busy: boolean;
  mutate: (path: string, method: string, body: unknown) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
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
  return (
    <article className="business-record bc-record-block">
      <h3>{plan.order?.orderNumber || plan.orderId}</h3>
      <p>
        {plan.destination} · {plan.vehicleNumber || "Vehicle pending"} ·{" "}
        {plan.status.replaceAll("_", " ")}
      </p>
      <p>
        {plan.driverName || "Driver pending"} · ETA{" "}
        {plan.estimatedArrival
          ? new Date(plan.estimatedArrival).toLocaleString("en-IN")
          : "Not set"}
      </p>
      {plan.currentLocation && <p>Current location: {plan.currentLocation}</p>}
      {plan.notes && <p>{plan.notes}</p>}
      {orderItems.map((item) => {
        const delivered = item.deliveries.reduce(
          (total, delivery) => total + Number(delivery.quantity),
          0,
        );
        return (
          <p key={item.id}>
            {item.productName}: {delivered.toLocaleString("en-IN")} /{" "}
            {Number(item.quantityMt).toLocaleString("en-IN")} {item.unit}{" "}
            delivered
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
      {!!allowed.length && (
        <button
          className="bc-button"
          disabled={busy}
          onClick={() => setEditing((current) => !current)}
        >
          {editing ? "Cancel delivery update" : "Update delivery status"}
        </button>
      )}
      {editing && (
        <form className="bc-fields" onSubmit={(event) => void update(event)}>
          <label>
            Delivery status
            <select name="status" defaultValue={plan.status}>
              <option value={plan.status}>
                {plan.status.replaceAll("_", " ")}
              </option>
              {allowed.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
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
          <button className="bc-primary" disabled={busy}>
            Save delivery update
          </button>
        </form>
      )}
    </article>
  );
}
