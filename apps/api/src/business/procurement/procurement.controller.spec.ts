import { ProcurementController } from "./procurement.controller";

const staff = {
  user: { userId: "staff-2", role: "PROCUREMENT_HEAD" },
} as never;
const supplierId = "d9ce7cf4-67a5-48b1-9ce7-8be53f3b2510";

describe("procurement audit history", () => {
  it("records a procurement request with the request in one transaction", async () => {
    const request = {
      id: "request-1",
      requestNumber: "MS-PR-2026-unique",
      orderId: "order-1",
    };
    const auditCreate = jest.fn();
    const tx = {
      procurementRequest: { create: jest.fn().mockResolvedValue(request) },
      auditLog: { create: auditCreate },
    };
    const prisma = {
      $transaction: jest.fn(async (work: (db: typeof tx) => unknown) =>
        work(tx),
      ),
    } as never;
    const controller = new ProcurementController(prisma);

    await controller.create(staff, {
      orderId: "order-1",
      deliveryAddress: "Site Road",
      deliveryCity: "Noida",
      deliveryPincode: "201301",
      items: [
        {
          productName: "Cement",
          brand: "BuildCo",
          category: "Cement",
          quantity: 20,
          unit: "bag",
        },
      ],
    });

    expect(auditCreate).toHaveBeenCalledWith({
      data: {
        staffId: "staff-2",
        action: "PROCUREMENT_REQUEST_CREATED",
        entityType: "PROCUREMENT_REQUEST",
        entityId: "request-1",
        metadata: {
          requestNumber: "MS-PR-2026-unique",
          orderId: "order-1",
          itemCount: 1,
        },
      },
    });
  });

  it("records supplier quote receipt and the request status update atomically", async () => {
    const procurementRequest = {
      id: "request-1",
      deliveryPincode: "201301",
      items: [
        {
          productName: "Cement",
          brand: "BuildCo",
          category: "Cement",
          quantity: 20,
          unit: "bag",
        },
      ],
    };
    const auditCreate = jest.fn();
    const tx = {
      supplierQuote: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({ id: "quote-1" }),
      },
      procurementRequest: { update: jest.fn() },
      auditLog: { create: auditCreate },
    };
    const prisma = {
      procurementRequest: {
        findUnique: jest.fn().mockResolvedValue(procurementRequest),
      },
      supplier: {
        findUnique: jest.fn().mockResolvedValue({
          id: supplierId,
          status: "ACTIVE",
        }),
      },
      $transaction: jest.fn(async (work: (db: typeof tx) => unknown) =>
        work(tx),
      ),
    } as never;
    const controller = new ProcurementController(prisma);

    await controller.addSupplierQuote("request-1", staff, {
      supplierId,
      items: [
        {
          productName: "Cement",
          brand: "BuildCo",
          category: "Cement",
          quantity: 10,
          unit: "bag",
          unitPrice: 400,
        },
      ],
      totalAmount: 4000,
      available: true,
    });

    expect(tx.procurementRequest.update).toHaveBeenCalledWith({
      where: { id: "request-1" },
      data: { status: "COMPARING" },
    });
    expect(auditCreate).toHaveBeenCalledWith({
      data: {
        staffId: "staff-2",
        action: "SUPPLIER_QUOTE_RECEIVED",
        entityType: "SUPPLIER_QUOTE",
        entityId: "quote-1",
        metadata: {
          requestId: "request-1",
          supplierId,
          itemCount: 1,
          totalAmount: 4000,
        },
      },
    });
  });
});

describe("supplier matching priority", () => {
  it("ranks exact PIN coverage before the delivery city, then other suppliers", async () => {
    const item = {
      productName: "Cement",
      brand: "BuildCo",
      category: "Cement",
      quantity: 20,
      unit: "bag",
    };
    const supplier = (
      id: string,
      city: string,
      pincode: string,
      servicePincodes: string[],
      score: number,
    ) => ({
      id,
      name: id,
      phone: "9876543210",
      city,
      pincode,
      servicePincodes,
      status: "ACTIVE",
      products: [{ productName: "Cement", brand: "BuildCo", isActive: true }],
      ratings: [
        {
          priceScore: score,
          deliveryScore: score,
          availabilityScore: score,
          qualityScore: score,
          serviceScore: score,
        },
      ],
    });
    const suppliers = [
      supplier("other-city-high-score", "Delhi", "110001", [], 5),
      supplier("same-city", "Noida", "201310", [], 1),
      supplier("pin-covered", "Ghaziabad", "201301", [], 1),
    ];
    const prisma = {
      procurementRequest: {
        findUnique: jest.fn().mockResolvedValue({
          id: "request-1",
          deliveryPincode: "201301",
          deliveryCity: "  NOIDA  ",
          items: [item],
        }),
      },
      supplier: { findMany: jest.fn().mockResolvedValue(suppliers) },
    } as never;

    const result = await new ProcurementController(prisma).candidates(
      "request-1",
    );

    expect(result).toMatchObject({ deliveryPincode: "201301" });
    expect(result.candidates.map((candidate) => candidate.id)).toEqual([
      "pin-covered",
      "same-city",
      "other-city-high-score",
    ]);
    expect(result.candidates.map((candidate) => candidate.cityMatch)).toEqual([
      false,
      true,
      false,
    ]);
  });
});
