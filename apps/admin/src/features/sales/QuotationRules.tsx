import type { FormEvent } from "react";

export type QuotationRulesSettings = {
  quotationValidityHours: number;
  sendQuotePublishedNotification: boolean;
  sendQuoteExpiryReminder: boolean;
  expiryReminderHoursBefore: number;
  createdBy?: string | null;
  createdAt?: string | null;
};

export function QuotationRulesOverview({
  settings,
  onEdit,
}: {
  settings: QuotationRulesSettings;
  onEdit: () => void;
}) {
  const createdAt = settings.createdAt ? new Date(settings.createdAt) : null;
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
    <section className="quotation-rules-overview">
      <div className="quotation-rules-heading">
        <div>
          <h2>Quotation rules overview</h2>
          <p className="bc-helper">
            Review quotation validity and customer notification settings.
          </p>
        </div>
        <button type="button" className="bc-button" onClick={onEdit}>
          Edit settings
        </button>
      </div>
      <dl className="quotation-rules-values">
        <div className="quotation-rules-column">
          <div>
            <dt>Quotation validity</dt>
            <dd>{settings.quotationValidityHours} hours</dd>
          </div>
          <div>
            <dt>Reminder lead time</dt>
            <dd>{settings.expiryReminderHoursBefore} hours before expiry</dd>
          </div>
        </div>
        <div className="quotation-rules-column">
          <div>
            <dt>Published notification</dt>
            <dd>
              <span
                className={`quotation-rules-status${settings.sendQuotePublishedNotification ? " is-enabled" : ""}`}
              >
                {settings.sendQuotePublishedNotification ? "Enabled" : "Disabled"}
              </span>
            </dd>
          </div>
          <div>
            <dt>Expiry reminder</dt>
            <dd>
              <span
                className={`quotation-rules-status${settings.sendQuoteExpiryReminder ? " is-enabled" : ""}`}
              >
                {settings.sendQuoteExpiryReminder ? "Enabled" : "Disabled"}
              </span>
            </dd>
          </div>
        </div>
      </dl>
      <div className="quotation-rules-meta">
        <span>
          <strong>Created by</strong> {settings.createdBy || "Unknown"}
        </span>
        <time dateTime={settings.createdAt || undefined}>{createdAtLabel}</time>
      </div>
    </section>
  );
}

export default function QuotationRules({
  settings,
  busy,
  onSave,
  onSaved,
}: {
  settings: QuotationRulesSettings;
  busy: boolean;
  onSave: (settings: QuotationRulesSettings) => Promise<boolean>;
  onSaved: () => void;
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const saved = await onSave({
      quotationValidityHours: Number(form.get("quotationValidityHours")),
      sendQuotePublishedNotification:
        form.get("sendQuotePublishedNotification") === "on",
      sendQuoteExpiryReminder: form.get("sendQuoteExpiryReminder") === "on",
      expiryReminderHoursBefore: Number(form.get("expiryReminderHoursBefore")),
    });
    if (saved) onSaved();
  }

  return (
    <form className="bc-form quotation-rules-form" onSubmit={(event) => void submit(event)}>
      <h2>Quotation and notification rules</h2>
      <p className="bc-helper">
        These rules apply to new and edited quotation drafts. Notifications are
        queued for delivery by the configured provider; saving a rule does not
        confirm that a message was delivered.
      </p>
      <div className="bc-fields">
        <div className="quotation-rules-form-row">
          <label className="bc-check">
            <input
              name="sendQuotePublishedNotification"
              type="checkbox"
              defaultChecked={settings.sendQuotePublishedNotification}
            />{" "}
            Queue a customer notification when a quotation is published
          </label>
          <label>
            Quotation validity (hours)
            <input
              name="quotationValidityHours"
              type="number"
              min="1"
              max="720"
              step="1"
              required
              defaultValue={settings.quotationValidityHours}
            />
          </label>
        </div>
        <div className="quotation-rules-form-row">
          <label className="bc-check">
            <input
              name="sendQuoteExpiryReminder"
              type="checkbox"
              defaultChecked={settings.sendQuoteExpiryReminder}
            />{" "}
            Queue one reminder before the quotation expires
          </label>
          <label>
            Reminder lead time (hours)
            <input
              name="expiryReminderHoursBefore"
              type="number"
              min="1"
              max="719"
              step="1"
              required
              defaultValue={settings.expiryReminderHoursBefore}
            />
          </label>
        </div>
      </div>
      <div className="quotation-rules-actions">
        <button className="bc-primary" disabled={busy}>
          Save quotation rules
        </button>
      </div>
    </form>
  );
}
