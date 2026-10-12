import OrderDetails, { type OrderSummary } from "./OrderDetails";
import { useState, useEffect, useCallback, useRef, type FormEvent } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowRight,
  TrendingUp,
  FileText,
  Truck,
  Package,
  Mail,
  Menu,
} from "lucide-react";
import MaterialSquareLogo from "../../components/MaterialSquareLogo";
import QuoteEditor, { type RevisionQuote } from "./QuoteEditor";
import RfqOwnershipControls from "./RfqOwnershipControls";
import CatalogueManager from "../catalogue/CatalogueManager";
import "./sales-operations.css";

type Rfq = {
  id: string;
  requestNumber: string;
  customerName: string;
  customerPhone: string;
  siteLocation: string;
  status: string;
  assignedStaffId?: string | null;
  assignedStaff?: { id: string; name: string } | null;
  staffNotes?: string | null;
  notes?: string;
  attachments?: {
    id: string;
    fileName: string;
    mimeType: string;
    byteSize: number;
    createdAt: string;
  }[];
  items: {
    material: string;
    brand?: string;
    specification?: string;
    quantity: number;
    unit: string;
  }[];
};
type RfqAssignee = { id: string; name: string; role: string };
type Product = {
  id: string;
  name: string;
  basePricePerMt: string;
  unit: string;
  availableStockMt: string;
};
type Quote = {
  id: string;
  requestId?: string | null;
  quoteNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  status: string;
  totalAmount: string;
  subtotal: string;
  discountAmount: string;
  marginAmount: string;
  marginPct?: string;
  taxAmount: string;
  taxPct?: string;
  freightAmount: string;
  validUntil: string;
  revisedFromId?: string | null;
  revisionNumber: number;
  projectSiteAddress: string;
  sitePincode: string;
  notes?: string | null;
  items: {
    id: string;
    productId?: string | null;
    catalogueId?: string | null;
    variantId?: string | null;
    productName: string;
    brandName: string;
    specification: string;
    quantityMt: string;
    unit: string;
    unitPrice: string;
    lineTotal: string;
    options?: {
      id: string;
      productName: string;
      brandName: string;
      specification: string;
      unit: string;
      unitPrice: string;
      lineTotal: string;
    }[];
  }[];
};
type Order = OrderSummary & {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  manualPaymentStatus: "UNPAID" | "PARTIALLY_PAID" | "PAID";
  dispatch?: { currentStep: number; truckNumber: string } | null;
};
type Inquiry = {
  id: string;
  name: string;
  phone: string;
  message: string;
  location: string;
};
type Analytics = {
  currentMonthOrderValueInr: number;
  activeRfqsCount: number;
  dailyOrderValue: { date: string; value: number }[];
};
const tabs = [
  "overview",
  "rfqs",
  "quotes",
  "orders",
  "inventory",
  "inquiries",
] as const;
type Tab = (typeof tabs)[number];
type AcceptanceChannel = "WHATSAPP" | "EMAIL" | "PHONE";
const labels: Record<Tab, string> = {
  overview: "Overview",
  rfqs: "RFQ inbox",
  quotes: "Quotations",
  orders: "Orders & dispatch",
  inventory: "Catalogue pricing",
  inquiries: "Contact enquiries",
};
const icons = [TrendingUp, FileText, FileText, Truck, Package, Mail];
const roleTabs: Record<string, Tab[]> = {
  SUPER_ADMIN: [...tabs],
  ADMIN: [...tabs],
  SALES_MANAGER: [
    "overview",
    "rfqs",
    "quotes",
    "orders",
    "inventory",
    "inquiries",
  ],
  CATALOG_MANAGER: ["overview", "inventory"],
  PROCUREMENT_HEAD: ["overview", "orders"],
  DISPATCH_OFFICER: ["overview", "orders"],
  ACCOUNTS_MANAGER: ["overview", "orders"],
  CONTENT_MANAGER: ["overview"],
};
const money = (value: number | string) =>
  Number(value).toLocaleString("en-IN", { style: "currency", currency: "INR" });

export default function SalesOperations({
  accessToken,
  role,
  customerUrl,
  onBack,
  onSignOut,
  embedded = false,
}: {
  accessToken: string;
  role: string;
  customerUrl?: string;
  onBack: () => void;
  onSignOut: () => void;
  embedded?: boolean;
}) {
  const [token, setToken] = useState(accessToken);
  const [staffName, setStaffName] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [operationsMenuOpen, setOperationsMenuOpen] = useState(false);
  const operationsMenuRef = useRef<HTMLDivElement>(null);
  const quoteEditorRef = useRef<HTMLDivElement>(null);
  const visibleTabs = roleTabs[role] || ["overview"];
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [rfqsLoaded, setRfqsLoaded] = useState(false);
  const [rfqAssignees, setRfqAssignees] = useState<RfqAssignee[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  useEffect(() => setToken(accessToken), [accessToken]);
  useEffect(() => {
    if (!operationsMenuOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!operationsMenuRef.current?.contains(event.target as Node)) {
        setOperationsMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOperationsMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [operationsMenuOpen]);
  const [editorRevision, setEditorRevision] = useState(0);
  const [selectedRfq, setSelectedRfq] = useState<Rfq | null>(null);
  const [editingDraft, setEditingDraft] = useState(false);
  const [revision, setRevision] = useState<RevisionQuote | null>(null);
  useEffect(() => {
    if (
      tab !== "quotes" ||
      (!selectedRfq && !editingDraft && !revision)
    ) return;
    const frame = window.requestAnimationFrame(() => {
      quoteEditorRef.current?.scrollIntoView({
        block: "start",
        behavior: "instant",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [tab, selectedRfq?.id, editingDraft, revision?.id]);
  const [acceptanceChannels, setAcceptanceChannels] = useState<
    Record<string, AcceptanceChannel>
  >({});
  const [acceptanceSelections, setAcceptanceSelections] = useState<
    Record<string, Record<string, string>>
  >({});
  const request = useCallback(
    async <T,>(path: string, method = "GET", body?: unknown): Promise<T> => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "/api"}${path}`,
        {
          method,
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(65000),
        },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401) onSignOut();
        throw new Error(
          typeof data?.message === "string"
            ? data.message
            : "Request failed. Please try again.",
        );
      }
      return data as T;
    },
    [token, onSignOut],
  );
  const refresh = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      if (tab === "overview")
        setAnalytics(await request<Analytics>("/analytics/dashboard"));
      if (tab === "rfqs") {
        const [requests, assignees] = await Promise.all([
          request<Rfq[]>("/rfqs"),
          request<RfqAssignee[]>("/rfqs/assignees"),
        ]);
        setRfqs(requests);
        setRfqAssignees(assignees);
        setRfqsLoaded(true);
      }
      if (tab === "quotes") setQuotes(await request<Quote[]>("/quotes"));
      if (tab === "orders") setOrders(await request<Order[]>("/orders"));
      if (tab === "quotes")
        setProducts(await request<Product[]>("/products/inventory"));
      if (tab === "inquiries")
        setInquiries(await request<Inquiry[]>("/inquiries"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load data");
    } finally {
      setBusy(false);
    }
  }, [request, tab]);
  useEffect(() => {
    if (token) void refresh();
  }, [token, refresh]);
  const mutate = async (path: string, method: string, body?: unknown) => {
    setBusy(true);
    setError("");
    try {
      await request(path, method, body);
      await refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save changes");
      return false;
    } finally {
      setBusy(false);
    }
  };
  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await request<{
        accessToken: string;
        user: { name: string };
      }>("/auth/staff/login", "POST", {
        email: form.get("email"),
        password: form.get("password"),
      });
      setStaffName(result.user.name);
      setToken(result.accessToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };
  const download = async (path: string, filename: string) => {
    setError("");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "/api"}${path}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          typeof data?.message === "string"
            ? data.message
            : "Could not download document. Please try again.",
        );
      }
      const blob = await response.blob();
      if (!blob.size) throw new Error("The downloaded document is empty.");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    }
  };
  if (!token) return null;

  const innerContent = (
    <>
      <div className="embedded-subnav-bar" ref={operationsMenuRef}>
        <h1 className="operations-current-section">{labels[tab]}</h1>
        {operationsMenuOpen && (
          <div className="embedded-subnav-items" id="operations-section-menu">
            {visibleTabs.map((item) => {
              const Icon = icons[tabs.indexOf(item)];
              return (
                <button
                  key={item}
                  className={`subnav-pill ${tab === item ? "active" : ""}`}
                  onClick={() => {
                    setTab(item);
                    setSelectedRfq(null);
                    setRevision(null);
                    setOperationsMenuOpen(false);
                  }}
                >
                  <Icon size={16} />
                  <span>{labels[item]}</span>
                </button>
              );
            })}
          </div>
        )}
        <button
          type="button"
          className="operations-menu-trigger"
          aria-label="Open operations sections"
          aria-expanded={operationsMenuOpen}
          aria-controls="operations-section-menu"
          title="Open operations sections"
          onClick={() => setOperationsMenuOpen((open) => !open)}
        >
          <Menu size={22} aria-hidden="true" />
        </button>
      </div>

      {error && (
        <p role="alert" className="admin-error">
          {error}
        </p>
      )}
      {tab === "overview" && analytics && (
        <>
          <div className="kpi-grid">
            <article className="kpi-card">
              <h2>Order value this month</h2>
              <p className="kpi-value">
                {money(analytics.currentMonthOrderValueInr)}
              </p>
            </article>
            {visibleTabs.includes("rfqs") ? (
              <button
                type="button"
                className="kpi-card kpi-card-action"
                onClick={() => {
                  setSelectedRfq(null);
                  setRevision(null);
                  setTab("rfqs");
                }}
                aria-label={`View RFQ inbox, ${analytics.activeRfqsCount} new RFQs`}
              >
                <h2>New RFQs</h2>
                <p className="kpi-value">{analytics.activeRfqsCount}</p>
                <span className="kpi-card-link">
                  View RFQ inbox <ArrowRight size={14} aria-hidden="true" />
                </span>
              </button>
            ) : (
              <article className="kpi-card">
                <h2>New RFQs</h2>
                <p className="kpi-value">{analytics.activeRfqsCount}</p>
              </article>
            )}
          </div>
          <section className="panel-card panel-body">
            <h2>Daily order value this month</h2>
            {analytics.dailyOrderValue.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.dailyOrderValue}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar
                    dataKey="value"
                    name="Order value (INR)"
                    fill="#3b82f6"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p>No orders recorded this month.</p>
            )}
          </section>
        </>
      )}
      {tab === "rfqs" && (
        <section className="panel-card panel-body">
          <h2>Customer requests</h2>
          {!rfqsLoaded ? (
            <p role="status">
              {busy
                ? "Loading customer requests…"
                : error
                  ? "Customer requests could not be loaded. Retry to try again."
                  : "Loading customer requests…"}
            </p>
          ) : !rfqs.length ? (
            <p>No RFQs received yet.</p>
          ) : null}
          {rfqs.map((r) => (
            <article className="record-card rfq-request-card" key={r.id}>
              <header className="rfq-request-heading">
                <h3>{r.requestNumber} · {r.customerName}</h3>
                <p>
                  {r.customerPhone} · {r.siteLocation} · {r.status}
                </p>
              </header>
              <ul className="rfq-item-list">
                {r.items.map((i, n) => (
                  <li key={n}>
                    <div className="rfq-item-heading">
                      <strong>{i.material}</strong>
                      {i.brand && <span>{i.brand}</span>}
                    </div>
                    <div className="rfq-item-details">
                      <span className="rfq-item-quantity">
                        {i.quantity} {i.unit}
                      </span>
                      {i.specification && <span>{i.specification}</span>}
                    </div>
                  </li>
                ))}
              </ul>
              {r.notes && <p className="rfq-customer-note">{r.notes}</p>}
              {(r.attachments ?? []).length > 0 && (
                <div className="rfq-attachments">
                  <strong>Project plans and files</strong>
                  {(r.attachments ?? []).map((attachment) => (
                    <button
                      type="button"
                      className="rfq-attachment-download"
                      key={attachment.id}
                      aria-label={`Download ${attachment.fileName}`}
                      onClick={() =>
                        void download(
                          `/rfqs/${r.id}/attachments/${attachment.id}`,
                          attachment.fileName,
                        )
                      }
                    >
                      <FileText size={15} />
                      {attachment.fileName}
                      <small>
                        {(attachment.byteSize / (1024 * 1024)).toFixed(1)} MB
                      </small>
                    </button>
                  ))}
                </div>
              )}
              <RfqOwnershipControls
                rfqId={r.id}
                ownerId={r.assignedStaffId}
                ownerName={r.assignedStaff?.name}
                staffNotes={r.staffNotes}
                assignees={rfqAssignees}
                busy={busy}
                mutate={mutate}
              />
              <label>
                Request status
                <select
                  value={r.status}
                  disabled={busy}
                  onChange={(event) =>
                    void mutate(`/rfqs/${r.id}/status`, "PATCH", {
                      status: event.target.value,
                    })
                  }
                >
                  {["NEW", "CONTACTED", "QUOTED", "CLOSED"].map((status) => (
                    <option key={status} value={status}>
                      {status.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="btn-sm btn-primary"
                onClick={() => {
                  setSelectedRfq(r);
                  setRevision(null);
                  setTab("quotes");
                }}
              >
                Prepare quotation
              </button>
            </article>
          ))}
        </section>
      )}
      {tab === "quotes" && (
        <>
          <div ref={quoteEditorRef} className="sales-quote-editor-anchor">
            <QuoteEditor
              key={
                revision?.id ||
                selectedRfq?.id ||
                `quote-editor-${editorRevision}`
              }
              inventory={products}
              request={request}
              initialRequest={selectedRfq}
              revision={revision}
              editing={editingDraft}
              onCancel={() => setRevision(null)}
              onSaved={async () => {
                setSelectedRfq(null);
                setRevision(null);
                setEditorRevision((value) => value + 1);
                await refresh();
              }}
            />
          </div>
          <section className="panel-card panel-body sales-saved-quotes">
            <div className="sales-saved-quotes-heading">
              <div>
                <span className="sales-section-eyebrow">QUOTE WORKSPACE</span>
                <h2>Saved quotations</h2>
                <p>Review quote details, revise drafts, or download a PDF.</p>
              </div>
              <span className="sales-saved-quote-count">
                {quotes.length} {quotes.length === 1 ? "quotation" : "quotations"}
              </span>
            </div>
            {!quotes.length && (
              <p className="sales-saved-quotes-empty">No quotations created yet.</p>
            )}
            <div className="sales-saved-quote-list">
            {quotes.map((q) => (
              <article className="record-card sales-saved-quote" key={q.id}>
                <header className="sales-saved-quote-header">
                  <div className="sales-saved-quote-identity">
                    <span className="sales-quote-number">{q.quoteNumber}</span>
                    <h3>{q.customerName}</h3>
                    <span className="sales-quote-revision">
                      Revision {q.revisionNumber || 1}
                    </span>
                  </div>
                  <span
                    className="sales-quote-status"
                    data-status={q.status}
                  >
                    {q.status.replaceAll("_", " ")}
                  </span>
                  <div className="sales-quote-total">
                    <span>Quote total</span>
                    <strong>{money(q.totalAmount)}</strong>
                  </div>
                </header>
                {q.requestId && (
                  <div className="sales-request-link-copy">
                    Linked request <strong>#{q.requestId.slice(0, 8).toUpperCase()}</strong>
                  </div>
                )}
                <details className="sales-quote-breakdown">
                  <summary>
                    <span>Review materials and totals</span>
                    <span className="sales-quote-line-count">
                      {(q.items || []).length} {(q.items || []).length === 1 ? "line" : "lines"}
                    </span>
                  </summary>
                  <div className="sales-quote-breakdown-content">
                    <div className="sales-quote-item-list">
                    {(q.items || []).map((item) => (
                      <article className="sales-quote-item" key={item.id}>
                        <div className="sales-quote-item-heading">
                          <strong>{item.productName}</strong>
                          <span>{item.brandName}</span>
                        </div>
                        <p>
                          {item.specification && <span>{item.specification} · </span>}
                          {item.quantityMt} {item.unit} × {money(item.unitPrice)}
                          <strong className="sales-quote-line-total">{money(item.lineTotal)}</strong>
                        </p>
                      {item.options?.map((option) => (
                        <p className="sales-quote-item-option" key={option.id}>
                          <span>Alternative</span>
                          <strong>{option.brandName} · {option.productName}</strong>
                          <small>
                            {option.specification ? `${option.specification} · ` : ""}
                            {money(option.unitPrice)} per {option.unit}
                          </small>
                        </p>
                      ))}
                      </article>
                    ))}
                    </div>
                    <dl className="sales-quote-breakdown-totals">
                      <div><dt>Subtotal</dt><dd>{money(q.subtotal)}</dd></div>
                      <div><dt>Discount</dt><dd>{money(q.discountAmount)}</dd></div>
                      <div><dt>Margin</dt><dd>{money(q.marginAmount)}</dd></div>
                      <div><dt>Tax</dt><dd>{money(q.taxAmount)}</dd></div>
                      <div><dt>Freight</dt><dd>{money(q.freightAmount)}</dd></div>
                    </dl>
                    <p className="sales-quote-validity">
                      Valid until {new Date(q.validUntil).toLocaleString("en-IN")}
                    </p>
                  </div>
                </details>
                <div className="sales-saved-quote-actions">
                {["DRAFT", "PENDING_REVIEW", "MARGIN_ADJUSTED"].includes(
                  q.status,
                ) && (
                  <button
                    className="btn-sm btn-secondary"
                    disabled={busy}
                    onClick={() => {
                      setSelectedRfq(null);
                      setEditingDraft(true);
                      setRevision(q);
                    }}
                  >
                    Edit draft
                  </button>
                )}
                {q.revisedFromId && (
                  <p className="sales-quote-replaces">
                    Replaces{" "}
                    {quotes.find((original) => original.id === q.revisedFromId)
                      ?.quoteNumber || q.revisedFromId}
                  </p>
                )}
                {["QUOTE_SENT", "EXPIRED", "REJECTED"].includes(q.status) &&
                  !quotes.some((next) => next.revisedFromId === q.id) && (
                    <button
                      className="btn-sm btn-secondary"
                      disabled={busy}
                      onClick={() => {
                        setSelectedRfq(null);
                        setEditingDraft(false);
                        setRevision(q);
                      }}
                    >
                      Prepare revision
                    </button>
                  )}
                {["DRAFT", "PENDING_REVIEW", "MARGIN_ADJUSTED"].includes(
                  q.status,
                ) && (
                  <button
                    className="btn-sm btn-primary"
                    disabled={busy}
                    onClick={() =>
                      void mutate(`/quotes/${q.id}/publish`, "POST")
                    }
                  >
                    Publish & queue notification
                  </button>
                )}
                <button
                  className="btn-sm btn-secondary"
                  onClick={() =>
                    void download(
                      `/quotes/${q.id}/pdf`,
                      `Quotation-${q.id}.pdf`,
                    )
                  }
                >
                  Download PDF
                </button>
                </div>
                {q.status === "QUOTE_SENT" && (
                  <>
                    <fieldset className="sales-external-acceptance">
                      <legend>
                        Record an acceptance received outside the website
                      </legend>
                      <label>
                        Communication channel
                        <select
                          aria-label={`Acceptance channel for ${q.quoteNumber}`}
                          disabled={busy}
                          value={acceptanceChannels[q.id] || "WHATSAPP"}
                          onChange={(event) =>
                            setAcceptanceChannels((current) => ({
                              ...current,
                              [q.id]: event.target.value as AcceptanceChannel,
                            }))
                          }
                        >
                          <option value="WHATSAPP">WhatsApp</option>
                          <option value="EMAIL">Email</option>
                          <option value="PHONE">Phone</option>
                        </select>
                      </label>
                      {q.items.flatMap((item) =>
                        item.options?.length
                          ? [
                              <label key={item.id}>
                                Accepted option for {item.productName}
                                <select
                                  aria-label={`Accepted option for ${item.productName}`}
                                  disabled={busy}
                                  value={
                                    acceptanceSelections[q.id]?.[item.id] || ""
                                  }
                                  onChange={(event) =>
                                    setAcceptanceSelections((current) => ({
                                      ...current,
                                      [q.id]: {
                                        ...current[q.id],
                                        [item.id]: event.target.value,
                                      },
                                    }))
                                  }
                                >
                                  <option value="">
                                    Keep quoted option: {item.brandName}
                                  </option>
                                  {item.options.map((option) => (
                                    <option key={option.id} value={option.id}>
                                      {option.brandName} · {option.productName}
                                    </option>
                                  ))}
                                </select>
                              </label>,
                            ]
                          : [],
                      )}
                      <button
                        className="btn-sm btn-primary"
                        disabled={busy}
                        onClick={() =>
                          void mutate(`/quotes/${q.id}/acceptance`, "POST", {
                            channel: acceptanceChannels[q.id] || "WHATSAPP",
                            selections: Object.entries(
                              acceptanceSelections[q.id] || {},
                            )
                              .filter(([, optionId]) => optionId)
                              .map(([itemId, optionId]) => ({
                                itemId,
                                optionId,
                              })),
                          })
                        }
                      >
                        Record customer acceptance
                      </button>
                    </fieldset>
                    <button
                      className="btn-sm btn-secondary"
                      onClick={() => {
                        const text = `Hello ${q.customerName}, your Material Square quotation ${q.quoteNumber} is ready. Reply to this message and our team will share the quotation PDF and answer any questions.`;
                        window.open(
                          `https://wa.me/91${q.customerPhone}?text=${encodeURIComponent(text)}`,
                          "_blank",
                          "noopener,noreferrer",
                        );
                      }}
                    >
                      Open WhatsApp message
                    </button>
                    {q.customerEmail && (
                      <button
                        className="btn-sm btn-secondary"
                        onClick={() => {
                          const subject = `Material Square quotation ${q.quoteNumber}`;
                          const body = `Hello ${q.customerName},\n\nYour Material Square quotation ${q.quoteNumber} is ready. Reply to this email and our team will share the quotation PDF and answer any questions.\n\nMaterial Square`;
                          window.location.href = `mailto:${encodeURIComponent(q.customerEmail!)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                        }}
                      >
                        Open email
                      </button>
                    )}
                  </>
                )}
              </article>
            ))}
            </div>
          </section>
        </>
      )}
      {tab === "orders" && (
        <section className="panel-card panel-body">
          {!["SUPER_ADMIN", "ADMIN", "DISPATCH_OFFICER"].includes(role) && (
            <p>
              Read-only order access. Dispatch staff manage delivery actions.
            </p>
          )}
          {!orders.length && <p>No orders recorded yet.</p>}
          {orders.map((o) => (
            <article className="record-card" key={o.id}>
              <h3>
                {o.orderNumber} · {o.customerName}
              </h3>
              <p>
                {o.status}{" "}
                {o.dispatch &&
                  `· ${o.dispatch.truckNumber} · Dispatch step ${o.dispatch.currentStep}/5`}
              </p>
              <OrderDetails order={o} />
              {["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"].includes(role) &&
                o.manualPaymentStatus !== "PAID" && (
                  <details className="sales-external-acceptance" key={o.manualPaymentStatus}>
                    <summary>Record offline payment</summary>
                    <p>
                      Record an offline cash, UPI, or card payment after staff
                      confirms receipt. You can record an advance now and add
                      later payments against the remaining balance. This does
                      not collect or verify funds.
                    </p>
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        const values = new FormData(event.currentTarget);
                        const details = event.currentTarget.closest("details");
                        void mutate(`/orders/${o.id}/manual-payment`, "PATCH", {
                          amountInr: Number(values.get("amountInr")),
                          method: values.get("method"),
                          reference: values.get("reference") || undefined,
                          note: values.get("note") || undefined,
                        }).then((saved) => {
                          if (saved && details) details.open = false;
                        });
                      }}
                    >
                      <label>
                        Amount received (INR)
                        <input
                          name="amountInr"
                          type="number"
                          min="0.01"
                          max="9999999999.99"
                          step="0.01"
                          required
                          defaultValue={Math.max(
                            0,
                            Number(o.grandTotal || 0) -
                              (o.payments || []).reduce(
                                (sum, payment) => sum + Number(payment.amountInr),
                                0,
                              ),
                          ).toFixed(2)}
                        />
                      </label>
                      <label>
                        Payment mode
                        <select name="method" required defaultValue="CASH">
                          <option value="CASH">Cash</option>
                          <option value="UPI">UPI</option>
                          <option value="CARD">Card</option>
                          <option value="OTHER">Other offline method</option>
                        </select>
                      </label>
                      <label>
                        Reference (optional)
                        <input
                          name="reference"
                          maxLength={120}
                          placeholder="UPI reference or receipt number"
                        />
                      </label>
                      <label>
                        Note (optional)
                        <input
                          name="note"
                          maxLength={500}
                          placeholder="For example, advance received"
                        />
                      </label>
                      <button className="btn-sm btn-primary" disabled={busy}>
                        Record offline payment
                      </button>
                    </form>
                  </details>
                )}
              {o.dispatch &&
                ["SUPER_ADMIN", "ADMIN", "DISPATCH_OFFICER"].includes(role) && (
                  <>
                    <button
                      className="btn-sm btn-primary"
                      disabled={
                        busy ||
                        o.dispatch.currentStep >= 5 ||
                        o.status === "CANCELLED"
                      }
                      onClick={() =>
                        void mutate(`/orders/${o.id}/advance-dispatch`, "PATCH")
                      }
                    >
                      Advance dispatch
                    </button>
                    <button
                      className="btn-sm btn-secondary"
                      onClick={() =>
                        void download(
                          `/orders/${o.id}/challan/pdf`,
                          `Challan-${o.id}.pdf`,
                        )
                      }
                    >
                      Download challan
                    </button>
                  </>
                )}
            </article>
          ))}
        </section>
      )}
      {tab === "inventory" && (
        <CatalogueManager token={token} role={role} onSignOut={onSignOut} customerUrl={customerUrl} />
      )}
      {tab === "inquiries" && (
        <section className="panel-card panel-body">
          {!inquiries.length && <p>No contact enquiries received yet.</p>}
          {inquiries.map((i) => (
            <article className="record-card" key={i.id}>
              <h3>{i.name}</h3>
              <p>
                {i.phone} · {i.location}
              </p>
              <p>{i.message}</p>
            </article>
          ))}
        </section>
      )}
    </>
  );

  if (embedded) {
    return <div className="embedded-operations-view">{innerContent}</div>;
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <MaterialSquareLogo
            size={36}
            lightMode={true}
            tagline="BUILDING BETTER TOGETHER"
          />
        </div>
        <div className="sidebar-nav-scroll">
          <button
            className="btn-sm btn-secondary"
            onClick={onBack}
            style={{ marginBottom: "1rem", width: "100%" }}
          >
            ← Workspace
          </button>
          <span className="nav-group-title">Operations</span>
          {visibleTabs.map((item) => {
            const Icon = icons[tabs.indexOf(item)];
            return (
              <button
                key={item}
                className={`nav-item ${tab === item ? "active" : ""}`}
                onClick={() => {
                  setTab(item);
                  setSelectedRfq(null);
                  setRevision(null);
                }}
              >
                <Icon size={18} className="nav-item-icon" />
                <span>{labels[item]}</span>
              </button>
            );
          })}
        </div>
        <div className="sidebar-footer">
          {staffName && <p className="staff-name">{staffName}</p>}
          <button
            className="sidebar-signout-btn"
            onClick={() => {
              onSignOut();
              setRfqs([]);
              setQuotes([]);
              setOrders([]);
              setInquiries([]);
              setProducts([]);
              setAnalytics(null);
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="admin-main">{innerContent}</main>
    </div>
  );
}
