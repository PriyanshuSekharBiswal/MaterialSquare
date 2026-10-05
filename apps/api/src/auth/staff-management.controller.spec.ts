import { StaffManagementController } from "./staff-management.controller";

describe("StaffManagementController audit records", () => {
  const owner = { user: { userId: "owner-1", role: "SUPER_ADMIN" } };
  const createdStaff = {
    id: "staff-1",
    role: "CATALOG_MANAGER",
    isActive: true,
  };
  const tx = {
    staffUser: {
      create: jest.fn().mockResolvedValue(createdStaff),
      update: jest.fn().mockResolvedValue(createdStaff),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };
  const prisma = {
    $transaction: jest.fn((work: (transaction: typeof tx) => unknown) =>
      work(tx),
    ),
    staffUser: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: "staff-1", role: "CATALOG_MANAGER" }),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("audits staff creation, access changes, and password resets transactionally without secret values", async () => {
    const controller = new StaffManagementController(prisma as never);
    await controller.create(owner as never, {
      name: "Catalogue Manager",
      phone: "9876543210",
      role: "CATALOG_MANAGER",
      password: "long-test-password",
    });
    await controller.update("staff-1", owner as never, {
      isActive: false,
    });
    await controller.resetPassword("staff-1", owner as never, {
      password: "another-long-password",
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
    expect(tx.auditLog.create.mock.calls.map(([call]) => call.data)).toEqual([
      {
        staffId: "owner-1",
        action: "STAFF_ACCOUNT_CREATED",
        entityType: "STAFF_USER",
        entityId: "staff-1",
        metadata: { role: "CATALOG_MANAGER" },
      },
      {
        staffId: "owner-1",
        action: "STAFF_ACCESS_UPDATED",
        entityType: "STAFF_USER",
        entityId: "staff-1",
        metadata: { changedFields: ["isActive"] },
      },
      {
        staffId: "owner-1",
        action: "STAFF_PASSWORD_RESET",
        entityType: "STAFF_USER",
        entityId: "staff-1",
        metadata: { sessionsRevoked: true },
      },
    ]);
    expect(JSON.stringify(tx.auditLog.create.mock.calls)).not.toContain(
      "long-test-password",
    );
    expect(JSON.stringify(tx.auditLog.create.mock.calls)).not.toContain(
      "another-long-password",
    );
  });
});
