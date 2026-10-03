import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Users,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Plus,
  RefreshCw,
  ArrowLeft,
  Search,
  Truck,
  Boxes,
  ShieldCheck,
  ExternalLink,
  Menu,
  X,
} from "lucide-react";
import MaterialSquareLogo from "./components/MaterialSquareLogo";
import LegacyOperations from "./LegacyOperations";
import BusinessConsole from "./BusinessConsole";
import StaffManagement from "./StaffManagement";
import "./workspace.css";
type Material = {
  name: string;
  brand: string;
  quantity: number;
  unit: string;
  specification: string;
};
type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  companyName?: string;
  shippingAddress?: string;
  city: string;
  pincode: string;
  materialList: Material[];
  createdAt?: string;
  lastLoginAt?: string | null;
};
type Followup = {
  id?: string;
  version?: number;
  customerName: string;
  phone: string;
  email: string;
  siteAddress: string;
  city: string;
  pincode: string;
  source: string;
  status: string;
  materials: Material[];
  notes: string;
  updatedAt?: string;
};
type Page<T> = { items: T[]; total: number; page: number };
type Staff = { name: string; phone: string | null; email: string | null; role: string; isDemo: boolean };
type Stats = {
  customers: number;
  openFollowups: number;
  closedFollowups: number;
  demo: boolean;
};
const statuses: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUOTED: "Quoted externally",
  CLOSED: "Closed",
};

const navSections = [
  {
    group: "Core Workspace",
    items: [
      { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
      { id: "customers" as const, label: "Customers", icon: Users },
      { id: "followups" as const, label: "Follow-ups", icon: ClipboardList },
    ],
  },
  {
    group: "Sales & Operations",
    items: [
      { id: "operations" as const, label: "Sales & Dispatch", icon: Truck },
    ],
  },
  {
    group: "Supply & Modules",
    items: [
      { id: "business" as const, label: "Business Modules", icon: Boxes },
    ],
  },
  {
    group: "Security & Admin",
    items: [
      { id: "team" as const, label: "Staff & Roles", icon: ShieldCheck },
    ],
  },
];

const isTabPermitted = (id: string, role?: string) => {
  if (id === "overview") return true;
  if (id === "customers" || id === "followups") {
    return ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"].includes(role || "");
  }
  if (id === "operations") {
    return [
      "SUPER_ADMIN",
      "ADMIN",
      "SALES_MANAGER",
      "DISPATCH_OFFICER",
      "ACCOUNTS_MANAGER",
      "PROCUREMENT_HEAD",
      "CATALOG_MANAGER",
    ].includes(role || "");
  }
  if (id === "business") {
    return role !== "SALES_MANAGER";
  }
  if (id === "team") {
    return role === "SUPER_ADMIN";
  }
  return true;
};
const blank = (): Followup => ({
  customerName: "",
  phone: "",
  email: "",
  siteAddress: "",
  city: "",
  pincode: "",
  source: "WHATSAPP",
  status: "NEW",
  materials: [],
  notes: "",
});
function restoredToken() {
  try {
    return sessionStorage.getItem("ms-staff-token") || "";
  } catch {
    return "";
  }
}
function Materials({ items }: { items: Material[] }) {
  return items.length ? (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Material</th>
            <th>Quantity</th>
            <th>Specification</th>
          </tr>
        </thead>
        <tbody>
          {items.map((m, i) => (
            <tr key={i}>
              <td>
                <strong>{m.name}</strong>
                <small>{m.brand}</small>
              </td>
              <td>
                {m.quantity} {m.unit}
              </td>
              <td>{m.specification || "To be confirmed"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <p className="empty">No materials saved yet.</p>
  );
}
export function App() {
  const [token, setTokenState] = useState(restoredToken),
    [staff, setStaff] = useState<Staff | null>(null);
  const [tab, setTab] = useState<"overview" | "customers" | "followups" | "operations" | "business" | "team">(
    "overview",
  );
  const [stats, setStats] = useState<Stats | null>(null),
    [customers, setCustomers] = useState<Page<Customer>>({
      items: [],
      total: 0,
      page: 1,
    }),
    [followups, setFollowups] = useState<Page<Followup>>({
      items: [],
      total: 0,
      page: 1,
    });
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [demo, setDemo] = useState(false);
  const [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<Customer | null>(null),
    [draft, setDraft] = useState<Followup | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const setToken = useCallback((value: string) => {
    setTokenState(value);
    try {
      if (value) sessionStorage.setItem("ms-staff-token", value);
      else sessionStorage.removeItem("ms-staff-token");
    } catch {}
  }, []);
  const signOut = useCallback(() => {
    setToken("");
    setStaff(null);
  }, [setToken]);
  const request = useCallback(
    async <T,>(path: string, method = "GET", body?: unknown): Promise<T> => {
      const r = await fetch(
        `${import.meta.env.VITE_API_URL || "/api"}${path}`,
        {
          method,
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(15000),
        },
      );
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        if (r.status === 401) {
          setToken("");
          setStaff(null);
        }
        throw new Error(
          data?.message || "Unable to connect. Please try again.",
        );
      }
      return data as T;
    },
    [token, setToken],
  );
  useEffect(() => {
    void request<{ demo: boolean }>("/auth/mode")
      .then((m) => setDemo(m.demo))
      .catch(() => {});
  }, [request]);
  useEffect(() => {
    if (!token) return;
    let active = true;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      q: search,
      page: String(page),
      status,
    });
    void Promise.all([
      request<Staff>("/auth/staff/me"),
      request<Stats>("/workspace/overview"),
      tab === "customers"
        ? request<Page<Customer>>(`/workspace/customers?${params}`)
        : tab === "followups"
          ? request<Page<Followup>>(`/workspace/followups?${params}`)
          : Promise.resolve(null),
    ])
      .then(([user, summary, result]) => {
        if (!active) return;
        setStaff(user);
        setStats(summary);
        if (result && tab === "customers")
          setCustomers(result as Page<Customer>);
        if (result && tab === "followups")
          setFollowups(result as Page<Followup>);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, tab, page, search, status, revision, request]);
  const navigate = (next: typeof tab) => {
    setTab(next);
    setPage(1);
    setQuery("");
    setSearch("");
    setStatus("");
    setSelected(null);
    setDraft(null);
    setNotice("");
    setError("");
  };
  const login = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(e.currentTarget);
    try {
      const result = await request<{ accessToken: string }>(
        "/auth/staff/login",
        "POST",
        {
          ...(String(data.get("identifier") || "").includes("@")
            ? { email: String(data.get("identifier")).trim().toLowerCase() }
            : { phone: String(data.get("identifier") || "").replace(/\D/g, "") }),
          password: data.get("password"),
        },
      );
      setToken(result.accessToken);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const openCustomer = async (id: string) => {
    setBusy(true);
    setError("");
    try {
      setSelected(await request<Customer>(`/workspace/customers/${id}`));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      const { id, updatedAt, ...data } = draft;
      await request(
        id ? `/workspace/followups/${id}` : "/workspace/followups",
        id ? "PUT" : "POST",
        data,
      );
      setDraft(null);
      setSelected(null);
      setNotice("Follow-up saved.");
      setRevision((v) => v + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (!token)
    return (
      <main className="login-shell">
        <form className="login-card" onSubmit={login}>
          <div className="login-logo-container">
            <MaterialSquareLogo size={50} showText={true} lightMode={false} tagline="BUILDING BETTER TOGETHER" />
            <span className="login-badge-sub">EXECUTIVE COMMAND CENTER</span>
          </div>
          {demo && (
            <span
              className="sidebar-mode-badge"
              style={{ alignSelf: "center", background: "#fff0d9", color: "#9a3412", borderColor: "#fed7aa" }}
            >
              Demo environment active
            </span>
          )}
          <label>
            Mobile number or email
            <input
              name="identifier"
              type="text"
              autoComplete="username"
              placeholder="e.g. 9876543210 or staff@materialsquare.com"
              maxLength={254}
              required
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your security password"
              minLength={8}
              required
            />
          </label>
          {error && (
            <p role="alert" className="admin-error">
              {error}
            </p>
          )}
          <button
            className="btn-sm btn-primary"
            style={{ padding: "12px 18px", fontSize: "0.92rem", borderRadius: "10px", marginTop: "4px" }}
            disabled={busy}
          >
            {busy ? "Authenticating…" : "Sign In to Workspace"}
          </button>
          <a
            href="https://material-square.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="login-back-link"
          >
            ← Return to Material Square Marketplace
          </a>
        </form>
      </main>
    );
  const result = tab === "customers" ? customers : followups;
  return (
    <div className="admin-layout">
      {/* Mobile Top Bar */}
      <div className="mobile-top-bar">
        <MaterialSquareLogo size={32} showText={true} lightMode={true} badgeText="ADMIN" />
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileNavOpen((v) => !v)}
          aria-label="Toggle navigation menu"
        >
          {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Backdrop for mobile drawer */}
      <div
        className={`sidebar-backdrop ${mobileNavOpen ? "open" : ""}`}
        onClick={() => setMobileNavOpen(false)}
      />

      {/* Persistent Left Sidebar */}
      <aside className={`admin-sidebar ${mobileNavOpen ? "open" : ""}`}>
        <div className="admin-brand">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate("overview");
              setMobileNavOpen(false);
            }}
            className="admin-brand-link"
          >
            <MaterialSquareLogo
              size={38}
              showText={true}
              lightMode={true}
              badgeText="ADMIN"
              tagline="OPERATIONS CONSOLE"
            />
          </a>
          <button
            className="mobile-menu-btn"
            style={{ display: mobileNavOpen ? "inline-flex" : "none" }}
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Staff Card */}
        <div className="sidebar-staff-card">
          <div className="staff-avatar-badge">
            {staff?.name ? staff.name.charAt(0).toUpperCase() : "M"}
          </div>
          <div className="staff-meta">
            <span className="staff-name">{staff?.name || "Staff Member"}</span>
            <span className="staff-role-chip">
              <span className="live-indicator-dot" />
              {staff?.role ? staff.role.replace(/_/g, " ") : "Operator"}
            </span>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="sidebar-nav-scroll">
          {navSections.map((sec) => {
            const allowedItems = sec.items.filter((item) =>
              isTabPermitted(item.id, staff?.role),
            );
            if (!allowedItems.length) return null;
            return (
              <div key={sec.group} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span className="nav-group-title">{sec.group}</span>
                {allowedItems.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    className={`nav-item ${tab === id ? "active" : ""}`}
                    onClick={() => {
                      navigate(id);
                      setMobileNavOpen(false);
                    }}
                  >
                    <Icon size={18} className="nav-item-icon" />
                    <span>{label}</span>
                    {id === "followups" && stats && stats.openFollowups > 0 && (
                      <span className="nav-item-badge">{stats.openFollowups}</span>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          {(demo || staff?.isDemo) && (
            <span className="sidebar-mode-badge">Demo environment</span>
          )}
          <a
            href="https://material-square.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-ext-link"
          >
            <ExternalLink size={14} />
            <span>Visit Marketplace</span>
          </a>
          <button
            className="sidebar-signout-btn"
            onClick={signOut}
          >
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main">
        <header className="admin-header">
          <div className="header-left">
            <span className="eyebrow">
              <span className="live-indicator-dot" /> Material Square Operations
            </span>
            <h1>
              {tab === "overview"
                ? "Executive Overview"
                : tab === "customers"
                  ? "Customer Accounts"
                  : tab === "followups"
                    ? "Enquiry Follow-ups"
                    : tab === "operations"
                      ? "Sales & Dispatch Command"
                      : tab === "business"
                        ? "Business & Supply Modules"
                        : "Staff & Role Permissions"}
            </h1>
          </div>
          <div className="admin-header-actions">
            <button
              className="btn-sm btn-secondary"
              disabled={loading || busy}
              onClick={() => {
                setRevision((v) => v + 1);
                if (selected) void openCustomer(selected.id);
              }}
            >
              <RefreshCw size={15} className={loading || busy ? "spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>
        </header>
        {error && (
          <p role="alert" className="admin-error">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="saved-notice">
            {notice}
          </p>
        )}
        {loading && <p role="status">Loading workspace…</p>}
        {tab === "overview" && stats && (
          <>
            <div className="kpi-grid">
              {[
                ["Customer accounts", stats.customers],
                ["Open follow-ups", stats.openFollowups],
                ["Closed follow-ups", stats.closedFollowups],
              ].map(([label, value]) => (
                <article className="kpi-card" key={label}>
                  <h2>{label}</h2>
                  <p className="kpi-value">{value}</p>
                </article>
              ))}
            </div>
            <section className="panel-card panel-body">
              <h2>Today’s work</h2>
              <p>
                Review customer material lists and record enquiries received
                through WhatsApp, email or phone.
              </p>
              <div className="workspace-actions">
                <button
                  className="btn-sm btn-primary"
                  onClick={() => navigate("customers")}
                >
                  View customers
                </button>
                <button
                  className="btn-sm btn-secondary"
                  onClick={() => {
                    navigate("followups");
                    setDraft(blank());
                  }}
                >
                  Record an enquiry
                </button>
              </div>
              <p className="muted">
                WhatsApp and email conversations are handled outside this
                workspace. Record each follow-up here when your team receives
                it.
              </p>
            </section>
          </>
        )}
        {["customers", "followups"].includes(tab) && !selected && !draft && (
          <>
            <form
              className="workspace-toolbar"
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
              <button className="btn-sm btn-secondary">Search</button>
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
                    {Object.entries(statuses).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn-sm btn-primary"
                    onClick={() => setDraft(blank())}
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
                {tab === "customers" ? "customer accounts" : "follow-ups"}
              </p>
              {!loading && !result.items.length && (
                <p className="empty">
                  {tab === "customers"
                    ? "Customer accounts appear here after their first sign-in."
                    : "No follow-ups found. Record an enquiry when staff receive it."}
                </p>
              )}
              {tab === "customers"
                ? customers.items.map((c) => (
                    <article className="workspace-record" key={c.id}>
                      <div>
                        <h3>{c.name || "Profile not completed"}</h3>
                        <p>
                          +91 {c.phone}
                          {c.companyName ? ` · ${c.companyName}` : ""}
                        </p>
                        <small>{c.city}</small>
                        <small>Last sign-in: {c.lastLoginAt ? new Date(c.lastLoginAt).toLocaleString("en-IN") : "Not recorded yet"}</small>
                      </div>
                      <button
                        className="btn-sm btn-secondary"
                        disabled={busy}
                        onClick={() => void openCustomer(c.id)}
                      >
                        View account
                      </button>
                    </article>
                  ))
                : followups.items.map((f) => (
                    <article className="workspace-record" key={f.id}>
                      <div>
                        <h3>
                          {f.customerName}{" "}
                          <span
                            className={`status-label status-${f.status.toLowerCase()}`}
                          >
                            {statuses[f.status]}
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
                        className="btn-sm btn-secondary"
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
            <button
              className="btn-sm btn-secondary"
              onClick={() => setSelected(null)}
            >
              <ArrowLeft size={16} />
              Back to customers
            </button>
            <h2>{selected.name || "Profile not completed"}</h2>
            <div className="customer-summary">
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
              <p><strong>Account created</strong>{selected.createdAt ? new Date(selected.createdAt).toLocaleString("en-IN") : "Not available"}</p>
              <p><strong>Last sign-in</strong>{selected.lastLoginAt ? new Date(selected.lastLoginAt).toLocaleString("en-IN") : "Not recorded yet"}</p>
            </div>
            <h3>Saved material list</h3>
            <Materials items={selected.materialList} />
            <div className="workspace-actions">
              <button
                className="btn-sm btn-primary"
                onClick={() => {
                  setTab("followups");
                  setPage(1);
                  setSearch("");
                  setQuery("");
                  setStatus("");
                  setDraft({
                    ...blank(),
                    customerName: selected.name,
                    phone: selected.phone,
                    email: selected.email || "",
                    siteAddress: selected.shippingAddress || "",
                    city: selected.city,
                    pincode: selected.pincode,
                    materials: selected.materialList.map(
                      ({ name, brand, quantity, unit, specification }) => ({
                        name,
                        brand,
                        quantity,
                        unit,
                        specification: specification || "",
                      }),
                    ),
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
            </div>
          </section>
        )}
        {draft && (
          <form className="panel-card panel-body followup-form" onSubmit={save}>
            <div className="workspace-actions">
              <h2>{draft.id ? "Edit follow-up" : "Record an enquiry"}</h2>
              <button
                type="button"
                className="btn-sm btn-secondary"
                onClick={() => {
                  setDraft(null);
                  setSelected(null);
                  setError("");
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
                  onChange={(e) =>
                    setDraft({ ...draft, source: e.target.value })
                  }
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
                  onChange={(e) =>
                    setDraft({ ...draft, status: e.target.value })
                  }
                >
                  {Object.entries(statuses).map(([key, label]) => (
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
        {tab === "operations" && (
          <LegacyOperations
            accessToken={token}
            role={staff?.role || ""}
            onBack={() => navigate("overview")}
            onSignOut={signOut}
            embedded={true}
          />
        )}
        {tab === "business" && (
          <BusinessConsole
            token={token}
            role={staff?.role || ""}
            onBack={() => navigate("overview")}
            onSignOut={signOut}
            embedded={true}
          />
        )}
        {tab === "team" && staff?.role === "SUPER_ADMIN" && (
          <StaffManagement
            token={token}
            onBack={() => navigate("overview")}
            onSignOut={signOut}
            embedded={true}
          />
        )}
      </main>
    </div>
  );
}
export default App;
