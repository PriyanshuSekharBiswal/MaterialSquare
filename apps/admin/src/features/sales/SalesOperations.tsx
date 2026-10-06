import OrderDetails, { type OrderSummary } from "./OrderDetails";
import { useState, useEffect, useCallback, type FormEvent } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  FileText,
  Truck,
  Package,
  Mail,
  RefreshCw,
} from "lucide-react";
import MaterialSquareLogo from "../../components/MaterialSquareLogo";
import QuoteEditor, { type RevisionQuote } from "./QuoteEditor";
import CatalogueManager from "../catalogue/CatalogueManager";
import "./sales-operations.css";

type Rfq = {
  id: string;
  customerName: string;
  customerPhone: string;
  siteLocation: string;
  status: string;
  notes?: string;
  items: {
    material: string;
    brand?: string;
    specification?: string;
    quantity: number;
    unit: string;
  }[];
};
type Product = {
  id: string;
  name: string;
  basePricePerMt: string;
  unit: string;
  availableStockMt: string;
};
type Quote = {
  id: string;
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
  onBack,
  onSignOut,
  embedded = false,
}: {
  accessToken: string;
  role: string;
  onBack: () => void;
  onSignOut: () => void;
  embedded?: boolean;
}) {
  const [token, setToken] = useState(accessToken);
  const [staffName, setStaffName] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const visibleTabs = roleTabs[role] || ["overview"];
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  useEffect(() => setToken(accessToken), [accessToken]);
  const [editorRevision, setEditorRevision] = useState(0);
  const [selectedRfq, setSelectedRfq] = useState<Rfq | null>(null);
  const [editingDraft, setEditingDraft] = useState(false);
  const [revision, setRevision] = useState<RevisionQuote | null>(null);
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
      if (tab === "rfqs") setRfqs(await request<Rfq[]>("/rfqs"));
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
      if (!response.ok) throw new Error("Could not download document");
      const url = URL.createObjectURL(await response.blob());
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
      <div className="embedded-subnav-bar">
        <div className="embedded-subnav-items">
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
                }}
              >
                <Icon size={16} />
                <span>{labels[item]}</span>
              </button>
            );
          })}
        </div>
        <button
          className="btn-sm btn-secondary"
          disabled={busy}
          onClick={() => void refresh()}
        >
          <RefreshCw size={15} className={busy ? "spin" : ""} />
          <span>{busy ? "Loading…" : "Refresh"}</span>
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
            <article className="kpi-card">
              <h2>New RFQs</h2>
              <p className="kpi-value">{analytics.activeRfqsCount}</p>
            </article>
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
          {!rfqs.length && <p>No RFQs received yet.</p>}
          {rfqs.map((r) => (
            <article className="record-card" key={r.id}>
              <h3>{r.customerName}</h3>
              <p>
                {r.customerPhone} · {r.siteLocation} · {r.status}
              </p>
              <ul>
                {r.items.map((i, n) => (
                  <li key={n}>
                    {i.material}
                    {i.brand ? ` · ${i.brand}` : ""} — {i.quantity} {i.unit}
                    {i.specification ? ` · ${i.specification}` : ""}
                  </li>
                ))}
              </ul>
              {r.notes && <p>{r.notes}</p>}
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
          <section className="panel-card panel-body">
            <h2>Saved quotations</h2>
            {!quotes.length && <p>No quotations created yet.</p>}
            {quotes.map((q) => (
              <article className="record-card" key={q.id}>
                <h3>{q.customerName}</h3>
                <p>
                  {q.quoteNumber} · Revision {q.revisionNumber || 1} ·{" "}
                  {q.status} · {money(q.totalAmount)}
                </p>
                <details>
                  <summary>Review materials and totals</summary>
                  {(q.items || []).map((item) => (
                    <div key={item.id}>
                      <p>
                        <strong>
                          {item.productName} · {item.brandName}
                        </strong>
                        <br />
                        {item.specification} · {item.quantityMt} {item.unit} ×{" "}
                        {money(item.unitPrice)} = {money(item.lineTotal)}
                      </p>
                      {item.options?.map((option) => (
                        <p key={option.id}>
                          Brand option: <strong>{option.brandName}</strong> ·{" "}
                          {option.productName}
                          {option.specification
                            ? ` · ${option.specification}`
                            : ""}{" "}
                          · {money(option.unitPrice)} per {option.unit}
                        </p>
                      ))}
                    </div>
                  ))}
                  <p>
                    Subtotal {money(q.subtotal)} · Discount{" "}
                    {money(q.discountAmount)} · Margin {money(q.marginAmount)} ·
                    Tax {money(q.taxAmount)} · Freight {money(q.freightAmount)}
                  </p>
                  <p>
                    Valid until {new Date(q.validUntil).toLocaleString("en-IN")}
                  </p>
                </details>
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
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Edit draft
                  </button>
                )}
                {q.revisedFromId && (
                  <p>
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
                        window.scrollTo({ top: 0, behavior: "smooth" });
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
        <CatalogueManager token={token} role={role} onSignOut={onSignOut} />
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
