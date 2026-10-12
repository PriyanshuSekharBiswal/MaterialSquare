import { RfqsController } from "./rfqs.module";
import { ProcurementController } from "../business/procurement/procurement.controller";

const requestId = "a410d118-1435-4c70-abeb-877ee40fa000";

describe("staff request status audit history", () => {
  it("records status changes with the staff actor in the same transaction", async () => {
    const auditLog = { create: jest.fn().mockResolvedValue({}) };
    const rfq = { updateMany: jest.fn().mockResolvedValue({ count: 1 }) };
    const tx = { auditLog, rfq };
    const prisma = { $transaction: jest.fn(async (work) => work(tx)) };
    const controller = new RfqsController(prisma as never, {} as never);

    await expect(
      controller.updateStatus(
        { user: { userId: "staff-1", role: "SALES_MANAGER" } } as never,
        requestId,
        { status: "CONTACTED" },
      ),
    ).resolves.toEqual({ id: requestId, status: "CONTACTED" });

    expect(auditLog.create).toHaveBeenCalledWith({
      data: {
        staffId: "staff-1",
        action: "RFQ_STATUS_UPDATED",
        entityType: "RFQ",
        entityId: requestId,
        metadata: { fields: ["status"], status: "CONTACTED" },
      },
    });
  });

  it("does not audit a missing request", async () => {
    const auditLog = { create: jest.fn() };
    const tx = {
      auditLog,
      rfq: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    const prisma = { $transaction: jest.fn(async (work) => work(tx)) };
    const controller = new RfqsController(prisma as never, {} as never);

    await expect(
      controller.updateStatus(
        { user: { userId: "staff-1", role: "SALES_MANAGER" } } as never,
        requestId,
        { status: "CLOSED" },
      ),
    ).rejects.toThrow("Request not found");
    expect(auditLog.create).not.toHaveBeenCalled();
  });

  it("assigns an active staff owner and saves an internal note without logging its text", async () => {
    const auditLog = { create: jest.fn().mockResolvedValue({}) };
    const rfq = { updateMany: jest.fn().mockResolvedValue({ count: 1 }) };
    const staffUser = {
      findFirst: jest.fn().mockResolvedValue({ id: "staff-owner" }),
    };
    const tx = { auditLog, rfq, staffUser };
    const prisma = { $transaction: jest.fn(async (work) => work(tx)) };
    const controller = new RfqsController(prisma as never, {} as never);

    await expect(
      controller.updateStatus(
        { user: { userId: "staff-1", role: "SALES_MANAGER" } } as never,
        requestId,
        {
          assignedStaffId: "11111111-1111-4111-8111-111111111111",
          staffNotes: "Call after 4 PM about site access",
        },
      ),
    ).resolves.toEqual({
      id: requestId,
      assignedStaffId: "11111111-1111-4111-8111-111111111111",
      staffNotes: "Call after 4 PM about site access",
    });

    expect(staffUser.findFirst).toHaveBeenCalledWith({
      where: {
        id: "11111111-1111-4111-8111-111111111111",
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });
    expect(rfq.updateMany).toHaveBeenCalledWith({
      where: { id: requestId },
      data: {
        assignedStaffId: "11111111-1111-4111-8111-111111111111",
        staffNotes: "Call after 4 PM about site access",
      },
    });
    const auditMetadata = auditLog.create.mock.calls[0][0].data.metadata;
    expect(auditMetadata).toMatchObject({
      fields: ["assignedStaffId", "staffNotes"],
      assignedStaffId: "11111111-1111-4111-8111-111111111111",
    });
    expect(JSON.stringify(auditMetadata)).not.toContain("Call after 4 PM");
  });

  it("rejects assignment to inactive or missing staff", async () => {
    const auditLog = { create: jest.fn() };
    const rfq = { updateMany: jest.fn() };
    const staffUser = { findFirst: jest.fn().mockResolvedValue(null) };
    const tx = { auditLog, rfq, staffUser };
    const prisma = { $transaction: jest.fn(async (work) => work(tx)) };
    const controller = new RfqsController(prisma as never, {} as never);

    await expect(
      controller.updateStatus(
        { user: { userId: "staff-1", role: "SALES_MANAGER" } } as never,
        requestId,
        { assignedStaffId: "11111111-1111-4111-8111-111111111111" },
      ),
    ).rejects.toThrow("Active staff owner not found");
    expect(rfq.updateMany).not.toHaveBeenCalled();
    expect(auditLog.create).not.toHaveBeenCalled();
  });
});

describe("procurement view of incoming customer requests", () => {
  it("automatically returns a catalogue comparison summary without changing the RFQ", async () => {
    const request = {
      id: requestId,
      requestNumber: "MS-RF-2026-a0ab-af0edb-hib-0a",
      siteLocation: "42 Test Road, Noida 201301",
      status: "NEW",
      createdAt: new Date("2026-10-12T10:00:00.000Z"),
      items: [{ material: "PPC Cement", brand: "BuildCo", category: "cement", quantity: 100, unit: "bag", specification: "", source: "customer_request" }],
    };
    const supplier = {
      id: "supplier-1",
      name: "Supplier 1",
      phone: "9000000000",
      city: "Noida",
      state: "Uttar Pradesh",
      pincode: "201301",
      servicePincodes: [],
      ratings: [],
      products: [{
        productName: "PPC Cement", brand: "BuildCo", category: "cement", unit: "bag",
        catalogVariantId: null, catalogVariant: null, availableQuantity: null,
        availabilityCheckedAt: null, minimumOrderQty: null, lastQuotedPrice: null,
        updatedAt: new Date("2026-10-01T00:00:00.000Z"),
      }],
    };
    const rfqFindMany = jest.fn().mockResolvedValue([request]);
    const supplierFindMany = jest.fn().mockResolvedValue([supplier]);
    const prisma = { rfq: { findMany: rfqFindMany }, supplier: { findMany: supplierFindMany } };
    const controller = new ProcurementController(prisma as never);

    const result = await controller.customerRfqs();

    expect(result[0]).toMatchObject({
      locationParsed: true,
      deliveryCity: "Noida",
      deliveryPincode: "201301",
      matchSummary: {
        matchedSupplierCount: 1,
        requestedItems: [{ coverage: "unknown", matchedSupplierCount: 1 }],
      },
    });
    expect(supplierFindMany).toHaveBeenCalledTimes(1);
    expect(rfqFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
    expect(prisma).not.toHaveProperty("$transaction");
  });
});

describe("staff RFQ attachment downloads", () => {
  it("streams the requested RFQ attachment from private storage", async () => {
    const attachmentId = "a410d118-1435-4c70-abeb-877ee40fa001";
    const attachment = {
      id: attachmentId,
      rfqId: requestId,
      fileName: "20x45-Model.pdf",
      mimeType: "application/pdf",
      byteSize: 123,
      storageKey: "rfq-attachments/private-object",
      content: null,
    };
    const findFirst = jest.fn().mockResolvedValue(attachment);
    const prisma = { rfqAttachment: { findFirst } };
    const stream = {
      on: jest.fn().mockReturnThis(),
      pipe: jest.fn(),
      closeClient: jest.fn(),
    };
    const openPrivateFile = jest.fn().mockResolvedValue(stream);
    const controller = new RfqsController(
      prisma as never,
      { openPrivateFile } as never,
    );
    const response = {
      set: jest.fn().mockReturnThis(),
      end: jest.fn(),
      status: jest.fn().mockReturnThis(),
      destroy: jest.fn(),
    };

    await controller.downloadAttachment(
      requestId,
      attachmentId,
      response as never,
    );

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: attachmentId, rfqId: requestId },
    });
    expect(response.set).toHaveBeenCalledWith(
      expect.objectContaining({
        "Cache-Control": "private, no-store",
        "Content-Type": "application/pdf",
        "X-Content-Type-Options": "nosniff",
      }),
    );
    expect(response.end).not.toHaveBeenCalled();
    expect(stream.pipe).toHaveBeenCalledWith(response);
    expect(openPrivateFile).toHaveBeenCalledWith(attachment.storageKey);
  });
});
