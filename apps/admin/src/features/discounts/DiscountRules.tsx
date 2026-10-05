import { useState, type FormEvent } from "react";

export type DiscountRule = {
  id: string;
  name: string;
  description?: string | null;
  updatedAt: string;
  category?: string | null;
  deliveryPincodes: string[];
  percentageOff: string | number;
  fixedAmountOff: string | number;
  isActive: boolean;
  minimumQuantity?: string | number | null;
  maximumQuantity?: string | number | null;
  priority: number;
  startsAt?: string | null;
  endsAt?: string | null;
};
type Props = {
  rules: DiscountRule[];
  busy: boolean;
  submit: (
    event: FormEvent<HTMLFormElement>,
    body: (data: FormData) => unknown,
    url?: string,
    method?: string,
  ) => Promise<unknown>;
  mutate: (url: string, method: string, body: unknown) => Promise<unknown>;
};
const field = (data: FormData, key: string) =>
  String(data.get(key) || "").trim();

function localDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export default function DiscountRules({ rules, busy, submit, mutate }: Props) {
  const [editing, setEditing] = useState<DiscountRule | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const blankOptional = editing ? null : undefined;
  return (
    <>
      <form
        key={`${editing?.id || "new"}-${formVersion}`}
        className="bc-form"
        onSubmit={async (e) => {
          const saved = await submit(
            e,
            (f) => ({
              name: field(f, "name"),
              description: field(f, "description") || blankOptional,
              expectedUpdatedAt: editing?.updatedAt,
              category: field(f, "category") || blankOptional,
              deliveryPincodes: field(f, "pincodes")
                .split(/[ ,]+/)
                .filter(Boolean),
              minimumQuantity: f.get("minimum")
                ? Number(f.get("minimum"))
                : blankOptional,
              maximumQuantity: f.get("maximum")
                ? Number(f.get("maximum"))
                : blankOptional,
              startsAt: f.get("startsAt")
                ? new Date(String(f.get("startsAt"))).toISOString()
                : blankOptional,
              endsAt: f.get("endsAt")
                ? new Date(String(f.get("endsAt"))).toISOString()
                : blankOptional,
              percentageOff: Number(f.get("percentage")),
              fixedAmountOff: Number(f.get("fixed")),
              priority: Number(f.get("priority")),
              isActive: f.get("active") === "on",
            }),
            editing ? `/discount-rules/${editing.id}` : "/discount-rules",
            editing ? "PATCH" : "POST",
          );
          if (saved) {
            setEditing(null);
            setFormVersion((value) => value + 1);
          }
        }}
      >
        <h2>
          {editing
            ? `Edit ${editing.name}`
            : "Configure an automatic quote discount"}
        </h2>
        <div className="bc-fields">
          <label>
            Rule name
            <input name="name" required defaultValue={editing?.name || ""} />
          </label>
          <label>
            Rule description (optional)
            <textarea
              name="description"
              maxLength={1000}
              defaultValue={editing?.description || ""}
            />
          </label>
          <label>
            Category (optional)
            <input name="category" defaultValue={editing?.category || ""} />
          </label>
          <label>
            Delivery PIN codes
            <input
              name="pincodes"
              defaultValue={editing?.deliveryPincodes.join(", ") || ""}
              placeholder="201301, 201310"
            />
          </label>
          <label>
            Minimum quantity
            <input
              name="minimum"
              defaultValue={editing?.minimumQuantity ?? ""}
              type="number"
              min="0.001"
              step="0.001"
            />
          </label>
          <label>
            Maximum quantity
            <input
              name="maximum"
              defaultValue={editing?.maximumQuantity ?? ""}
              type="number"
              min="0.001"
              step="0.001"
            />
          </label>
          <label>
            Starts at (optional)
            <input
              name="startsAt"
              defaultValue={localDateTime(editing?.startsAt)}
              type="datetime-local"
            />
          </label>
          <label>
            Ends at (optional)
            <input
              name="endsAt"
              defaultValue={localDateTime(editing?.endsAt)}
              type="datetime-local"
            />
          </label>
          <label>
            Discount percent
            <input
              name="percentage"
              type="number"
              min="0"
              max="100"
              step="0.01"
              defaultValue={editing?.percentageOff ?? 0}
            />
          </label>
          <label>
            Fixed discount per item (₹)
            <input
              name="fixed"
              type="number"
              min="0"
              step="0.01"
              defaultValue={editing?.fixedAmountOff ?? 0}
            />
          </label>
          <label>
            Priority
            <input
              name="priority"
              type="number"
              min="0"
              defaultValue={editing?.priority ?? 0}
            />
          </label>
          <label className="bc-check">
            <input
              name="active"
              type="checkbox"
              defaultChecked={editing?.isActive || false}
            />{" "}
            Apply to new quotations
          </label>
        </div>
        <button className="bc-primary" disabled={busy}>
          Save discount rule
        </button>
        {editing && (
          <button
            type="button"
            className="bc-button"
            disabled={busy}
            onClick={() => {
              setEditing(null);
              setFormVersion((value) => value + 1);
            }}
          >
            Cancel rule editing
          </button>
        )}
      </form>
      <h2>Discount rules</h2>
      {rules.map((rule) => (
        <article className="business-record" key={rule.id}>
          <div>
            <strong>{rule.name}</strong>
            <p>
              {rule.percentageOff}% + ₹{rule.fixedAmountOff} ·{" "}
              {rule.category || "All categories"} ·{" "}
              {(rule.deliveryPincodes || []).join(", ") || "All service areas"}
            </p>
            <small>
              {rule.isActive ? "Active for new quotations" : "Inactive"}
            </small>
          </div>
          <button
            className="bc-button"
            disabled={busy}
            onClick={() => {
              setEditing(rule);
              setFormVersion((value) => value + 1);
            }}
          >
            Edit {rule.name}
          </button>
          <button
            className="bc-button"
            disabled={busy}
            onClick={() =>
              void mutate(`/discount-rules/${rule.id}`, "PATCH", {
                isActive: !rule.isActive,
                expectedUpdatedAt: rule.updatedAt,
              })
            }
          >
            {rule.isActive ? "Deactivate" : "Activate"} {rule.name}
          </button>
        </article>
      ))}
    </>
  );
}
