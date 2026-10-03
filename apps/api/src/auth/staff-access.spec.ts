import { ForbiddenException } from "@nestjs/common";
import { assertStaffRoutePermission, roleHasPermission } from "./staff-access";

describe("predefined staff access", () => {
  it("restricts staff administration to the main owner", () => {
    expect(roleHasPermission("SUPER_ADMIN", "staff.manage")).toBe(true);
    expect(roleHasPermission("ADMIN", "staff.manage")).toBe(false);
    expect(() => assertStaffRoutePermission("POST", "/api/admin/staff", "SALES_MANAGER"))
      .toThrow(ForbiddenException);
  });

  it("allows catalogue managers to maintain rates but not inspect customer accounts", () => {
    expect(() => assertStaffRoutePermission("PATCH", "/api/products/sku-1/price", "CATALOG_MANAGER"))
      .not.toThrow();
    expect(() => assertStaffRoutePermission("GET", "/api/workspace/customers", "CATALOG_MANAGER"))
      .toThrow(ForbiddenException);
  });

  it("allows catalogue roles to manage customer-facing products and rejects read-only sales staff", () => {
    expect(() => assertStaffRoutePermission("GET", "/api/products/catalogue", "SALES_MANAGER"))
      .not.toThrow();
    expect(() => assertStaffRoutePermission("POST", "/api/products/catalogue", "CATALOG_MANAGER"))
      .not.toThrow();
    expect(() => assertStaffRoutePermission("PATCH", "/api/products/catalogue/item-1", "ADMIN"))
      .not.toThrow();
    expect(() => assertStaffRoutePermission("DELETE", "/api/products/catalogue/item-1", "SALES_MANAGER"))
      .toThrow(ForbiddenException);
  });

  it("keeps unshipped quotation, order, and procurement APIs out of V1 staff roles", () => {
    for (const role of ["ADMIN", "SALES_MANAGER", "CATALOG_MANAGER", "CONTENT_MANAGER"]) {
      expect(() => assertStaffRoutePermission("GET", "/api/quotes", role))
        .toThrow(ForbiddenException);
      expect(() => assertStaffRoutePermission("GET", "/api/orders", role))
        .toThrow(ForbiddenException);
      expect(() => assertStaffRoutePermission("GET", "/api/suppliers", role))
        .toThrow(ForbiddenException);
    }
    expect(() => assertStaffRoutePermission("GET", "/api/quotes", "SUPER_ADMIN"))
      .not.toThrow();
  });

  it("limits public website copy to administrators and the content manager", () => {
    for (const role of ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"])
      expect(() => assertStaffRoutePermission("PUT", "/api/admin/site-content", role)).not.toThrow();
    for (const role of ["SALES_MANAGER", "CATALOG_MANAGER"])
      expect(() => assertStaffRoutePermission("PUT", "/api/admin/site-content", role)).toThrow(ForbiddenException);
  });

  it("allows catalogue managers to upload product images but rejects unrelated roles", () => {
    expect(() => assertStaffRoutePermission("POST", "/api/storage/images", "CATALOG_MANAGER"))
      .not.toThrow();
    expect(() => assertStaffRoutePermission("POST", "/api/storage/images", "CONTENT_MANAGER"))
      .toThrow(ForbiddenException);
  });

  it("fails closed when a new staff route has no permission mapping", () => {
    expect(() => assertStaffRoutePermission("DELETE", "/api/unmapped", "SUPER_ADMIN"))
      .toThrow(ForbiddenException);
  });
});
