import { ConflictException } from "@nestjs/common";
import { RfqsController } from "./rfqs.module";

const customerId = "customer-owner";
const requestId = "a410d118-1435-4c70-abeb-877ee40fa000";
const input = {
  requestId,
  customerName: "Site Customer",
  customerPhone: "8000000000",
  siteLocation: "Plot 42, Noida, 201301",
  notes: "",
  items: [
    {
      material: "CPVC pipe",
      brand: "Astral",
      specification: "3/4 inch",
      quantity: 20,
      unit: "Pieces",
    },
  ],
};

describe("website quotation requests", () => {
  it("uses the signed-in customer's verified phone and retries without creating duplicates", async () => {
    let record: any;
    const tx = {
      customer: {
        update: jest
          .fn()
          .mockResolvedValue({ name: input.customerName, phone: "9876543210" }),
      },
      rfq: {
        upsert: jest.fn(
          async ({ create }) =>
            (record ||= { ...create, status: "NEW", deliveryTiming: null }),
        ),
      },
    };
    const prisma = { $transaction: jest.fn(async (fn) => fn(tx)) };
    const controller = new RfqsController(prisma as never);
    const req = { customerId } as never;
    await expect(controller.create(req, input)).resolves.toEqual({
      id: requestId,
      status: "NEW",
    });
    // PostgreSQL JSONB can return object keys in a different order.
    record.items = [
      {
        unit: "Pieces",
        quantity: 20,
        specification: "3/4 inch",
        brand: "Astral",
        material: "CPVC pipe",
      },
    ];
    await expect(controller.create(req, input)).resolves.toEqual({
      id: requestId,
      status: "NEW",
    });
    expect(record.customerPhone).toBe("9876543210");
    expect(record.customerId).toBe(customerId);
    expect(record).not.toHaveProperty("requestId");
    expect(tx.rfq.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { id: requestId }, update: {} }),
    );
  });

  it("rejects reference reuse for another customer or changed request contents", async () => {
    for (const overrides of [
      { customerId: "other-customer" },
      { siteLocation: "Another site" },
    ]) {
      const tx = {
        customer: {
          update: jest
            .fn()
            .mockResolvedValue({
              name: input.customerName,
              phone: "9876543210",
            }),
        },
        rfq: {
          upsert: jest
            .fn()
            .mockResolvedValue({
              ...input,
              id: requestId,
              customerId,
              deliveryTiming: null,
              ...overrides,
            }),
        },
      };
      const prisma = { $transaction: jest.fn(async (fn) => fn(tx)) };
      await expect(
        new RfqsController(prisma as never).create(
          { customerId } as never,
          input,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    }
  });
});

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
