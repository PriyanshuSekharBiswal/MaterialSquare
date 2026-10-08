import { StaffLoginSchema } from "@material-square/types";
import {
  lazy,
  useCallback,
  useEffect,
  useRef,
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
import AdminWorkspaceLayout, {
  type AdminStaff,
} from "./components/AdminWorkspaceLayout";
import type { AdminSearchRecord } from "./components/GlobalAdminSearch";
import "./workspace.css";
import FeatureBoundary from "./components/FeatureBoundary";
import WorkspaceOverview from "./features/overview/WorkspaceOverview";
import type {
  RecentChanges,
  Stats,
  WebsiteAnalytics,
} from "./features/overview/contracts";
import StaffLogin from "./features/auth/StaffLogin";

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

function restoredToken() {
  try {
    const token = localStorage.getItem("ms-staff-token") || sessionStorage.getItem("ms-staff-token") || "";
    if (token) {
      localStorage.setItem("ms-staff-token", token);
      sessionStorage.removeItem("ms-staff-token");
    }
    return token;
  } catch {
    return "";
  }
}

export function App() {
  const [token, setTokenState] = useState(restoredToken),
    [staff, setStaff] = useState<AdminStaff | null>(null);
  const [tab, setTab] = useState<WorkspaceTab>(workspaceTabFromUrl);
  const tabScrollPositions = useRef<Partial<Record<WorkspaceTab, number>>>({});
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
  const [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [catalogueInitialSearch, setCatalogueInitialSearch] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<Customer | null>(null),
    [draft, setDraft] = useState<Followup | null>(null);
  const staffRequestRef = useRef<{
    token: string;
    promise: Promise<AdminStaff>;
  } | null>(null);
  useEffect(() => {
    const restoreWorkspaceFromHistory = () => {
      setTab(workspaceTabFromUrl());
      setPage(1);
      setQuery("");
      setSearch("");
      setStatus("");
      setSelected(null);
      setDraft(null);
      setNotice("");
      setError("");
    };
    window.addEventListener("popstate", restoreWorkspaceFromHistory);
    return () =>
      window.removeEventListener("popstate", restoreWorkspaceFromHistory);
  }, []);
  const setToken = useCallback((value: string) => {
    setTokenState(value);
    try {
      if (value) localStorage.setItem("ms-staff-token", value);
      else localStorage.removeItem("ms-staff-token");
      sessionStorage.removeItem("ms-staff-token");
    } catch {}
  }, []);
  const signOut = useCallback(() => {
    setToken("");
    setStaff(null);
  }, [setToken]);
  const request = useCallback(
    async <T,>(path: string, method = "GET", body?: unknown): Promise<T> => {
      let r: Response;
      try {
        r = await fetch(`${import.meta.env.VITE_API_URL || "/api"}${path}`, {
          method,
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(65000),
        });
      } catch {
        throw new Error(
          "The workspace is taking longer than usual to respond. Please try again shortly.",
        );
      }
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        if (r.status === 401) {
          setToken("");
          setStaff(null);
        }
        if (r.status >= 500)
          throw new Error(
            "The workspace is temporarily unavailable. Please try again shortly.",
          );
        const fieldErrors = data?.issues?.fieldErrors;
        const loginField =
          path === "/auth/staff/login" && fieldErrors
            ? ["phone", "email", "password"].find(
                (field) => fieldErrors[field]?.length,
              )
            : undefined;
        const validationMessage =
          loginField === "phone"
            ? "Enter a valid 10-digit Indian mobile number (with optional +91)."
            : loginField === "email"
              ? "Enter a valid email address."
              : loginField === "password"
                ? "Check your password: use at least 8 characters."
                : undefined;
        throw new Error(
          validationMessage ||
            data?.message ||
            "Unable to connect. Please try again.",
        );
      }
      if (!data || typeof data !== "object")
        throw new Error("The workspace is starting. Please try again shortly.");
      return data as T;
    },
    [token, setToken],
  );
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
    if (!token) return;
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
    let staffRequest: Promise<AdminStaff>;
    if (staff) {
      staffRequest = Promise.resolve(staff);
    } else if (staffRequestRef.current?.token === token) {
      staffRequest = staffRequestRef.current.promise;
    } else {
      staffRequest = request<AdminStaff>("/auth/staff/me");
      staffRequestRef.current = { token, promise: staffRequest };
      void staffRequest.then(
        () => {
          if (staffRequestRef.current?.promise === staffRequest)
            staffRequestRef.current = null;
        },
        () => {
          if (staffRequestRef.current?.promise === staffRequest)
            staffRequestRef.current = null;
        },
      );
    }
    const summaryRequest =
      tab === "overview" || tab === "followups"
        ? request<Stats>("/workspace/overview")
        : Promise.resolve(null);
    void Promise.all([
      staffRequest,
      summaryRequest,
      analyticsRequest,
      recentChangesRequest,
      tab === "customers"
        ? request<Page<Customer>>(`/workspace/customers?${params}`)
        : tab === "followups"
          ? request<Page<Followup>>(`/workspace/followups?${params}`)
          : Promise.resolve(null),
    ])
      .then(([user, summary, analyticsResult, changesResult, result]) => {
        if (!active) return;
        if (user) setStaff(user);
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
  }, [token, tab, page, search, status, revision, request]);
  const navigate = (next: typeof tab) => {
    tabScrollPositions.current[tab] = window.scrollY;
    const url = new URL(window.location.href);
    url.searchParams.set("workspace", next);
    // CMS section hashes are meaningful only inside Website Editor. Clear a
    // stale CMS anchor when moving to another top-level workspace page.
    url.hash = "";
    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
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
  useEffect(() => {
    let firstFrame = 0;
    let secondFrame = 0;
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        window.scrollTo({ top: tabScrollPositions.current[tab] ?? 0, behavior: "instant" });
      });
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [tab]);
  const login = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(e.currentTarget);
    try {
      const parsed = StaffLoginSchema.safeParse({
        ...(String(data.get("identifier") || "").includes("@")
          ? { email: String(data.get("identifier")).trim().toLowerCase() }
          : {
              phone: String(data.get("identifier") || ""),
            }),
        password: data.get("password"),
      });
      if (!parsed.success)
        throw new Error(
          parsed.error.issues[0]?.message || "Check your sign-in details",
        );
      const result = await request<{ accessToken: string }>(
        "/auth/staff/login",
        "POST",
        parsed.data,
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
      <StaffLogin
        busy={busy}
        error={error}
        marketplaceUrl={marketplaceUrl}
        onSubmit={login}
      />
    );

  return (
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
        {tab === "audit" && <AuditLog token={token} />}
        {tab === "trash" && (
          <RecentlyDeleted token={token} onSignOut={signOut} />
        )}
        {tab === "notifications" && <NotificationStatus token={token} />}
        {tab === "catalogue" && (
          <CatalogueManager
            token={token}
            role={staff?.role || ""}
            onSignOut={signOut}
            initialSearch={catalogueInitialSearch}
          />
        )}
        {tab === "sales" && staff && (
          <SalesOperations
            accessToken={token}
            role={staff.role}
            onBack={() => navigate("overview")}
            onSignOut={signOut}
            embedded
          />
        )}
        {tab === "business" && staff && (
          <BusinessConsole
            token={token}
            role={staff.role}
            customerUrl={marketplaceUrl}
            onBack={() => navigate("overview")}
            onSignOut={signOut}
            embedded
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
  );
}
export default App;
