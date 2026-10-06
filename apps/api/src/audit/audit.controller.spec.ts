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

  it("shows the latest seven days across workspace activity with safe labels", async () => {
    findMany.mockResolvedValueOnce([
      {
        id: "activity-1",
        action: "MEDIA_ASSET_UPLOADED",
        entityType: "MEDIA_ASSET",
        entityId: "asset-1",
        metadata: { originalName: "photo.png", phone: "private" },
        createdAt: new Date("2026-10-06T08:00:00.000Z"),
        staff: { name: "Content editor", role: "CONTENT_MANAGER" },
      },
      {
        id: "activity-2",
        action: "QUOTATION_PUBLISHED",
        entityType: "QUOTATION",
        entityId: "quote-1",
        metadata: { customerName: "Private Customer", phone: "private" },
        createdAt: new Date("2026-10-05T08:00:00.000Z"),
        staff: null,
      },
      {
        id: "activity-3",
        action: "STAFF_ACCESS_UPDATED",
        entityType: "STAFF_USER",
        entityId: "staff-qa",
        metadata: {
          changedFields: ["role", "isActive"],
          phone: "private-phone",
          changes: [
            { field: "role", before: "CONTENT_MANAGER", after: "CATALOG_MANAGER" },
            { field: "isActive", before: false, after: true },
            { field: "password", before: "secret", after: "secret-new" },
          ],
        },
        createdAt: new Date("2026-10-06T09:00:00.000Z"),
        staff: { name: "Owner", role: "SUPER_ADMIN" },
      },
    ]);
    count.mockResolvedValueOnce(3);

    const result = await controller.recent({
      user: { userId: "admin-1", role: "ADMIN" },
    } as never);

    expect(result.total).toBe(3);
    expect(result.limit).toBe(50);
    expect(result.categories).toContain("Procurement");
    expect(
      result.items.map((item) => [item.title, item.category, item.actionLabel]),
    ).toEqual([
      ["photo.png", "Storefront", "Uploaded"],
      ["Quotation", "Sales", "Published"],
      ["Staff account", "Settings & team", "Access updated"],
    ]);
    expect(JSON.stringify(result)).not.toContain("private");
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(result.items[2].changes).toEqual([
      { field: "role", before: "CONTENT_MANAGER", after: "CATALOG_MANAGER" },
      { field: "isActive", before: false, after: true },
    ]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
        where: {
          createdAt: { gte: expect.any(Date) },
          entityType: {
            in: expect.arrayContaining(["MEDIA_ASSET", "QUOTATION"]),
          },
        },
      }),
    );
  });

  it("limits the recent activity feed to the signed-in staff member's workspace areas", async () => {
    findMany.mockResolvedValueOnce([]);
    count.mockResolvedValueOnce(0);

    const result = await controller.recent({
      user: { userId: "staff-1", role: "CONTENT_MANAGER" },
    } as never);

    expect(result.categories).toEqual(["Storefront"]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          createdAt: { gte: expect.any(Date) },
          entityType: {
            in: expect.arrayContaining(["MEDIA_ASSET", "BLOG_POST"]),
          },
        },
      }),
    );
  });

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
