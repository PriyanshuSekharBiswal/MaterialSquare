import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  createBusinessReferenceNumber,
  type BusinessReferencePrefix,
} from "./procurement-number";

const referenceModels = {
  RF: "rfq",
  PR: "procurementRequest",
  QU: "quotation",
  SQ: "supplierQuote",
  OR: "order",
  PO: "purchaseOrder",
  DC: "dispatchChallan",
  DL: "orderDelivery",
  PM: "orderPayment",
} as const;
const numberFields = {
  rfq: "requestNumber",
  procurementRequest: "requestNumber",
  quotation: "quoteNumber",
  supplierQuote: "supplierQuoteNumber",
  order: "orderNumber",
  purchaseOrder: "purchaseOrderNumber",
  dispatchChallan: "challanNumber",
  orderDelivery: "deliveryNumber",
  orderPayment: "paymentNumber",
} as const;

function encodeDigits(value: string) {
  return value.replace(/[0-9]/g, (digit) =>
    digit === "0" ? "0" : String.fromCharCode(96 + Number(digit)),
  );
}

function transaction(existing: string[] = []) {
  const modelMocks = Object.fromEntries(
    Object.values(referenceModels).map((model) => [
      model,
      {
        findMany: jest
          .fn()
          .mockResolvedValue(
            existing.map((value) => ({ [numberFields[model]]: value })),
          ),
      },
    ]),
  );
  return {
    tx: {
      $queryRaw: jest.fn().mockResolvedValue([{ locked: 1 }]),
      ...modelMocks,
    } as unknown as Prisma.TransactionClient,
    modelMocks,
  };
}

describe("business reference numbers", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // 01 Jan 2026, 01:01:01.001 in Asia/Kolkata.
    jest.setSystemTime(new Date("2025-12-31T19:31:01.001Z"));
  });

  afterEach(() => jest.useRealTimers());

  it.each(Object.keys(referenceModels) as BusinessReferencePrefix[])(
    "creates the fixed 23-character %s reference format",
    async (type) => {
      const { tx, modelMocks } = transaction();
      const reference = await createBusinessReferenceNumber(tx, type);

      expect(reference).toBe(`MS-${type}-2026-0a0a-0a0a0a-00a-0a`);
      expect(reference.replaceAll("-", "")).toHaveLength(23);
      expect(modelMocks[referenceModels[type]].findMany).toHaveBeenCalled();
    },
  );

  it("increments the encoded sequence when a reference already exists in that millisecond", async () => {
    const existing = "MS-PR-2026-0a0a-0a0a0a-00a-0a";
    const { tx } = transaction([existing]);

    await expect(createBusinessReferenceNumber(tx, "PR")).resolves.toBe(
      "MS-PR-2026-0a0a-0a0a0a-00a-0b",
    );
  });

  it("fails clearly after all 60 per-millisecond sequence values are used", async () => {
    const existing = Array.from({ length: 60 }, (_, index) =>
      `MS-QU-2026-0a0a-0a0a0a-00a-${encodeDigits(String(index + 1).padStart(2, "0"))}`,
    );
    const { tx } = transaction(existing);

    await expect(createBusinessReferenceNumber(tx, "QU")).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
