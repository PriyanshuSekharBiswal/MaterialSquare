import { z } from "zod";

export const QuotationSelectionsSchema = z
  .array(
    z.object({
      itemId: z.string().min(1).max(100),
      optionId: z.string().min(1).max(100),
    }),
  )
  .max(100);

export const CustomerQuotationResponseSchema = z
  .object({
    decision: z.enum(["ACCEPT", "REJECT"]),
    selections: QuotationSelectionsSchema.default([]),
  })
  .superRefine((value, ctx) => {
    if (
      new Set(value.selections.map((selection) => selection.itemId)).size !==
      value.selections.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Choose only one comparison option per material",
      });
  });

export const ExternalQuotationAcceptanceSchema = z
  .object({
    channel: z.enum(["WHATSAPP", "EMAIL", "PHONE"]),
    selections: QuotationSelectionsSchema.default([]),
  })
  .superRefine((value, ctx) => {
    if (
      new Set(value.selections.map((selection) => selection.itemId)).size !==
      value.selections.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Choose only one comparison option per material",
      });
  });

export type QuotationSelection = z.infer<
  typeof QuotationSelectionsSchema
>[number];
export type ExternalAcceptanceChannel = z.infer<
  typeof ExternalQuotationAcceptanceSchema
>["channel"];
