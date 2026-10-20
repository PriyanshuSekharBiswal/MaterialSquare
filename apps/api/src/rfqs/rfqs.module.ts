import {
  Module,
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Patch,
  Param,
  NotFoundException,
  Res,
  Query,
} from "@nestjs/common";
import type { Response } from "express";
import { StorageModule } from "../storage/storage.module";
import { StorageService } from "../storage/storage.service";
import { z } from "zod";
import { PrismaService } from "../prisma/prisma.service";
import { StaffGuard } from "../auth/access.guard";
import { CustomerGuard } from "../auth/customer.guard";
import type { StaffRequest } from "../auth/staff-request";
import { validate } from "../common/validation";
import { paginatedResult, parsePagination } from "../common/pagination";
@Controller("rfqs")
export class RfqsController {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}
  @Patch(":id/status")
  @UseGuards(StaffGuard)
  async updateStatus(
    @Req() req: StaffRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const data = validate(
      z
        .object({
          status: z.enum(["NEW", "CONTACTED", "QUOTED", "CLOSED"]).optional(),
          assignedStaffId: z.string().uuid().nullable().optional(),
          staffNotes: z.string().trim().max(3000).nullable().optional(),
        })
        .refine(
          (value) =>
            value.status !== undefined ||
            value.assignedStaffId !== undefined ||
            value.staffNotes !== undefined,
          "Choose a request status, owner, or internal note to update",
        ),
      body,
    );
    await this.prisma.$transaction(async (tx) => {
      if (data.assignedStaffId) {
        const assignee = await tx.staffUser.findFirst({
          where: {
            id: data.assignedStaffId,
            isActive: true,
            deletedAt: null,
          },
          select: { id: true },
        });
        if (!assignee)
          throw new NotFoundException("Active staff owner not found");
      }
      const updateData = {
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.assignedStaffId !== undefined
          ? { assignedStaffId: data.assignedStaffId }
          : {}),
        ...(data.staffNotes !== undefined
          ? { staffNotes: data.staffNotes }
          : {}),
      };
      const changed = await tx.rfq.updateMany({
        where: { id },
        data: updateData,
      });
      if (!changed.count) throw new NotFoundException("Request not found");
      const fields = Object.keys(updateData).sort();
      await tx.auditLog.create({
        data: {
          staffId: req.user.userId,
          action:
            fields.length === 1 && fields[0] === "status"
              ? "RFQ_STATUS_UPDATED"
              : "RFQ_UPDATED",
          entityType: "RFQ",
          entityId: id,
          metadata: {
            fields,
            ...(data.status !== undefined ? { status: data.status } : {}),
            ...(data.assignedStaffId !== undefined
              ? { assignedStaffId: data.assignedStaffId }
              : {}),
          },
        },
      });
    });
    return { id, ...data };
  }
  @Get("assignees")
  @UseGuards(StaffGuard)
  assignees() {
    return this.prisma.staffUser.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    });
  }

  @Get()
  @UseGuards(StaffGuard)
  async list(
    @Query("page") pageInput?: string,
    @Query("pageSize") pageSizeInput?: string,
  ) {
    const pagination = pageInput !== undefined || pageSizeInput !== undefined
      ? parsePagination(pageInput, pageSizeInput)
      : undefined;
    const rows = await this.prisma.rfq.findMany({
      ...(pagination
        ? { skip: pagination.skip, take: pagination.pageSize + 1 }
        : {}),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        customer: {
          select: {
            email: true,
            companyName: true,
            gstin: true,
            shippingAddress: true,
            city: true,
            pincode: true,
          },
        },
        assignedStaff: { select: { id: true, name: true } },
        attachments: {
          select: {
            id: true,
            fileName: true,
            mimeType: true,
            byteSize: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    return pagination ? paginatedResult(rows, pagination) : rows;
  }

  @Get(":id/journey")
  @UseGuards(StaffGuard)
  async journey(@Param("id") id: string) {
    const rfq = await this.prisma.rfq.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!rfq) throw new NotFoundException("Request not found");
    const [quotationCount, acceptedCount, draftCount, orderStatuses] =
      await Promise.all([
        this.prisma.quotation.count({ where: { requestId: id } }),
        this.prisma.quotation.count({
          where: {
            requestId: id,
            status: { in: ["ACCEPTED", "CONVERTED_TO_ORDER"] },
          },
        }),
        this.prisma.quotation.count({
          where: {
            requestId: id,
            publishedAt: null,
            status: {
              notIn: ["QUOTE_SENT", "EXPIRED", "REJECTED", "ACCEPTED", "CONVERTED_TO_ORDER"],
            },
          },
        }),
        this.prisma.order.groupBy({
          by: ["status"],
          where: { quotation: { requestId: id } },
          _count: { _all: true },
        }),
      ]);
    const orders = orderStatuses.map(({ status, _count }) => ({
      status,
      count: _count._all,
    }));
    return {
      requestId: id,
      quotations: {
        total: quotationCount,
        sent: quotationCount - draftCount,
        draft: draftCount,
        accepted: acceptedCount,
      },
      orders: {
        total: orders.reduce((total, order) => total + order.count, 0),
        statuses: orders,
      },
    };
  }

  @Get(":id")
  @UseGuards(StaffGuard)
  async findById(@Param("id") id: string) {
    const rfq = await this.prisma.rfq.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            email: true,
            companyName: true,
            gstin: true,
            shippingAddress: true,
            city: true,
            pincode: true,
          },
        },
        assignedStaff: { select: { id: true, name: true } },
        attachments: {
          select: { id: true, fileName: true, mimeType: true, byteSize: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!rfq) throw new NotFoundException("Request not found");
    return rfq;
  }

  @Get(":rfqId/attachments/:attachmentId")
  @UseGuards(StaffGuard)
  async downloadAttachment(
    @Param("rfqId") rfqId: string,
    @Param("attachmentId") attachmentId: string,
    @Res() response: Response,
  ) {
    const attachment = await this.prisma.rfqAttachment.findFirst({
      where: { id: attachmentId, rfqId },
    });
    if (!attachment) throw new NotFoundException("Attachment not found");
    const filename = encodeURIComponent(attachment.fileName);
    if (!attachment.storageKey) {
      if (!attachment.content)
        throw new NotFoundException("Attachment content not found");
      response
        .set({
          "Cache-Control": "private, no-store",
          "Content-Type": attachment.mimeType,
          "Content-Length": String(attachment.byteSize),
          "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
          "X-Content-Type-Options": "nosniff",
        })
        .end(Buffer.from(attachment.content));
      return;
    }
    const stream = await this.storage.openPrivateFile(attachment.storageKey);
    response.set({
      "Cache-Control": "private, no-store",
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      "X-Content-Type-Options": "nosniff",
    });
    stream.on("error", () => {
      stream.closeClient?.();
      if (!response.headersSent) response.status(500).end();
      else response.destroy();
    });
    stream.on("close", () => stream.closeClient?.());
    stream.on("end", () => stream.closeClient?.());
    stream.pipe(response);
  }
}
@Controller("inquiries")
export class InquiriesController {
  constructor(private prisma: PrismaService) {}
  @Post()
  @UseGuards(CustomerGuard)
  async create(@Body() body: unknown) {
    const data = validate(
      z.object({
        name: z.string().trim().min(2).max(150),
        phone: z.string().regex(/^[6-9]\d{9}$/),
        location: z.string().min(2).max(500),
        projectType: z.string().max(100),
        message: z.string().trim().min(1).max(5000),
      }),
      body,
    );
    const saved = await this.prisma.contactInquiry.create({ data });
    return { id: saved.id };
  }
  @Get()
  @UseGuards(StaffGuard)
  list() {
    return this.prisma.contactInquiry.findMany({
      orderBy: { createdAt: "desc" },
    });
  }
}
@Module({
  imports: [StorageModule],
  controllers: [RfqsController, InquiriesController],
})
export class RfqsModule {}
