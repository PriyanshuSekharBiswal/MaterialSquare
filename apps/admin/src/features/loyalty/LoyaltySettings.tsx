import type { FormEvent } from "react";

export type LoyaltySettingsValues = {
  enabled: boolean;
  pointsPer100Inr: number | string;
  minimumOrderValueInr: number | string;
  redemptionValuePerPoint: number | string;
  minimumRedemptionPoints: number | string;
  expiryAfterDays: number | string | null;
};

export default function LoyaltySettings({
  settings,
  busy,
  onSave,
}: {
  settings: LoyaltySettingsValues;
  busy: boolean;
  onSave: (values: LoyaltySettingsValues) => void;
}) {
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    onSave({
      enabled: values.get("enabled") === "on",
      pointsPer100Inr: Number(values.get("rate")),
      minimumOrderValueInr: Number(values.get("minimum")),
      redemptionValuePerPoint: Number(values.get("value")),
      minimumRedemptionPoints: Number(values.get("redeem")),
      expiryAfterDays: values.get("expiry")
        ? Number(values.get("expiry"))
        : null,
    });
  }

  return (
    <form className="bc-form" onSubmit={save}>
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
        <label className="bc-check">
          <input
            name="enabled"
            type="checkbox"
            defaultChecked={settings.enabled}
          />{" "}
          Enable rewards
        </label>
      </div>
      <button className="bc-primary" disabled={busy}>
        Save program settings
      </button>
    </form>
  );
}
