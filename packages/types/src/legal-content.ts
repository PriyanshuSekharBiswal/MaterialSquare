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
    title: "Privacy Notice",
    notice: "Last updated 8 October 2026",
    published: true,
    sections: [
      {
        heading: "Who this notice covers",
        body: "This notice applies when you browse the Material Square website, use a customer account, prepare or send an enquiry, request a quotation, or buy from the business through a separately confirmed transaction. Material Square is the public-facing brand used on this site. The website settings currently identify the contact email as {{contactEmail}} and the contact telephone as +91 77355 27252. The operating business’s full legal name and registered or principal address are not identified in the website settings; they should be confirmed and displayed on the production site.",
      },
      {
        heading: "Information you provide",
        body: "Depending on how you use the site, we may collect your mobile number, name, email address, company name, GSTIN, billing or delivery address, city and PIN code; the material, brand, product options, quantity, unit and specifications in an enquiry; project site, project stage, requested delivery date and notes; and information you choose to include in a message. If you create or use an account, these details can be associated with your customer record. Fields not needed for a particular enquiry should be left blank. Do not send passwords, payment-card details, identity documents or sensitive personal information unless the team specifically asks through an appropriate secure process.",
      },
      {
        heading: "Phone verification and account sessions",
        body: "Customer sign-in verifies a mobile number using a one-time code sent through MSG91, the configured verification service. The website application does not save the one-time code as a customer record. MSG91 processes the phone number and verification request under its own terms and retention practices. After sign-in, the application stores a customer session record and a hash of its session token, with creation and expiry information. A browser cookie named ms_customer_session keeps the session; it is HttpOnly, uses SameSite=Lax, is limited to the /api path, and is marked Secure in production. Sessions expire after about one year and may be renewed while you use the account. Sign out or clear this site’s browser data to remove the browser session; the server session record may remain until its expiry or deletion.",
      },
      {
        heading: "Enquiries, quotations and orders",
        body: "When the team records an enquiry or RFQ, the business system may store your contact details, project and delivery information, requested product lines, quantities, specifications, notes, status and related customer account. Drawings, project plans and site photographs you choose to upload may be stored with the enquiry; the system records file metadata such as name, type, size and storage reference. Quotations and orders may also contain item lines, agreed prices, taxes, freight, discounts, dates, delivery details, invoices or delivery documents, and order status. For payments handled outside this website, staff may record payment status, method, reference and time. The current website does not provide card or bank-account checkout and does not ask for your online banking credentials.",
      },
      {
        heading: "Images and files",
        body: "Only upload files you are entitled to share and that are relevant to your request. Uploaded project files are used to understand and respond to the enquiry and are accessible to authorised staff and service providers needed to store or process them. Do not upload another person’s personal information unless you have authority to do so. Public product and category images are business catalogue content and are separate from customer-submitted project files.",
      },
      {
        heading: "Guest material lists and browser storage",
        body: "You can browse without signing in. A guest material list is kept in this browser’s local storage under the key material-square-bom; it can include selected product names, identifiers, brand, unit, quantity, specifications and options. It is not sent to the server just by being kept in the list. Clearing this site’s browser storage removes that local list. The site also uses the essential customer-session cookie described above. The current application code does not include an advertising pixel or third-party behavioural advertising analytics. Your browser or hosting provider may still keep ordinary technical logs.",
      },
      {
        heading: "Website analytics and security logs",
        body: "The website records aggregate counts by day for page views, product views, material-list additions and clicks that hand off an enquiry to WhatsApp or email. These counters record the event type and an allowed page or product target; they are not linked to a visitor account and do not contain the saved list, search text, name or phone number. For service security and abuse prevention, the API may temporarily use a request IP address and API path in an in-memory rate limiter, and hosting or infrastructure providers may create server, diagnostic or security logs. Staff activity and security records can include staff account, action, time and related record or request metadata.",
      },
      {
        heading: "How we use information",
        body: "We use information to verify account access; answer enquiries; prepare quotations; manage customer, supplier and order records; coordinate availability, delivery and after-sales support; maintain and secure the website; prevent misuse; keep business and audit records; and meet legal obligations. We do not use guest-list contents to identify you unless you choose to send them or associate them with an account or enquiry.",
      },
      {
        heading: "When information is shared",
        body: "Access is limited to authorised Material Square staff who need the information for their work. Information may be handled by the providers configured to operate the website, database, file storage, messaging verification and technical infrastructure, including MSG91 for phone verification. Where needed to respond to an enquiry or fulfil a confirmed order, relevant details may be shared with a supplier, delivery provider or other service partner. If you select WhatsApp or email, your device opens that third-party service with a message for you to review and send; the service then handles the information under its own terms. Information may also be disclosed when required by law or to protect people, property, rights or the security of the service. The specific hosting providers and processing locations depend on the production configuration.",
      },
      {
        heading: "Retention and deletion requests",
        body: "We keep account, enquiry, quotation, order, delivery, payment-reference and related business records for as long as needed to respond, operate the business, resolve disputes and meet legal or accounting duties. Session records have an expiry of about one year. The application also has short-lived website-content recovery records (up to seven days), a seven-day recent-activity view, and a 30-day recovery period for certain soft-deleted catalogue records. Aggregate analytics counters do not currently have an automatic deletion schedule. These technical periods are not a complete retention schedule for all business records; the business must set and follow a documented schedule. You can ask us to correct or delete information using the contact details below. We may need to verify your identity and may retain information where law or a transaction requires it.",
      },
      {
        heading: "Your choices and requests",
        body: "You can browse without an account, leave optional profile fields blank, remove a guest material list by clearing browser storage, sign out, or stop using the site. You may contact us to request access to, correction of, or deletion of personal information, or to withdraw consent where consent is the basis for processing. We will review requests under applicable law, verify the requester where appropriate, and explain if some records must be retained. To make a privacy request or complaint, email {{contactEmail}} or call +91 77355 27252. The production site should identify the appointed grievance contact and the operating business before launch.",
      },
      {
        heading: "External services, security and changes",
        body: "WhatsApp, email applications, MSG91 and infrastructure providers are separate services with their own privacy practices. Information may be processed in the regions where those providers operate; the exact provider and region list should be confirmed from the production configuration. We use access controls and technical safeguards appropriate to the service, but no website or transmission can be guaranteed completely secure. If you believe your account or information has been misused, contact us promptly. We may update this notice when the service, law or our practices change; the date at the top shows the latest published revision.",
      },
      {
        heading: "Children and privacy contact",
        body: "This business catalogue is intended for people making construction-material enquiries, not for children. Do not knowingly submit a child’s personal information through the site. If you believe a child’s information was submitted, contact {{contactEmail}} so we can review it. For any other privacy question, correction, deletion request or complaint, contact {{contactEmail}} or +91 77355 27252.",
      },
    ],
    reviewNote:
      "Before production launch, confirm the operating legal name and principal address, appointed grievance officer name/designation, customer-support process, actual production vendors and processing regions, retention schedule and deletion workflow, any cookies/analytics added outside this app, and lawyer review. Contact currently configured: admin@materialsquare.in / +91 77355 27252. Do not treat this copy as a guarantee of legal compliance.",
  },
  terms: {
    title: "Terms and Conditions",
    notice: "Last updated 8 October 2026",
    published: true,
    sections: [
      {
        heading: "About these terms",
        body: "These terms apply to your use of the Material Square website, catalogue, account and enquiry tools. Material Square is the public-facing brand used on this site. The website currently lists {{contactEmail}} and +91 77355 27252 for contact. The legal name and principal address of the business operating the site must be confirmed and displayed on the production website. These website terms do not replace a written quotation, tax invoice, purchase order or other terms agreed for a particular sale.",
      },
      {
        heading: "Catalogue and product information",
        body: "The catalogue helps you find construction materials and prepare an enquiry. Product names, brands, images, specifications, packaging, prices, stock, minimum quantities, taxes, offers and delivery information may change and may be supplied or confirmed by staff. Images and descriptions are for identification and may not show every packaging or batch variation. Check the product label and manufacturer documentation, and ask the team to confirm the exact item, specification, quantity, price, taxes, availability and delivery charges before committing to a purchase.",
      },
      {
        heading: "Enquiries, quotations and order formation",
        body: "A saved material list, form submission, click, WhatsApp/email hand-off or request for a quotation is an enquiry only; it is not acceptance of an order, a stock reservation or a delivery booking. A quotation is subject to its stated validity, quantities, taxes, delivery terms and other conditions. A sale is formed only when the business confirms acceptance in writing or issues the applicable order confirmation or invoice. If documents conflict, the terms specifically agreed for that transaction and applicable law govern.",
      },
      {
        heading: "Prices, payments and taxes",
        body: "The current website does not accept online payment or store card or bank login credentials. Payment method, due date and payment destination must be confirmed on the applicable quotation or invoice. Do not pay to an account supplied only in an unverified message. Any payment handled outside the website is subject to the written order or invoice terms; staff may record its status, method, reference and time. Taxes and delivery charges will be confirmed for the transaction before acceptance.",
      },
      {
        heading: "Availability, delivery, cancellation and returns",
        body: "Stock, site coverage, delivery dates and charges are confirmed for each request. No delivery time is guaranteed by a catalogue listing or enquiry. Before accepting a quotation, ask for the delivery, inspection, cancellation, return, replacement, refund and warranty terms that apply to your order and have them recorded in the order confirmation or invoice. Any such terms remain subject to rights that cannot be excluded under applicable law. The website does not currently state one universal delivery or return policy for every product.",
      },
      {
        heading: "Accounts and customer information",
        body: "If you use an account, provide information that is accurate and keep control of the verified mobile number used to sign in. You are responsible for activity through a device or number you control, except where law provides otherwise. Contact us promptly if you suspect unauthorised account access. Account access displays records associated with the verified customer account; it does not itself make a quotation or enquiry an order. Use of personal information is explained in the Privacy Notice.",
      },
      {
        heading: "Project files and submitted material",
        body: "Only submit product schedules, drawings, site photographs, contact details or other material that you are entitled to share. You give the business permission to use and share those items as reasonably needed to review your request, prepare a quotation and fulfil an order. You remain responsible for the accuracy of quantities, dimensions and project information you provide. Do not upload unlawful, confidential third-party or harmful content.",
      },
      {
        heading: "Technical information and professional advice",
        body: "Guides and general product information on the website are for planning and enquiry purposes. They are not a substitute for current manufacturer instructions, applicable standards, site inspection, structural design or advice from a qualified architect, engineer, contractor or other professional. You are responsible for having product suitability, design, quantities, installation and safety checked by an appropriately qualified person before use.",
      },
      {
        heading: "Website content and intellectual property",
        body: "Website layout, text, graphics and Material Square marks are owned by or used with permission of their respective rights holders. Product names, logos and marks belong to their respective owners. You may use the website to browse and prepare a genuine enquiry. Do not copy, republish, scrape, alter or commercially exploit site content or another party’s marks without permission, except where applicable law allows it.",
      },
      {
        heading: "Acceptable use and service availability",
        body: "Use the website lawfully and do not disrupt it, attempt unauthorised access, submit malicious code, interfere with another user, misrepresent your identity, or use automated activity that places unreasonable load on the service. We may restrict access to protect the website, users or business records. We work to keep the website available but cannot promise uninterrupted or error-free operation; catalogue enquiries may be handled through the published contact channels if a feature is unavailable.",
      },
      {
        heading: "Third-party services",
        body: "Links or hand-offs to WhatsApp, email, phone, maps, verification or other third-party services are provided for convenience. Those services are operated by others and are governed by their own terms and privacy notices. Material Square does not control whether a message is sent, delivered or answered when your device opens an external service.",
      },
      {
        heading: "Complaints, liability and applicable law",
        body: "For an enquiry or complaint, contact {{contactEmail}} or +91 77355 27252 and include your quotation or order reference if available. We will review the matter under applicable law. Nothing in these terms removes consumer rights, remedies, guarantees or liability that cannot lawfully be excluded or limited. These terms are governed by the laws applicable in India, and disputes may be brought before a forum with jurisdiction under applicable law. Contact details and the appointed grievance officer should be confirmed on the production site.",
      },
    ],
    reviewNote:
      "Before production launch, confirm legal operator identity/principal address, appointed grievance officer name/designation and contact, exact seller/marketplace role, order acceptance flow, GST/tax disclosures, stock and delivery process, cancellation/returns/refund/warranty terms, and counsel review. Copy is published only to localhost at this stage; do not treat it as a guarantee of legal compliance.",
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
