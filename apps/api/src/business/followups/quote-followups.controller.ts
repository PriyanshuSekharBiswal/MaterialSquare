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
        status: z.enum(["SCHEDULED", "SENT", "CANCELLED", "FAILED"]).optional(),
        scheduledAt: z.string().datetime().optional(),
        notes: z.string().max(3000).optional(),
      }).refine(
        (value) => value.status !== undefined || value.scheduledAt !== undefined || value.notes !== undefined,
        "Choose a status, new schedule time, or note to update",
      ).refine(
        (value) => !(value.status !== undefined && value.scheduledAt !== undefined),
        "Reschedule the follow-up separately from changing its status",
      ),
      body,
    );
    const followup = await this.prisma.quotationFollowUp.findFirst({
      where: { id, quotationId: quoteId },
    });
    if (!followup) throw new NotFoundException("Follow-up not found");

    if (data.scheduledAt) {
      if (followup.status !== "SCHEDULED")
        throw new ConflictException("Only scheduled follow-ups can be rescheduled");
      const scheduledAt = new Date(data.scheduledAt);
      if (scheduledAt < new Date())
        throw new BadRequestException(
          "Schedule the follow-up for now or a future time",
        );

      return this.prisma.$transaction(async (tx) => {
        const closed = await tx.quotationFollowUp.updateMany({
          where: { id, quotationId: quoteId, status: "SCHEDULED" },
          data: { status: "CANCELLED" },
        });
        if (closed.count !== 1)
          throw new ConflictException(
            "This follow-up changed. Refresh before rescheduling it.",
          );

        const notes = data.notes ?? followup.notes;
        const replacement = await tx.quotationFollowUp.create({
          data: {
            quotationId: quoteId,
            channel: followup.channel,
            scheduledAt,
            notes,
          },
        });
        if (followup.channel !== "INTERNAL") {
          const quote = await tx.quotation.findUnique({
            where: { id: quoteId },
          });
          if (!quote) throw new NotFoundException("Quotation not found");
          await tx.notificationOutbox.create({
            data: {
              type: "quote-follow-up",
              runAt: scheduledAt,
              payload: {
                followupId: replacement.id,
                quotationId: quote.id,
                channel: followup.channel,
                phone: quote.customerPhone,
                email: quote.customerEmail,
                quoteNumber: quote.quoteNumber,
                notes: notes || "",
              },
            },
          });
        }
        await tx.auditLog.create({
          data: {
            staffId: req?.user.userId,
            action: "QUOTATION_FOLLOWUP_RESCHEDULED",
            entityType: "QUOTATION",
            entityId: quoteId,
            metadata: {
              previousFollowupId: id,
              followupId: replacement.id,
              channel: followup.channel,
              previousScheduledAt: followup.scheduledAt.toISOString(),
              scheduledAt: scheduledAt.toISOString(),
            },
          },
        });
        return replacement;
      });
    }

    if (!data.status)
      throw new BadRequestException("Choose a status or new schedule time");
    if (followup.status === "CANCELLED" || followup.status === "SENT")
      throw new ConflictException("This follow-up is already closed");
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.quotationFollowUp.updateMany({
        where: { id, quotationId: quoteId, status: followup.status },
        data: {
          status: data.status!,
          ...(data.notes !== undefined ? { notes: data.notes } : {}),
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
