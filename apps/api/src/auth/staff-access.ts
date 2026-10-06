import { ForbiddenException } from "@nestjs/common";

export const STAFF_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "SALES_MANAGER",
  "DISPATCH_OFFICER",
  "ACCOUNTS_MANAGER",
  "PROCUREMENT_HEAD",
  "CATALOG_MANAGER",
  "CONTENT_MANAGER",
] as const;

export type StaffRoleName = (typeof STAFF_ROLES)[number];
// Roles available for owner-managed staff accounts.
export const ASSIGNABLE_STAFF_ROLES = [
  "ADMIN",
  "SALES_MANAGER",
  "CATALOG_MANAGER",
  "CONTENT_MANAGER",
  "PROCUREMENT_HEAD",
  "DISPATCH_OFFICER",
  "ACCOUNTS_MANAGER",
] as const;
export type StaffPermission =
  | "audit.read"
  | "staff.profile"
  | "staff.manage"
  | "dashboard.view"
  | "customers.read"
  | "followups.manage"
  | "sales.manage"
  | "orders.read"
  | "dispatch.view"
  | "dispatch.manage"
  | "catalog.view"
  | "catalog.manage"
  | "procurement.view"
  | "procurement.manage"
  | "content.manage"
  | "finance.manage"
  | "media.manage"
  | "reports.sales.read"
  | "reports.procurement.read"
  | "reports.dispatch.read";

export const STAFF_ROLE_DEFINITIONS: {
  role: StaffRoleName;
  label: string;
  description: string;
  permissions: StaffPermission[];
}[] = [
  {
    role: "SUPER_ADMIN",
    label: "Owner / Main client",
    description:
      "Full access, including creating staff accounts and assigning roles.",
    permissions: [
      "audit.read",
      "staff.profile",
      "staff.manage",
      "dashboard.view",
      "customers.read",
      "followups.manage",
      "sales.manage",
      "orders.read",
      "dispatch.view",
      "dispatch.manage",
      "catalog.view",
      "catalog.manage",
      "procurement.view",
      "procurement.manage",
      "content.manage",
      "finance.manage",
      "media.manage",
      "reports.sales.read",
      "reports.procurement.read",
      "reports.dispatch.read",
    ],
  },
  {
    role: "ADMIN",
    label: "Administrator",
    description:
      "Manages customers, quotations, orders, procurement, logistics, content, and rewards. Staff account administration stays with the owner.",
    permissions: [
      "audit.read",
      "staff.profile",
      "dashboard.view",
      "customers.read",
      "followups.manage",
      "catalog.view",
      "catalog.manage",
      "content.manage",
      "sales.manage",
      "orders.read",
      "dispatch.view",
      "dispatch.manage",
      "procurement.view",
      "procurement.manage",
      "finance.manage",
      "media.manage",
      "reports.sales.read",
      "reports.procurement.read",
      "reports.dispatch.read",
    ],
  },
  {
    role: "SALES_MANAGER",
    label: "Sales & customer support",
    description:
      "Views customer contact records and records follow-ups for WhatsApp, email, and phone requests.",
    permissions: [
      "staff.profile",
      "dashboard.view",
      "customers.read",
      "followups.manage",
      "catalog.view",
      "sales.manage",
      "orders.read",
      "reports.sales.read",
    ],
  },
  {
    role: "CATALOG_MANAGER",
    label: "Catalogue & pricing manager",
    description:
      "Manages product details, approved images, prices, offers, and availability.",
    permissions: [
      "staff.profile",
      "dashboard.view",
      "catalog.view",
      "catalog.manage",
      "media.manage",
    ],
  },
  {
    role: "PROCUREMENT_HEAD",
    label: "Procurement & suppliers",
    description:
      "Manages suppliers, supplier quotes, procurement requests, and purchase orders.",
    permissions: [
      "staff.profile",
      "dashboard.view",
      "orders.read",
      "procurement.view",
      "procurement.manage",
      "reports.procurement.read",
    ],
  },
  {
    role: "DISPATCH_OFFICER",
    label: "Dispatch & transportation",
    description:
      "Views orders and manages delivery plans, dispatches, and challans.",
    permissions: [
      "staff.profile",
      "dashboard.view",
      "orders.read",
      "dispatch.view",
      "dispatch.manage",
      "reports.dispatch.read",
    ],
  },
  {
    role: "ACCOUNTS_MANAGER",
    label: "Accounts & finance",
    description:
      "Views orders and manages commission approvals and loyalty settings.",
    permissions: [
      "staff.profile",
      "dashboard.view",
      "orders.read",
      "finance.manage",
      "reports.sales.read",
    ],
  },
  {
    role: "CONTENT_MANAGER",
    label: "Website content manager",
    description:
      "Manages approved public page text and customer-facing business details.",
    permissions: [
      "staff.profile",
      "dashboard.view",
      "content.manage",
      "media.manage",
    ],
  },
];

export const ASSIGNABLE_STAFF_ROLE_DEFINITIONS = STAFF_ROLE_DEFINITIONS.filter(
  ({ role }) => (ASSIGNABLE_STAFF_ROLES as readonly string[]).includes(role),
);

const grants = new Map(
  STAFF_ROLE_DEFINITIONS.map(({ role, permissions }) => [
    role,
    new Set(permissions),
  ]),
);

export function roleHasPermission(
  role: string,
  permission: StaffPermission,
): boolean {
  return Boolean(grants.get(role as StaffRoleName)?.has(permission));
}

function routePermission(method: string, path: string): StaffPermission {
  const verb = method.toUpperCase();
  const route = path.replace(/^\/api(?=\/)/, "").replace(/\/$/, "") || "/";
  if (route === "/admin/notifications" && verb === "GET") return "audit.read";
  if (route === "/admin/audit/recent" && verb === "GET") return "dashboard.view";
  if (route === "/admin/audit" && verb === "GET") return "audit.read";
  if (route === "/auth/staff/me") return "staff.profile";
  if (route.startsWith("/admin/staff")) return "staff.manage";
  if (
    route === "/analytics/dashboard" ||
    route === "/analytics/overview" ||
    route === "/workspace/overview"
  )
    return "dashboard.view";
  if (
    route === "/workspace/customers" ||
    /^\/workspace\/customers\/[^/]+$/.test(route)
  )
    return "customers.read";
  if (route === "/workspace/followups") return "followups.manage";
  if (route.startsWith("/workspace/followups/")) return "followups.manage";
  if (
    route === "/rfqs" ||
    /^\/rfqs\/[^/]+\/status$/.test(route) ||
    route === "/inquiries"
  )
    return "sales.manage";
  if (route === "/quotes" || route.startsWith("/quotes/"))
    return "sales.manage";
  if (
    route === "/orders" ||
    /^\/orders\/[^/]+$/.test(route) ||
    /^\/orders\/[^/]+\/track$/.test(route)
  )
    return "orders.read";
  if (
    /^\/orders\/[^/]+\/(dispatch-challan|advance-dispatch|challan\/pdf)$/.test(
      route,
    )
  )
    return "dispatch.manage";
  if (route === "/products/inventory") return "catalog.view";
  if (
    route === "/products/catalogue" ||
    route.startsWith("/products/catalogue/")
  )
    return verb === "GET" ? "catalog.view" : "catalog.manage";
  if (/^\/products\/[^/]+\/price$/.test(route)) return "catalog.manage";
  if (route === "/storage/images" || route === "/storage/media")
    return "media.manage";
  if (
    route === "/suppliers" ||
    /^\/suppliers\/[^/]+(?:\/(?:products(?:\/[^/]+)?|ratings))?$/.test(route)
  )
    return verb === "GET" ? "procurement.view" : "procurement.manage";
  if (route === "/procurement" || route.startsWith("/procurement/"))
    return verb === "GET" ? "procurement.view" : "procurement.manage";
  if (route === "/purchase-orders" || route.startsWith("/purchase-orders/"))
    return verb === "GET" ? "procurement.view" : "procurement.manage";
  if (route === "/discount-rules" || /^\/discount-rules\/[^/]+$/.test(route))
    return "catalog.manage";
  if (route.startsWith("/admin/blogs") || route.startsWith("/admin/experts"))
    return "content.manage";
  if (route.startsWith("/admin/site-content")) return "content.manage";
  if (route === "/site-content") return "dashboard.view";
  if (route === "/transportation" || route.startsWith("/transportation/"))
    return verb === "GET" ? "dispatch.view" : "dispatch.manage";
  if (route === "/commissions" || /^\/commissions\/[^/]+\/approve$/.test(route))
    return "finance.manage";
  if (route.startsWith("/admin/loyalty")) return "finance.manage";
  if (verb === "GET" && route === "/reports/sales") return "reports.sales.read";
  if (verb === "GET" && route === "/reports/procurement")
    return "reports.procurement.read";
  if (verb === "GET" && route === "/reports/fulfillment")
    return "reports.dispatch.read";
  if (route === "/admin/business-rules" && (verb === "GET" || verb === "PUT"))
    return "sales.manage";
  // Fail closed: new staff-protected routes require an explicit role mapping.
  throw new ForbiddenException(
    "No staff role is authorized for this operation",
  );
}

export function assertStaffRoutePermission(
  method: string,
  rawUrl: string,
  role: string,
): void {
  const path = new URL(rawUrl, "http://material-square.local").pathname;
  const permission = routePermission(method, path);
  if (!roleHasPermission(role, permission))
    throw new ForbiddenException("Your staff role does not allow this action");
}
