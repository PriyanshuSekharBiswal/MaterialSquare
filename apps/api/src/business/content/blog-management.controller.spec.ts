import { PrismaService } from "../../prisma/prisma.service";
import type { StaffRequest } from "../../auth/staff-request";
import { BlogManagementController } from "./blog-management.controller";

describe("blog management audit history", () => {
  const request = {
    user: { userId: "staff-1", role: "OWNER" },
  } as StaffRequest;

  it("records create, update, and archive transactionally without copying article text", async () => {
    const auditLog = { create: jest.fn().mockResolvedValue({}) };
    const blogPost = {
      create: jest.fn().mockResolvedValue({ id: "blog-1", status: "DRAFT" }),
      findUnique: jest
        .fn()
        .mockResolvedValue({ id: "blog-1", publishedAt: null }),
      update: jest
        .fn()
        .mockResolvedValueOnce({ id: "blog-1", status: "PUBLISHED" })
        .mockResolvedValueOnce({ id: "blog-1", status: "ARCHIVED" }),
    };
    const transaction = { auditLog, blogPost };
    const prisma = {
      $transaction: jest.fn((work: (tx: typeof transaction) => unknown) =>
        work(transaction),
      ),
    };
    const controller = new BlogManagementController(
      prisma as unknown as PrismaService,
    );

    await controller.create(request, {
      title: "Material notes",
      slug: "material-notes",
      summary: "Notes about choosing building materials.",
      body: "Long internal editorial copy about materials and applications.",
    });
    await controller.update(request, "blog-1", {
      status: "PUBLISHED",
      body: "Updated editorial text",
    });
    await controller.archive(request, "blog-1");

    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
    expect(auditLog.create.mock.calls.map(([call]) => call.data)).toEqual([
      expect.objectContaining({
        staffId: "staff-1",
        action: "BLOG_CREATED",
        entityType: "BLOG_POST",
        entityId: "blog-1",
        metadata: {
          fields: expect.arrayContaining(["title", "body"]),
          status: "DRAFT",
        },
      }),
      expect.objectContaining({
        staffId: "staff-1",
        action: "BLOG_PUBLISHED",
        entityType: "BLOG_POST",
        entityId: "blog-1",
        metadata: { fields: ["body", "status"], status: "PUBLISHED" },
      }),
      expect.objectContaining({
        staffId: "staff-1",
        action: "BLOG_ARCHIVED",
        entityType: "BLOG_POST",
        entityId: "blog-1",
        metadata: { fields: ["status", "publishedAt"], status: "ARCHIVED" },
      }),
    ]);
    const serializedAudit = JSON.stringify(auditLog.create.mock.calls);
    expect(serializedAudit).not.toContain("Long internal editorial copy");
    expect(serializedAudit).not.toContain("Updated editorial text");
  });
});
