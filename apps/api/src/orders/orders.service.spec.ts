import { BadRequestException, ConflictException } from "@nestjs/common";
import { OrdersService } from "./orders.service";

describe("order dispatch workflow", () => {
  const input = {
    truckNumber: "UP14AB1234",
    driverName: "Driver",
    driverPhone: "9876543210",
    weighbridgeGrossKg: 2000,
    weighbridgeTareKg: 1000,
    estimatedArrival: "2026-12-01T12:00:00Z",
  };
  it("dispatches an order that is ready for processing", async () => {
    const transaction = {
      $queryRaw: jest.fn().mockResolvedValue([{ locked: 1 }]),
      dispatchChallan: {
        create: jest.fn().mockResolvedValue({ id: "challan" }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      order: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      auditLog: { create: jest.fn() },
      transportationPlan: { upsert: jest.fn() },
    };
    const prisma = {
      order: {
        findFirst: jest.fn().mockResolvedValue({
          id: "order",
          status: "PROCESSING_AT_YARD",
          deliverySite: "Site",
        }),
      },
      $transaction: jest.fn(async (fn) => fn(transaction)),
    };
    const service = new OrdersService(prisma as never, {} as never);
    await expect(
      service.createDispatchChallan("order", input),
    ).resolves.toEqual({ id: "challan" });
    expect(transaction.order.updateMany).toHaveBeenCalledWith({
      where: {
        id: "order",
        status: "PROCESSING_AT_YARD",
        updatedAt: undefined,
      },
      data: { status: "LOADED_ON_TRUCK" },
    });
  });
  it("does not dispatch cancelled or delivered orders", async () => {
    for (const status of ["CANCELLED", "DELIVERED"]) {
      const prisma = {
        order: {
          findFirst: jest.fn().mockResolvedValue({ id: "order", status }),
        },
        $transaction: jest.fn(),
      };
      const service = new OrdersService(prisma as never, {} as never);
      await expect(
        service.createDispatchChallan("order", input),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    }
  });
  it("rejects a changed order before creating a challan or audit event", async () => {
    const tx = {
      order: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      dispatchChallan: { create: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    const prisma = {
      order: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: "order",
            status: "PROCESSING_AT_YARD",
            updatedAt: new Date(),
            deliverySite: "Site",
          }),
      },
      $transaction: jest.fn(async (work: (db: unknown) => Promise<unknown>) =>
        work(tx),
      ),
    };
    const service = new OrdersService(prisma as never, {} as never);
    await expect(
      service.createDispatchChallan("order", input, "staff1"),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.dispatchChallan.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("rejects advancement when the order changes after the initial read", async () => {
    const tx = {
      dispatchChallan: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      order: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      transportationPlan: { updateMany: jest.fn() },
      auditLog: { create: jest.fn() },
      notificationOutbox: { create: jest.fn() },
    };
    const prisma = {
      order: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: "order",
            status: "IN_TRANSIT",
            updatedAt: new Date(),
            dispatch: { currentStep: 4 },
          }),
      },
      $transaction: jest.fn(async (work: (db: unknown) => Promise<unknown>) =>
        work(tx),
      ),
    };
    await expect(
      new OrdersService(prisma as never, {} as never).advanceDispatch(
        "order",
        "staff1",
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.transportationPlan.updateMany).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
    expect(tx.notificationOutbox.create).not.toHaveBeenCalled();
  });
  it("rejects an outdated challan on an already delivered order before mutation", async () => {
    const prisma = {
      order: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: "order",
            status: "DELIVERED",
            dispatch: { currentStep: 4 },
          }),
      },
      $transaction: jest.fn(),
    };
    await expect(
      new OrdersService(prisma as never, {} as never).advanceDispatch("order"),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("records an offline advance with an audit trail", async () => {
    const order = {
      id: "qa-order",
      orderNumber: "MS-OR-QA-1",
      grandTotal: "15250.00",
      manualPaymentStatus: "UNPAID",
      payments: [],
    };
    const savedOrder = {
      ...order,
      manualPaymentStatus: "PARTIALLY_PAID",
      manualPaymentMethod: "UPI",
      manualPaymentReference: "QA-UPI-ONLY",
      manualPaymentRecordedBy: { name: "QA Accounts" },
      payments: [{ paymentNumber: "MS-PM-2026-a0aa-aababc-aab-a", amountInr: "5000.00", method: "UPI" }],
    };
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ locked: 1 }]),
      order: {
        findUniqueOrThrow: jest.fn().mockResolvedValueOnce(order).mockResolvedValueOnce(savedOrder),
        update: jest.fn().mockResolvedValue({}),
      },
      orderPayment: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({}),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      order: { findFirst: jest.fn().mockResolvedValue(order) },
      $transaction: jest.fn(async (work: (db: unknown) => Promise<unknown>) => work(tx)),
    };
    const service = new OrdersService(prisma as never, {} as never);

    await expect(service.recordManualPayment(
      "qa-order",
      { amountInr: 5000, method: "UPI", reference: "QA-UPI-ONLY", note: "Advance" },
      "staff-accounts",
    )).resolves.toEqual(savedOrder);
    expect(tx.orderPayment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        paymentNumber: expect.stringMatching(/^MS-PM-/),
        orderId: "qa-order",
        method: "UPI",
        reference: "QA-UPI-ONLY",
        note: "Advance",
        recordedById: "staff-accounts",
      }),
    });
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: "qa-order" },
      data: expect.objectContaining({ manualPaymentStatus: "PARTIALLY_PAID" }),
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        staffId: "staff-accounts",
        action: "ORDER_OFFLINE_PAYMENT_RECORDED",
        entityId: "qa-order",
        metadata: expect.objectContaining({
          paymentNumber: expect.stringMatching(/^MS-PM-/),
          method: "UPI",
          reference: "QA-UPI-ONLY",
          amountInr: 5000,
          totalPaidInr: 5000,
          remainingInr: 10250,
          status: "PARTIALLY_PAID",
        }),
      }),
    });
  });

  it("prevents overpayment and does not create a ledger or audit record", async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ locked: 1 }]),
      order: { findUniqueOrThrow: jest.fn().mockResolvedValue({
        id: "qa-order", grandTotal: "100.00", manualPaymentStatus: "UNPAID", payments: [],
      }) },
      orderPayment: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    const prisma = {
      order: { findFirst: jest.fn().mockResolvedValue({ id: "qa-order", manualPaymentStatus: "UNPAID" }) },
      $transaction: jest.fn(async (work: (db: unknown) => Promise<unknown>) => work(tx)),
    };
    const service = new OrdersService(prisma as never, {} as never);

    await expect(service.recordManualPayment("qa-order", { amountInr: 101, method: "CARD" }, "staff"))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(tx.orderPayment.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("prevents recording an already paid order twice", async () => {
    const prisma = {
      order: { findFirst: jest.fn().mockResolvedValue({ id: "qa-order", manualPaymentStatus: "PAID" }) },
      $transaction: jest.fn(),
    };
    const service = new OrdersService(prisma as never, {} as never);

    await expect(service.recordManualPayment(
      "qa-order", { amountInr: 1, method: "CASH" }, "staff",
    )).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

});
