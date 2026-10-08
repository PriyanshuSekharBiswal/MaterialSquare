import { useState } from "react";
import { customerApi } from "../../api";
import type { Quote } from "./model";
import { money } from "./model";

export default function QuotationResponse({ quote }: { quote: Quote }) {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [decision, setDecision] = useState("");
  const [confirming, setConfirming] = useState(false);
  if (quote.status !== "QUOTE_SENT" || new Date(quote.validUntil) <= new Date())
    return null;

  async function respond(action: "ACCEPT" | "REJECT") {
    setBusy(true);
    setError("");
    try {
      const result = await customerApi<{ orderNumber?: string }>(
        `/customer/quotations/${encodeURIComponent(quote.id)}/response`,
        "POST",
        {
          decision: action,
          selections: Object.entries(selections)
            .filter(([, optionId]) => optionId)
            .map(([itemId, optionId]) => ({ itemId, optionId })),
        },
      );
      setDecision(
        action === "ACCEPT"
          ? `Quotation accepted. Order ${result.orderNumber} created.`
          : "Quotation declined.",
      );
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="account-panel account-quotation-response"
      aria-label="Respond to quotation"
    >
      <h2>Respond to this quotation</h2>
      {decision ? (
        <>
          <p role="status">{decision}</p>
          <a href="/account/orders">View orders</a>
        </>
      ) : (
        <>
          {quote.items
            .filter((item) => item.options?.length)
            .map((item) => (
              <label className="account-quotation-response__field" key={item.id}>
                Choose brand for {item.productName}
                <select
                  value={selections[item.id] || ""}
                  disabled={busy || confirming}
                  onChange={(event) =>
                    setSelections({
                      ...selections,
                      [item.id]: event.target.value,
                    })
                  }
                >
                  <option value="">
                    {item.brandName} · {money(item.unitPrice)} / {item.unit}
                  </option>
                  {item.options?.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.brandName} · {option.productName} ·{" "}
                      {money(option.unitPrice)} / {option.unit}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          {error && <p role="alert">{error}</p>}
          {confirming ? (
            <div className="account-quotation-response__confirmation">
              <p>
                Confirm your selected brands and quantities before accepting.
                Acceptance creates an order for the team to fulfil. Payment is
                arranged directly with the business. Alternative brands may
                change the order total. To discuss a different requirement,
                contact the team directly.
              </p>
              <button
                className="account-primary-button"
                type="button"
                disabled={busy}
                onClick={() => void respond("ACCEPT")}
              >
                Confirm acceptance
              </button>
              <button
                className="account-secondary-button"
                type="button"
                disabled={busy}
                onClick={() => setConfirming(false)}
              >
                Go back
              </button>
            </div>
          ) : (
            <div className="account-quotation-response__actions">
              <button
                className="account-primary-button"
                type="button"
                disabled={busy}
                onClick={() => setConfirming(true)}
              >
                Accept quotation
              </button>
              <button
                className="account-secondary-button account-secondary-button--danger"
                type="button"
                disabled={busy}
                onClick={() => void respond("REJECT")}
              >
                Decline quotation
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
