import React, { useState } from "react";
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
import { formatDate, money } from "../features/customer-account/model";

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
  onSaveProfile: (e: React.FormEvent<HTMLFormElement>) => void;
  busy: boolean;
}) {
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState("");
  const [attachmentDownloadError, setAttachmentDownloadError] = useState("");
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
              This quotation responds to request #
              {quote.requestId.slice(0, 8).toUpperCase()}.{" "}
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
                    {item.quantityMt} {item.unit} × {money(item.unitPrice)}
                  </small>
                  {Boolean(item.options?.length) && (
                    <div className="account-alternatives">
                      <b>Brand / price alternatives</b>
                      {item.options?.map((option) => (
                        <span key={option.id}>
                          {option.brandName} · {option.productName} ·{" "}
                          {money(option.unitPrice)} / {option.unit}
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
        <QuotationResponse key={quote.id} quote={quote} />
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
                <span>
                  Step {order.dispatch.currentStep} of 5
                  {order.dispatch.currentLocation
                    ? ` · ${order.dispatch.currentLocation}`
                    : ""}
                </span>
                <span>
                  Estimated arrival{" "}
                  {formatDate(order.dispatch.estimatedArrival)}
                </span>
              </div>
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
                  {item.quantityMt} {item.unit} × {money(item.unitPrice)}
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
        <form
          className="account-panel account-profile-form"
          onSubmit={onSaveProfile}
        >
          <div className="account-form-grid">
            <label>
              Full name
              <input
                name="name"
                required
                minLength={2}
                maxLength={100}
                defaultValue={profile.name}
              />
            </label>
            <label>
              Verified mobile
              <input value={`+91 ${profile.phone}`} readOnly />
            </label>
            <label>
              Email address
              <input
                name="email"
                type="email"
                maxLength={254}
                defaultValue={profile.email || ""}
              />
            </label>
            <label>
              Company name
              <input
                name="companyName"
                maxLength={150}
                defaultValue={profile.companyName || ""}
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
            <label>
              City
              <input
                name="city"
                maxLength={100}
                defaultValue={profile.city || ""}
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
              />
            </label>
            <label className="account-wide-field">
              Billing address
              <textarea
                name="billingAddress"
                rows={3}
                maxLength={500}
                defaultValue={profile.billingAddress || ""}
              />
            </label>
            <label className="account-wide-field">
              Delivery address
              <textarea
                name="shippingAddress"
                rows={3}
                maxLength={500}
                defaultValue={profile.shippingAddress || ""}
              />
            </label>
          </div>
          <button className="account-primary-button" disabled={busy}>
            Save profile
          </button>
        </form>
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
        <section
          className="account-quote-list"
          aria-labelledby="customer-quotes-title"
        >
          <div className="account-quote-list-heading">
            <div>
              <span className="account-eyebrow">
                PRICES & OPTIONS FROM OUR TEAM
              </span>
              <h2 id="customer-quotes-title">Quotations prepared for you</h2>
            </div>
            <span className="account-quote-count">
              {activity.quotations.length} quotation
              {activity.quotations.length === 1 ? "" : "s"}
            </span>
          </div>
          {activity.quotations.length ? (
            activity.quotations.map((q) => (
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
                        {item.quantityMt} {item.unit} × {money(item.unitPrice)}
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
                    For request #{q.requestId.slice(0, 8).toUpperCase()} ·{" "}
                    <a href={`#request-${q.requestId}`}>View request</a>
                  </p>
                )}
              </article>
            ))
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
        {activity.requests.length > 0 && (
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
            {activity.requests.map((request) => (
              <article
                className="account-panel account-request-card"
                key={request.id}
                id={`request-${request.id}`}
              >
                <div className="account-panel-title">
                  <div>
                    <span className="account-eyebrow">
                      REQUEST #{request.id.slice(0, 8).toUpperCase()} ·{" "}
                      {formatDate(request.createdAt)}
                    </span>
                    <h3>Delivery location · {request.siteLocation}</h3>
                  </div>
                  <StatusBadge status={request.status} />
                </div>
                <details className="account-request-details">
                  <summary>
                    View request details · {request.items.length} material
                    {request.items.length === 1 ? "" : "s"}
                  </summary>
                  <ul>
                    {request.items.map((item, index) => (
                      <li key={`${item.material}-${index}`}>
                        <strong>
                          {item.material}
                          {item.brand ? ` · ${item.brand}` : ""}
                        </strong>
                        <span>
                          {item.quantity} {item.unit}
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
                              : q.status.replaceAll("_", " ")}
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
                    <p className="account-request-awaiting">
                      No quotation has been issued for this request yet. We’ll
                      add it here when it’s ready.
                    </p>
                  );
                })()}
              </article>
            ))}
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
                          {item.quantityMt} {item.unit} required
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
                <div>
                  <div>
                    <span className="account-eyebrow">
                      {formatDate(o.createdAt)}
                    </span>
                    <h2>{o.orderNumber}</h2>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <div className="account-history-items">
                  {o.items.map((item) => (
                    <p key={item.id}>
                      <span>
                        {item.productName} <small>· {item.brandName}</small>
                      </span>
                      <b>
                        {item.quantityMt} {item.unit}
                      </b>
                    </p>
                  ))}
                </div>
                <div className="account-history-total">
                  <span>
                    {o.items.length} line item{o.items.length === 1 ? "" : "s"}
                  </span>
                  <strong>{money(o.grandTotal)}</strong>
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
      {labels[status] || status.replaceAll("_", " ")}
    </span>
  );
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
  return (
    <div className="account-panel account-order-card">
      <div className="account-order-card-head">
        <div>
          <span className="account-eyebrow">
            PLACED {formatDate(order.createdAt)}
          </span>
          <h2>{order.orderNumber}</h2>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="account-order-card-body">
        <div>
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
        <div>
          <strong>{money(order.grandTotal)}</strong>
          <span>
            {order.deliverySite}, {order.pincode}
          </span>
        </div>
      </div>
      {order.dispatch && (
        <div className="account-mini-progress">
          <span>
            <PackageCheck size={16} /> Step {order.dispatch.currentStep} of 5 ·{" "}
            {order.dispatch.currentLocation || "On the way"}
          </span>
          <span>ETA {formatDate(order.dispatch.estimatedArrival)}</span>
        </div>
      )}
      <Link to={`/account/orders/${order.id}`} className="account-inline-link">
        Track order <ArrowRight size={14} />
      </Link>
    </div>
  );
}
