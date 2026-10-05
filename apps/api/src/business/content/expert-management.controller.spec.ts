import { PrismaService } from "../../prisma/prisma.service";
import type { StaffRequest } from "../../auth/staff-request";
import { ExpertManagementController } from "./expert-management.controller";

describe("expert management audit history", () => {
  const request = {
    user: { userId: "staff-1", role: "OWNER" },
  } as StaffRequest;

  it("records expert publication changes without copying contact details", async () => {
    const auditLog = { create: jest.fn().mockResolvedValue({}) };
    const expertAdvisor = {
      create: jest
        .fn()
        .mockResolvedValue({ id: "expert-1", isPublished: false }),
      update: jest
        .fn()
        .mockResolvedValue({ id: "expert-1", isPublished: true }),
    };
    const transaction = { auditLog, expertAdvisor };
    const prisma = {
      $transaction: jest.fn((work: (tx: typeof transaction) => unknown) =>
        work(transaction),
      ),
    };
    const controller = new ExpertManagementController(
      prisma as unknown as PrismaService,
    );

    await controller.create(request, {
      name: "Example Expert",
      serviceType: "Electrical consultation",
      expertise: "Residential wiring and safety",
      phone: "9876543210",
      email: "expert@example.com",
      servicePincodes: ["560001", "560002"],
    });
    await controller.update(request, "expert-1", {
      phone: "9876543210",
      email: "expert@example.com",
      isPublished: true,
      servicePincodes: ["560001", "560002", "560003"],
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(auditLog.create.mock.calls.map(([call]) => call.data)).toEqual([
      expect.objectContaining({
        staffId: "staff-1",
        action: "EXPERT_CREATED",
        entityType: "EXPERT_ADVISOR",
        entityId: "expert-1",
        metadata: {
          fields: expect.arrayContaining(["name", "phone", "email"]),
          isPublished: false,
          servicePincodeCount: 2,
        },
      }),
      expect.objectContaining({
        staffId: "staff-1",
        action: "EXPERT_PUBLISHED",
        entityType: "EXPERT_ADVISOR",
        entityId: "expert-1",
        metadata: {
          fields: expect.arrayContaining(["phone", "email", "isPublished"]),
          isPublished: true,
          servicePincodeCount: 3,
        },
      }),
    ]);
    const serializedAudit = JSON.stringify(auditLog.create.mock.calls);
    expect(serializedAudit).not.toContain("9876543210");
    expect(serializedAudit).not.toContain("expert@example.com");
  });
});
