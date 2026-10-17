import React, { useEffect, useState } from "react";
import QuotationResponse from "../features/customer-account/QuotationResponse";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Box,
  FileText,
  Gift,
  PackageCheck,
  UserRound,
  Wallet,
} from "lucide-react";
import type {
  Activity,
  Order,
  Profile,
  Quote,
} from "../features/customer-account/model";
import { formatDate, formatDateTime, money } from "../features/customer-account/model";
import { formatQuantityUnit } from "../quantity-format";
import { formatEnumLabel } from "../utils/formatEnumLabel";

export function AccountContent({
  path,
  profile,
  activity,
  quote,
  order,
  onSaveProfile,
  busy,
}: {
  path: string;
  profile: Profile;
  activity: Activity;
  quote?: Quote;
  order?: Order;
  onSaveProfile: (
    e: React.FormEvent<HTMLFormElement>,
  ) => void | boolean | Promise<void | boolean>;
  busy: boolean;
}) {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState("");
  const [attachmentDownloadError, setAttachmentDownloadError] = useState("");
  const [quoteSearch, setQuoteSearch] = useState("");
  const [quoteStatusFilter, setQuoteStatusFilter] = useState<"ALL" | "REVIEW" | "ORDERED" | "OTHER">("ALL");
  const [quoteRequestFilter, setQuoteRequestFilter] = useState("");
  const [acceptedRequests, setAcceptedRequests] = useState<Record<string, string>>({});
  const [activityView, setActivityView] = useState<"EVERYTHING" | "QUOTATIONS" | "ORDERS" | "REQUESTS">("EVERYTHING");
  const sortedQuotes = [...activity.quotations].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const sortedOrders = [...activity.orders].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const sortedRequests = [...activity.requests].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const quoteBucket = (q: Quote) => {
    const expired = q.status === "EXPIRED" || (q.status === "QUOTE_SENT" && Date.parse(q.validUntil) < Date.now());
    if (expired) return "OTHER";
    if (q.status === "QUOTE_SENT") return "REVIEW";
    if (["ACCEPTED", "CONVERTED_TO_ORDER"].includes(q.status)) return "ORDERED";
    return "OTHER";
  };
  const quoteCounts = {
    ALL: sortedQuotes.length,
    REVIEW: sortedQuotes.filter((q) => quoteBucket(q) === "REVIEW").length,
    ORDERED: sortedQuotes.filter((q) => quoteBucket(q) === "ORDERED").length,
    OTHER: sortedQuotes.filter((q) => quoteBucket(q) === "OTHER").length,
  };
  const normalizedQuoteSearch = quoteSearch.trim().toLocaleLowerCase();
  const visibleQuotes = sortedQuotes.filter((q) => {
    const requestNumber = q.request?.requestNumber || activity.requests.find((request) => request.id === q.requestId)?.requestNumber || "";
    const searchable = [q.quoteNumber, requestNumber, ...q.items.flatMap((item) => [item.productName, item.brandName])].join(" ").toLocaleLowerCase();
    return activityView !== "QUOTATIONS" || (
      (quoteStatusFilter === "ALL" || quoteBucket(q) === quoteStatusFilter)
      && (!quoteRequestFilter || q.requestId === quoteRequestFilter)
      && (!normalizedQuoteSearch || searchable.includes(normalizedQuoteSearch))
    );
  });
  useEffect(() => {
    if (path === "/account/profile") setIsEditingProfile(false);
  }, [path]);
  useEffect(() => {
    const handleAccepted = (event: Event) => {
      const detail = (event as CustomEvent<{ requestId?: string; quoteNumber?: string }>).detail;
      if (detail?.requestId && detail.quoteNumber)
        setAcceptedRequests((current) => ({
          ...current,
          [detail.requestId!]: detail.quoteNumber!,
        }));
    };
    window.addEventListener("material-square:quotation-accepted", handleAccepted);
    return () => window.removeEventListener("material-square:quotation-accepted", handleAccepted);
  }, []);
  const downloadRequestAttachment = async (
    requestId: string,
    attachment: Activity["requests"][number]["attachments"][number],
  ) => {
    setDownloadingAttachmentId(attachment.id);
    setAttachmentDownloadError("");
    try {
      const apiBase = (import.meta.env.VITE_API_URL || "/api").replace(
        /\/+$/,
        "",
      );
      const response = await fetch(
        `${apiBase}/customer/rfqs/${encodeURIComponent(requestId)}/attachments/${encodeURIComponent(attachment.id)}`,
        {
          credentials: "include",
          cache: "no-store",
          headers: {
            Accept: attachment.mimeType,
            "X-Material-Square": "customer",
          },
        },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          typeof data?.message === "string"
            ? data.message
            : "Could not download this file. Please try again.",
        );
      }
      const blob = await response.blob();
      if (!blob.size) throw new Error("The downloaded file is empty.");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.fileName;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setAttachmentDownloadError(
        cause instanceof Error
          ? cause.message
          : "Could not download this file. Please try again.",
      );
    } finally {
      setDownloadingAttachmentId("");
    }
  };

  if (path.startsWith("/account/quotations/") && quote)
    return (
      <>
        <div className="account-breadcrumb">
          <Link to="/account">Account</Link>
          <span>/</span>
          <Link to="/account/quotations">Quotations</Link>
          <span>/</span>
          <span>Quotation details</span>
        </div>
        <header className="account-page-heading">
          <span className="account-eyebrow">QUOTATION DETAILS</span>
          <h1>Quotation details</h1>
          <p>
            Issued {formatDate(quote.createdAt)} · Valid until{" "}
            {formatDate(quote.validUntil)}
          </p>
          <div className="account-reference-number">
            <span>Quote number</span>
            <strong>{quote.quoteNumber}</strong>
          </div>
          {quote.requestId && (
            <p className="account-quote-source">
              This quotation responds to request{" "}
              {quote.request?.requestNumber || activity.requests.find((request) => request.id === quote.requestId)?.requestNumber || "details"}.{" "}
              <Link to={`/account/quotations#request-${quote.requestId}`}>
                View request details
              </Link>
            </p>
          )}
          <a
            className="account-inline-link"
            href={`${(import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "")}/customer/quotes/${encodeURIComponent(quote.id)}/pdf`}
          >
            <FileText size={16} /> Download quotation PDF
          </a>
        </header>
        <div className="account-detail-grid">
          <div className="account-panel">
            <h2>Materials in this quote</h2>
            {quote.items.map((item) => (
              <div className="account-line-item" key={item.id}>
                <div>
                  <strong>{item.productName}</strong>
                  <span>
                    {item.brandName} · {item.specification || item.categoryName}
                  </span>
                  <small>
                    {formatQuantityUnit(item.quantityMt, item.unit)} × {money(item.unitPrice)}
                  </small>
                  {Boolean(item.options?.length) && (
                    <div className="account-alternatives">
                      <b>Brand / price alternatives</b>
                      {item.options?.map((option) => (
                        <span key={option.id}>
                          {option.brandName} · {option.productName} ·{" "}
                          {formatQuantityUnit(option.quantityMt, option.unit)} × {money(option.unitPrice)} / unit · {money(option.lineTotal)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <strong>{money(item.lineTotal)}</strong>
              </div>
            ))}
          </div>
          <div className="account-panel account-total-panel">
            <h2>Quote summary</h2>
            <p>
              <span>Materials</span>
              <b>{money(quote.subtotal)}</b>
            </p>
            <p>
              <span>Discount</span>
              <b>−{money(quote.discountAmount)}</b>
            </p>
            <p>
              <span>Tax</span>
              <b>{money(quote.taxAmount)}</b>
            </p>
            <p>
              <span>Freight</span>
              <b>{money(quote.freightAmount)}</b>
            </p>
            <hr />
            <p className="account-grand-total">
              <span>Total</span>
              <b>{money(quote.totalAmount)}</b>
            </p>
            <StatusBadge status={quote.status} />
          </div>
        </div>
        <QuotationResponse
          key={quote.id}
          quote={quote}
          acceptedAlternativeNumber={
            (quote.requestId && acceptedRequests[quote.requestId]) ||
            (quote.requestId
              ? activity.quotations.find(
                  (candidate) =>
                    candidate.requestId === quote.requestId &&
                    candidate.id !== quote.id &&
                    ["ACCEPTED", "CONVERTED_TO_ORDER"].includes(candidate.status),
                )?.quoteNumber
              : undefined)
          }
        />
      </>
    );
  if (path.startsWith("/account/orders/") && order)
    return (
      <>
        <div className="account-breadcrumb">
          <Link to="/account">Account</Link>
          <span>/</span>
          <Link to="/account/orders">Orders</Link>
          <span>/</span>
          <span>Order tracking</span>
        </div>
        <header className="account-page-heading">
          <span className="account-eyebrow">ORDER TRACKING</span>
          <h1>Order tracking</h1>
          <p>
            Order placed {formatDate(order.createdAt)} · {order.deliverySite},{" "}
            {order.pincode}
          </p>
          <div className="account-reference-number">
            <span>Order number</span>
            <strong>{order.orderNumber}</strong>
          </div>
        </header>
        <div className="account-panel account-tracking-panel">
          <div>
            <div>
              <h2>Delivery progress</h2>
              <p>
                Your order status is updated by the Material Square operations
                team.
              </p>
            </div>
            <StatusBadge status={order.status} />
          </div>
          {order.dispatch && (
            <div className="account-tracking-progress">
              <div className="account-progress-line">
                <span
                  style={{
                    width: `${Math.min(100, Math.max(8, order.dispatch.currentStep * 20))}%`,
                  }}
                />
              </div>
              <div className="account-progress-meta">
                <span>{orderProgressText(order)}</span>
                {order.status !== "DELIVERED" && order.dispatch.estimatedArrival && (
                  <span>
                    Estimated arrival{" "}
                    {formatDate(order.dispatch.estimatedArrival)}
                  </span>
                )}
              </div>
              {(order.dispatch.vehicleNumber || order.dispatch.transporter) && (
                <p className="account-tracking-vehicle">
                  {order.dispatch.vehicleNumber && (
                    <span>
                      Vehicle <b>{order.dispatch.vehicleNumber}</b>
                    </span>
                  )}
                  {order.dispatch.transporter && (
                    <span>
                      Transporter <b>{order.dispatch.transporter}</b>
                    </span>
                  )}
                  <span>Last updated {formatDate(order.dispatch.updatedAt)}</span>
                </p>
              )}
            </div>
          )}
          {order.deliveries.length > 0 && (
            <div className="account-deliveries">
              <h3>Delivery records</h3>
              {order.deliveries.map((delivery) => (
                <p key={delivery.deliveryNumber}>
                  <PackageCheck size={16} />
                  <span>
                    <b>{delivery.deliveryNumber}</b> ·{" "}
                    {formatDate(delivery.deliveredAt)}
                    {delivery.notes ? ` · ${delivery.notes}` : ""}
                  </span>
                </p>
              ))}
            </div>
          )}
        </div>
        <div className="account-panel">
          <h2>Items</h2>
          {order.items.map((item) => (
            <div className="account-line-item" key={item.id}>
              <div>
                <strong>{item.productName}</strong>
                <span>
                  {item.brandName} · {item.specification || item.categoryName}
                </span>
                <small>
                  {formatQuantityUnit(item.quantityMt, item.unit)} × {money(item.unitPrice)}
                </small>
              </div>
              <strong>{money(item.lineTotal)}</strong>
            </div>
          ))}
          <p className="account-order-total">
            <span>Order total</span>
            <strong>{money(order.grandTotal)}</strong>
          </p>
        </div>
      </>
    );

  if (path === "/account/profile")
    return (
      <>
        <PageHeading
          eyebrow="YOUR DETAILS"
          title="Profile"
          subtitle="Manage the contact and project details used for your material requests."
        />
        {!isEditingProfile ? (
          <section className="account-panel account-profile-overview">
            <div className="account-profile-overview-heading">
              <div>
                <h2>Contact and business details</h2>
                <p>Your saved information for future material requests.</p>
              </div>
              <button
                type="button"
                className="account-profile-edit-button"
                onClick={() => setIsEditingProfile(true)}
              >
                Edit profile
              </button>
            </div>
            <div className="account-profile-summary-grid">
              <ProfileSummary label="Full name" value={profile.name} />
              <ProfileSummary
                label="Verified mobile"
                value={`+91 ${profile.phone}`}
              />
              <ProfileSummary label="Email address" value={profile.email} />
              <ProfileSummary label="Company name" value={profile.companyName} />
              <ProfileSummary label="GSTIN" value={profile.gstin} />
            </div>
            <div className="account-profile-overview-addresses">
              <div className="account-profile-section-heading">
                <h2>Saved addresses</h2>
                <p>Used to prepare delivery details for your requests.</p>
              </div>
              <div className="account-profile-summary-grid">
                <ProfileSummary
                  label="Delivery address"
                  value={profile.shippingAddress}
                  wide
                />
                <ProfileSummary
                  label="Billing address"
                  value={profile.billingAddress}
                  wide
                />
                <ProfileSummary label="City / town" value={profile.city} />
                <ProfileSummary label="PIN code" value={profile.pincode} />
              </div>
            </div>
          </section>
        ) : (
        <form
          className="account-panel account-profile-form"
          onSubmit={async (event) => {
            if ((await onSaveProfile(event)) === true)
              setIsEditingProfile(false);
          }}
        >
          <div className="account-profile-sections">
            <section className="account-profile-section">
              <div className="account-profile-section-heading">
                <h2>Contact and business details</h2>
                <p>
                  Your name and verified phone are required. The verified
                  number can’t be changed here.
                </p>
              </div>
              <div className="account-form-grid">
                <label>
                  Full name
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={100}
                    defaultValue={profile.name}
                    autoComplete="name"
                  />
                </label>
                <label>
                  Verified mobile *
                  <input value={`+91 ${profile.phone}`} readOnly required />
                </label>
                <label>
                  Email address
                  <input
                    name="email"
                    type="email"
                    maxLength={254}
                    defaultValue={profile.email || ""}
                    autoComplete="email"
                  />
                </label>
                <label>
                  Company name
                  <input
                    name="companyName"
                    maxLength={150}
                    defaultValue={profile.companyName || ""}
                    autoComplete="organization"
                  />
                </label>
                <label>
                  GSTIN
                  <input
                    name="gstin"
                    maxLength={15}
                    defaultValue={profile.gstin || ""}
                  />
                </label>
              </div>
            </section>
            <section className="account-profile-section">
              <div className="account-profile-section-heading">
                <h2>Saved addresses</h2>
                <p>
                  A delivery address is required. Include the building, street,
                  area and state; city and PIN code are shared across requests.
                </p>
              </div>
              <div className="account-form-grid">
                <label>
                  City / town
                  <input
                    name="city"
                    maxLength={100}
                    defaultValue={profile.city || ""}
                    autoComplete="address-level2"
                  />
                </label>
                <label>
                  PIN code
                  <input
                    name="pincode"
                    inputMode="numeric"
                    pattern="[1-9][0-9]{5}"
                    maxLength={6}
                    defaultValue={profile.pincode || ""}
                    autoComplete="postal-code"
                  />
                </label>
                <label className="account-profile-field--wide">
                  Billing address
                  <textarea
                    name="billingAddress"
                    rows={3}
                    maxLength={500}
                    placeholder="Flat or building, street, area, state"
                    defaultValue={profile.billingAddress || ""}
                    autoComplete="billing street-address"
                  />
                </label>
                <label className="account-profile-field--wide">
                  Delivery address *
                  <textarea
                    name="shippingAddress"
                    required
                    minLength={2}
                    rows={3}
                    maxLength={500}
                    placeholder="Flat or building, street, area, landmark, state"
                    defaultValue={profile.shippingAddress || ""}
                    autoComplete="shipping street-address"
                  />
                </label>
              </div>
            </section>
          </div>
          <div className="account-profile-actions">
            <span>Your information is used to manage your requests.</span>
            <div>
              <button
                type="button"
                className="account-profile-cancel-button"
                disabled={busy}
                onClick={() => setIsEditingProfile(false)}
              >
                Cancel
              </button>
              <button className="account-primary-button" disabled={busy}>
                Save profile
              </button>
            </div>
          </div>
        </form>
        )}
      </>
    );
  if (path === "/account/quotations" || path.startsWith("/account/quotations"))
    return (
      <>
        <PageHeading
          eyebrow="REQUESTS & QUOTATIONS"
          title="Your requests and quotations"
          subtitle="Track each material request. When our team prepares its quotation, you can open it from the matching request below."
        />
        <nav className="account-activity-filter-tabs" aria-label="Filter account activity">
          {([
            ["EVERYTHING", "Everything", sortedQuotes.length + sortedOrders.length + sortedRequests.length],
            ["REQUESTS", "Requests", sortedRequests.length],
            ["QUOTATIONS", "Quotations received", sortedQuotes.length],
            ["ORDERS", "Orders", sortedOrders.length],
          ] as const).map(([value, label, count]) => (
            <button
              type="button"
              key={value}
              className={activityView === value ? "is-active" : ""}
              aria-pressed={activityView === value}
              onClick={() => setActivityView(value)}
            >
              {label}<span>{count}</span>
            </button>
          ))}
        </nav>
        {sortedRequests.length > 0 && (activityView === "EVERYTHING" || activityView === "REQUESTS") && (
          <section
            className="account-request-list"
            aria-labelledby="customer-requests-title"
          >
            <div className="account-quote-list-heading">
              <div>
                <span className="account-eyebrow">WHAT YOU SENT US</span>
                <h2 id="customer-requests-title">Your material requests</h2>
              </div>
            </div>
            {sortedRequests.map((request) => (
              <article
                className="account-panel account-request-card"
                key={request.id}
                id={`request-${request.id}`}
              >
                <div className="account-request-card-header">
                  <div className="account-request-reference">
                    <span className="account-eyebrow">MATERIAL REQUEST</span>
                    <strong>{request.requestNumber}</strong>
                    <time dateTime={request.createdAt}>
                      Submitted {formatDateTime(request.createdAt)}
                    </time>
                  </div>
                  <StatusBadge status={request.status} />
                </div>
                <div className="account-request-location">
                  <span>DELIVERY TO</span>
                  <strong>{request.siteLocation}</strong>
                </div>
                <details className="account-request-details">
                  <summary>
                    <span>Materials requested</span>
                    <span className="account-request-item-count">
                      {request.items.length} item
                      {request.items.length === 1 ? "" : "s"}
                    </span>
                  </summary>
                  <ul>
                    {request.items.map((item, index) => (
                      <li key={`${item.material}-${index}`}>
                        <strong>
                          {item.material}
                          {item.brand ? ` · ${item.brand}` : ""}
                        </strong>
                        <span>
                          {formatQuantityUnit(item.quantity, item.unit)}
                          {item.specification ? ` · ${item.specification}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="account-request-extra">
                    {request.projectStage && (
                      <p>
                        <b>Project stage</b>
                        <span>{request.projectStage}</span>
                      </p>
                    )}
                    {request.deliveryTiming && (
                      <p>
                        <b>Requested delivery</b>
                        <span>{formatDate(request.deliveryTiming)}</span>
                      </p>
                    )}
                    {request.notes && (
                      <p>
                        <b>Notes</b>
                        <span>{request.notes}</span>
                      </p>
                    )}
                  </div>
                  {(request.attachments ?? []).length > 0 && (
                    <div className="account-request-attachments">
                      <strong>Plans and files you shared</strong>
                      {attachmentDownloadError && (
                        <p className="account-attachment-error" role="alert">
                          {attachmentDownloadError}
                        </p>
                      )}
                      {(request.attachments ?? []).map((attachment) => (
                        <button
                          type="button"
                          className="account-request-attachment-download"
                          key={attachment.id}
                          aria-label={`Download ${attachment.fileName}`}
                          disabled={downloadingAttachmentId === attachment.id}
                          onClick={() =>
                            void downloadRequestAttachment(
                              request.id,
                              attachment,
                            )
                          }
                        >
                          <FileText size={16} />
                          {attachment.fileName}
                          <small>
                            {(attachment.byteSize / (1024 * 1024)).toFixed(1)}{" "}
                            {downloadingAttachmentId === attachment.id
                              ? "MB · Downloading…"
                              : "MB · Download"}
                          </small>
                        </button>
                      ))}
                    </div>
                  )}
                </details>
                {(() => {
                  const requestQuotes = activity.quotations.filter(
                    (q) => q.requestId === request.id,
                  );
                  if (requestQuotes.length) {
                    return (
                      <div className="account-request-response">
                        <strong>Quotation ready for this request</strong>
                        {requestQuotes.map((q) => (
                          <Link key={q.id} to={`/account/quotations/${q.id}`}>
                            {q.quoteNumber} · {money(q.totalAmount)} ·{" "}
                            {q.status === "REJECTED"
                              ? "Declined"
                              : formatEnumLabel(q.status)}
                            <ArrowRight size={15} />
                          </Link>
                        ))}
                      </div>
                    );
                  }
                  if (request.status === "QUOTED")
                    return (
                      <p className="account-request-awaiting">
                        This request is marked as quoted, but its quotation is
                        not linked to the request yet. Please contact our team
                        for help.
                      </p>
                    );
                  if (request.status === "CLOSED")
                    return (
                      <p className="account-request-awaiting">
                        This request is closed. Contact our team if you still
                        need help with it.
                      </p>
                    );
                  return (
                    <div className="account-request-awaiting">
                      <strong>Waiting for your quotation</strong>
                      <span>
                        The team’s prices and availability will appear here
                        when they reply.
                      </span>
                    </div>
                  );
                })()}
              </article>
            ))}
          </section>
        )}
        {activityView !== "ORDERS" && activityView !== "REQUESTS" && (
        <section
          className="account-quote-list"
          aria-labelledby="customer-quotes-title"
        >
          <div className="account-quote-list-heading">
            <div>
              <span className="account-eyebrow">
                PRICES & OPTIONS FROM OUR TEAM
              </span>
              <h2 id="customer-quotes-title">Quotations received</h2>
            </div>
            <span className="account-quote-count">
              {visibleQuotes.length === activity.quotations.length && !normalizedQuoteSearch && quoteStatusFilter === "ALL" && !quoteRequestFilter
                ? `${activity.quotations.length} quotations`
                : `Showing ${visibleQuotes.length} of ${activity.quotations.length}`}
            </span>
          </div>
          {activityView === "QUOTATIONS" && (
            <>
              <div className="account-quote-filters">
                <label className="account-quote-search">
                  <FileText size={16} aria-hidden="true" />
                  <input
                    type="search"
                    aria-label="Search quotations"
                    placeholder="Search quote number, request number or material"
                    value={quoteSearch}
                    onChange={(event) => setQuoteSearch(event.target.value)}
                  />
                </label>
                <label className="account-quote-request-filter">
                  <span>Request</span>
                  <select aria-label="Filter quotations by request" value={quoteRequestFilter} onChange={(event) => setQuoteRequestFilter(event.target.value)}>
                    <option value="">All requests</option>
                    {activity.requests.map((request) => (
                      <option value={request.id} key={request.id}>{request.requestNumber}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="account-quote-filter-tabs" role="group" aria-label="Filter quotations by status">
                {([
                  ["ALL", "All"],
                  ["REVIEW", "Ready to review"],
                  ["ORDERED", "Accepted / ordered"],
                  ["OTHER", "Other"],
                ] as const).map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    className={quoteStatusFilter === value ? "is-active" : ""}
                    aria-pressed={quoteStatusFilter === value}
                    onClick={() => setQuoteStatusFilter(value)}
                  >
                    {label}<span>{quoteCounts[value]}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {activity.quotations.length ? (
            visibleQuotes.length ? visibleQuotes.map((q) => (
              <article className="account-panel account-quote-card" key={q.id}>
                <div className="account-panel-title">
                  <div>
                    <span className="account-eyebrow">{q.quoteNumber}</span>
                    <h3>
                      {q.items.length} quoted material
                      {q.items.length === 1 ? "" : "s"}
                    </h3>
                  </div>
                  <StatusBadge status={q.status} />
                </div>
                <p className="account-quote-meta">
                  Issued {formatDate(q.createdAt)} · Valid until{" "}
                  {formatDate(q.validUntil)}
                </p>
                <ul className="account-quote-items">
                  {q.items.map((item) => (
                    <li key={item.id}>
                      <span>
                        {item.productName} · {item.brandName}
                      </span>
                      <small>
                        {formatQuantityUnit(item.quantityMt, item.unit)} × {money(item.unitPrice)}
                      </small>
                    </li>
                  ))}
                </ul>
                <div className="account-quote-card-footer">
                  <div>
                    <span>Total</span>
                    <strong>{money(q.totalAmount)}</strong>
                  </div>
                  <Link
                    className="account-open-quote-button"
                    to={`/account/quotations/${q.id}`}
                  >
                    Open quotation <ArrowRight size={16} />
                  </Link>
                </div>
                {q.requestId && (
                  <p className="account-quote-request-link">
                    For request{" "}
                    {q.request?.requestNumber || activity.requests.find((request) => request.id === q.requestId)?.requestNumber || "details"} ·{" "}
                    <a href={`#request-${q.requestId}`}>View request</a>
                  </p>
                )}
              </article>
            )) : (
              <div className="account-no-quote-yet account-quote-no-results">
                <FileText size={20} />
                <div>
                  <strong>No quotations match these filters</strong>
                  <p>Try another status, request number or search term.</p>
                  <button type="button" className="account-inline-link" onClick={() => { setQuoteSearch(""); setQuoteRequestFilter(""); setQuoteStatusFilter("ALL"); }}>Clear filters</button>
                </div>
              </div>
            )
          ) : (
            <div className="account-no-quote-yet">
              <FileText size={20} />
              <div>
                <strong>No quotation has been issued yet</strong>
                <p>
                  We’ll show your team’s prices and availability here as soon as
                  a quotation is ready.
                </p>
              </div>
            </div>
          )}
        </section>
        )}
        {(activityView === "EVERYTHING" || activityView === "ORDERS") && (
          <section className="account-request-list" aria-labelledby="customer-orders-title">
            <div className="account-quote-list-heading">
              <div>
                <span className="account-eyebrow">ACCEPTED QUOTATIONS</span>
                <h2 id="customer-orders-title">Your orders</h2>
              </div>
              <span className="account-quote-count">{sortedOrders.length} orders</span>
            </div>
            {sortedOrders.length ? (
              <div className="account-order-list">
                {sortedOrders.map((customerOrder) => <OrderCard order={customerOrder} key={customerOrder.id} />)}
              </div>
            ) : (
              <div className="account-no-quote-yet">
                <PackageCheck size={20} />
                <div><strong>No orders yet</strong><p>Orders will appear here after you accept a quotation.</p></div>
              </div>
            )}
          </section>
        )}
      </>
    );
  if (path === "/account/brand-comparison")
    return (
      <>
        <PageHeading
          eyebrow="MAKE AN INFORMED CHOICE"
          title="Brand & price comparison"
          subtitle="Compare the client-approved brand alternatives included in your quotations."
        />
        {activity.quotations.some((q) =>
          q.items.some((item) => item.options?.length),
        ) ? (
          activity.quotations
            .filter((q) => q.items.some((item) => item.options?.length))
            .map((q) => (
              <div className="account-panel account-compare-panel" key={q.id}>
                <div className="account-panel-title">
                  <div>
                    <span className="account-eyebrow">{q.quoteNumber}</span>
                    <h2>Quoted brand options</h2>
                  </div>
                  <Link
                    className="account-inline-link"
                    to={`/account/quotations/${q.id}`}
                  >
                    Open quotation <ArrowRight size={14} />
                  </Link>
                </div>
                {q.items
                  .filter((item) => item.options?.length)
                  .map((item) => (
                    <section className="account-compare-group" key={item.id}>
                      <h3>
                        {item.productName}{" "}
                        <small>
                          {formatQuantityUnit(item.quantityMt, item.unit)} required
                        </small>
                      </h3>
                      <div className="account-option-grid">
                        <div className="account-option-card is-selected">
                          <span>Quoted selection</span>
                          <b>{item.brandName}</b>
                          <p>{item.specification}</p>
                          <strong>
                            {money(item.unitPrice)} <small>/ {item.unit}</small>
                          </strong>
                        </div>
                        {item.options?.map((option) => (
                          <div className="account-option-card" key={option.id}>
                            <span>Available alternative</span>
                            <b>{option.brandName}</b>
                            <p>
                              {option.productName} · {option.specification}
                            </p>
                            <strong>
                              {money(option.unitPrice)}{" "}
                              <small>/ {option.unit}</small>
                            </strong>
                            <p>{formatQuantityUnit(option.quantityMt, option.unit)} · {money(option.lineTotal)} total</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
              </div>
            ))
        ) : (
          <EmptyState
            title="Comparison options appear with a quote"
            body="The client’s team can include equivalent brand options and prices in a quotation. You’ll be able to compare them here."
            action="View quotations"
            to="/account/quotations"
          />
        )}
      </>
    );
  if (path === "/account/orders" || path.startsWith("/account/orders"))
    return (
      <>
        <PageHeading
          eyebrow="FULFILMENT & DELIVERY"
          title="Orders & tracking"
          subtitle="See order status, delivery progress and estimated arrival updates."
        />
        {activity.orders.length ? (
          <div className="account-order-list">
            {activity.orders.map((o) => (
              <OrderCard order={o} key={o.id} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No orders to track"
            body="Orders created from your accepted quotations will appear here with live fulfilment updates."
            action="Review quotations"
            to="/account/quotations"
          />
        )}
      </>
    );
  if (path === "/account/history")
    return (
      <>
        <PageHeading
          eyebrow="YOUR MATERIAL RECORD"
          title="Purchase history"
          subtitle="A clear record of items and order totals from your completed and active purchases."
        />
        {activity.orders.length ? (
          <div className="account-order-list">
            {activity.orders.map((o) => (
              <div className="account-panel account-history-card" key={o.id}>
                <div className="account-history-card-header">
                  <div className="account-history-reference">
                    <span className="account-eyebrow">PURCHASE</span>
                    <h2 title={o.orderNumber}>{o.orderNumber}</h2>
                    <time dateTime={o.createdAt}>
                      Placed {formatDate(o.createdAt)}
                    </time>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <div className="account-history-items">
                  {o.items.map((item) => (
                    <div className="account-history-item" key={item.id}>
                      <div>
                        <strong>{item.productName}</strong>
                        <span>{item.brandName}</span>
                      </div>
                      <b>
                        {formatQuantityUnit(item.quantityMt, item.unit)}
                      </b>
                    </div>
                  ))}
                </div>
                <div className="account-history-total">
                  <div className="account-history-total-value">
                    <span>
                      {o.items.length} line item{o.items.length === 1 ? "" : "s"}
                    </span>
                    <strong>{money(o.grandTotal)}</strong>
                  </div>
                  <Link
                    className="account-inline-link"
                    to={`/account/orders/${o.id}`}
                  >
                    Order details <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Purchase history is empty"
            body="Your order and material history will be saved here after a quotation becomes an order."
            action="Browse materials"
            to="/marketplace"
          />
        )}
      </>
    );
  if (path === "/account/loyalty")
    return (
      <>
        <PageHeading
          eyebrow="CUSTOMER BENEFITS"
          title="Loyalty points"
          subtitle="See earned points, adjustments and expiry information for your account."
        />
        {activity.loyalty ? (
          <>
            <div className="account-loyalty-balance">
              <div className="account-loyalty-icon">
                <Gift />
              </div>
              <div>
                <span>Available balance</span>
                <strong>
                  {activity.loyalty.pointsBalance.toLocaleString("en-IN")}{" "}
                  <small>pts</small>
                </strong>
              </div>
            </div>
            <div className="account-panel account-table-panel">
              <h2>Points activity</h2>
              {activity.loyalty.transactions.length ? (
                <div className="account-table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Activity</th>
                        <th>Points</th>
                        <th>Expiry</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activity.loyalty.transactions.map((t) => (
                        <tr key={t.id}>
                          <td>{formatDate(t.createdAt)}</td>
                          <td>{t.description}</td>
                          <td
                            className={
                              t.points >= 0
                                ? "account-points-plus"
                                : "account-points-minus"
                            }
                          >
                            {t.points > 0 ? "+" : ""}
                            {t.points}
                          </td>
                          <td>
                            {t.expiresAt && !t.isExpired
                              ? formatDate(t.expiresAt)
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="account-empty-inline">
                  Your points activity will show here.
                </div>
              )}
            </div>
          </>
        ) : (
          <EmptyState
            title="Loyalty is not active"
            body="If the client enables its loyalty programme, your points balance and activity will appear here."
            action="Return to overview"
            to="/account"
          />
        )}
      </>
    );
  if (path === "/account" || path === "/account/")
    return (
      <>
        <PageHeading
          eyebrow="CUSTOMER WORKSPACE"
          title={`Good to see you${profile.name ? `, ${profile.name.split(" ")[0]}` : ""}`}
          subtitle="Keep your projects moving with one place for requests, quotations and delivery updates."
        />
        {!profile.name && (
          <div className="account-profile-prompt">
            <span className="account-profile-prompt-icon">
              <UserRound size={18} />
            </span>
            <div>
              <strong>Finish setting up your account</strong>
              <p>
                Add your name and project details so the team can prepare
                accurate material requests.
              </p>
            </div>
            <Link to="/account/profile" className="account-inline-link">
              Complete profile <ArrowRight size={14} />
            </Link>
          </div>
        )}
        <div className="account-stat-grid">
          <StatCard
            icon={FileText}
            label="Active quotations"
            value={activity.quotations
              .filter((q) => ["QUOTE_SENT", "ACCEPTED"].includes(q.status))
              .length.toString()}
          />
          <StatCard
            icon={PackageCheck}
            label="Orders in progress"
            value={activity.orders
              .filter((o) => !["DELIVERED", "CANCELLED"].includes(o.status))
              .length.toString()}
          />
          <StatCard
            icon={Wallet}
            label="Loyalty points"
            value={(activity.loyalty?.pointsBalance || 0).toLocaleString(
              "en-IN",
            )}
          />
        </div>
        <div className="account-dashboard-grid">
          <div className="account-panel">
            <div className="account-panel-title">
              <div>
                <span className="account-eyebrow">NEXT ACTIONS</span>
                <h2>Pick up where you left off</h2>
              </div>
            </div>
            <Link className="account-action-row" to="/account/quotations">
              <span className="account-action-icon">
                <FileText size={18} />
              </span>
              <span>
                <b>Review a quotation</b>
                <small>Compare prices and material options</small>
              </span>
              <ArrowRight size={18} />
            </Link>
            <Link className="account-action-row" to="/account/orders">
              <span className="account-action-icon">
                <PackageCheck size={18} />
              </span>
              <span>
                <b>Track a delivery</b>
                <small>Check the latest order progress</small>
              </span>
              <ArrowRight size={18} />
            </Link>
            <Link className="account-action-row" to="/marketplace">
              <span className="account-action-icon">
                <Box size={18} />
              </span>
              <span>
                <b>Find materials</b>
                <small>Search the client’s available catalogue</small>
              </span>
              <ArrowRight size={18} />
            </Link>
          </div>
          <div className="account-panel">
            <div className="account-panel-title">
              <div>
                <span className="account-eyebrow">RECENT ACTIVITY</span>
                <h2>Latest quotations</h2>
              </div>
              <Link to="/account/quotations" className="account-inline-link">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            {activity.quotations.length ? (
              activity.quotations.slice(0, 3).map((q) => (
                <Link
                  className="account-recent-row"
                  to={`/account/quotations/${q.id}`}
                  key={q.id}
                >
                  <span>
                    <b>{q.quoteNumber}</b>
                    <small>{formatDate(q.createdAt)}</small>
                  </span>
                  <span>
                    <strong>{money(q.totalAmount)}</strong>
                    <StatusBadge status={q.status} />
                  </span>
                </Link>
              ))
            ) : (
              <p className="account-muted-copy">
                Your prepared quotations will be listed here.
              </p>
            )}
          </div>
        </div>
      </>
    );
  return (
    <EmptyState
      title="This account page isn’t available"
      body="Choose a section from the account menu to continue."
      action="Account overview"
      to="/account"
    />
  );
}

function PageHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <header className="account-page-heading">
      <span className="account-eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </header>
  );
}
function ProfileSummary({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string | null | undefined;
  wide?: boolean;
}) {
  return (
    <div
      className={`account-profile-summary-item${wide ? " account-profile-summary-item--wide" : ""}`}
    >
      <span>{label}</span>
      <strong>{value?.trim() || "Not provided"}</strong>
    </div>
  );
}
function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    NEW: "Request received",
    CONTACTED: "Team contacted",
    QUOTED: "Quotation ready",
    CLOSED: "Request closed",
    QUOTE_SENT: "Quotation ready to review",
    REJECTED: "Declined",
  };
  return (
    <span
      className={`account-status status-${status.toLowerCase().replaceAll("_", "-")}`}
    >
      {labels[status] || formatEnumLabel(status)}
    </span>
  );
}

const orderProgressLabels: Record<string, string> = {
  PROCESSING_AT_YARD: "Processing at yard",
  LOADED_ON_TRUCK: "Loaded on truck",
  IN_TRANSIT: "In transit",
  OUT_FOR_DELIVERY: "Out for delivery",
  PARTIALLY_DELIVERED: "Partially delivered",
  DELIVERED: "Delivered",
  CANCELLED: "Order cancelled",
};

function orderProgressLabel(order: Order) {
  return (
    order.dispatch?.currentLocation?.trim() ||
    orderProgressLabels[order.status] ||
    formatEnumLabel(order.status)
  );
}

function orderProgressText(order: Order) {
  if (order.status === "CANCELLED") return "Order cancelled";
  if (order.status === "DELIVERED") {
    return `Delivered${order.deliveries[0]?.deliveredAt ? ` · ${formatDate(order.deliveries[0].deliveredAt)}` : ""}`;
  }
  return `Step ${order.dispatch?.currentStep || 1} of 5 · ${orderProgressLabel(order)}`;
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
}) {
  return (
    <div className="account-stat-card">
      <span className="account-stat-icon">
        <Icon size={19} />
      </span>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function EmptyState({
  title,
  body,
  action,
  to,
}: {
  title: string;
  body: string;
  action: string;
  to: string;
}) {
  return (
    <div className="account-empty-state">
      <div className="account-empty-icon">
        <FileText size={22} />
      </div>
      <h2>{title}</h2>
      <p>{body}</p>
      <Link to={to} className="account-secondary-button">
        {action}
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}
function OrderCard({ order }: { order: Order }) {
  const deliveryAddress = [
    order.deliverySite,
    order.pincode && !order.deliverySite.includes(order.pincode)
      ? order.pincode
      : "",
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <div className="account-panel account-order-card">
      <div className="account-order-card-head">
        <div className="account-order-reference">
          <span className="account-eyebrow">ORDER · PLACED {formatDate(order.createdAt)}</span>
          <h2 title={order.orderNumber}>{order.orderNumber}</h2>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="account-order-card-body">
        <div className="account-order-items-summary">
          <span className="account-order-field-label">ITEMS</span>
          <strong>
            {order.items.length} material{order.items.length === 1 ? "" : "s"}
          </strong>
          <span>
            {order.items
              .slice(0, 2)
              .map((item) => item.productName)
              .join(" · ")}
            {order.items.length > 2 ? ` + ${order.items.length - 2} more` : ""}
          </span>
        </div>
        <div className="account-order-side-summary">
          <div className="account-order-total-value">
            <span className="account-order-field-label">ORDER TOTAL</span>
            <strong>{money(order.grandTotal)}</strong>
          </div>
          <div className="account-order-delivery">
            <span className="account-order-field-label">DELIVER TO</span>
            <span>{deliveryAddress || "Address not provided"}</span>
          </div>
        </div>
      </div>
      {order.dispatch && (
        <div className="account-mini-progress">
          <span>
            <PackageCheck size={16} /> {orderProgressText(order)}
          </span>
          {order.status !== "DELIVERED" && order.dispatch.estimatedArrival && (
            <span>ETA {formatDate(order.dispatch.estimatedArrival)}</span>
          )}
        </div>
      )}
      <Link to={`/account/orders/${order.id}`} className="account-inline-link">
        Track order <ArrowRight size={14} />
      </Link>
    </div>
  );
}
