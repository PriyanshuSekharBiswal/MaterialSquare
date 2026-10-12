import { ConflictException } from "@nestjs/common";
import { StaffManagementController } from "./staff-management.controller";
import { verifyPassword } from "./password";

describe("staff access audit history", () => {
  it("records the old and new role and enabled state without personal data", async () => {
    const auditCreate = jest.fn().mockResolvedValue(undefined);
    const findFirst = jest.fn().mockResolvedValue({
      id: "qa-staff",
      name: "QA staff",
      email: null,
      phone: "9876543210",
      role: "CONTENT_MANAGER",
      isActive: false,
    });
    const update = jest.fn().mockResolvedValue({
      id: "qa-staff",
      name: "QA staff",
      email: "qa@example.invalid",
      phone: null,
      role: "CATALOG_MANAGER",
      isActive: true,
      createdAt: new Date("2026-10-06T00:00:00.000Z"),
      updatedAt: new Date("2026-10-06T00:01:00.000Z"),
    });
    const prisma = {
      staffUser: { findFirst },
      $transaction: (work: (tx: unknown) => Promise<unknown>) =>
        work({ staffUser: { update }, auditLog: { create: auditCreate } }),
    };
    const controller = new StaffManagementController(prisma as never);

    await controller.update(
      "qa-staff",
      { user: { userId: "owner", role: "SUPER_ADMIN" } } as never,
      { role: "CATALOG_MANAGER", isActive: true },
    );

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "qa-staff" },
        data: expect.objectContaining({
          isActive: true,
          authVersion: { increment: 1 },
        }),
      }),
    );
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        staffId: "owner",
        action: "STAFF_ACCESS_UPDATED",
        entityType: "STAFF_USER",
        entityId: "qa-staff",
        metadata: {
          changedFields: ["role", "isActive"],
          changes: [
            {
              field: "role",
              before: "CONTENT_MANAGER",
              after: "CATALOG_MANAGER",
            },
            { field: "isActive", before: false, after: true },
          ],
        },
      }),
    });
    expect(JSON.stringify(auditCreate.mock.calls)).not.toContain(
      "qa@example.invalid",
    );
  });
});

describe("primary-owner protection", () => {
  it("does not expose the primary-owner role as assignable", () => {
    const controller = new StaffManagementController({} as never);
    expect(controller.roles().map(({ role }) => role)).not.toContain(
      "SUPER_ADMIN",
    );
  });

  it("rejects role or access changes to the primary owner before writing", async () => {
    const findFirst = jest.fn().mockResolvedValue({
      id: "owner",
      name: "Owner",
      email: "owner@example.invalid",
      phone: null,
      role: "SUPER_ADMIN",
      isActive: true,
    });
    const update = jest.fn();
    const transaction = jest.fn((work) =>
      work({ staffUser: { update }, auditLog: { create: jest.fn() } }),
    );
    const controller = new StaffManagementController({
      staffUser: { findFirst },
      $transaction: transaction,
    } as never);

    await expect(
      controller.update(
        "owner",
        { user: { userId: "admin", role: "ADMIN" } } as never,
        { role: "ADMIN" },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      controller.update(
        "owner",
        { user: { userId: "admin", role: "ADMIN" } } as never,
        { isActive: false },
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(transaction).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects assigning the primary-owner role to another staff member", async () => {
    const findFirst = jest.fn();
    const update = jest.fn();
    const transaction = jest.fn();
    const controller = new StaffManagementController({
      staffUser: { findFirst },
      $transaction: transaction,
    } as never);

    await expect(
      controller.update(
        "staff-1",
        { user: { userId: "admin", role: "ADMIN" } } as never,
        { role: "SUPER_ADMIN" },
      ),
    ).rejects.toThrow("Invalid request");
    await expect(
      controller.create({ user: { userId: "admin", role: "ADMIN" } } as never, {
        name: "QA Staff",
        email: "qa@example.invalid",
        role: "SUPER_ADMIN",
        password: "QaPassword1!",
      }),
    ).rejects.toThrow("Invalid request");

    expect(findFirst).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe("staff password reset", () => {
  it("hashes the new password, revokes existing sessions, and audits the reset", async () => {
    const password = "QaPassword1!";
    const update = jest.fn().mockResolvedValue(undefined);
    const auditCreate = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      staffUser: { findFirst: jest.fn().mockResolvedValue({ id: "qa-staff" }) },
      $transaction: (work: (tx: unknown) => Promise<unknown>) =>
        work({ staffUser: { update }, auditLog: { create: auditCreate } }),
    };
    const controller = new StaffManagementController(prisma as never);

    await expect(
      controller.resetPassword(
        "qa-staff",
        { user: { userId: "owner", role: "SUPER_ADMIN" } } as never,
        { password },
      ),
    ).resolves.toEqual({ success: true });

    const updateData = update.mock.calls[0][0].data;
    expect(verifyPassword(password, updateData.passwordHash)).toBe(true);
    expect(updateData.passwordHash).not.toBe(password);
    expect(updateData.authVersion).toEqual({ increment: 1 });
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        staffId: "owner",
        action: "STAFF_PASSWORD_RESET",
        entityType: "STAFF_USER",
        entityId: "qa-staff",
        metadata: { sessionsRevoked: true },
      }),
    });
    expect(JSON.stringify(auditCreate.mock.calls)).not.toContain(password);
  });

  it("prevents an administrator from resetting their own password through this route", async () => {
    const transaction = jest.fn();
    const controller = new StaffManagementController({
      $transaction: transaction,
    } as never);

    await expect(
      controller.resetPassword(
        "owner",
        { user: { userId: "owner", role: "SUPER_ADMIN" } } as never,
        { password: "QaPassword1!" },
      ),
    ).rejects.toThrow("Use the account password-change flow for your own password");
    expect(transaction).not.toHaveBeenCalled();
  });
});
