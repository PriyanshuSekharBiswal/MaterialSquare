import { ConflictException } from "@nestjs/common";
import { SuppliersController } from "./suppliers.controller";

const staff = {
  user: { userId: "staff-1", role: "PROCUREMENT_HEAD" },
} as never;

describe("supplier audit history", () => {
  it("records supplier creation in the same transaction without copying contact data", async () => {
    const supplier = { id: "supplier-1", status: "PENDING" };
    const auditCreate = jest.fn();
    const tx = {
      supplier: { create: jest.fn().mockResolvedValue(supplier) },
      auditLog: { create: auditCreate },
    };
    const transaction = jest.fn(async (work: (db: typeof tx) => unknown) =>
      work(tx),
    );
    const prisma = { $transaction: transaction } as never;
    const controller = new SuppliersController(prisma);

    await controller.create(staff, {
      name: "North Supply",
      phone: "9876543210",
      gstin: "",
      address: "Market Road",
      city: "Noida",
      pincode: "201301",
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.supplier.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ gstin: null }),
    });
    expect(auditCreate).toHaveBeenCalledWith({
      data: {
        staffId: "staff-1",
        action: "SUPPLIER_CREATED",
        entityType: "SUPPLIER",
        entityId: "supplier-1",
        metadata: { status: "PENDING" },
      },
    });
  });

  it("records supplier edits by field names rather than storing the submitted values", async () => {
    const supplier = { id: "supplier-1", status: "SUSPENDED" };
    const auditCreate = jest.fn();
    const tx = {
      supplier: {
        findFirst: jest.fn().mockResolvedValue({ id: "supplier-1", deletedAt: null }),
        update: jest.fn().mockResolvedValue(supplier),
      },
      auditLog: { create: auditCreate },
    };
    const prisma = {
      $transaction: async (work: (db: typeof tx) => unknown) => work(tx),
    } as never;
    const controller = new SuppliersController(prisma);

    await controller.update("supplier-1", staff, {
      phone: "9876543210",
      status: "SUSPENDED",
    });

    expect(auditCreate).toHaveBeenCalledWith({
      data: {
        staffId: "staff-1",
        action: "SUPPLIER_UPDATED",
        entityType: "SUPPLIER",
        entityId: "supplier-1",
        metadata: { changedFields: ["phone", "status"] },
      },
    });
    expect(JSON.stringify(auditCreate.mock.calls)).not.toContain("9876543210");
  });

  it("returns a useful conflict when a supplier GSTIN already exists", async () => {
    const prismaError = Object.assign(new Error("unique constraint"), {
      code: "P2002",
      meta: { target: ["gstin"] },
    });
    const controller = new SuppliersController({
      $transaction: jest.fn().mockRejectedValue(prismaError),
    } as never);

    const create = controller.create(staff, {
      name: "North Supply",
      phone: "9876543210",
      address: "Market Road",
      city: "Noida",
      pincode: "201301",
      gstin: "09ABCDE1234F1Z5",
    });
    await expect(create).rejects.toBeInstanceOf(ConflictException);
    await expect(create).rejects.toThrow(
      "A supplier with this GSTIN is already registered.",
    );
  });

  it("returns a useful conflict when a supplier already lists a product and brand", async () => {
    const prismaError = Object.assign(new Error("unique constraint"), {
      code: "P2002",
      meta: { target: ["supplierId", "productName", "brand"] },
    });
    const controller = new SuppliersController({
      $transaction: jest.fn().mockRejectedValue(prismaError),
    } as never);

    const addProduct = controller.addProduct("supplier-1", staff, {
      productName: "UltraTech Cement 50 kg",
      brand: "UltraTech Cement",
      category: "Cement & Aggregates",
      unit: "50 kg bag",
      availableQuantity: 120,
    });
    await expect(addProduct).rejects.toBeInstanceOf(ConflictException);
    await expect(addProduct).rejects.toThrow(
      "This supplier already has a listing for that unlinked product and brand.",
    );
  });

  it("returns a catalogue-pack-specific conflict for an exact duplicate link", async () => {
    const prismaError = Object.assign(new Error("unique constraint"), {
      code: "P2002",
      meta: { target: ["supplierId", "catalogVariantId"] },
    });
    const controller = new SuppliersController({
      $transaction: jest.fn().mockRejectedValue(prismaError),
    } as never);

    const addProduct = controller.addProduct("supplier-1", staff, {
      catalogVariantId: "refv-ultratech-ppc-50",
      productName: "UltraTech PPC Cement, 50 kg",
      brand: "UltraTech Cement",
      category: "Cement",
      unit: "bag",
    });
    await expect(addProduct).rejects.toBeInstanceOf(ConflictException);
    await expect(addProduct).rejects.toThrow(
      "This supplier already has a listing for that catalogue pack.",
    );
  });
});
