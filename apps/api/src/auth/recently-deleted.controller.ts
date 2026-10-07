import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { StaffRequest } from "./staff-request";
import { StaffGuard } from "./access.guard";
import { roleHasPermission } from "./staff-access";
import { PrismaService } from "../prisma/prisma.service";

@Controller("admin/recently-deleted")
@UseGuards(StaffGuard)
export class RecentlyDeletedController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Req() req: StaffRequest) {
    const now = new Date();
    await this.prisma.recentlyDeletedRecord.deleteMany({
      where: { expiresAt: { lte: now } },
    });
    const entityTypes: string[] = [];
    if (roleHasPermission(req.user.role, "catalog.manage"))
      entityTypes.push("CATALOG_PRODUCT");
    if (roleHasPermission(req.user.role, "procurement.manage"))
      entityTypes.push("SUPPLIER", "SUPPLIER_PRODUCT");
    if (roleHasPermission(req.user.role, "staff.manage"))
      entityTypes.push("STAFF_USER");
    if (!entityTypes.length) return [];
    return this.prisma.recentlyDeletedRecord.findMany({
      where: {
        entityType: { in: entityTypes },
        restoredAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { deletedAt: "desc" },
    });
  }

  @Post(":id/restore")
  async restore(@Param("id") id: string, @Req() req: StaffRequest) {
    const now = new Date();
    const record = await this.prisma.recentlyDeletedRecord.findFirst({
      where: { id, restoredAt: null, expiresAt: { gt: now } },
    });
    if (!record) throw new NotFoundException("Recovery period has expired");

    const permissionByType: Record<string, "catalog.manage" | "procurement.manage" | "staff.manage"> = {
      CATALOG_PRODUCT: "catalog.manage",
      SUPPLIER: "procurement.manage",
      SUPPLIER_PRODUCT: "procurement.manage",
      STAFF_USER: "staff.manage",
    };
    const requiredPermission = permissionByType[record.entityType];
    if (!requiredPermission || !roleHasPermission(req.user.role, requiredPermission))
      throw new NotFoundException("This item is not available to your role");

    const metadata = (record.metadata || {}) as Prisma.JsonObject;
    const actor = await this.prisma.staffUser.findUnique({
      where: { id: req.user.userId },
      select: { name: true },
    });
    if (!actor) throw new NotFoundException("Staff account not found");

    await this.prisma.$transaction(async (tx) => {
      if (record.entityType === "CATALOG_PRODUCT") {
        const result = await tx.catalogListing.updateMany({
          where: { id: record.entityId, deletedAt: { not: null } },
          data: {
            deletedAt: null,
            isPublished: metadata.wasPublished === true,
          },
        });
        if (!result.count) throw new NotFoundException("Product no longer exists");
      } else if (record.entityType === "SUPPLIER") {
        const result = await tx.supplier.updateMany({
          where: { id: record.entityId, deletedAt: { not: null } },
          data: { deletedAt: null },
        });
        if (!result.count) throw new NotFoundException("Supplier no longer exists");
      } else if (record.entityType === "SUPPLIER_PRODUCT") {
        const result = await tx.supplierProduct.updateMany({
          where: { id: record.entityId, deletedAt: { not: null } },
          data: {
            deletedAt: null,
            isActive: metadata.wasActive === true,
          },
        });
        if (!result.count) throw new NotFoundException("Supplier product no longer exists");
      } else if (record.entityType === "STAFF_USER") {
        const result = await tx.staffUser.updateMany({
          where: { id: record.entityId, deletedAt: { not: null } },
          data: {
            deletedAt: null,
            isActive: metadata.wasActive === true,
            authVersion: { increment: 1 },
          },
        });
        if (!result.count) throw new NotFoundException("Staff account no longer exists");
      }

      await tx.recentlyDeletedRecord.update({
        where: { id: record.id },
        data: {
          restoredAt: now,
          restoredById: req.user.userId,
          restoredByName: actor.name,
        },
      });
      await tx.auditLog.create({
        data: {
          staffId: req.user.userId,
          action: `${record.entityType}_RESTORED`,
          entityType: record.entityType,
          entityId: record.entityId,
          metadata: {
            displayName: record.displayName,
            deletedBy: record.deletedByName,
            deletedAt: record.deletedAt.toISOString(),
          },
        },
      });
    });
    return { success: true };
  }
}
