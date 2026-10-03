/**
 * Small, structured copy settings for the existing public pages. Content is
 * plain text only; page layout and product data remain owned by the app.
 */
export const SITE_CONTENT_DEFAULTS = {
  "home.eyebrow": "Browse without an account",
  "home.title": "Why Make 5 Calls?\nOne Call. All Materials.",
  "home.description": "Browse cement, steel, pipes, electricals, paints, and sanitaryware in one place. Save the products you need, then send your request to the Material Square team by WhatsApp or email. Staff confirms current price, stock, taxes, and delivery details with you.",
  "home.slogan": "Aap Construction Sambhaliye, Material Hum Sambhalenge.",
  "whyUs.title": "Construction materials, organized in one place.",
  "whyUs.description": "Browse published products, make a material list, and send your request to the Material Square team. The team confirms product and delivery details with you directly.",
  "whyUs.sectionTitle": "Plan your enquiry at your pace.",
  "whyUs.sectionDescription": "The website helps you prepare. Product availability, final pricing and delivery are confirmed by staff.",
  "guides.title": "Site Engineering & Material Guides",
  "guides.description": "General product and site-planning information. Technical values and installation guidance must be checked against current manufacturer documents and reviewed by a qualified professional.",
  "getQuote.title": "Request a material quotation",
  "getQuote.description": "Build your material list and add your delivery details. Continue the conversation with our team directly through WhatsApp or email.",
  "contact.title": "Tell us what your site needs.",
  "contact.description": "Prepare your enquiry with the site and product details. Review it, then choose WhatsApp or email to send it to our team.",
  "contact.coverageTitle": "Confirm coverage for your site.",
  "contact.coverageDescription": "Serving Delhi NCR (Noida, Greater Noida, Delhi, Gurugram, Ghaziabad & Faridabad). Coverage, product availability, delivery timing, and any site charges are confirmed by staff for each request.",
  "contact.phone": "9773505015",
  "contact.phoneDisplay": "+91 97735 05015",
  "contact.email": "orders@materialsquare.in",
  "contact.location": "Serving Delhi NCR (Noida, Greater Noida, Delhi, Gurugram, Ghaziabad & Faridabad)",
  "contact.officeAddress": "Plot 42, Mohan Nagar Link Road, Industrial Area, Ghaziabad, Uttar Pradesh 201007",
  "footer.calloutTitle": "Ready to Order or Have a Material Query?",
  "footer.calloutDescription": "Send your material list or site requirements to the team by WhatsApp or phone. Staff can confirm product and delivery details.",
  "footer.slogan": "Aap Construction Sambhaliye, Material Hum Sambhalenge.",
  "footer.description": "Browse construction materials, save a list to your account, and contact the Material Square team to confirm product and delivery details.",
} as const;

export type SiteContentKey = keyof typeof SITE_CONTENT_DEFAULTS;
export type SiteContent = Record<SiteContentKey, string>;

export const SITE_CONTENT_GROUPS: {
  label: string;
  fields: { key: SiteContentKey; label: string; multiline?: boolean }[];
}[] = [
  { label: "Homepage", fields: [
    { key: "home.eyebrow", label: "Hero badge" },
    { key: "home.title", label: "Main heading", multiline: true },
    { key: "home.description", label: "Introduction", multiline: true },
    { key: "home.slogan", label: "Slogan" },
  ] },
  { label: "Why Us", fields: [
    { key: "whyUs.title", label: "Page heading" },
    { key: "whyUs.description", label: "Introduction", multiline: true },
    { key: "whyUs.sectionTitle", label: "Feature section heading" },
    { key: "whyUs.sectionDescription", label: "Feature section introduction", multiline: true },
  ] },
  { label: "Tools & Guides", fields: [
    { key: "guides.title", label: "Page heading" },
    { key: "guides.description", label: "Introduction", multiline: true },
  ] },
  { label: "Get Quote", fields: [
    { key: "getQuote.title", label: "Page heading" },
    { key: "getQuote.description", label: "Introduction", multiline: true },
  ] },
  { label: "Contact & business details", fields: [
    { key: "contact.title", label: "Page heading" },
    { key: "contact.description", label: "Introduction", multiline: true },
    { key: "contact.coverageTitle", label: "Coverage section heading" },
    { key: "contact.coverageDescription", label: "Coverage and delivery note", multiline: true },
    { key: "contact.phone", label: "Phone number (digits only)" },
    { key: "contact.phoneDisplay", label: "Phone display text" },
    { key: "contact.email", label: "Customer service email" },
    { key: "contact.location", label: "Service area" },
    { key: "contact.officeAddress", label: "Office address", multiline: true },
  ] },
  { label: "Footer", fields: [
    { key: "footer.calloutTitle", label: "Callout heading" },
    { key: "footer.calloutDescription", label: "Callout text", multiline: true },
    { key: "footer.slogan", label: "Slogan" },
    { key: "footer.description", label: "Business description", multiline: true },
  ] },
];
