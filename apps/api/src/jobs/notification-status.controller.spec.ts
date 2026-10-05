import { ForbiddenException } from "@nestjs/common";
import { NotificationStatusController } from "./notification-status.controller";
import { assertStaffRoutePermission } from "../auth/staff-access";

describe("notification status review", () => {
  const findMany = jest.fn();
  const db = { notificationOutbox: { findMany, count: jest.fn().mockResolvedValue(5) }, $transaction: (queries: Promise<unknown>[]) => Promise.all(queries) };
  const controller = new NotificationStatusController(db as never);
  it("returns explicit outcomes without selecting message payloads", async () => {
    const blank = { queuedAt: null, deliveredAt: null, skippedAt: null, failedAt: null };
    findMany.mockResolvedValue([blank, { ...blank, queuedAt: new Date() }, { ...blank, deliveredAt: new Date() }, { ...blank, failedAt: new Date() }, { ...blank, skippedAt: new Date() }]);
    const result = await controller.list({ page: "2" });
    expect(result.items.map(item => item.status)).toEqual(["PENDING", "QUEUED", "DELIVERED", "FAILED", "SKIPPED"]);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 25, take: 25 }));
    expect(findMany.mock.calls[0][0].select.payload).toBeUndefined();
  });
  it.each(["ADMIN", "SUPER_ADMIN"])("permits %s read access only", role => {
    expect(() => assertStaffRoutePermission("GET", "/api/admin/notifications", role)).not.toThrow();
    expect(() => assertStaffRoutePermission("POST", "/api/admin/notifications", role)).toThrow(ForbiddenException);
  });
  it("denies operational-role access", () => {
    expect(() => assertStaffRoutePermission("GET", "/api/admin/notifications", "SALES_MANAGER")).toThrow(ForbiddenException);
  });
  it("filters failures without counting skipped or delivered jobs", async () => {
    findMany.mockResolvedValue([]);
    await controller.list({ status: "FAILED", type: "quote-expiry-reminder" });
    expect(findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { skippedAt: null, deliveredAt: null, failedAt: { not: null }, type: "quote-expiry-reminder" } }));
    expect(db.notificationOutbox.count).toHaveBeenLastCalledWith({ where: { skippedAt: null, deliveredAt: null, failedAt: { not: null }, type: "quote-expiry-reminder" } });
  });

});
