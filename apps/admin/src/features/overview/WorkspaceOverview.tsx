import { useState } from "react";
import { ArrowRight, Clock3, FileText, Package, Pencil, Plus, Upload } from "lucide-react";
import type { RecentChanges, Stats, WebsiteAnalytics } from "./contracts";

function recentChangeValue(field: string, value: unknown) {
  if (field === "isActive") return value ? "Active" : "Disabled";
  if (field === "role") {
    const roles: Record<string, string> = {
      ADMIN: "Administrator",
      SALES_MANAGER: "Sales & customer support",
      CATALOG_MANAGER: "Catalogue & pricing manager",
      PROCUREMENT_HEAD: "Procurement & suppliers",
      DISPATCH_OFFICER: "Dispatch & transportation",
      ACCOUNTS_MANAGER: "Accounts & finance",
      CONTENT_MANAGER: "Website content manager",
    };
    return roles[String(value)] || String(value || "(empty)");
  }
  return String(value ?? "(empty)");
}

type WorkspaceOverviewProps = {
  stats: Stats | null;
  websiteAnalytics: WebsiteAnalytics | null;
  recentChanges: RecentChanges | null;
  recentChangesError: string;
  staffRole: string;
  onViewCustomers: () => void;
  onViewFollowups: (status: "OPEN" | "CLOSED") => void;
  onViewAudit: () => void;
  onOpenCatalogue: () => void;
  onOpenContent: () => void;
  onOpenSales: () => void;
  onOpenBusiness: () => void;
  onOpenStaff: () => void;
  onRecordEnquiry: () => void;
};

export default function WorkspaceOverview({
  stats,
  websiteAnalytics,
  recentChanges,
  recentChangesError,
  staffRole,
  onViewCustomers,
  onViewFollowups,
  onViewAudit,
  onOpenCatalogue,
  onOpenContent,
  onOpenSales,
  onOpenBusiness,
  onOpenStaff,
  onRecordEnquiry,
}: WorkspaceOverviewProps) {
  const [recentCategory, setRecentCategory] = useState("All activity");
  const normalizedRecentItems = (recentChanges?.items || []).map((change) => ({
    ...change,
    category: change.category || recentCategoryForEntity(change.entityType),
    entityLabel: change.entityLabel || recentEntityLabel(change.entityType),
    actionLabel: change.actionLabel || recentActionLabel(change.action),
    changedFields: Array.isArray(change.changedFields)
      ? change.changedFields
      : [],
    changes: Array.isArray(change.changes) ? change.changes : [],
  }));
  const categories = [
    "All activity",
    ...(recentChanges?.categories?.length
      ? recentChanges.categories
      : ["Storefront", "Sales", "Procurement", "Settings & team"]),
  ];
  const recentItems = normalizedRecentItems.filter(
    (change) =>
      recentCategory === "All activity" || change.category === recentCategory,
  );
  const recentCounts = new Map(
    categories.map((category) => [
      category,
      category === "All activity"
        ? normalizedRecentItems.length
        : normalizedRecentItems.filter((change) => change.category === category)
            .length,
    ]),
  );
  if (!stats) return null;

  return (
    <>
      <div className="kpi-grid">
        {[
          { label: "Customer records", value: stats.customers, detail: "View all customers", onClick: onViewCustomers },
          { label: "New records · 30 days", value: stats.newCustomers30Days, detail: "View recent customers", onClick: onViewCustomers },
          { label: "Open follow-ups", value: stats.openFollowups, detail: "View open follow-ups", onClick: () => onViewFollowups("OPEN") },
          { label: "Closed follow-ups", value: stats.closedFollowups, detail: "View closed follow-ups", onClick: () => onViewFollowups("CLOSED") },
        ].map(({ label, value, detail, onClick }) => (
          <button className="kpi-card kpi-card-action" key={label} type="button" onClick={onClick}>
            <h2>{label}</h2>
            <p className="kpi-value">{value}</p>
            <span className="kpi-card-link">{detail}<ArrowRight size={14} aria-hidden="true" /></span>
          </button>
        ))}
      </div>
      {websiteAnalytics && (
        <section className="panel-card website-analytics">
          <div className="website-analytics-head">
            <div>
              <h2>Website activity · last {websiteAnalytics.days} days</h2>
              <p>
                Aggregate page and product interactions; visitor identities are
                not collected.
              </p>
            </div>
            <span className="analytics-range">30 days</span>
          </div>
          <div className="website-analytics-kpis">
            {[
              ["Page views", websiteAnalytics.totals.pageViews],
              ["Product detail opens", websiteAnalytics.totals.productViews],
              ["Added to material list", websiteAnalytics.totals.addToList],
              [
                "WhatsApp/email link clicks",
                websiteAnalytics.totals.requestHandoffs,
              ],
            ].map(([label, value]) => (
              <div className="website-analytics-kpi" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className="website-analytics-details">
            <div className="analytics-chart-wrap">
              <h3>Daily page views</h3>
              {websiteAnalytics.totals.pageViews ? (
                <div
                  className="analytics-bars"
                  role="img"
                  aria-label="Daily page views over the last 30 days"
                >
                  {websiteAnalytics.daily.map((day) => {
                    const max = Math.max(
                      1,
                      ...websiteAnalytics.daily.map((item) => item.pageViews),
                    );
                    return (
                      <div
                        className="analytics-bar-column"
                        key={day.date}
                        title={`${day.date}: ${day.pageViews} page views`}
                      >
                        <span
                          style={{
                            height: `${Math.max(day.pageViews ? 4 : 0, (day.pageViews / max) * 100)}%`,
                          }}
                        />
                        <small>
                          {new Date(`${day.date}T00:00:00`).getDate()}
                        </small>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="muted">
                  Activity will appear here after customers browse the site.
                </p>
              )}
            </div>
            <div className="analytics-ranking">
              <h3>Popular pages</h3>
              {websiteAnalytics.topPages.length ? (
                websiteAnalytics.topPages.map((item) => (
                  <div key={item.page}>
                    <span>{item.page.replace(/-/g, " ")}</span>
                    <strong>{item.views}</strong>
                  </div>
                ))
              ) : (
                <p className="muted">No page activity yet.</p>
              )}
            </div>
            <div className="analytics-ranking">
              <h3>Popular products</h3>
              {websiteAnalytics.topProducts.length ? (
                websiteAnalytics.topProducts.map((item) => (
                  <div key={item.id}>
                    <span>{item.name}</span>
                    <strong>{item.views}</strong>
                  </div>
                ))
              ) : (
                <p className="muted">No product views yet.</p>
              )}
            </div>
          </div>
          <p className="analytics-privacy-note">{websiteAnalytics.privacy}</p>
        </section>
      )}
      <section
        className="panel-card recent-changes-panel"
        aria-labelledby="recent-changes-heading"
      >
        <div className="recent-changes-header">
          <div>
            <span className="recent-changes-eyebrow">TEAM ACTIVITY</span>
            <h2 id="recent-changes-heading">Recent changes</h2>
            <p>
              Products, content, sales, procurement and team changes from the
              last 7 days.
            </p>
          </div>
          <span className="recent-changes-range">
            <Clock3 size={15} aria-hidden="true" /> Kept here for 7 days
          </span>
        </div>
        <div
          className="recent-changes-filters"
          role="group"
          aria-label="Filter recent activity"
        >
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={
                recentCategory === category
                  ? "recent-filter active"
                  : "recent-filter"
              }
              aria-pressed={recentCategory === category}
              onClick={() => setRecentCategory(category)}
            >
              {category}
              <span>{recentCounts.get(category)}</span>
            </button>
          ))}
        </div>
        {recentChangesError ? (
          <p className="recent-changes-message" role="status">
            {recentChangesError}
          </p>
        ) : !recentChanges ? (
          <p className="recent-changes-message" role="status">
            Loading recent changes…
          </p>
        ) : normalizedRecentItems.length === 0 ? (
          <div className="recent-changes-empty">
            <Package size={20} aria-hidden="true" />
            <span>No admin changes recorded in the past 7 days.</span>
          </div>
        ) : recentItems.length === 0 ? (
          <div className="recent-changes-empty">
            <span>
              No {recentCategory.toLowerCase()} activity in the past 7 days.
            </span>
          </div>
        ) : (
          <ul className="recent-changes-list">
            {recentItems.map((change) => {
              const Icon =
                change.action.includes("CREATED") ||
                change.action.includes("PUBLISHED")
                  ? Plus
                  : change.action.includes("UPLOADED")
                    ? Upload
                    : Pencil;
              const catalogueChange =
                change.entityType === "CATALOG_PRODUCT" ||
                change.entityType === "PRODUCT_SKU";
              const canOpenCatalogue = [
                "SUPER_ADMIN",
                "ADMIN",
                "SALES_MANAGER",
                "CATALOG_MANAGER",
              ].includes(staffRole);
              const canOpenContent = [
                "SUPER_ADMIN",
                "ADMIN",
                "CONTENT_MANAGER",
              ].includes(staffRole);
              const canOpenSales = [
                "SUPER_ADMIN",
                "ADMIN",
                "SALES_MANAGER",
                "PROCUREMENT_HEAD",
                "DISPATCH_OFFICER",
                "ACCOUNTS_MANAGER",
              ].includes(staffRole);
              const canOpenBusiness = [
                "SUPER_ADMIN",
                "ADMIN",
                "PROCUREMENT_HEAD",
                "ACCOUNTS_MANAGER",
              ].includes(staffRole);
              const canOpenStaff = staffRole === "SUPER_ADMIN";
              const contentChange = [
                "MEDIA_ASSET",
                "WEBSITE_CONTENT",
                "WEBSITE_BRANDS",
                "BLOG_POST",
                "EXPERT_ADVISOR",
              ].includes(change.entityType);
              const salesChange = [
                "QUOTATION",
                "RFQ",
                "ORDER",
                "STAFF_ENQUIRY",
              ].includes(change.entityType);
              const businessChange = [
                "PROCUREMENT_REQUEST",
                "PURCHASE_ORDER",
                "SUPPLIER",
                "SUPPLIER_PRODUCT",
                "SUPPLIER_QUOTE",
                "BUSINESS_RULES",
                "DISCOUNT_RULE",
                "COMMISSION",
                "CUSTOMER_LOYALTY",
                "LOYALTY_SETTINGS",
              ].includes(change.entityType);
              return (
                <li className="recent-change-item" key={change.id}>
                  <span className="recent-change-icon">
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  <div className="recent-change-copy">
                    <strong>{change.title}</strong>
                    <span>
                      {change.actionLabel} · {change.entityLabel}
                      {change.changedFields.length
                        ? ` · ${change.changedFields.length} ${change.changedFields.length === 1 ? "detail" : "details"} updated`
                        : ""}
                    </span>
                    {change.changes.length > 0
                      ? change.changes.map((detail) => (
                          <small
                            key={`${detail.field}-${String(detail.before)}-${String(detail.after)}`}
                          >
                            {detail.field === "isActive"
                              ? "Account status"
                              : detail.field === "role"
                                ? "Role"
                                : detail.field.replace(/[._]/g, " ")}
                            : {recentChangeValue(detail.field, detail.before)} →{" "}
                            {recentChangeValue(detail.field, detail.after)}
                          </small>
                        ))
                      : change.changedFields.length > 0 && (
                          <small>
                            {change.changedFields
                              .slice(0, 4)
                              .map((field) => field.replace(/[._]/g, " "))
                              .join(" · ")}
                            {change.changedFields.length > 4
                              ? ` +${change.changedFields.length - 4}`
                              : ""}
                          </small>
                        )}
                  </div>
                  <div className="recent-change-meta">
                    <span>{change.staff?.name || "System"}</span>
                    <time dateTime={change.createdAt}>
                      {new Date(change.createdAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </time>
                    {catalogueChange && canOpenCatalogue ? (
                      <button
                        className="recent-change-open"
                        onClick={onOpenCatalogue}
                      >
                        Open catalogue
                      </button>
                    ) : contentChange && canOpenContent ? (
                      <button
                        className="recent-change-open"
                        onClick={onOpenContent}
                      >
                        Open website content
                      </button>
                    ) : salesChange && canOpenSales ? (
                      <button
                        className="recent-change-open"
                        onClick={onOpenSales}
                      >
                        Open sales workspace
                      </button>
                    ) : businessChange && canOpenBusiness ? (
                      <button
                        className="recent-change-open"
                        onClick={onOpenBusiness}
                      >
                        Open business management
                      </button>
                    ) : change.entityType === "STAFF_USER" && canOpenStaff ? (
                      <button
                        className="recent-change-open"
                        onClick={onOpenStaff}
                      >
                        Open staff &amp; roles
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="recent-changes-footer">
          <span>
            Showing {recentItems.length} of{" "}
            {recentChanges?.total ?? normalizedRecentItems.length} recorded
            changes from the past 7 days
            {(recentChanges?.total ?? normalizedRecentItems.length) >
            (recentChanges?.limit ?? 50)
              ? ` · latest ${recentChanges?.limit ?? 50}`
              : ""}
            .
          </span>
          {(staffRole === "SUPER_ADMIN" || staffRole === "ADMIN") && (
            <button className="recent-changes-link" onClick={onViewAudit}>
              <FileText size={15} aria-hidden="true" /> Open full audit log
            </button>
          )}
        </div>
      </section>
      <section className="panel-card panel-body">
        <h2>Today’s work</h2>
        <p>
          Review customer material lists and record enquiries received through
          WhatsApp, email or phone.
        </p>
        <div className="workspace-actions">
          <button className="btn-sm btn-primary" onClick={onViewCustomers}>
            View customers
          </button>
          <button className="btn-sm btn-secondary" onClick={onRecordEnquiry}>
            Record an enquiry
          </button>
        </div>
        <p className="muted">
          WhatsApp and email conversations are handled outside this workspace.
          Record each follow-up here when your team receives it.
        </p>
      </section>
    </>
  );
}

function recentCategoryForEntity(entityType: string) {
  if (
    [
      "CATALOG_PRODUCT",
      "PRODUCT_SKU",
      "MEDIA_ASSET",
      "WEBSITE_CONTENT",
      "WEBSITE_BRANDS",
      "BLOG_POST",
      "EXPERT_ADVISOR",
    ].includes(entityType)
  )
    return "Storefront";
  if (["QUOTATION", "RFQ", "ORDER", "STAFF_ENQUIRY"].includes(entityType))
    return "Sales";
  if (
    [
      "PROCUREMENT_REQUEST",
      "PURCHASE_ORDER",
      "SUPPLIER",
      "SUPPLIER_PRODUCT",
      "SUPPLIER_QUOTE",
    ].includes(entityType)
  )
    return "Procurement";
  return "Settings & team";
}

function recentEntityLabel(entityType: string) {
  const labels: Record<string, string> = {
    CATALOG_PRODUCT: "Catalogue product",
    PRODUCT_SKU: "Product variant",
    MEDIA_ASSET: "Storefront image",
    WEBSITE_CONTENT: "Website content",
    WEBSITE_BRANDS: "Brand directory",
    BLOG_POST: "Blog article",
    EXPERT_ADVISOR: "Expert or service listing",
    QUOTATION: "Quotation",
    RFQ: "Quote request",
    ORDER: "Order or delivery",
    PROCUREMENT_REQUEST: "Procurement request",
    PURCHASE_ORDER: "Purchase order",
    SUPPLIER: "Supplier",
    SUPPLIER_PRODUCT: "Supplier product",
    SUPPLIER_QUOTE: "Supplier quote",
    STAFF_ENQUIRY: "Customer enquiry",
    STAFF_USER: "Staff account",
    BUSINESS_RULES: "Business settings",
    DISCOUNT_RULE: "Discount rule",
    COMMISSION: "Commission settings",
    CUSTOMER_LOYALTY: "Customer loyalty account",
    LOYALTY_SETTINGS: "Loyalty settings",
  };
  return labels[entityType] || "Workspace settings";
}

function recentActionLabel(action: string) {
  const labels: Record<string, string> = {
    CREATED: "Added",
    RECEIVED: "Received",
    UPLOADED: "Uploaded",
    PUBLISHED: "Published",
    UPDATED: "Edited",
    EDITED: "Edited",
    SAVED: "Saved",
    ARCHIVED: "Archived",
    DELETED: "Removed",
    RESET: "Reset",
    ADVANCED: "Advanced",
    ADJUSTED: "Adjusted",
    COMPLETED: "Completed",
    CHANGED: "Changed",
  };
  const verb = action.match(
    /(?:^|_)(CREATED|RECEIVED|UPLOADED|PUBLISHED|UPDATED|EDITED|SAVED|ARCHIVED|DELETED|RESET|ADVANCED|ADJUSTED|COMPLETED|CHANGED)(?:_|$)/,
  )?.[1];
  return labels[verb || ""] || "Activity recorded";
}
