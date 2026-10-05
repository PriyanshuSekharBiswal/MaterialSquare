import { ConflictException, NotFoundException } from "@nestjs/common";
import { QuoteFollowupsController } from "./quote-followups.controller";

describe("quotation reminder updates", () => {
  const reminders = {
    findFirst: jest.fn(),
    updateMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
  };
  const auditCreate = jest.fn();
  const db = {
    quotationFollowUp: reminders,
    $transaction: jest.fn(async (work: (tx: unknown) => Promise<unknown>) =>
      work({ quotationFollowUp: reminders, auditLog: { create: auditCreate } }),
    ),
  };
  const controller = new QuoteFollowupsController(db as never);

  beforeEach(() => {
    jest.clearAllMocks();
    reminders.findFirst.mockResolvedValue({ id: "f1", status: "SCHEDULED" });
    reminders.updateMany.mockResolvedValue({ count: 1 });
    reminders.findUniqueOrThrow.mockResolvedValue({
      id: "f1",
      status: "CANCELLED",
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
});
