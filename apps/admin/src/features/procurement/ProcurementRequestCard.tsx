import PurchaseOrderRevision, {
  type RevisablePurchaseOrder,
} from "./PurchaseOrderRevision";
import { useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import ServiceAreaPincodes from "../suppliers/ServiceAreaPincodes";

type Material = {
  productName: string;
  brand?: string;
  category?: string;
  catalogVariantId?: string;
  quantity: number;
  requiredQuantity?: number;
  clientStockQuantity?: number;
  unit: string;
  notes?: string;
};
type Supplier = {
  id: string;
  name: string;
  phone: string;
  city?: string;
  state?: string;
  pincode?: string;
  servicePincodes?: string[];
  averageScore?: number | null;
  matchedItems: string[];
  serviceAreaMatch: boolean;
  deliveryPincodeMatch?: boolean;
  serviceCoverageMatch?: boolean;
  cityMatch: boolean;
  stateMatch?: boolean;
  locationMatchPercent: number;
  locationMatchLabel: string;
  supplierUpdatedAt?: string | null;
  missingServiceArea?: boolean;
  matchedProducts?: {
    requestedItemIndex: number;
    productName: string;
    brand: string;
    category: string;
    unit: string;
    availableQuantity: string | number | null;
    availabilityCheckedAt: string | null;
    availabilityStatus: "unknown" | "outdated" | "recently-checked";
    availableFreshQuantity: number | null;
    suggestedAllocationQuantity: number;
    minimumOrderQty: string | number | null;
    listingUpdatedAt: string | null;
    lastQuotedPrice: string | number | null;
    lastQuotedPriceAt: string | null;
    requestedQuantity: number;
  }[];
};
type MatchSummary = {
  disclaimer: string;
  requestedItems: {
    productName: string;
    brand?: string;
    unit: string;
    quantity: number;
    matchedSupplierCount: number;
    knownFreshCapacity: number;
    allocationQuantity?: number;
    outsideRecordedAreaCount?: number;
    minimumOrderBlockedCount?: number;
    minimumOrderUnknownCount?: number;
    coverage: "no-listing" | "unknown" | "none" | "minimum-order" | "partial" | "covered";
    allocationSuggestions: { supplierName: string; quantity: number }[];
  }[];
};
type SupplierQuote = {
  id: string;
  supplierQuoteNumber: string;
  supplier: Pick<Supplier, "id" | "name" | "phone">;
  totalAmount: string;
  leadTimeDays: number | null;
  available: boolean;
  validUntil: string | null;
  notes: string | null;
  items: (Material & { unitPrice: string | number })[];
  purchaseOrder?: { id: string } | null;
};
export type ProcurementRequest = {
  id: string;
  orderId?: string | null;
  requestNumber: string;
  status: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryState?: string | null;
  deliveryPincode: string;
  items: Material[];
  supplierQuotes: SupplierQuote[];
  purchaseOrders: (RevisablePurchaseOrder & {
    id: string;
    purchaseOrderNumber: string;
    totalAmount: string;
    status: string;
  })[];
};
type Request = <T>(path: string, method?: string, body?: unknown) => Promise<T>;
type Props = {
  record: ProcurementRequest;
  request: Request;
  busy: boolean;
  mutate: (path: string, method: string, body: unknown) => Promise<boolean>;
  download: (path: string, filename: string) => Promise<void>;
};
const money = (value: string | number) =>
  `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const expired = (quote: SupplierQuote) =>
  Boolean(quote.validUntil && new Date(quote.validUntil) <= new Date());
const procurementStages = [
  "Find suppliers",
  "Compare quotes",
  "Approve purchase",
  "PO issued",
];
const statusLabel: Record<string, string> = {
  OPEN: "Needs supplier match",
  COMPARING: "Compare supplier quotes",
  APPROVAL_PENDING: "Awaiting PO approval",
  APPROVED: "Purchase approved",
  ORDERED: "PO issued",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};
const stageForStatus: Record<string, number> = {
  OPEN: 0,
  COMPARING: 1,
  APPROVAL_PENDING: 2,
  APPROVED: 3,
  ORDERED: 3,
  RECEIVED: 4,
};

export default function ProcurementRequestCard({
  record,
  request,
  busy,
  mutate,
  download,
}: Props) {
  const [candidates, setCandidates] = useState<Supplier[]>([]);
  const [matchSummary, setMatchSummary] = useState<MatchSummary | null>(null);
  const [matching, setMatching] = useState(false);
  const [matched, setMatched] = useState(false);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<SupplierQuote | null>(null);
  const [sort, setSort] = useState("price");
  const quotes = [...record.supplierQuotes].sort((a, b) =>
    sort === "lead"
      ? (a.leadTimeDays ?? Infinity) - (b.leadTimeDays ?? Infinity)
      : Number(a.totalAmount) - Number(b.totalAmount),
  );
  async function match() {
    setMatching(true);
    setMatched(false);
    setCandidates([]);
    setMatchSummary(null);
    setError("");
    setMatchDialogOpen(true);
    try {
      const result = await request<{ candidates: Supplier[] } & MatchSummary>(
        `/procurement/${record.id}/suppliers`,
      );
      setCandidates(result.candidates);
      setMatchSummary(result);
      setMatched(true);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setMatching(false);
    }
  }
  async function saveQuote(
    event: FormEvent<HTMLFormElement>,
    supplierId: string,
  ) {
    event.preventDefault();
    const element = event.currentTarget;
    const data = new FormData(element);
    const invalidPrice = record.items.find((item, index) => {
      const quantity = Number(data.get(`quantity-${index}`));
      const unitPrice = Number(data.get(`price-${index}`));
      return quantity > 0 && (!Number.isFinite(unitPrice) || unitPrice <= 0);
    });
    if (invalidPrice) {
      setError(`Enter a confirmed price greater than ₹0 for ${invalidPrice.productName}, or set its offered quantity to zero.`);
      return;
    }
    const hasQuotedLine = record.items.some((_, index) => Number(data.get(`quantity-${index}`)) > 0);
    if (!hasQuotedLine) {
      setError("Enter a positive quantity for at least one product this supplier carries.");
      return;
    }
    setError("");
    const items = record.items.flatMap((item, index) => {
      const quantity = Number(data.get(`quantity-${index}`));
      const unitPrice = Number(data.get(`price-${index}`));
      if (!Number.isFinite(quantity) || quantity <= 0) return [];
      return [{ ...item, quantity, unitPrice }];
    });
    const totalAmount = items.reduce(
      (total, item) => total + item.quantity * item.unitPrice,
      0,
    );
    const saved = await mutate(`/procurement/${record.id}/quotes`, "POST", {
      supplierId,
      items,
      totalAmount,
      leadTimeDays: Number(data.get("lead")),
      available: data.get("available") === "on",
      notes: String(data.get("notes") || ""),
      validUntil: data.get("validUntil")
        ? new Date(String(data.get("validUntil"))).toISOString()
        : undefined,
    });
    if (saved) element.reset();
  }
  function quoteQuantityForLine(quote: SupplierQuote, item: Material) {
    return quote.items.reduce(
      (sum, quotedItem) => sum + (sameMaterialLine(quotedItem, item) ? Number(quotedItem.quantity) : 0),
      0,
    );
  }
  async function createPo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const data = new FormData(event.currentTarget);
    const saved = await mutate("/purchase-orders", "POST", {
      supplierQuoteId: selected.id,
      shippingAddress: data.get("address"),
      shippingContact: data.get("contact"),
      taxAmount: Number(data.get("tax")),
      freightAmount: Number(data.get("freight")),
      notes: data.get("notes") || undefined,
    });
    if (saved) setSelected(null);
  }
  return (
    <article className="business-record bc-record-block procurement-request-card">
      <div className="procurement-request-heading">
        <div className="procurement-request-title-row">
          <h3>{record.requestNumber}</h3>
          <span className={`procurement-request-status procurement-status-${record.status.toLowerCase()}`}>
            {statusLabel[record.status] || record.status.replaceAll("_", " ")}
          </span>
        </div>
        <p>
          {record.deliveryAddress} · {record.deliveryCity}{record.deliveryState ? `, ${record.deliveryState}` : ""} · PIN{" "}
          {record.deliveryPincode}
        </p>
        <span className="procurement-request-origin">
          {record.orderId ? "Linked to confirmed customer order" : "Manual purchase request"}
        </span>
      </div>
      {record.status !== "CANCELLED" && (
        <ol className="procurement-request-stages" aria-label="Procurement progress">
          {procurementStages.map((stage, index) => {
            const currentStage = stageForStatus[record.status] ?? 0;
            return (
              <li
                key={stage}
                className={index < currentStage ? "complete" : index === currentStage ? "current" : ""}
              >
                <span>{index < currentStage ? "✓" : index + 1}</span>{stage}
              </li>
            );
          })}
        </ol>
      )}
      <ul className="procurement-request-items">
        {record.items.map((item, index) => (
          <li key={index}>
            <strong>{item.productName}</strong>
            <span>
              {item.brand ? `${item.brand} · ` : ""}
              {item.quantity} {item.unit}
            </span>
            {item.notes && <small>{item.notes}</small>}
          </li>
        ))}
      </ul>
      <button
        className="bc-button procurement-match-button"
        disabled={busy || matching}
        onClick={() => void match()}
      >
        {matching ? "Finding suppliers…" : "Match suppliers"}
      </button>
      {matchDialogOpen && createPortal(
        <div className="procurement-match-overlay">
          <section
            className="procurement-match-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`procurement-match-title-${record.id}`}
          >
            <header className="procurement-match-header">
              <div>
                <span>SUPPLIER SOURCING</span>
                <h2 id={`procurement-match-title-${record.id}`}>Match suppliers</h2>
                <p>{record.requestNumber} · {record.deliveryCity} · PIN {record.deliveryPincode}</p>
                <p className="procurement-match-explainer">
                  Location percentages use recorded PIN, service area, city, and state details; they are not distance estimates.
                </p>
              </div>
              <button
                type="button"
                className="bc-button procurement-match-close"
                aria-label="Close supplier matching"
                onClick={() => setMatchDialogOpen(false)}
              >
                <X size={19} aria-hidden="true" />
              </button>
            </header>
            <div className="procurement-match-body">
              {matching && <p className="procurement-match-status" role="status">Finding active suppliers for these materials…</p>}
              {error && <p className="procurement-match-error" role="alert">{error}</p>}
              {matchSummary && !matching && (
                <>
                  <div className="procurement-rfq-disclaimer">
                    <strong>Suggestions from saved records only</strong>
                    <span>{matchSummary.disclaimer}</span>
                  </div>
                  <section className="procurement-rfq-coverage" aria-label="Recorded quantity coverage">
                    <h3>Requested quantity coverage</h3>
                    {matchSummary.requestedItems.map((item, index) => (
                      <p key={`${item.productName}-${index}`}>
                        <strong>{item.productName}{item.brand ? ` · ${item.brand}` : ""}</strong>
                        <span>{item.knownFreshCapacity > 0 ? `${item.knownFreshCapacity} ${item.unit} in records checked within 30 days · ${item.quantity} ${item.unit} requested` : `${item.quantity} ${item.unit} requested · no recent nearby stock quantity recorded`}</span>
                        <em className={`coverage-${item.coverage}`}>{item.coverage === "covered" ? "Recorded allocation possible" : item.coverage === "partial" ? "Partial recorded allocation" : item.coverage === "minimum-order" ? "No quantity meets recorded minimums" : item.coverage === "none" ? "No recent available quantity recorded" : item.coverage === "unknown" ? "Availability unknown or outdated" : "No matching supplier listing"}</em>
                        {item.allocationSuggestions.length > 0 && <small>Possible split, for staff to confirm: {item.allocationSuggestions.map((allocation) => `${allocation.supplierName} ${allocation.quantity} ${item.unit}`).join(" + ")}</small>}
                        {item.outsideRecordedAreaCount ? <small>{item.outsideRecordedAreaCount} matching listing(s) are outside recorded nearby/service-area coverage and excluded from this coverage estimate.</small> : null}
                        {item.minimumOrderBlockedCount ? <small>{item.minimumOrderBlockedCount} potential listing(s) could not be allocated because the remaining amount is below their recorded minimum order.</small> : null}
                        {item.minimumOrderUnknownCount ? <small>{item.minimumOrderUnknownCount} matching listing(s) have no minimum-order quantity recorded; verify before allocating.</small> : null}
                      </p>
                    ))}
                  </section>
                </>
              )}
              {!matching && matched && !candidates.length && (
                <div className="procurement-match-empty">
                  <strong>No active suppliers match these materials.</strong>
                  <p>Review the supplier catalogue or update supplier product listings, then try matching again.</p>
                </div>
              )}
              {candidates.map((supplier) => (
                <details key={supplier.id} className="procurement-candidate">
                  <summary>
                    {supplier.name} · {supplier.matchedItems.join(", ")} ·{" "}
                    {supplier.locationMatchPercent}% recorded location score · {supplier.locationMatchLabel}{supplier.locationMatchPercent < 60 ? " · outside nearby coverage estimate" : ""}{" "}
                    ·{" "}
                    {supplier.averageScore == null
                      ? "No ratings"
                      : `${supplier.averageScore.toFixed(1)}/5`}
                  </summary>
                  {(supplier.city || supplier.pincode || supplier.servicePincodes?.length) && (
                    <p>
                      Supplier location: {[supplier.city, supplier.state].filter(Boolean).join(", ") || "Not recorded"}
                      {supplier.pincode ? ` · PIN ${supplier.pincode}` : ""}
                    </p>
                  )}
                  <p>Supplier record last updated: {supplier.supplierUpdatedAt ? new Date(supplier.supplierUpdatedAt).toLocaleString("en-IN") : "Not recorded"}{supplier.missingServiceArea ? " · Service PINs are not recorded" : ""}</p>
                  {supplier.servicePincodes?.length ? (
                    <div className="procurement-service-area-block">
                      <strong>Service area</strong>
                      <ServiceAreaPincodes pincodes={supplier.servicePincodes} className="procurement-service-areas" />
                    </div>
                  ) : <p>No service PINs recorded.</p>}
                  {supplier.matchedProducts?.map((product) => (
                    <p key={`${product.productName}-${product.brand}-${product.unit}`}>
                      Supplier listing: {product.productName} · {product.brand || "Brand unspecified"} · {product.category} · Available: {product.availableQuantity == null ? "Unknown" : `${product.availableQuantity} ${product.unit}`}
                      {product.availabilityStatus === "outdated" ? " · STOCK DATA OUTDATED (over 30 days)" : product.availabilityStatus === "unknown" ? " · Stock not checked / quantity unknown" : ` · checked ${new Date(product.availabilityCheckedAt!).toLocaleString("en-IN")}`}
                      {product.minimumOrderQty != null ? ` · Minimum order ${product.minimumOrderQty} ${product.unit}` : " · Minimum order not recorded"}
                      {product.availabilityStatus === "recently-checked" ? ` · Suggested amount from recorded stock: ${product.suggestedAllocationQuantity} ${product.unit}` : " · Not included in stock allocation because availability is not current"}
                      {product.lastQuotedPrice != null
                        ? ` · Last recorded price ₹${Number(product.lastQuotedPrice).toLocaleString("en-IN")}/${product.unit} · ${priceRecency(product.lastQuotedPriceAt)} (verify directly; not a current quote)`
                        : " · Price not recorded"}
                      {product.listingUpdatedAt ? ` · Listing updated ${new Date(product.listingUpdatedAt).toLocaleDateString("en-IN")}` : ""}
                    </p>
                  ))}
                  <form
                    className="bc-fields"
                    onSubmit={(event) => void saveQuote(event, supplier.id)}
                  >
                    <p className="procurement-confirmation-note">
                      Record a supplier quote only after your team has contacted the supplier and confirmed the details. Saving here does not contact the supplier or confirm an order.
                    </p>
                    <fieldset className="bc-fields">
                      <legend>Supplier's item prices and available quantities</legend>
                      {(supplier.matchedProducts ?? []).map((product) => {
                        const index = product.requestedItemIndex;
                        const item = record.items[index];
                        if (!item) return null;
                        const committedQuotes = quotes
                          .filter((quote) => quote.supplier.id !== supplier.id && quote.available && !expired(quote) && !quote.purchaseOrder)
                          .reduce((sum, quote) => sum + quoteQuantityForLine(quote, item), 0);
                        const committedOrders = record.purchaseOrders
                          .filter((order) => order.status !== "CANCELLED")
                          .reduce((sum, order) => sum + (order.items ?? []).reduce((lineTotal, line) =>
                            lineTotal + (sameMaterialLine(line, item) ? Number(line.quantity) : 0), 0), 0);
                        const otherCommitted = committedQuotes + committedOrders;
                        const ownQuote = quotes.find((quote) => quote.supplier.id === supplier.id);
                        const remaining = Math.max(0, item.quantity - otherCommitted);
                        const ownQuantity = ownQuote ? quoteQuantityForLine(ownQuote, item) : 0;
                        const initialQuantity = ownQuantity > 0
                          ? Math.min(ownQuantity, remaining)
                          : Math.min(product.suggestedAllocationQuantity, remaining);
                        return (
                          <div className="business-candidate" key={`${item.catalogVariantId || item.productName}-${index}`}>
                            <strong>
                              {item.productName}
                              {item.brand ? ` · ${item.brand}` : ""} · source shortfall {item.quantity} {item.unit}
                              {item.requiredQuantity != null && <> · total need {item.requiredQuantity} {item.unit}</>}
                              {item.clientStockQuantity != null && <> · client stock {item.clientStockQuantity} {item.unit}</>}
                            </strong>
                            <small>{otherCommitted > 0 ? `${otherCommitted} ${item.unit} already quoted by other suppliers · ` : ""}{remaining} {item.unit} remaining for this supplier quote</small>
                            <label>
                              Quantity offered ({item.unit})
                              <input name={`quantity-${index}`} type="number" min="0" max={remaining} step="any" defaultValue={initialQuantity} />
                            </label>
                            <label>
                              Confirmed unit price (₹/{item.unit})
                              <input name={`price-${index}`} type="number" min="0.01" step="0.01" defaultValue="" />
                            </label>
                          </div>
                        );
                      })}
                      <small>
                        Only matching listed products are included. Stock-based quantities are suggestions; confirm them with the supplier. Combined supplier quotes cannot exceed the customer’s requested quantity.
                      </small>
                    </fieldset>
                    <label>
                      Lead time (days)
                      <input
                        name="lead"
                        type="number"
                        min="0"
                        max="365"
                        step="1"
                        required
                      />
                    </label>
                    <label>
                      Valid until
                      <input name="validUntil" type="datetime-local" />
                    </label>
                    <label>
                      Supplier quote notes
                      <input name="notes" maxLength={5000} />
                    </label>
                    <label className="bc-check">
                      <input name="available" type="checkbox" />
                      Supplier confirmed these materials are available
                    </label>
                    <button className="bc-button" disabled={busy}>
                      Save supplier quote
                    </button>
                  </form>
                </details>
              ))}
            </div>
            <footer className="procurement-match-footer">
              <button type="button" className="bc-button" onClick={() => setMatchDialogOpen(false)}>Close</button>
            </footer>
          </section>
        </div>,
        document.body,
      )}
      <h4>Supplier quote comparison</h4>
      {!quotes.length ? (
        <p>No supplier quotes recorded yet.</p>
      ) : (
        <>
          <label>
            Compare supplier quotes by
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="price">Total price</option>
              <option value="lead">Lead time</option>
            </select>
          </label>
          <div className="procurement-table">
            <table>
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Total</th>
                  <th>Lead time</th>
                  <th>Availability / validity</th>
                  <th>Selection</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((quote) => (
                  <tr key={quote.id}>
                    <td>
                      <strong>{quote.supplierQuoteNumber}</strong>
                      <p>{quote.supplier.name}</p>
                      <ul>
                        {quote.items.map((item, index) => (
                          <li key={`${item.productName}-${index}`}>
                            {item.productName}: {item.quantity} {item.unit} at{" "}
                            {money(item.unitPrice)}/{item.unit}
                          </li>
                        ))}
                      </ul>
                      {quote.notes && <p>{quote.notes}</p>}
                    </td>
                    <td>{money(quote.totalAmount)}</td>
                    <td>
                      {quote.leadTimeDays == null
                        ? "Not specified"
                        : `${quote.leadTimeDays} days`}
                    </td>
                    <td>
                      {!quote.available
                        ? "Unavailable"
                        : expired(quote)
                          ? "Expired"
                          : "Available"}
                      {quote.validUntil && (
                        <p>
                          Until{" "}
                          {new Date(quote.validUntil).toLocaleString("en-IN")}
                        </p>
                      )}
                    </td>
                    <td>
                      {quote.purchaseOrder ? (
                        "PO created"
                      ) : (
                        <button
                          className="bc-button"
                          disabled={busy || !quote.available || expired(quote)}
                          onClick={() => setSelected(quote)}
                        >
                          Review purchase order for {quote.supplier.name}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {selected && (
        <form
          className="bc-form"
          key={selected.id}
          onSubmit={(event) => void createPo(event)}
        >
          <h4>Purchase order · {selected.supplier.name}</h4>
          <p>
            Supplier subtotal {money(selected.totalAmount)}. This PO will cover{" "}
            {selected.items
              .map(
                (item) => `${item.productName} (${item.quantity} ${item.unit})`,
              )
              .join(", ")}
            .
          </p>
          <div className="bc-fields">
            <label>
              Shipping address
              <input
                name="address"
                required
                minLength={2}
                maxLength={500}
                defaultValue={record.deliveryAddress}
              />
            </label>
            <label>
              Shipping contact
              <input
                name="contact"
                required
                minLength={10}
                maxLength={100}
                defaultValue={selected.supplier.phone}
              />
            </label>
            <label>
              PO tax amount (₹)
              <input
                name="tax"
                type="number"
                min="0"
                step="0.01"
                defaultValue="0"
                required
              />
            </label>
            <label>
              PO freight amount (₹)
              <input
                name="freight"
                type="number"
                min="0"
                step="0.01"
                defaultValue="0"
                required
              />
            </label>
            <label>
              PO notes
              <textarea name="notes" maxLength={5000} />
            </label>
          </div>
          <button className="bc-primary" disabled={busy}>
            Create purchase order
          </button>
          <button
            type="button"
            className="bc-button"
            onClick={() => setSelected(null)}
          >
            Cancel PO review
          </button>
        </form>
      )}
      {record.purchaseOrders.map((po) => (
        <div className="business-candidate" key={po.id}>
          <strong>
            {po.purchaseOrderNumber} · Revision {po.revisionNumber || 1} ·{" "}
            {money(po.totalAmount)} · {po.status}
          </strong>
          <ul>
            {Array.isArray(po.items) &&
              po.items.map((item, index) => (
                <li key={`${item.productName}-${index}`}>
                  {item.productName}: {item.quantity} {item.unit}
                </li>
              ))}
          </ul>
          <button
            className="bc-button"
            onClick={() =>
              void download(
                `/purchase-orders/${po.id}/pdf`,
                `${po.purchaseOrderNumber}.pdf`,
              )
            }
          >
            Download PO PDF
          </button>
          {["DRAFT", "PENDING_APPROVAL", "APPROVED", "SENT"].includes(
            po.status,
          ) && <PurchaseOrderRevision order={po} busy={busy} mutate={mutate} />}
          {po.status === "DRAFT" && (
            <button
              className="bc-button"
              disabled={busy}
              onClick={() =>
                void mutate(`/purchase-orders/${po.id}/approve`, "POST", {})
              }
            >
              Approve PO
            </button>
          )}
          {po.status === "APPROVED" && (
            <button
              className="bc-button"
              disabled={busy}
              onClick={() =>
                void mutate(`/purchase-orders/${po.id}/send`, "POST", {})
              }
            >
              Send PO to supplier
            </button>
          )}
        </div>
      ))}
    </article>
  );
}

function sameMaterialLine(a: Material, b: Material) {
  const normalize = (value?: string) => (value || "").trim().toLocaleLowerCase("en-IN");
  return normalize(a.productName) === normalize(b.productName) &&
    normalize(a.brand) === normalize(b.brand) &&
    normalize(a.category) === normalize(b.category) &&
    normalize(a.unit) === normalize(b.unit) &&
    (!a.catalogVariantId || !b.catalogVariantId || a.catalogVariantId === b.catalogVariantId);
}

function priceRecency(timestamp: string | null) {
  if (!timestamp) return "price record date unknown";
  const days = Math.floor((Date.now() - new Date(timestamp).getTime()) / (24 * 60 * 60 * 1000));
  if (!Number.isFinite(days) || days < 0) return "price record date invalid";
  return days > 30 ? `price data outdated (${days} days old)` : `price recorded ${days} days ago`;
}
