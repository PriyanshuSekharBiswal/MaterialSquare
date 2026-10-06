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
  Users,
  X,
} from "lucide-react";
import type { WorkspaceTab } from "../features/customers/contracts";
import MaterialSquareLogo from "./MaterialSquareLogo";

export type AdminStaff = {
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
    group: "Core Workspace",
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "recent", label: "Recent activity", icon: Clock3 },
      { id: "customers", label: "Customers", icon: Users },
      { id: "followups", label: "Follow-ups", icon: ClipboardList },
      { id: "sales", label: "Quotations & orders", icon: FileText },
      { id: "business", label: "Business management", icon: Tags },
      { id: "reports", label: "Operational reports", icon: BarChart3 },
    ],
  },
  {
    group: "Website Management",
    items: [
      { id: "catalogue", label: "Products, prices & offers", icon: Tags },
      { id: "content", label: "Website pages & content", icon: FileText },
    ],
  },
  {
    group: "Security & Admin",
    items: [
      { id: "team", label: "Staff & Roles", icon: ShieldCheck },
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
  if (id === "team") return role === "SUPER_ADMIN";
  return true;
}

function pageTitle(tab: WorkspaceTab) {
  const titles: Record<WorkspaceTab, string> = {
    overview: "Executive Overview",
    recent: "Recent Activity · 7 days",
    customers: "Customer Records",
    followups: "Enquiry Follow-ups",
    catalogue: "Website Catalogue",
    content: "Website Pages & Content",
    sales: "Quotations & Orders",
    business: "Business Management",
    reports: "Operational Reports",
    audit: "Audit Log",
    notifications: "Notifications",
    team: "Staff & Role Permissions",
  };
  return titles[tab];
}

function pageDescription(tab: WorkspaceTab) {
  const descriptions: Record<WorkspaceTab, string> = {
    overview: "A clear view of enquiries, sales and website performance.",
    recent: "Changes made across the workspace during the last 7 days.",
    customers: "Customer details, conversations and recent activity.",
    followups: "Keep every open enquiry moving toward a clear next step.",
    catalogue: "Manage the products, prices and offers customers see online.",
    content: "Prepare page updates, preview them and publish when ready.",
    sales: "Review quotations and orders from enquiry through fulfilment.",
    business: "Manage the teams, suppliers and services behind the storefront.",
    reports: "Track operating activity and business performance.",
    audit: "Review who changed records and when those changes happened.",
    notifications: "Messages and alerts that need your attention.",
    team: "Manage staff access and the work each role can perform.",
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
  onMobileNavChange,
  onRefresh,
  onSignOut,
}: AdminWorkspaceLayoutProps) {
  const navigate = (next: WorkspaceTab) => {
    onNavigate(next);
    onMobileNavChange(false);
  };

  return (
    <div className="admin-layout">
      <div className="mobile-top-bar">
        <MaterialSquareLogo
          size={32}
          showText={true}
          lightMode={true}
        />
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
            <MaterialSquareLogo
              size={42}
              showText={true}
              lightMode={true}
              tagline="BUILDING BETTER TOGETHER"
              badgeText="ADMIN"
            />
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
            <div className="admin-breadcrumb"><span>Material Square</span><span aria-hidden="true">/</span><strong>Operations</strong></div>
            <h1>{pageTitle(tab)}</h1>
            <p className="admin-page-description">{pageDescription(tab)}</p>
          </div>
          <div className="admin-header-actions">
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
