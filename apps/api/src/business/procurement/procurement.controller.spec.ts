import { ProcurementController } from "./procurement.controller";

const staff = {
  user: { userId: "staff-2", role: "PROCUREMENT_HEAD" },
} as never;
const supplierId = "d9ce7cf4-67a5-48b1-9ce7-8be53f3b2510";

describe("procurement audit history", () => {
  it("records a procurement request with the request in one transaction", async () => {
    const request = {
      id: "request-1",
      orderId: "order-1",
    };
    const auditCreate = jest.fn();
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      procurementRequest: {
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({
          ...request,
          ...data,
        })),
        findMany: jest.fn().mockResolvedValue([]),
      },
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

    const auditEntry = auditCreate.mock.calls[0][0];
    const requestNumber = auditEntry.data.metadata.requestNumber as string;
    expect(requestNumber).toMatch(/^MS-PR-\d{4}-[0a-i]{4}-[0a-i]{6}-[0a-i]{3}-[0a-i]{2}$/);
    expect(requestNumber.replaceAll("-", "")).toHaveLength(23);
    expect(auditCreate).toHaveBeenCalledWith({
      data: {
        staffId: "staff-2",
        action: "PROCUREMENT_REQUEST_CREATED",
        entityType: "PROCUREMENT_REQUEST",
        entityId: "request-1",
        metadata: {
          requestNumber,
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
      $queryRaw: jest.fn().mockResolvedValue([]),
      rfq: { findMany: jest.fn().mockResolvedValue([]) },
      supplierQuote: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({ id: "quote-1" }),
      },
      supplierProduct: {
        findMany: jest.fn().mockResolvedValue([{
          id: "supplier-product-1",
          productName: "Cement",
          brand: "BuildCo",
          category: "Cement",
          unit: "bag",
          catalogVariantId: null,
        }]),
        updateMany: jest.fn(),
      },
      purchaseOrder: { findMany: jest.fn().mockResolvedValue([]) },
      procurementRequest: {
        update: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(procurementRequest),
      },
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

    const quoteNumber = tx.supplierQuote.upsert.mock.calls[0][0].create
      .supplierQuoteNumber;
    expect(quoteNumber).toMatch(/^MS-SQ-\d{4}-[0a-i]{4}-[0a-i]{6}-[0a-i]{3}-[0a-i]{2}$/);
    expect(quoteNumber.replaceAll("-", "")).toHaveLength(23);

    expect(tx.procurementRequest.update).toHaveBeenCalledWith({
      where: { id: "request-1" },
      data: { status: "COMPARING" },
    });
    expect(tx.supplierProduct.updateMany).toHaveBeenCalledWith({
      where: { id: "supplier-product-1", supplierId, isActive: true, deletedAt: null },
      data: { lastQuotedPrice: 400, lastQuotedPriceAt: expect.any(Date) },
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

  it("rejects supplier quote quantities that exceed the remaining request after another supplier allocation", async () => {
    const procurementRequest = {
      id: "request-1",
      updatedAt: new Date("2026-10-12T00:00:00.000Z"),
      items: [{ productName: "Cement", brand: "BuildCo", category: "Cement", quantity: 20, unit: "bag" }],
    };
    const upsert = jest.fn();
    const tx = {
      procurementRequest: {
        update: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(procurementRequest),
      },
      supplierQuote: {
        findMany: jest.fn().mockResolvedValue([{
          items: [{ productName: "Cement", brand: "BuildCo", category: "Cement", quantity: 15, unit: "bag", unitPrice: 400 }],
        }]),
        findUnique: jest.fn().mockResolvedValue(null),
        upsert,
      },
      purchaseOrder: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const prisma = {
      procurementRequest: { findUnique: jest.fn().mockResolvedValue(procurementRequest) },
      supplier: { findUnique: jest.fn().mockResolvedValue({ id: supplierId, status: "ACTIVE" }) },
      $transaction: jest.fn(async (work: (db: typeof tx) => unknown) => work(tx)),
    } as never;
    const controller = new ProcurementController(prisma);

    await expect(controller.addSupplierQuote("request-1", staff, {
      supplierId,
      items: [{ productName: "Cement", brand: "BuildCo", category: "Cement", quantity: 10, unit: "bag", unitPrice: 400 }],
      totalAmount: 4000,
      available: true,
    })).rejects.toThrow("Only 5 bag remain");
    expect(upsert).not.toHaveBeenCalled();
    expect(tx.procurementRequest.update).toHaveBeenCalledWith({
      where: { id: "request-1" },
      data: { updatedAt: expect.any(Date) },
    });
  });
});

describe("supplier matching priority", () => {
  it("scores and ranks exact PIN, service PIN, city, state, then other locations", async () => {
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
      state = "Uttar Pradesh",
    ) => ({
      id,
      name: id,
      phone: "9876543210",
      city,
      state,
      pincode,
      servicePincodes,
      status: "ACTIVE",
      products: [{
        productName: "Cement",
        brand: "BuildCo",
        category: "Cement",
        unit: "bag",
        availableQuantity: "25",
        availabilityCheckedAt: new Date("2026-10-07T10:00:00.000Z"),
        lastQuotedPrice: "300",
        isActive: true,
      }],
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
      supplier("other-city-high-score", "Delhi", "110001", [], 5, "Delhi"),
      supplier("same-state", "Lucknow", "226001", [], 5),
      supplier("same-city", "Noida", "201310", [], 1),
      supplier("pin-covered", "Ghaziabad", "201310", ["201301"], 1),
      supplier("exact-pin", "Faridabad", "201301", [], 1),
    ];
    const prisma = {
      procurementRequest: {
        findUnique: jest.fn().mockResolvedValue({
          id: "request-1",
          deliveryPincode: "201301",
          deliveryCity: "  NOIDA  ",
          deliveryState: " Uttar Pradesh ",
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
      "exact-pin",
      "pin-covered",
      "same-city",
      "same-state",
      "other-city-high-score",
    ]);
    expect(result.candidates.map((candidate) => candidate.cityMatch)).toEqual([
      false,
      false,
      true,
      false,
      false,
    ]);
    expect(
      result.candidates.map((candidate) => [
        candidate.deliveryPincodeMatch,
        candidate.serviceCoverageMatch,
      ]),
    ).toEqual([
      [true, false],
      [false, true],
      [false, false],
      [false, false],
      [false, false],
    ]);
    expect(result.candidates.map((candidate) => candidate.locationMatchPercent)).toEqual([
      100, 80, 60, 40, 0,
    ]);
    expect(result.candidates.map((candidate) => candidate.locationMatchLabel)).toEqual([
      "Exact PIN", "Service PIN", "Same city", "Same state", "Other location",
    ]);
  });

  it("prefers a linked client catalogue pack and returns the supplier stock snapshot", async () => {
    const variantId = "6c6a3d40-cfb1-42d1-a460-79493a8b904c";
    const product = (catalogVariantId: string | null) => ({
      productName: "UltraTech Cement 50 kg bag",
      brand: "UltraTech Cement",
      category: "Cement & Aggregates",
      unit: "bag",
      catalogVariantId,
      availableQuantity: "300",
      availabilityCheckedAt: new Date("2026-10-07T10:00:00.000Z"),
      lastQuotedPrice: "350",
      isActive: true,
    });
    const suppliers = [
      {
        id: "wrong-pack",
        name: "Wrong pack",
        phone: "9876543210",
        city: "Noida",
        pincode: "201301",
        servicePincodes: ["201301"],
        products: [product("5c6a3d40-cfb1-42d1-a460-79493a8b904c")],
        ratings: [],
      },
      {
        id: "linked-pack",
        name: "Linked pack",
        phone: "9876543210",
        city: "Noida",
        pincode: "201301",
        servicePincodes: ["201301"],
        products: [product(variantId)],
        ratings: [],
      },
    ];
    const prisma = {
      procurementRequest: {
        findUnique: jest.fn().mockResolvedValue({
          id: "request-1",
          deliveryPincode: "201301",
          deliveryCity: "Noida",
          items: [
            {
              catalogVariantId: variantId,
              productName: "UltraTech Cement 50 kg bag",
              brand: "UltraTech Cement",
              category: "cement",
              quantity: 300,
              requiredQuantity: 600,
              clientStockQuantity: 300,
              unit: "bag",
            },
          ],
        }),
      },
      supplier: { findMany: jest.fn().mockResolvedValue(suppliers) },
    } as never;

    const result = await new ProcurementController(prisma).candidates("request-1");

    expect(result.candidates.map((candidate) => candidate.id)).toEqual([
      "linked-pack",
    ]);
    expect(result.candidates[0].matchedProducts[0]).toMatchObject({
      availableQuantity: "300",
      requestedQuantity: 300,
      lastQuotedPrice: "350",
    });
  });

  it("matches duplicate catalogue IDs only when the supplier's exact pack details agree", async () => {
    const requestedVariantId = "requested-50kg-variant";
    const supplierProduct = (
      id: string,
      label: string,
      pack: string,
    ) => ({
      productName: "UltraTech PPC Cement",
      brand: "UltraTech Cement",
      category: "cement",
      unit: "bag",
      catalogVariantId: id,
      catalogVariant: {
        label,
        attributes: { pack },
        unit: "bag",
        listing: {
          name: "UltraTech PPC Cement",
          brand: "UltraTech Cement",
        },
      },
      availableQuantity: null,
      availabilityCheckedAt: null,
      lastQuotedPrice: null,
      isActive: true,
    });
    const suppliers = [
      {
        id: "same-pack",
        name: "Same pack supplier",
        phone: "9876543210",
        city: "Noida",
        pincode: "201301",
        servicePincodes: ["201301"],
        products: [supplierProduct("duplicate-50kg-variant", "50 kg", "50 kg")],
        ratings: [],
      },
      {
        id: "wrong-pack",
        name: "Different pack supplier",
        phone: "9876543211",
        city: "Noida",
        pincode: "201301",
        servicePincodes: ["201301"],
        products: [supplierProduct("25kg-variant", "25 kg", "25 kg")],
        ratings: [],
      },
    ];
    const prisma = {
      procurementRequest: {
        findUnique: jest.fn().mockResolvedValue({
          id: "request-1",
          deliveryPincode: "201301",
          deliveryCity: "Noida",
          items: [
            {
              catalogVariantId: requestedVariantId,
              productName: "UltraTech PPC Cement",
              brand: "UltraTech Cement",
              category: "cement",
              quantity: 100,
              unit: "bag",
              notes: "50 kg · UltraTech PPC Cement · 50 kg",
            },
          ],
        }),
      },
      supplier: { findMany: jest.fn().mockResolvedValue(suppliers) },
    } as never;

    const result = await new ProcurementController(prisma).candidates("request-1");

    expect(result.candidates.map((candidate) => candidate.id)).toEqual([
      "same-pack",
    ]);
  });

  it("excludes recoverably deleted suppliers and supplier products from matching", async () => {
    const item = {
      productName: "Cement",
      brand: "BuildCo",
      category: "Cement",
      quantity: 20,
      unit: "bag",
    };
    const supplier = {
      id: "active-supplier",
      name: "Active supplier",
      phone: "9876543210",
      city: "Noida",
      pincode: "201301",
      servicePincodes: [],
      status: "ACTIVE",
      deletedAt: null,
      products: [],
      ratings: [],
    };
    const supplierFindMany = jest.fn().mockResolvedValue([supplier]);
    const prisma = {
      procurementRequest: {
        findUnique: jest.fn().mockResolvedValue({
          id: "request-1",
          deliveryPincode: "201301",
          deliveryCity: "Noida",
          items: [item],
        }),
      },
      supplier: { findMany: supplierFindMany },
    } as never;

    await new ProcurementController(prisma).candidates("request-1");

    expect(supplierFindMany).toHaveBeenCalledWith({
      where: { status: "ACTIVE", deletedAt: null },
      include: {
        products: {
          where: { isActive: true, deletedAt: null },
          include: { catalogVariant: { include: { listing: true } } },
        },
        ratings: true,
      },
    });
  });
});
