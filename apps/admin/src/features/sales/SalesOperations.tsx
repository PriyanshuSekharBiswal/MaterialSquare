import OrderDetails, { type OrderSummary } from "./OrderDetails";
import { Fragment, useState, useEffect, useCallback, useMemo, useRef, type FormEvent } from "react";
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
  ArrowLeft,
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
  createdAt: string;
  customer?: {
    email?: string | null;
    companyName?: string | null;
    gstin?: string | null;
    shippingAddress?: string | null;
    city?: string;
    pincode?: string;
  } | null;
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
    catalogueId?: string | null;
    variantId?: string | null;
    brand?: string;
    specification?: string;
    quantity: number;
    unit: string;
  }[];
};
const distinctRfqItems = (items: Rfq["items"]) => {
  const grouped = new Map<string, Rfq["items"][number]>();
  for (const item of items) {
    const normalize = (value?: string | null) =>
      (value || "").trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    const key = [
      item.catalogueId || normalize(item.material),
      item.variantId || normalize(item.specification),
      normalize(item.brand),
      normalize(item.unit),
    ].join("|");
    const existing = grouped.get(key);
    if (existing) existing.quantity += item.quantity;
    else grouped.set(key, { ...item });
  }
  return [...grouped.values()];
};
type RfqCatalogue = {
  id: string;
  name: string;
  brand?: string;
  image?: string | null;
  galleryImages?: string[];
  price?: string | null;
  packaging?: string | null;
  variants: {
    id: string;
    label: string;
    unit: string;
    image?: string | null;
    price?: string | null;
    attributes?: Record<string, string>;
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
  customerId?: string | null;
  requestId?: string | null;
  quoteNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  status: string;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
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
      quantityMt: string;
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
const salesSectionParam = "salesSection";
function tabFromLocation(availableTabs: readonly Tab[]): Tab {
  const requested = new URLSearchParams(window.location.search).get(salesSectionParam);
  return availableTabs.includes(requested as Tab) ? requested as Tab : availableTabs[0] || "overview";
}
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
const rfqStatusLabel = (status: string) =>
  status === "NEW"
    ? "New"
    : status
        .replaceAll("_", " ")
        .toLocaleLowerCase()
        .replace(/^./, (letter) => letter.toUpperCase());
const rfqReceivedLabel = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Received date unavailable"
    : date.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
};
const rfqAddressPart = (address: string, label: string) =>
  address.match(
    new RegExp(
      `(?:^|,\\s*)${label}:\\s*(.*?)(?=,\\s*(?:Building|Area|Landmark|State):|$)`,
      "i",
    ),
  )?.[1]?.trim() || "";
const normalizeRfqProductName = (value: string) =>
  value.trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const rfqVariantSpecification = (label: string, attributes: Iterable<unknown> = []) => {
  const normalize = (part: string) => part.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, "").trim();
  const parts: string[] = [];
  for (const part of [label, ...attributes].flatMap((value) => String(value ?? "").split(/\s*[·•|]\s*/)).map((entry) => entry.trim()).filter(Boolean)) {
    const normalized = normalize(part);
    if (parts.some((existing) => {
      const prior = normalize(existing);
      return prior === normalized || prior.includes(normalized);
    })) continue;
    for (let index = parts.length - 1; index >= 0; index -= 1) {
      if (normalized.includes(normalize(parts[index]))) parts.splice(index, 1);
    }
    parts.push(part);
  }
  return parts.join(" · ");
};
const rfqQuantityLabel = (quantity: number, unit: string, specification = "") => {
  const packSize = `${unit} ${specification}`.match(/(\d+(?:[.,]\d+)?)\s*(mm|cm|kg|mt|tonnes?|g|ml|l|m)\b/i);
  const count = quantity.toLocaleString("en-IN");
  return packSize ? `${count} × ${packSize[1]} ${packSize[2]}` : `${count} ${unit}`;
};
const omitQuantityPackFromVariant = (variant: string, quantity: string) => {
  const packSize = quantity.match(/×\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|kg|mt|tonnes?|g|ml|l|m)\b/i);
  if (!packSize) return variant;
  const packKey = `${packSize[1]}${packSize[2]}`.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  return variant
    .split(/\s*[·•|]\s*/)
    .filter((part) => !part.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "").startsWith(packKey))
    .join(" · ") || "—";
};

export default function SalesOperations({
  accessToken,
  role,
  customerUrl,
  onBack,
  onSignOut,
  initialRfqId,
  onInitialRfqHandled,
  onContentReady,
  embedded = false,
}: {
  accessToken: string;
  role: string;
  customerUrl?: string;
  onBack: () => void;
  onSignOut: () => void;
  initialRfqId?: string | null;
  onInitialRfqHandled?: () => void;
  onContentReady?: (ready: boolean) => void;
  embedded?: boolean;
}) {
  const [token, setToken] = useState(accessToken);
  const [staffName, setStaffName] = useState("");
  const [tab, setTab] = useState<Tab>(() => tabFromLocation(roleTabs[role] || ["overview"]));
  const [operationsMenuOpen, setOperationsMenuOpen] = useState(false);
  const operationsMenuRef = useRef<HTMLDivElement>(null);
  const quoteEditorRef = useRef<HTMLDivElement>(null);
  const visibleTabs = roleTabs[role] || ["overview"];
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [rfqsLoaded, setRfqsLoaded] = useState(false);
  const [rfqCatalogue, setRfqCatalogue] = useState<RfqCatalogue[]>([]);
  const [rfqAssignees, setRfqAssignees] = useState<RfqAssignee[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [expandedQuoteCustomers, setExpandedQuoteCustomers] = useState<Set<string>>(() => new Set());
  const [quoteView, setQuoteView] = useState<"prepare" | "quotations">("prepare");
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const selectTab = (next: Tab) => {
    if (!visibleTabs.includes(next) || next === tab) return;
    const url = new URL(window.location.href);
    url.searchParams.set(salesSectionParam, next);
    window.history.pushState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    setTab(next);
  };
  useEffect(() => setToken(accessToken), [accessToken]);
  useEffect(() => {
    if (!visibleTabs.includes(tab)) setTab(visibleTabs[0] || "overview");
  }, [role, tab, visibleTabs]);
  useEffect(() => {
    const syncTabFromUrl = () => setTab(tabFromLocation(visibleTabs));
    window.addEventListener("popstate", syncTabFromUrl);
    return () => window.removeEventListener("popstate", syncTabFromUrl);
  }, [visibleTabs]);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get(salesSectionParam) === tab) return;
    url.searchParams.set(salesSectionParam, tab);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [tab]);
  useEffect(() => {
    onContentReady?.(false);
  }, [tab, onContentReady]);
  useEffect(() => {
    if (initialRfqId && !rfqsLoaded) setTab("rfqs");
  }, [initialRfqId, rfqsLoaded]);
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
  const [openedRfqId, setOpenedRfqId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState(false);
  const [revision, setRevision] = useState<RevisionQuote | null>(null);
  const [creatingCustomQuote, setCreatingCustomQuote] = useState(false);
  useEffect(() => {
    if (!initialRfqId || !rfqsLoaded) return;
    const rfq = rfqs.find((record) => record.id === initialRfqId);
    if (rfq) {
      setSelectedRfq(rfq);
      setEditingDraft(false);
      setRevision(null);
      setCreatingCustomQuote(false);
      setQuoteView("prepare");
      setTab("quotes");
    } else {
      setError("The selected customer request is no longer open in the RFQ inbox.");
    }
    onInitialRfqHandled?.();
  }, [initialRfqId, rfqsLoaded, rfqs, onInitialRfqHandled]);
  useEffect(() => {
    if (
      tab !== "quotes" ||
      (!selectedRfq && !editingDraft && !revision && !creatingCustomQuote)
    ) return;
    const frame = window.requestAnimationFrame(() => {
      quoteEditorRef.current?.scrollIntoView({
        block: "start",
        behavior: "instant",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [tab, selectedRfq?.id, editingDraft, revision?.id, creatingCustomQuote]);
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
        const [requests, assignees, catalogue] = await Promise.all([
          request<Rfq[]>("/rfqs"),
          request<RfqAssignee[]>("/rfqs/assignees"),
          request<RfqCatalogue[]>("/products/catalogue"),
        ]);
        setRfqs(requests);
        setRfqAssignees(assignees);
        setRfqCatalogue(catalogue);
        setRfqsLoaded(true);
      }
      if (tab === "quotes") {
        const [savedQuotes, requests] = await Promise.all([
          request<Quote[]>("/quotes"),
          request<Rfq[]>("/rfqs"),
        ]);
        setQuotes(savedQuotes);
        setRfqs(requests);
        setRfqsLoaded(true);
      }
      if (tab === "orders") setOrders(await request<Order[]>("/orders"));
      if (tab === "quotes")
        setProducts(await request<Product[]>("/products/inventory"));
      if (tab === "inquiries")
        setInquiries(await request<Inquiry[]>("/inquiries"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load data");
    } finally {
      setBusy(false);
      onContentReady?.(true);
    }
  }, [onContentReady, request, tab]);
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
  const openedRfq = rfqs.find((record) => record.id === openedRfqId) || null;
  const openedRfqAddress = openedRfq
    ? (() => {
        const rawAddress = openedRfq.siteLocation || "";
        const statePart = rfqAddressPart(rawAddress, "State");
        const postalCode =
          openedRfq.customer?.pincode ||
          rawAddress.match(/\b([1-9]\d{5})\s*$/)?.[1] || "";
        const cityPart =
          openedRfq.customer?.city ||
          statePart.split(",").slice(1).join(",").replace(/\b[1-9]\d{5}\s*$/, "").trim();
        return [
          ["Building", rfqAddressPart(rawAddress, "Building")],
          ["Area", rfqAddressPart(rawAddress, "Area")],
          ["Landmark", rfqAddressPart(rawAddress, "Landmark")],
          ["City", cityPart],
          ["State", statePart.split(",")[0].trim()],
          ["PIN code", postalCode],
        ].filter(([, value]) => Boolean(value)) as [string, string][];
      })()
    : [];
  const quoteRequests = rfqs.filter((record) =>
    ["NEW", "CONTACTED"].includes(record.status),
  );
  const draftStatuses = ["DRAFT", "PENDING_REVIEW", "MARGIN_ADJUSTED"];
  const linkedDraftFor = (requestId: string) =>
    quotes.find(
      (quote) => quote.requestId === requestId && draftStatuses.includes(quote.status),
    );
  const quoteCustomerGroups = useMemo(() => {
    const groups = new Map<string, Quote[]>();
    for (const quote of quotes) {
      const phone = quote.customerPhone.replace(/\D/g, "");
      const key = quote.customerId
        ? `customer:${quote.customerId}`
        : `phone:${phone || quote.customerName.trim().toLocaleLowerCase() || quote.id}`;
      groups.set(key, [...(groups.get(key) || []), quote]);
    }
    const timestamp = (quote: Quote) =>
      new Date(quote.publishedAt || quote.createdAt).getTime() || 0;
    return [...groups.entries()]
      .map(([key, customerQuotes]) => {
        const chronological = [...customerQuotes].sort(
          (a, b) => timestamp(a) - timestamp(b),
        );
        const approved = chronological
          .filter((quote) => ["ACCEPTED", "CONVERTED_TO_ORDER"].includes(quote.status))
          .sort(
            (a, b) =>
              new Date(b.updatedAt || b.publishedAt || b.createdAt).getTime() -
              new Date(a.updatedAt || a.publishedAt || a.createdAt).getTime(),
          );
        const primary = approved[0] || null;
        const others = chronological.filter((quote) => quote.id !== primary?.id);
        return {
          key,
          primary,
          quotes: primary ? [primary, ...others] : chronological,
          otherCount: others.length,
          latestAt: Math.max(...customerQuotes.map(timestamp)),
        };
      })
      .sort((a, b) => b.latestAt - a.latestAt);
  }, [quotes]);
  const quoteEntries = quoteCustomerGroups.flatMap((group) =>
    group.quotes.map((quote, index) => ({
      quote,
      groupKey: group.key,
      isApprovedMain: Boolean(group.primary && index === 0),
      isSecondary: Boolean(group.primary && index > 0),
      otherCount: group.otherCount,
    })),
  );
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
                    selectTab(item);
                    setSelectedRfq(null);
                    setOpenedRfqId(null);
                    setRevision(null);
                    setCreatingCustomQuote(false);
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
                  setCreatingCustomQuote(false);
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
        openedRfq ? (
          <section className="panel-card panel-body rfq-detail-page">
            <button
              type="button"
              className="rfq-detail-back"
              onClick={() => setOpenedRfqId(null)}
            >
              <ArrowLeft size={16} aria-hidden="true" /> Back to RFQ inbox
            </button>
            <header className="rfq-detail-header">
              <div>
                <span className="sales-section-eyebrow">INCOMING REQUEST</span>
                <h2>{openedRfq.requestNumber}</h2>
                <p>Received {rfqReceivedLabel(openedRfq.createdAt)}</p>
              </div>
              <span className="rfq-status-badge" data-status={openedRfq.status}>
                {rfqStatusLabel(openedRfq.status)}
              </span>
            </header>

            {openedRfq.notes && (
              <aside className="rfq-header-customer-note" aria-label="Customer notes">
                <strong>Customer notes</strong>
                <p>{openedRfq.notes}</p>
              </aside>
            )}

            <section className="rfq-detail-card" aria-labelledby="rfq-customer-info-heading">
              <header><h3 id="rfq-customer-info-heading">Customer information</h3></header>
              <dl className="rfq-customer-info-grid">
                <div><dt>Name</dt><dd>{openedRfq.customerName}</dd></div>
                <div><dt>Mobile</dt><dd>{openedRfq.customerPhone}</dd></div>
                <div><dt>Company</dt><dd>{openedRfq.customer?.companyName || "Not provided"}</dd></div>
                <div><dt>GSTIN</dt><dd>{openedRfq.customer?.gstin || "Not provided"}</dd></div>
                <div className="rfq-address-field">
                  <dt>Delivery address</dt>
                  <dd>
                    {openedRfqAddress.length ? (
                      <div className="rfq-address-lines">
                        {openedRfqAddress.map(([label, value]) => (
                          <div key={label}><span>{label}</span><strong>{value}</strong></div>
                        ))}
                      </div>
                    ) : openedRfq.siteLocation}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rfq-detail-card" aria-labelledby="rfq-requested-items-heading">
              <header>
                <h3 id="rfq-requested-items-heading">Requested items</h3>
                <span>{openedRfq.items.length} {openedRfq.items.length === 1 ? "item" : "items"}</span>
              </header>
              <div className="rfq-item-table-scroll">
                <table className="rfq-item-table">
                  <thead>
                    <tr>
                      <th scope="col">Item</th>
                      <th scope="col">Variant</th>
                      <th scope="col">Qty</th>
                      <th scope="col">Catalogue price</th>
                      <th scope="col">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openedRfq.items.map((item, index) => {
                      const listing = rfqCatalogue.find((entry) => entry.id === item.catalogueId) ||
                        rfqCatalogue.find((entry) =>
                          normalizeRfqProductName(entry.name) === normalizeRfqProductName(item.material) &&
                          (!item.brand || normalizeRfqProductName(entry.brand || "") === normalizeRfqProductName(item.brand)),
                        );
                      const variant = listing?.variants.find((entry) => entry.id === item.variantId);
                      const image = variant?.image || listing?.image || listing?.galleryImages?.[0];
                      const cataloguePrice = variant?.price ?? listing?.price ?? null;
                      const quantityLabel = rfqQuantityLabel(item.quantity, item.unit, item.specification);
                      const variantDetails = omitQuantityPackFromVariant(variant
                        ? rfqVariantSpecification(variant.label, Object.values(variant.attributes || {}))
                        : rfqVariantSpecification(item.specification || listing?.packaging || "—"), quantityLabel);
                      const subtotal = cataloguePrice == null ? null : Number(cataloguePrice) * item.quantity;
                      return (
                        <tr key={`${item.material}-${index}`}>
                          <td>
                            <div className="rfq-table-product">
                              <div className="rfq-table-product-image">
                                {image ? <img src={image} alt="" loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} /> : <Package size={21} aria-hidden="true" />}
                              </div>
                              <div><strong>{item.material}</strong><span>{item.brand || listing?.brand || ""}</span></div>
                            </div>
                          </td>
                          <td>{variantDetails}</td>
                          <td className="rfq-table-number">{quantityLabel}</td>
                          <td className="rfq-table-number">{cataloguePrice == null ? "Not listed" : <>{money(cataloguePrice)}<small>per {item.unit}</small></>}</td>
                          <td className="rfq-table-number rfq-table-subtotal">{subtotal == null ? "—" : money(subtotal)}</td>
                        </tr>
                      );
                    })}
                    {!openedRfq.items.length && <tr><td colSpan={5} className="rfq-empty-items">No material lines were included in this request.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            {(openedRfq.attachments ?? []).length > 0 && (
              <section className="rfq-detail-card" aria-label="Request attachments">
                <header><h3>Project files</h3></header>
                <div className="rfq-attachments">
                  {(openedRfq.attachments ?? []).map((attachment) => (
                    <button
                      type="button"
                      className="rfq-attachment-download"
                      key={attachment.id}
                      aria-label={`Download ${attachment.fileName}`}
                      onClick={() => void download(`/rfqs/${openedRfq.id}/attachments/${attachment.id}`, attachment.fileName)}
                    >
                      <FileText size={15} />{attachment.fileName}
                      <small>{(attachment.byteSize / (1024 * 1024)).toFixed(1)} MB</small>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="rfq-detail-card rfq-management-card" aria-labelledby="rfq-management-heading">
              <header><h3 id="rfq-management-heading">Staff management</h3></header>
              <RfqOwnershipControls
                rfqId={openedRfq.id}
                ownerId={openedRfq.assignedStaffId}
                ownerName={openedRfq.assignedStaff?.name}
                staffNotes={openedRfq.staffNotes}
                status={openedRfq.status}
                assignees={rfqAssignees}
                busy={busy}
                mutate={mutate}
                onStatusChange={(status) => void mutate(`/rfqs/${openedRfq.id}/status`, "PATCH", { status })}
              />
            </section>

            <footer className="rfq-detail-actions">
              <button type="button" className="btn-sm btn-secondary" onClick={() => setOpenedRfqId(null)}>Back to inbox</button>
              <button
                type="button"
                className="btn-sm btn-primary"
                onClick={() => {
                  setSelectedRfq(openedRfq);
                  setRevision(null);
                  setEditingDraft(false);
                  setQuoteView("prepare");
                  setOpenedRfqId(null);
                  setTab("quotes");
                }}
              >
                Prepare quotation <ArrowRight size={15} aria-hidden="true" />
              </button>
            </footer>
          </section>
        ) : (
          <section className="panel-card panel-body rfq-inbox-page">
            <header className="rfq-inbox-heading">
              <div>
                <span className="sales-section-eyebrow">SALES WORKSPACE</span>
                <h2>RFQ inbox</h2>
                <p>Open a customer request to review materials and manage its next steps.</p>
              </div>
              <span className="rfq-inbox-total">{rfqs.length} {rfqs.length === 1 ? "request" : "requests"}</span>
            </header>
            {!rfqsLoaded ? (
              <p role="status">{busy ? "Loading customer requests…" : "Loading customer requests…"}</p>
            ) : !rfqs.length ? (
              <p className="rfq-inbox-empty">No RFQs received yet.</p>
            ) : (
              <div className="rfq-inbox-list">
                {rfqs.map((rfq) => (
                  <button
                    type="button"
                    className="rfq-inbox-row"
                    key={rfq.id}
                    onClick={() => setOpenedRfqId(rfq.id)}
                    aria-label={`Open ${rfq.requestNumber}, ${rfq.customerName}`}
                  >
                    <span className="rfq-inbox-identity">
                      <strong>{rfq.requestNumber}</strong>
                      <span>{rfq.customerName}{rfq.customer?.companyName ? ` · ${rfq.customer.companyName}` : ""}</span>
                    </span>
                    <span className="rfq-inbox-meta">
                      <span className="rfq-status-badge" data-status={rfq.status}>{rfqStatusLabel(rfq.status)}</span>
                      <span>{rfqReceivedLabel(rfq.createdAt)}</span>
                    </span>
                    <span className="rfq-inbox-item-count">{rfq.items.length} {rfq.items.length === 1 ? "item" : "items"}</span>
                    <ArrowRight size={18} aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
          </section>
        )
      )}
      {tab === "quotes" && (
        <>
          {selectedRfq || revision || creatingCustomQuote ? (
            <div ref={quoteEditorRef} className="sales-quote-editor-anchor">
              <QuoteEditor
                key={
                  revision?.id ||
                  selectedRfq?.id ||
                  (creatingCustomQuote ? "custom-quote" : undefined) ||
                  `quote-editor-${editorRevision}`
                }
                inventory={products}
                request={request}
                initialRequest={selectedRfq}
                revision={revision}
                customQuotation={creatingCustomQuote}
                editing={editingDraft}
                downloadPdf={download}
                onCancel={() => {
                  setSelectedRfq(null);
                  setRevision(null);
                  setEditingDraft(false);
                  setCreatingCustomQuote(false);
                }}
                onSaved={async () => {
                  setSelectedRfq(null);
                  setRevision(null);
                  setEditingDraft(false);
                  setCreatingCustomQuote(false);
                  setQuoteView("quotations");
                  setEditorRevision((value) => value + 1);
                  await refresh();
                }}
              />
            </div>
          ) : (
            <section className="panel-card panel-body sales-quote-inbox">
              <header className="sales-quote-inbox-heading">
                <div>
                  <span className="sales-section-eyebrow">QUOTATIONS</span>
                  <h2>Prepare customer quotations</h2>
                  <p>Choose a customer request to build a clear, itemized offer.</p>
                </div>
                <div className="sales-quote-inbox-heading-actions">
                  <button
                    type="button"
                    className="btn-sm btn-primary sales-create-custom-quote"
                    onClick={() => {
                      setSelectedRfq(null);
                      setRevision(null);
                      setEditingDraft(false);
                      setCreatingCustomQuote(true);
                    }}
                  >
                    Create custom quotation
                  </button>
                  <span className="sales-saved-quote-count">
                    {quoteView === "prepare"
                      ? `${quoteRequests.length} to prepare`
                      : `${quotes.length} saved`}
                  </span>
                </div>
              </header>
              <div className="sales-quote-inbox-tabs" role="tablist" aria-label="Quotation views">
                <button
                  type="button"
                  role="tab"
                  aria-selected={quoteView === "prepare"}
                  className={quoteView === "prepare" ? "is-active" : ""}
                  onClick={() => setQuoteView("prepare")}
                >
                  To prepare <span>{quoteRequests.length}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={quoteView === "quotations"}
                  className={quoteView === "quotations" ? "is-active" : ""}
                  onClick={() => setQuoteView("quotations")}
                >
                  Saved quotations <span>{quotes.length}</span>
                </button>
              </div>
              {quoteView === "prepare" ? (
                !rfqsLoaded ? (
                  <p role="status">Loading requests…</p>
                ) : quoteRequests.length ? (
                  <div className="sales-quote-request-list">
                    {quoteRequests.map((record) => {
                      const draft = linkedDraftFor(record.id);
                      const uniqueItems = distinctRfqItems(record.items || []);
                      return (
                        <button
                          className="sales-quote-request-card"
                          type="button"
                          key={record.id}
                          onClick={() => {
                            setSelectedRfq(record);
                            setRevision(draft || null);
                            setEditingDraft(Boolean(draft));
                            setCreatingCustomQuote(false);
                          }}
                        >
                          <span className="sales-quote-request-main">
                            <span className="sales-quote-request-id">{record.requestNumber}</span>
                            <strong>{record.customerName}</strong>
                            <span>{record.customer?.companyName || record.customerPhone}</span>
                          </span>
                          <span className="sales-quote-request-items">
                            {uniqueItems.slice(0, 3).map((item, index) => (
                              <span key={`${record.id}-item-${index}`}>
                                {item.material}{item.quantity ? ` · ${item.quantity} ${item.unit}` : ""}
                              </span>
                            ))}
                            {uniqueItems.length > 3 && <small>+{uniqueItems.length - 3} more items</small>}
                          </span>
                          <span className="sales-quote-request-meta">
                            <span className="rfq-status-badge" data-status={record.status}>
                              {draft ? "Draft in progress" : rfqStatusLabel(record.status)}
                            </span>
                            <small>{rfqReceivedLabel(record.createdAt)}</small>
                          </span>
                          <span className="sales-quote-request-action">
                            {draft ? "Continue draft" : "Prepare quotation"}
                            <ArrowRight size={16} aria-hidden="true" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="sales-quote-inbox-empty">
                    <FileText size={24} aria-hidden="true" />
                    <strong>You’re all caught up</strong>
                    <span>New customer requests will appear here when they’re ready for a quotation.</span>
                  </div>
                )
              ) : (
                <p className="sales-quote-inbox-hint">Review the quotations below to edit drafts, publish offers, record acceptance, or download PDFs.</p>
              )}
            </section>
          )}
          {!selectedRfq && !revision && quoteView === "quotations" && (
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
            {quoteEntries.map(({ quote: q, groupKey, isApprovedMain, isSecondary, otherCount }) => {
              if (isSecondary && !expandedQuoteCustomers.has(groupKey)) return null;
              return (
              <Fragment key={q.id}>
              <article className={`record-card sales-saved-quote${isApprovedMain ? " sales-saved-quote-approved" : ""}`}>
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
                    data-status={isApprovedMain ? "ACCEPTED" : q.status}
                  >
                    {isApprovedMain ? "APPROVED" : q.status.replaceAll("_", " ")}
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
                            {option.quantityMt} {option.unit} × {money(option.unitPrice)} / unit · {money(option.lineTotal)}
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
                      setCreatingCustomQuote(false);
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
                        setCreatingCustomQuote(false);
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
                {q.status === "CONVERTED_TO_ORDER" && (
                  <span className="sales-quote-publish-state" role="status">
                    Already converted to an order · cannot publish again
                  </span>
                )}
                {q.status === "QUOTE_SENT" && (
                  <span className="sales-quote-publish-state" role="status">
                    Published · awaiting customer response
                  </span>
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
                <button
                  className="btn-sm btn-secondary"
                  title="Opens WhatsApp with a ready message. Attach the downloaded PDF before sending."
                  onClick={() => {
                    const text = `Hello ${q.customerName}, please find your Material Square quotation ${q.quoteNumber} attached. The quotation total is ${money(q.totalAmount)}. Please let us know if you have any questions.`;
                    window.open(
                      `https://wa.me/91${q.customerPhone}?text=${encodeURIComponent(text)}`,
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }}
                >
                  WhatsApp customer
                </button>
                {q.customerEmail && (
                  <button
                    className="btn-sm btn-secondary"
                    title="Opens an email draft. Attach the downloaded PDF before sending."
                    onClick={() => {
                      const subject = `Material Square quotation ${q.quoteNumber}`;
                      const body = `Hello ${q.customerName},\n\nPlease find your Material Square quotation ${q.quoteNumber} attached. The quotation total is ${money(q.totalAmount)}. Please let us know if you have any questions.\n\nMaterial Square`;
                      window.location.href = `mailto:${encodeURIComponent(q.customerEmail!)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    }}
                  >
                    Email customer
                  </button>
                )}
                <span className="sales-quote-share-note">Attach the downloaded PDF before sending.</span>
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
                                      {option.brandName} · {option.productName} · {option.quantityMt} {option.unit}
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
                  </>
                )}
              </article>
              {isApprovedMain && otherCount > 0 && (
                <button
                  type="button"
                  className="sales-saved-quote-more"
                  aria-expanded={expandedQuoteCustomers.has(groupKey)}
                  onClick={() => setExpandedQuoteCustomers((current) => {
                    const next = new Set(current);
                    if (next.has(groupKey)) next.delete(groupKey);
                    else next.add(groupKey);
                    return next;
                  })}
                >
                  {expandedQuoteCustomers.has(groupKey)
                    ? "Show fewer quotations"
                    : `See ${otherCount} more quotation${otherCount === 1 ? "" : "s"}`}
                </button>
              )}
              </Fragment>
              );
            })}
            </div>
          </section>
          )}
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
                  selectTab(item);
                  setSelectedRfq(null);
                  setRevision(null);
                  setCreatingCustomQuote(false);
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
