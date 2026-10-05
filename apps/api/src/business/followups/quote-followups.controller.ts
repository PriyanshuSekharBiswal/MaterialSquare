import type { StaffRequest } from "../../auth/staff-request";
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import { StaffGuard } from "../../auth/access.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { validate } from "../../common/validation";

const followupInput = z.object({
  channel: z.enum(["WHATSAPP", "EMAIL", "INTERNAL"]),
  scheduledAt: z.string().datetime(),
  notes: z.string().max(3000).optional(),
});

@Controller("quotes/:quoteId/followups")
@UseGuards(StaffGuard)
export class QuoteFollowupsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Param("quoteId") quoteId: string) {
    if (!(await this.prisma.quotation.count({ where: { id: quoteId } })))
      throw new NotFoundException("Quotation not found");
    return this.prisma.quotationFollowUp.findMany({
      where: { quotationId: quoteId },
      orderBy: { scheduledAt: "asc" },
    });
  }

  @Post()
  async create(
    @Param("quoteId") quoteId: string,
    @Body() body: unknown,
    @Req() req?: StaffRequest,
  ) {
    const quote = await this.prisma.quotation.findUnique({
      where: { id: quoteId },
    });
    if (!quote) throw new NotFoundException("Quotation not found");
    const data = validate(followupInput, body);
    if (new Date(data.scheduledAt) < new Date())
      throw new BadRequestException(
        "Schedule the follow-up for now or a future time",
      );
    return this.prisma.$transaction(async (tx) => {
      const followup = await tx.quotationFollowUp.create({
        data: {
          quotationId: quoteId,
          ...data,
          scheduledAt: new Date(data.scheduledAt),
        },
      });
      if (data.channel !== "INTERNAL") {
        await tx.notificationOutbox.create({
          data: {
            type: "quote-follow-up",
            runAt: new Date(data.scheduledAt),
            payload: {
              followupId: followup.id,
              quotationId: quote.id,
              channel: data.channel,
              phone: quote.customerPhone,
              email: quote.customerEmail,
              quoteNumber: quote.quoteNumber,
              notes: data.notes || "",
            },
          },
        });
      }
      await tx.auditLog.create({
        data: {
          staffId: req?.user.userId,
          action: "QUOTATION_FOLLOWUP_SCHEDULED",
          entityType: "QUOTATION",
          entityId: quoteId,
          metadata: {
            followupId: followup.id,
            channel: data.channel,
            scheduledAt: data.scheduledAt,
          },
        },
      });
      return followup;
    });
  }

  @Patch(":id")
  async update(
    @Param("quoteId") quoteId: string,
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req?: StaffRequest,
  ) {
    const data = validate(
      z.object({
        status: z.enum(["SCHEDULED", "SENT", "CANCELLED", "FAILED"]),
        notes: z.string().max(3000).optional(),
      }),
      body,
    );
    const followup = await this.prisma.quotationFollowUp.findFirst({
      where: { id, quotationId: quoteId },
    });
    if (!followup) throw new NotFoundException("Follow-up not found");
    if (followup.status === "CANCELLED" || followup.status === "SENT")
      throw new ConflictException("This follow-up is already closed");
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.quotationFollowUp.updateMany({
        where: { id, quotationId: quoteId, status: followup.status },
        data: {
          ...data,
          sentAt: data.status === "SENT" ? new Date() : null,
        },
      });
      if (changed.count !== 1)
        throw new ConflictException(
          "This follow-up changed. Refresh before updating it.",
        );
      await tx.auditLog.create({
        data: {
          staffId: req?.user.userId,
          action: "QUOTATION_FOLLOWUP_UPDATED",
          entityType: "QUOTATION",
          entityId: quoteId,
          metadata: {
            followupId: id,
            previousStatus: followup.status,
            status: data.status,
          },
        },
      });
      return tx.quotationFollowUp.findUniqueOrThrow({ where: { id } });
    });
  }
}
