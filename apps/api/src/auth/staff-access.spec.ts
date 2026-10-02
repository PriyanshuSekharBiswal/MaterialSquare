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

  it("fails closed when a new staff route has no permission mapping", () => {
    expect(() => assertStaffRoutePermission("DELETE", "/api/unmapped", "SUPER_ADMIN"))
      .toThrow(ForbiddenException);
  });
});
