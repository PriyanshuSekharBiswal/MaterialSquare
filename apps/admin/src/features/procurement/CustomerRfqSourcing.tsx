import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type RfqItem = { material: string; brand?: string; category?: string; quantity: number; unit: string; specification?: string };
type CustomerRfq = { id: string; requestNumber: string; siteLocation: string; deliveryCity: string; deliveryPincode: string; locationParsed: boolean; items: RfqItem[]; status: string; createdAt: string; matchSummary: { matchedSupplierCount: number; requestedItems: { productName: string; coverage: "no-listing" | "unknown" | "none" | "minimum-order" | "partial" | "covered"; outsideRecordedAreaCount?: number }[] } | null };
type MatchProduct = { productName: string; brand: string; category: string; unit: string; availableQuantity: string | number | null; availabilityCheckedAt: string | null; availabilityStatus: "unknown" | "outdated" | "recently-checked"; availableFreshQuantity: number | null; suggestedAllocationQuantity: number; quantityCoverage: "unknown" | "enough-recorded" | "partial-recorded"; minimumOrderQty: string | number | null; lastQuotedPrice: string | number | null; lastQuotedPriceAt: string | null; listingUpdatedAt: string | null; requestedQuantity: number };
type Candidate = { id: string; name: string; city: string; state: string; pincode: string; servicePincodes: string[]; supplierUpdatedAt: string | null; missingServiceArea: boolean; averageScore: number | null; matchedProducts: MatchProduct[]; locationMatchPercent: number; locationMatchLabel: string };
type Suggestions = { candidates: Candidate[]; requestedItems: { productName: string; brand?: string; unit: string; quantity: number; matchedSupplierCount: number; knownFreshCapacity: number; allocationQuantity?: number; outsideRecordedAreaCount?: number; minimumOrderBlockedCount?: number; minimumOrderUnknownCount?: number; coverage: "no-listing" | "unknown" | "none" | "minimum-order" | "partial" | "covered"; allocationSuggestions: { supplierName: string; quantity: number }[] }[]; disclaimer: string };
type Request = <T>(path: string) => Promise<T>;

export default function CustomerRfqSourcing({ request, onPrepareCustomerQuote }: { request: Request; onPrepareCustomerQuote?: (rfqId: string) => void }) {
  const [rfqs, setRfqs] = useState<CustomerRfq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState<CustomerRfq | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [matching, setMatching] = useState(false);
  const [matchError, setMatchError] = useState("");

  useEffect(() => {
    let mounted = true;
    void request<CustomerRfq[]>("/procurement/customer-rfqs")
      .then((records) => { if (mounted) setRfqs(records); })
      .catch((cause: unknown) => { if (mounted) setError(cause instanceof Error ? cause.message : "Customer requests could not be loaded."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [request]);

  async function showSuggestions(rfq: CustomerRfq) {
    setActive(rfq);
    setSuggestions(null);
    setMatchError("");
    setMatching(true);
    try {
      setSuggestions(await request<Suggestions>(`/procurement/customer-rfqs/${rfq.id}/suppliers`));
    } catch (cause) {
      setMatchError(cause instanceof Error ? cause.message : "Supplier suggestions could not be calculated.");
    } finally {
      setMatching(false);
    }
  }

  return <section className="customer-rfq-sourcing" aria-labelledby="customer-rfq-sourcing-title">
    <div className="procurement-subsection-heading">
      <div><h3 id="customer-rfq-sourcing-title">Customer quotation requests</h3><p>Review supplier suggestions for incoming RFQs. Suggestions never confirm stock, price, or delivery.</p></div>
      <span className="procurement-request-count">{rfqs.length} requests</span>
    </div>
    {loading ? <p role="status">Loading customer requests…</p> : error ? <p className="procurement-rfq-error" role="alert">{error}</p> : rfqs.length === 0 ? <p>No open customer requests need sourcing.</p> :
      <div className="customer-rfq-sourcing-list">{rfqs.map((rfq) => <article className="customer-rfq-sourcing-card" key={rfq.id}>
        <div><strong>{rfq.requestNumber}</strong><span className="procurement-request-status">{rfq.status}</span><p>{rfq.siteLocation}</p><ul>{rfq.items.map((item, index) => <li key={`${item.material}-${index}`}>{item.material}{item.brand ? ` · ${item.brand}` : ""} — {item.quantity} {item.unit}</li>)}</ul>{rfq.matchSummary && <small className="customer-rfq-match-summary">Automatic catalogue comparison: {rfq.matchSummary.matchedSupplierCount} supplier{rfq.matchSummary.matchedSupplierCount === 1 ? "" : "s"} match at least one item · {rfq.matchSummary.requestedItems.filter((item) => item.coverage === "covered").length}/{rfq.matchSummary.requestedItems.length} items have full recent coverage within recorded nearby/service locations. Check each suggestion before offering.</small>}</div>
        <button type="button" className="bc-button" disabled={!rfq.locationParsed || !rfq.items.length} onClick={() => void showSuggestions(rfq)}>Find supplier suggestions</button>
      </article>)}</div>}

    {active && createPortal(<div className="procurement-match-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) event.preventDefault(); }}>
      <section className="procurement-match-dialog customer-rfq-suggestions-dialog" role="dialog" aria-modal="true" aria-labelledby="customer-rfq-suggestions-title">
        <header className="procurement-match-header"><div><span>STAFF SOURCING SUGGESTIONS</span><h2 id="customer-rfq-suggestions-title">{active.requestNumber}</h2><p>{active.deliveryCity || "City not parsed"} · PIN {active.deliveryPincode || "Not recorded"}</p><p className="procurement-match-explainer">Suggestions use database records only. Contact suppliers and confirm all terms manually before preparing a customer quotation. Location percentages are match tiers from saved PIN, service-area, and city data, not distance estimates.</p></div><button type="button" className="bc-button procurement-match-close" aria-label="Close supplier suggestions" onClick={() => setActive(null)}><X size={18} aria-hidden="true" /></button></header>
        <div className="procurement-match-body">
          {matching && <p role="status">Comparing the request with active supplier listings…</p>}
          {matchError && <p className="procurement-match-error" role="alert">{matchError}</p>}
          {suggestions && <>
            <div className="procurement-rfq-disclaimer"><strong>Not a supplier offer</strong><span>{suggestions.disclaimer}</span></div>
            <section className="procurement-rfq-coverage"><h3>Requested quantity coverage</h3>{suggestions.requestedItems.map((item, index) => <p key={`${item.productName}-${index}`}><strong>{item.productName}{item.brand ? ` · ${item.brand}` : ""}</strong><span>{item.knownFreshCapacity > 0 ? `${item.knownFreshCapacity} ${item.unit} in records checked within 30 days · ${item.quantity} ${item.unit} requested` : `${item.quantity} ${item.unit} requested · no recent nearby stock quantity recorded`}</span><em className={`coverage-${item.coverage}`}>{item.coverage === "covered" ? "Recorded allocation possible" : item.coverage === "partial" ? "Partial recorded allocation" : item.coverage === "minimum-order" ? "No quantity meets recorded minimums" : item.coverage === "none" ? "No recent available quantity recorded" : item.coverage === "unknown" ? "Availability unknown or outdated" : "No supplier listing"}</em>{item.allocationSuggestions.length > 0 && <small>Possible split, for staff to confirm: {item.allocationSuggestions.map((allocation) => `${allocation.supplierName} ${allocation.quantity} ${item.unit}`).join(" + ")}</small>}{item.outsideRecordedAreaCount ? <small>{item.outsideRecordedAreaCount} matching listing(s) are outside recorded nearby/service-area coverage. Staff can still contact them, but they are excluded from this coverage estimate.</small> : null}{item.minimumOrderBlockedCount ? <small>{item.minimumOrderBlockedCount} listing(s) could not be allocated because the remaining amount is below their recorded minimum order.</small> : null}{item.minimumOrderUnknownCount ? <small>{item.minimumOrderUnknownCount} nearby listing(s) have no recorded minimum; verify before allocating.</small> : null}</p>)}</section>
            {!suggestions.candidates.length ? <div className="procurement-match-empty"><strong>No active supplier product listings match these items.</strong><p>Review supplier records and add accurate product listings or delivery coverage, then run suggestions again.</p></div> : suggestions.candidates.map((supplier) => <article className="procurement-rfq-candidate" key={supplier.id}>
              <header><div><strong>{supplier.name}</strong><span>{supplier.city}, {supplier.state} · {supplier.locationMatchLabel} ({supplier.locationMatchPercent}% recorded location score){supplier.locationMatchPercent < 60 ? " · outside nearby coverage estimate" : ""}</span></div><span>{supplier.averageScore == null ? "No recorded ratings" : `${supplier.averageScore.toFixed(1)}/5 recorded rating`}</span></header>
              <p className="procurement-rfq-location-data">Supplier base PIN: {supplier.pincode || "Not recorded"} · Service PINs: {supplier.servicePincodes.length ? supplier.servicePincodes.join(", ") : "Not recorded"} · Supplier record updated: {supplier.supplierUpdatedAt ? new Date(supplier.supplierUpdatedAt).toLocaleDateString("en-IN") : "Not recorded"}</p>
              {supplier.matchedProducts.map((product, index) => <div className="procurement-rfq-product" key={`${product.productName}-${product.brand}-${product.unit}-${index}`}><strong>{product.productName} · {product.brand || "Brand not recorded"} · {product.category} · {product.unit}</strong><span>Requested: {product.requestedQuantity} {product.unit} · Listed availability: {product.availableQuantity == null ? "Unknown" : `${product.availableQuantity} ${product.unit}`}{product.minimumOrderQty != null ? ` · Minimum order: ${product.minimumOrderQty} ${product.unit}` : " · Minimum order: not recorded"}{product.availabilityStatus === "recently-checked" ? ` · Suggested amount from recorded stock: ${product.suggestedAllocationQuantity} ${product.unit}` : ""}</span><span className={`freshness-${product.availabilityStatus}`}>{product.availabilityStatus === "unknown" ? "Availability not checked or quantity unknown" : product.availabilityStatus === "outdated" ? "Availability record is over 30 days old; not used for coverage" : `Availability checked ${new Date(product.availabilityCheckedAt!).toLocaleDateString("en-IN")}`}{product.lastQuotedPrice != null ? ` · Last recorded price ₹${Number(product.lastQuotedPrice).toLocaleString("en-IN")}/${product.unit} · ${priceRecency(product.lastQuotedPriceAt)} (verify directly; not a current quote)` : " · Price not recorded"}{product.listingUpdatedAt ? ` · Listing updated ${new Date(product.listingUpdatedAt).toLocaleDateString("en-IN")}` : ""}</span></div>)}
            </article>)}
          </>}
        </div><footer className="procurement-match-footer">{onPrepareCustomerQuote && <button type="button" className="bc-primary" disabled={matching || !suggestions} onClick={() => { const rfqId = active.id; setActive(null); onPrepareCustomerQuote(rfqId); }}>Prepare customer quotation</button>}<button type="button" className="bc-button" onClick={() => setActive(null)}>Close</button></footer>
      </section>
    </div>, document.body)}
  </section>;
}

function priceRecency(timestamp: string | null) {
  if (!timestamp) return "price record date unknown";
  const days = Math.floor((Date.now() - new Date(timestamp).getTime()) / (24 * 60 * 60 * 1000));
  if (!Number.isFinite(days) || days < 0) return "price record date invalid";
  return days > 30 ? `price data outdated (${days} days old)` : `price recorded ${days} days ago`;
}
