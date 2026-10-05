import { lazy, useCallback, useEffect, useState, type FormEvent } from "react";
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
import "./workspace.css";
import FeatureBoundary from "./components/FeatureBoundary";
import WorkspaceOverview from "./features/overview/WorkspaceOverview";
import type { Stats, WebsiteAnalytics } from "./features/overview/contracts";
import StaffLogin from "./features/auth/StaffLogin";

const NotificationStatus = lazy(
  () => import("./features/notifications/NotificationStatus"),
);
const AuditLog = lazy(() => import("./features/audit/AuditLog"));
const CatalogueManager = lazy(
  () => import("./features/catalogue/CatalogueManager"),
);
const StaffManagement = lazy(() => import("./features/staff/StaffManagement"));
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

const marketplaceUrl =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1")
    ? `${window.location.protocol}//${window.location.hostname}:5173`
    : "https://material-square.vercel.app";

function restoredToken() {
  try {
    return sessionStorage.getItem("ms-staff-token") || "";
  } catch {
    return "";
  }
}
export function App() {
  const [token, setTokenState] = useState(restoredToken),
    [staff, setStaff] = useState<AdminStaff | null>(null);
  const [tab, setTab] = useState<WorkspaceTab>("overview");
  const [stats, setStats] = useState<Stats | null>(null),
    [websiteAnalytics, setWebsiteAnalytics] = useState<WebsiteAnalytics | null>(
      null,
    ),
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
        throw new Error(
          data?.message || "Unable to connect. Please try again.",
        );
      }
      if (!data || typeof data !== "object")
        throw new Error("The workspace is starting. Please try again shortly.");
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
    void Promise.all([
      request<AdminStaff>("/auth/staff/me"),
      request<Stats>("/workspace/overview"),
      analyticsRequest,
      tab === "customers"
        ? request<Page<Customer>>(`/workspace/customers?${params}`)
        : tab === "followups"
          ? request<Page<Followup>>(`/workspace/followups?${params}`)
          : Promise.resolve(null),
    ])
      .then(([user, summary, analyticsResult, result]) => {
        if (!active) return;
        setStaff(user);
        setStats(summary);
        if (analyticsResult) setWebsiteAnalytics(analyticsResult);
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
            : {
                phone: String(data.get("identifier") || "").replace(/\D/g, ""),
              }),
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
      <StaffLogin
        demo={demo}
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
          isDemo: false,
        }
      }
      demo={demo}
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
          onViewCustomers={() => navigate("customers")}
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
          setTab={setTab}
          setError={setError}
          save={save}
        />
      )}
      <FeatureBoundary key={tab}>
        {tab === "audit" && <AuditLog token={token} />}
        {tab === "notifications" && <NotificationStatus token={token} />}
        {tab === "catalogue" && (
          <CatalogueManager
            token={token}
            role={staff?.role || ""}
            onSignOut={signOut}
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
          <WebsiteContentManager token={token} onSignOut={signOut} />
        )}
        {tab === "team" && staff?.role === "SUPER_ADMIN" && (
          <StaffManagement
            token={token}
            onBack={() => navigate("overview")}
            onSignOut={signOut}
            embedded={true}
          />
        )}
      </FeatureBoundary>
    </AdminWorkspaceLayout>
  );
}
export default App;
