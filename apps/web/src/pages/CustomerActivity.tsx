import { useCallback, useEffect, useState } from "react";
import { customerApi } from "../api";

type QuotationOption = {
  id: string;
  productName: string;
  brandName: string;
  unit: string;
  specification: string;
  unitPrice: string;
  lineTotal: string;
  discountAmount: string;
};
type QuotationItem = QuotationOption & {
  quantityMt: string;
  options: QuotationOption[];
};
type Quote = {
  id: string;
  quoteNumber: string;
  status: string;
  revisionNumber?: number;
  revisedFromId?: string | null;
  subtotal: string;
  discountAmount: string;
  marginAmount: string;
  marginPct: string;
  taxAmount: string;
  taxPct: string;
  freightAmount: string;
  totalAmount: string;
  validUntil: string;
  items: QuotationItem[];
};
type Order = {
  id: string;
  orderNumber: string;
  status: string;
  grandTotal: string;
  deliverySite: string;
  items: {
    id: string;
    productName: string;
    quantityMt: string;
    unit: string;
    deliveries: { quantity: string }[];
  }[];
  deliveries: { deliveryNumber: string; deliveredAt: string }[];
  dispatch?: {
    truckNumber: string;
    estimatedArrival: string;
    currentStep: number;
  } | null;
};
type SavedRequest = {
  id: string;
  status: string;
  siteLocation: string;
  createdAt: string;
  items: {
    material: string;
    quantity: number;
    unit: string;
    specification?: string;
  }[];
};
type Activity = {
  requests: SavedRequest[];
  quotations: Quote[];
  orders: Order[];
  loyalty: {
    pointsBalance: number;
    transactions: {
      id: string;
      description: string;
      points: number;
      createdAt: string;
    }[];
  } | null;
};
type BrandChoices = Record<string, Record<string, string>>;

const money = (value: string | number) =>
  Number(value).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
  });

const statusLabel = (value: string) =>
  value === "PROCESSING_AT_YARD"
    ? "Processing"
    : value.replaceAll("_", " ").toLowerCase();

function selectedOption(item: QuotationItem, optionId: string | undefined) {
  return item.options.find((option) => option.id === optionId) || item;
}

function estimatedTotal(quote: Quote, choices: Record<string, string>) {
  const subtotal = quote.items.reduce((total, item) => {
    const option = selectedOption(item, choices[item.id]);
    return total + Number(option.lineTotal);
  }, 0);
  const discount = quote.items.reduce((total, item) => {
    const option = selectedOption(item, choices[item.id]);
    return total + Number(option.discountAmount);
  }, 0);
  const roundMoney = (value: number) =>
    Math.round((value + Number.EPSILON) * 100) / 100;
  const margin = roundMoney(
    ((subtotal - discount) * Number(quote.marginPct)) / 100,
  );
  const tax = roundMoney(
    ((subtotal - discount + margin) * Number(quote.taxPct)) / 100,
  );
  return roundMoney(
    subtotal - discount + margin + tax + Number(quote.freightAmount),
  );
}

export default function CustomerActivity({
  customerId,
}: {
  customerId: string;
}) {
  const [activity, setActivity] = useState<Activity | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [brandChoices, setBrandChoices] = useState<BrandChoices>({});

  const refresh = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      setActivity(
        await customerApi<Activity>(
          "/customer/activity",
          "GET",
          undefined,
          customerId,
        ),
      );
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }, [customerId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function respond(id: string, decision: "ACCEPT" | "REJECT") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const choices = brandChoices[id] || {};
      const selections = Object.entries(choices)
        .filter(([, optionId]) => optionId)
        .map(([itemId, optionId]) => ({ itemId, optionId }));
      const result = await customerApi<{
        orderNumber: string | null;
      }>(
        `/customer/quotes/${id}/respond`,
        "POST",
        { decision, selections: decision === "ACCEPT" ? selections : [] },
        customerId,
      );
      setNotice(
        result.orderNumber
          ? `Quotation accepted. Order ${result.orderNumber} created.`
          : "Quotation declined.",
      );
      await refresh();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function chooseBrand(quoteId: string, itemId: string, optionId: string) {
    setBrandChoices((current) => ({
      ...current,
      [quoteId]: { ...current[quoteId], [itemId]: optionId },
    }));
  }

  return (
    <div className="customer-activity">
      <div className="account-card">
        <h2>Quotations & orders</h2>
        <p>
          Staff-published quotations and recorded orders appear here. WhatsApp
          and email conversations are handled separately.
        </p>
        <button
          className="btn btn-secondary"
          disabled={busy}
          onClick={() => void refresh()}
        >
          {busy ? "Loading…" : "Refresh activity"}
        </button>
      </div>
      {error && (
        <p role="alert" className="customer-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="customer-notice">
          {notice}
        </p>
      )}
      {activity && (
        <>
          <section className="account-card">
            <h2>My requests</h2>
            {!activity.requests?.length && (
              <p>No website requests submitted yet.</p>
            )}
            {activity.requests?.map((request) => (
              <article className="activity-record" key={request.id}>
                <h3>Request {request.id}</h3>
                <p>
                  {statusLabel(request.status)} ·{" "}
                  {new Date(request.createdAt).toLocaleDateString("en-IN")}
                </p>
                <p>{request.siteLocation}</p>
                <ul>
                  {request.items.map((item, index) => (
                    <li key={index}>
                      {item.material} · {item.quantity} {item.unit}
                      {item.specification ? ` · ${item.specification}` : ""}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </section>
          <section className="account-card">
            <h2>My quotations</h2>
            {!activity.quotations.length && <p>No quotations published yet.</p>}
            {activity.quotations.map((quote) => {
              const choices = brandChoices[quote.id] || {};
              const canRespond =
                quote.status === "QUOTE_SENT" &&
                new Date(quote.validUntil) > new Date();
              return (
                <article className="activity-record" key={quote.id}>
                  <h3>
                    {quote.quoteNumber} · Revision {quote.revisionNumber || 1}
                  </h3>
                  {quote.revisedFromId && (
                    <p>
                      Replaces{" "}
                      {activity.quotations.find(
                        (original) => original.id === quote.revisedFromId,
                      )?.quoteNumber || "an earlier quotation"}
                    </p>
                  )}
                  <p>
                    {statusLabel(quote.status)} · {money(quote.totalAmount)}
                  </p>
                  <p>
                    Valid until{" "}
                    {new Date(quote.validUntil).toLocaleDateString("en-IN")}
                  </p>
                  <ul>
                    {quote.items.map((item) => {
                      const chosen = selectedOption(item, choices[item.id]);
                      return (
                        <li key={item.id}>
                          <strong>{item.productName}</strong> · {item.brandName}
                          {item.specification
                            ? ` · ${item.specification}`
                            : ""}{" "}
                          · {item.quantityMt} {item.unit} ·{" "}
                          {money(item.unitPrice)} per {item.unit}
                          {item.options.length > 0 && (
                            <div className="quote-brand-comparison">
                              <label>
                                Compare and choose a brand
                                <select
                                  disabled={!canRespond || busy}
                                  value={choices[item.id] || "primary"}
                                  onChange={(event) =>
                                    chooseBrand(
                                      quote.id,
                                      item.id,
                                      event.target.value === "primary"
                                        ? ""
                                        : event.target.value,
                                    )
                                  }
                                >
                                  <option value="primary">
                                    {item.brandName} · {money(item.unitPrice)}{" "}
                                    per {item.unit}
                                  </option>
                                  {item.options.map((option) => (
                                    <option key={option.id} value={option.id}>
                                      {option.brandName} ·{" "}
                                      {money(option.unitPrice)} per{" "}
                                      {option.unit}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <p>
                                Selected: {chosen.brandName} ·{" "}
                                {chosen.productName}
                                {chosen.specification
                                  ? ` · ${chosen.specification}`
                                  : ""}
                              </p>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {canRespond &&
                    quote.items.some((item) => item.options.length > 0) && (
                      <p>
                        Estimated total with selected brands:{" "}
                        {money(estimatedTotal(quote, choices))}
                      </p>
                    )}
                  {canRespond && (
                    <div className="customer-actions">
                      <button
                        className="btn btn-primary"
                        disabled={busy}
                        onClick={() => void respond(quote.id, "ACCEPT")}
                      >
                        Accept quotation & create order
                      </button>
                      <button
                        className="btn btn-secondary"
                        disabled={busy}
                        onClick={() => void respond(quote.id, "REJECT")}
                      >
                        Decline quotation
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
          <section className="account-card">
            <h2>My orders & delivery</h2>
            {!activity.orders.length && <p>No orders recorded yet.</p>}
            {activity.orders.map((order) => (
              <article className="activity-record" key={order.id}>
                <h3>{order.orderNumber}</h3>
                <p>
                  {statusLabel(order.status)} · {money(order.grandTotal)}
                </p>
                <p>{order.deliverySite}</p>
                <ul className="activity-order-items">
                  {order.items.map((item) => {
                    const delivered = item.deliveries.reduce(
                      (sum, delivery) => sum + Number(delivery.quantity),
                      0,
                    );
                    return (
                      <li key={item.id}>
                        {item.productName}: {delivered.toLocaleString("en-IN")}{" "}
                        / {Number(item.quantityMt).toLocaleString("en-IN")}{" "}
                        {item.unit} delivered
                      </li>
                    );
                  })}
                </ul>
                {order.deliveries.map((delivery) => (
                  <small key={delivery.deliveryNumber}>
                    Delivery {delivery.deliveryNumber} ·{" "}
                    {new Date(delivery.deliveredAt).toLocaleDateString("en-IN")}
                  </small>
                ))}
                {order.dispatch && (
                  <p>
                    Vehicle: {order.dispatch.truckNumber} · Delivery step{" "}
                    {order.dispatch.currentStep}/5 · Estimated arrival:{" "}
                    {new Date(order.dispatch.estimatedArrival).toLocaleString(
                      "en-IN",
                    )}
                  </p>
                )}
              </article>
            ))}
          </section>
          <section className="account-card">
            <h2>Loyalty points</h2>
            <p>{activity.loyalty?.pointsBalance || 0} points available</p>
            {activity.loyalty?.transactions.map((transaction) => (
              <p key={transaction.id}>
                {transaction.description} · {transaction.points} points ·{" "}
                {new Date(transaction.createdAt).toLocaleDateString("en-IN")}
              </p>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
