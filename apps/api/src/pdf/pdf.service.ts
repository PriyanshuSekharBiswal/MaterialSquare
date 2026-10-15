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
  include: {
    customer: true;
    items: { include: { product: true; options: true } };
  };
}>;

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
      const left = 44;
      const right = pageWidth - left;
      const contentWidth = right - left;
      const formatAmount = (value: Prisma.Decimal) =>
        value.toNumber().toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      const drawRupeeAmount = (
        value: Prisma.Decimal,
        x: number,
        y: number,
        width: number,
        align: "left" | "right" = "right",
        color = COLORS.ink,
        negative = false,
        fontSize = 8.5,
      ) => {
        const amount = formatAmount(value);
        const iconScale = fontSize * 0.042;
        const symbolWidth = fontSize * 0.56;
        const gap = 3;
        const negativeWidth = negative ? 9 : 0;
        const textSlack = 4;
        const amountWidth = doc.widthOfString(amount);
        const startX = align === "right" ? x + width - negativeWidth - symbolWidth - gap - amountWidth - textSlack : x;
        doc.save();
        const iconX = startX + negativeWidth + (symbolWidth - 12 * iconScale) / 2;
        const iconY = y - 3 * iconScale;
        const sx = (value: number) => iconX + value * iconScale;
        const sy = (value: number) => iconY + value * iconScale;
        doc.lineWidth(1).lineCap("round").lineJoin("round").strokeColor(color);
        if (negative) {
          doc.font("Helvetica-Bold").fontSize(fontSize).fillColor(color)
            .text("-", startX, y, { width: negativeWidth });
        }
        // Draw the ₹ glyph as vector paths so it renders consistently in PDFs
        // without depending on the viewer's support for the Unicode character.
        doc.moveTo(sx(6), sy(3)).lineTo(sx(18), sy(3)).stroke();
        doc.moveTo(sx(6), sy(8)).lineTo(sx(18), sy(8)).stroke();
        doc.moveTo(sx(6), sy(13)).lineTo(sx(14.5), sy(21)).stroke();
        doc.moveTo(sx(6), sy(13)).lineTo(sx(9), sy(13)).stroke();
        doc.moveTo(sx(9), sy(13))
          .bezierCurveTo(sx(15.667), sy(13), sx(15.667), sy(3), sx(9), sy(3))
          .stroke();
        doc.restore();
        const amountX = startX + negativeWidth + symbolWidth + gap;
        doc.fillColor(color).text(amount, amountX, y, {
          width: Math.max(0, x + width - amountX),
          align: "left",
          lineBreak: false,
        });
      };
      const shortDate = (value: Date) =>
        value.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      const sellerName = process.env.QUOTE_SELLER_NAME || "MATERIAL SQUARE";
      const headerBottom = 122;
      const pageBottom = pageHeight - 46;
      const customer = quote.customer;
      const customerFields = [
        ["Name", quote.customerName || customer?.name || "Not provided"],
        ["Mobile", quote.customerPhone || customer?.phone || "Not provided"],
        ["Company", customer?.companyName || "Not provided"],
        ["GSTIN", customer?.gstin || "Not provided"],
        ...(quote.customerEmail || customer?.email
          ? [["Email", quote.customerEmail || customer?.email || ""]]
          : []),
      ];
      const addressTokens = quote.projectSiteAddress
        .split(/,\s*(?=(?:Building|Area|Street|Landmark|City|State):)/i)
        .map((part) => part.trim())
        .filter(Boolean);
      const addressFields = addressTokens
        .map((token) => {
          const match = token.match(/^([^:]+):\s*(.*)$/);
          return match ? [match[1], match[2].trim()] : ["Address", token];
        })
        .filter((field) => field[1]);
      if (quote.sitePincode && !addressFields.some(([label]) => label.toLowerCase() === "pin code")) {
        addressFields.push(["PIN code", quote.sitePincode]);
      }

      const drawBrand = (top: number, continuation = false) => {
        if (!continuation) doc.rect(0, 0, pageWidth, 6).fill("#F26722");
        // Compact vector version of the Material Square mark used by the preview.
        const logoX = left;
        const logoY = top + (continuation ? 0 : 3);
        doc.save();
        doc.strokeColor(COLORS.ink).lineWidth(1.1);
        [[9, 1, 9, 13], [12, 0, 12, 13], [15, 2, 15, 13]].forEach(([x1, y1, x2, y2]) =>
          doc.moveTo(logoX + x1, logoY + y1).lineTo(logoX + x2, logoY + y2).stroke(),
        );
        doc.fillColor("#94A3B8").path(`M ${logoX + 16} ${logoY + 5} h 22 v 26 h -8 v -18 h -14 z`).fill();
        doc.fillColor(COLORS.ink).path(`M ${logoX} ${logoY + 45} v -38 h 9 l 10 19 10 -19 h 9 v 38 h -9 v -23 l -7 14 h -7 l -7 -14 v 23 z`).fill();
        doc.fillColor("#EA580C").rect(logoX + 29, logoY + 32, 10, 4).fill();
        doc.fillColor("#EA580C").rect(logoX + 25, logoY + 37, 8, 4).fill();
        doc.fillColor("#EA580C").rect(logoX + 34, logoY + 37, 8, 4).fill();
        doc.restore();
        if (continuation) {
          doc.font("Helvetica-Bold").fontSize(11).fillColor(COLORS.ink)
            .text(sellerName, left + 52, top + 8, { width: 240, ellipsis: true });
          doc.font("Helvetica").fontSize(9).fillColor(COLORS.muted)
            .text(`Quotation ${quote.quoteNumber}`, right - 220, top + 9, { width: 220, align: "right" });
          doc.moveTo(left, top + 35).lineTo(right, top + 35).lineWidth(0.7).strokeColor(COLORS.line).stroke();
        } else {
          doc.font("Helvetica-Bold").fontSize(16).fillColor(COLORS.ink)
            .text("MATERIAL", left + 48, top + 9, { characterSpacing: 0.7 });
          doc.font("Helvetica-Bold").fontSize(8).fillColor("#EA580C")
            .text("—  S Q U A R E  —", left + 49, top + 28, { characterSpacing: 0.5 });
          doc.font("Helvetica-Bold").fontSize(5.7).fillColor(COLORS.muted)
            .text("BUILDING BETTER TOGETHER", left + 50, top + 40, { characterSpacing: 0.35 });
          const titleX = right - 190;
          doc.font("Helvetica-Bold").fontSize(18).fillColor(COLORS.ink)
            .text("QUOTATION", titleX, top + 3, { width: 190, align: "right", characterSpacing: 0.6 });
          const quoteNumberWidth = 326;
          const quoteNumberX = right - quoteNumberWidth;
          doc.font("Helvetica-Bold").fontSize(7.6).fillColor("#5E6D82")
            .text(quote.quoteNumber, quoteNumberX, top + 29, { width: quoteNumberWidth, align: "right", lineBreak: false });
          doc.font("Helvetica").fontSize(8).fillColor(COLORS.muted)
            .text(`Issued ${shortDate(quote.createdAt)}  ·  Valid until ${shortDate(quote.validUntil)}`, titleX, top + 44, { width: 190, align: "right", lineBreak: false });
          doc.moveTo(left, top + 65).lineTo(right, top + 65).lineWidth(0.7).strokeColor(COLORS.line).stroke();
        }
      };

      const drawCustomerCard = (top: number) => {
        const inset = 13;
        const gridX = left + inset;
        const gridWidth = contentWidth - inset * 2;
        const colWidth = (gridWidth - 24) / 2;
        let rowY = top + 35;
        const customerRows = Math.ceil(customerFields.length / 2);
        let cardHeight = 35 + customerRows * 34 + 13;
        const addressLabelY = top + cardHeight + 11;
        const addressStartY = addressLabelY + 19;
        let addressHeight = 0;
        if (addressFields.length) {
          addressHeight = 30 + addressFields.length * 18;
        } else {
          addressHeight = 29;
        }
        cardHeight += addressHeight;
        doc.save().roundedRect(left, top, contentWidth, cardHeight, 8).lineWidth(0.8).strokeColor("#E1E7EF").fillAndStroke("#FBFCFE", "#E1E7EF").restore();
        doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.ink).text("CUSTOMER INFORMATION", gridX, top + 13, { characterSpacing: 0.5 });
        customerFields.forEach((field, index) => {
          const col = index % 2;
          if (col === 0 && index > 0) rowY += 34;
          const x = gridX + col * (colWidth + 24);
          doc.font("Helvetica").fontSize(8.5).fillColor("#78869A").text(field[0], x, rowY, { width: colWidth });
          doc.font("Helvetica-Bold").fontSize(9).fillColor("#29374C").text(field[1], x, rowY + 12, { width: colWidth, ellipsis: true });
        });
        if (addressFields.length || quote.projectSiteAddress) {
          doc.moveTo(gridX, addressLabelY - 6).lineTo(right - inset, addressLabelY - 6).lineWidth(0.6).strokeColor(COLORS.line).stroke();
          doc.font("Helvetica").fontSize(8.5).fillColor("#78869A").text("Delivery address", gridX, addressLabelY, { width: gridWidth });
        }
        if (addressFields.length) {
          addressFields.forEach(([label, value], index) => {
            const addressY = addressStartY + index * 18;
            doc.font("Helvetica").fontSize(8.5).fillColor("#78869A").text(label, gridX, addressY, { width: 84 });
            doc.font("Helvetica-Bold").fontSize(9).fillColor("#29374C").text(value, gridX + 96, addressY, { width: gridWidth - 96, ellipsis: true });
          });
        } else {
          doc.font("Helvetica-Bold").fontSize(9).fillColor("#29374C").text("Not provided", gridX, addressStartY, { width: gridWidth });
        }
        return top + cardHeight;
      };

      const columns = {
        itemX: left + 8,
        itemWidth: 258,
        qtyX: left + 275,
        qtyWidth: 69,
        rateX: left + 352,
        rateWidth: 77,
        amountX: left + 437,
        amountWidth: contentWidth - 445,
      };
      const drawTableHeader = (top: number) => {
        doc.rect(left, top, contentWidth, 27).fill("#F4F6F9");
        doc.moveTo(left, top).lineTo(right, top).lineWidth(0.6).strokeColor("#E0E6EE").stroke();
        doc.moveTo(left, top + 27).lineTo(right, top + 27).lineWidth(0.6).strokeColor("#D8E0E9").stroke();
        const header = (text: string, x: number, width: number, align: "left" | "right" = "left") =>
          doc.font("Helvetica-Bold").fontSize(7.2).fillColor("#5C6C82").text(text, x, top + 9, { width, align, characterSpacing: 0.45 });
        header("ITEM", columns.itemX, columns.itemWidth);
        header("QTY", columns.qtyX, columns.qtyWidth);
        header("UNIT RATE", columns.rateX, columns.rateWidth, "right");
        header("AMOUNT", columns.amountX, columns.amountWidth, "right");
        return top + 27;
      };

      let y = 0;
      const startItemsOnPage = (continuation = false) => {
        drawBrand(continuation ? 25 : 25, continuation);
        if (continuation) {
          doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.ink)
            .text("QUOTED ITEMS (CONTINUED)", left, 74, { characterSpacing: 0.45 });
          y = drawTableHeader(89);
        } else {
          const customerBottom = drawCustomerCard(headerBottom);
          doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.ink)
            .text("QUOTED ITEMS", left, customerBottom + 18, { characterSpacing: 0.45 });
          y = drawTableHeader(customerBottom + 34);
        }
      };
      const addContinuationPage = () => {
        doc.addPage({ size: "A4", margin: 0 });
        startItemsOnPage(true);
      };

      startItemsOnPage();
      const rows = quote.items.flatMap((item, index) => [
        {
          itemIndex: index,
          name: [item.productName, item.brandName].filter(Boolean).join(" · "),
          specification: item.specification,
          quantity: item.quantityMt,
          unit: item.unit,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          alternative: false,
        },
        ...item.options.map((option, optionIndex) => ({
          itemIndex: index,
          name: `Option ${String.fromCharCode(66 + optionIndex)} · ${[option.productName, option.brandName].filter(Boolean).join(" · ")}`,
          specification: option.specification,
          quantity: option.quantityMt,
          unit: option.unit,
          unitPrice: option.unitPrice,
          lineTotal: option.lineTotal,
          alternative: true,
        })),
      ]);
      rows.forEach((row) => {
        doc.font("Helvetica-Bold").fontSize(8.5);
        const nameHeight = doc.heightOfString(row.name || "Material", { width: columns.itemWidth, lineGap: 1 });
        doc.font("Helvetica").fontSize(8);
        const specHeight = row.specification
          ? doc.heightOfString(row.specification, { width: columns.itemWidth, lineGap: 1 }) + 4
          : 0;
        const qty = `${row.quantity.toNumber().toLocaleString("en-IN", { maximumFractionDigits: 3 })} × ${row.unit}`;
        const qtyHeight = doc.heightOfString(qty, { width: columns.qtyWidth, lineGap: 1 });
        const rowHeight = Math.max(37, nameHeight + specHeight + 19, qtyHeight + 20);
        if (y + rowHeight > pageBottom - 5) addContinuationPage();
        if (row.alternative) doc.rect(left, y, contentWidth, rowHeight).fill("#FFF8F3");
        const textColor = row.alternative ? "#A04A1D" : "#25344A";
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor(textColor)
          .text(row.name || "Material", columns.itemX, y + 9, { width: columns.itemWidth, lineGap: 1 });
        if (row.specification) {
          doc.font("Helvetica").fontSize(8).fillColor("#78869A")
            .text(row.specification, columns.itemX, y + 11 + nameHeight, { width: columns.itemWidth, lineGap: 1 });
        }
        doc.font("Helvetica").fontSize(8).fillColor("#39485D")
          .text(qty, columns.qtyX, y + 10, { width: columns.qtyWidth, lineGap: 1 });
        doc.font("Helvetica").fontSize(8).fillColor("#39485D");
        drawRupeeAmount(row.unitPrice, columns.rateX, y + 10, columns.rateWidth, "right", "#39485D", false, 8);
        drawRupeeAmount(row.lineTotal, columns.amountX, y + 10, columns.amountWidth, "right", "#39485D", false, 8);
        doc.moveTo(left, y + rowHeight).lineTo(right, y + rowHeight).lineWidth(0.55).strokeColor(COLORS.line).stroke();
        y += rowHeight;
      });

      const notes = quote.notes?.trim() || "";
      const summaryRows: [string, Prisma.Decimal][] = [["Items subtotal", quote.subtotal]];
      if (quote.discountAmount.greaterThan(0)) summaryRows.push(["Discount", quote.discountAmount.negated()]);
      if (quote.marginAmount.greaterThan(0)) summaryRows.push(["Service margin", quote.marginAmount]);
      summaryRows.push([`Tax (${quote.taxPct.toString()}%)`, quote.taxAmount]);
      summaryRows.push(["Delivery / freight", quote.freightAmount]);
      const totalsHeight = summaryRows.length * 19 + 48;
      doc.font("Helvetica").fontSize(8.5);
      const notesHeight = notes
        ? doc.heightOfString(notes, { width: contentWidth - 28, lineGap: 2 }) + 37
        : 0;
      if (y + 14 + notesHeight + totalsHeight > pageBottom) {
        addContinuationPage();
      }
      y += 14;
      if (notes) {
        const boxHeight = Math.max(48, notesHeight);
        doc.roundedRect(left, y, contentWidth, boxHeight, 6).fill("#FFF8F3");
        doc.rect(left, y, 3, boxHeight).fill("#F1A77C");
        doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.ink).text("NOTES", left + 13, y + 10);
        doc.font("Helvetica").fontSize(8.5).fillColor("#617187").text(notes, left + 13, y + 24, {
          width: contentWidth - 26,
          height: boxHeight - 30,
          ellipsis: true,
          lineGap: 2,
        });
        y += boxHeight + 12;
      }
      const summaryWidth = 270;
      const summaryX = right - summaryWidth;
      summaryRows.forEach(([label, value]) => {
        doc.font("Helvetica").fontSize(8.5).fillColor("#66768C").text(label, summaryX, y + 5, { width: 150 });
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#34445B");
        drawRupeeAmount(value.abs(), summaryX + 150, y + 5, summaryWidth - 150, "right", "#34445B", value.isNegative(), 8.5);
        y += 19;
      });
      doc.moveTo(summaryX, y).lineTo(right, y).lineWidth(0.7).strokeColor("#DCE3EB").stroke();
      y += 8;
      doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.ink).text("Estimated total", summaryX, y + 2, { width: 150 });
      doc.font("Helvetica-Bold").fontSize(12).fillColor("#18814D");
      drawRupeeAmount(quote.totalAmount, summaryX + 150, y, summaryWidth - 150, "right", "#18814D", false, 12);

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
            `Material Square  ·  ${quote.quoteNumber}`,
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
          `${item.quantityMt.toLocaleString("en-IN")} × ${item.unit}`,
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
