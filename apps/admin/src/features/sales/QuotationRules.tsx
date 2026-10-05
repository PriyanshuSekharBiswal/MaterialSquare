import type { FormEvent } from "react";

export type QuotationRulesSettings = {
  quotationValidityHours: number;
  sendQuotePublishedNotification: boolean;
  sendQuoteExpiryReminder: boolean;
  expiryReminderHoursBefore: number;
};

export default function QuotationRules({
  settings,
  busy,
  onSave,
}: {
  settings: QuotationRulesSettings;
  busy: boolean;
  onSave: (settings: QuotationRulesSettings) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave({
      quotationValidityHours: Number(form.get("quotationValidityHours")),
      sendQuotePublishedNotification:
        form.get("sendQuotePublishedNotification") === "on",
      sendQuoteExpiryReminder: form.get("sendQuoteExpiryReminder") === "on",
      expiryReminderHoursBefore: Number(form.get("expiryReminderHoursBefore")),
    });
  }

  return (
    <form className="bc-form" onSubmit={submit}>
      <h2>Quotation and notification rules</h2>
      <p className="bc-helper">
        These rules apply to new and edited quotation drafts. Notifications are
        queued for delivery by the configured provider; saving a rule does not
        confirm that a message was delivered.
      </p>
      <div className="bc-fields">
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
        <label className="bc-check">
          <input
            name="sendQuotePublishedNotification"
            type="checkbox"
            defaultChecked={settings.sendQuotePublishedNotification}
          />{" "}
          Queue a customer notification when a quotation is published
        </label>
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
      <button className="bc-primary" disabled={busy}>
        Save quotation rules
      </button>
    </form>
  );
}
