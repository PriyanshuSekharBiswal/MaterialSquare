import React from "react";
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
  if (path.startsWith("/account/quotations/") && quote)
    return (
      <>
        <div className="account-breadcrumb">
          <Link to="/account/quotations">Quotations</Link>
          <span>/</span>
          {quote.quoteNumber}
        </div>
        <header className="account-page-heading">
          <span className="account-eyebrow">QUOTATION DETAILS</span>
          <h1>{quote.quoteNumber}</h1>
          <p>
            Issued {formatDate(quote.createdAt)} · Valid until{" "}
            {formatDate(quote.validUntil)}
          </p>
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
      </>
    );
  if (path.startsWith("/account/orders/") && order)
    return (
      <>
        <div className="account-breadcrumb">
          <Link to="/account/orders">Orders</Link>
          <span>/</span>
          {order.orderNumber}
        </div>
        <header className="account-page-heading">
          <span className="account-eyebrow">ORDER TRACKING</span>
          <h1>{order.orderNumber}</h1>
          <p>
            Order placed {formatDate(order.createdAt)} · {order.deliverySite},{" "}
            {order.pincode}
          </p>
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
          eyebrow="YOUR REQUESTS & QUOTES"
          title="Quotations"
          subtitle="Review the prices, brands, quantities and validity of quotes prepared for your projects."
        />
        {activity.requests.length > 0 && (
          <div className="account-request-list">
            <h2>Requests awaiting a quotation</h2>
            {activity.requests.map((request) => (
              <article
                className="account-panel account-request-card"
                key={request.id}
              >
                <div className="account-panel-title">
                  <div>
                    <span className="account-eyebrow">
                      REQUEST · {formatDate(request.createdAt)}
                    </span>
                    <h3>
                      {request.items.length} material
                      {request.items.length === 1 ? "" : "s"} ·{" "}
                      {request.siteLocation}
                    </h3>
                  </div>
                  <StatusBadge status={request.status} />
                </div>
                <ul>
                  {request.items.map((item, index) => (
                    <li key={`${item.material}-${index}`}>
                      {item.material}
                      {item.brand ? ` · ${item.brand}` : ""} — {item.quantity}{" "}
                      {item.unit}
                      {item.specification ? ` · ${item.specification}` : ""}
                    </li>
                  ))}
                </ul>
                {request.notes && <p>{request.notes}</p>}
              </article>
            ))}
          </div>
        )}
        {activity.quotations.length ? (
          <div className="account-panel account-table-panel">
            <div className="account-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Quote</th>
                    <th>Issued</th>
                    <th>Status</th>
                    <th>Valid until</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {activity.quotations.map((q) => (
                    <tr key={q.id}>
                      <td>
                        <b>{q.quoteNumber}</b>
                      </td>
                      <td>{formatDate(q.createdAt)}</td>
                      <td>
                        <StatusBadge status={q.status} />
                      </td>
                      <td>{formatDate(q.validUntil)}</td>
                      <td>
                        <b>{money(q.totalAmount)}</b>
                      </td>
                      <td>
                        <Link
                          className="account-inline-link"
                          to={`/account/quotations/${q.id}`}
                        >
                          View quote <ArrowRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No quotations yet"
            body="When our team prepares a quote from your material request, it will appear here."
            action="Browse materials"
            to="/marketplace"
          />
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
  return (
    <span
      className={`account-status status-${status.toLowerCase().replaceAll("_", "-")}`}
    >
      {status.replaceAll("_", " ")}
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
