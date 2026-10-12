import { PurchaseOrdersController } from "./purchase-orders.controller";

describe("purchase order approval", () => {
  it("moves the procurement request to approved once all its purchase orders are approved", async () => {
    const purchaseOrder = {
      id: "po-1",
      requestId: "request-1",
      status: "DRAFT",
      updatedAt: new Date("2026-10-11T12:00:00.000Z"),
      purchaseOrderNumber: "MS-PO-2026-a0aa-b0ebbg-c0b-0a",
      revisionNumber: 1,
    };
    const requestUpdate = jest.fn();
    const tx = {
      purchaseOrder: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([{ status: "APPROVED" }]),
        findUnique: jest.fn().mockResolvedValue({ ...purchaseOrder, status: "APPROVED" }),
      },
      procurementRequest: { update: requestUpdate },
      auditLog: { create: jest.fn() },
    };
    const prisma = {
      purchaseOrder: {
        findUnique: jest.fn().mockResolvedValue(purchaseOrder),
      },
      $transaction: jest.fn(async (work: (db: typeof tx) => unknown) => work(tx)),
    } as never;
    const controller = new PurchaseOrdersController(prisma, {} as never);

    await controller.approve("po-1", {
      user: { userId: "staff-1", role: "SUPER_ADMIN" },
    } as never);

    expect(requestUpdate).toHaveBeenCalledWith({
      where: { id: "request-1" },
      data: { status: "APPROVED" },
    });
    expect(tx.purchaseOrder.updateMany).toHaveBeenCalledWith({
      where: {
        id: "po-1",
        updatedAt: purchaseOrder.updatedAt,
        status: { in: ["PENDING_APPROVAL", "DRAFT"] },
      },
      data: expect.objectContaining({
        status: "APPROVED",
        approvedById: "staff-1",
      }),
    });
  });

  it("keeps the request awaiting approval while another purchase order remains unapproved", async () => {
    const purchaseOrder = {
      id: "po-1",
      requestId: "request-1",
      status: "DRAFT",
      updatedAt: new Date("2026-10-11T12:00:00.000Z"),
      purchaseOrderNumber: "MS-PO-2026-a0aa-b0ebbg-c0b-0a",
      revisionNumber: 1,
    };
    const requestUpdate = jest.fn();
    const tx = {
      purchaseOrder: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest
          .fn()
          .mockResolvedValue([{ status: "APPROVED" }, { status: "DRAFT" }]),
        findUnique: jest.fn().mockResolvedValue({ ...purchaseOrder, status: "APPROVED" }),
      },
      procurementRequest: { update: requestUpdate },
      auditLog: { create: jest.fn() },
    };
    const prisma = {
      purchaseOrder: {
        findUnique: jest.fn().mockResolvedValue(purchaseOrder),
      },
      $transaction: jest.fn(async (work: (db: typeof tx) => unknown) => work(tx)),
    } as never;
    const controller = new PurchaseOrdersController(prisma, {} as never);

    await controller.approve("po-1", {
      user: { userId: "staff-1", role: "SUPER_ADMIN" },
    } as never);

    expect(requestUpdate).not.toHaveBeenCalled();
  });
});
