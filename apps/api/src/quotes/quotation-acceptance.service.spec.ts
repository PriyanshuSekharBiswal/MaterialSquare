import { ConflictException, NotFoundException } from "@nestjs/common";
import { QuotationAcceptanceService } from "./quotation-acceptance.service";
import { CustomerQuotationResponseSchema } from "./quotation-acceptance.schema";

describe("customer quotation responses", () => {
  function setup(
    quote: unknown = { id: "quote", customerId: "customer" },
    count = 1,
  ) {
    const tx = {
      quotation: {
        findFirst: jest.fn().mockResolvedValue(quote),
        updateMany: jest.fn().mockResolvedValue({ count }),
      },
      quotationFollowUp: {
        create: jest.fn().mockResolvedValue({ id: "followup" }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = { $transaction: jest.fn((callback) => callback(tx)) };
    return { tx, service: new QuotationAcceptanceService(prisma as any) };
  }
  it("does not expose another customer's quotation", async () => {
    const { tx, service } = setup(null);
    await expect(
      service.respondFromCustomer("quote", "other", "REJECT", ""),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.quotation.findFirst).toHaveBeenCalledWith({
      where: { id: "quote", customerId: "other" },
    });
    expect(tx.quotation.updateMany).not.toHaveBeenCalled();
  });
  it("rejects expired or already decided quotations without side effects", async () => {
    const { tx, service } = setup(undefined, 0);
    await expect(
      service.respondFromCustomer("quote", "customer", "REJECT", ""),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.auditLog.create).not.toHaveBeenCalled();
    expect(tx.quotation.updateMany.mock.calls[0][0].where).toMatchObject({
      customerId: "customer",
      status: "QUOTE_SENT",
    });
  });
  it("records rejection with the customer actor", async () => {
    const { tx, service } = setup();
    await expect(
      service.respondFromCustomer(
        "quote",
        "customer",
        "REJECT",
        "No longer needed",
      ),
    ).resolves.toEqual({ decision: "REJECT" });
    expect(tx.quotationFollowUp.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create.mock.calls[0][0].data.metadata.customerId).toBe(
      "customer",
    );
  });
  it("creates an internal staff follow-up for requested revisions", async () => {
    const { tx, service } = setup();
    await service.respondFromCustomer(
      "quote",
      "customer",
      "REQUEST_CHANGES",
      "Use 100 bags",
    );
    expect(tx.quotationFollowUp.create.mock.calls[0][0].data).toMatchObject({
      quotationId: "quote",
      channel: "INTERNAL",
      notes: "Customer requested changes: Use 100 bags",
    });
  });
  it("scopes acceptance to the authenticated customer inside the transaction", async () => {
    const { tx, service } = setup(null);
    await expect(
      service.acceptFromCustomer("quote", "other", []),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.quotation.findFirst.mock.calls[0][0].where).toEqual({
      id: "quote",
      customerId: "other",
    });
  });
  it("requires revision details and rejects duplicate material selections", () => {
    expect(
      CustomerQuotationResponseSchema.safeParse({ decision: "REQUEST_CHANGES" })
        .success,
    ).toBe(false);
    expect(
      CustomerQuotationResponseSchema.safeParse({
        decision: "ACCEPT",
        selections: [
          { itemId: "a", optionId: "b" },
          { itemId: "a", optionId: "c" },
        ],
      }).success,
    ).toBe(false);
  });
});
