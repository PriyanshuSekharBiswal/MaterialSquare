import OrderDetails, { type OrderSummary } from "./OrderDetails";
import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef, type FormEvent } from "react";
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
import { formatQuantityUnit } from "../../quantity-format";
import { formatEnumLabel } from "../../utils/formatEnumLabel";
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
  createdAt: string;
  status: string;
  manualPaymentStatus: "UNPAID" | "PARTIALLY_PAID" | "PAID";
  quotation?: {
    id: string;
    quoteNumber: string;
    requestId?: string | null;
    request?: { requestNumber: string } | null;
  } | null;
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
type RfqStatusFilter = "ALL" | "NEW" | "CONTACTED" | "QUOTED" | "CLOSED";
const rfqStatusFilters: { value: RfqStatusFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "QUOTED", label: "Quoted" },
  { value: "CLOSED", label: "Closed" },
];
const salesSectionParam = "salesSection";
const salesRfqParam = "salesRfq";
const salesQuoteGroupParam = "salesQuoteGroup";
const salesOrderGroupParam = "salesOrderGroup";
const salesQuoteRequestParam = "salesQuoteRequest";
const salesOrderRequestParam = "salesOrderRequest";
function tabFromLocation(availableTabs: readonly Tab[]): Tab {
  const requested = new URLSearchParams(window.location.search).get(salesSectionParam);
  return availableTabs.includes(requested as Tab) ? requested as Tab : availableTabs[0] || "overview";
}
type AcceptanceChannel = "WHATSAPP" | "EMAIL" | "PHONE";
const labels: Record<Tab, string> = {
  overview: "Overview",
  rfqs: "Requests",
  quotes: "Quotations",
  orders: "Orders",
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
const rfqStatusLabel = (status: string) => formatEnumLabel(status);
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
const rfqQuantityLabel = (quantity: number, unit: string) =>
  formatQuantityUnit(quantity, unit);
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
  onContentReady,
  embedded = false,
}: {
  accessToken: string;
  role: string;
  customerUrl?: string;
  onBack: () => void;
  onSignOut: () => void;
  onContentReady?: (ready: boolean) => void;
  embedded?: boolean;
}) {
  const [token, setToken] = useState(accessToken);
  const [staffName, setStaffName] = useState("");
  const [tab, setTab] = useState<Tab>(() => tabFromLocation(roleTabs[role] || ["overview"]));
  const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(() => new Set([tabFromLocation(roleTabs[role] || ["overview"])]));
  const [operationsMenuOpen, setOperationsMenuOpen] = useState(false);
  const operationsMenuRef = useRef<HTMLDivElement>(null);
  const quoteEditorRef = useRef<HTMLDivElement>(null);
  const visibleTabs = roleTabs[role] || ["overview"];
  useLayoutEffect(() => {
    setVisitedTabs((current) => current.has(tab) ? current : new Set(current).add(tab));
  }, [tab]);
  const auxiliaryTabs = visibleTabs.filter(
    (item) =>
      !(embedded && item === "inventory") &&
      (embedded || !(["rfqs", "quotes", "orders"] as Tab[]).includes(item)),
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [rfqStatusFilter, setRfqStatusFilter] = useState<RfqStatusFilter>("ALL");
  const [rfqsLoaded, setRfqsLoaded] = useState(false);
  const [rfqCatalogue, setRfqCatalogue] = useState<RfqCatalogue[]>([]);
  const [rfqAssignees, setRfqAssignees] = useState<RfqAssignee[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quoteToSend, setQuoteToSend] = useState<Quote | null>(null);
  const [recentlySentQuoteId, setRecentlySentQuoteId] = useState("");
  const [quoteRequestFilterId, setQuoteRequestFilterId] = useState<string | null>(() => new URLSearchParams(window.location.search).get(salesQuoteRequestParam));
  const [orderRequestFilterId, setOrderRequestFilterId] = useState<string | null>(() => new URLSearchParams(window.location.search).get(salesOrderRequestParam));
  const [openedQuoteGroupKey, setOpenedQuoteGroupKey] = useState<string | null>(() => new URLSearchParams(window.location.search).get(salesQuoteGroupParam));
  const [openedOrderGroupKey, setOpenedOrderGroupKey] = useState<string | null>(() => new URLSearchParams(window.location.search).get(salesOrderGroupParam));
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const visibleRfqs = rfqStatusFilter === "ALL"
    ? rfqs
    : rfqs.filter((rfq) => rfq.status === rfqStatusFilter);
  const selectTab = (next: Tab, requestId?: string | null) => {
    if (!visibleTabs.includes(next) || next === tab) return;
    const url = new URL(window.location.href);
    url.searchParams.set(salesSectionParam, next);
    if (next === "quotes" && requestId !== undefined) {
      if (requestId) url.searchParams.set(salesQuoteRequestParam, requestId);
      else url.searchParams.delete(salesQuoteRequestParam);
    }
    if (next === "orders" && requestId !== undefined) {
      if (requestId) url.searchParams.set(salesOrderRequestParam, requestId);
      else url.searchParams.delete(salesOrderRequestParam);
    }
    window.history.pushState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    setTab(next);
  };
  const navigateWorkflowPage = (next: Tab, requestId: string | null = null) => {
    if (next === "quotes") {
      setQuoteRequestFilterId(requestId);
      if (requestId !== quoteRequestFilterId) setOpenedQuoteGroupKey(null);
    }
    if (next === "orders") {
      setOrderRequestFilterId(requestId);
      if (requestId !== orderRequestFilterId) setOpenedOrderGroupKey(null);
    }
    selectTab(next, requestId);
  };
  useEffect(() => setToken(accessToken), [accessToken]);
  useEffect(() => {
    if (!visibleTabs.includes(tab)) setTab(visibleTabs[0] || "overview");
  }, [role, tab, visibleTabs]);
  useEffect(() => {
    const syncTabFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      setTab(tabFromLocation(visibleTabs));
      setOpenedRfqId(params.get(salesRfqParam));
      setOpenedQuoteGroupKey(params.get(salesQuoteGroupParam));
      setOpenedOrderGroupKey(params.get(salesOrderGroupParam));
      setQuoteRequestFilterId(params.get(salesQuoteRequestParam));
      setOrderRequestFilterId(params.get(salesOrderRequestParam));
    };
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
  const [openedRfqId, setOpenedRfqId] = useState<string | null>(() => new URLSearchParams(window.location.search).get(salesRfqParam));
  const openRfq = (id: string) => {
    if (id === openedRfqId) return;
    const url = new URL(window.location.href);
    url.searchParams.set(salesSectionParam, "rfqs");
    url.searchParams.set(salesRfqParam, id);
    window.history.pushState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    setOpenedRfqId(id);
    setTab("rfqs");
  };
  const closeRfq = () => {
    if (new URLSearchParams(window.location.search).has(salesRfqParam)) {
      window.history.back();
      return;
    }
    setOpenedRfqId(null);
  };
  const openSalesGroup = (type: "quote" | "order", key: string) => {
    const param = type === "quote" ? salesQuoteGroupParam : salesOrderGroupParam;
    if (new URLSearchParams(window.location.search).get(param) === key) return;
    const url = new URL(window.location.href);
    url.searchParams.set(param, key);
    window.history.pushState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    if (type === "quote") setOpenedQuoteGroupKey(key);
    else setOpenedOrderGroupKey(key);
  };
  const closeSalesGroup = (type: "quote" | "order") => {
    const param = type === "quote" ? salesQuoteGroupParam : salesOrderGroupParam;
    if (new URLSearchParams(window.location.search).has(param)) {
      window.history.back();
      return;
    }
    if (type === "quote") setOpenedQuoteGroupKey(null);
    else setOpenedOrderGroupKey(null);
  };
  const [editingDraft, setEditingDraft] = useState(false);
  const [revision, setRevision] = useState<RevisionQuote | null>(null);
  const [creatingCustomQuote, setCreatingCustomQuote] = useState(false);
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
        const [requests, assignees, catalogue, savedQuotes, linkedOrders] = await Promise.all([
          request<Rfq[]>("/rfqs"),
          request<RfqAssignee[]>("/rfqs/assignees"),
          request<RfqCatalogue[]>("/products/catalogue"),
          request<Quote[]>("/quotes"),
          request<Order[]>("/orders"),
        ]);
        setRfqs(requests);
        setRfqAssignees(assignees);
        setRfqCatalogue(catalogue);
        setQuotes(savedQuotes);
        setOrders(linkedOrders);
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
      await request<{ ok: true }>("/auth/staff/login", "POST", {
        email: form.get("email"),
        password: form.get("password"),
      });
      const user = await request<{ name: string }>("/auth/staff/me");
      setStaffName(user.name);
      setToken("staff-cookie-session");
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
  const openedRfqQuotes = openedRfq
    ? quotes
        .filter((quote) => quote.requestId === openedRfq.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];
  const openedRfqOrders = openedRfq
    ? orders.filter((order) => order.quotation?.requestId === openedRfq.id)
    : [];
  const openedRfqAcceptedQuotes = openedRfqQuotes.filter((quote) =>
    ["ACCEPTED", "CONVERTED_TO_ORDER"].includes(quote.status),
  );
  const openedRfqSentQuotes = openedRfqQuotes.filter((quote) =>
    Boolean(quote.publishedAt) ||
    ["QUOTE_SENT", "EXPIRED", "REJECTED", "ACCEPTED", "CONVERTED_TO_ORDER"].includes(quote.status),
  );
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
  const quoteRequestGroups = useMemo(() => {
    const groups = new Map<string, Quote[]>();
    for (const quote of quotes) {
      const phone = quote.customerPhone.replace(/\D/g, "");
      const key = quote.requestId
        ? `request:${quote.requestId}`
        : quote.customerId
          ? `custom-customer:${quote.customerId}`
          : `custom-phone:${phone || quote.customerName.trim().toLocaleLowerCase() || quote.id}`;
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
        const sentCount = customerQuotes.filter(
          (quote) =>
            Boolean(quote.publishedAt) ||
            ["QUOTE_SENT", "EXPIRED", "REJECTED", "ACCEPTED", "CONVERTED_TO_ORDER"].includes(quote.status),
        ).length;
        const requestId = customerQuotes[0]?.requestId;
        const linkedRequest = rfqs.find((rfq) => rfq.id === requestId);
        return {
          key,
          primary,
          quotes: primary ? [primary, ...others] : chronological,
          totalCount: customerQuotes.length,
          sentCount,
          unsentCount: customerQuotes.length - sentCount,
          requestNumber: linkedRequest?.requestNumber || null,
          customerName: chronological[0]?.customerName || linkedRequest?.customerName || "Customer",
          latestAt: Math.max(...customerQuotes.map(timestamp)),
        };
      })
      .sort((a, b) => b.latestAt - a.latestAt);
  }, [quotes, rfqs]);
  const activeRequestFilterId = tab === "orders" ? orderRequestFilterId : quoteRequestFilterId;
  const requestPageFilter = activeRequestFilterId
    ? rfqs.find((rfq) => rfq.id === activeRequestFilterId) || null
    : null;
  const visibleQuoteGroups = quoteRequestFilterId
    ? quoteRequestGroups.filter((group) => group.key === `request:${quoteRequestFilterId}`)
    : quoteRequestGroups;
  const displayedQuoteGroups = openedQuoteGroupKey
    ? visibleQuoteGroups.filter((group) => group.key === openedQuoteGroupKey)
    : visibleQuoteGroups;
  const orderRequestGroups = useMemo(() => {
    const groups = new Map<string, Order[]>();
    for (const order of orders) {
      const requestId = order.quotation?.requestId;
      const key = requestId
        ? `request:${requestId}`
        : `unlinked:${order.quotation?.id || order.id}`;
      groups.set(key, [...(groups.get(key) || []), order]);
    }
    return [...groups.entries()]
      .map(([key, customerOrders]) => ({
        key,
        requestNumber: customerOrders[0]?.quotation?.request?.requestNumber || null,
        customerName: customerOrders[0]?.customerName || "Customer",
        orders: customerOrders,
        paymentStatus: [...new Set(customerOrders.map((order) => order.manualPaymentStatus || "UNPAID"))].length === 1
          ? customerOrders[0]?.manualPaymentStatus || "UNPAID"
          : "MIXED",
        latestAt: Math.max(...customerOrders.map((order) => new Date(order.createdAt).getTime() || 0)),
      }))
      .sort((a, b) => b.latestAt - a.latestAt);
  }, [orders]);
  const visibleOrderGroups = orderRequestFilterId
    ? orderRequestGroups.filter((group) => group.key === `request:${orderRequestFilterId}`)
    : orderRequestGroups;
  const displayedOrderGroups = openedOrderGroupKey
    ? visibleOrderGroups.filter((group) => group.key === openedOrderGroupKey)
    : visibleOrderGroups;
  if (!token) return null;

  const innerContent = (
    <>
      {!(tab === "orders" && openedOrderGroupKey) && <div className={`embedded-subnav-bar embedded-sales-navigation${embedded ? " has-page-indicator" : ""}`} ref={operationsMenuRef}>
        {embedded ? (
          <h1 className="operations-current-section">{labels[tab]}</h1>
        ) : <nav className="sales-workflow-nav" aria-label="Quotation and order pages">
          {(["rfqs", "quotes", "orders"] as Tab[])
            .filter((item) => visibleTabs.includes(item))
            .map((item) => {
              const Icon = icons[tabs.indexOf(item)];
              return (
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === item}
                  className={`sales-workflow-nav-link${tab === item ? " is-active" : ""}`}
                  key={item}
                  onClick={() => navigateWorkflowPage(item)}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span>{labels[item]}</span>
                </button>
              );
            })}
        </nav>}
        {operationsMenuOpen && (
          <div className="embedded-subnav-items" id="operations-section-menu">
            {auxiliaryTabs.map((item) => {
              const Icon = icons[tabs.indexOf(item)];
              return (
                <button
                  key={item}
                  className={`subnav-pill ${tab === item ? "active" : ""}`}
                  onClick={() => {
                    selectTab(item);
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
        {auxiliaryTabs.length > 0 && <button
          type="button"
          className="operations-menu-trigger"
          aria-label="Open more operations pages"
          aria-expanded={operationsMenuOpen}
          aria-controls="operations-section-menu"
          title="More operations pages"
          onClick={() => setOperationsMenuOpen((open) => !open)}
        >
          <Menu size={22} aria-hidden="true" />
        </button>}
      </div>}

      {error && (
        <p role="alert" className="admin-error">
          {error}
        </p>
      )}
      {visitedTabs.has("overview") && <div hidden={tab !== "overview"}>
      {visitedTabs.has("overview") && analytics && (
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
                  selectTab("rfqs");
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
      </div>}
      {visitedTabs.has("rfqs") && <div hidden={tab !== "rfqs"}>
      {visitedTabs.has("rfqs") && (
        openedRfq ? (
          <section className="panel-card panel-body rfq-detail-page">
            <button
              type="button"
              className="rfq-detail-back admin-back-button"
              onClick={closeRfq}
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

            <section className="rfq-journey-summary" aria-label="Request journey">
              <div className="rfq-journey-heading">
                <strong>Request journey</strong>
                <span>{openedRfq.requestNumber}</span>
              </div>
              <ol className="rfq-journey-steps">
                <li className="is-complete">
                  <span className="rfq-journey-step-number">1</span>
                  <span><strong>Request received</strong><small>{rfqReceivedLabel(openedRfq.createdAt)}</small></span>
                </li>
                <li className={openedRfqQuotes.length ? "is-complete" : ""}>
                  <span className="rfq-journey-step-number">2</span>
                  <span><strong>{openedRfqQuotes.length} {openedRfqQuotes.length === 1 ? "quotation" : "quotations"}</strong><small>{openedRfqSentQuotes.length} sent · {openedRfqQuotes.length - openedRfqSentQuotes.length} draft</small></span>
                </li>
                <li className={openedRfqAcceptedQuotes.length ? "is-complete" : ""}>
                  <span className="rfq-journey-step-number">3</span>
                  <span><strong>{openedRfqAcceptedQuotes.length} accepted</strong><small>{openedRfqAcceptedQuotes.length ? "Customer accepted a quotation" : "Waiting for customer response"}</small></span>
                </li>
                <li className={openedRfqOrders.length ? "is-complete" : ""}>
                  <span className="rfq-journey-step-number">4</span>
                  <span><strong>{openedRfqOrders.length} {openedRfqOrders.length === 1 ? "order" : "orders"}</strong><small>{openedRfqOrders.length ? [...new Set(openedRfqOrders.map((order) => formatEnumLabel(order.status)))].join(" · ") : "Created after quote acceptance"}</small></span>
                </li>
              </ol>
            </section>

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
                      const quantityLabel = rfqQuantityLabel(item.quantity, item.unit);
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

            <section className="rfq-related-pages" aria-label="Related quotation and order pages">
              <div>
                <strong>Quotation and order history</strong>
                <p>View each record on its own page, grouped under this request number.</p>
              </div>
              <div className="rfq-related-page-actions">
                <button type="button" className="btn-sm btn-secondary" onClick={() => navigateWorkflowPage("quotes", openedRfq.id)}>
                  Quotations <span>{openedRfqQuotes.length}</span><ArrowRight size={15} aria-hidden="true" />
                </button>
                <button type="button" className="btn-sm btn-secondary" onClick={() => navigateWorkflowPage("orders", openedRfq.id)}>
                  Orders <span>{openedRfqOrders.length}</span><ArrowRight size={15} aria-hidden="true" />
                </button>
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
              <button type="button" className="btn-sm btn-secondary admin-back-button" onClick={closeRfq}>Back to inbox</button>
              <button
                type="button"
                className="btn-sm btn-primary"
                onClick={() => {
                  setSelectedRfq(openedRfq);
                  setRevision(null);
                  setEditingDraft(false);
                  setQuoteRequestFilterId(openedRfq.id);
                  selectTab("quotes");
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
            <div className="rfq-status-filters" role="group" aria-label="Filter requests by status">
              {rfqStatusFilters.map((filter) => {
                const count = filter.value === "ALL"
                  ? rfqs.length
                  : rfqs.filter((rfq) => rfq.status === filter.value).length;
                return (
                  <button
                    type="button"
                    key={filter.value}
                    className={`rfq-status-filter${rfqStatusFilter === filter.value ? " is-active" : ""}`}
                    aria-pressed={rfqStatusFilter === filter.value}
                    onClick={() => setRfqStatusFilter(filter.value)}
                  >
                    {filter.label}<span>{count}</span>
                  </button>
                );
              })}
            </div>
            {!rfqsLoaded ? (
              <p role="status">{busy ? "Loading customer requests…" : "Loading customer requests…"}</p>
            ) : !rfqs.length ? (
              <p className="rfq-inbox-empty">No RFQs received yet.</p>
            ) : !visibleRfqs.length ? (
              <p className="rfq-inbox-empty">No {rfqStatusFilter.toLocaleLowerCase()} requests.</p>
            ) : (
              <div className="rfq-inbox-list">
                {visibleRfqs.map((rfq) => (
                  <button
                    type="button"
                    className="rfq-inbox-row"
                    key={rfq.id}
                    onClick={() => openRfq(rfq.id)}
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
      </div>}
      {visitedTabs.has("quotes") && <div hidden={tab !== "quotes"}>
      {visitedTabs.has("quotes") && (
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
                linkedRequestNumber={
                  selectedRfq?.requestNumber ||
                  rfqs.find((rfq) => rfq.id === revision?.requestId)?.requestNumber
                }
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
                  setEditorRevision((value) => value + 1);
                  await refresh();
                }}
              />
            </div>
          ) : null}
          {!selectedRfq && !revision && !creatingCustomQuote && (
          <section className="panel-card panel-body sales-saved-quotes">
            <div className="sales-saved-quotes-heading">
              <div>
                <span className="sales-section-eyebrow">QUOTATIONS</span>
                <h2>Quotation register</h2>
                <p>Draft, send, and track offers. Open a request group to review its quotation history.</p>
              </div>
              <div className="sales-saved-quotes-tools">
                {quoteRequestFilterId && (
                  <button type="button" className="btn-sm btn-secondary" onClick={() => {
                    setQuoteRequestFilterId(null);
                    setOpenedQuoteGroupKey(null);
                    const url = new URL(window.location.href);
                    url.searchParams.delete(salesQuoteRequestParam);
                    url.searchParams.delete(salesQuoteGroupParam);
                    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
                  }}>
                    Clear request filter
                  </button>
                )}
                <button type="button" className="btn-sm btn-primary" onClick={() => {
                  setSelectedRfq(null);
                  setRevision(null);
                  setEditingDraft(false);
                  setCreatingCustomQuote(true);
                  setQuoteRequestFilterId(null);
                }}>
                  Create custom quotation
                </button>
                <span className="sales-saved-quote-count">
                  {displayedQuoteGroups.reduce((total, group) => total + group.totalCount, 0)} {displayedQuoteGroups.reduce((total, group) => total + group.totalCount, 0) === 1 ? "quotation" : "quotations"}
                </span>
              </div>
            </div>
            {!visibleQuoteGroups.length && (
              <p className="sales-saved-quotes-empty">
                {quoteRequestFilterId ? `No quotations are linked to ${requestPageFilter?.requestNumber || "this request"} yet.` : "No quotations created yet."}
              </p>
            )}
            {openedQuoteGroupKey && (
              <div className="sales-quote-group-focus-bar">
                  <button type="button" className="btn-sm btn-secondary admin-back-button" onClick={() => closeSalesGroup("quote")}>
                  <ArrowLeft size={15} aria-hidden="true" /> Back to all quotation groups
                </button>
                <span>Showing quotations from this group only</span>
              </div>
            )}
            <div className="sales-saved-quote-list">
            {displayedQuoteGroups.map((group) => (
              <details
                className={`sales-rfq-quote-group${openedQuoteGroupKey === group.key ? " is-focused" : ""}`}
                key={group.key}
                open={openedQuoteGroupKey === group.key}
                onToggle={(event) => {
                  if (event.currentTarget.open) openSalesGroup("quote", group.key);
                  else if (openedQuoteGroupKey === group.key) closeSalesGroup("quote");
                }}
              >
                <summary className="sales-rfq-quote-group-summary">
                  <span className="sales-rfq-quote-group-identity">
                    <span className="sales-section-eyebrow">
                      {group.requestNumber || "CUSTOM QUOTATIONS · NOT LINKED TO AN RFQ"}
                    </span>
                    <strong>{group.customerName}</strong>
                  </span>
                  <span className="sales-rfq-quote-group-counts">
                    {group.totalCount} {group.totalCount === 1 ? "quotation" : "quotations"}
                    {group.sentCount > 0 && ` · ${group.sentCount} sent`}
                    {group.unsentCount > 0 && ` · ${group.unsentCount} draft${group.unsentCount === 1 ? "" : "s"}`}
                  </span>
                </summary>
                <div className="sales-rfq-quote-group-quotes">
                {group.quotes.map((q) => {
                  return (
              <article key={q.id} className="record-card sales-saved-quote">
                <header className="sales-saved-quote-header">
                  <div className="sales-saved-quote-identity">
                    <span className="sales-quote-number">{q.quoteNumber}</span>
                    <h3>{q.customerName}</h3>
                    <span className="sales-quote-revision">
                      Revision {q.revisionNumber || 1}
                    </span>
                    <span className="sales-quote-revision">
                      {q.publishedAt ? `Sent ${new Date(q.publishedAt).toLocaleString("en-IN")}` : "Not sent"}
                    </span>
                  </div>
                  <span
                    className="sales-quote-status"
                    data-status={q.status}
                  >
                    {formatEnumLabel(q.status)}
                  </span>
                  <div className="sales-quote-total">
                    <span>Quote total</span>
                    <strong>{money(q.totalAmount)}</strong>
                  </div>
                </header>
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
                          {formatQuantityUnit(item.quantityMt, item.unit)} × {money(item.unitPrice)}
                          <strong className="sales-quote-line-total">{money(item.lineTotal)}</strong>
                        </p>
                      {item.options?.map((option) => (
                        <p className="sales-quote-item-option" key={option.id}>
                          <span>Alternative</span>
                          <strong>{option.brandName} · {option.productName}</strong>
                          <small>
                            {option.specification ? `${option.specification} · ` : ""}
                            {formatQuantityUnit(option.quantityMt, option.unit)} × {money(option.unitPrice)} / unit · {money(option.lineTotal)}
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
                    onClick={() => setQuoteToSend(q)}
                  >
                    Send to customer
                  </button>
                )}
                {q.status === "CONVERTED_TO_ORDER" && (
                  <span className="sales-quote-publish-state" role="status">
                    Already converted to an order · cannot publish again
                  </span>
                )}
                {q.status === "QUOTE_SENT" && (
                  <span className="sales-quote-publish-state" role="status">
                    {recentlySentQuoteId === q.id
                      ? "Sent successfully · available in the customer’s website account"
                      : "Sent to customer · awaiting response"}
                  </span>
                )}
                <div className="sales-quote-share-actions">
                  <span className="sales-quote-share-note">Attach the downloaded PDF before sending.</span>
                  <div className="sales-quote-share-buttons">
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
                  </div>
                </div>
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
                                      {option.brandName} · {option.productName} · {formatQuantityUnit(option.quantityMt, option.unit)}
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
                  );
                })}
                </div>
              </details>
            ))}
            </div>
            {quoteToSend && (
              <div className="sales-send-quote-overlay">
                <section
                  className="sales-send-quote-dialog"
                  role="alertdialog"
                  aria-modal="true"
                  aria-labelledby="sales-send-quote-title"
                  aria-describedby="sales-send-quote-description"
                >
                  <span className="sales-section-eyebrow">SEND QUOTATION</span>
                  <h3 id="sales-send-quote-title">Send this quotation to the customer?</h3>
                  <p id="sales-send-quote-description">
                    <strong>{quoteToSend.quoteNumber}</strong> for {quoteToSend.customerName} will become available in their website account. The configured customer notification will be queued if enabled.
                  </p>
                  <p className="sales-send-quote-total">Quote total: <strong>{money(quoteToSend.totalAmount)}</strong></p>
                  <div className="sales-send-quote-actions">
                    <button type="button" className="btn-sm btn-secondary" disabled={busy} onClick={() => setQuoteToSend(null)}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-sm btn-primary"
                      disabled={busy}
                      onClick={async () => {
                        const sent = await mutate(`/quotes/${quoteToSend.id}/publish`, "POST");
                        if (sent) {
                          setRecentlySentQuoteId(quoteToSend.id);
                          setQuoteToSend(null);
                        }
                      }}
                    >
                      {busy ? "Sending…" : "Confirm send"}
                    </button>
                  </div>
                </section>
              </div>
            )}
          </section>
          )}
        </>
      )}
      </div>}
      {visitedTabs.has("orders") && <div hidden={tab !== "orders"}>
      {visitedTabs.has("orders") && (
        <section className={`panel-card panel-body sales-orders-page${openedOrderGroupKey ? " is-focused" : ""}`}>
          {openedOrderGroupKey && (
            <div className="sales-quote-group-focus-bar">
              <button type="button" className="btn-sm btn-secondary admin-back-button" onClick={() => closeSalesGroup("order")}>
                <ArrowLeft size={15} aria-hidden="true" /> Back to all orders
              </button>
            </div>
          )}
          <header className="sales-record-page-heading">
            <div>
              <span className="sales-section-eyebrow">ORDERS</span>
              <h2>Orders & delivery</h2>
              <p>Track accepted quotations through payment, dispatch, and delivery.</p>
              {orderRequestFilterId && <span className="sales-active-request-filter">Request: {requestPageFilter?.requestNumber || "Selected RFQ"}</span>}
            </div>
            <div className="sales-record-page-actions">
              {orderRequestFilterId && <button type="button" className="btn-sm btn-secondary" onClick={() => {
                setOrderRequestFilterId(null);
                setOpenedOrderGroupKey(null);
                const url = new URL(window.location.href);
                url.searchParams.delete(salesOrderRequestParam);
                url.searchParams.delete(salesOrderGroupParam);
                window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
              }}>Show all orders</button>}
              <span className="sales-saved-quote-count">{displayedOrderGroups.reduce((total, group) => total + group.orders.length, 0)} {displayedOrderGroups.reduce((total, group) => total + group.orders.length, 0) === 1 ? "order" : "orders"}</span>
            </div>
          </header>
          {!["SUPER_ADMIN", "ADMIN", "DISPATCH_OFFICER"].includes(role) && (
            <p>
              Read-only order access. Dispatch staff manage delivery actions.
            </p>
          )}
          {!visibleOrderGroups.length && <p className="sales-saved-quotes-empty">{orderRequestFilterId ? `No orders are linked to ${requestPageFilter?.requestNumber || "this request"} yet.` : "No orders recorded yet."}</p>}
          {displayedOrderGroups.map((group) => (
            <details
              className="sales-rfq-order-group"
              key={group.key}
              open={openedOrderGroupKey === group.key}
              onToggle={(event) => {
                  if (event.currentTarget.open) openSalesGroup("order", group.key);
                  else if (openedOrderGroupKey === group.key) closeSalesGroup("order");
              }}
            >
              <summary className="sales-rfq-order-group-summary">
                <span>
                  <span className="sales-section-eyebrow">
                    {group.requestNumber || "ORDER · NO LINKED RFQ"}
                  </span>
                  <strong>{group.customerName}</strong>
                </span>
                <span className="sales-order-group-meta">
                  <span className="sales-order-payment-pill" data-status={group.paymentStatus}>
                    {group.paymentStatus === "MIXED" ? "Mixed payment" : formatEnumLabel(group.paymentStatus)}
                  </span>
                </span>
              </summary>
              <div className="sales-rfq-order-group-orders">
          {group.orders.map((o) => (
            <article className="record-card" key={o.id}>
              <h3 className="sales-order-card-heading">
                <span>{o.orderNumber}</span>
                <span className="sales-order-state" data-status={o.status}>
                  {formatEnumLabel(o.status)}
                </span>
              </h3>
              <p className="sales-order-dispatch-line">
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
              </div>
            </details>
          ))}
        </section>
      )}
      </div>}
      {visitedTabs.has("inventory") && <div hidden={tab !== "inventory"}>
      {visitedTabs.has("inventory") && (
        <CatalogueManager token={token} role={role} onSignOut={onSignOut} customerUrl={customerUrl} />
      )}
      </div>}
      {visitedTabs.has("inquiries") && <div hidden={tab !== "inquiries"}>
      {visitedTabs.has("inquiries") && (
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
      </div>}
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
