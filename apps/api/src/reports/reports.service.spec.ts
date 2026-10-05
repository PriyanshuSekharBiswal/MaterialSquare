import { Prisma } from "@prisma/client";
import { ReportsService } from "./reports.service";

describe("operational reports", () => {
  it("summarizes recorded order values by date range without treating them as receipts", async () => {
    const order = {
      groupBy: jest.fn().mockResolvedValue([
        {
          status: "PROCESSING_AT_YARD",
          _count: { _all: 2 },
          _sum: { grandTotal: new Prisma.Decimal(1200) },
        },
        {
          status: "CANCELLED",
          _count: { _all: 1 },
          _sum: { grandTotal: new Prisma.Decimal(300) },
        },
      ]),
      findMany: jest.fn().mockResolvedValue([
        {
          orderNumber: "MS-ORD-2026-1",
          status: "PROCESSING_AT_YARD",
          grandTotal: new Prisma.Decimal(600),
          createdAt: new Date("2026-10-01T03:00:00Z"),
          items: [{ id: "line-1" }],
        },
      ]),
    };
    const quotation = {
      groupBy: jest.fn().mockResolvedValue([
        {
          status: "QUOTE_SENT",
          _count: { _all: 1 },
          _sum: { totalAmount: new Prisma.Decimal(750) },
        },
      ]),
      findMany: jest.fn().mockResolvedValue([]),
    };
    const service = new ReportsService({ order, quotation } as never);

    const report = await service.sales({
      from: "2026-10-01",
      to: "2026-10-31",
    });

    expect(report.summary).toEqual({
      orderCount: 3,
      activeOrderCount: 2,
      recordedOrderValueInr: 1200,
      quotationCount: 1,
      acceptedQuotationCount: 0,
    });
    expect(report.orders[0]).toMatchObject({
      orderNumber: "MS-ORD-2026-1",
      recordedValueInr: 600,
      itemCount: 1,
    });
    expect(report.note).toContain("saved order and quotation documents");
    expect(order.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          createdAt: {
            gte: new Date("2026-09-30T18:30:00.000Z"),
            lt: new Date("2026-10-31T18:30:00.000Z"),
          },
        },
      }),
    );
  });

  it("rejects missing, reversed, and excessively wide report date ranges", async () => {
    const service = new ReportsService({} as never);
    await expect(service.sales({})).rejects.toThrow();
    await expect(
      service.sales({ from: "2026-10-02", to: "2026-10-01" }),
    ).rejects.toThrow("Invalid request");
    await expect(
      service.sales({ from: "2025-01-01", to: "2026-10-01" }),
    ).rejects.toThrow("Invalid request");
  });

  it("returns procurement and fulfillment rows without customer contact fields", async () => {
    const service = new ReportsService({
      procurementRequest: {
        groupBy: jest
          .fn()
          .mockResolvedValue([{ status: "OPEN", _count: { _all: 1 } }]),
        findMany: jest.fn().mockResolvedValue([
          {
            requestNumber: "MS-PR-2026-1",
            status: "OPEN",
            createdAt: new Date("2026-10-01T00:00:00Z"),
            requiredBy: null,
            items: [{ productName: "Cement" }],
            _count: { purchaseOrders: 0, supplierQuotes: 1 },
          },
        ]),
      },
      purchaseOrder: {
        groupBy: jest.fn().mockResolvedValue([]),
        findMany: jest.fn().mockResolvedValue([]),
      },
      order: {
        groupBy: jest
          .fn()
          .mockResolvedValue([{ status: "IN_TRANSIT", _count: { _all: 1 } }]),
      },
      transportationPlan: {
        groupBy: jest
          .fn()
          .mockResolvedValue([{ status: "IN_TRANSIT", _count: { _all: 1 } }]),
        findMany: jest.fn().mockResolvedValue([
          {
            status: "IN_TRANSIT",
            dispatchAt: null,
            estimatedArrival: null,
            currentLocation: null,
            order: {
              orderNumber: "MS-ORD-2026-2",
              status: "IN_TRANSIT",
              deliveries: [],
            },
          },
        ]),
      },
    } as never);

    const query = { from: "2026-10-01", to: "2026-10-31" };
    const [procurement, fulfillment] = await Promise.all([
      service.procurement(query),
      service.fulfillment(query),
    ]);
    expect(procurement.requests[0].itemCount).toBe(1);
    expect(fulfillment.deliveries[0].orderNumber).toBe("MS-ORD-2026-2");
    expect(JSON.stringify({ procurement, fulfillment })).not.toContain(
      "customerPhone",
    );
  });
});
