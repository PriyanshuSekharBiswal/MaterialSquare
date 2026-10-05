import { RfqsController } from "./rfqs.module";

const requestId = "a410d118-1435-4c70-abeb-877ee40fa000";

describe("staff request status audit history", () => {
  it("records status changes with the staff actor in the same transaction", async () => {
    const auditLog = { create: jest.fn().mockResolvedValue({}) };
    const rfq = { updateMany: jest.fn().mockResolvedValue({ count: 1 }) };
    const tx = { auditLog, rfq };
    const prisma = { $transaction: jest.fn(async (work) => work(tx)) };
    const controller = new RfqsController(prisma as never);

    await expect(
      controller.updateStatus(
        { user: { userId: "staff-1", role: "SALES_MANAGER" } } as never,
        requestId,
        { status: "CONTACTED" },
      ),
    ).resolves.toEqual({ id: requestId, status: "CONTACTED" });

    expect(auditLog.create).toHaveBeenCalledWith({
      data: {
        staffId: "staff-1",
        action: "RFQ_STATUS_UPDATED",
        entityType: "RFQ",
        entityId: requestId,
        metadata: { fields: ["status"], status: "CONTACTED" },
      },
    });
  });

  it("does not audit a missing request", async () => {
    const auditLog = { create: jest.fn() };
    const tx = {
      auditLog,
      rfq: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    const prisma = { $transaction: jest.fn(async (work) => work(tx)) };
    const controller = new RfqsController(prisma as never);

    await expect(
      controller.updateStatus(
        { user: { userId: "staff-1", role: "SALES_MANAGER" } } as never,
        requestId,
        { status: "CLOSED" },
      ),
    ).rejects.toThrow("Request not found");
    expect(auditLog.create).not.toHaveBeenCalled();
  });
});
