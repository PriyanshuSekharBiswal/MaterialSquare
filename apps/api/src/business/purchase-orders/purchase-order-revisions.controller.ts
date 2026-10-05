import {
  Body,
  ConflictException,
  Controller,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { StaffRequest } from "../../auth/staff-request";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { StaffGuard } from "../../auth/access.guard";
import { validate } from "../../common/validation";
import { PrismaService } from "../../prisma/prisma.service";

const revisionInput = z.object({
  expectedUpdatedAt: z.string().datetime(),
  reason: z.string().trim().min(5).max(2000),
  shippingAddress: z.string().trim().min(2).max(500),
  shippingContact: z.string().trim().min(10).max(100),
  subtotal: z.number().finite().nonnegative().max(999999999),
  taxAmount: z.number().finite().nonnegative().max(999999999),
  freightAmount: z.number().finite().nonnegative().max(999999999),
  notes: z.string().max(5000).optional(),
});

@Controller("purchase-orders")
@UseGuards(StaffGuard)
export class PurchaseOrderRevisionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post(":id/revisions")
  async revise(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: StaffRequest,
  ) {
    const input = validate(revisionInput, body);
    return this.prisma.$transaction(async (db) => {
      const original = await db.purchaseOrder.findUnique({ where: { id } });
      if (!original) throw new NotFoundException("Purchase order not found");
      if (
        !["DRAFT", "PENDING_APPROVAL", "APPROVED", "SENT"].includes(
          original.status,
        )
      )
        throw new ConflictException(
          "This purchase order cannot be revised in its current state",
        );
      const history = Array.isArray(original.revisionHistory)
        ? original.revisionHistory
        : [];
      const snapshot = {
        revisionNumber: original.revisionNumber,
        status: original.status,
        shippingAddress: original.shippingAddress,
        shippingContact: original.shippingContact,
        items: original.items,
        subtotal: original.subtotal.toString(),
        taxAmount: original.taxAmount.toString(),
        freightAmount: original.freightAmount.toString(),
        totalAmount: original.totalAmount.toString(),
        notes: original.notes,
        approvedById: original.approvedById,
        approvedAt: original.approvedAt?.toISOString() || null,
        sentAt: original.sentAt?.toISOString() || null,
        revisedById: req.user.userId,
        revisedAt: new Date().toISOString(),
        reason: input.reason,
      };
      const changed = await db.purchaseOrder.updateMany({
        where: {
          id,
          updatedAt: new Date(input.expectedUpdatedAt),
          status: original.status,
        },
        data: {
          shippingAddress: input.shippingAddress,
          shippingContact: input.shippingContact,
          subtotal: input.subtotal,
          taxAmount: input.taxAmount,
          freightAmount: input.freightAmount,
          totalAmount: new Prisma.Decimal(input.subtotal)
            .add(input.taxAmount)
            .add(input.freightAmount),
          notes: input.notes ?? null,
          status: "DRAFT",
          approvedById: null,
          approvedAt: null,
          sentAt: null,
          revisionNumber: { increment: 1 },
          revisionHistory: [...history, snapshot] as Prisma.InputJsonArray,
        },
      });
      if (changed.count !== 1)
        throw new ConflictException(
          "The purchase order changed; refresh before revising it",
        );
      await db.procurementRequest.update({
        where: { id: original.requestId },
        data: { status: "APPROVAL_PENDING" },
      });
      await db.auditLog.create({
        data: {
          staffId: req.user.userId,
          action: "PURCHASE_ORDER_REVISED",
          entityType: "PURCHASE_ORDER",
          entityId: id,
          metadata: {
            previousRevisionNumber: original.revisionNumber,
            revisionNumber: original.revisionNumber + 1,
            reason: input.reason,
          },
        },
      });
      return db.purchaseOrder.findUniqueOrThrow({ where: { id } });
    });
  }
}
