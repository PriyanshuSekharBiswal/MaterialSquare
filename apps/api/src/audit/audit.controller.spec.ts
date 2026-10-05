import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { AuditController } from "./audit.controller";
import { assertStaffRoutePermission } from "../auth/staff-access";

describe("audit review", () => {
  const findMany = jest.fn().mockResolvedValue([]);
  const count = jest.fn().mockResolvedValue(0);
  const db = {
    auditLog: { findMany, count },
    $transaction: (queries: Promise<unknown>[]) => Promise.all(queries),
  };
  const controller = new AuditController(db as never);
  beforeEach(() => jest.clearAllMocks());

  it("paginates and applies exact filters without returning staff secrets", async () => {
    await expect(
      controller.list({
        page: "2",
        action: "QUOTATION_PUBLISHED",
        entityType: "QUOTATION",
        entityId: "q1",
      }),
    ).resolves.toEqual({ items: [], total: 0, page: 2, pageSize: 25 });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 25,
        take: 25,
        where: {
          action: "QUOTATION_PUBLISHED",
          entityType: "QUOTATION",
          entityId: "q1",
        },
        select: expect.objectContaining({
          staff: { select: { id: true, name: true, role: true } },
        }),
      }),
    );
  });
  it.each(["0", "-1", "1.5", "invalid", "100001"])(
    "rejects invalid page %s",
    async (page) => {
      await expect(controller.list({ page })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(findMany).not.toHaveBeenCalled();
    },
  );
  it.each(["SUPER_ADMIN", "ADMIN"])("allows %s to read records", (role) => {
    expect(() =>
      assertStaffRoutePermission("GET", "/api/admin/audit?page=1", role),
    ).not.toThrow();
    expect(() =>
      assertStaffRoutePermission("POST", "/api/admin/audit", role),
    ).toThrow(ForbiddenException);
  });
  it.each([
    "SALES_MANAGER",
    "CATALOG_MANAGER",
    "CONTENT_MANAGER",
    "PROCUREMENT_HEAD",
    "DISPATCH_OFFICER",
    "ACCOUNTS_MANAGER",
  ])("rejects audit access for %s", (role) => {
    expect(() =>
      assertStaffRoutePermission("GET", "/api/admin/audit", role),
    ).toThrow(ForbiddenException);
  });
  it("uses inclusive Indian calendar dates with an exclusive next-day bound", async () => {
    await controller.list({ from: "2026-10-04", to: "2026-10-04" });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          createdAt: {
            gte: new Date("2026-10-03T18:30:00Z"),
            lt: new Date("2026-10-04T18:30:00Z"),
          },
        },
      }),
    );
  });
  it("rejects reversed date ranges", async () => {
    await expect(
      controller.list({ from: "2026-10-05", to: "2026-10-04" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(findMany).not.toHaveBeenCalled();
  });
});
