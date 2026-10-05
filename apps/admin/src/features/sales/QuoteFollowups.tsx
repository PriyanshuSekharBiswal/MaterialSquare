import type { FormEvent } from "react";

type Followup = {
  id: string;
  channel: "WHATSAPP" | "EMAIL" | "INTERNAL";
  scheduledAt: string;
  status: "SCHEDULED" | "SENT" | "CANCELLED" | "FAILED";
};

export type FollowupQuotation = {
  id: string;
  quoteNumber: string;
  customerName: string;
  status: string;
  totalAmount: string | number;
  followups?: Followup[];
};

type Props = {
  busy: boolean;
  quotes: FollowupQuotation[];
  submit: (
    event: FormEvent<HTMLFormElement>,
    makeBody: (data: FormData) => unknown,
    url: string,
  ) => Promise<unknown>;
  mutate: (url: string, method: string, body: unknown) => Promise<unknown>;
};

export default function QuoteFollowups({
  quotes,
  submit,
  mutate,
  busy,
}: Props) {
  return (
    <>
      <p className="bc-helper">
        Schedule customer reminders for quotations. WhatsApp and email jobs run
        through the configured notification provider.
      </p>
      <h2>Quotations</h2>
      {quotes.map((quote) => (
        <article className="business-record bc-record-block" key={quote.id}>
          <div>
            <strong>
              {quote.quoteNumber} · {quote.customerName}
            </strong>
            <p>
              {quote.status} · ₹
              {Number(quote.totalAmount).toLocaleString("en-IN")}
            </p>
          </div>
          <form
            className="bc-inline-form"
            aria-label={`Reminder for ${quote.quoteNumber}`}
            onSubmit={(e) =>
              submit(
                e,
                (f) => ({
                  channel: String(f.get("channel") || ""),
                  scheduledAt: new Date(
                    String(f.get("scheduledAt")),
                  ).toISOString(),
                  notes: String(f.get("notes") || "").trim() || undefined,
                }),
                `/quotes/${quote.id}/followups`,
              )
            }
          >
            <select
              name="channel"
              aria-label="Reminder channel"
              disabled={busy}
            >
              <option value="WHATSAPP">WhatsApp</option>
              <option value="EMAIL">Email</option>
              <option value="INTERNAL">Internal task</option>
            </select>
            <input
              name="scheduledAt"
              type="datetime-local"
              aria-label="Reminder time"
              disabled={busy}
              required
            />
            <input
              name="notes"
              aria-label="Reminder notes"
              placeholder="Message context"
              maxLength={3000}
              disabled={busy}
            />
            <button className="bc-button" disabled={busy}>
              Schedule follow-up
            </button>
          </form>
          {quote.followups?.map((f) => (
            <div className="business-candidate" key={f.id}>
              <span>
                {f.channel} · {new Date(f.scheduledAt).toLocaleString("en-IN")}{" "}
                · {f.status}
              </span>
              {f.status === "SCHEDULED" && (
                <button
                  className="bc-button"
                  disabled={busy}
                  onClick={() =>
                    void mutate(
                      `/quotes/${quote.id}/followups/${f.id}`,
                      "PATCH",
                      { status: "CANCELLED" },
                    )
                  }
                >
                  Cancel
                </button>
              )}
            </div>
          ))}
        </article>
      ))}
    </>
  );
}
