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
      setTab(workspaceTabFromUrl());
      const params = new URLSearchParams(window.location.search);
      const restoredSearch = params.get("adminSearch") || "";
      setPage(Math.max(1, Number(params.get("adminPage")) || 1));
      setQuery(restoredSearch);
      setSearch(restoredSearch);
      setStatus(params.get("adminStatus") || "");
      setSelected(null);
      setDraft(null);
      setNotice("");
      setError("");
    };
    window.addEventListener("popstate", restoreWorkspaceFromHistory);
    return () =>
      window.removeEventListener("popstate", restoreWorkspaceFromHistory);
  }, []);
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
    const url = new URL(window.location.href);
    url.searchParams.set("workspace", next);
    if (next !== "team") {
      url.searchParams.delete("staffId");
      url.searchParams.delete("staffView");
    }
    url.searchParams.delete("adminPage");
    url.searchParams.delete("adminSearch");
    url.searchParams.delete("adminStatus");
    // CMS section hashes are meaningful only inside Website Editor. Clear a
    // stale CMS anchor when moving to another top-level workspace page.
    url.hash = "";
    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
    if (next === "business" && tab !== "business") setBusinessContentReady(false);
    if (next === "sales" && tab !== "sales") setSalesContentReady(false);
    setTab(next);
    setPage(1);
    setQuery("");
    setSearch("");
    setCatalogueInitialSearch("");
    setStatus("");
    setSelected(null);
    setDraft(null);
    setNotice("");
    setError("");
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
      {tab === "overview" && (
        <WorkspaceOverview
          stats={stats}
          websiteAnalytics={websiteAnalytics}
          recentChanges={recentChanges}
          recentChangesError={recentChangesError}
          staffRole={staff?.role || ""}
          onViewCustomers={() => navigate("customers")}
          onViewFollowups={(filter) => {
            navigate("followups");
            setStatus(filter);
          }}
          onViewAudit={() => navigate("audit")}
          onOpenCatalogue={() => navigate("catalogue")}
          onOpenContent={() => navigate("content")}
          onOpenSales={() => navigate("sales")}
          onOpenBusiness={() => navigate("business")}
          onOpenStaff={() => navigate("team")}
          onRecordEnquiry={() => {
            navigate("followups");
            setDraft(blankFollowup());
          }}
        />
      )}
      {(tab === "customers" || tab === "followups") && (
        <CustomerFollowupWorkspace
          tab={tab}
          customers={customers}
          followups={followups}
          query={query}
          setQuery={setQuery}
          setSearch={setSearch}
          status={status}
          setStatus={setStatus}
          setPage={setPage}
          page={page}
          loading={loading}
          busy={busy}
          selected={selected}
          setSelected={setSelected}
          openCustomer={openCustomer}
          draft={draft}
          setDraft={setDraft}
          setTab={navigate}
          setError={setError}
          save={save}
        />
      )}
      <FeatureBoundary key={tab}>
        {tab === "recent" && staff && (
          <RecentActivity
            token={token}
            role={staff.role}
            onOpenCatalogue={() => navigate("catalogue")}
            onOpenContent={() => navigate("content")}
            onOpenSales={() => navigate("sales")}
            onOpenBusiness={() => navigate("business")}
            onOpenStaff={() => navigate("team")}
          />
        )}
        {tab === "audit" && <AuditLog token={token} revision={revision} />}
        {tab === "trash" && (
          <RecentlyDeleted token={token} onSignOut={signOut} />
        )}
        {tab === "notifications" && <NotificationStatus token={token} revision={revision} />}
        {tab === "catalogue" && (
          <CatalogueManager
            token={token}
            role={staff?.role || ""}
            onSignOut={signOut}
            initialSearch={catalogueInitialSearch}
            customerUrl={marketplaceUrl}
          />
        )}
        {tab === "sales" && staff && (
          <SalesOperations
            accessToken={token}
            role={staff.role}
            customerUrl={marketplaceUrl}
            onBack={() => navigate("overview")}
            onSignOut={signOut}
            embedded
            onContentReady={setSalesContentReady}
          />
        )}
        {tab === "business" && staff && (
          <BusinessConsole
            token={token}
            role={staff.role}
            staffName={staff.name}
            customerUrl={marketplaceUrl}
            onBack={() => navigate("overview")}
            onSignOut={signOut}
            embedded
            onContentReady={setBusinessContentReady}
          />
        )}
        {tab === "reports" && staff && (
          <OperationalReports
            token={token}
            role={staff.role}
            onSignOut={signOut}
          />
        )}
        {tab === "content" && (
          <WebsiteContentManager
            token={token}
            onSignOut={signOut}
            customerUrl={marketplaceUrl}
          />
        )}
        {tab === "account" && staff && (
          <StaffAccount
            token={token}
            staff={staff}
            onSaved={(updated) => setStaff(updated)}
            onTokenChanged={setToken}
            onSignOut={signOut}
          />
        )}
        {tab === "team" &&
          (staff?.role === "SUPER_ADMIN" || staff?.role === "ADMIN") && (
            <StaffManagement
              token={token}
              onBack={() => navigate("overview")}
              onSignOut={signOut}
              embedded={true}
              currentStaffId={staff.id}
            />
        )}
      </FeatureBoundary>
    </AdminWorkspaceLayout>
    </>
    </AdminProtectedRoute>
  );
}
export default App;
