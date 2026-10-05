import { BadRequestException } from "@nestjs/common";
import { BusinessRulesController } from "./business-rules.controller";
import { DEFAULT_BUSINESS_RULES } from "./business-rules";

const staff = { user: { userId: "sales-1", role: "SALES_MANAGER" } } as never;

describe("business quotation rules", () => {
  it("returns the established behavior as the default policy", async () => {
    const prisma = {
      businessRuleSetting: { findUnique: jest.fn().mockResolvedValue(null) },
    } as never;
    await expect(new BusinessRulesController(prisma).get()).resolves.toEqual(
      DEFAULT_BUSINESS_RULES,
    );
  });

  it("saves the policy and records changed rule names atomically", async () => {
    const previous = { ...DEFAULT_BUSINESS_RULES };
    const updated = {
      ...DEFAULT_BUSINESS_RULES,
      quotationValidityHours: 72,
      expiryReminderHoursBefore: 12,
    };
    const auditCreate = jest.fn();
    const tx = {
      businessRuleSetting: {
        findUnique: jest.fn().mockResolvedValue(previous),
        upsert: jest.fn().mockResolvedValue(updated),
      },
      auditLog: { create: auditCreate },
    };
    const prisma = {
      $transaction: async (work: (db: typeof tx) => unknown) => work(tx),
    } as never;

    await new BusinessRulesController(prisma).update(
      {
        quotationValidityHours: 72,
        sendQuotePublishedNotification: true,
        sendQuoteExpiryReminder: true,
        expiryReminderHoursBefore: 12,
      },
      staff,
    );

    expect(auditCreate).toHaveBeenCalledWith({
      data: {
        staffId: "sales-1",
        action: "BUSINESS_RULES_UPDATED",
        entityType: "BUSINESS_RULES",
        entityId: "global",
        metadata: {
          changedFields: [
            "quotationValidityHours",
            "expiryReminderHoursBefore",
          ],
        },
      },
    });
  });

  it("requires an expiry reminder to precede quotation expiry", async () => {
    const controller = new BusinessRulesController({} as never);
    await expect(
      controller.update(
        {
          quotationValidityHours: 24,
          sendQuotePublishedNotification: true,
          sendQuoteExpiryReminder: true,
          expiryReminderHoursBefore: 24,
        },
        staff,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
