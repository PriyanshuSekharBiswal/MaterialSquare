import { DEFAULT_POLICIES } from "./legal-content";
import { z } from "zod";
export const SEO_SERVICE_AREA_SLUGS = [
  "noida",
  "greater-noida",
  "delhi",
  "gurugram",
  "ghaziabad",
  "faridabad",
] as const;
export const SEO_SERVICE_AREA_PAGES = [
  { slug: "noida", name: "Noida", description: "Browse construction material options and request a project quote for Noida. Share your sector, exact site PIN code, materials and delivery stage so the team can check current coverage and availability." },
  { slug: "greater-noida", name: "Greater Noida", description: "Planning a build in Greater Noida? Organise cement, steel, electrical, plumbing and finishing requirements into one material enquiry. Delivery coverage and timing are confirmed against your site PIN code." },
  { slug: "delhi", name: "Delhi", description: "For construction and renovation projects in Delhi, prepare a specification-led list with brand, grade, size, pack and quantity. Ask the team to confirm product options, quote details and delivery access for your location." },
  { slug: "gurugram", name: "Gurugram", description: "Material Square accepts project enquiries from Gurugram for listed construction materials. Share the project stage, bill of quantities and PIN code to check product availability, transport and delivery timing." },
  { slug: "ghaziabad", name: "Ghaziabad", description: "Build a clear material list for residential or commercial work in Ghaziabad, including the exact sizes, grades and pack options required. Local pricing, stock and delivery are confirmed for the specific site." },
  { slug: "faridabad", name: "Faridabad", description: "Request construction material options for a Faridabad project by sharing your site PIN code and item specifications. The team confirms the available catalogue, current quote and delivery plan before an order is placed." },
] as const;
/**
 * City pages stay out of search until each has distinct, reviewed local
 * information beyond shared catalogue and quotation copy.
 */
export const SEO_INDEXABLE_SERVICE_AREA_SLUGS: readonly string[] = [];

/** Resolve only locations explicitly named in the approved service-area copy. */
export function serviceAreaSlugs(value: string): string[] {
  const normalized = value.toLocaleLowerCase("en-IN").replace(/[^a-z0-9]+/g, " ").trim();
  if (!normalized) return [];
  if (/\b(?:delhi\s+)?ncr\b/.test(normalized)) return [...SEO_SERVICE_AREA_SLUGS];

  const contains = (name: string) =>
    new RegExp(`(?:^| )${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?: |$)`).test(normalized);
  return SEO_SERVICE_AREA_SLUGS.filter((slug) => {
    const name = slug.replace(/-/g, " ");
    return contains(name) || (slug === "gurugram" && contains("gurgaon"));
  });
}

export const SEO_ROUTE_DESCRIPTIONS: Record<string, string> = {
  "/": "Browse construction materials, build a list by product and quantity, and request a project quote. Price, stock and delivery depend on your site PIN code.",
  "/marketplace": "Explore listed cement, steel, plumbing, electrical and finishing materials by brand and specification. Add product options and quantities to your project list.",
  "/why-us": "See how Material Square helps project teams organise material enquiries. The team confirms product options, current pricing and delivery for each project site.",
  "/guides": "Use material and site-planning guides to prepare your enquiry. Check technical values and installation instructions against current manufacturer documents.",
  "/get-quote": "Request a material quote with product options, quantities and delivery details. Price, availability, taxes and delivery are confirmed for your project site.",
  "/contact": "Contact Material Square about materials and project quotations. Share your site PIN code so the team can check availability and delivery.",
  "/blogs": "Read practical articles on construction materials, product specifications and project procurement from Material Square.",
  "/experts": "Find listed product enquiry desks and service providers, then check whether they support your project requirements and PIN code.",
  "/privacy": "Read how Material Square handles customer account, quotation and project information when you use this website.",
  "/terms": "Review the terms that apply when browsing the Material Square catalogue and submitting a construction-material enquiry.",
};
export const DEFAULT_FAQ_ENTRIES = [
  {
    question: "How do I request a construction material quotation?",
    answer:
      "Browse the published catalogue, add the products and pack options you need, and enter your quantities and project location. Submit the request so the team can confirm current pricing, availability, taxes and delivery for your site.",
  },
  {
    question: "Are catalogue prices and stock availability guaranteed?",
    answer:
      "No. A catalogue listing or reference price does not confirm local stock or a final price. Material Square confirms the current price, availability, taxes and delivery for the products, quantities and site location in your request.",
  },
  {
    question: "Which locations does Material Square serve?",
    answer:
      "Coverage depends on your exact site PIN code, requested products and quantities. Share your PIN code with the team so they can confirm whether delivery is available for your project.",
  },
  {
    question: "Do I need an account to browse materials or build a material list?",
    answer:
      "No. You can browse the published catalogue and prepare a material list without signing in. You will be asked for contact and project details when submitting a quotation request.",
  },
];
/**
 * Small, structured copy settings for the existing public pages. Content is
 * plain text only; page layout and product data remain owned by the app.
 */
export const SITE_CONTENT_DEFAULTS = {
  "website.pages": "[]",
  "policy.privacy": JSON.stringify(DEFAULT_POLICIES.privacy),
  "policy.terms": JSON.stringify(DEFAULT_POLICIES.terms),
  "faq.enabled": "true",
  "faq.entries": JSON.stringify(DEFAULT_FAQ_ENTRIES),
  "navigation.order": "home,marketplace,why,guides,blogs,experts,contact",
  "navigation.hidden": "",
  "navigation.custom": "[]",
  "navigation.home": "Home",
  "navigation.marketplace": "Marketplace",
  "navigation.why": "Why Us",
  "navigation.guides": "Tools & Guides",
  "navigation.blogs": "Blogs",
  "navigation.experts": "Experts",
  "navigation.contact": "Contact",
  "seo.siteTitle": "Material Square",
  "seo.description":
    SEO_ROUTE_DESCRIPTIONS["/"],
  "seo.homeTitle": "Material Square | Construction Materials",
  "seo.marketplaceTitle": "Construction Materials Catalogue | Material Square",
  "seo.whyUsTitle": "Why Material Square",
  "seo.guidesTitle": "Material Guides | Material Square",
  "seo.quoteTitle": "Request a Quotation | Material Square",
  "seo.contactTitle": "Contact Material Square",
  "seo.blogsTitle": "Articles | Material Square",
  "seo.expertsTitle": "Experts and Services | Material Square",
  "home.sectionOrder": "hero,trust,categories,brands,why,tools,contact,content",
  "home.hiddenSections": "",
  "home.contentBlocks": "[]",
  "home.heroImage": "",
  "home.categoryImage.steel": "/images/categories/steel-category.webp",
  "home.categoryImage.adhesives": "/images/categories/adhesives-category.webp",
  "home.calloutBadge": "Prepare a material request",
  "home.calloutTitle": "Build your material list",
  "home.calloutDescription":
    "Add products and quantities to your list, then review your request before copying or sending it.",
  "home.calloutButton": "Get a Quote",
  "home.calloutButtonPath": "/get-quote",
  "home.primaryCtaLabel": "Browse Full Marketplace",
  "home.primaryCtaPath": "/marketplace",
  "home.secondaryCtaLabel": "Get a Quote",
  "home.secondaryCtaPath": "/get-quote",
  "home.eyebrow": "Browse without an account",
  "home.title": "Find materials for your project",
  "home.description":
    "Search products and brands in the catalogue. Add the items and quantities you need, then prepare a request for the team.",
  "home.slogan": "",
  "whyUs.title": "Construction materials, organized in one place.",
  "whyUs.description":
    "Browse published products, make a material list, and send your request to the Material Square team. The team confirms product and delivery details with you directly.",
  "whyUs.sectionTitle": "Plan your enquiry at your pace.",
  "whyUs.sectionDescription":
    "The website helps you prepare. Product availability, final pricing and delivery are confirmed by staff.",
  "guides.title": "Site Engineering & Material Guides",
  "guides.description":
    "General product and site-planning information. Technical values and installation guidance must be checked against current manufacturer documents and reviewed by a qualified professional.",
  "guides.tabOrder": "wire,plumbing,storage",
  "guides.hiddenTabs": "",
  "guides.tab.wire.label": "Wire Selection Checklist",
  "guides.tab.wire.title": "Prepare a Wire Enquiry",
  "guides.tab.wire.description":
    "Select the kind of work you are planning and prepare a question for the team. Cable size, protection, route and installation must be specified by a qualified electrical professional.",
  "guides.tab.plumbing.label": "Plumbing Basics (PVC / CPVC / uPVC)",
  "guides.tab.plumbing.title":
    "Plumbing Pipe Selection Matrix & Material Dating",
  "guides.tab.plumbing.description":
    "Pipe selection depends on the system design, operating conditions, local standards, and manufacturer instructions. Use this comparison only as a starting point for professional review.",
  "guides.tab.storage.label": "Site Storage & Handling Rules",
  "guides.tab.storage.title":
    "Pipe Kharid Liya... Rakhenge Kahan? — Proper Site Storage Guide",
  "guides.tab.storage.description":
    "Storage requirements vary by material and manufacturer. Use current product documentation and the site safety plan to set handling and storage procedures.",
  "guides.callout.title": "Have Structural or Plumbing Drawings for Your Site?",
  "guides.callout.description":
    "Share a drawing or material schedule with the team. A qualified project professional should verify quantities and specifications.",
  "getQuote.title": "Request a material quotation",
  "getQuote.description":
    "Build your material list and add your delivery details. Continue the conversation with our team directly through WhatsApp or email.",
  "contact.title": "Tell us what your site needs.",
  "contact.description":
    "Prepare your enquiry with the site and product details. Review it, then choose WhatsApp or email to send it to our team.",
  "contact.coverageTitle": "Delivery information",
  "contact.coverageDescription":
    "Ask the team to confirm site coverage, delivery timing, and any applicable charges for your request.",
  "contact.phone": "7735527252",
  "contact.phoneDisplay": "+91 77355 27252",
  "contact.email": "admin@materialsquare.in",
  "contact.location": "",
  "contact.officeName": "Material Square",
  "contact.officeAddress": "192, Prakash Industrial Estate, Sahibabad, Ghaziabad, Uttar Pradesh",
  "contact.mapUrl": "https://maps.app.goo.gl/sPj9Ai7rZpLMPKh36",
  "footer.socialLinks": "[]",
  "footer.calloutTitle": "Ready to Order or Have a Material Query?",
  "footer.calloutDescription":
    "Build a material list and prepare a request with the products and quantities you need.",
  "footer.slogan": "",
  "footer.description":
    "Browse published products and keep a quote list in this browser while you plan your request.",
} as const;

export type SiteContentKey = keyof typeof SITE_CONTENT_DEFAULTS;
export type SiteContent = Record<SiteContentKey, string>;

// Some existing installations still have the original preview copy saved in
// WebsiteContent. Keep those exact, unapproved values from leaking to the
// public site if their cleanup migration has not run yet. Values edited by the
// client are preserved.
const LEGACY_UNAPPROVED_SITE_CONTENT: Partial<Record<SiteContentKey, string>> = {
  "contact.phone": "9773505015",
  "contact.phoneDisplay": "+91 97735 05015",
  "contact.email": "orders@materialsquare.in",
  "contact.location": "Serving Delhi NCR (Noida, Greater Noida, Delhi, Gurugram, Ghaziabad & Faridabad)",
  "contact.officeAddress": "Plot 42, Mohan Nagar Link Road, Industrial Area, Ghaziabad, Uttar Pradesh 201007",
  "contact.coverageTitle": "Confirm coverage for your site.",
  "contact.coverageDescription": "Serving Delhi NCR (Noida, Greater Noida, Delhi, Gurugram, Ghaziabad & Faridabad). Coverage, product availability, delivery timing, and any site charges are confirmed by staff for each request.",
  "footer.socialLinks": '[{"id":"instagram","label":"Instagram","url":"https://www.instagram.com/materialsquare.in/"}]',
  "home.slogan": "Aap Construction Sambhaliye, Material Hum Sambhalenge.",
  "footer.slogan": "Aap Construction Sambhaliye, Material Hum Sambhalenge.",
  "home.title": "Why Make 5 Calls?\nOne Call. All Materials.",
  "home.description": "Browse products and brands published in the current catalogue. Add the quantities you need to a quote list, then contact the Material Square team by WhatsApp or email to confirm price, stock, taxes, and delivery details.",
  "home.calloutTitle": '"Ghar banana tha... Material ki list khatam hi nahi ho rahi!"',
  "home.calloutDescription": "Add products to your list or describe your requirements. Review the message, then send it to the team by WhatsApp or email.",
  "footer.calloutDescription": "Send your material list or site requirements to the team by WhatsApp or phone. Staff can confirm product and delivery details.",
  "footer.description": "Browse construction materials, keep a quote list in this browser, and contact the Material Square team to confirm product and delivery details.",
};

export function sanitizePublicSiteContent(
  content: Record<string, unknown> | null | undefined,
): SiteContent {
  const safe = { ...SITE_CONTENT_DEFAULTS } as Record<SiteContentKey, string>;
  for (const key of Object.keys(SITE_CONTENT_DEFAULTS) as SiteContentKey[]) {
    if (typeof content?.[key] === "string") safe[key] = content[key] as string;
    if (safe[key] === LEGACY_UNAPPROVED_SITE_CONTENT[key])
      safe[key] = SITE_CONTENT_DEFAULTS[key];
  }
  return safe;
}

export const SITE_CONTENT_GROUPS: {
  label: string;
  fields: {
    key: SiteContentKey;
    label: string;
    multiline?: boolean;
    image?: boolean;
  }[];
}[] = [
  {
    label: "Page metadata",
    fields: [
      { key: "seo.siteTitle", label: "Default page title" },
      {
        key: "seo.description",
        label: "Default page description",
        multiline: true,
      },
      { key: "seo.homeTitle", label: "Homepage browser title" },
      { key: "seo.marketplaceTitle", label: "Catalogue browser title" },
      { key: "seo.whyUsTitle", label: "Why Us browser title" },
      { key: "seo.guidesTitle", label: "Guides browser title" },
      { key: "seo.quoteTitle", label: "Quotation browser title" },
      { key: "seo.contactTitle", label: "Contact browser title" },
      { key: "seo.blogsTitle", label: "Blog browser title" },
      { key: "seo.expertsTitle", label: "Experts browser title" },
    ],
  },
  {
    label: "Homepage",
    fields: [
      {
        key: "home.heroImage",
        label: "Homepage hero banner image",
        image: true,
      },
      {
        key: "home.categoryImage.steel",
        label: "Steel & Reinforcement category image",
        image: true,
      },
      {
        key: "home.categoryImage.adhesives",
        label: "Adhesives & Grouts category image",
        image: true,
      },
      { key: "home.eyebrow", label: "Hero badge" },
      { key: "home.title", label: "Main heading", multiline: true },
      { key: "home.description", label: "Introduction", multiline: true },
      { key: "home.slogan", label: "Slogan" },
      { key: "home.primaryCtaLabel", label: "Primary button label" },
      { key: "home.primaryCtaPath", label: "Primary button site path" },
      { key: "home.secondaryCtaLabel", label: "Secondary button label" },
      { key: "home.secondaryCtaPath", label: "Secondary button site path" },
      { key: "home.calloutBadge", label: "Homepage callout badge" },
      { key: "home.calloutTitle", label: "Homepage callout heading" },
      {
        key: "home.calloutDescription",
        label: "Homepage callout message",
        multiline: true,
      },
      { key: "home.calloutButton", label: "Homepage callout button label" },
      {
        key: "home.calloutButtonPath",
        label: "Homepage callout button site path",
      },
    ],
  },
  {
    label: "Why Us",
    fields: [
      { key: "whyUs.title", label: "Page heading" },
      { key: "whyUs.description", label: "Introduction", multiline: true },
      { key: "whyUs.sectionTitle", label: "Feature section heading" },
      {
        key: "whyUs.sectionDescription",
        label: "Feature section introduction",
        multiline: true,
      },
    ],
  },
  {
    label: "Tools & Guides",
    fields: [
      { key: "guides.title", label: "Page heading" },
      { key: "guides.description", label: "Introduction", multiline: true },
    ],
  },
  {
    label: "Get Quote",
    fields: [
      { key: "getQuote.title", label: "Page heading" },
      { key: "getQuote.description", label: "Introduction", multiline: true },
    ],
  },
  {
    label: "Contact & business details",
    fields: [
      { key: "contact.title", label: "Page heading" },
      { key: "contact.description", label: "Introduction", multiline: true },
      { key: "contact.coverageTitle", label: "Coverage section heading" },
      {
        key: "contact.coverageDescription",
        label: "Coverage and delivery note",
        multiline: true,
      },
      { key: "contact.phone", label: "Phone number (digits only)" },
      { key: "contact.phoneDisplay", label: "Phone display text" },
      { key: "contact.email", label: "Customer service email" },
      { key: "contact.location", label: "Service area" },
      { key: "contact.officeName", label: "Office or depot name" },
      {
        key: "contact.officeAddress",
        label: "Office address",
        multiline: true,
      },
      { key: "contact.mapUrl", label: "Exact Google Maps location link" },
    ],
  },
  {
    label: "Footer",
    fields: [
      { key: "footer.calloutTitle", label: "Callout heading" },
      {
        key: "footer.calloutDescription",
        label: "Callout text",
        multiline: true,
      },
      { key: "footer.slogan", label: "Slogan" },
      {
        key: "footer.description",
        label: "Business description",
        multiline: true,
      },
    ],
  },
];

export const HOMEPAGE_SECTIONS = [
  { id: "hero", label: "Hero introduction" },
  { id: "trust", label: "Trust strip" },
  { id: "categories", label: "Material categories" },
  { id: "brands", label: "Brands" },
  { id: "why", label: "Why Material Square" },
  { id: "tools", label: "Engineering guides" },
  { id: "contact", label: "Contact callout" },
  { id: "content", label: "Custom content blocks" },
] as const;

export const HomeContentBlocksSchema = z
  .array(
    z
      .object({
        id: z.string().regex(/^block-[a-z0-9-]{1,60}$/),
        title: z.string().trim().min(1).max(120),
        body: z.string().trim().min(1).max(1000),
        buttonLabel: z.string().trim().max(40).default(""),
        buttonPath: z.string().trim().max(300).default(""),
        visible: z.boolean().default(true),
      })
      .strict()
      .superRefine((block, context) => {
        if (
          block.buttonPath &&
          (!block.buttonPath.startsWith("/") ||
            block.buttonPath.startsWith("//") ||
            block.buttonPath.includes("\\") ||
            /\p{Cc}/u.test(block.buttonPath))
        )
          context.addIssue({
            code: "custom",
            path: ["buttonPath"],
            message: "Use a valid path within this website",
          });
      }),
  )
  .max(10)
  .superRefine((blocks, context) => {
    if (new Set(blocks.map(({ id }) => id)).size !== blocks.length)
      context.addIssue({
        code: "custom",
        message: "Custom content block IDs must be unique",
      });
  });
export type HomeContentBlock = z.infer<typeof HomeContentBlocksSchema>[number];

export function homeContentBlocks(value: string): HomeContentBlock[] {
  try {
    const result = HomeContentBlocksSchema.safeParse(JSON.parse(value || "[]"));
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

export const SocialLinksSchema = z
  .array(
    z.object({
      id: z.string().regex(/^social-[a-z0-9-]{1,50}$/),
      label: z.string().trim().min(1).max(60),
      url: z
        .string()
        .trim()
        .url()
        .max(2048)
        .refine((value) => {
          try {
            const parsed = new URL(value);
            return (
              parsed.protocol === "https:" &&
              !parsed.username &&
              !parsed.password
            );
          } catch {
            return false;
          }
        }, "Use an HTTPS address without embedded credentials"),
    }),
  )
  .max(8);
export type SocialLink = z.infer<typeof SocialLinksSchema>[number];

export function parseSocialLinks(value: string): SocialLink[] {
  try {
    const parsed = SocialLinksSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export const GUIDE_TABS = [
  { id: "wire", label: "Wire enquiry", icon: "wire" },
  { id: "plumbing", label: "Plumbing guide", icon: "plumbing" },
  { id: "storage", label: "Site storage guide", icon: "storage" },
] as const;
export type GuideTabId = (typeof GUIDE_TABS)[number]["id"];
export function guideTabContent(content: SiteContent, id: GuideTabId) {
  const fields = {
    wire: {
      label: "guides.tab.wire.label",
      title: "guides.tab.wire.title",
      description: "guides.tab.wire.description",
    },
    plumbing: {
      label: "guides.tab.plumbing.label",
      title: "guides.tab.plumbing.title",
      description: "guides.tab.plumbing.description",
    },
    storage: {
      label: "guides.tab.storage.label",
      title: "guides.tab.storage.title",
      description: "guides.tab.storage.description",
    },
  } satisfies Record<
    GuideTabId,
    Record<"label" | "title" | "description", SiteContentKey>
  >;
  return {
    label: content[fields[id].label],
    title: content[fields[id].title],
    description: content[fields[id].description],
  };
}
export function guideTabOrder(value: string): GuideTabId[] {
  const ids = GUIDE_TABS.map(({ id }) => id);
  return [
    ...new Set([
      ...value
        .split(",")
        .filter((id): id is GuideTabId => ids.includes(id as GuideTabId)),
      ...ids,
    ]),
  ];
}
export function visibleGuideTabs(content: SiteContent) {
  const hidden = new Set(content["guides.hiddenTabs"].split(","));
  return guideTabOrder(content["guides.tabOrder"]).filter(
    (id) => !hidden.has(id),
  );
}
export function homepageSectionOrder(value: string) {
  const ids: string[] = HOMEPAGE_SECTIONS.map((section) => section.id);
  const order = [
    ...new Set([...value.split(",").filter((id) => ids.includes(id)), ...ids]),
  ];
  return ["hero", ...order.filter((id) => id !== "hero")];
}

export const PUBLIC_NAVIGATION = [
  { id: "home", path: "/" },
  { id: "marketplace", path: "/marketplace" },
  { id: "why", path: "/why-us" },
  { id: "guides", path: "/guides" },
  { id: "blogs", path: "/blogs" },
  { id: "experts", path: "/experts" },
  { id: "contact", path: "/contact" },
] as const;

export const CustomNavigationSchema = z
  .array(
    z.object({
      id: z.string().regex(/^custom-[a-z0-9-]{1,50}$/),
      label: z.string().trim().min(1).max(40),
      url: z
        .string()
        .trim()
        .min(1)
        .max(2048)
        .refine((value) => {
          if (/\p{Cc}/u.test(value) || value.includes("\\")) return false;
          if (value.startsWith("/") && !value.startsWith("//")) return true;
          try {
            const parsed = new URL(value);
            return (
              parsed.protocol === "https:" &&
              !parsed.username &&
              !parsed.password
            );
          } catch {
            return false;
          }
        }, "Use a site path or HTTPS URL"),
    }),
  )
  .max(10);
export function publicNavigation(content: SiteContent) {
  let custom: z.infer<typeof CustomNavigationSchema> = [];
  try {
    const result = CustomNavigationSchema.safeParse(
      JSON.parse(content["navigation.custom"] || "[]"),
    );
    if (result.success) custom = result.data;
  } catch {
    /* Invalid drafts do not break public navigation. */
  }
  const hidden = content["navigation.hidden"].split(",");
  const customIds = custom.map((entry) => entry.id);
  const ordered = [
    ...new Set([
      ...content["navigation.order"].split(","),
      ...PUBLIC_NAVIGATION.map((entry) => entry.id),
      ...customIds,
    ]),
  ];
  return ordered.flatMap((id) => {
    const entry = PUBLIC_NAVIGATION.find((entry) => entry.id === id);
    if (entry && !hidden.includes(id))
      return [
        { ...entry, label: content[`navigation.${entry.id}`], external: false },
      ];
    const customEntry = custom.find((entry) => entry.id === id);
    return customEntry && !hidden.includes(id)
      ? [
          {
            id,
            path: customEntry.url,
            label: customEntry.label,
            external: !customEntry.url.startsWith("/"),
          },
        ]
      : [];
  });
}

export const FaqEntriesSchema = z
  .array(
    z.object({
      question: z.string().trim().min(3).max(200),
      answer: z.string().trim().min(3).max(2000),
    }),
  )
  .max(20);
export type FaqEntry = z.infer<typeof FaqEntriesSchema>[number];
export function parseFaqEntries(value: string): FaqEntry[] {
  try {
    const parsed = FaqEntriesSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}
export function publicFaqEntries(content: SiteContent): FaqEntry[] {
  if (content["faq.enabled"] === "false") return [];
  const savedEntries = parseFaqEntries(content["faq.entries"]);
  return savedEntries.length ? savedEntries : DEFAULT_FAQ_ENTRIES;
}
