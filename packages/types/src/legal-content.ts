import { z } from "zod";

export const PolicySchema = z.object({
  title: z.string().trim().min(3).max(200),
  notice: z.string().max(300),
  published: z.boolean().default(false),
  sections: z
    .array(
      z.object({
        heading: z.string().trim().min(3).max(200),
        body: z.string().trim().min(3).max(4000),
      }),
    )
    .min(1)
    .max(20),
  reviewNote: z.string().max(2000),
});
export type WebsitePolicy = z.infer<typeof PolicySchema>;
export const DEFAULT_POLICIES: Record<"privacy" | "terms", WebsitePolicy> = {
  privacy: {
    title: "How we handle your information",
    notice: "Information about using this website",
    published: false,
    sections: [
      {
        heading: "Information you provide",
        body: "Browsing the catalogue and preparing a browser-stored quote list do not require an account. Customers may choose to verify a mobile number using the configured MSG91 phone-verification service to access their account. The account can store contact and project-profile details and show requests, quotations, orders, delivery updates, and loyalty activity linked to that verified customer record. The business must confirm its retention periods, account-data handling, and customer-support process before publication.",
      },
      {
        heading: "How the website uses it",
        body: "Your guest quote list stays in this browser. If you sign in, the website uses a secure account session and retrieves only customer records associated with your verified account. The website also records aggregate counts of page views, product-detail views, material-list additions, and WhatsApp or email handoff clicks for operations reporting. Those analytics do not include your name, phone number, saved-list contents, search text, or a visitor identifier.",
      },
      {
        heading: "WhatsApp and email requests",
        body: "When you choose WhatsApp or email, your device opens that service with a message for you to review and send. Material Square does not receive the message or replies through this website, and opening the service does not confirm that a message was sent or delivered. Those services handle information under their own privacy terms.",
      },
      {
        heading: "Browser storage",
        body: "The guest quote list is stored in your browser so it remains available while you browse. Clearing this browser's site data removes the saved list. A signed-in account may also access business records linked to its verified phone number. Material Square should confirm account retention and request-handling practices before publication.",
      },
      {
        heading: "Contact",
        body: "For privacy questions, prepare a message through the Contact page and use one of the contact options published by the business.",
      },
    ],
    reviewNote:
      "This notice describes the current V1 website behavior. The business owner must confirm its legal identity, contact details, retention periods, request process, and final wording before the site is used with customers.",
  },
  terms: {
    title: "Using the Material Square website",
    notice: "Information about using this website",
    published: false,
    sections: [
      {
        heading: "Catalogue information",
        body: "Product descriptions, images, prices, offers, minimum quantities, and availability are maintained by Material Square staff. Confirm the exact product, pack or unit, price, taxes, availability, delivery charges, and offer validity with staff before relying on them.",
      },
      {
        heading: "Material requests",
        body: "The website can prepare a material request and open WhatsApp or email for you to review and send it. A prepared message, click, or saved material list is not a confirmed order or delivery booking. Staff will confirm availability, commercial terms, and delivery scheduling with you.",
      },
      {
        heading: "Quote list",
        body: "The quote list is saved in this browser and can be removed by clearing this site's browser data. Review the request details before choosing to continue in WhatsApp or email.",
      },
      {
        heading: "Customer account",
        body: "Customer sign-in uses a one-time verification code sent through the configured phone-verification provider. Keep access to your verified phone number secure. Account access lets you view business records associated with that verified number. A customer account, quotation, saved list, or prepared message is not itself an order.",
      },
      {
        heading: "Contact",
        body: "Questions about these terms can be sent using one of the contact options published by the business.",
      },
    ],
    reviewNote:
      "Draft for client and legal review. These website terms do not replace the commercial terms for a quotation, sale, delivery, or return.",
  },
};
export function parsePolicy(
  value: string,
  kind: "privacy" | "terms",
): WebsitePolicy {
  try {
    const parsed = PolicySchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : DEFAULT_POLICIES[kind];
  } catch {
    return DEFAULT_POLICIES[kind];
  }
}
