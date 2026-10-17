import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { ArrowLeft, ArrowRight, PackageCheck, Plus, Search } from "lucide-react";
import {
  blankFollowup,
  followupStatuses,
  type Customer,
  type Followup,
  type Material,
  type Page,
  type WorkspaceTab,
} from "./contracts";
import { formatEnumLabel } from "../../utils/formatEnumLabel";

const isAcceptedQuote = (status: string) =>
  ["ACCEPTED", "APPROVED", "CONVERTED_TO_ORDER"].includes(status.toUpperCase());
const historyStatusLabel = (status: string) => formatEnumLabel(status);

const historyMoney = (value: string | number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    Number(value || 0),
  );
const historyDate = (value: string) =>
  new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

type CustomerFollowupWorkspaceProps = {
  tab: "customers" | "followups";
  customers: Page<Customer>;
  followups: Page<Followup>;
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  setSearch: Dispatch<SetStateAction<string>>;
  status: string;
  setStatus: Dispatch<SetStateAction<string>>;
  setPage: Dispatch<SetStateAction<number>>;
  page: number;
  loading: boolean;
  busy: boolean;
  selected: Customer | null;
  setSelected: Dispatch<SetStateAction<Customer | null>>;
  openCustomer: (id: string) => void;
  draft: Followup | null;
  setDraft: Dispatch<SetStateAction<Followup | null>>;
  startDraft: (draft?: Followup) => void;
  setTab: Dispatch<SetStateAction<WorkspaceTab>>;
  setError: Dispatch<SetStateAction<string>>;
  save: (event: FormEvent<HTMLFormElement>) => void;
};

export default function CustomerFollowupWorkspace({
  tab,
  customers,
  followups,
  query,
  setQuery,
  setSearch,
  status,
  setStatus,
  setPage,
  page,
  loading,
  busy,
  selected,
  setSelected,
  openCustomer,
  draft,
  setDraft,
  startDraft,
  setTab,
  setError,
  save,
}: CustomerFollowupWorkspaceProps) {
  const result = tab === "customers" ? customers : followups;
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(() => new URLSearchParams(window.location.search).get("adminRfq"));
  useEffect(() => {
    const restoreRequest = () => setSelectedRequestId(new URLSearchParams(window.location.search).get("adminRfq"));
    window.addEventListener("popstate", restoreRequest);
    return () => window.removeEventListener("popstate", restoreRequest);
  }, []);
  const openRequest = (id: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("adminRfq", id);
    window.history.pushState({ ...(window.history.state ?? {}), adminRfq: id }, "", `${url.pathname}${url.search}${url.hash}`);
    setSelectedRequestId(id);
  };
  const closeCustomerOrRequest = () => {
    if (selectedRequestId && window.history.state?.adminRfq) window.history.back();
    else if (!selectedRequestId && window.history.state?.adminCustomer) window.history.back();
    else if (selectedRequestId) setSelectedRequestId(null);
    else setSelected(null);
  };
  const selectedRequest = selected?.rfqs?.find((request) => request.id === selectedRequestId);
  const requests = selected?.rfqs ?? [];
  const requestQuotes = requests.flatMap((request) => request.quotations);
  const allQuotes = [...requestQuotes, ...(selected?.quotations ?? [])];
  const acceptedQuotes = allQuotes.filter((quote) => isAcceptedQuote(quote.status));
  const allOrders = allQuotes.flatMap((quote) => quote.orders);
  const allDeliveries = allOrders.flatMap((order) => order.deliveries);

  return (
    <>
      {!selected && !draft && (
        <>
          <form
            className="workspace-toolbar customer-followup-toolbar"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setSearch(query);
            }}
          >
            <label className="search-field">
              <Search size={18} />
              <input
                aria-label="Search by name or mobile"
                placeholder="Search name or mobile number"
                value={query}
                maxLength={100}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <button type="submit" className="btn-sm btn-primary customer-search-submit">
              <Search size={16} aria-hidden="true" />
              <span>Search</span>
            </button>
            {tab === "followups" && (
              <>
                <select
                  aria-label="Filter status"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All statuses</option>
                  <option value="OPEN">Open follow-ups</option>
                  {Object.entries(followupStatuses).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-sm btn-primary customer-new-followup"
                  onClick={() => startDraft(blankFollowup())}
                >
                  <Plus size={16} />
                  New follow-up
                </button>
              </>
            )}
          </form>
          <section className="panel-card panel-body">
            <p className="muted">
              {result.total}{" "}
              {tab === "customers" ? "customer records" : "follow-ups"}
            </p>
            {!loading && !result.items.length && (
              <p className="empty">
                {tab === "customers"
                  ? "Customer records appear here after a quotation or follow-up is recorded."
                  : "No follow-ups found. Record an enquiry when staff receive it."}
              </p>
            )}
            {tab === "customers"
              ? customers.items.map((c) => (
                  <article className="workspace-record" key={c.id}>
                    <div>
                      <h3>{c.name || "Unnamed contact"}</h3>
                      <p>
                        +91 {c.phone}
                        {c.companyName ? ` · ${c.companyName}` : ""}
                      </p>
                      <small>{c.city}</small>
                      <small>
                        Record created {c.createdAt
                          ? new Date(c.createdAt).toLocaleDateString("en-IN")
                          : "date unavailable"}
                      </small>
                    </div>
                    <button
                      className="btn-sm btn-primary customer-view-contact"
                      disabled={busy}
                      onClick={() => void openCustomer(c.id)}
                    >
                      <span>View contact</span>
                      <ArrowRight size={15} aria-hidden="true" />
                    </button>
                  </article>
                ))
              : followups.items.map((f) => (
                  <article className="workspace-record" key={f.id}>
                    <div>
                      <h3 className="followup-record-heading">
                        <span>{f.customerName}</span>
                        <span
                          className={`status-label status-${f.status.toLowerCase()}`}
                        >
                          {followupStatuses[f.status]}
                        </span>
                      </h3>
                      <p>
                        +91 {f.phone} · {f.source.toLowerCase()} ·{" "}
                        {f.city || "Location to confirm"}
                      </p>
                      <small>
                        {f.updatedAt
                          ? new Date(f.updatedAt).toLocaleString("en-IN")
                          : ""}
                      </small>
                    </div>
                    <button
                      className="btn-sm btn-secondary btn-orange-outline"
                      onClick={() => {
                        setDraft(f);
                        setError("");
                      }}
                    >
                      Open follow-up
                    </button>
                  </article>
                ))}
          </section>
          <div className="pagination">
            <button
              className="btn-sm btn-secondary"
              disabled={page === 1 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span>
              Page {page} of {Math.max(1, Math.ceil(result.total / 20))}
            </span>
            <button
              className="btn-sm btn-secondary"
              disabled={page * 20 >= result.total || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
      {selected && !draft && (
        <section className="panel-card panel-body">
          <div className="customer-profile-header">
            <button
              className="btn-sm btn-secondary btn-orange-outline admin-back-button"
              onClick={closeCustomerOrRequest}
            >
              <ArrowLeft size={16} />
              {selectedRequest ? "Back to customer history" : "Back to customers"}
            </button>
            <div>
              <span className="customer-history-eyebrow">
                {selectedRequest ? "CUSTOMER WORK HISTORY" : "CUSTOMER HISTORY"}
              </span>
              <h2>{selectedRequest?.requestNumber || selected.name || "Profile not completed"}</h2>
            </div>
          </div>
          {!selectedRequest && <div className="customer-summary">
            <p>
              <strong>Mobile</strong>+91 {selected.phone}
            </p>
            <p>
              <strong>Email</strong>
              {selected.email || "Not provided"}
            </p>
            <p>
              <strong>Company</strong>
              {selected.companyName || "Not provided"}
            </p>
            <p>
              <strong>Site address</strong>
              {[selected.shippingAddress, selected.city, selected.pincode]
                .filter(Boolean)
                .join(", ") || "Not provided"}
            </p>
            <p>
              <strong>Record created</strong>
              {selected.createdAt
                ? new Date(selected.createdAt).toLocaleString("en-IN")
                : "Not available"}
            </p>
          </div>}
          {!selectedRequest && <div className="workspace-actions">
            <button
              className="btn-sm btn-primary"
              onClick={() => {
                setTab("followups");
                setPage(1);
                setSearch("");
                setQuery("");
                setStatus("");
                startDraft({
                  ...blankFollowup(),
                  customerName: selected.name,
                  phone: selected.phone,
                  email: selected.email || "",
                  siteAddress: selected.shippingAddress || "",
                  city: selected.city,
                  pincode: selected.pincode,
                  materials: [],
                });
              }}
            >
              Record follow-up
            </button>
            <a
              className="btn-sm btn-secondary"
              href={`https://wa.me/91${selected.phone}`}
              target="_blank"
              rel="noreferrer"
            >
              Open WhatsApp
            </a>
          </div>}
          {selectedRequest ? (
            <div className="customer-request-page">
              <div className="customer-history-section-heading">
                <div>
                  <span className="customer-history-eyebrow">WORK REQUEST</span>
                  <h3>{selectedRequest.customerName}</h3>
                  <p>{selectedRequest.siteLocation || "Delivery site not provided"}</p>
                </div>
                <span className="customer-history-status">{historyStatusLabel(selectedRequest.status)}</span>
              </div>
              <div className="customer-history-kpis">
                <div><strong>{selectedRequest.quotations.length}</strong><span>Quotations</span></div>
                <div><strong>{selectedRequest.quotations.filter((quote) => isAcceptedQuote(quote.status)).length}</strong><span>Accepted</span></div>
                <div><strong>{selectedRequest.quotations.flatMap((quote) => quote.orders).length}</strong><span>Orders</span></div>
                <div><strong>{selectedRequest.quotations.flatMap((quote) => quote.orders).flatMap((order) => order.deliveries).length}</strong><span>Deliveries</span></div>
              </div>
              <div className="customer-history-list">
                <h3>Quotations under this request</h3>
                {!selectedRequest.quotations.length && <p className="empty">No quotations have been created for this request yet.</p>}
                {selectedRequest.quotations.map((quote) => (
                  <article className="customer-history-card" key={quote.quoteNumber}>
                    <div className="customer-history-card-heading">
                      <div><span className="customer-history-eyebrow">QUOTATION</span><h4>{quote.quoteNumber}</h4></div>
                      <span className={`customer-history-status ${isAcceptedQuote(quote.status) ? "is-complete" : ""}`}>{historyStatusLabel(quote.status)}</span>
                    </div>
                    <div className="customer-history-meta">
                      <span>Total <strong>{historyMoney(quote.totalAmount)}</strong></span>
                      <span>Created <strong>{historyDate(quote.createdAt)}</strong></span>
                      {quote.publishedAt && <span>Sent <strong>{historyDate(quote.publishedAt)}</strong></span>}
                    </div>
                    {quote.orders.map((order) => (
                      <div className="customer-order-history" key={order.orderNumber}>
                        <div className="customer-history-card-heading">
                          <div><span className="customer-history-eyebrow">ORDER</span><h4>{order.orderNumber}</h4></div>
                          <span className="customer-history-status">{historyStatusLabel(order.status)}</span>
                        </div>
                        <div className="customer-history-meta"><span>Order total <strong>{historyMoney(order.grandTotal)}</strong></span><span>Placed <strong>{historyDate(order.createdAt)}</strong></span></div>
                        <div className="customer-delivery-history">
                          <strong><PackageCheck size={16} /> Deliveries ({order.deliveries.length})</strong>
                          {order.deliveries.length ? order.deliveries.map((delivery) => (
                            <p key={delivery.deliveryNumber}><b>{delivery.deliveryNumber}</b> · {historyDate(delivery.deliveredAt)}{delivery.notes ? ` · ${delivery.notes}` : ""}</p>
                          )) : <p>No delivery recorded yet.</p>}
                        </div>
                      </div>
                    ))}
                    {!quote.orders.length && <p className="customer-history-empty-note">No order has been created from this quotation.</p>}
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="customer-history-kpis">
                <div><strong>{requests.length}</strong><span>Work requests</span></div>
                <div><strong>{allQuotes.length}</strong><span>Total quotations</span></div>
                <div><strong>{acceptedQuotes.length}</strong><span>Accepted</span></div>
                <div><strong>{allDeliveries.length}</strong><span>Deliveries</span></div>
              </div>
              <div className="customer-history-list">
                <div className="customer-history-section-heading">
                  <div><h3>Work requests</h3><p>Each request has its own number and history page.</p></div>
                  <span className="customer-history-count">{requests.length} {requests.length === 1 ? "request" : "requests"}</span>
                </div>
                {!requests.length && <p className="empty">No website requests are linked to this customer yet.</p>}
                {requests.map((request) => {
                  const acceptedCount = request.quotations.filter((quote) => isAcceptedQuote(quote.status)).length;
                  const orderCount = request.quotations.reduce((count, quote) => count + quote.orders.length, 0);
                  const deliveryCount = request.quotations.flatMap((quote) => quote.orders).reduce((count, order) => count + order.deliveries.length, 0);
                  return (
                    <article className="customer-request-card" key={request.id}>
                      <div className="customer-request-card-main">
                        <span className="customer-history-eyebrow">REQUEST NUMBER</span>
                        <h4>{request.requestNumber}</h4>
                        <p>{request.customerName}{request.siteLocation ? ` · ${request.siteLocation}` : ""}</p>
                        <small>{historyDate(request.createdAt)} · {historyStatusLabel(request.status)}</small>
                      </div>
                      <div className="customer-request-card-stats">
                        <span><strong>{request.quotations.length}</strong> quotes</span>
                        <span><strong>{acceptedCount}</strong> accepted</span>
                        <span><strong>{orderCount}</strong> orders</span>
                        <span><strong>{deliveryCount}</strong> deliveries</span>
                      </div>
                      <button className="btn-sm btn-primary" onClick={() => openRequest(request.id)}>
                        View request <ArrowRight size={15} />
                      </button>
                    </article>
                  );
                })}
              </div>
              {!!selected?.quotations?.length && (
                <div className="customer-history-list customer-custom-quotes">
                  <div className="customer-history-section-heading"><div><h3>Custom quotations</h3><p>These quotations were created without a linked website request.</p></div></div>
                  {selected.quotations.map((quote) => (
                    <article className="customer-history-card" key={quote.quoteNumber}>
                      <div className="customer-history-card-heading"><div><span className="customer-history-eyebrow">CUSTOM QUOTATION</span><h4>{quote.quoteNumber}</h4></div><span className={`customer-history-status ${isAcceptedQuote(quote.status) ? "is-complete" : ""}`}>{historyStatusLabel(quote.status)}</span></div>
                      <div className="customer-history-meta"><span>Total <strong>{historyMoney(quote.totalAmount)}</strong></span><span>Created <strong>{historyDate(quote.createdAt)}</strong></span>{quote.publishedAt && <span>Sent <strong>{historyDate(quote.publishedAt)}</strong></span>}</div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      )}
      {draft && (
        <form className="panel-card panel-body followup-form" onSubmit={save}>
          <div className="followup-form-header">
            <h2>{draft.id ? "Edit follow-up" : "Record an enquiry"}</h2>
            <button
              type="button"
              className="btn-sm btn-secondary btn-orange-outline"
              onClick={() => {
                if (window.history.state?.adminDraft) window.history.back();
                else {
                  setDraft(null);
                  setSelected(null);
                  setError("");
                }
              }}
            >
              Cancel
            </button>
          </div>
          <div className="field-grid">
            {(
              [
                ["customerName", "Customer name", "text"],
                ["phone", "Mobile number", "tel"],
                ["email", "Email", "email"],
                ["siteAddress", "Site / delivery address", "text"],
                ["city", "City", "text"],
                ["pincode", "PIN code", "text"],
              ] as const
            ).map(([key, label, type]) => (
              <label key={key}>
                {label}
                <input
                  value={draft[key]}
                  type={type}
                  required={key === "customerName" || key === "phone"}
                  minLength={key === "customerName" ? 2 : undefined}
                  maxLength={
                    key === "phone"
                      ? 10
                      : key === "pincode"
                        ? 6
                        : key === "siteAddress"
                          ? 500
                          : key === "email"
                            ? 254
                            : 100
                  }
                  pattern={
                    key === "phone"
                      ? "[6-9][0-9]{9}"
                      : key === "pincode"
                        ? "[1-9][0-9]{5}"
                        : undefined
                  }
                  onChange={(e) =>
                    setDraft({ ...draft, [key]: e.target.value })
                  }
                />
              </label>
            ))}
            <label>
              Received through
              <select
                value={draft.source}
                onChange={(e) => setDraft({ ...draft, source: e.target.value })}
              >
                <option value="WHATSAPP">WhatsApp</option>
                <option value="EMAIL">Email</option>
                <option value="PHONE">Phone</option>
              </select>
            </label>
            <label>
              Status
              <select
                aria-label="Follow-up status"
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value })}
              >
                {Object.entries(followupStatuses).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <h3>Requested materials</h3>
          {draft.materials.map((m, i) => (
            <div className="material-row" key={i}>
              {(
                [
                  ["name", "Material"],
                  ["brand", "Brand"],
                  ["quantity", "Quantity"],
                  ["unit", "Unit"],
                  ["specification", "Size / specification"],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    aria-label={`${label} ${i + 1}`}
                    type={key === "quantity" ? "number" : "text"}
                    min={key === "quantity" ? "0.001" : undefined}
                    max={key === "quantity" ? "1000000" : undefined}
                    step="any"
                    required={["name", "unit", "quantity"].includes(key)}
                    maxLength={
                      key === "specification"
                        ? 500
                        : key === "name"
                          ? 300
                          : key === "unit"
                            ? 50
                            : 100
                    }
                    value={m[key]}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        materials: draft.materials.map((row, n) =>
                          n === i
                            ? {
                                ...row,
                                [key]:
                                  key === "quantity"
                                    ? Number(e.target.value)
                                    : e.target.value,
                              }
                            : row,
                        ),
                      })
                    }
                  />
                </label>
              ))}
              <button
                type="button"
                className="btn-sm btn-secondary"
                onClick={() =>
                  setDraft({
                    ...draft,
                    materials: draft.materials.filter((_, n) => n !== i),
                  })
                }
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn-sm btn-secondary"
            disabled={draft.materials.length >= 100}
            onClick={() =>
              setDraft({
                ...draft,
                materials: [
                  ...draft.materials,
                  {
                    name: "",
                    brand: "",
                    quantity: 1,
                    unit: "Pieces",
                    specification: "",
                  },
                ],
              })
            }
          >
            Add material
          </button>
          <label>
            Staff notes
            <textarea
              maxLength={5000}
              rows={4}
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </label>
          <button className="btn-sm btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Save follow-up"}
          </button>
        </form>
      )}
    </>
  );
}
