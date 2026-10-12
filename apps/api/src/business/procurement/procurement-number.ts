import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

export type BusinessReferencePrefix = "RF" | "PR" | "QU" | "SQ" | "OR" | "PO" | "DC" | "DL" | "PM";

function encodeDateDigits(value: string): string {
  return value.replace(/[0-9]/g, (digit) =>
    digit === "0" ? "0" : String.fromCharCode(96 + Number(digit)),
  );
}

function decodeOrdinal(value: string): number | null {
  const decoded = value.replace(/[0a-i]/g, (digit) =>
    digit === "0" ? "0" : String(Number(digit.charCodeAt(0) - 96)),
  );
  if (!/^\d{2}$/.test(decoded)) return null;
  const ordinal = Number(decoded);
  return ordinal >= 1 && ordinal <= 60 ? ordinal : null;
}

async function existingNumbers(
  tx: Prisma.TransactionClient,
  type: BusinessReferencePrefix,
  prefix: string,
): Promise<string[]> {
  const startsWith = `${prefix}-`;
  switch (type) {
    case "RF":
      return (await tx.rfq.findMany({
        where: { requestNumber: { startsWith } },
        select: { requestNumber: true },
      })).map(({ requestNumber }) => requestNumber);
    case "PR":
      return (await tx.procurementRequest.findMany({
        where: { requestNumber: { startsWith } },
        select: { requestNumber: true },
      })).map(({ requestNumber }) => requestNumber);
    case "QU":
      return (await tx.quotation.findMany({
        where: { quoteNumber: { startsWith } },
        select: { quoteNumber: true },
      })).map(({ quoteNumber }) => quoteNumber);
    case "SQ":
      return (await tx.supplierQuote.findMany({
        where: { supplierQuoteNumber: { startsWith } },
        select: { supplierQuoteNumber: true },
      })).map(({ supplierQuoteNumber }) => supplierQuoteNumber);
    case "OR":
      return (await tx.order.findMany({
        where: { orderNumber: { startsWith } },
        select: { orderNumber: true },
      })).map(({ orderNumber }) => orderNumber);
    case "PO":
      return (await tx.purchaseOrder.findMany({
        where: { purchaseOrderNumber: { startsWith } },
        select: { purchaseOrderNumber: true },
      })).map(({ purchaseOrderNumber }) => purchaseOrderNumber);
    case "DC":
      return (await tx.dispatchChallan.findMany({
        where: { challanNumber: { startsWith } },
        select: { challanNumber: true },
      })).map(({ challanNumber }) => challanNumber);
    case "DL":
      return (await tx.orderDelivery.findMany({
        where: { deliveryNumber: { startsWith } },
        select: { deliveryNumber: true },
      })).map(({ deliveryNumber }) => deliveryNumber);
    case "PM":
      return (await tx.orderPayment.findMany({
        where: { paymentNumber: { startsWith } },
        select: { paymentNumber: true },
      })).map(({ paymentNumber }) => paymentNumber);
  }
}

/**
 * Create a 23-character business reference (excluding hyphens):
 * prefix(2), year(4), month/day(4), time(6), milliseconds(3), sequence(2).
 * Date/time digits use 0, a-i, with a=1; time is Asia/Kolkata local time.
 * A transaction advisory lock and sequence make up to 60 references unique
 * for the same type and millisecond across all app instances.
 */
export async function createBusinessReferenceNumber(
  tx: Prisma.TransactionClient,
  type: BusinessReferencePrefix,
  createdAt = new Date(),
): Promise<string> {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(createdAt);
  const part = (name: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === name)?.value ?? "00";
  const year = part("year");
  const dateCode = encodeDateDigits(`${part("month")}${part("day")}`);
  const timeCode = encodeDateDigits(
    `${part("hour")}${part("minute")}${part("second")}`,
  );
  const millisecondCode = encodeDateDigits(
    String(createdAt.getMilliseconds()).padStart(3, "0"),
  );
  const stem = `MS-${type}-${year}-${dateCode}-${timeCode}-${millisecondCode}`;

  await tx.$queryRaw<Array<{ locked: number }>>`
    SELECT 1 AS locked
    FROM (SELECT pg_advisory_xact_lock(hashtextextended(${stem}, 0))) AS business_reference_lock
  `;
  const used = new Set(
    (await existingNumbers(tx, type, stem)).flatMap((number) => {
      const sequence = decodeOrdinal(number.slice(stem.length + 1));
      return sequence === null ? [] : [sequence];
    }),
  );
  const next = Array.from({ length: 60 }, (_, index) => index + 1).find(
    (sequence) => !used.has(sequence),
  );
  if (next === undefined) {
    throw new ConflictException(
      `This millisecond has reached its limit of 60 ${type} references. Please try again.`,
    );
  }
  const reference = `${stem}-${encodeDateDigits(String(next).padStart(2, "0"))}`;
  const compactLength = reference.replaceAll("-", "").length;
  if (compactLength !== 23)
    throw new Error(`Business reference length must be 23 characters, got ${compactLength}`);
  return reference;
}

export function createProcurementRequestNumber(
  tx: Prisma.TransactionClient,
): Promise<string> {
  return createBusinessReferenceNumber(tx, "PR");
}
