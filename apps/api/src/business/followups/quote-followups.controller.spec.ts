import { ConflictException, NotFoundException } from "@nestjs/common";
import { QuoteFollowupsController } from "./quote-followups.controller";

describe("quotation reminder updates", () => {
  const reminders = {
    findFirst: jest.fn(),
    updateMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
  };
  const auditCreate = jest.fn();
  const outboxCreate = jest.fn();
  const quoteFindUnique = jest.fn();
  const db = {
    quotationFollowUp: reminders,
    quotation: { findUnique: quoteFindUnique },
    notificationOutbox: { create: outboxCreate },
    $transaction: jest.fn(async (work: (tx: unknown) => Promise<unknown>) =>
      work({
        quotationFollowUp: reminders,
        quotation: { findUnique: quoteFindUnique },
        notificationOutbox: { create: outboxCreate },
        auditLog: { create: auditCreate },
      }),
    ),
  };
  const controller = new QuoteFollowupsController(db as never);

  beforeEach(() => {
    jest.clearAllMocks();
    reminders.findFirst.mockResolvedValue({ id: "f1", status: "SCHEDULED" });
    reminders.updateMany.mockResolvedValue({ count: 1 });
    reminders.create.mockResolvedValue({ id: "f2", status: "SCHEDULED" });
    reminders.findUniqueOrThrow.mockResolvedValue({
      id: "f1",
      status: "CANCELLED",
    });
    quoteFindUnique.mockResolvedValue({
      id: "q1",
      customerPhone: "9999999999",
      customerEmail: "customer@example.invalid",
      quoteNumber: "MS-QT-1",
    });
  });

  it("scopes cancellation to the quotation and observed reminder state", async () => {
    await expect(
      controller.update("q1", "f1", { status: "CANCELLED" }),
    ).resolves.toEqual({ id: "f1", status: "CANCELLED" });
    expect(reminders.findFirst).toHaveBeenCalledWith({
      where: { id: "f1", quotationId: "q1" },
    });
    expect(reminders.updateMany).toHaveBeenCalledWith({
      where: { id: "f1", quotationId: "q1", status: "SCHEDULED" },
      data: { status: "CANCELLED", sentAt: null },
    });
  });

  it("rejects a concurrent state change instead of overwriting it", async () => {
    reminders.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      controller.update("q1", "f1", { status: "CANCELLED" }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(reminders.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(auditCreate).not.toHaveBeenCalled();
  });

  it.each(["SENT", "CANCELLED"])(
    "does not reopen a %s reminder",
    async (status) => {
      reminders.findFirst.mockResolvedValue({ id: "f1", status });
      await expect(
        controller.update("q1", "f1", { status: "SCHEDULED" }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(reminders.updateMany).not.toHaveBeenCalled();
    },
  );

  it("rejects a missing or differently scoped reminder", async () => {
    reminders.findFirst.mockResolvedValue(null);
    await expect(
      controller.update("q1", "f1", { status: "CANCELLED" }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(reminders.updateMany).not.toHaveBeenCalled();
  });

  it("reschedules an internal task by closing it and creating a replacement", async () => {
    reminders.findFirst.mockResolvedValue({
      id: "f1",
      quotationId: "q1",
      channel: "INTERNAL",
      scheduledAt: new Date("2026-10-08T12:00:00.000Z"),
      status: "SCHEDULED",
      notes: "QA reminder",
    });
    await expect(
      controller.update("q1", "f1", {
        scheduledAt: new Date(Date.now() + 60_000).toISOString(),
      }),
    ).resolves.toEqual({ id: "f2", status: "SCHEDULED" });
    expect(reminders.updateMany).toHaveBeenCalledWith({
      where: { id: "f1", quotationId: "q1", status: "SCHEDULED" },
      data: { status: "CANCELLED" },
    });
    expect(reminders.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        quotationId: "q1",
        channel: "INTERNAL",
        notes: "QA reminder",
        scheduledAt: expect.any(Date),
      }),
    });
    expect(outboxCreate).not.toHaveBeenCalled();
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "QUOTATION_FOLLOWUP_RESCHEDULED",
        metadata: expect.objectContaining({
          previousFollowupId: "f1",
          followupId: "f2",
        }),
      }),
    });
  });

  it("queues a replacement notification when rescheduling an external reminder", async () => {
    reminders.findFirst.mockResolvedValue({
      id: "f1",
      quotationId: "q1",
      channel: "EMAIL",
      scheduledAt: new Date("2026-10-08T12:00:00.000Z"),
      status: "SCHEDULED",
      notes: "Please call about delivery timing",
    });
    await controller.update("q1", "f1", {
      scheduledAt: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(outboxCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "quote-follow-up",
        runAt: expect.any(Date),
        payload: expect.objectContaining({
          followupId: "f2",
          channel: "EMAIL",
          email: "customer@example.invalid",
          notes: "Please call about delivery timing",
        }),
      }),
    });
  });

  it("rejects rescheduling into the past", async () => {
    await expect(
      controller.update("q1", "f1", {
        scheduledAt: "2020-01-01T00:00:00.000Z",
      }),
    ).rejects.toThrow("Schedule the follow-up for now or a future time");
    expect(reminders.updateMany).not.toHaveBeenCalled();
  });
});
