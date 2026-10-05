import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

export type CreateCommissionInput = {
  customerId?: string;
  orderId?: string;
  beneficiaryName: string;
  beneficiaryPhone?: string;
  basisAmount: number;
  ratePct: number;
  notes?: string;
};

const commissionApproverRoles = ["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"];

@Injectable()
export class CommissionsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.commissionRecord.findMany({
      select: {
        id: true,
        beneficiaryName: true,
        amount: true,
        ratePct: true,
        basisAmount: true,
        status: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(input: CreateCommissionInput, staffId: string) {
    if (
      input.customerId &&
      !(await this.prisma.customer.count({ where: { id: input.customerId } }))
    )
      throw new NotFoundException("Customer not found");
    if (
      input.orderId &&
      !(await this.prisma.order.count({ where: { id: input.orderId } }))
    )
      throw new NotFoundException("Order not found");

    const {
      basisAmount: basisAmountValue,
      ratePct: ratePctValue,
      ...details
    } = input;
    const basisAmount = new Prisma.Decimal(basisAmountValue);
    const ratePct = new Prisma.Decimal(ratePctValue);
    return this.prisma.$transaction(async (db) => {
      const record = await db.commissionRecord.create({
        data: {
          ...details,
          basisAmount,
          ratePct,
          amount: basisAmount.mul(ratePct).div(100).toDecimalPlaces(2),
        },
      });
      await db.auditLog.create({
        data: {
          staffId,
          action: "COMMISSION_CREATED",
          entityType: "COMMISSION",
          entityId: record.id,
          metadata: {
            orderId: record.orderId,
            customerId: record.customerId,
            amount: record.amount.toString(),
            status: record.status,
          },
        },
      });
      return record;
    });
  }

  async approve(id: string, staffId: string, role: string) {
    if (!commissionApproverRoles.includes(role))
      throw new ForbiddenException(
        "An accounts user must approve this commission",
      );

    return this.prisma.$transaction(async (db) => {
      const record = await db.commissionRecord.findUnique({ where: { id } });
      if (!record) throw new NotFoundException("Commission record not found");
      if (record.status !== "PENDING_REVIEW")
        throw new ConflictException("Only pending commissions can be approved");

      const claim = await db.commissionRecord.updateMany({
        where: { id, status: "PENDING_REVIEW" },
        data: {
          status: "APPROVED",
          approvedById: staffId,
          approvedAt: new Date(),
        },
      });
      if (claim.count !== 1)
        throw new ConflictException(
          "Commission review state changed; refresh and try again",
        );
      const approved = await db.commissionRecord.findUniqueOrThrow({
        where: { id },
      });
      await db.auditLog.create({
        data: {
          staffId,
          action: "COMMISSION_APPROVED",
          entityType: "COMMISSION",
          entityId: id,
          metadata: { amount: approved.amount.toString() },
        },
      });
      return approved;
    });
  }
}
