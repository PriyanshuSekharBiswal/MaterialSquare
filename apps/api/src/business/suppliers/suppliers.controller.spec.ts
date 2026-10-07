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
      address: "Market Road",
      city: "Noida",
      pincode: "201301",
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.supplier.create).toHaveBeenCalledTimes(1);
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
});
