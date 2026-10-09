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
  BookOpen,
  BadgePercent,
  Coins,
  Clock3,
  Menu,
} from "lucide-react";
import "./business-console.css";
import ProcurementRequestCard from "../procurement/ProcurementRequestCard";
import type { ProcurementRequest } from "../procurement/ProcurementRequestCard";
import PurchaseRequestForm from "../procurement/PurchaseRequestForm";
import TransportationPlanningForms from "../transportation/TransportationPlanningForms";
import SupplierManagement, {
  type SupplierRecord,
} from "../suppliers/SupplierManagement";
import BlogManagementPanel from "../content/BlogManagementPanel";
import type { BlogPost } from "../content/BlogManagementPanel";
import ExpertDirectoryPanel from "../content/ExpertDirectoryPanel";
import type { ExpertProfile } from "../content/ExpertDirectoryPanel";
import CommissionManagement, {
  type CommissionRecord,
} from "../commissions/CommissionManagement";
import LoyaltySettings, {
  type LoyaltySettingsValues,
} from "../loyalty/LoyaltySettings";
import QuotationRules, {
  type QuotationRulesSettings,
} from "../sales/QuotationRules";

type Section =
  | "suppliers"
  | "procurement"
  | "transport"
  | "discounts"
  | "followups"
  | "blogs"
  | "experts"
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
  { id: "blogs", label: "Blogs", icon: BookOpen, endpoint: "/admin/blogs" },
  {
    id: "experts",
    label: "Experts & services",
    icon: Users,
    endpoint: "/admin/experts",
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
};
type ConsoleSettings = Partial<LoyaltySettings & QuotationRulesSettings>;
const sectionRoles: Record<Section, string[]> = {
  suppliers: ["SUPER_ADMIN", "ADMIN", "PROCUREMENT_HEAD"],
  procurement: ["SUPER_ADMIN", "ADMIN", "PROCUREMENT_HEAD"],
  transport: ["SUPER_ADMIN", "ADMIN", "DISPATCH_OFFICER"],
  discounts: ["SUPER_ADMIN", "ADMIN", "CATALOG_MANAGER"],
  followups: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"],
  blogs: ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"],
  experts: ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"],
  commissions: ["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"],
  loyalty: ["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"],
  "quote-rules": ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"],
};

import MaterialSquareLogo from "../../components/MaterialSquareLogo";

export default function BusinessConsole({
  token,
  role,
  customerUrl,
  onBack,
  onSignOut,
  embedded = false,
}: {
  token: string;
  role: string;
  customerUrl?: string;
  onBack: () => void;
  onSignOut: () => void;
  embedded?: boolean;
}) {
  const visibleSections = sections.filter((entry) =>
    sectionRoles[entry.id].includes(role),
  );
  const [section, setSection] = useState<Section>(
    () => visibleSections[0]?.id || "suppliers",
  );
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
  const active =
    visibleSections.find((entry) => entry.id === section) ||
    visibleSections[0] ||
    sections[0];
  const loyaltySettings: LoyaltySettingsValues | null = settings
    ? {
        enabled: settings.enabled ?? false,
        pointsPer100Inr: settings.pointsPer100Inr ?? 0,
        minimumOrderValueInr: settings.minimumOrderValueInr ?? 0,
        redemptionValuePerPoint: settings.redemptionValuePerPoint ?? 0,
        minimumRedemptionPoints: settings.minimumRedemptionPoints ?? 0,
        expiryAfterDays: settings.expiryAfterDays ?? null,
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
    try {
      if (section === "loyalty" || section === "quote-rules") {
        const value = await request<ConsoleSettings>(active.endpoint);
        if (sequence === loadSequence.current) setSettings(value);
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
      if (sequence === loadSequence.current) setBusy(false);
    }
  }, [active.endpoint, request, section]);
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
      {section === "suppliers" && (
        <SupplierManagement
          records={visibleRecords as SupplierRecord[]}
          request={request}
          busy={busy}
          mutate={mutate}
          submitForm={submit}
        />
      )}
      {section === "procurement" && (
        <>
          <PurchaseRequestForm busy={busy} submit={submit} request={request} />
          <h2>Purchase requests</h2>
          {(visibleRecords as ProcurementRequest[]).map((record) => (
            <ProcurementRequestCard
              key={record.id}
              record={record}
              request={request}
              busy={busy}
              mutate={mutate}
              download={download}
            />
          ))}
        </>
      )}
      {section === "transport" && (
        <>
          <TransportationPlanningForms busy={busy} submit={submit} />
          <h2>Transportation plans</h2>
          {(visibleRecords as TransportationPlan[]).map((plan) => (
            <TransportationPlanCard
              key={`${plan.id}-${plan.status}`}
              plan={plan}
              busy={busy}
              mutate={mutate}
            />
          ))}
        </>
      )}
      {section === "discounts" && (
        <DiscountRules
          rules={visibleRecords as DiscountRule[]}
          busy={busy}
          submit={submit}
          mutate={mutate}
        />
      )}
      {section === "followups" && (
        <QuoteFollowups
          quotes={visibleRecords as FollowupQuotation[]}
          submit={submit}
          mutate={mutate}
          busy={busy}
        />
      )}
      {section === "blogs" && (
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
        />
      )}
      {section === "experts" && (
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
        />
      )}
      {section === "commissions" && (
        <CommissionManagement
          records={visibleRecords as CommissionRecord[]}
          busy={busy}
          onCreate={(commission) => mutate(active.endpoint, "POST", commission)}
          onApprove={(id) => mutate(`/commissions/${id}/approve`, "POST", {})}
        />
      )}
      {section === "quote-rules" && settings && (
        <QuotationRules
          settings={{
            quotationValidityHours: Number(
              settings.quotationValidityHours ?? 48,
            ),
            sendQuotePublishedNotification:
              settings.sendQuotePublishedNotification ?? true,
            sendQuoteExpiryReminder: settings.sendQuoteExpiryReminder ?? true,
            expiryReminderHoursBefore: Number(
              settings.expiryReminderHoursBefore ?? 24,
            ),
          }}
          busy={busy}
          onSave={(rules) => {
            void mutate(active.endpoint, "PUT", rules);
          }}
        />
      )}
      {section === "loyalty" && loyaltySettings && (
        <LoyaltySettings
          settings={loyaltySettings}
          busy={busy}
          onSave={(values) => {
            void mutate(active.endpoint, "PUT", values);
          }}
        />
      )}
    </>
  );

  if (embedded) {
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
                    setSection(id);
                    setMessage("");
                    setError("");
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
        <button className="bc-button bc-back" onClick={onBack}>
          <ArrowLeft size={16} /> Main workspace
        </button>
        <strong>Business management</strong>
        {visibleSections.map(({ id, label, icon: Icon }) => (
          <button
            className={section === id ? "bc-nav active" : "bc-nav"}
            key={id}
            onClick={() => {
              setSection(id);
              setMessage("");
              setError("");
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
