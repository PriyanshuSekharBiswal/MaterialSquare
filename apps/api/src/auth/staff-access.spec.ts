import { ForbiddenException } from "@nestjs/common";
import {
  assertStaffRoutePermission,
  roleHasPermission,
  STAFF_ROLES,
} from "./staff-access";

describe("predefined staff access", () => {
  it("allows administrators to manage staff while restricting the action from other roles", () => {
    expect(roleHasPermission("SUPER_ADMIN", "staff.manage")).toBe(true);
    expect(roleHasPermission("ADMIN", "staff.manage")).toBe(true);
    expect(() =>
      assertStaffRoutePermission("POST", "/api/admin/staff", "ADMIN"),
    ).not.toThrow();
    expect(() =>
      assertStaffRoutePermission("POST", "/api/admin/staff", "SALES_MANAGER"),
    ).toThrow(ForbiddenException);
  });

  it("allows catalogue managers to maintain rates but not inspect customer accounts", () => {
    expect(() =>
      assertStaffRoutePermission(
        "PATCH",
        "/api/products/sku-1/price",
        "CATALOG_MANAGER",
      ),
    ).not.toThrow();
    expect(() =>
      assertStaffRoutePermission(
        "GET",
        "/api/workspace/customers",
        "CATALOG_MANAGER",
      ),
    ).toThrow(ForbiddenException);
  });

  it("allows catalogue roles to manage customer-facing products and rejects read-only sales staff", () => {
    expect(() =>
      assertStaffRoutePermission(
        "GET",
        "/api/products/catalogue",
        "SALES_MANAGER",
      ),
    ).not.toThrow();
    expect(() =>
      assertStaffRoutePermission(
        "POST",
        "/api/products/catalogue",
        "CATALOG_MANAGER",
      ),
    ).not.toThrow();
    expect(() =>
      assertStaffRoutePermission(
        "PATCH",
        "/api/products/catalogue/item-1",
        "ADMIN",
      ),
    ).not.toThrow();
    expect(() =>
      assertStaffRoutePermission(
        "DELETE",
        "/api/products/catalogue/item-1",
        "SALES_MANAGER",
      ),
    ).toThrow(ForbiddenException);
  });

  it("allows catalogue managers to update partner brands through the catalogue endpoint", () => {
    expect(() => assertStaffRoutePermission("GET", "/api/products/catalogue/partner-brands", "CATALOG_MANAGER")).not.toThrow();
    expect(() => assertStaffRoutePermission("PUT", "/api/products/catalogue/partner-brands", "CATALOG_MANAGER")).not.toThrow();
    expect(() => assertStaffRoutePermission("PUT", "/api/products/catalogue/partner-brands", "SALES_MANAGER")).toThrow(ForbiddenException);
  });

  it("grants operational roles only their own workflows", () => {
    expect(() =>
      assertStaffRoutePermission("GET", "/api/quotes", "SALES_MANAGER"),
    ).not.toThrow();
    expect(() =>
      assertStaffRoutePermission("GET", "/api/suppliers", "PROCUREMENT_HEAD"),
    ).not.toThrow();
    expect(() =>
      assertStaffRoutePermission(
        "POST",
        "/api/orders/id/dispatch-challan",
        "DISPATCH_OFFICER",
      ),
    ).not.toThrow();
    expect(() =>
      assertStaffRoutePermission("GET", "/api/quotes", "CONTENT_MANAGER"),
    ).toThrow(ForbiddenException);
    expect(() =>
      assertStaffRoutePermission("POST", "/api/procurement", "SALES_MANAGER"),
    ).toThrow(ForbiddenException);
  });

  it("rejects unmapped legacy order actions for every staff role including the owner", () => {
    for (const role of [
      "SUPER_ADMIN",
      "ADMIN",
      "ACCOUNTS_MANAGER",
      "SALES_MANAGER",
    ]) {
      expect(() =>
        assertStaffRoutePermission(
          "PATCH",
          "/api/orders/id/payment-confirmed",
          role,
        ),
      ).toThrow(ForbiddenException);
      expect(() =>
        assertStaffRoutePermission("POST", "/api/commissions/id/pay", role),
      ).toThrow(ForbiddenException);
    }
  });

  it("limits public website copy to administrators and the content manager", () => {
    for (const role of ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"])
      expect(() =>
        assertStaffRoutePermission("PUT", "/api/admin/site-content", role),
      ).not.toThrow();
    for (const role of ["SALES_MANAGER", "CATALOG_MANAGER"])
      expect(() =>
        assertStaffRoutePermission("PUT", "/api/admin/site-content", role),
      ).toThrow(ForbiddenException);
  });

  it("allows content and catalogue managers to upload images but rejects unrelated roles", () => {
    expect(() =>
      assertStaffRoutePermission(
        "POST",
        "/api/storage/images",
        "CATALOG_MANAGER",
      ),
    ).not.toThrow();
    expect(() =>
      assertStaffRoutePermission(
        "POST",
        "/api/storage/images",
        "CONTENT_MANAGER",
      ),
    ).not.toThrow();
    expect(() =>
      assertStaffRoutePermission(
        "POST",
        "/api/storage/images",
        "SALES_MANAGER",
      ),
    ).toThrow(ForbiddenException);
  });

  it("limits centralized quotation rules to sales and administrative roles", () => {
    for (const role of ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"])
      expect(() =>
        assertStaffRoutePermission("PUT", "/api/admin/business-rules", role),
      ).not.toThrow();
    for (const role of [
      "CONTENT_MANAGER",
      "CATALOG_MANAGER",
      "ACCOUNTS_MANAGER",
    ])
      expect(() =>
        assertStaffRoutePermission("PUT", "/api/admin/business-rules", role),
      ).toThrow(ForbiddenException);
    expect(() =>
      assertStaffRoutePermission(
        "POST",
        "/api/admin/business-rules",
        "SALES_MANAGER",
      ),
    ).toThrow(ForbiddenException);
  });

  it("gives each operational report only to the roles responsible for that area", () => {
    for (const role of [
      "SUPER_ADMIN",
      "ADMIN",
      "SALES_MANAGER",
      "ACCOUNTS_MANAGER",
    ])
      expect(() =>
        assertStaffRoutePermission(
          "GET",
          "/api/reports/sales?from=2026-10-01",
          role,
        ),
      ).not.toThrow();
    for (const role of ["PROCUREMENT_HEAD", "SUPER_ADMIN", "ADMIN"])
      expect(() =>
        assertStaffRoutePermission("GET", "/api/reports/procurement", role),
      ).not.toThrow();
    for (const role of ["DISPATCH_OFFICER", "SUPER_ADMIN", "ADMIN"])
      expect(() =>
        assertStaffRoutePermission("GET", "/api/reports/fulfillment", role),
      ).not.toThrow();
    expect(() =>
      assertStaffRoutePermission(
        "GET",
        "/api/reports/procurement",
        "CONTENT_MANAGER",
      ),
    ).toThrow(ForbiddenException);
  });

  it("fails closed when a new staff route has no permission mapping", () => {
    expect(() =>
      assertStaffRoutePermission("DELETE", "/api/unmapped", "SUPER_ADMIN"),
    ).toThrow(ForbiddenException);
  });
  it("allows procurement staff to maintain supplier products and ratings", () => {
    for (const path of [
      "/api/suppliers/id/products",
      "/api/suppliers/id/products/product",
      "/api/suppliers/id/ratings",
    ]) {
      expect(() =>
        assertStaffRoutePermission("POST", path, "PROCUREMENT_HEAD"),
      ).not.toThrow();
      expect(() =>
        assertStaffRoutePermission("POST", path, "SALES_MANAGER"),
      ).toThrow(ForbiddenException);
      expect(() =>
        assertStaffRoutePermission("POST", path, "CONTENT_MANAGER"),
      ).toThrow(ForbiddenException);
    }
  });
});

describe("V1 staff action permission matrix", () => {
  const actions: Array<{
    action: string;
    method: string;
    path: string;
    allowed: readonly (typeof STAFF_ROLES)[number][];
  }> = [
    {
      action: "audit review",
      method: "GET",
      path: "/api/admin/audit",
      allowed: ["SUPER_ADMIN", "ADMIN"],
    },
    {
      action: "notification status review",
      method: "GET",
      path: "/api/admin/notifications",
      allowed: ["SUPER_ADMIN", "ADMIN"],
    },
    {
      action: "staff profile",
      method: "GET",
      path: "/api/auth/staff/me",
      allowed: STAFF_ROLES,
    },
    {
      action: "staff account administration",
      method: "POST",
      path: "/api/admin/staff",
      allowed: ["SUPER_ADMIN", "ADMIN"],
    },
    {
      action: "customer records and sales requests",
      method: "GET",
      path: "/api/workspace/customers",
      allowed: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"],
    },
    {
      action: "quotation follow-ups",
      method: "POST",
      path: "/api/workspace/followups",
      allowed: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"],
    },
    {
      action: "quotation margin changes",
      method: "PATCH",
      path: "/api/quotes/quote-1/margin",
      allowed: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"],
    },
    {
      action: "quotation publication",
      method: "POST",
      path: "/api/quotes/quote-1/publish",
      allowed: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"],
    },
    {
      action: "customer acceptance received by staff",
      method: "POST",
      path: "/api/quotes/quote-1/acceptance",
      allowed: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"],
    },
    {
      action: "order review",
      method: "GET",
      path: "/api/orders",
      allowed: [
        "SUPER_ADMIN",
        "ADMIN",
        "SALES_MANAGER",
        "DISPATCH_OFFICER",
        "ACCOUNTS_MANAGER",
        "PROCUREMENT_HEAD",
      ],
    },
    {
      action: "dispatch planning",
      method: "PUT",
      path: "/api/transportation/order-1",
      allowed: ["SUPER_ADMIN", "ADMIN", "DISPATCH_OFFICER"],
    },
    {
      action: "catalogue review",
      method: "GET",
      path: "/api/products/catalogue",
      allowed: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "CATALOG_MANAGER"],
    },
    {
      action: "catalogue maintenance",
      method: "PATCH",
      path: "/api/products/catalogue/product-1",
      allowed: ["SUPER_ADMIN", "ADMIN", "CATALOG_MANAGER"],
    },
    {
      action: "SKU price maintenance",
      method: "PATCH",
      path: "/api/products/sku-1/price",
      allowed: ["SUPER_ADMIN", "ADMIN", "CATALOG_MANAGER"],
    },
    {
      action: "media upload",
      method: "POST",
      path: "/api/storage/images",
      allowed: ["SUPER_ADMIN", "ADMIN", "CATALOG_MANAGER", "CONTENT_MANAGER"],
    },
    {
      action: "supplier and procurement maintenance",
      method: "POST",
      path: "/api/procurement/request-1/quotes",
      allowed: ["SUPER_ADMIN", "ADMIN", "PROCUREMENT_HEAD"],
    },
    {
      action: "purchase order creation",
      method: "POST",
      path: "/api/purchase-orders",
      allowed: ["SUPER_ADMIN", "ADMIN", "PROCUREMENT_HEAD"],
    },
    {
      action: "public article management",
      method: "POST",
      path: "/api/admin/blogs",
      allowed: ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"],
    },
    {
      action: "expert directory management",
      method: "PATCH",
      path: "/api/admin/experts/expert-1",
      allowed: ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"],
    },
    {
      action: "website draft and publishing",
      method: "PUT",
      path: "/api/admin/site-content/draft",
      allowed: ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"],
    },
    {
      action: "commission review",
      method: "POST",
      path: "/api/commissions",
      allowed: ["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"],
    },
    {
      action: "loyalty policy management",
      method: "PUT",
      path: "/api/admin/loyalty/settings",
      allowed: ["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"],
    },
    {
      action: "quotation notification rules",
      method: "PUT",
      path: "/api/admin/business-rules",
      allowed: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"],
    },
    {
      action: "sales reports",
      method: "GET",
      path: "/api/reports/sales",
      allowed: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "ACCOUNTS_MANAGER"],
    },
    {
      action: "procurement reports",
      method: "GET",
      path: "/api/reports/procurement",
      allowed: ["SUPER_ADMIN", "ADMIN", "PROCUREMENT_HEAD"],
    },
    {
      action: "fulfillment reports",
      method: "GET",
      path: "/api/reports/fulfillment",
      allowed: ["SUPER_ADMIN", "ADMIN", "DISPATCH_OFFICER"],
    },
    {
      action: "workspace overview",
      method: "GET",
      path: "/api/workspace/overview",
      allowed: STAFF_ROLES,
    },
    {
      action: "sales analytics dashboard",
      method: "GET",
      path: "/api/analytics/dashboard",
      allowed: STAFF_ROLES,
    },
    {
      action: "website analytics overview",
      method: "GET",
      path: "/api/analytics/overview",
      allowed: STAFF_ROLES,
    },
    {
      action: "staff role definitions",
      method: "GET",
      path: "/api/admin/staff/roles",
      allowed: ["SUPER_ADMIN", "ADMIN"],
    },
    {
      action: "staff account listing",
      method: "GET",
      path: "/api/admin/staff",
      allowed: ["SUPER_ADMIN", "ADMIN"],
    },
    {
      action: "staff access changes",
      method: "PATCH",
      path: "/api/admin/staff/staff-1",
      allowed: ["SUPER_ADMIN", "ADMIN"],
    },
    {
      action: "staff password resets",
      method: "POST",
      path: "/api/admin/staff/staff-1/password",
      allowed: ["SUPER_ADMIN", "ADMIN"],
    },
    {
      action: "customer follow-up review",
      method: "GET",
      path: "/api/workspace/followups",
      allowed: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"],
    },
    {
      action: "customer account detail review",
      method: "GET",
      path: "/api/workspace/customers/customer-1",
      allowed: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"],
    },
    {
      action: "customer account listing",
      method: "GET",
      path: "/api/workspace/customers",
      allowed: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"],
    },
    {
      action: "customer follow-up updates",
      method: "PUT",
      path: "/api/workspace/followups/followup-1",
      allowed: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"],
    },
    {
      action: "RFQ status changes",
      method: "PATCH",
      path: "/api/rfqs/rfq-1/status",
      allowed: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"],
    },
    {
      action: "RFQ inbox review",
      method: "GET",
      path: "/api/rfqs",
      allowed: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"],
    },
    {
      action: "contact enquiry review",
      method: "GET",
      path: "/api/inquiries",
      allowed: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"],
    },
    {
      action: "quotation inbox review",
      method: "GET",
      path: "/api/quotes",
      allowed: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"],
    },
    {
      action: "quotation PDF generation",
      method: "GET",
      path: "/api/quotes/quote-1/pdf",
      allowed: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"],
    },
    {
      action: "quotation record review",
      method: "GET",
      path: "/api/quotes/quote-1",
      allowed: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"],
    },
    {
      action: "quotation creation",
      method: "POST",
      path: "/api/quotes",
      allowed: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"],
    },
    {
      action: "quotation draft edits and revisions",
      method: "PATCH",
      path: "/api/quotes/quote-1",
      allowed: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"],
    },
    {
      action: "quotation revision creation",
      method: "POST",
      path: "/api/quotes/quote-1/revisions",
      allowed: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"],
    },
    {
      action: "quotation follow-up scheduling",
      method: "POST",
      path: "/api/quotes/quote-1/followups",
      allowed: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"],
    },
    {
      action: "quotation reminder history review",
      method: "GET",
      path: "/api/quotes/quote-1/followups",
      allowed: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"],
    },
    {
      action: "order detail and tracking review",
      method: "GET",
      path: "/api/orders/order-1/track",
      allowed: [
        "SUPER_ADMIN",
        "ADMIN",
        "SALES_MANAGER",
        "DISPATCH_OFFICER",
        "ACCOUNTS_MANAGER",
        "PROCUREMENT_HEAD",
      ],
    },
    {
      action: "order record review",
      method: "GET",
      path: "/api/orders/order-1",
      allowed: [
        "SUPER_ADMIN",
        "ADMIN",
        "SALES_MANAGER",
        "DISPATCH_OFFICER",
        "ACCOUNTS_MANAGER",
        "PROCUREMENT_HEAD",
      ],
    },
    {
      action: "dispatch advancement",
      method: "PATCH",
      path: "/api/orders/order-1/advance-dispatch",
      allowed: ["SUPER_ADMIN", "ADMIN", "DISPATCH_OFFICER"],
    },
    {
      action: "dispatch challan creation",
      method: "POST",
      path: "/api/orders/order-1/dispatch-challan",
      allowed: ["SUPER_ADMIN", "ADMIN", "DISPATCH_OFFICER"],
    },
    {
      action: "dispatch challan PDF download",
      method: "GET",
      path: "/api/orders/order-1/challan/pdf",
      allowed: ["SUPER_ADMIN", "ADMIN", "DISPATCH_OFFICER"],
    },
    {
      action: "delivery receipt entry",
      method: "POST",
      path: "/api/transportation/order-1/deliveries",
      allowed: ["SUPER_ADMIN", "ADMIN", "DISPATCH_OFFICER"],
    },
    {
      action: "transportation plan review",
      method: "GET",
      path: "/api/transportation",
      allowed: ["SUPER_ADMIN", "ADMIN", "DISPATCH_OFFICER"],
    },
    {
      action: "catalogue inventory view",
      method: "GET",
      path: "/api/products/inventory",
      allowed: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "CATALOG_MANAGER"],
    },
    {
      action: "catalogue product creation",
      method: "POST",
      path: "/api/products/catalogue",
      allowed: ["SUPER_ADMIN", "ADMIN", "CATALOG_MANAGER"],
    },
    {
      action: "catalogue product archival",
      method: "DELETE",
      path: "/api/products/catalogue/product-1",
      allowed: ["SUPER_ADMIN", "ADMIN", "CATALOG_MANAGER"],
    },
    {
      action: "media library review",
      method: "GET",
      path: "/api/storage/media",
      allowed: ["SUPER_ADMIN", "ADMIN", "CATALOG_MANAGER", "CONTENT_MANAGER"],
    },
    {
      action: "supplier and service-area review",
      method: "GET",
      path: "/api/suppliers/supplier-1",
      allowed: ["SUPER_ADMIN", "ADMIN", "PROCUREMENT_HEAD"],
    },
    {
      action: "supplier listing and registration",
      method: "POST",
      path: "/api/suppliers",
      allowed: ["SUPER_ADMIN", "ADMIN", "PROCUREMENT_HEAD"],
    },
    {
      action: "supplier detail and status updates",
      method: "PATCH",
      path: "/api/suppliers/supplier-1",
      allowed: ["SUPER_ADMIN", "ADMIN", "PROCUREMENT_HEAD"],
    },
    {
      action: "supplier product coverage updates",
      method: "PATCH",
      path: "/api/suppliers/supplier-1/products/product-1",
      allowed: ["SUPER_ADMIN", "ADMIN", "PROCUREMENT_HEAD"],
    },
    {
      action: "supplier product coverage creation",
      method: "POST",
      path: "/api/suppliers/supplier-1/products",
      allowed: ["SUPER_ADMIN", "ADMIN", "PROCUREMENT_HEAD"],
    },
    {
      action: "supplier rating entry",
      method: "POST",
      path: "/api/suppliers/supplier-1/ratings",
      allowed: ["SUPER_ADMIN", "ADMIN", "PROCUREMENT_HEAD"],
    },
    {
      action: "procurement supplier matching",
      method: "GET",
      path: "/api/procurement/request-1/suppliers",
      allowed: ["SUPER_ADMIN", "ADMIN", "PROCUREMENT_HEAD"],
    },
    {
      action: "procurement request intake",
      method: "POST",
      path: "/api/procurement",
      allowed: ["SUPER_ADMIN", "ADMIN", "PROCUREMENT_HEAD"],
    },
    {
      action: "procurement request listing",
      method: "GET",
      path: "/api/procurement",
      allowed: ["SUPER_ADMIN", "ADMIN", "PROCUREMENT_HEAD"],
    },
    {
      action: "purchase order review and document download",
      method: "GET",
      path: "/api/purchase-orders/order-1/pdf",
      allowed: ["SUPER_ADMIN", "ADMIN", "PROCUREMENT_HEAD"],
    },
    {
      action: "purchase order listing",
      method: "GET",
      path: "/api/purchase-orders",
      allowed: ["SUPER_ADMIN", "ADMIN", "PROCUREMENT_HEAD"],
    },
    {
      action: "purchase order approval and dispatch to supplier",
      method: "POST",
      path: "/api/purchase-orders/order-1/approve",
      allowed: ["SUPER_ADMIN", "ADMIN", "PROCUREMENT_HEAD"],
    },
    {
      action: "purchase order send to supplier",
      method: "POST",
      path: "/api/purchase-orders/order-1/send",
      allowed: ["SUPER_ADMIN", "ADMIN", "PROCUREMENT_HEAD"],
    },
    {
      action: "purchase order revision",
      method: "POST",
      path: "/api/purchase-orders/order-1/revisions",
      allowed: ["SUPER_ADMIN", "ADMIN", "PROCUREMENT_HEAD"],
    },
    {
      action: "quantity discount management",
      method: "PATCH",
      path: "/api/discount-rules/rule-1",
      allowed: ["SUPER_ADMIN", "ADMIN", "CATALOG_MANAGER"],
    },
    {
      action: "quantity discount rule creation",
      method: "POST",
      path: "/api/discount-rules",
      allowed: ["SUPER_ADMIN", "ADMIN", "CATALOG_MANAGER"],
    },
    {
      action: "quantity discount rule listing",
      method: "GET",
      path: "/api/discount-rules",
      allowed: ["SUPER_ADMIN", "ADMIN", "CATALOG_MANAGER"],
    },
    {
      action: "article archival",
      method: "DELETE",
      path: "/api/admin/blogs/article-1",
      allowed: ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"],
    },
    {
      action: "article listing and edits",
      method: "PATCH",
      path: "/api/admin/blogs/article-1",
      allowed: ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"],
    },
    {
      action: "article listing",
      method: "GET",
      path: "/api/admin/blogs",
      allowed: ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"],
    },
    {
      action: "expert directory listing",
      method: "GET",
      path: "/api/admin/experts",
      allowed: ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"],
    },
    {
      action: "expert directory entry creation",
      method: "POST",
      path: "/api/admin/experts",
      allowed: ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"],
    },
    {
      action: "website draft review and publication",
      method: "GET",
      path: "/api/admin/site-content/draft",
      allowed: ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"],
    },
    {
      action: "website content publication",
      method: "POST",
      path: "/api/admin/site-content/publish",
      allowed: ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"],
    },
    {
      action: "published website content read",
      method: "GET",
      path: "/api/admin/site-content",
      allowed: ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"],
    },
    {
      action: "published website content update",
      method: "PUT",
      path: "/api/admin/site-content",
      allowed: ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"],
    },
    {
      action: "commission approval",
      method: "POST",
      path: "/api/commissions/commission-1/approve",
      allowed: ["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"],
    },
    {
      action: "commission record review",
      method: "GET",
      path: "/api/commissions",
      allowed: ["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"],
    },
    {
      action: "customer loyalty point adjustment",
      method: "POST",
      path: "/api/admin/loyalty/customers/customer-1/adjust",
      allowed: ["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"],
    },
    {
      action: "loyalty settings review",
      method: "GET",
      path: "/api/admin/loyalty/settings",
      allowed: ["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"],
    },
    {
      action: "quotation notification rule review",
      method: "GET",
      path: "/api/admin/business-rules",
      allowed: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"],
    },
    {
      action: "quotation reminder outcome updates",
      method: "PATCH",
      path: "/api/quotes/quote-1/followups/followup-1",
      allowed: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"],
    },
  ];

  it.each(actions)("$action follows the V1 role assignment", (action) => {
    for (const role of STAFF_ROLES) {
      const authorized = action.allowed.includes(role);
      if (authorized) {
        expect(() =>
          assertStaffRoutePermission(action.method, action.path, role),
        ).not.toThrow();
      } else {
        expect(() =>
          assertStaffRoutePermission(action.method, action.path, role),
        ).toThrow(ForbiddenException);
      }
    }
  });
});
