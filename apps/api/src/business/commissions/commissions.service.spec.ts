import { ConflictException, ForbiddenException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CommissionsService } from "./commissions.service";

describe("CommissionsService", () => {
  it("returns only the fields required by the commission review screen", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new CommissionsService({
      commissionRecord: { findMany },
    } as never);

    await service.list();

    expect(findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        beneficiaryName: true,
        amount: true,
        ratePct: true,
        basisAmount: true,
        status: true,
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("calculates a record and writes a privacy-safe audit event transactionally", async () => {
    const record = {
      id: "commission-1",
      orderId: null,
      customerId: null,
      amount: new Prisma.Decimal("100.00"),
      status: "PENDING_REVIEW",
    };
    const auditCreate = jest.fn();
    const commissionCreate = jest.fn().mockResolvedValue(record);
    const tx = {
      commissionRecord: { create: commissionCreate },
      auditLog: { create: auditCreate },
    };
    const prisma = {
      customer: { count: jest.fn() },
      order: { count: jest.fn() },
      $transaction: async (work: (db: typeof tx) => unknown) => work(tx),
    } as never;
    const service = new CommissionsService(prisma);

    await service.create(
      {
        beneficiaryName: "Partner Name",
        beneficiaryPhone: "9876543210",
        basisAmount: 1000,
        ratePct: 10,
      },
      "staff-3",
    );

    expect(commissionCreate).toHaveBeenCalledWith({
      data: {
        beneficiaryName: "Partner Name",
        beneficiaryPhone: "9876543210",
        basisAmount: new Prisma.Decimal("1000"),
        ratePct: new Prisma.Decimal("10"),
        amount: new Prisma.Decimal("100"),
      },
    });
    expect(auditCreate).toHaveBeenCalledWith({
      data: {
        staffId: "staff-3",
        action: "COMMISSION_CREATED",
        entityType: "COMMISSION",
        entityId: "commission-1",
        metadata: {
          orderId: null,
          customerId: null,
          amount: "100",
          status: "PENDING_REVIEW",
        },
      },
    });
    expect(JSON.stringify(auditCreate.mock.calls)).not.toContain("9876543210");
  });

  it("prevents roles outside Accounts from approving commissions", async () => {
    const transaction = jest.fn();
    const service = new CommissionsService({
      $transaction: transaction,
    } as never);

    await expect(
      service.approve("commission-1", "staff-4", "SALES_MANAGER"),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects approval when a commission has already left review", async () => {
    const tx = {
      commissionRecord: {
        findUnique: jest.fn().mockResolvedValue({ status: "APPROVED" }),
        updateMany: jest.fn(),
      },
      auditLog: { create: jest.fn() },
    };
    const prisma = {
      $transaction: async (work: (db: typeof tx) => unknown) => work(tx),
    } as never;
    const service = new CommissionsService(prisma);

    await expect(
      service.approve("commission-1", "staff-4", "ACCOUNTS_MANAGER"),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.commissionRecord.updateMany).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("claims a pending commission once and audits the approval transactionally", async () => {
    const pending = {
      id: "commission-1",
      status: "PENDING_REVIEW",
      amount: new Prisma.Decimal("100.00"),
    };
    const approved = {
      ...pending,
      status: "APPROVED",
      approvedById: "staff-4",
    };
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const findUniqueOrThrow = jest.fn().mockResolvedValue(approved);
    const auditCreate = jest.fn();
    const tx = {
      commissionRecord: {
        findUnique: jest.fn().mockResolvedValue(pending),
        updateMany,
        findUniqueOrThrow,
      },
      auditLog: { create: auditCreate },
    };
    const prisma = {
      $transaction: async (work: (db: typeof tx) => unknown) => work(tx),
    } as never;
    const service = new CommissionsService(prisma);

    await expect(
      service.approve("commission-1", "staff-4", "ACCOUNTS_MANAGER"),
    ).resolves.toEqual(approved);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "commission-1", status: "PENDING_REVIEW" },
      data: expect.objectContaining({
        status: "APPROVED",
        approvedById: "staff-4",
        approvedAt: expect.any(Date),
      }),
    });
    expect(auditCreate).toHaveBeenCalledWith({
      data: {
        staffId: "staff-4",
        action: "COMMISSION_APPROVED",
        entityType: "COMMISSION",
        entityId: "commission-1",
        metadata: { amount: "100" },
      },
    });
  });

  it("does not write an approval event when another reviewer claimed the record", async () => {
    const auditCreate = jest.fn();
    const tx = {
      commissionRecord: {
        findUnique: jest.fn().mockResolvedValue({ status: "PENDING_REVIEW" }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUniqueOrThrow: jest.fn(),
      },
      auditLog: { create: auditCreate },
    };
    const prisma = {
      $transaction: async (work: (db: typeof tx) => unknown) => work(tx),
    } as never;
    const service = new CommissionsService(prisma);

    await expect(
      service.approve("commission-1", "staff-5", "ACCOUNTS_MANAGER"),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.commissionRecord.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.commissionRecord.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(auditCreate).not.toHaveBeenCalled();
  });
});
