import type { FormSubmit } from "../business/form-contracts";
import { ArrowLeft } from "lucide-react";

type TransportationPlanningFormsProps = {
  busy: boolean;
  submit: FormSubmit;
  mode: "plan" | "challan";
  onBack: () => void;
};

const field = (form: FormData, name: string) =>
  String(form.get(name) || "").trim();

export default function TransportationPlanningForms({
  busy,
  submit,
  mode,
  onBack,
}: TransportationPlanningFormsProps) {
  return (
    <>
      {mode === "plan" && (
      <form
        className="bc-form transportation-planning-form"
        onSubmit={(event) =>
          submit(
            event,
            (form) => ({
              destination: field(form, "destination"),
              recipientName: field(form, "recipientName") || null,
              recipientPhone: field(form, "recipientPhone") || null,
              transporter: field(form, "transporter"),
              vehicleNumber: field(form, "vehicle"),
              driverName: field(form, "driver"),
              driverPhone: field(form, "phone") || null,
              estimatedArrival: new Date(
                String(form.get("arrival")),
              ).toISOString(),
              status: "PLANNED",
            }),
            `/transportation/${field(
              new FormData(event.currentTarget),
              "orderId",
            )}`,
            "PUT",
          )
        }
      >
        <div className="transportation-form-heading">
          <button type="button" className="btn-sm btn-secondary" onClick={onBack}>
            <ArrowLeft size={16} aria-hidden="true" /> Back to transportation plans
          </button>
          <h2>Plan an order delivery</h2>
        </div>
        <div className="bc-fields">
          <label>
            Order reference
            <input
              name="orderId"
              placeholder="MS-OR-… or internal order ID"
              required
            />
          </label>
          <label>
            Destination
            <input name="destination" required />
          </label>
          <label>
            Recipient name (optional)
            <input name="recipientName" maxLength={150} placeholder="e.g. site contact name" />
          </label>
          <label>
            Recipient number (optional)
            <input
              name="recipientPhone"
              type="tel"
              inputMode="tel"
              maxLength={30}
              placeholder="e.g. +91 98765 43210"
            />
          </label>
          <label>
            Transporter
            <input name="transporter" />
          </label>
          <label>
            Vehicle number
            <input name="vehicle" />
          </label>
          <label>
            Driver name
            <input name="driver" />
          </label>
          <label>
            Driver phone
            <input name="phone" inputMode="numeric" />
          </label>
          <label>
            Estimated arrival
            <input name="arrival" type="datetime-local" required />
          </label>
        </div>
        <button className="bc-primary" disabled={busy}>
          Save delivery plan
        </button>
      </form>
      )}
      {mode === "challan" && (
      <form
        className="bc-form transportation-planning-form"
        onSubmit={(event) =>
          submit(
            event,
            (form) => ({
              truckNumber: field(form, "truck"),
              driverName: field(form, "driver"),
              driverPhone: field(form, "phone"),
              weighbridgeGrossKg: Number(form.get("gross")),
              weighbridgeTareKg: Number(form.get("tare")),
              estimatedArrival: new Date(
                String(form.get("arrival")),
              ).toISOString(),
            }),
            `/orders/${field(
              new FormData(event.currentTarget),
              "orderId",
            )}/dispatch-challan`,
          )
        }
      >
        <div className="transportation-form-heading">
          <button type="button" className="btn-sm btn-secondary" onClick={onBack}>
            <ArrowLeft size={16} aria-hidden="true" /> Back to transportation plans
          </button>
          <h2>Create customer delivery challan</h2>
        </div>
        <div className="bc-fields">
          <label>
            Order reference
            <input
              name="orderId"
              placeholder="MS-OR-… or internal order ID"
              required
            />
          </label>
          <label>
            Truck number
            <input name="truck" required />
          </label>
          <label>
            Driver name
            <input name="driver" required />
          </label>
          <label>
            Driver phone
            <input
              name="phone"
              inputMode="numeric"
              pattern="[6-9][0-9]{9}"
              required
            />
          </label>
          <label>
            Gross vehicle weight (kg)
            <input name="gross" type="number" min="0.01" step="0.01" required />
          </label>
          <label>
            Tare weight (kg)
            <input name="tare" type="number" min="0" step="0.01" required />
          </label>
          <label>
            Estimated arrival
            <input name="arrival" type="datetime-local" required />
          </label>
        </div>
        <button className="bc-primary" disabled={busy}>
          Issue delivery challan
        </button>
      </form>
      )}
    </>
  );
}
