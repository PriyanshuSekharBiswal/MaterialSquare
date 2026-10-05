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
    notice: "Material Square customer website · Draft for client review",
    sections: [
      {
        heading: "Information you provide",
        body: "If you sign in, we use your mobile number to verify your account. You may also save your name, email, company, site address, city, PIN code, and material list so they are available when you sign in again. Browsing the public catalogue does not require an account.",
      },
      {
        heading: "How the website uses it",
        body: "Account information is used to maintain your profile and saved material list and to prepare a request for you to review. If you submit a website request, we save your requirements for staff to review. Your account shows those requests, published quotations, recorded orders, delivery updates, and loyalty points. The website records aggregate counts of page views, product-detail views, material-list additions, and WhatsApp or email handoff clicks for the staff dashboard. Those analytics do not include your name, phone number, saved-list contents, search text, or a visitor identifier.",
      },
      {
        heading: "WhatsApp and email requests",
        body: "When you choose WhatsApp or email, your device opens that service with a message for you to review and send. Material Square does not receive the message or replies through this website, and opening the service does not confirm that a message was sent or delivered. Those services handle information under their own privacy terms.",
      },
      {
        heading: "Sign-in and account choices",
        body: "A sign-in session can remain active on this browser for up to 30 days. You can sign out from your account page. To ask about access, correction, or deletion of account information, contact {{contactEmail}}. The business must confirm its request-handling and retention process before publication.",
      },
      {
        heading: "Contact",
        body: "For privacy questions, contact {{contactEmail}}. The client must verify this address and approve the final notice before launch.",
      },
    ],
    reviewNote:
      "This notice describes the current V1 website behavior. The business owner must confirm its legal identity, contact details, retention periods, request process, and final wording before the site is used with customers.",
  },
  terms: {
    title: "Using the Material Square website",
    notice: "Material Square customer website · Draft for client review",
    sections: [
      {
        heading: "Catalogue information",
        body: "Product descriptions, images, prices, offers, minimum quantities, and availability are maintained by Material Square staff. Catalogue images may be illustrative. Confirm the exact product, pack or unit, price, taxes, availability, delivery charges, and offer validity with staff before relying on them.",
      },
      {
        heading: "Material requests",
        body: "The website can prepare a material request and open WhatsApp or email for you to review and send it. A prepared message, click, or saved material list is not an accepted quotation, confirmed order, or delivery booking. Submitting a website request saves it for staff review. A published quotation can be accepted or declined in My Account; accepting creates an order for staff processing. Staff will confirm availability, commercial terms, and delivery scheduling with you.",
      },
      {
        heading: "Accounts",
        body: "You are responsible for access to the mobile number used to sign in and for signing out when you no longer want the current browser session to remain active. Keep your profile and saved material list accurate.",
      },
      {
        heading: "Contact",
        body: "Questions about these terms can be sent to {{contactEmail}}. The business owner must confirm the responsible legal entity, contact information, and final terms before launch.",
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
