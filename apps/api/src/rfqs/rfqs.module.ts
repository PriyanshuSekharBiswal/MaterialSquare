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
} from "@nestjs/common";
import type { Response } from "express";
import { StorageModule } from "../storage/storage.module";
import { StorageService } from "../storage/storage.service";
import { z } from "zod";
import { PrismaService } from "../prisma/prisma.service";
import { StaffGuard } from "../auth/access.guard";
import type { StaffRequest } from "../auth/staff-request";
import { validate } from "../common/validation";
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
      z.object({
        status: z.enum(["NEW", "CONTACTED", "QUOTED", "CLOSED"]).optional(),
        assignedStaffId: z.string().uuid().nullable().optional(),
        staffNotes: z.string().trim().max(3000).nullable().optional(),
      }).refine(
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
        ...(data.staffNotes !== undefined ? { staffNotes: data.staffNotes } : {}),
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
          action: fields.length === 1 && fields[0] === "status"
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
  list() {
    return this.prisma.rfq.findMany({
      orderBy: { createdAt: "desc" },
      include: {
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
  @Post() async create(@Body() body: unknown) {
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
