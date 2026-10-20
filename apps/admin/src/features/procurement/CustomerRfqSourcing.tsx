import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";
import { formatQuantityUnit } from "../../quantity-format";
import { formatEnumLabel } from "../../utils/formatEnumLabel";

type RfqItem = {
  material: string;
  brand?: string;
  category?: string;
  quantity: number;
  unit: string;
  specification?: string;
};
type QuotationItem = {
  productName: string;
  brandName: string;
  categoryName: string;
  quantityMt: string | number;
  unit: string;
  specification: string;
  options: {
    productName: string;
    brandName: string;
    categoryName: string;
    quantityMt: string | number;
    unit: string;
    specification: string;
  }[];
};
type CustomerQuotation = {
  id: string;
  quoteNumber: string;
  status: string;
  totalAmount: string | number;
  sitePincode: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  revisionNumber: number;
  items: QuotationItem[];
};
type CustomerRfq = {
  id: string;
  requestNumber: string;
  siteLocation: string;
  deliveryCity: string;
  deliveryPincode: string;
  locationParsed: boolean;
  items: RfqItem[];
  status: string;
  createdAt: string;
  quotations: CustomerQuotation[];
  matchSummary: {
    matchedSupplierCount: number;
    requestedItems: {
      productName: string;
      coverage: "no-listing" | "unknown" | "none" | "minimum-order" | "partial" | "covered";
      outsideRecordedAreaCount?: number;
    }[];
  } | null;
};
type MatchProduct = {
  productName: string;
  brand: string;
  category: string;
  unit: string;
  availableQuantity: string | number | null;
  availabilityCheckedAt: string | null;
  availabilityStatus: "unknown" | "outdated" | "recently-checked";
  availableFreshQuantity: number | null;
  suggestedAllocationQuantity: number;
  quantityCoverage: "unknown" | "enough-recorded" | "partial-recorded";
  minimumOrderQty: string | number | null;
  lastQuotedPrice: string | number | null;
  lastQuotedPriceAt: string | null;
  listingUpdatedAt: string | null;
  requestedQuantity: number;
};
type Candidate = {
  id: string;
  name: string;
  city: string;
  state: string;
  pincode: string;
  servicePincodes: string[];
  supplierUpdatedAt: string | null;
  missingServiceArea: boolean;
  averageScore: number | null;
  matchedProducts: MatchProduct[];
  locationMatchPercent: number;
  locationMatchLabel: string;
};
type Suggestions = {
  candidates: Candidate[];
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
  disclaimer: string;
};
type Request = <T>(path: string) => Promise<T>;

const isApproved = (quotation: CustomerQuotation) =>
  ["ACCEPTED", "CONVERTED_TO_ORDER"].includes(quotation.status);

function preserveCardPosition(card: Element | null) {
  if (!card) return;
  const cardTop = card.getBoundingClientRect().top;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.scrollBy(0, card.getBoundingClientRect().top - cardTop);
  }));
}

function quotationItems(quotation: CustomerQuotation): RfqItem[] {
  return quotation.items.flatMap((item) => [
    {
      material: item.productName,
      brand: item.brandName,
      category: item.categoryName,
      quantity: Number(item.quantityMt),
      unit: item.unit,
      specification: item.specification,
    },
    ...item.options.map((option) => ({
      material: option.productName,
      brand: option.brandName,
      category: option.categoryName,
      quantity: Number(option.quantityMt),
      unit: option.unit,
      specification: option.specification,
    })),
  ]).filter((item) => item.material && item.quantity > 0 && Number.isFinite(item.quantity));
}

function quotationSummary(quotation: CustomerQuotation) {
  const items = quotationItems(quotation);
  return items;
}

export default function CustomerRfqSourcing({ request }: { request: Request }) {
  const [rfqs, setRfqs] = useState<CustomerRfq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState<CustomerRfq | null>(null);
  const [activeQuotation, setActiveQuotation] = useState<CustomerQuotation | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [matching, setMatching] = useState(false);
  const [matchError, setMatchError] = useState("");
  const matchSequence = useRef(0);

  useEffect(() => {
    let mounted = true;
    void request<CustomerRfq[]>("/procurement/customer-rfqs")
      .then((records) => { if (mounted) setRfqs(records); })
      .catch((cause: unknown) => {
        if (mounted) setError(cause instanceof Error ? cause.message : "Customer requests could not be loaded.");
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [request]);

  async function showSuggestions(rfq: CustomerRfq, quotation: CustomerQuotation | null = null) {
    const sequence = ++matchSequence.current;
    setActive(rfq);
    setActiveQuotation(quotation);
    setSuggestions(null);
    setMatchError("");
    setMatching(true);
    const path = quotation
      ? `/procurement/customer-quotations/${quotation.id}/suppliers`
      : `/procurement/customer-rfqs/${rfq.id}/suppliers`;
    try {
      const result = await request<Suggestions>(path);
      if (sequence === matchSequence.current) setSuggestions(result);
    } catch (cause) {
      if (sequence === matchSequence.current) setMatchError(cause instanceof Error ? cause.message : "Supplier suggestions could not be calculated.");
    } finally {
      if (sequence === matchSequence.current) setMatching(false);
    }
  }

  function closeActive() {
    matchSequence.current += 1;
    setMatching(false);
    setActive(null);
    setActiveQuotation(null);
    setSuggestions(null);
  }

  const activeItems = activeQuotation ? quotationItems(activeQuotation) : active?.items ?? [];
  if (active) return <section className="customer-rfq-page" aria-labelledby="customer-rfq-sourcing-title">
    <button type="button" className="procurement-back-link admin-back-button" onClick={closeActive}>
      <ArrowLeft size={16} aria-hidden="true" /> Back to customer requests
    </button>
    <header className="procurement-page-header">
      <div>
        <span className="procurement-eyebrow">
          {activeQuotation ? "CUSTOMER QUOTATION · SUPPLIER SOURCING" : "ORIGINAL CUSTOMER REQUEST · SUPPLIER SOURCING"}
        </span>
        <h2 id="customer-rfq-sourcing-title">{active.requestNumber}</h2>
        <p>{activeQuotation ? `${activeQuotation.quoteNumber} · Revision ${activeQuotation.revisionNumber || 1}` : active.siteLocation}</p>
      </div>
      <span className="procurement-request-status">{formatEnumLabel(activeQuotation?.status || active.status)}</span>
    </header>
    <section className="procurement-rfq-request-items">
      <h3>{activeQuotation ? "Quotation products" : "Requested products"} <span>{activeItems.length} items</span></h3>
      <ul>{activeItems.map((item, index) => (
        <li key={`${item.material}-${item.brand}-${index}`}>
          <strong>{item.material}</strong>
          {item.brand && <span>Brand: {item.brand}</span>}
          {item.category && <span>Category: {item.category}</span>}
          <span>Requested: {formatQuantityUnit(item.quantity, item.unit)}</span>
          {item.specification && <span>Specification: {item.specification}</span>}
        </li>
      ))}</ul>
    </section>
    <section className="procurement-rfq-supplier-results" aria-labelledby="supplier-results-title">
      <div className="procurement-subsection-heading">
        <div>
          <h3 id="supplier-results-title">Ranked supplier matches</h3>
          <p>Location is ranked first; suppliers in the same location tier are ordered by rating percentage, highest first. Brand must match; category is checked when the request includes it.</p>
        </div>
      </div>
      {matching && <p role="status">Matching these products against active suppliers…</p>}
      {matchError && <p className="procurement-rfq-error" role="alert">{matchError}</p>}
      {suggestions && <>
        <div className="procurement-rfq-disclaimer">
          <strong>Suggestions need supplier confirmation</strong>
          <span>{suggestions.disclaimer}</span>
        </div>
        <section className="procurement-rfq-coverage">
          <h3>Requested quantity coverage</h3>
          {suggestions.requestedItems.map((item, index) => (
            <p key={`${item.productName}-${index}`}>
              <strong>{item.productName}{item.brand ? ` · ${item.brand}` : ""}</strong>
              <span>{item.knownFreshCapacity > 0
                ? `${formatQuantityUnit(item.knownFreshCapacity, item.unit)} in records checked within 30 days · ${formatQuantityUnit(item.quantity, item.unit)} requested`
                : `${formatQuantityUnit(item.quantity, item.unit)} requested · no recent nearby stock quantity recorded`}</span>
              <em className={`coverage-${item.coverage}`}>
                {item.coverage === "covered" ? "Recorded allocation possible" : item.coverage === "partial" ? "Partial recorded allocation" : item.coverage === "minimum-order" ? "No quantity meets recorded minimums" : item.coverage === "none" ? "No recent available quantity recorded" : item.coverage === "unknown" ? "Availability unknown or outdated" : "No supplier listing"}
              </em>
              {item.allocationSuggestions.length > 0 && <small>Possible split, for staff to confirm: {item.allocationSuggestions.map((allocation) => `${allocation.supplierName} ${formatQuantityUnit(allocation.quantity, item.unit)}`).join(" + ")}</small>}
              {item.outsideRecordedAreaCount ? <small>{item.outsideRecordedAreaCount} matching listing(s) are outside recorded nearby/service-area coverage and excluded from this coverage estimate.</small> : null}
              {item.minimumOrderBlockedCount ? <small>{item.minimumOrderBlockedCount} potential listing(s) could not be allocated because the remaining amount is below their recorded minimum order.</small> : null}
              {item.minimumOrderUnknownCount ? <small>{item.minimumOrderUnknownCount} matching listing(s) have no minimum-order quantity recorded; verify before allocating.</small> : null}
            </p>
          ))}
        </section>
        {!suggestions.candidates.length ? (
          <div className="procurement-match-empty" role="status">
            <strong>No active supplier product listings match these items.</strong>
            <p>Review supplier records and add accurate product listings or delivery coverage, then run suggestions again.</p>
          </div>
        ) : (
          <div className="procurement-rfq-candidate-list">
            {suggestions.candidates.map((supplier, index) => (
              <article className="procurement-rfq-candidate" key={supplier.id}>
                <header>
                  <div>
                    <strong>{index + 1}. {supplier.name}</strong>
                    <span>{supplier.city}, {supplier.state} · {supplier.locationMatchLabel}{supplier.locationMatchPercent < 60 ? " · outside nearby coverage estimate" : ""}</span>
                  </div>
                  <span className="procurement-rfq-rating">{supplier.averageScore == null ? "Not yet rated" : `${Math.round((supplier.averageScore / 5) * 100)}% rating`}</span>
                </header>
                <p className="procurement-rfq-location-data">
                  Supplier base PIN: {supplier.pincode || "Not recorded"} · Service PINs: {supplier.servicePincodes.length ? supplier.servicePincodes.join(", ") : "Not recorded"} · Supplier record updated: {supplier.supplierUpdatedAt ? new Date(supplier.supplierUpdatedAt).toLocaleDateString("en-IN") : "Not recorded"}
                </p>
                {supplier.matchedProducts.map((product, productIndex) => (
                  <div className="procurement-rfq-product" key={`${product.productName}-${product.brand}-${product.unit}-${productIndex}`}>
                    <strong>{product.productName} · {product.brand || "Brand not recorded"} · {product.category} · {product.unit}</strong>
                    <span>Requested: {formatQuantityUnit(product.requestedQuantity, product.unit)} · Listed availability: {product.availableQuantity == null ? "Unknown" : formatQuantityUnit(product.availableQuantity, product.unit)}{product.minimumOrderQty != null ? ` · Minimum order: ${formatQuantityUnit(product.minimumOrderQty, product.unit)}` : " · Minimum order: not recorded"}{product.availabilityStatus === "recently-checked" ? ` · Suggested amount from recorded stock: ${formatQuantityUnit(product.suggestedAllocationQuantity, product.unit)}` : ""}</span>
                    <span className={`freshness-${product.availabilityStatus}`}>
                      {product.availabilityStatus === "unknown" ? "Availability not checked or quantity unknown" : product.availabilityStatus === "outdated" ? "Availability record is over 30 days old; not used for coverage" : `Availability checked ${new Date(product.availabilityCheckedAt!).toLocaleDateString("en-IN")}`}
                      {product.lastQuotedPrice != null ? ` · Last recorded price ₹${Number(product.lastQuotedPrice).toLocaleString("en-IN")}/${product.unit} · ${priceRecency(product.lastQuotedPriceAt)} (verify directly; not a current quote)` : " · Price not recorded"}
                      {product.listingUpdatedAt ? ` · Listing updated ${new Date(product.listingUpdatedAt).toLocaleDateString("en-IN")}` : ""}
                    </span>
                  </div>
                ))}
              </article>
            ))}
          </div>
        )}
      </>}
    </section>
  </section>;

  return <section className="customer-rfq-sourcing" aria-labelledby="customer-rfq-sourcing-title">
    <div className="procurement-subsection-heading">
      <div>
        <span className="procurement-eyebrow">CUSTOMER QUOTATION FLOW</span>
        <h3 id="customer-rfq-sourcing-title">Customer requests and quotations</h3>
        <p>Approved customer quotations appear first. If none is approved, the original request leads; other quotations remain grouped below it.</p>
      </div>
      <span className="procurement-request-count">{rfqs.length} {rfqs.length === 1 ? "request" : "requests"}</span>
    </div>
    {loading ? <p role="status">Loading customer requests…</p>
      : error ? <p className="procurement-rfq-error" role="alert">{error}</p>
        : rfqs.length === 0 ? <p role="status">No customer requests need supplier matching.</p>
          : <div className="customer-rfq-sourcing-list">
            {rfqs.map((rfq) => {
              const primaryQuotation = [...(rfq.quotations || [])]
                .filter(isApproved)
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] || null;
              const primaryItems = primaryQuotation ? quotationSummary(primaryQuotation) : rfq.items;
              const otherQuotations = (rfq.quotations || [])
                .filter((quotation) => quotation.id !== primaryQuotation?.id)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              const showOriginalInDropdown = Boolean(primaryQuotation);
              const alternativeCount = otherQuotations.length + (showOriginalInDropdown ? 1 : 0);
              const hasAlternatives = alternativeCount > 0;
              return <article className="customer-rfq-sourcing-card" key={rfq.id}>
                <div className="customer-rfq-card-copy">
                  {hasAlternatives && <button type="button" className="procurement-back-link admin-back-button customer-rfq-options-back" onClick={(event) => {
                    const card = event.currentTarget.closest(".customer-rfq-sourcing-card");
                    preserveCardPosition(card);
                    card?.querySelector<HTMLDetailsElement>(".customer-rfq-alternatives")?.removeAttribute("open");
                  }}>
                    <ArrowLeft size={16} aria-hidden="true" /> Back to customer requests
                  </button>}
                  <div className="customer-rfq-card-title">
                    <strong>{rfq.requestNumber}</strong>
                    <span className={`procurement-request-status${primaryQuotation ? " procurement-status-approved" : ""}`}>
                      {primaryQuotation ? "CLIENT APPROVED" : formatEnumLabel(rfq.status)}
                    </span>
                  </div>
                  <p>{rfq.siteLocation}</p>
                  <span className="customer-rfq-primary-label">
                    {primaryQuotation ? `Approved quotation · ${primaryQuotation.quoteNumber} · Revision ${primaryQuotation.revisionNumber || 1}` : "Original customer request"}
                  </span>
                  <ul>{primaryItems.slice(0, 3).map((item, index) => (
                    <li key={`${item.material}-${item.brand}-${index}`}>
                      {item.material}{item.brand ? ` · ${item.brand}` : ""} — {formatQuantityUnit(item.quantity, item.unit)}
                    </li>
                  ))}</ul>
                  {primaryItems.length > 3 && <small className="customer-rfq-item-count">+ {primaryItems.length - 3} more products</small>}
                  {!primaryQuotation && rfq.matchSummary && (
                    <small className="customer-rfq-match-summary">
                      {rfq.matchSummary.matchedSupplierCount} supplier{rfq.matchSummary.matchedSupplierCount === 1 ? "" : "s"} match at least one item · {rfq.matchSummary.requestedItems.filter((item) => item.coverage === "covered").length}/{rfq.matchSummary.requestedItems.length} items have full recent quantity coverage nearby.
                    </small>
                  )}
                  {hasAlternatives && <details className="customer-rfq-alternatives" name="customer-rfq-alternatives">
                    <summary onClick={(event) => preserveCardPosition(event.currentTarget.closest(".customer-rfq-sourcing-card"))}>
                      <span>{showOriginalInDropdown ? "Other quotations and original request" : "Other quotations"}</span>
                      <span>{alternativeCount} {alternativeCount === 1 ? "option" : "options"} <ChevronDown size={15} aria-hidden="true" /></span>
                    </summary>
                    <div className="customer-rfq-alternative-list">
                      {showOriginalInDropdown && <article className="customer-rfq-alternative">
                        <div>
                          <strong>Original customer request</strong>
                          <span>{rfq.items.length} requested products</span>
                          <ul>{rfq.items.slice(0, 4).map((item, index) => <li key={`${item.material}-${index}`}>{item.material} — {formatQuantityUnit(item.quantity, item.unit)}</li>)}</ul>
                        </div>
                        <button type="button" className="bc-button" disabled={!rfq.locationParsed || !rfq.items.length} onClick={() => void showSuggestions(rfq)}>
                          Match suppliers <ArrowRight size={15} aria-hidden="true" />
                        </button>
                      </article>}
                      {otherQuotations.map((quotation) => {
                        const items = quotationSummary(quotation);
                        return <article className="customer-rfq-alternative" key={quotation.id}>
                          <div>
                            <strong>{quotation.quoteNumber} · Revision {quotation.revisionNumber || 1}</strong>
                            <span>{formatEnumLabel(quotation.status)} · ₹{Number(quotation.totalAmount).toLocaleString("en-IN")}</span>
                            <ul>{items.slice(0, 4).map((item, index) => <li key={`${item.material}-${index}`}>{item.material} — {formatQuantityUnit(item.quantity, item.unit)}</li>)}</ul>
                          </div>
                        <button type="button" className="bc-button" disabled={!/^[1-9]\d{5}$/.test(quotation.sitePincode) || !items.length} onClick={() => void showSuggestions(rfq, quotation)}>
                            Match suppliers <ArrowRight size={15} aria-hidden="true" />
                          </button>
                        </article>;
                      })}
                    </div>
                  </details>}
                </div>
                <button type="button" className="bc-primary customer-rfq-match-primary" disabled={primaryQuotation ? !/^[1-9]\d{5}$/.test(primaryQuotation.sitePincode) || !primaryItems.length : !rfq.locationParsed || !primaryItems.length} onClick={() => void showSuggestions(rfq, primaryQuotation)}>
                  Match suppliers <ArrowRight size={16} aria-hidden="true" />
                </button>
              </article>;
            })}
          </div>}
  </section>;
}

function priceRecency(timestamp: string | null) {
  if (!timestamp) return "price record date unknown";
  const days = Math.floor((Date.now() - new Date(timestamp).getTime()) / (24 * 60 * 60 * 1000));
  if (!Number.isFinite(days) || days < 0) return "price record date invalid";
  return days > 30 ? `price data outdated (${days} days old)` : `price recorded ${days} days ago`;
}
