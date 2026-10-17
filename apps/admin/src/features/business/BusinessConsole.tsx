import DiscountRules, { type DiscountRule } from "../discounts/DiscountRules";
import QuoteFollowups, {
  type FollowupQuotation,
} from "../sales/QuoteFollowups";
import TransportationPlanCard, {
  type TransportationPlan,
} from "../transportation/TransportationPlanCard";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowLeft,
  RefreshCw,
  Boxes,
  Truck,
  FileText,
  Users,
  Tags,
  BadgePercent,
  Coins,
  Clock3,
  Menu,
} from "lucide-react";
import "./business-console.css";
import ProcurementWorkspace from "../procurement/ProcurementWorkspace";
import type { ProcurementRequest } from "../procurement/ProcurementRequestCard";
import TransportationPlanningForms from "../transportation/TransportationPlanningForms";
import SupplierManagement, {
  type SupplierRecord,
} from "../suppliers/SupplierManagement";
import PartnerBrandsManager from "../catalogue/PartnerBrandsManager";
import ExpertDirectoryPanel from "../content/ExpertDirectoryPanel";
import type { ExpertProfile } from "../content/ExpertDirectoryPanel";
import BlogManagementPanel, {
  type BlogPost,
} from "../content/BlogManagementPanel";
import CommissionManagement, {
  type CommissionRecord,
} from "../commissions/CommissionManagement";
import LoyaltySettings, {
  LoyaltyProgramOverview,
  type LoyaltySettingsValues,
} from "../loyalty/LoyaltySettings";
import QuotationRules, {
  QuotationRulesOverview,
  type QuotationRulesSettings,
} from "../sales/QuotationRules";
import "../catalogue/catalogue-manager.css";

type Section =
  | "suppliers"
  | "procurement"
  | "transport"
  | "discounts"
  | "followups"
  | "brands"
  | "experts"
  | "blogs"
  | "commissions"
  | "loyalty"
  | "quote-rules";
const sections: {
  id: Section;
  label: string;
  icon: typeof Boxes;
  endpoint: string;
}[] = [
  { id: "suppliers", label: "Suppliers", icon: Boxes, endpoint: "/suppliers" },
  {
    id: "procurement",
    label: "Procurement",
    icon: FileText,
    endpoint: "/procurement",
  },
  {
    id: "transport",
    label: "Transportation",
    icon: Truck,
    endpoint: "/transportation",
  },
  {
    id: "discounts",
    label: "Discount rules",
    icon: BadgePercent,
    endpoint: "/discount-rules",
  },
  {
    id: "followups",
    label: "Quote follow-ups",
    icon: FileText,
    endpoint: "/quotes",
  },
  {
    id: "brands",
    label: "Partner brands",
    icon: Tags,
    endpoint: "/products/catalogue/partner-brands",
  },
  {
    id: "experts",
    label: "Experts & services",
    icon: Users,
    endpoint: "/admin/experts",
  },
  {
    id: "blogs",
    label: "Blogs",
    icon: FileText,
    endpoint: "/admin/blogs",
  },
  {
    id: "commissions",
    label: "Commissions",
    icon: Coins,
    endpoint: "/commissions",
  },
  {
    id: "loyalty",
    label: "Loyalty program",
    icon: Coins,
    endpoint: "/admin/loyalty/settings",
  },
  {
    id: "quote-rules",
    label: "Quotation rules",
    icon: Clock3,
    endpoint: "/admin/business-rules",
  },
];
type LoyaltySettings = {
  enabled: boolean;
  pointsPer100Inr: number | string;
  minimumOrderValueInr: number | string;
  redemptionValuePerPoint: number | string;
  minimumRedemptionPoints: number | string;
  expiryAfterDays: number | string | null;
  createdBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};
type ConsoleSettings = Partial<LoyaltySettings & QuotationRulesSettings>;
type LoyaltyAuditPage = {
  items: Array<{ createdAt: string; staff: { name: string } | null }>;
  total: number;
  pageSize: number;
};
const sectionRoles: Record<Section, string[]> = {
  suppliers: ["SUPER_ADMIN", "ADMIN", "PROCUREMENT_HEAD"],
  procurement: ["SUPER_ADMIN", "ADMIN", "PROCUREMENT_HEAD"],
  transport: ["SUPER_ADMIN", "ADMIN", "DISPATCH_OFFICER"],
  discounts: ["SUPER_ADMIN", "ADMIN", "CATALOG_MANAGER"],
  followups: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"],
  brands: ["SUPER_ADMIN", "ADMIN", "CATALOG_MANAGER"],
  experts: ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"],
  blogs: ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"],
  commissions: ["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"],
  loyalty: ["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"],
  "quote-rules": ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"],
};

function sectionFromLocation(role: string): Section {
  const requested = new URLSearchParams(window.location.search).get(
    "businessSection",
  );
  return (
    sections.find(
      (entry) =>
        entry.id === requested && sectionRoles[entry.id].includes(role),
    )?.id ||
    sections.find((entry) => sectionRoles[entry.id].includes(role))?.id ||
    "suppliers"
  );
}

import MaterialSquareLogo from "../../components/MaterialSquareLogo";

export default function BusinessConsole({
  token,
  role,
  staffName,
  customerUrl,
  onBack,
  onSignOut,
  onContentReady,
  embedded = false,
}: {
  token: string;
  role: string;
  staffName?: string;
  customerUrl?: string;
  onBack: () => void;
  onSignOut: () => void;
  onContentReady: (ready: boolean) => void;
  embedded?: boolean;
}) {
  const visibleSections = sections.filter((entry) =>
    sectionRoles[entry.id].includes(role),
  );
  const [section, setSection] = useState<Section>(() =>
    sectionFromLocation(role),
  );
  const [visitedSections, setVisitedSections] = useState<Set<Section>>(() => new Set([sectionFromLocation(role)]));
  const [transportView, setTransportView] = useState<
    "plan" | "challan" | "plans"
  >("plan");
  const [selectedTransportationPlanId, setSelectedTransportationPlanId] =
    useState<string | null>(null);
  const [editTransportationPlanOnOpen, setEditTransportationPlanOnOpen] =
    useState(false);
  const [expertView, setExpertView] = useState<"add" | "directory">("add");
  const [selectedExpertId, setSelectedExpertId] = useState<string | null>(null);
  const [blogView, setBlogView] = useState<"write" | "articles">("write");
  const [selectedBlogId, setSelectedBlogId] = useState<string | null>(null);
  const [commissionView, setCommissionView] = useState<"record" | "records">("record");
  const [selectedCommissionId, setSelectedCommissionId] = useState<string | null>(null);
  const [loyaltyView, setLoyaltyView] = useState<"overview" | "settings">("overview");
  const [quotationRulesView, setQuotationRulesView] = useState<"overview" | "settings">("overview");
  const [loyaltyCreationOverride, setLoyaltyCreationOverride] = useState<{
    createdBy: string;
    createdAt: string;
  } | null>(null);
  const [sectionMenuOpen, setSectionMenuOpen] = useState(false);
  const sectionMenuRef = useRef<HTMLDivElement>(null);
  const [records, setRecords] = useState<unknown[]>([]);
  const [recordsSection, setRecordsSection] = useState<Section | null>(null);
  const loadSequence = useRef(0);
  const [settings, setSettings] = useState<ConsoleSettings | null>(null);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const applyBusinessSubView = (value: string | null) => {
    const [scope, action, ...rest] = (value || "").split(":");
    const id = rest.join(":") || null;
    setSelectedTransportationPlanId(null);
    setEditTransportationPlanOnOpen(false);
    setTransportView("plan");
    setSelectedExpertId(null);
    setExpertView("add");
    setSelectedBlogId(null);
    setBlogView("write");
    setSelectedCommissionId(null);
    setCommissionView("record");
    setLoyaltyView("overview");
    setQuotationRulesView("overview");
    if (scope === "transport") {
      setSelectedTransportationPlanId(action === "detail" ? id : null);
      setEditTransportationPlanOnOpen(action === "detail");
      setTransportView(action === "detail" ? "plans" : action === "challan" ? "challan" : action === "plans" ? "plans" : "plan");
    } else if (scope === "experts") {
      setSelectedExpertId(action === "edit" ? id : null);
      setExpertView(action === "add" ? "add" : "directory");
    } else if (scope === "blogs") {
      setSelectedBlogId(action === "edit" ? id : null);
      setBlogView(action === "write" ? "write" : "articles");
    } else if (scope === "commissions") {
      setSelectedCommissionId(action === "detail" ? id : null);
      setCommissionView(action === "record" ? "record" : "records");
    } else if (scope === "loyalty") {
      setLoyaltyView(action === "settings" ? "settings" : "overview");
    } else if (scope === "quote-rules") {
      setQuotationRulesView(action === "settings" ? "settings" : "overview");
    }
  };
  const navigateBusinessSubView = (value: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("businessSubView", value);
    window.history.pushState({ ...(window.history.state ?? {}), businessSubView: value }, "", `${url.pathname}${url.search}${url.hash}`);
    applyBusinessSubView(value);
  };
  const returnFromBusinessSubView = (fallbackValue: string, fallback: () => void) => {
    if (window.history.state?.businessSubView) window.history.back();
    else {
      const url = new URL(window.location.href);
      url.searchParams.set("businessSubView", fallbackValue);
      window.history.replaceState(
        { ...(window.history.state ?? {}), businessSubView: fallbackValue },
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
      applyBusinessSubView(fallbackValue);
      fallback();
    }
  };
  useEffect(() => {
    setVisitedSections((current) => current.has(section) ? current : new Set(current).add(section));
  }, [section]);
  const selectSection = (next: Section) => {
    if (!visibleSections.some((entry) => entry.id === next) || next === section) return;
    const url = new URL(window.location.href);
    url.searchParams.set("businessSection", next);
    url.searchParams.delete("businessSubView");
    if (next !== "procurement") url.searchParams.delete("procurementView");
    window.history.pushState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    setSection(next);
    setMessage("");
    setError("");
  };
  useEffect(() => {
    const restoreSection = () => {
      const restored = sectionFromLocation(role);
      setSection(restored);
      setVisitedSections((current) => current.has(restored) ? current : new Set(current).add(restored));
      applyBusinessSubView(new URLSearchParams(window.location.search).get("businessSubView"));
    };
    window.addEventListener("popstate", restoreSection);
    applyBusinessSubView(new URLSearchParams(window.location.search).get("businessSubView"));
    return () => window.removeEventListener("popstate", restoreSection);
  }, [role]);
  useEffect(() => {
    if (!sectionMenuOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!sectionMenuRef.current?.contains(event.target as Node)) {
        setSectionMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSectionMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [sectionMenuOpen]);
  useEffect(() => {
    onContentReady(false);
  }, [section, onContentReady]);
  const active =
    visibleSections.find((entry) => entry.id === section) ||
    visibleSections[0] ||
    sections[0];
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("businessSection", section);
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, [section]);
  const loyaltySettings: LoyaltySettingsValues | null = settings
    ? {
        enabled: settings.enabled ?? false,
        pointsPer100Inr: settings.pointsPer100Inr ?? 0,
        minimumOrderValueInr: settings.minimumOrderValueInr ?? 0,
        redemptionValuePerPoint: settings.redemptionValuePerPoint ?? 0,
        minimumRedemptionPoints: settings.minimumRedemptionPoints ?? 0,
        expiryAfterDays: settings.expiryAfterDays ?? null,
        createdBy: settings.createdBy ?? loyaltyCreationOverride?.createdBy ?? null,
        createdAt:
          settings.createdAt ??
          loyaltyCreationOverride?.createdAt ??
          settings.updatedAt ??
          null,
      }
    : null;
  const request = useCallback(
    async <T,>(url: string, method = "GET", body?: unknown): Promise<T> => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "/api"}${url}`,
        {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(65000),
        },
      );
      const result = await response.json().catch(() => null);
      if (response.status === 401) onSignOut();
      if (!response.ok)
        throw new Error(
          typeof result?.message === "string"
            ? result.message
            : "Could not complete this action.",
        );
      return result as T;
    },
    [token, onSignOut],
  );
  const refresh = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setBusy(true);
    setError("");
    onContentReady(false);
    try {
      if (section === "brands") {
        if (sequence === loadSequence.current) {
          setRecords([]);
          setRecordsSection(section);
        }
      } else if (section === "loyalty" || section === "quote-rules") {
        const value = await request<ConsoleSettings>(active.endpoint);
        let resolved = value;
        if (section === "loyalty" && (!value.createdBy || !value.createdAt)) {
          try {
            const auditQuery = new URLSearchParams({
              page: "1",
              actorScope: "all",
              action: "LOYALTY_SETTINGS_UPDATED",
              entityType: "LOYALTY_SETTINGS",
              entityId: "default",
            });
            const firstPage = await request<LoyaltyAuditPage>(
              `/admin/audit?${auditQuery.toString()}`,
            );
            const lastPageNumber = Math.ceil(
              firstPage.total / Math.max(1, firstPage.pageSize),
            );
            const auditPage =
              lastPageNumber > 1
                ? await request<LoyaltyAuditPage>(
                    `/admin/audit?${new URLSearchParams({
                      page: String(lastPageNumber),
                      actorScope: "all",
                      action: "LOYALTY_SETTINGS_UPDATED",
                      entityType: "LOYALTY_SETTINGS",
                      entityId: "default",
                    }).toString()}`,
                  )
                : firstPage;
            const initialUpdate = auditPage.items.at(-1);
            if (initialUpdate) {
              resolved = {
                ...value,
                createdBy: value.createdBy ?? initialUpdate.staff?.name ?? null,
                createdAt: value.createdAt ?? initialUpdate.createdAt,
              };
            }
          } catch {
            // Settings stay available if the current role cannot view audit history.
          }
        }
        if (sequence === loadSequence.current) setSettings(resolved);
      } else {
        const value = await request<unknown[]>(active.endpoint);
        if (sequence === loadSequence.current) {
          setRecords(value);
          setRecordsSection(section);
        }
      }
    } catch (e) {
      if (sequence === loadSequence.current)
        setError(
          e instanceof Error ? e.message : "Could not load this section.",
        );
    } finally {
      if (sequence === loadSequence.current) {
        setBusy(false);
        if (section !== "brands") onContentReady(true);
      }
    }
  }, [active.endpoint, onContentReady, request, section]);
  useEffect(() => {
    if (
      !visibleSections.some((entry) => entry.id === section) &&
      visibleSections[0]
    )
      setSection(visibleSections[0].id);
  }, [role, section]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const visibleRecords = recordsSection === section ? records : [];
  async function mutate(
    url: string,
    method: string,
    body: unknown,
  ): Promise<boolean> {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await request(url, method, body);
      setMessage("Saved.");
      await refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this record.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function saveLoyaltySettings(
    values: LoyaltySettingsValues,
  ): Promise<boolean> {
    const firstSetup = !settings?.updatedAt && !settings?.createdAt;
    const saved = await mutate(active.endpoint, "PUT", values);
    if (saved && firstSetup) {
      setLoyaltyCreationOverride({
        createdBy: staffName || "Unknown",
        createdAt: new Date().toISOString(),
      });
    }
    return saved;
  }
  async function download(url: string, filename: string) {
    setError("");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "/api"}${url}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok)
        throw new Error("Could not download the purchase order PDF.");
      const objectUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not download the PDF.");
    }
  }
  async function submit(
    e: FormEvent<HTMLFormElement>,
    makeBody: (form: FormData) => unknown,
    url = active.endpoint,
    method = "POST",
  ) {
    e.preventDefault();
    if (mediaBusy) return false;
    const form = e.currentTarget;
    const body = makeBody(new FormData(form));
    const saved = await mutate(url, method, body);
    if (saved) form.reset();
    return saved;
  }
  const sectionContent = (
    <>
      {visitedSections.has("suppliers") && <div hidden={section !== "suppliers"}>
        <SupplierManagement
          records={visibleRecords as SupplierRecord[]}
          request={request}
          busy={busy}
          mutate={mutate}
          submitForm={submit}
        />
      </div>}
      {visitedSections.has("procurement") && <div hidden={section !== "procurement"}>
        <ProcurementWorkspace
          records={visibleRecords as ProcurementRequest[]}
          busy={busy}
          request={request}
          mutate={mutate}
          submit={submit}
          download={download}
        />
      </div>}
      {visitedSections.has("transport") && <div hidden={section !== "transport"}>
        <>
          <div
            className="transportation-workflow-tabs"
            role="group"
            aria-label="Transportation tasks"
          >
            <button
              type="button"
              className={`transportation-workflow-tab${transportView === "plan" ? " active" : ""}`}
              aria-pressed={transportView === "plan"}
              onClick={() => {
                navigateBusinessSubView("transport:plan");
              }}
            >
              Plan delivery
            </button>
            <button
              type="button"
              className={`transportation-workflow-tab${transportView === "challan" ? " active" : ""}`}
              aria-pressed={transportView === "challan"}
              onClick={() => {
                navigateBusinessSubView("transport:challan");
              }}
            >
              Issue challan
            </button>
            <button
              type="button"
              className={`transportation-workflow-tab${transportView === "plans" ? " active" : ""}`}
              aria-pressed={transportView === "plans"}
              onClick={() => {
                navigateBusinessSubView("transport:plans");
              }}
            >
              Transportation plans{" "}
              <span>{(visibleRecords as TransportationPlan[]).length}</span>
            </button>
          </div>
          <div hidden={transportView !== "plan"}>
            <TransportationPlanningForms
              busy={busy}
              submit={submit}
              mode="plan"
            />
          </div>
          <div hidden={transportView !== "challan"}>
            <TransportationPlanningForms
              busy={busy}
              submit={submit}
              mode="challan"
            />
          </div>
          <div hidden={transportView !== "plans"}>
            <h2>Transportation plans</h2>
            {!(visibleRecords as TransportationPlan[]).length && (
              <p className="bc-helper">No transportation plans yet.</p>
            )}
            {(visibleRecords as TransportationPlan[]).map((plan) => (
              <TransportationPlanCard
                key={`${plan.id}-${plan.status}`}
                plan={plan}
                busy={busy}
                mutate={mutate}
                onOpenForEdit={() => {
                  navigateBusinessSubView(`transport:detail:${plan.id}`);
                }}
              />
            ))}
          </div>
        </>
      </div>}
      {visitedSections.has("discounts") && <div hidden={section !== "discounts"}>
        <DiscountRules
          rules={visibleRecords as DiscountRule[]}
          busy={busy}
          submit={submit}
          mutate={mutate}
        />
      </div>}
      {visitedSections.has("followups") && <div hidden={section !== "followups"}>
        <QuoteFollowups
          quotes={visibleRecords as FollowupQuotation[]}
          submit={submit}
          mutate={mutate}
          busy={busy}
        />
      </div>}
      {visitedSections.has("brands") && <div hidden={section !== "brands"}>
        <PartnerBrandsManager
          token={token}
          role={role}
          onSignOut={onSignOut}
          onBack={() => selectSection("suppliers")}
          onContentReady={onContentReady}
          customerUrl={customerUrl}
          embedded
        />
      </div>}
      {visitedSections.has("experts") && <div hidden={section !== "experts"}>
        <ExpertDirectoryPanel
          records={visibleRecords as ExpertProfile[]}
          token={token}
          customerUrl={customerUrl}
          busy={busy}
          mediaBusy={mediaBusy}
          setMediaBusy={setMediaBusy}
          onSignOut={onSignOut}
          submitForm={submit}
          mutate={mutate}
          activeView={expertView}
          onViewChange={(view) => navigateBusinessSubView(`experts:${view}`)}
          onOpenEdit={(id) => navigateBusinessSubView(`experts:edit:${id}`)}
        />
      </div>}
      {visitedSections.has("blogs") && <div hidden={section !== "blogs"}>
        <BlogManagementPanel
          records={visibleRecords as BlogPost[]}
          token={token}
          customerUrl={customerUrl}
          busy={busy}
          mediaBusy={mediaBusy}
          setMediaBusy={setMediaBusy}
          onSignOut={onSignOut}
          submitForm={submit}
          mutate={mutate}
          activeView={blogView}
          onViewChange={(view) => navigateBusinessSubView(`blogs:${view}`)}
          onOpenEdit={(id) => navigateBusinessSubView(`blogs:edit:${id}`)}
        />
      </div>}
      {visitedSections.has("commissions") && <div hidden={section !== "commissions"}>
        <CommissionManagement
          records={visibleRecords as CommissionRecord[]}
          busy={busy}
          onCreate={(commission) => mutate(active.endpoint, "POST", commission)}
          onApprove={(id) => mutate(`/commissions/${id}/approve`, "POST", {})}
          activeView={commissionView}
          onViewChange={(view) => navigateBusinessSubView(`commissions:${view}`)}
          onOpenRecord={(id) => navigateBusinessSubView(`commissions:detail:${id}`)}
        />
      </div>}
      {visitedSections.has("quote-rules") && settings && <div hidden={section !== "quote-rules"}>
        {quotationRulesView === "overview" ? (
          <QuotationRulesOverview
            settings={{
              quotationValidityHours: Number(settings.quotationValidityHours ?? 48),
              sendQuotePublishedNotification: settings.sendQuotePublishedNotification ?? true,
              sendQuoteExpiryReminder: settings.sendQuoteExpiryReminder ?? true,
              expiryReminderHoursBefore: Number(settings.expiryReminderHoursBefore ?? 24),
              createdBy: settings.createdBy,
              createdAt: settings.createdAt,
            }}
            onEdit={() => navigateBusinessSubView("quote-rules:settings")}
          />
        ) : (
          <QuotationRules
            settings={{
              quotationValidityHours: Number(settings.quotationValidityHours ?? 48),
              sendQuotePublishedNotification: settings.sendQuotePublishedNotification ?? true,
              sendQuoteExpiryReminder: settings.sendQuoteExpiryReminder ?? true,
              expiryReminderHoursBefore: Number(settings.expiryReminderHoursBefore ?? 24),
            }}
            busy={busy}
            onSave={(rules) => mutate(active.endpoint, "PUT", rules)}
            onSaved={() => navigateBusinessSubView("quote-rules:overview")}
          />
        )}
      </div>}
      {visitedSections.has("loyalty") && loyaltySettings && <div hidden={section !== "loyalty"}>
        {loyaltyView === "overview" ? (
          <LoyaltyProgramOverview
            settings={loyaltySettings}
            onEdit={() => navigateBusinessSubView("loyalty:settings")}
          />
        ) : (
          <LoyaltySettings
            settings={loyaltySettings}
            busy={busy}
            onSave={saveLoyaltySettings}
            onSaved={() => navigateBusinessSubView("loyalty:overview")}
          />
        )}
      </div>}
    </>
  );

  const selectedTransportationPlan = (
    visibleRecords as TransportationPlan[]
  ).find((plan) => plan.id === selectedTransportationPlanId);
  const selectedExpert = (visibleRecords as ExpertProfile[]).find(
    (expert) => expert.id === selectedExpertId,
  );
  const selectedBlog = (visibleRecords as BlogPost[]).find(
    (blog) => blog.id === selectedBlogId,
  );
  const selectedCommission = (visibleRecords as CommissionRecord[]).find(
    (commission) => commission.id === selectedCommissionId,
  );

  if (embedded) {
    if (section === "quote-rules" && settings && quotationRulesView === "settings") {
      return (
        <div className="embedded-business-view">
          <section className="panel-card panel-body quotation-rules-detail-page">
            <button
              type="button"
              className="btn-sm btn-secondary admin-back-button transportation-plan-detail-back"
              onClick={() => returnFromBusinessSubView("quote-rules:overview", () => setQuotationRulesView("overview"))}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Back to quotation rules
            </button>
            <QuotationRules
              settings={{
                quotationValidityHours: Number(settings.quotationValidityHours ?? 48),
                sendQuotePublishedNotification: settings.sendQuotePublishedNotification ?? true,
                sendQuoteExpiryReminder: settings.sendQuoteExpiryReminder ?? true,
                expiryReminderHoursBefore: Number(settings.expiryReminderHoursBefore ?? 24),
              }}
              busy={busy}
              onSave={(rules) => mutate(active.endpoint, "PUT", rules)}
              onSaved={() => navigateBusinessSubView("quote-rules:overview")}
            />
          </section>
        </div>
      );
    }
    if (section === "loyalty" && loyaltySettings && loyaltyView === "settings") {
      return (
        <div className="embedded-business-view">
          <section className="panel-card panel-body loyalty-detail-page">
            <button
              type="button"
              className="btn-sm btn-secondary admin-back-button transportation-plan-detail-back"
              onClick={() => returnFromBusinessSubView("loyalty:overview", () => setLoyaltyView("overview"))}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Back to loyalty program
            </button>
            <LoyaltySettings
              settings={loyaltySettings}
              busy={busy}
              onSave={saveLoyaltySettings}
              onSaved={() => navigateBusinessSubView("loyalty:overview")}
            />
          </section>
        </div>
      );
    }
    if (section === "experts" && selectedExpert) {
      return (
        <div className="embedded-business-view">
          <section className="panel-card panel-body expert-detail-page">
            <button
              type="button"
              className="btn-sm btn-secondary admin-back-button transportation-plan-detail-back"
              onClick={() => {
                returnFromBusinessSubView("experts:directory", () => {
                  setSelectedExpertId(null);
                  setExpertView("directory");
                });
              }}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Back to directory
            </button>
            <ExpertDirectoryPanel
              records={visibleRecords as ExpertProfile[]}
              token={token}
              customerUrl={customerUrl}
              busy={busy}
              mediaBusy={mediaBusy}
              setMediaBusy={setMediaBusy}
              onSignOut={onSignOut}
              submitForm={submit}
              mutate={mutate}
              activeView="directory"
              onViewChange={(view) => navigateBusinessSubView(`experts:${view}`)}
              onOpenEdit={(id) => navigateBusinessSubView(`experts:edit:${id}`)}
              focusedExpert={selectedExpert}
              onExitFocusedEdit={() => {
                returnFromBusinessSubView("experts:directory", () => {
                  setSelectedExpertId(null);
                  setExpertView("directory");
                });
              }}
            />
          </section>
        </div>
      );
    }
    if (section === "blogs" && selectedBlog) {
      return (
        <div className="embedded-business-view">
          <section className="panel-card panel-body blog-detail-page">
            <button
              type="button"
              className="btn-sm btn-secondary admin-back-button transportation-plan-detail-back"
              onClick={() => {
                returnFromBusinessSubView("blogs:articles", () => {
                  setSelectedBlogId(null);
                  setBlogView("articles");
                });
              }}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Back to articles
            </button>
            <BlogManagementPanel
              records={visibleRecords as BlogPost[]}
              token={token}
              customerUrl={customerUrl}
              busy={busy}
              mediaBusy={mediaBusy}
              setMediaBusy={setMediaBusy}
              onSignOut={onSignOut}
              submitForm={submit}
              mutate={mutate}
              activeView="articles"
              onViewChange={(view) => navigateBusinessSubView(`blogs:${view}`)}
              onOpenEdit={(id) => navigateBusinessSubView(`blogs:edit:${id}`)}
              focusedBlog={selectedBlog}
              onExitFocusedEdit={() => {
                returnFromBusinessSubView("blogs:articles", () => {
                  setSelectedBlogId(null);
                  setBlogView("articles");
                });
              }}
            />
          </section>
        </div>
      );
    }
    if (section === "commissions" && selectedCommission) {
      return (
        <div className="embedded-business-view">
          <section className="panel-card panel-body commission-detail-page">
            <button
              type="button"
              className="btn-sm btn-secondary admin-back-button transportation-plan-detail-back"
              onClick={() => {
                returnFromBusinessSubView("commissions:records", () => {
                  setSelectedCommissionId(null);
                  setCommissionView("records");
                });
              }}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Back to commission records
            </button>
            <CommissionManagement
              records={visibleRecords as CommissionRecord[]}
              busy={busy}
              onCreate={(commission) =>
                mutate(active.endpoint, "POST", commission)
              }
              onApprove={(id) =>
                mutate(`/commissions/${id}/approve`, "POST", {})
              }
              activeView="records"
              onViewChange={(view) => navigateBusinessSubView(`commissions:${view}`)}
              onOpenRecord={(id) => navigateBusinessSubView(`commissions:detail:${id}`)}
              focusedRecord={selectedCommission}
            />
          </section>
        </div>
      );
    }
    if (section === "transport" && selectedTransportationPlan) {
      return (
        <div className="embedded-business-view">
          <section className="panel-card panel-body transportation-plan-detail-page">
            <button
              type="button"
              className="btn-sm btn-secondary admin-back-button transportation-plan-detail-back"
              onClick={() => {
                returnFromBusinessSubView("transport:plans", () => {
                  setSelectedTransportationPlanId(null);
                  setEditTransportationPlanOnOpen(false);
                  setTransportView("plans");
                });
              }}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Back to transportation plans
            </button>
            <TransportationPlanCard
              plan={selectedTransportationPlan}
              busy={busy}
              mutate={mutate}
              openForEdit={editTransportationPlanOnOpen}
            />
          </section>
        </div>
      );
    }
    return (
      <div className="embedded-business-view">
        <div className="embedded-subnav-bar" ref={sectionMenuRef}>
          <h1 className="operations-current-section">{active.label}</h1>
          {sectionMenuOpen && (
            <div className="embedded-subnav-items" id="business-section-menu">
              {visibleSections.map(({ id, label, icon: Icon }) => (
                <button
                  className={`subnav-pill ${section === id ? "active" : ""}`}
                  key={id}
                  onClick={() => {
                    selectSection(id);
                    setSectionMenuOpen(false);
                  }}
                >
                  <Icon size={15} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            className="operations-menu-trigger"
            aria-label="Open business management sections"
            aria-expanded={sectionMenuOpen}
            aria-controls="business-section-menu"
            title="Open business management sections"
            onClick={() => setSectionMenuOpen((open) => !open)}
          >
            <Menu size={22} aria-hidden="true" />
          </button>
        </div>
        {error && (
          <p className="bc-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="bc-success" role="status">
            {message}
          </p>
        )}
        {sectionContent}
      </div>
    );
  }

  return (
    <div className="business-console">
      <aside className="business-console-nav">
        <div style={{ marginBottom: "1rem" }}>
          <MaterialSquareLogo
            size={36}
            lightMode={true}
            tagline="BUSINESS CONSOLE"
          />
        </div>
        <button
          className="bc-button bc-back admin-back-button"
          onClick={onBack}
        >
          <ArrowLeft size={16} /> Main workspace
        </button>
        <strong>Business management</strong>
        {visibleSections.map(({ id, label, icon: Icon }) => (
          <button
            className={section === id ? "bc-nav active" : "bc-nav"}
            key={id}
            onClick={() => {
              selectSection(id);
            }}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
        <button className="bc-button bc-signout" onClick={onSignOut}>
          Sign out
        </button>
      </aside>
      <main className="business-console-main">
        <header className="bc-header">
          <div>
            <small>STAFF WORKSPACE</small>
            <h1>{active.label}</h1>
          </div>
          <button
            className="bc-button btn-orange-outline"
            onClick={() => void refresh()}
            disabled={busy}
          >
            <RefreshCw size={15} />
            {busy ? "Loading…" : "Refresh"}
          </button>
        </header>
        {error && (
          <p className="bc-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="bc-success" role="status">
            {message}
          </p>
        )}
        {sectionContent}
      </main>
    </div>
  );
}
