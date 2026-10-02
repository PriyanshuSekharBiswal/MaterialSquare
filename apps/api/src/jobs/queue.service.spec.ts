import { QueueService } from "./queue.service";
import { PrismaService } from "../prisma/prisma.service";
let processJob: (job: {
  name: string;
  id: string;
  data: Record<string, string>;
}) => Promise<void>;
const add = jest.fn();
jest.mock("bullmq", () => ({
  Queue: jest.fn(() => ({ add, close: jest.fn() })),
  Worker: jest.fn((_name, processor) => {
    processJob = processor;
    return { on: jest.fn(), close: jest.fn() };
  }),
}));
jest.mock("ioredis", () => ({
  __esModule: true,
  default: jest.fn(() => ({ on: jest.fn(), quit: jest.fn() })),
}));
describe("Notification processing", () => {
  const db = { notificationOutbox: { findMany: jest.fn(), update: jest.fn() } };
  let service: QueueService;
  beforeEach(() => {
    jest.clearAllMocks();
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
});
