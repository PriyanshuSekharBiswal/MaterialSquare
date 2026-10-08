import { QuotesService } from "./quotes.service";

describe("quotation business rules", () => {
  it("queues only enabled notifications at the configured reminder lead time", async () => {
    const validUntil = new Date(Date.now() + 36 * 60 * 60 * 1000);
    const quote = {
      id: "quote-1",
      quoteNumber: "MS-QT-2026-0001",
      revisionNumber: 1,
      revisedFromId: null,
      requestId: "request-1",
      validUntil,
      customerPhone: "9876543210",
    };
    const notifications = { create: jest.fn() };
    const db = {
      quotation: {
        findUnique: jest.fn().mockResolvedValue(quote),
        count: jest.fn().mockResolvedValue(0),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      businessRuleSetting: {
        findUnique: jest.fn().mockResolvedValue({
          quotationValidityHours: 48,
          sendQuotePublishedNotification: false,
          sendQuoteExpiryReminder: true,
          expiryReminderHoursBefore: 6,
        }),
      },
      notificationOutbox: notifications,
      auditLog: { create: jest.fn() },
      rfq: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    const prisma = {
      $transaction: (work: (tx: typeof db) => unknown) => work(db),
    } as never;
    const service = new QuotesService(prisma);

    await service.publish("quote-1", "staff-1");

    expect(notifications.create).toHaveBeenCalledTimes(1);
    expect(notifications.create).toHaveBeenCalledWith({
      data: {
        type: "quote-expiry-reminder",
        payload: { quoteId: "quote-1", phone: "9876543210" },
        runAt: new Date(validUntil.getTime() - 6 * 60 * 60 * 1000),
      },
    });
    expect(db.rfq.updateMany).toHaveBeenCalledWith({
      where: { id: "request-1", status: { in: ["NEW", "CONTACTED"] } },
      data: { status: "QUOTED" },
    });
  });
});
