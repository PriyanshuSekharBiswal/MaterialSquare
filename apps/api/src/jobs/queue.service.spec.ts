import { QueueService } from "./queue.service";
import { PrismaService } from "../prisma/prisma.service";
let processJob: (job: {
  name: string;
  id: string;
  data: Record<string, string>;
}) => Promise<void>;
const add = jest.fn();
const workerOn = jest.fn();
jest.mock("bullmq", () => ({
  Queue: jest.fn(() => ({ add, close: jest.fn() })),
  Worker: jest.fn((_name, processor) => {
    processJob = processor;
    return { on: workerOn, close: jest.fn() };
  }),
}));
jest.mock("ioredis", () => ({
  __esModule: true,
  default: jest.fn(() => ({ on: jest.fn(), quit: jest.fn() })),
}));
describe("Notification processing", () => {
  const db = {
    notificationOutbox: { findMany: jest.fn(), update: jest.fn() },
    quotation: { findUnique: jest.fn() },
    quotationFollowUp: { findUnique: jest.fn(), updateMany: jest.fn() },
  };
  let service: QueueService;
  beforeEach(() => {
    jest.clearAllMocks();
    db.notificationOutbox.update.mockResolvedValue({});
    process.env.REDIS_URL = "redis://example.test";
    process.env.NOTIFICATION_WEBHOOK_URL = "https://example.test/notify";
    service = new QueueService(db as unknown as PrismaService);
  });
  afterEach(async () => {
    await service.onModuleDestroy();
    delete process.env.REDIS_URL;
    delete process.env.NOTIFICATION_WEBHOOK_URL;
  });
  it("retains stable outbox identifiers and schedules retries", async () => {
    db.notificationOutbox.findMany.mockResolvedValue([
      {
        id: "outbox-1",
        type: "quote-published",
        payload: { quoteId: "q1" },
        runAt: new Date(),
      },
    ]);
    await service.onModuleInit();
    expect(add).toHaveBeenCalledWith(
      "quote-published",
      { quoteId: "q1", outboxId: "outbox-1" },
      expect.objectContaining({ jobId: "outbox-1", attempts: 5 }),
    );
  });
  it("does not mark a failed provider response as delivered", async () => {
    db.notificationOutbox.findMany.mockResolvedValue([]);
    await service.onModuleInit();
    const fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({ ok: false, status: 503 } as Response);
    try {
      await expect(
        processJob({
          id: "outbox-1",
          name: "quote-published",
          data: { outboxId: "outbox-1" },
        }),
      ).rejects.toThrow("503");
      expect(db.notificationOutbox.update).not.toHaveBeenCalled();
    } finally {
      fetchMock.mockRestore();
    }
  });
  it("skips a cancelled reminder without contacting the provider", async () => {
    db.notificationOutbox.findMany.mockResolvedValue([]);
    db.quotationFollowUp.findUnique.mockResolvedValue({ status: "CANCELLED" });
    await service.onModuleInit();
    const fetchMock = jest.spyOn(globalThis, "fetch");
    try {
      await processJob({
        id: "outbox-1",
        name: "quote-follow-up",
        data: { outboxId: "outbox-1", followupId: "f1" },
      });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(db.quotationFollowUp.updateMany).not.toHaveBeenCalled();
    } finally {
      fetchMock.mockRestore();
    }
  });

  it("does not overwrite cancellation when a provider response arrives", async () => {
    db.notificationOutbox.findMany.mockResolvedValue([]);
    db.quotationFollowUp.findUnique.mockResolvedValue({ status: "SCHEDULED" });
    // Cancellation may happen after the initial read, before provider completion.
    db.quotationFollowUp.updateMany.mockResolvedValue({ count: 0 });
    await service.onModuleInit();
    const fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({ ok: true } as Response);
    try {
      await processJob({
        id: "outbox-1",
        name: "quote-follow-up",
        data: { outboxId: "outbox-1", followupId: "f1" },
      });
      expect(db.quotationFollowUp.updateMany).toHaveBeenCalledWith({
        where: { id: "f1", status: "SCHEDULED" },
        data: { status: "SENT", sentAt: expect.any(Date) },
      });
    } finally {
      fetchMock.mockRestore();
    }
  });
  it("records final failure only while the reminder remains scheduled", async () => {
    db.notificationOutbox.findMany.mockResolvedValue([]);
    db.quotationFollowUp.updateMany.mockResolvedValue({ count: 0 });
    await service.onModuleInit();
    const failed = workerOn.mock.calls.find(
      ([event]) => event === "failed",
    )![1];
    failed({
      id: "outbox-1",
      data: { followupId: "f1", outboxId: "outbox-1" },
      attemptsMade: 5,
      opts: { attempts: 5 },
    });
    expect(db.quotationFollowUp.updateMany).toHaveBeenCalledWith({
      where: { id: "f1", status: "SCHEDULED" },
      data: { status: "FAILED" },
    });
  });
  it.each(["ACCEPTED", "REJECTED", "EXPIRED", "CONVERTED_TO_ORDER"])(
    "skips an expiry reminder for a %s quote",
    async (status) => {
      db.notificationOutbox.findMany.mockResolvedValue([]);
      db.quotation.findUnique.mockResolvedValue({
        status,
        validUntil: new Date(Date.now() + 3600000),
      });
      await service.onModuleInit();
      const fetchMock = jest.spyOn(globalThis, "fetch");
      try {
        await processJob({
          id: "expiry1",
          name: "quote-expiry-reminder",
          data: { quoteId: "q1", outboxId: "expiry1" },
        });
        expect(fetchMock).not.toHaveBeenCalled();
        expect(db.notificationOutbox.update).toHaveBeenCalledWith({
          where: { id: "expiry1" },
          data: {
            skippedAt: expect.any(Date),
            skipReason: expect.any(String),
            failedAt: null,
          },
        });
      } finally {
        fetchMock.mockRestore();
      }
    },
  );

  it("sends an expiry reminder only for a current published quote", async () => {
    db.notificationOutbox.findMany.mockResolvedValue([]);
    db.quotation.findUnique.mockResolvedValue({
      status: "QUOTE_SENT",
      validUntil: new Date(Date.now() + 3600000),
    });
    await service.onModuleInit();
    const fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({ ok: true } as Response);
    try {
      await processJob({
        id: "expiry1",
        name: "quote-expiry-reminder",
        data: { quoteId: "q1", outboxId: "expiry1" },
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(db.notificationOutbox.update).toHaveBeenCalledWith({
        where: { id: "expiry1" },
        data: { deliveredAt: expect.any(Date), failedAt: null },
      });
    } finally {
      fetchMock.mockRestore();
    }
  });
  it.each([null, { status: "QUOTE_SENT", validUntil: new Date(0) }])("skips missing and elapsed quotations", async (quote) => {
    db.notificationOutbox.findMany.mockResolvedValue([]);
    db.quotation.findUnique.mockResolvedValue(quote);
    await service.onModuleInit();
    const fetchMock = jest.spyOn(globalThis, "fetch");
    try {
      await processJob({ id: "expiry1", name: "quote-expiry-reminder", data: { quoteId: "q1", outboxId: "expiry1" } });
      expect(fetchMock).not.toHaveBeenCalled();
    } finally { fetchMock.mockRestore(); }
  });

});
