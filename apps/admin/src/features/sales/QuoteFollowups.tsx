import { useState, type FormEvent } from "react";

type Followup = {
  id: string;
  channel: "WHATSAPP" | "EMAIL" | "INTERNAL";
  scheduledAt: string;
  status: "SCHEDULED" | "SENT" | "CANCELLED" | "FAILED";
  notes?: string | null;
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
          {quote.followups?.map((followup) => (
            <FollowupRow
              key={followup.id}
              quoteId={quote.id}
              followup={followup}
              busy={busy}
              mutate={mutate}
            />
          ))}
        </article>
      ))}
    </>
  );
}

function FollowupRow({
  quoteId,
  followup,
  busy,
  mutate,
}: {
  quoteId: string;
  followup: Followup;
  busy: boolean;
  mutate: Props["mutate"];
}) {
  const [rescheduling, setRescheduling] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(() => {
    const date = new Date(followup.scheduledAt);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  });

  async function reschedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!scheduledAt) return;
    const saved = await mutate(
      `/quotes/${quoteId}/followups/${followup.id}`,
      "PATCH",
      { scheduledAt: new Date(scheduledAt).toISOString() },
    );
    if (saved) setRescheduling(false);
  }

  return (
    <div className="business-candidate">
      <span>
        {followup.channel} · {new Date(followup.scheduledAt).toLocaleString("en-IN")} · {followup.status}
      </span>
      {followup.status === "SCHEDULED" && !rescheduling && (
        <>
          {followup.channel === "INTERNAL" && (
            <button
              className="bc-button"
              disabled={busy}
              onClick={() =>
                void mutate(
                  `/quotes/${quoteId}/followups/${followup.id}`,
                  "PATCH",
                  { status: "SENT" },
                )
              }
            >
              Mark complete
            </button>
          )}
          <button
            className="bc-button"
            disabled={busy}
            onClick={() => setRescheduling(true)}
          >
            Reschedule
          </button>
          <button
            className="bc-button"
            disabled={busy}
            onClick={() =>
              void mutate(
                `/quotes/${quoteId}/followups/${followup.id}`,
                "PATCH",
                { status: "CANCELLED" },
              )
            }
          >
            Cancel
          </button>
        </>
      )}
      {followup.status === "SCHEDULED" && rescheduling && (
        <form className="bc-inline-form" onSubmit={(event) => void reschedule(event)}>
          <label>
            New reminder time
            <input
              type="datetime-local"
              required
              value={scheduledAt}
              disabled={busy}
              onChange={(event) => setScheduledAt(event.target.value)}
            />
          </label>
          <button className="bc-button" disabled={busy || !scheduledAt}>
            Save new time
          </button>
          <button
            className="bc-button"
            type="button"
            disabled={busy}
            onClick={() => setRescheduling(false)}
          >
            Keep current time
          </button>
        </form>
      )}
    </div>
  );
}
