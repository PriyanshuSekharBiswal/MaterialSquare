import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
// eslint-disable-next-line @typescript-eslint/no-require-imports
import PDFDocument = require("pdfkit");

const COLORS = {
  ink: "#17243A",
  navy: "#13223A",
  blue: "#2F68D8",
  paleBlue: "#EEF4FF",
  paper: "#F5F7FB",
  line: "#E2E8F0",
  muted: "#64748B",
  white: "#FFFFFF",
};

type QuotePdf = Prisma.QuotationGetPayload<{
  include: { items: { include: { product: true; options: true } } };
}>;

const QUOTE_STATUS_LABEL: Record<QuotePdf["status"], string> = {
  DRAFT: "DRAFT - REVIEW",
  PENDING_REVIEW: "PENDING REVIEW",
  MARGIN_ADJUSTED: "DRAFT - REVIEW",
  QUOTE_SENT: "SENT TO CUSTOMER",
  ACCEPTED: "ACCEPTED",
  CONVERTED_TO_ORDER: "ORDER CREATED",
  EXPIRED: "EXPIRED",
  REJECTED: "CLOSED",
};

@Injectable()
export class PdfService {
  async generatePurchaseOrderPdf(po: {
    purchaseOrderNumber: string;
    createdAt: Date;
    supplier: {
      name: string;
      legalName: string | null;
      gstin: string | null;
      address: string;
      city: string;
      pincode: string;
      phone: string;
      email: string | null;
    };
    revisionNumber: number;
    shippingAddress: string;
    shippingContact: string;
    items: Prisma.JsonValue;
    subtotal: Prisma.Decimal;
    taxAmount: Prisma.Decimal;
    freightAmount: Prisma.Decimal;
    totalAmount: Prisma.Decimal;
    notes: string | null;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: "A4",
        margin: 48,
        info: {
          Title: `Purchase Order ${po.purchaseOrderNumber}`,
          Author: "Material Square",
        },
      });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
      const width = doc.page.width - 96;
      const money = (value: Prisma.Decimal) =>
        `INR ${value.toNumber().toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      doc.rect(0, 0, doc.page.width, 100).fill(COLORS.navy);
      doc
        .font("Helvetica-Bold")
        .fontSize(18)
        .fillColor(COLORS.white)
        .text("MATERIAL SQUARE", 48, 26);
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#C8D4E5")
        .text("PURCHASE ORDER", 48, 56, { characterSpacing: 1.5 });
      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor(COLORS.white)
        .text(po.purchaseOrderNumber, 300, 44, {
          width: width - 252,
          align: "right",
        });
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(COLORS.muted)
        .text(`Issued ${po.createdAt.toLocaleDateString("en-IN")}`, 300, 63, {
          width: width - 252,
          align: "right",
        });
      doc.roundedRect(48, 120, 245, 112, 8).fill(COLORS.paper);
      doc.roundedRect(305, 120, 245, 112, 8).fill(COLORS.paleBlue);
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(COLORS.muted)
        .text("SUPPLIER", 62, 134, { characterSpacing: 1 });
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(COLORS.ink)
        .text(po.supplier.legalName || po.supplier.name, 62, 153, {
          width: 215,
          ellipsis: true,
        });
      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor(COLORS.ink)
        .text(
          `${po.supplier.address}, ${po.supplier.city} ${po.supplier.pincode}\n${po.supplier.phone}\n${po.supplier.email || ""}${po.supplier.gstin ? `\nGSTIN ${po.supplier.gstin}` : ""}`,
          62,
          172,
          { width: 215, height: 52 },
        );
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(COLORS.muted)
        .text("SHIP TO", 319, 134, { characterSpacing: 1 });
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(COLORS.ink)
        .text(
          `${po.shippingAddress}\nContact: ${po.shippingContact}`,
          319,
          156,
          { width: 215, height: 64 },
        );
      let y = 256;
      doc.roundedRect(48, y, width, 28, 5).fill(COLORS.navy);
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(COLORS.white)
        .text("MATERIAL / SPECIFICATION", 60, y + 9, { width: 275 });
      doc
        .text("QTY", 348, y + 9, { width: 48, align: "right" })
        .text("UNIT", 405, y + 9, { width: 50 })
        .text("AMOUNT", 458, y + 9, { width: 77, align: "right" });
      y += 28;
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(COLORS.muted)
        .text(`Revision ${po.revisionNumber}`, 48, 232);
      const rows = Array.isArray(po.items) ? po.items : [];
      rows.slice(0, 200).forEach((value, index) => {
        const row =
          value && typeof value === "object" && !Array.isArray(value)
            ? (value as Record<string, Prisma.JsonValue>)
            : {};
        const name = String(row.productName || row.name || "Material");
        const detail = [row.brand, row.category]
          .filter((item) => typeof item === "string" && item)
          .join(" · ");
        const quantity = Number(row.quantity || row.quantityMt || 0);
        const unit = String(row.unit || "unit");
        const description = detail ? `${name}\n${detail}` : name;
        const rowHeight = detail ? 39 : 28;
        if (y + rowHeight > doc.page.height - 125) {
          doc.addPage();
          y = 54;
        }
        if (index % 2 === 0) doc.rect(48, y, width, rowHeight).fill("#F7F9FC");
        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor(COLORS.ink)
          .text(description, 60, y + 7, {
            width: 275,
            height: rowHeight - 10,
            ellipsis: true,
          });
        doc
          .font("Helvetica")
          .fontSize(8.5)
          .fillColor(COLORS.ink)
          .text(quantity.toLocaleString("en-IN"), 348, y + 8, {
            width: 48,
            align: "right",
          })
          .text(unit, 405, y + 8, { width: 50, ellipsis: true })
          .text("As quoted", 458, y + 8, { width: 77, align: "right" });
        y += rowHeight;
      });
      y += 18;
      if (po.notes) {
        doc
          .font("Helvetica-Bold")
          .fontSize(8)
          .fillColor(COLORS.muted)
          .text("NOTES", 48, y);
        doc
          .font("Helvetica")
          .fontSize(8.5)
          .fillColor(COLORS.ink)
          .text(po.notes, 48, y + 14, {
            width: 260,
            height: 70,
            ellipsis: true,
          });
      }
      const sx = 350;
      const row = (label: string, value: Prisma.Decimal) => {
        doc
          .font("Helvetica")
          .fontSize(8.5)
          .fillColor(COLORS.muted)
          .text(label, sx, y, { width: 95 });
        doc
          .font("Helvetica")
          .fontSize(8.5)
          .fillColor(COLORS.ink)
          .text(money(value), sx + 96, y, { width: 104, align: "right" });
        y += 18;
      };
      row("Subtotal", po.subtotal);
      row("Tax", po.taxAmount);
      row("Freight", po.freightAmount);
      doc.roundedRect(sx - 5, y, 205, 36, 6).fill(COLORS.navy);
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(COLORS.white)
        .text("TOTAL", sx + 7, y + 12)
        .text(money(po.totalAmount), sx + 65, y + 11, {
          width: 123,
          align: "right",
        });
      doc.end();
    });
  }

  async generateQuotationPdf(quote: QuotePdf): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: "A4",
        margin: 0,
        bufferPages: true,
        info: {
          Title: `Quotation ${quote.quoteNumber}`,
          Author: "Material Square",
          Subject: "Construction materials quotation",
        },
      });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const left = 42;
      const right = pageWidth - 42;
      const contentWidth = right - left;
      const money = (value: Prisma.Decimal | number) => {
        const amount = typeof value === "number" ? value : value.toNumber();
        return `INR ${amount.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      };
      const shortDate = (value: Date) =>
        value.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      const sellerName = process.env.QUOTE_SELLER_NAME || "MATERIAL SQUARE";
      const sellerAddress = process.env.QUOTE_SELLER_ADDRESS?.trim();
      const sellerPhone = process.env.QUOTE_SELLER_PHONE?.trim();
      const sellerEmail = process.env.QUOTE_SELLER_EMAIL?.trim();
      const sellerGstin = process.env.QUOTE_SELLER_GSTIN?.trim();
      const sellerMark = sellerName
        .split(/\s+/)
        .map((part) => part.replace(/[.,]/g, ""))
        .filter(
          (part) =>
            part.length > 0 &&
            !["PVT", "LTD", "PRIVATE", "LIMITED"].includes(part.toUpperCase()),
        )
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
      const drawFirstPageHeader = () => {
        doc.rect(0, 0, pageWidth, 113).fill(COLORS.navy);
        doc.rect(0, 109, pageWidth, 4).fill(COLORS.blue);
        doc.roundedRect(left, 23, 42, 42, 10).fill(COLORS.blue);
        doc
          .font("Helvetica-Bold")
          .fontSize(17)
          .fillColor(COLORS.white)
          .text(sellerMark || "MS", left, 34, {
            width: 42,
            align: "center",
            ellipsis: true,
          });
        doc
          .font("Helvetica-Bold")
          .fontSize(14.5)
          .fillColor(COLORS.white)
          .text(sellerName, left + 56, 25, {
            width: right - left - 56 - 174,
            height: 21,
            ellipsis: true,
            characterSpacing: 0.5,
          });
        doc
          .font("Helvetica")
          .fontSize(7.2)
          .fillColor("#C8D4E5")
          .text(sellerAddress || "BUILDING MATERIALS", left + 57, 52, {
            width: right - left - 174,
            ellipsis: true,
          });
        const sellerContacts = [
          sellerGstin ? `GSTIN ${sellerGstin}` : undefined,
          sellerPhone,
          sellerEmail,
        ]
          .filter(Boolean)
          .join("  |  ");
        if (sellerContacts) {
          doc
            .font("Helvetica")
            .fontSize(7.2)
            .fillColor("#C8D4E5")
            .text(sellerContacts, left + 57, 64, {
              width: right - left - 174,
              ellipsis: true,
            });
        }

        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor("#D9E5FF")
          .text("QUOTATION", left, 80, { characterSpacing: 1.8 });
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#D9E5FF")
          .text(
            `Revision ${quote.revisionNumber} · Prepared for your project`,
            left + 92,
            81,
          );

        const badgeWidth = 164;
        const badgeX = right - badgeWidth;
        doc.roundedRect(badgeX, 20, badgeWidth, 62, 8).fill("#203653");
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#B9C8DD")
          .text("QUOTE NUMBER", badgeX + 13, 32, { characterSpacing: 1 });
        doc
          .font("Helvetica-Bold")
          .fontSize(11)
          .fillColor(COLORS.white)
          .text(quote.quoteNumber, badgeX + 13, 48, {
            width: badgeWidth - 26,
            ellipsis: true,
          });
      };

      const drawContinuationHeader = () => {
        doc
          .font("Helvetica-Bold")
          .fontSize(11)
          .fillColor(COLORS.ink)
          .text(sellerName, left, 31, { width: 300, ellipsis: true });
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor(COLORS.muted)
          .text(`Quotation ${quote.quoteNumber}`, right - 230, 32, {
            width: 230,
            align: "right",
          });
        doc
          .moveTo(left, 52)
          .lineTo(right, 52)
          .lineWidth(1)
          .strokeColor(COLORS.line)
          .stroke();
      };

      const drawCustomerCards = (top: number) => {
        const gap = 12;
        const cardWidth = (contentWidth - gap) / 2;
        const cardHeight = 104;
        const rightCardX = left + cardWidth + gap;
        doc.roundedRect(left, top, cardWidth, cardHeight, 8).fill(COLORS.paper);
        doc
          .font("Helvetica-Bold")
          .fontSize(8)
          .fillColor(COLORS.muted)
          .text("PREPARED FOR", left + 14, top + 13, { characterSpacing: 1 });
        doc
          .font("Helvetica-Bold")
          .fontSize(12)
          .fillColor(COLORS.ink)
          .text(quote.customerName, left + 14, top + 31, {
            width: cardWidth - 28,
            ellipsis: true,
          });
        let customerY = top + 51;
        doc.font("Helvetica").fontSize(8.5).fillColor(COLORS.muted);
        doc.text(quote.customerPhone, left + 14, customerY, {
          width: cardWidth - 28,
          ellipsis: true,
        });
        customerY += 13;
        if (quote.customerEmail) {
          doc.text(quote.customerEmail, left + 14, customerY, {
            width: cardWidth - 28,
            ellipsis: true,
          });
          customerY += 13;
        }
        doc.text(
          `${quote.projectSiteAddress}, ${quote.sitePincode}`,
          left + 14,
          customerY,
          { width: cardWidth - 28, height: top + cardHeight - customerY - 8 },
        );

        doc
          .roundedRect(rightCardX, top, cardWidth, cardHeight, 8)
          .fill(COLORS.paleBlue);
        const metaX = rightCardX + 14;
        const metaValueX = rightCardX + 105;
        const metaRows = [
          ["ISSUED", shortDate(quote.createdAt)],
          ["VALID UNTIL", shortDate(quote.validUntil)],
          ["STATUS", QUOTE_STATUS_LABEL[quote.status]],
        ];
        metaRows.forEach(([label, value], index) => {
          const y = top + 18 + index * 25;
          doc
            .font("Helvetica-Bold")
            .fontSize(7.5)
            .fillColor(COLORS.muted)
            .text(label, metaX, y, { width: 86, characterSpacing: 0.55 });
          doc
            .font("Helvetica-Bold")
            .fontSize(9)
            .fillColor(COLORS.ink)
            .text(value, metaValueX, y - 1, {
              width: cardWidth - (metaValueX - rightCardX) - 12,
              ellipsis: true,
            });
        });
      };

      const tableTop = (top: number) => {
        const tableHeight = 29;
        doc
          .roundedRect(left, top, contentWidth, tableHeight, 5)
          .fill(COLORS.navy);
        const labels = [
          { text: "#", x: left + 10, width: 22, align: "left" as const },
          {
            text: "MATERIAL / SPECIFICATION",
            x: left + 39,
            width: 225,
            align: "left" as const,
          },
          { text: "QTY", x: left + 266, width: 48, align: "right" as const },
          { text: "UNIT", x: left + 318, width: 41, align: "left" as const },
          { text: "RATE", x: left + 362, width: 80, align: "right" as const },
          { text: "AMOUNT", x: left + 444, width: 67, align: "right" as const },
        ];
        labels.forEach(({ text, x, width, align }) => {
          doc
            .font("Helvetica-Bold")
            .fontSize(7.3)
            .fillColor(COLORS.white)
            .text(text, x, top + 10, { width, align, characterSpacing: 0.4 });
        });
        return top + tableHeight;
      };

      drawFirstPageHeader();
      drawCustomerCards(125);
      let y = tableTop(238);
      const contentBottom = pageHeight - 55;
      const netMaterialSubtotal = quote.subtotal
        .sub(quote.discountAmount)
        .add(quote.marginAmount);
      const multiplier = quote.subtotal.isZero()
        ? new Prisma.Decimal(1)
        : netMaterialSubtotal.div(quote.subtotal);

      quote.items.forEach((item, index) => {
        const descriptionWidth = 218;
        doc.font("Helvetica").fontSize(8.5);
        const comparisonDetails = item.options.map(
          (option) =>
            `Alternative: ${option.brandName} · ${option.productName} · ${money(option.unitPrice)} / ${item.unit}`,
        );
        const description = [
          [item.productName, item.brandName, item.specification]
            .filter(Boolean)
            .join("\n"),
          ...comparisonDetails,
        ]
          .filter(Boolean)
          .join("\n");
        const descriptionHeight = doc.heightOfString(description, {
          width: descriptionWidth,
          lineGap: 1,
        });
        const rowHeight = Math.max(25, descriptionHeight + 10);
        if (y + rowHeight > contentBottom) {
          doc.addPage({ size: "A4", margin: 0 });
          drawContinuationHeader();
          y = tableTop(69);
        }

        if (index % 2 === 0) {
          doc.rect(left, y, contentWidth, rowHeight).fill("#F7F9FC");
        }
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor(COLORS.muted)
          .text(String(index + 1).padStart(2, "0"), left + 10, y + 10, {
            width: 22,
          });
        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor(COLORS.ink)
          .text(description, left + 39, y + 8, {
            width: descriptionWidth,
            lineGap: 1,
          });
        doc
          .font("Helvetica")
          .fontSize(8.2)
          .fillColor(COLORS.ink)
          .text(
            item.quantityMt.toFixed(3).replace(/(\.\d*?[1-9])0+$|\.0+$/, "$1"),
            left + 266,
            y + 9,
            {
              width: 50,
              align: "right",
            },
          )
          .text(item.unit, left + 318, y + 9, { width: 41 });
        doc
          .font("Helvetica")
          .fontSize(8.2)
          .fillColor(COLORS.ink)
          .text(money(item.unitPrice.mul(multiplier)), left + 362, y + 9, {
            width: 80,
            align: "right",
          })
          .text(money(item.lineTotal.mul(multiplier)), left + 444, y + 9, {
            width: 67,
            align: "right",
          });
        doc
          .moveTo(left, y + rowHeight)
          .lineTo(right, y + rowHeight)
          .lineWidth(0.55)
          .strokeColor(COLORS.line)
          .stroke();
        y += rowHeight;
      });

      const hasComparisons = quote.items.some(
        (item) => item.options.length > 0,
      );
      const notesText = [
        hasComparisons
          ? "Brand alternatives are shown by material. Contact the team with your preferred options to confirm the quotation total."
          : "",
        quote.notes?.trim() || "",
      ]
        .filter(Boolean)
        .join("\n\n");
      doc.font("Helvetica").fontSize(8.5);
      const notesHeight = notesText
        ? Math.min(90, doc.heightOfString(notesText, { width: 230 }) + 38)
        : 0;
      const summaryHeight = 119 + notesHeight;
      if (y + summaryHeight > contentBottom) {
        doc.addPage({ size: "A4", margin: 0 });
        drawContinuationHeader();
        y = 74;
      }
      y += 12;

      if (notesText) {
        const boxHeight = Math.max(74, notesHeight);
        doc.roundedRect(left, y, 256, boxHeight, 8).fill(COLORS.paper);
        doc
          .font("Helvetica-Bold")
          .fontSize(8)
          .fillColor(COLORS.muted)
          .text("NOTES & TERMS", left + 13, y + 12, { characterSpacing: 0.8 });
        doc
          .font("Helvetica")
          .fontSize(8.5)
          .fillColor(COLORS.ink)
          .text(notesText, left + 13, y + 29, {
            width: 230,
            height: boxHeight - 38,
            ellipsis: true,
          });
      }

      const summaryWidth = 237;
      const summaryX = right - summaryWidth;
      const summaryLabelX = summaryX + 12;
      const summaryValueX = summaryX + 100;
      const summaryValueWidth = summaryWidth - 112;
      let summaryY = y + 2;
      const drawSummaryRow = (
        label: string,
        value: Prisma.Decimal,
        bold = false,
      ) => {
        doc
          .font(bold ? "Helvetica-Bold" : "Helvetica")
          .fontSize(bold ? 9 : 8.5)
          .fillColor(bold ? COLORS.ink : COLORS.muted)
          .text(label, summaryLabelX, summaryY + 6, { width: 82 });
        doc
          .font(bold ? "Helvetica-Bold" : "Helvetica")
          .fontSize(bold ? 9 : 8.5)
          .fillColor(COLORS.ink)
          .text(money(value), summaryValueX, summaryY + 6, {
            width: summaryValueWidth,
            align: "right",
          });
        summaryY += 20;
      };

      drawSummaryRow("Materials subtotal", quote.subtotal);
      if (quote.discountAmount.greaterThan(0)) {
        drawSummaryRow("Less: discount", quote.discountAmount.negated());
      }
      if (quote.marginAmount.greaterThan(0)) {
        drawSummaryRow("Service margin", quote.marginAmount);
      }
      drawSummaryRow("Tax", quote.taxAmount);
      drawSummaryRow("Delivery / freight", quote.freightAmount);
      doc
        .roundedRect(summaryX, summaryY, summaryWidth, 43, 7)
        .fill(COLORS.navy);
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor("#D5E2F6")
        .text("TOTAL", summaryX + 12, summaryY + 15, { characterSpacing: 1 });
      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor(COLORS.white)
        .text(money(quote.totalAmount), summaryX + 78, summaryY + 13, {
          width: summaryWidth - 91,
          align: "right",
        });
      const summaryBottom = summaryY + 43;
      if (!notesText) {
        doc.roundedRect(left, y, 256, 99, 8).fill(COLORS.paper);
        doc
          .font("Helvetica-Bold")
          .fontSize(8)
          .fillColor(COLORS.muted)
          .text("BEFORE YOU CONFIRM", left + 13, y + 12, {
            characterSpacing: 0.7,
          });
        doc
          .font("Helvetica")
          .fontSize(8.5)
          .fillColor(COLORS.ink)
          .text(
            "Please review the materials, quantities, rates, and delivery location listed above.",
            left + 13,
            y + 29,
            { width: 230, height: 34 },
          );
        doc
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor(COLORS.ink)
          .text(`For ${sellerName}`, left + 13, y + 61, {
            width: 230,
            ellipsis: true,
          });
        doc
          .moveTo(left + 13, y + 75)
          .lineTo(left + 243, y + 75)
          .lineWidth(0.8)
          .strokeColor(COLORS.line)
          .stroke();
        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor(COLORS.muted)
          .text("Authorized signatory", left + 13, y + 82);
      } else {
        const signatureY =
          Math.max(y + Math.max(74, notesHeight), summaryBottom) + 65;
        if (signatureY + 30 < contentBottom) {
          doc
            .moveTo(right - 164, signatureY)
            .lineTo(right, signatureY)
            .lineWidth(0.8)
            .strokeColor(COLORS.line)
            .stroke();
          doc
            .font("Helvetica-Bold")
            .fontSize(8)
            .fillColor(COLORS.ink)
            .text(`For ${sellerName}`, right - 164, signatureY - 18, {
              width: 164,
              align: "right",
            });
          doc
            .font("Helvetica")
            .fontSize(7.5)
            .fillColor(COLORS.muted)
            .text("Authorized signatory", right - 164, signatureY + 5, {
              width: 164,
              align: "right",
            });
        }
      }

      const pageRange = doc.bufferedPageRange();
      for (
        let page = pageRange.start;
        page < pageRange.start + pageRange.count;
        page += 1
      ) {
        doc.switchToPage(page);
        doc
          .moveTo(left, pageHeight - 37)
          .lineTo(right, pageHeight - 37)
          .lineWidth(0.6)
          .strokeColor(COLORS.line)
          .stroke();
        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor(COLORS.muted)
          .text(
            `${sellerName}  |  ${quote.quoteNumber}`,
            left,
            pageHeight - 27,
            {
              width: 350,
            },
          )
          .text(
            `Page ${page + 1} of ${pageRange.count}`,
            right - 100,
            pageHeight - 27,
            {
              width: 100,
              align: "right",
            },
          );
      }
      doc.end();
    });
  }

  async generateDeliveryChallanPdf(challan: {
    challanNumber: string;
    orderNumber: string;
    truckNumber: string;
    driverName: string;
    customerName: string;
    deliverySite: string;
    grossKg: number;
    tareKg: number;
    netTonnageMt: number;
    items: { name: string; quantityMt: number; unit: string }[];
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on("data", (buffer) => buffers.push(buffer));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .fillColor("#0f172a")
        .text("MATERIAL SQUARE INDIA", { align: "center" });
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#64748b")
        .text(
          "Construction Materials",
          { align: "center" },
        );
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .fillColor("#2563eb")
        .text("TRIPLICATE DELIVERY CHALLAN & WEIGHBRIDGE PASS", {
          align: "center",
          underline: true,
        })
        .moveDown(1);

      doc.fontSize(10).font("Helvetica-Bold").fillColor("#000");
      doc.text(`Challan No: ${challan.challanNumber}`, 50, 140);
      doc.text(`Order Ref: ${challan.orderNumber}`, 350, 140);

      doc.font("Helvetica").text(`Vehicle No: ${challan.truckNumber}`, 50, 160);
      doc.text(`Driver: ${challan.driverName}`, 350, 160);

      doc.text(`Consignee: ${challan.customerName}`, 50, 180);
      doc.text(`Unloading Site: ${challan.deliverySite}`, 50, 200);

      doc.rect(50, 230, 500, 60).fillAndStroke("#f8fafc", "#cbd5e1");
      doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(10);
      doc.text("CERTIFIED WEIGHBRIDGE WEIGHT RECORD (KG / MT)", 65, 240);
      doc.font("Helvetica").fontSize(9);
      doc.text(
        `Gross Vehicle Weight: ${challan.grossKg.toLocaleString()} kg`,
        65,
        260,
      );
      doc.text(
        `Tare Weight (Empty): ${challan.tareKg.toLocaleString()} kg`,
        230,
        260,
      );
      doc
        .font("Helvetica-Bold")
        .fillColor("#15803d")
        .text(`Net Vehicle Load: ${challan.netTonnageMt} MT`, 390, 260);

      doc.moveDown(5);
      doc.fillColor("#000").font("Helvetica-Bold").fontSize(10);
      doc.text("Material Description", 50, 310);
      doc.text("Quantity / unit", 430, 310, { align: "right" });
      doc.moveTo(50, 325).lineTo(550, 325).stroke("#94a3b8");

      let y = 335;
      challan.items.forEach((item) => {
        doc.font("Helvetica").fontSize(9).text(item.name, 50, y);
        doc.text(
          `${item.quantityMt.toLocaleString("en-IN")} ${item.unit}`,
          430,
          y,
          {
            align: "right",
          },
        );
        y += 20;
      });

      doc.moveDown(4);
      doc.fontSize(9).font("Helvetica");
      doc.text("Authorized Material Square Yard Officer", 50, 500);
      doc.text("Consignee / Site Receiver Signature & Stamp", 320, 500);
      doc.moveTo(50, 495).lineTo(230, 495).stroke("#cbd5e1");
      doc.moveTo(320, 495).lineTo(520, 495).stroke("#cbd5e1");

      doc.end();
    });
  }
}
