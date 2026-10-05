import { z } from "zod";

export const PolicySchema = z.object({
  title: z.string().trim().min(3).max(200),
  notice: z.string().max(300),
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
    sections: [
      {
        heading: "Information you provide",
        body: "Browsing the catalogue does not require an account. The public website does not offer customer sign-in and does not collect visitor contact details when you browse. If you choose to prepare a request in WhatsApp or email, your device opens that service so you can review and send it.",
      },
      {
        heading: "How the website uses it",
        body: "Your material list stays in this browser and is not sent to Material Square unless you choose an external contact method. The website records aggregate counts of page views, product-detail views, material-list additions, and WhatsApp or email handoff clicks for operations reporting. Those analytics do not include your name, phone number, saved-list contents, search text, or a visitor identifier.",
      },
      {
        heading: "WhatsApp and email requests",
        body: "When you choose WhatsApp or email, your device opens that service with a message for you to review and send. Material Square does not receive the message or replies through this website, and opening the service does not confirm that a message was sent or delivered. Those services handle information under their own privacy terms.",
      },
      {
        heading: "Browser storage",
        body: "The quote list is stored in your browser so it remains available while you browse. Clearing this browser's site data removes the saved list. Material Square should confirm any additional retention or request-handling practices before publication.",
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
