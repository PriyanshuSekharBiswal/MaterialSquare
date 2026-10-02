import { PdfService } from "../pdf/pdf.service";
import { Res } from "@nestjs/common";
import type { Response } from "express";
import { z } from "zod";
import { UseGuards } from "@nestjs/common";
import { StaffGuard } from "../auth/access.guard";
import { validate } from "../common/validation";
import { Controller, Get, Post, Patch, Body, Param, Req, NotFoundException } from "@nestjs/common";
import { QuotesService } from "./quotes.service";
import { CreateQuoteSchema } from "@material-square/types";
import { CustomerGuard } from "../auth/customer.guard";
import { PrismaService } from "../prisma/prisma.service";

@Controller("quotes")
@UseGuards(StaffGuard)
export class QuotesController {
  constructor(
    private readonly quotesService: QuotesService,
    private readonly pdf: PdfService,
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
  createQuote(@Body() body: unknown) {
    const validated = validate(CreateQuoteSchema, body);
    return this.quotesService.create(validated);
  }

  @Post(":id/publish")
  publish(@Param("id") id: string) {
    return this.quotesService.publish(id);
  }

  @Patch(":id/margin")
  adjustMargin(@Param("id") id: string, @Body("marginPct") marginPct: number) {
    return this.quotesService.adjustMargin(
      id,
      validate(z.number().finite().min(0).max(100), marginPct),
    );
  }
}

@Controller("customer/quotes")
@UseGuards(CustomerGuard)
export class CustomerQuotesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdf: PdfService,
  ) {}

  @Get(":id/pdf")
  async customerPdf(
    @Param("id") id: string,
    @Req() req: Request & { customerId: string },
    @Res() response: Response,
  ) {
    const quote = await this.prisma.quotation.findFirst({
      where: { id, customerId: req.customerId },
      include: { items: { include: { product: true } } },
    });
    if (!quote) throw new NotFoundException("Quotation not found");
    const buffer = await this.pdf.generateQuotationPdf(quote);
    response
      .set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${quote.quoteNumber}.pdf"`,
        "Cache-Control": "private, no-store",
        "Content-Length": buffer.length,
      })
      .end(buffer);
  }
}
