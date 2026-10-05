import type { StaffRequest } from "../auth/staff-request";
import { PdfService } from "../pdf/pdf.service";
import { Res } from "@nestjs/common";
import type { Response } from "express";
import { z } from "zod";
import { UseGuards } from "@nestjs/common";
import { StaffGuard } from "../auth/access.guard";
import { validate } from "../common/validation";
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
} from "@nestjs/common";
import { QuotesService } from "./quotes.service";
import { CreateQuoteSchema } from "@material-square/types";
import { QuotationAcceptanceService } from "./quotation-acceptance.service";
import { ExternalQuotationAcceptanceSchema } from "./quotation-acceptance.schema";

@Controller("quotes")
@UseGuards(StaffGuard)
export class QuotesController {
  constructor(
    private readonly quotesService: QuotesService,
    private readonly pdf: PdfService,
    private readonly quotationAcceptance: QuotationAcceptanceService,
  ) {}

  @Get()
  getAllQuotes() {
    return this.quotesService.findAll();
  }

  @Get(":id/pdf")
  async pdfDownload(@Param("id") id: string, @Res() response: Response) {
    const buffer = await this.pdf.generateQuotationPdf(
      await this.quotesService.findById(id),
    );
    response
      .set({
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=Quotation.pdf",
      })
      .end(buffer);
  }

  @Get(":id")
  getQuoteById(@Param("id") id: string) {
    return this.quotesService.findById(id);
  }

  @Post()
  createQuote(@Body() body: unknown, @Req() req: StaffRequest) {
    const validated = validate(CreateQuoteSchema, body);
    return this.quotesService.create(validated, req.user.userId);
  }

  @Post(":id/publish")
  publish(@Param("id") id: string, @Req() req: StaffRequest) {
    return this.quotesService.publish(id, req.user.userId);
  }

  @Post(":id/acceptance")
  recordExternalAcceptance(
    @Param("id") id: string,
    @Req() req: StaffRequest,
    @Body() body: unknown,
  ) {
    const { channel, selections } = validate(
      ExternalQuotationAcceptanceSchema,
      body,
    );
    return this.quotationAcceptance.acceptFromCommunication(
      id,
      req.user.userId,
      channel,
      selections,
    );
  }

  @Post(":id/revisions")
  revise(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: StaffRequest,
  ) {
    return this.quotesService.revise(
      id,
      validate(CreateQuoteSchema, body),
      req.user.userId,
    );
  }

  @Patch(":id")
  editDraft(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: StaffRequest,
  ) {
    return this.quotesService.editDraft(
      id,
      validate(CreateQuoteSchema, body),
      req.user.userId,
    );
  }

  @Patch(":id/margin")
  adjustMargin(
    @Param("id") id: string,
    @Body("marginPct") marginPct: number,
    @Req() req: StaffRequest,
  ) {
    return this.quotesService.adjustMargin(
      id,
      validate(z.number().finite().min(0).max(100), marginPct),
      req.user.userId,
    );
  }
}
