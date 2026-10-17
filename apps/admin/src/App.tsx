import {
  lazy,
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import CustomerFollowupWorkspace from "./features/customers/CustomerFollowupWorkspace";
import type {
  Customer,
  Followup,
  Page,
  WorkspaceTab,
} from "./features/customers/contracts";
import { blankFollowup } from "./features/customers/contracts";
import AdminWorkspaceLayout from "./components/AdminWorkspaceLayout";
import type { AdminSearchRecord } from "./components/GlobalAdminSearch";
import "./workspace.css";
import FeatureBoundary from "./components/FeatureBoundary";
import WorkspaceOverview from "./features/overview/WorkspaceOverview";
import type {
  RecentChanges,
  Stats,
  WebsiteAnalytics,
} from "./features/overview/contracts";
import { isInitialReloadForCurrentLocation } from "./scroll-position";
import { useAdminAuth } from "./context/AdminAuthContext";
import { AdminProtectedRoute } from "./components/AdminProtectedRoute";

const NotificationStatus = lazy(
  () => import("./features/notifications/NotificationStatus"),
);
const AuditLog = lazy(() => import("./features/audit/AuditLog"));
const RecentActivity = lazy(() => import("./features/overview/RecentActivity"));
const CatalogueManager = lazy(
  () => import("./features/catalogue/CatalogueManager"),
);
const StaffManagement = lazy(() => import("./features/staff/StaffManagement"));
const StaffAccount = lazy(() => import("./features/staff/StaffAccount"));
const RecentlyDeleted = lazy(() => import("./features/trash/RecentlyDeleted"));
const BusinessConsole = lazy(
  () => import("./features/business/BusinessConsole"),
);
const SalesOperations = lazy(() => import("./features/sales/SalesOperations"));
const WebsiteContentManager = lazy(
  () => import("./features/content/WebsiteContentManager"),
);
const OperationalReports = lazy(
  () => import("./features/reports/OperationalReports"),
);

const localMarketplaceUrl =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1")
    // The storefront's port-5173 dev server redirects localhost to this
    // CAPTCHA-compatible hostname. Point previews there directly so the
    // draft postMessage origin matches the iframe after navigation.
    ? `${window.location.protocol}//material-square.localtest.me:5173`
    : "";
const marketplaceUrl =
  import.meta.env.VITE_CUSTOMER_APP_URL ||
  localMarketplaceUrl ||
  "https://material-square.vercel.app";

const workspaceTabs: WorkspaceTab[] = [
  "overview",
  "recent",
  "customers",
  "followups",
  "catalogue",
  "content",
  "notifications",
  "audit",
  "team",
  "account",
  "sales",
  "business",
  "reports",
  "trash",
];

function workspaceTabFromUrl(): WorkspaceTab {
  const value = new URLSearchParams(window.location.search).get("workspace");
  return workspaceTabs.includes(value as WorkspaceTab)
    ? (value as WorkspaceTab)
    : "overview";
}

export function App() {
  const {
    token,
    staff,
    isAuthenticated,
    setStaff,
    setToken,
    signOut,
    request,
  } = useAdminAuth();
  const [tab, setTab] = useState<WorkspaceTab>(workspaceTabFromUrl);
  const [visitedTabs, setVisitedTabs] = useState<Set<WorkspaceTab>>(() => new Set([workspaceTabFromUrl()]));
  const [historyRevision, setHistoryRevision] = useState(0);
  const [businessContentReady, setBusinessContentReady] = useState(false);
  const [salesContentReady, setSalesContentReady] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null),
    [websiteAnalytics, setWebsiteAnalytics] = useState<WebsiteAnalytics | null>(
      null,
    ),
    [recentChanges, setRecentChanges] = useState<RecentChanges | null>(null),
    [recentChangesError, setRecentChangesError] = useState(""),
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
    [analyticsError, setAnalyticsError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showRefreshSkeleton, setShowRefreshSkeleton] = useState(isInitialReloadForCurrentLocation);
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get("adminSearch") || ""),
    [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get("adminSearch") || ""),
    [catalogueInitialSearch, setCatalogueInitialSearch] = useState(""),
    [status, setStatus] = useState(() => new URLSearchParams(window.location.search).get("adminStatus") || ""),
    [page, setPage] = useState(() => Math.max(1, Number(new URLSearchParams(window.location.search).get("adminPage")) || 1)),
    [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<Customer | null>(null),
    [draft, setDraft] = useState<Followup | null>(null);
  useEffect(() => {
    const restoreWorkspaceFromHistory = () => {
      setHistoryRevision((value) => value + 1);
      const restoredTab = workspaceTabFromUrl();
      setTab(restoredTab);
      setVisitedTabs((current) => current.has(restoredTab) ? current : new Set(current).add(restoredTab));
      const params = new URLSearchParams(window.location.search);
      const restoredSearch = params.get("adminSearch") || "";
      setPage(Math.max(1, Number(params.get("adminPage")) || 1));
      setQuery(restoredSearch);
      setSearch(restoredSearch);
      setStatus(params.get("adminStatus") || "");
      const customerId = params.get("adminCustomer");
      if (!customerId) setSelected(null);
      else void request<Customer>(`/workspace/customers/${customerId}`).then(setSelected).catch(() => setSelected(null));
    };
    window.addEventListener("popstate", restoreWorkspaceFromHistory);
    return () =>
      window.removeEventListener("popstate", restoreWorkspaceFromHistory);
  }, [request]);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (tab === "customers" || tab === "followups") {
      if (page > 1) url.searchParams.set("adminPage", String(page));
      else url.searchParams.delete("adminPage");
      if (search) url.searchParams.set("adminSearch", search);
      else url.searchParams.delete("adminSearch");
      if (status) url.searchParams.set("adminStatus", status);
      else url.searchParams.delete("adminStatus");
    }
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [page, search, status, tab]);
  const searchAdminRecords = useCallback(
    async (term: string): Promise<AdminSearchRecord[]> => {
      const normalized = term.trim().toLocaleLowerCase();
      if (normalized.length < 2 || !staff) return [];
      const canSearchProducts = [
        "SUPER_ADMIN",
        "ADMIN",
        "SALES_MANAGER",
        "CATALOG_MANAGER",
      ].includes(staff.role);
      const canSearchCustomers = [
        "SUPER_ADMIN",
        "ADMIN",
        "SALES_MANAGER",
      ].includes(staff.role);
      const terms = normalized.split(/\s+/).filter(Boolean);
      const matches = (values: Array<string | null | undefined>) => {
        const haystack = values.filter(Boolean).join(" ").toLocaleLowerCase();
        return terms.every((part) => haystack.includes(part));
      };
      const requests: Promise<AdminSearchRecord[]>[] = [];
      if (canSearchProducts) {
        requests.push(
          request<
            Array<{
              name: string;
              brand?: string | null;
              categoryLabel?: string | null;
              code?: string | null;
              isPublished?: boolean;
            }>
          >("/products/catalogue")
            .then((products) =>
              products
                .filter((product) =>
                  matches([
                    product.name,
                    product.brand,
                    product.categoryLabel,
                    product.code,
                  ]),
                )
                .slice(0, 4)
                .map((product) => ({
                  kind: "product" as const,
                  title: product.name,
                  description: [
                    product.brand,
                    product.categoryLabel,
                    product.code,
                    product.isPublished ? "Published" : "Draft",
                  ]
                    .filter(Boolean)
                    .join(" · "),
                  query: product.name,
                })),
            )
            .catch(() => []),
        );
      }
      if (canSearchCustomers) {
        const params = new URLSearchParams({
          q: term.trim(),
          page: "1",
          status: "",
        });
        requests.push(
          request<Page<Customer>>(`/workspace/customers?${params}`)
            .then((result) =>
              result.items.slice(0, 3).map((customer) => ({
                kind: "customer" as const,
                title: customer.name,
                description: [
                  customer.phone,
                  customer.companyName,
                  customer.city,
                ]
                  .filter(Boolean)
                  .join(" · "),
                query: customer.phone || customer.name,
              })),
            )
            .catch(() => []),
        );
      }
      return (await Promise.all(requests)).flat();
    },
    [request, staff],
  );
  useEffect(() => {
    if (!token || !staff) return;
    let active = true;
    const needsWorkspaceData =
      tab === "overview" || tab === "customers" || tab === "followups";
    setLoading(needsWorkspaceData || !staff);
    setError("");
    setAnalyticsError("");
    const params = new URLSearchParams({
      q: search,
      page: String(page),
      status,
    });
    const analyticsRequest =
      tab === "overview"
        ? request<WebsiteAnalytics>("/analytics/overview?days=30").catch(() => {
            if (active)
              setAnalyticsError("Website activity could not be loaded.");
            return null;
          })
        : Promise.resolve(null);
    const recentChangesRequest =
      tab === "overview"
        ? request<RecentChanges>("/admin/audit/recent")
            .then((changes) => {
              if (active) setRecentChangesError("");
              return changes;
            })
            .catch(() => {
              if (active)
                setRecentChangesError("Recent changes could not be loaded.");
              return null;
            })
        : Promise.resolve(null);
    const summaryRequest =
      tab === "overview" || tab === "followups"
        ? request<Stats>("/workspace/overview")
        : Promise.resolve(null);
    void Promise.all([
      summaryRequest,
      analyticsRequest,
      recentChangesRequest,
      tab === "customers"
        ? request<Page<Customer>>(`/workspace/customers?${params}`)
        : tab === "followups"
          ? request<Page<Followup>>(`/workspace/followups?${params}`)
          : Promise.resolve(null),
    ])
      .then(([summary, analyticsResult, changesResult, result]) => {
        if (!active) return;
        if (summary) setStats(summary);
        if (analyticsResult) setWebsiteAnalytics(analyticsResult);
        if (changesResult) setRecentChanges(changesResult);
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
  }, [token, staff, tab, page, search, status, revision, request]);
  useEffect(() => {
    const ready =
      !isAuthenticated ||
      (!loading &&
        (tab !== "business" || businessContentReady) &&
        (tab !== "sales" || salesContentReady));
    document.documentElement.dataset.msScrollReady = ready ? "true" : "false";
    if (!ready) return;
    const completeReload = () => {
      document.getElementById("root")?.style.removeProperty("min-height");
      setShowRefreshSkeleton(false);
    };
    if (isInitialReloadForCurrentLocation()) {
      window.addEventListener("ms-scroll-restored", completeReload, { once: true });
      return () => window.removeEventListener("ms-scroll-restored", completeReload);
    }
    completeReload();
  }, [isAuthenticated, loading, tab, businessContentReady, salesContentReady]);
  const navigate = (next: typeof tab) => {
    if (next === tab) return;
    const url = new URL(window.location.href);
    url.searchParams.set("workspace", next);
    if (next !== "team") {
      url.searchParams.delete("staffId");
      url.searchParams.delete("staffView");
    }
    url.searchParams.delete("adminPage");
    url.searchParams.delete("adminSearch");
    url.searchParams.delete("adminStatus");
    url.searchParams.delete("adminCustomer");
    url.searchParams.delete("adminRfq");
    url.searchParams.delete("adminDraft");
    url.searchParams.delete("businessSubView");
    url.searchParams.delete("procurementView");
    url.searchParams.delete("supplierView");
    url.searchParams.delete("supplierId");
    url.searchParams.delete("catalogueEditor");
    url.searchParams.delete("catalogueView");
    // CMS section hashes are meaningful only inside Website Editor. Clear a
    // stale CMS anchor when moving to another top-level workspace page.
    url.hash = "";
    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    setVisitedTabs((current) => current.has(next) ? current : new Set(current).add(next));
    setTab(next);
    setPage(1);
    setQuery("");
    setSearch("");
    setCatalogueInitialSearch("");
    setStatus("");
  };
  const openCustomer = async (id: string, addHistoryEntry = true) => {
    if (addHistoryEntry) {
      const url = new URL(window.location.href);
      url.searchParams.set("adminCustomer", id);
      url.searchParams.delete("adminRfq");
      window.history.pushState({ ...(window.history.state ?? {}), adminCustomer: id }, "", `${url.pathname}${url.search}${url.hash}`);
    }
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
  useEffect(() => {
    const customerId = new URLSearchParams(window.location.search).get("adminCustomer");
    if (customerId) void openCustomer(customerId, false);
  }, [token]);
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
      const url = new URL(window.location.href);
      url.searchParams.delete("adminDraft");
      url.searchParams.delete("adminCustomer");
      url.searchParams.delete("adminRfq");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
      setNotice("Follow-up saved.");
      setRevision((v) => v + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const startFollowupDraft = (value = blankFollowup()) => {
    const url = new URL(window.location.href);
    url.searchParams.set("workspace", "followups");
    url.searchParams.set("adminDraft", "new");
    url.searchParams.delete("adminCustomer");
    url.searchParams.delete("adminRfq");
    window.history.pushState({ ...(window.history.state ?? {}), adminDraft: "new" }, "", `${url.pathname}${url.search}${url.hash}`);
    setVisitedTabs((current) => current.has("followups") ? current : new Set(current).add("followups"));
    setTab("followups");
    setPage(1);
    setQuery("");
    setSearch("");
    setStatus("");
    setSelected(null);
    setDraft(value);
  };
  const currentParams = new URLSearchParams(window.location.search);
  void historyRevision;
  const activeCustomer = currentParams.has("adminCustomer") ? selected : null;
  const activeDraft = currentParams.has("adminDraft") ? draft : null;
  return (
    <AdminProtectedRoute marketplaceUrl={marketplaceUrl}>
    <>
    {showRefreshSkeleton && <div className="boot-loading" role="status" aria-label="Loading workspace">
      <aside className="boot-sidebar"><div className="boot-mark" /><div className="boot-nav" /><div className="boot-nav" /><div className="boot-nav" /><div className="boot-nav" /><div className="boot-nav" /></aside>
      <main className="boot-main"><header className="boot-main-head"><div className="boot-heading"><i className="boot-line" /><i className="boot-line" /></div><div className="boot-search" /></header><section className="boot-cards"><div className="boot-card" /><div className="boot-card" /><div className="boot-card" /></section><section className="boot-table"><i className="boot-line" /><i className="boot-line" /><i className="boot-line" /><i className="boot-line" /></section></main>
    </div>}
    <AdminWorkspaceLayout
      staff={
        staff ?? {
          name: "Staff Member",
          phone: null,
          email: null,
          role: "",
        }
      }
      tab={tab}
      openFollowups={stats?.openFollowups ?? 0}
      mobileNavOpen={mobileNavOpen}
      loading={loading}
      busy={busy}
      error={error}
      analyticsError={analyticsError}
      notice={notice}
      marketplaceUrl={marketplaceUrl}
      onNavigate={navigate}
      onSearchNavigate={(next, term) => {
        navigate(next);
        if (next === "catalogue") setCatalogueInitialSearch(term || "");
        if (next === "customers" || next === "followups") {
          setQuery(term || "");
          setSearch(term || "");
        }
      }}
      onSearchRecords={searchAdminRecords}
      onMobileNavChange={setMobileNavOpen}
      onRefresh={() => {
        setRevision((value) => value + 1);
        if (selected) void openCustomer(selected.id);
      }}
      onSignOut={signOut}
    >
      {visitedTabs.has("overview") && <div hidden={tab !== "overview"}>
        <WorkspaceOverview
          stats={stats}
          websiteAnalytics={websiteAnalytics}
          recentChanges={recentChanges}
          recentChangesError={recentChangesError}
          staffRole={staff?.role || ""}
          onViewCustomers={() => navigate("customers")}
          onViewFollowups={(filter) => { navigate("followups"); setStatus(filter); }}
          onViewAudit={() => navigate("audit")}
          onOpenCatalogue={() => navigate("catalogue")}
          onOpenContent={() => navigate("content")}
          onOpenSales={() => navigate("sales")}
          onOpenBusiness={() => navigate("business")}
          onOpenStaff={() => navigate("team")}
          onRecordEnquiry={() => { navigate("followups"); startFollowupDraft(); }}
        />
      </div>}
      {visitedTabs.has("customers") && <div hidden={tab !== "customers"}>
        <CustomerFollowupWorkspace tab="customers" customers={customers} followups={followups} query={query} setQuery={setQuery} setSearch={setSearch} status={status} setStatus={setStatus} setPage={setPage} page={page} loading={loading} busy={busy} selected={activeCustomer} setSelected={setSelected} openCustomer={openCustomer} draft={null} setDraft={setDraft} startDraft={startFollowupDraft} setTab={navigate} setError={setError} save={save} />
      </div>}
      {visitedTabs.has("followups") && <div hidden={tab !== "followups"}>
        <CustomerFollowupWorkspace tab="followups" customers={customers} followups={followups} query={query} setQuery={setQuery} setSearch={setSearch} status={status} setStatus={setStatus} setPage={setPage} page={page} loading={loading} busy={busy} selected={activeCustomer} setSelected={setSelected} openCustomer={openCustomer} draft={activeDraft} setDraft={setDraft} startDraft={startFollowupDraft} setTab={navigate} setError={setError} save={save} />
      </div>}
      {visitedTabs.has("recent") && <div hidden={tab !== "recent"}><FeatureBoundary>
        {staff && <RecentActivity token={token} role={staff.role} onOpenCatalogue={() => navigate("catalogue")} onOpenContent={() => navigate("content")} onOpenSales={() => navigate("sales")} onOpenBusiness={() => navigate("business")} onOpenStaff={() => navigate("team")} />}
      </FeatureBoundary></div>}
      {visitedTabs.has("audit") && <div hidden={tab !== "audit"}><FeatureBoundary><AuditLog token={token} revision={revision} /></FeatureBoundary></div>}
      {visitedTabs.has("trash") && <div hidden={tab !== "trash"}><FeatureBoundary><RecentlyDeleted token={token} onSignOut={signOut} /></FeatureBoundary></div>}
      {visitedTabs.has("notifications") && <div hidden={tab !== "notifications"}><FeatureBoundary><NotificationStatus token={token} revision={revision} /></FeatureBoundary></div>}
      {visitedTabs.has("catalogue") && <div hidden={tab !== "catalogue"}><FeatureBoundary>
        <CatalogueManager token={token} role={staff?.role || ""} onSignOut={signOut} initialSearch={catalogueInitialSearch} customerUrl={marketplaceUrl} />
      </FeatureBoundary></div>}
      {visitedTabs.has("sales") && <div hidden={tab !== "sales"}><FeatureBoundary>
        {staff && <SalesOperations accessToken={token} role={staff.role} customerUrl={marketplaceUrl} onBack={() => navigate("overview")} onSignOut={signOut} embedded onContentReady={setSalesContentReady} />}
      </FeatureBoundary></div>}
      {visitedTabs.has("business") && <div hidden={tab !== "business"}><FeatureBoundary>
        {staff && <BusinessConsole token={token} role={staff.role} staffName={staff.name} customerUrl={marketplaceUrl} onBack={() => navigate("overview")} onSignOut={signOut} embedded onContentReady={setBusinessContentReady} />}
      </FeatureBoundary></div>}
      {visitedTabs.has("reports") && <div hidden={tab !== "reports"}><FeatureBoundary>
        {staff && <OperationalReports token={token} role={staff.role} onSignOut={signOut} />}
      </FeatureBoundary></div>}
      {visitedTabs.has("content") && <div hidden={tab !== "content"}><FeatureBoundary>
        <WebsiteContentManager token={token} onSignOut={signOut} customerUrl={marketplaceUrl} />
      </FeatureBoundary></div>}
      {visitedTabs.has("account") && <div hidden={tab !== "account"}><FeatureBoundary>
        {staff && <StaffAccount token={token} staff={staff} onSaved={(updated) => setStaff(updated)} onTokenChanged={setToken} onSignOut={signOut} />}
      </FeatureBoundary></div>}
      {visitedTabs.has("team") && <div hidden={tab !== "team"}><FeatureBoundary>
        {staff && (staff.role === "SUPER_ADMIN" || staff.role === "ADMIN") && <StaffManagement token={token} onBack={() => navigate("overview")} onSignOut={signOut} embedded currentStaffId={staff.id} />}
      </FeatureBoundary></div>}
    </AdminWorkspaceLayout>
    </>
    </AdminProtectedRoute>
  );
}
export default App;
