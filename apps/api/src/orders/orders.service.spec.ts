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
      dispatchChallan: {
        create: jest.fn().mockResolvedValue({ id: "challan" }),
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
});
