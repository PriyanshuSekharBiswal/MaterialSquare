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

type Rfq = {
  id: string;
  customerName: string;
  customerPhone: string;
  siteLocation: string;
  status: string;
  notes?: string;
  items: { material: string; quantity: number; unit: string }[];
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
};
type Order = {
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
const labels: Record<Tab, string> = {
  overview: "Overview",
  rfqs: "RFQ inbox",
  quotes: "Quotations",
  orders: "Orders & dispatch",
  inventory: "Catalogue pricing",
  inquiries: "Contact enquiries",
};
const icons = [TrendingUp, FileText, FileText, Truck, Package, Mail];
const money = (value: number | string) =>
  Number(value).toLocaleString("en-IN", { style: "currency", currency: "INR" });

export function App({
  accessToken,
  onBack,
  onSignOut,
}: {
  accessToken: string;
  onBack: () => void;
  onSignOut: () => void;
}) {
  const [token, setToken] = useState(accessToken);
  const [staffName, setStaffName] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  useEffect(() => setToken(accessToken), [accessToken]);
  const [selectedRfq, setSelectedRfq] = useState<Rfq | null>(null);
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
          signal: AbortSignal.timeout(15000),
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
      const [r, q, o, p, i, a] = await Promise.all([
        request<Rfq[]>("/rfqs"),
        request<Quote[]>("/quotes"),
        request<Order[]>("/orders"),
        request<Product[]>("/products/inventory"),
        request<Inquiry[]>("/inquiries"),
        request<Analytics>("/analytics/dashboard"),
      ]);
      setRfqs(r);
      setQuotes(q);
      setOrders(o);
      setProducts(p);
      setInquiries(i);
      setAnalytics(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load data");
    } finally {
      setBusy(false);
    }
  }, [request]);
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
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <button className="btn-sm btn-secondary" onClick={onBack}>
          Customer workspace
        </button>
        <div className="admin-brand">
          <div className="brand-badge">MS</div>
          <div>
            <h2>Material Square</h2>
            <span>Operations & Admin</span>
          </div>
        </div>
        <nav>
          {tabs.map((item, index) => {
            const Icon = icons[index];
            return (
              <button
                key={item}
                className={`nav-item ${tab === item ? "active" : ""}`}
                onClick={() => {
                  setTab(item);
                  setSelectedRfq(null);
                }}
              >
                <Icon size={18} />
                {labels[item]}
              </button>
            );
          })}
        </nav>
        <p className="staff-name">{staffName}</p>
        <button
          className="btn-sm btn-secondary"
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
      </aside>
      <main className="admin-main">
        <header className="admin-header">
          <h1>{labels[tab]}</h1>
          <button
            className="btn-sm btn-secondary"
            disabled={busy}
            onClick={() => void refresh()}
          >
            <RefreshCw size={16} /> {busy ? "Loading…" : "Refresh"}
          </button>
        </header>
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
                      {i.material} — {i.quantity} {i.unit}
                    </li>
                  ))}
                </ul>
                {r.notes && <p>{r.notes}</p>}
                <button
                  className="btn-sm btn-primary"
                  onClick={() => {
                    setSelectedRfq(r);
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
            <section className="panel-card panel-body">
              <h2>Create quotation</h2>
              <p>
                Enter the agreed customer rate. Catalogue items currently use
                metric tonnes.
              </p>
              {!products.length ? (
                <p>
                  Add catalogue products to the database before creating a
                  quotation.
                </p>
              ) : (
                <form
                  key={selectedRfq?.id || "new"}
                  className="operation-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    const ok = await mutate("/quotes", "POST", {
                      customerName: f.get("customerName"),
                      customerPhone: f.get("customerPhone"),
                      projectSiteAddress: f.get("address"),
                      sitePincode: f.get("pincode"),
                      items: [
                        {
                          productId: f.get("productId"),
                          quantityMt: Number(f.get("quantity")),
                          unitPrice: Number(f.get("rate")),
                        },
                      ],
                      freightAmount: Number(f.get("freight")),
                      taxPct: Number(f.get("tax")),
                    });
                    if (ok) setSelectedRfq(null);
                  }}
                >
                  <label>
                    Customer name
                    <input
                      name="customerName"
                      defaultValue={selectedRfq?.customerName}
                      required
                      minLength={2}
                    />
                  </label>
                  <label>
                    Mobile number
                    <input
                      name="customerPhone"
                      defaultValue={selectedRfq?.customerPhone}
                      pattern="[6-9][0-9]{9}"
                      required
                    />
                  </label>
                  <label>
                    Delivery address
                    <input
                      name="address"
                      defaultValue={selectedRfq?.siteLocation}
                      required
                      minLength={5}
                    />
                  </label>
                  <label>
                    PIN code
                    <input name="pincode" pattern="[0-9]{6}" required />
                  </label>
                  <label>
                    Product
                    <select name="productId">
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Quantity (MT)
                    <input
                      name="quantity"
                      type="number"
                      step="0.001"
                      min="0.001"
                      required
                    />
                  </label>
                  <label>
                    Customer rate / MT
                    <input
                      name="rate"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                    />
                  </label>
                  <label>
                    Freight
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
                    Tax %
                    <input
                      name="tax"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      defaultValue="18"
                      required
                    />
                  </label>
                  <button className="btn-sm btn-primary" disabled={busy}>
                    Save draft
                  </button>
                </form>
              )}
            </section>
            <section className="panel-card panel-body">
              <h2>Saved quotations</h2>
              {!quotes.length && <p>No quotations created yet.</p>}
              {quotes.map((q) => (
                <article className="record-card" key={q.id}>
                  <h3>{q.customerName}</h3>
                  <p>
                    {q.quoteNumber} · {q.status} · {money(q.totalAmount)}
                  </p>
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
                      <button className="btn-sm btn-secondary" onClick={() => {
                        const portal = import.meta.env.VITE_CUSTOMER_APP_URL || window.location.origin;
                        const text = `Hello ${q.customerName}, your Material Square quotation ${q.quoteNumber} is ready. Please sign in at ${portal}/account to review it and download the PDF.`;
                        window.open(`https://wa.me/91${q.customerPhone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
                      }}>Open WhatsApp message</button>
                      {q.customerEmail && <button className="btn-sm btn-secondary" onClick={() => {
                        const portal = import.meta.env.VITE_CUSTOMER_APP_URL || window.location.origin;
                        const subject = `Material Square quotation ${q.quoteNumber}`;
                        const body = `Hello ${q.customerName},%0D%0A%0D%0AYour quotation is ready. Please sign in at ${portal}/account to review it and download the PDF.%0D%0A%0D%0AMaterial Square`;
                        window.location.href = `mailto:${encodeURIComponent(q.customerEmail!)}?subject=${encodeURIComponent(subject)}&body=${body}`;
                      }}>Open email</button>}
                    </>
                  )}
                </article>
              ))}
            </section>
          </>
        )}
        {tab === "orders" && (
          <section className="panel-card panel-body">
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
                {o.status === "PENDING_PAYMENT" && (
                  <button className="btn-sm btn-primary" disabled={busy} onClick={() => void mutate(`/orders/${o.id}/payment-confirmed`, "PATCH")}>
                    Confirm payment & create purchase request
                  </button>
                )}
                {o.dispatch && (
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
          <section className="panel-card panel-body">
            {!products.length && <p>No catalogue products in the database.</p>}
            {products.map((p) => (
              <form
                className="record-card operation-form"
                key={`${p.id}-${p.basePricePerMt}`}
                onSubmit={(e) => {
                  e.preventDefault();
                  void mutate(`/products/${p.id}/price`, "PATCH", {
                    basePricePerMt: Number(
                      new FormData(e.currentTarget).get("price"),
                    ),
                  });
                }}
              >
                <h3>{p.name}</h3>
                <label>
                  Base rate / MT
                  <input
                    aria-label={`Base rate for ${p.name}`}
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={p.basePricePerMt}
                    required
                  />
                </label>
                <button className="btn-sm btn-primary" disabled={busy}>
                  Save rate
                </button>
              </form>
            ))}
          </section>
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
      </main>
    </div>
  );
}
export default App;
