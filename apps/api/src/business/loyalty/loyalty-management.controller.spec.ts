import { LoyaltyManagementController } from "./loyalty-management.controller";

const staff = {
  user: { userId: "staff-4", role: "ACCOUNTS_MANAGER" },
} as never;

describe("loyalty settings audit history", () => {
  it("returns defaults without creating a settings row during a read", async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const upsert = jest.fn();
    const controller = new LoyaltyManagementController({
      loyaltyProgramSetting: { findUnique, upsert },
    } as never);

    await expect(controller.getSettings()).resolves.toEqual({
      id: "default",
      enabled: false,
      pointsPer100Inr: 0,
      minimumOrderValueInr: 0,
      redemptionValuePerPoint: 0,
      minimumRedemptionPoints: 0,
      expiryAfterDays: null,
    });
    expect(findUnique).toHaveBeenCalledWith({ where: { id: "default" } });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("records changed loyalty policy fields in the same transaction", async () => {
    const current = {
      id: "default",
      enabled: false,
      pointsPer100Inr: 1,
      minimumOrderValueInr: 0,
      redemptionValuePerPoint: 1,
      minimumRedemptionPoints: 100,
      expiryAfterDays: 365,
    };
    const updated = { ...current, enabled: true, pointsPer100Inr: 2 };
    const auditCreate = jest.fn();
    const tx = {
      loyaltyProgramSetting: {
        findUnique: jest.fn().mockResolvedValue(current),
        upsert: jest.fn().mockResolvedValue(updated),
      },
      auditLog: { create: auditCreate },
    };
    const prisma = {
      $transaction: async (work: (db: typeof tx) => unknown) => work(tx),
    } as never;
    const controller = new LoyaltyManagementController(prisma);

    await controller.setSettings(staff, {
      enabled: true,
      pointsPer100Inr: 2,
      minimumOrderValueInr: 0,
      redemptionValuePerPoint: 1,
      minimumRedemptionPoints: 100,
      expiryAfterDays: 365,
    });

    expect(auditCreate).toHaveBeenCalledWith({
      data: {
        staffId: "staff-4",
        action: "LOYALTY_SETTINGS_UPDATED",
        entityType: "LOYALTY_SETTINGS",
        entityId: "default",
        metadata: {
          changedFields: ["enabled", "pointsPer100Inr"],
          enabled: true,
        },
      },
    });
  });
});
