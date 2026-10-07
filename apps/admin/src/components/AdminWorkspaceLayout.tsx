import type { ReactNode } from "react";
import {
  BarChart3,
  ClipboardList,
  ExternalLink,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Clock3,
  RefreshCw,
  ShieldCheck,
  Tags,
  Trash2,
  Users,
  UserRound,
  X,
} from "lucide-react";
import type { WorkspaceTab } from "../features/customers/contracts";
import MaterialSquareLogo from "./MaterialSquareLogo";
import GlobalAdminSearch, { type AdminSearchRecord } from "./GlobalAdminSearch";

export type AdminStaff = {
  id?: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: string;
};

type NavigationItem = {
  id: WorkspaceTab;
  label: string;
  icon: typeof LayoutDashboard;
};

const navigationSections: { group: string; items: NavigationItem[] }[] = [
  {
    group: "WORKSPACE",
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "recent", label: "Recent changes", icon: Clock3 },
      { id: "customers", label: "Customers", icon: Users },
      { id: "followups", label: "Enquiry follow-ups", icon: ClipboardList },
      { id: "sales", label: "Quotations & orders", icon: FileText },
      { id: "business", label: "Business management", icon: Tags },
      { id: "trash", label: "Recently deleted", icon: Trash2 },
      { id: "reports", label: "Operational reports", icon: BarChart3 },
    ],
  },
  {
    group: "WEBSITE MANAGEMENT",
    items: [
      { id: "catalogue", label: "Products & pricing", icon: Tags },
      { id: "content", label: "Website editor", icon: FileText },
    ],
  },
  {
    group: "TEAM & SECURITY",
    items: [
      { id: "team", label: "Staff & Roles", icon: ShieldCheck },
      { id: "account", label: "My account", icon: UserRound },
      { id: "audit", label: "Audit log", icon: FileText },
      { id: "notifications", label: "Notifications", icon: FileText },
    ],
  },
];

function isTabPermitted(id: WorkspaceTab, role?: string) {
  if (id === "audit" || id === "notifications")
    return role === "SUPER_ADMIN" || role === "ADMIN";
  if (id === "overview") return true;
  if (id === "sales" || id === "reports")
    return [
      "SUPER_ADMIN",
      "ADMIN",
      "SALES_MANAGER",
      "PROCUREMENT_HEAD",
      "DISPATCH_OFFICER",
      "ACCOUNTS_MANAGER",
    ].includes(role || "");
  if (id === "business") return Boolean(role);
  if (id === "customers" || id === "followups")
    return ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"].includes(role || "");
  if (id === "catalogue")
    return [
      "SUPER_ADMIN",
      "ADMIN",
      "SALES_MANAGER",
      "CATALOG_MANAGER",
    ].includes(role || "");
  if (id === "content")
    return ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"].includes(role || "");
  if (id === "team") return role === "SUPER_ADMIN" || role === "ADMIN";
  if (id === "trash")
    return [
      "SUPER_ADMIN",
      "ADMIN",
      "CATALOG_MANAGER",
      "PROCUREMENT_HEAD",
    ].includes(role || "");
  return true;
}

function pageTitle(tab: WorkspaceTab) {
  const titles: Record<WorkspaceTab, string> = {
    overview: "Overview",
    recent: "Recent changes · 7 days",
    customers: "Customers",
    followups: "Enquiry follow-ups",
    catalogue: "Products & pricing",
    content: "Website editor",
    sales: "Quotations & Orders",
    business: "Business Management",
    reports: "Operational Reports",
    audit: "Audit Log",
    notifications: "Notifications",
    team: "Staff & Role Permissions",
    account: "My account",
    trash: "Recently deleted",
  };
  return titles[tab];
}

function pageDescription(tab: WorkspaceTab) {
  const descriptions: Record<WorkspaceTab, string> = {
    overview: "Your recent work, customer enquiries and website activity in one place.",
    recent: "See what changed, who made the change and when. Activity is kept for 7 days.",
    customers: "Find customer contact details, requests and conversation history.",
    followups: "Track each customer enquiry and record the next step.",
    catalogue: "Add products, update prices and choose what customers can see.",
    content: "Update website pages, preview your changes and publish when they’re ready.",
    sales: "Manage quotes and orders from the first request through delivery.",
    business: "Manage the teams, suppliers and services behind the storefront.",
    reports: "Track operating activity and business performance.",
    audit: "Review who changed records and when those changes happened.",
    notifications: "Messages and alerts that need your attention.",
    team: "Manage staff access and the work each role can perform.",
    account: "Update your name and the contact details you use to sign in.",
    trash: "Restore products, suppliers or staff accounts within 30 days of deletion.",
  };
  return descriptions[tab];
}

type AdminWorkspaceLayoutProps = {
  staff: AdminStaff;
  tab: WorkspaceTab;
  openFollowups: number;
  mobileNavOpen: boolean;
  loading: boolean;
  busy: boolean;
  error: string;
  analyticsError: string;
  notice: string;
  marketplaceUrl: string;
  children: ReactNode;
  onNavigate: (tab: WorkspaceTab) => void;
  onSearchNavigate: (tab: WorkspaceTab, query?: string) => void;
  onSearchRecords: (query: string) => Promise<AdminSearchRecord[]>;
  onMobileNavChange: (open: boolean) => void;
  onRefresh: () => void;
  onSignOut: () => void;
};

export default function AdminWorkspaceLayout({
  staff,
  tab,
  openFollowups,
  mobileNavOpen,
  loading,
  busy,
  error,
  analyticsError,
  notice,
  marketplaceUrl,
  children,
  onNavigate,
  onSearchNavigate,
  onSearchRecords,
  onMobileNavChange,
  onRefresh,
  onSignOut,
}: AdminWorkspaceLayoutProps) {
  const navigate = (next: WorkspaceTab) => {
    onNavigate(next);
    onMobileNavChange(false);
  };
  const showGlobalSearch = [
    "overview",
    "recent",
    "catalogue",
    "business",
    "sales",
    "reports",
  ].includes(tab);

  return (
    <div className="admin-layout">
      <div className="mobile-top-bar">
        <MaterialSquareLogo size={32} showText={true} lightMode={false} />
        <button
          className="mobile-menu-btn"
          onClick={() => onMobileNavChange(!mobileNavOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileNavOpen}
        >
          {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <div
        className={`sidebar-backdrop ${mobileNavOpen ? "open" : ""}`}
        onClick={() => onMobileNavChange(false)}
      />

      <aside className={`admin-sidebar ${mobileNavOpen ? "open" : ""}`}>
        <div className="admin-brand">
          <button
            type="button"
            onClick={() => navigate("overview")}
            className="admin-brand-link"
            aria-label="Go to workspace overview"
          >
            <span className="admin-brand-copy">
              <MaterialSquareLogo
                size={44}
                showText={true}
                lightMode={true}
                tagline="BUILDING BETTER TOGETHER"
              />
              <span className="admin-brand-context">CLIENT ADMIN WORKSPACE</span>
            </span>
          </button>
          <button
            className="mobile-menu-btn"
            style={{ display: mobileNavOpen ? "inline-flex" : "none" }}
            onClick={() => onMobileNavChange(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-staff-card">
          <div className="staff-avatar-badge">
            {staff.name ? staff.name.charAt(0).toUpperCase() : "M"}
          </div>
          <div className="staff-meta">
            <span className="staff-name">{staff.name || "Staff Member"}</span>
            <span className="staff-role-chip">
              {staff.role ? staff.role.replace(/_/g, " ") : "Operator"}
            </span>
          </div>
        </div>

        <nav className="sidebar-nav-scroll" aria-label="Workspace navigation">
          {navigationSections.map((section) => {
            const allowedItems = section.items.filter((item) =>
              isTabPermitted(item.id, staff.role),
            );
            if (!allowedItems.length) return null;
            return (
              <div
                key={section.group}
                style={{ display: "flex", flexDirection: "column", gap: "2px" }}
              >
                <span className="nav-group-title">{section.group}</span>
                {allowedItems.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    className={`nav-item ${tab === id ? "active" : ""}`}
                    aria-current={tab === id ? "page" : undefined}
                    onClick={() => navigate(id)}
                  >
                    <Icon size={18} className="nav-item-icon" />
                    <span>{label}</span>
                    {id === "followups" && openFollowups > 0 && (
                      <span className="nav-item-badge">{openFollowups}</span>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {marketplaceUrl && (
            <a
              href={marketplaceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="sidebar-ext-link"
            >
              <ExternalLink size={14} />
              <span>Visit Marketplace</span>
            </a>
          )}
          <button className="sidebar-signout-btn" onClick={onSignOut}>
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div className="header-left">
            <div className="admin-breadcrumb">
              <span>Material Square</span>
              <span aria-hidden="true">/</span>
              <strong>Operations</strong>
            </div>
            <h1>{pageTitle(tab)}</h1>
            <p className="admin-page-description">{pageDescription(tab)}</p>
          </div>
          <div className="admin-header-actions">
            {showGlobalSearch && (
              <GlobalAdminSearch
                role={staff.role}
                onSelect={onSearchNavigate}
                searchRecords={onSearchRecords}
              />
            )}
            <button
              className="btn-sm btn-secondary"
              disabled={loading || busy}
              onClick={onRefresh}
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
        {analyticsError && tab === "overview" && (
          <p role="status" className="admin-error">
            {analyticsError}
          </p>
        )}
        {notice && (
          <p role="status" className="saved-notice">
            {notice}
          </p>
        )}
        {loading && <p role="status">Loading workspace…</p>}
        {children}
      </main>
    </div>
  );
}
