import { NotFoundException } from "@nestjs/common";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Readable } from "node:stream";
import { CustomerController } from "./customer.controller";

const rfqId = "a410d118-1435-4c70-abeb-877ee40fa000";
const attachmentId = "a410d118-1435-4c70-abeb-877ee40fa001";

describe("customer RFQ attachment downloads", () => {
  it("streams private storage files without ending the response first", async () => {
    const attachment = {
      id: attachmentId,
      rfqId,
      fileName: "project-plan.pdf",
      mimeType: "application/pdf",
      byteSize: 42,
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
    const storage = { openPrivateFile };
    const controller = new CustomerController(
      prisma as never,
      {} as never,
      {} as never,
      storage as never,
    );
    const response = {
      set: jest.fn().mockReturnThis(),
      end: jest.fn(),
      status: jest.fn().mockReturnThis(),
      destroy: jest.fn(),
    };

    await controller.downloadRfqAttachment(
      { customerId: "customer-1" } as never,
      rfqId,
      attachmentId,
      response as never,
    );

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: attachmentId,
        rfqId,
        rfq: { customerId: "customer-1" },
      },
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

  it("does not open a private file when the RFQ is not owned by the customer", async () => {
    const prisma = {
      rfqAttachment: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const openPrivateFile = jest.fn();
    const controller = new CustomerController(
      prisma as never,
      {} as never,
      {} as never,
      { openPrivateFile } as never,
    );

    await expect(
      controller.downloadRfqAttachment(
        { customerId: "customer-2" } as never,
        rfqId,
        attachmentId,
        {} as never,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(openPrivateFile).not.toHaveBeenCalled();
  });

  it("serves legacy database-backed attachments directly", async () => {
    const attachment = {
      id: attachmentId,
      rfqId,
      fileName: "legacy-plan.pdf",
      mimeType: "application/pdf",
      byteSize: 4,
      storageKey: null,
      content: new Uint8Array([37, 80, 68, 70]),
    };
    const response = { set: jest.fn().mockReturnThis(), end: jest.fn() };
    const controller = new CustomerController(
      {
        rfqAttachment: { findFirst: jest.fn().mockResolvedValue(attachment) },
      } as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await controller.downloadRfqAttachment(
      { customerId: "customer-1" } as never,
      rfqId,
      attachmentId,
      response as never,
    );

    expect(response.end).toHaveBeenCalledWith(Buffer.from([37, 80, 68, 70]));
  });
});

describe("customer RFQ plan uploads", () => {
  const payload = {
    customerName: "QA Customer",
    siteLocation: "QA construction site, Sector 10",
    city: "Noida",
    pincode: "201301",
    items: [],
  };

  it("stores a valid plan-only request as a private attachment", async () => {
    const directory = await mkdtemp(join(tmpdir(), "rfq-upload-test-"));
    const path = join(directory, "temporary-upload");
    const content = Buffer.from("%PDF-1.7 synthetic QA plan");
    await writeFile(path, content);
    const rfqCreate = jest
      .fn()
      .mockResolvedValue({ id: rfqId, status: "NEW", createdAt: new Date() });
    const customerUpdate = jest
      .fn()
      .mockResolvedValue({ id: "customer-1", phone: "9692804195" });
    const tx = {
      customer: { update: customerUpdate },
      rfq: { create: rfqCreate },
    };
    const prisma = {
      $transaction: jest.fn(async (work) => work(tx)),
      catalogListing: { findMany: jest.fn() },
    };
    const uploadPrivateFile = jest.fn().mockResolvedValue("stored-key");
    const controller = new CustomerController(
      prisma as never,
      {} as never,
      {} as never,
      { uploadPrivateFile, deletePrivateFile: jest.fn() } as never,
    );

    try {
      await expect(
        controller.createRfq(
          { customerId: "customer-1" } as never,
          { payload: JSON.stringify(payload) },
          [
            {
              path,
              originalname: "../../house-plan.pdf",
              size: content.length,
            },
          ],
        ),
      ).resolves.toMatchObject({ id: rfqId, status: "NEW" });

      expect(uploadPrivateFile).toHaveBeenCalledWith(
        expect.stringMatching(/^rfq-attachments\//),
        path,
        "application/pdf",
        content.length,
      );
      expect(rfqCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          customerId: "customer-1",
          attachments: {
            create: [
              expect.objectContaining({
                fileName: "house-plan.pdf",
                mimeType: "application/pdf",
                byteSize: content.length,
                storageKey: expect.stringMatching(/^rfq-attachments\//),
              }),
            ],
          },
        }),
        select: { id: true, status: true, createdAt: true },
      });
      await expect(rm(path)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("rejects a file whose content does not match an allowed plan format", async () => {
    const directory = await mkdtemp(join(tmpdir(), "rfq-upload-test-"));
    const path = join(directory, "invalid-upload");
    const content = Buffer.from("not a PDF");
    await writeFile(path, content);
    const prisma = {
      $transaction: jest.fn(),
      catalogListing: { findMany: jest.fn() },
    };
    const uploadPrivateFile = jest.fn();
    const controller = new CustomerController(
      prisma as never,
      {} as never,
      {} as never,
      { uploadPrivateFile, deletePrivateFile: jest.fn() } as never,
    );

    try {
      await expect(
        controller.createRfq(
          { customerId: "customer-1" } as never,
          { payload: JSON.stringify(payload) },
          [{ path, originalname: "plan.pdf", size: content.length }],
        ),
      ).rejects.toThrow("Use a PDF, JPEG, PNG, or WebP plan or photo.");
      expect(uploadPrivateFile).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
      await expect(rm(path)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
