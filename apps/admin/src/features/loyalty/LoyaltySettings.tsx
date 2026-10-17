import type { FormEvent } from "react";

export type LoyaltySettingsValues = {
  enabled: boolean;
  pointsPer100Inr: number | string;
  minimumOrderValueInr: number | string;
  redemptionValuePerPoint: number | string;
  minimumRedemptionPoints: number | string;
  expiryAfterDays: number | string | null;
  createdBy?: string | null;
  createdAt?: string | null;
};

export function LoyaltyProgramOverview({
  settings,
  onEdit,
}: {
  settings: LoyaltySettingsValues;
  onEdit: () => void;
}) {
  const createdAt = settings.createdAt
    ? new Date(settings.createdAt)
    : null;
  const createdAtLabel =
    createdAt && !Number.isNaN(createdAt.getTime())
      ? new Intl.DateTimeFormat("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }).format(createdAt)
      : "Date and time unavailable";

  return (
    <section className="loyalty-program-overview">
      <div className="loyalty-program-heading">
        <div>
          <h2>Loyalty program overview</h2>
          <p className="bc-helper">
            Review the customer rewards rules and whether the program is enabled.
          </p>
        </div>
        <button type="button" className="bc-button" onClick={onEdit}>
          Edit settings
        </button>
      </div>
      <dl className="loyalty-program-values">
        <div>
          <dt>Program status</dt>
          <dd>
            <span
              className={`loyalty-program-status${settings.enabled ? " is-enabled" : ""}`}
            >
              {settings.enabled ? "Enabled" : "Disabled"}
            </span>
          </dd>
        </div>
        <div>
          <dt>Points earned per ₹100</dt>
          <dd>{settings.pointsPer100Inr}</dd>
        </div>
        <div>
          <dt>Minimum qualifying order</dt>
          <dd>₹{settings.minimumOrderValueInr}</dd>
        </div>
        <div>
          <dt>Redemption value per point</dt>
          <dd>₹{settings.redemptionValuePerPoint}</dd>
        </div>
        <div>
          <dt>Minimum redemption points</dt>
          <dd>{settings.minimumRedemptionPoints}</dd>
        </div>
        <div>
          <dt>Points expiry</dt>
          <dd>
            {settings.expiryAfterDays == null
              ? "No expiry"
              : `${settings.expiryAfterDays} days`}
          </dd>
        </div>
      </dl>
      <div className="loyalty-program-meta">
        <span>
          <strong>Created by</strong> {settings.createdBy || "Unknown"}
        </span>
        <time dateTime={settings.createdAt || undefined}>{createdAtLabel}</time>
      </div>
    </section>
  );
}

export default function LoyaltySettings({
  settings,
  busy,
  onSave,
  onSaved,
}: {
  settings: LoyaltySettingsValues;
  busy: boolean;
  onSave: (values: LoyaltySettingsValues) => Promise<boolean>;
  onSaved: () => void;
}) {
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const saved = await onSave({
      enabled: values.get("enabled") === "on",
      pointsPer100Inr: Number(values.get("rate")),
      minimumOrderValueInr: Number(values.get("minimum")),
      redemptionValuePerPoint: Number(values.get("value")),
      minimumRedemptionPoints: Number(values.get("redeem")),
      expiryAfterDays: values.get("expiry")
        ? Number(values.get("expiry"))
        : null,
    });
    if (saved) onSaved();
  }

  return (
    <form className="bc-form loyalty-settings-form" onSubmit={(event) => void save(event)}>
      <h2>Customer rewards settings</h2>
      <p className="bc-helper">
        Points are credited after delivery. Set the commercial rules agreed with
        the client before enabling the program.
      </p>
      <div className="bc-fields">
        <label>
          Points earned per ₹100
          <input
            name="rate"
            type="number"
            min="0"
            step="0.001"
            defaultValue={String(settings.pointsPer100Inr)}
          />
        </label>
        <label>
          Minimum qualifying order (₹)
          <input
            name="minimum"
            type="number"
            min="0"
            step="0.01"
            defaultValue={String(settings.minimumOrderValueInr)}
          />
        </label>
        <label>
          Redemption value per point (₹)
          <input
            name="value"
            type="number"
            min="0"
            step="0.0001"
            defaultValue={String(settings.redemptionValuePerPoint)}
          />
        </label>
        <label>
          Minimum redemption points
          <input
            name="redeem"
            type="number"
            min="0"
            step="1"
            defaultValue={settings.minimumRedemptionPoints}
          />
        </label>
        <label>
          Points expire after (days)
          <input
            name="expiry"
            type="number"
            min="1"
            defaultValue={String(settings.expiryAfterDays ?? "")}
          />
        </label>
        <label className="bc-check loyalty-enable-toggle">
          <input
            name="enabled"
            type="checkbox"
            defaultChecked={settings.enabled}
          />{" "}
          <span>
            <strong>Enable rewards</strong>
            <small>Turn on points earning and redemption for customers.</small>
          </span>
        </label>
      </div>
      <div className="loyalty-settings-actions">
        <button className="bc-primary" disabled={busy}>
          Save program settings
        </button>
      </div>
    </form>
  );
}
