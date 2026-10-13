import { matchSupplierCatalogue } from "./supplier-matching";

const makeSupplier = (options: {
  id: string;
  pincode?: string;
  servicePincodes?: string[];
  quantity?: number | null;
  checkedAt?: Date | null;
  minimumOrderQty?: number | null;
  productUpdatedAt?: Date;
  catalogVariantId?: string | null;
}) => ({
  id: options.id,
  name: options.id,
  phone: "9000000000",
  city: "Noida",
  state: "Uttar Pradesh",
  pincode: options.pincode || "201301",
  servicePincodes: options.servicePincodes || [],
  ratings: [],
  products: [{
    productName: "PPC Cement",
    brand: "BuildCo",
    category: "cement",
    unit: "bag",
    catalogVariantId: options.catalogVariantId ?? null,
    catalogVariant: null,
    availableQuantity: options.quantity == null ? null : String(options.quantity),
    availabilityCheckedAt: options.checkedAt ?? null,
    minimumOrderQty: options.minimumOrderQty == null ? null : String(options.minimumOrderQty),
    lastQuotedPrice: "350",
    updatedAt: options.productUpdatedAt || new Date(),
  }],
});

describe("supplier matching suggestions", () => {
  it("suggests a split across suppliers using fresh recorded capacity while preserving unknown stock", async () => {
    const suppliers = [
      makeSupplier({ id: "exact-pin", quantity: 40, checkedAt: new Date(), minimumOrderQty: 10 }),
      makeSupplier({ id: "service-pin", pincode: "201305", servicePincodes: ["201301"], quantity: 60, checkedAt: new Date(), minimumOrderQty: 20 }),
      makeSupplier({ id: "unknown-stock", pincode: "110001", quantity: null, checkedAt: null }),
    ];
    const prisma = { supplier: { findMany: jest.fn().mockResolvedValue(suppliers) } } as never;
    const result = await matchSupplierCatalogue(prisma, {
      deliveryPincode: "201301",
      deliveryCity: "Noida",
      items: [{ productName: "PPC Cement", brand: "BuildCo", category: "cement", unit: "bag", quantity: 100 }],
    });

    expect(result.candidates.map((candidate) => candidate.id)).toEqual(["exact-pin", "service-pin", "unknown-stock"]);
    expect(result.requestedItems[0]).toMatchObject({ coverage: "covered", knownFreshCapacity: 100 });
    expect(result.requestedItems[0].allocationSuggestions).toEqual([
      { supplierName: "exact-pin", quantity: 40 },
      { supplierName: "service-pin", quantity: 60 },
    ]);
    expect(result.candidates[2].matchedProducts[0]).toMatchObject({ availabilityStatus: "unknown", availableFreshQuantity: null });
    expect(result.disclaimer).toContain("Confirm current stock, price, and delivery terms");
  });

  it("does not count stale stock or suggest a split below a supplier minimum", async () => {
    const suppliers = [
      makeSupplier({ id: "stale", quantity: 80, checkedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), minimumOrderQty: 1 }),
      makeSupplier({ id: "below-minimum", pincode: "201305", quantity: 10, checkedAt: new Date(), minimumOrderQty: 20 }),
    ];
    const prisma = { supplier: { findMany: jest.fn().mockResolvedValue(suppliers) } } as never;
    const result = await matchSupplierCatalogue(prisma, {
      deliveryPincode: "201301",
      deliveryCity: "Noida",
      items: [{ productName: "PPC Cement", brand: "BuildCo", category: "cement", unit: "bag", quantity: 50 }],
    });

    expect(result.requestedItems[0].coverage).toBe("minimum-order");
    expect(result.requestedItems[0].knownFreshCapacity).toBe(10);
    expect(result.candidates[0].matchedProducts[0].availabilityStatus).toBe("outdated");
    expect(result.requestedItems[0].allocationSuggestions).toEqual([]);
  });

  it("keeps out-of-area listings visible but excludes them from nearby quantity coverage", async () => {
    const suppliers = [makeSupplier({
      id: "remote-stock",
      pincode: "110001",
      quantity: 100,
      checkedAt: new Date(),
      minimumOrderQty: 1,
    })];
    const prisma = { supplier: { findMany: jest.fn().mockResolvedValue(suppliers) } } as never;
    const result = await matchSupplierCatalogue(prisma, {
      deliveryPincode: "201301",
      deliveryCity: "Ghaziabad",
      deliveryState: "Uttar Pradesh",
      items: [{ productName: "PPC Cement", brand: "BuildCo", category: "cement", unit: "bag", quantity: 50 }],
    });

    expect(result.candidates).toHaveLength(1);
    expect(result.requestedItems[0]).toMatchObject({
      matchedSupplierCount: 1,
      outsideRecordedAreaCount: 1,
      knownFreshCapacity: 0,
      coverage: "unknown",
      allocationSuggestions: [],
    });
  });

  it("requires an exact catalogue variant when the request has a variant ID", async () => {
    const supplier = makeSupplier({ id: "wrong-variant", quantity: 20, checkedAt: new Date(), catalogVariantId: "variant-b" });
    const prisma = { supplier: { findMany: jest.fn().mockResolvedValue([supplier]) } } as never;
    const result = await matchSupplierCatalogue(prisma, {
      deliveryPincode: "201301",
      deliveryCity: "Noida",
      items: [{ productName: "PPC Cement", brand: "BuildCo", category: "cement", unit: "bag", quantity: 10, catalogVariantId: "variant-a" }],
    });

    expect(result.candidates).toHaveLength(0);
    expect(result.requestedItems[0].coverage).toBe("no-listing");
  });
});
