import { StaffManagementController } from "./staff-management.controller";

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

    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        staffId: "owner",
        action: "STAFF_ACCESS_UPDATED",
        entityType: "STAFF_USER",
        entityId: "qa-staff",
        metadata: {
          changedFields: ["role", "isActive"],
          changes: [
            { field: "role", before: "CONTENT_MANAGER", after: "CATALOG_MANAGER" },
            { field: "isActive", before: false, after: true },
          ],
        },
      }),
    });
    expect(JSON.stringify(auditCreate.mock.calls)).not.toContain("qa@example.invalid");
  });
});
