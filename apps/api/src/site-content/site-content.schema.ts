import { z } from "zod";
import {
  WebsitePagesSchema,
  PolicySchema,
  FaqEntriesSchema,
  PUBLIC_NAVIGATION,
  HOMEPAGE_SECTIONS,
  GUIDE_TABS,
  SITE_CONTENT_DEFAULTS,
  HomeContentBlocksSchema,
  CustomNavigationSchema,
  SocialLinksSchema,
  type SiteContentKey,
} from "@material-square/types";

export const SITE_CONTENT_KEYS = Object.keys(
  SITE_CONTENT_DEFAULTS,
) as SiteContentKey[];
const allowed = new Set<string>(SITE_CONTENT_KEYS);
export const SiteContentSchema = z
  .record(z.string(), z.string().trim().max(50000))
  .superRefine((content, ctx) => {
    try {
      const pages = WebsitePagesSchema.safeParse(JSON.parse(content["website.pages"] || "[]"));
      if (!pages.success) ctx.addIssue({ code: "custom", path: ["website.pages"], message: "Provide valid website pages with unique paths and sections" });
    } catch { ctx.addIssue({ code: "custom", path: ["website.pages"], message: "Invalid website pages" }); }
    for (const key of Object.keys(content)) {
      if (!allowed.has(key))
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "Unknown website content field",
        });
    }
    for (const key of SITE_CONTENT_KEYS) {
      if (typeof content[key] !== "string")
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "Every website content field is required",
        });
    }
    for (const key of SITE_CONTENT_KEYS.filter((key) =>
      key.startsWith("seo."),
    )) {
      const maximum = key === "seo.description" ? 300 : 100;
      if (!content[key] || content[key].length > maximum)
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `Enter between 1 and ${maximum} characters`,
        });
    }
    try {
      if (
        !FaqEntriesSchema.safeParse(JSON.parse(content["faq.entries"] || "[]"))
          .success
      )
        ctx.addIssue({
          code: "custom",
          path: ["faq.entries"],
          message: "Provide up to 20 FAQs with valid questions and answers",
        });
    } catch {
      ctx.addIssue({
        code: "custom",
        path: ["faq.entries"],
        message: "Invalid FAQ entries",
      });
    }
    for (const key of SITE_CONTENT_KEYS.filter(
      (key) =>
        key !== "website.pages" &&
        key !== "faq.entries" &&
        key !== "home.contentBlocks" &&
        key !== "navigation.custom" &&
        !key.startsWith("policy."),
    ))
      if ((content[key]?.length || 0) > 2000)
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "Text must be at most 2000 characters",
        });
    for (const key of ["policy.privacy", "policy.terms"]) {
      try {
        if (!PolicySchema.safeParse(JSON.parse(content[key] || "")).success)
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: "Provide a heading and valid policy sections",
          });
      } catch {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "Invalid policy content",
        });
      }
    }
    try {
      const blocks = HomeContentBlocksSchema.safeParse(
        JSON.parse(content["home.contentBlocks"] || "[]"),
      );
      if (
        !blocks.success ||
        blocks.data.some(
          (block) => Boolean(block.buttonLabel) !== Boolean(block.buttonPath),
        )
      )
        ctx.addIssue({
          code: "custom",
          path: ["home.contentBlocks"],
          message:
            "Provide up to 10 content blocks with safe text and optional internal links",
        });
    } catch {
      ctx.addIssue({
        code: "custom",
        path: ["home.contentBlocks"],
        message: "Invalid homepage content blocks",
      });
    }
    for (const key of [
      "home.heroImage",
      "home.categoryImage.steel",
      "home.categoryImage.adhesives",
    ]) {
      if (!content[key]) continue;
      if (
        key !== "home.heroImage" &&
        /^\/images\/categories\/[A-Za-z0-9._-]+\.(?:png|jpe?g|webp)$/i.test(
          content[key],
        )
      )
        continue;
      const result = z.string().url().safeParse(content[key]);
      if (
        !result.success ||
        new URL(content[key]).protocol !== "https:"
      )
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "Use a valid HTTPS image URL or leave blank",
        });
    }
    let customEntries: z.infer<typeof CustomNavigationSchema> = [];
    try {
      const custom = CustomNavigationSchema.safeParse(
        JSON.parse(content["navigation.custom"] || "[]"),
      );
      if (!custom.success) {
        ctx.addIssue({
          code: "custom",
          path: ["navigation.custom"],
          message:
            "Provide up to 10 custom links with a label and site path or HTTPS URL",
        });
      } else customEntries = custom.data;
    } catch {
      ctx.addIssue({
        code: "custom",
        path: ["navigation.custom"],
        message: "Invalid custom navigation links",
      });
    }
    const navIds: string[] = [
      ...PUBLIC_NAVIGATION.map((entry) => entry.id),
      ...customEntries.map((entry) => entry.id),
    ];
    for (const key of ["navigation.order", "navigation.hidden"]) {
      const values = (content[key] || "").split(",").filter(Boolean);
      if (
        values.some((value) => !navIds.includes(value)) ||
        new Set(values).size !== values.length ||
        (key === "navigation.order" &&
          (values.length !== navIds.length ||
            navIds.some((id) => !values.includes(id))))
      )
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "Choose known, unique menu links",
        });
    }
    for (const id of navIds)
      if (
        !content[`navigation.${id}`] ||
        content[`navigation.${id}`].length > 40
      )
        ctx.addIssue({
          code: "custom",
          path: [`navigation.${id}`],
          message: "Menu labels must have 1 to 40 characters",
        });
    const sectionIds: string[] = HOMEPAGE_SECTIONS.map((section) => section.id);
    for (const key of ["home.sectionOrder", "home.hiddenSections"]) {
      const values = (content[key] || "").split(",").filter(Boolean);
      if (
        values.some((value) => !sectionIds.includes(value)) ||
        new Set(values).size !== values.length ||
        (key === "home.sectionOrder" && values.length !== sectionIds.length)
      )
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "Choose valid, unique homepage sections",
        });
    }
    const guideIds = GUIDE_TABS.map(({ id }) => id);
    const guideOrder = (content["guides.tabOrder"] || "")
      .split(",")
      .filter(Boolean);
    const hiddenGuides = (content["guides.hiddenTabs"] || "")
      .split(",")
      .filter(Boolean);
    if (
      guideOrder.length !== guideIds.length ||
      new Set(guideOrder).size !== guideOrder.length ||
      guideOrder.some(
        (id) => !guideIds.includes(id as (typeof guideIds)[number]),
      )
    )
      ctx.addIssue({
        code: "custom",
        path: ["guides.tabOrder"],
        message:
          "Choose every Tools & Guides section once and in the desired order",
      });
    if (
      new Set(hiddenGuides).size !== hiddenGuides.length ||
      hiddenGuides.some(
        (id) => !guideIds.includes(id as (typeof guideIds)[number]),
      ) ||
      hiddenGuides.length === guideIds.length
    )
      ctx.addIssue({
        code: "custom",
        path: ["guides.hiddenTabs"],
        message: "Keep at least one valid Tools & Guides section visible",
      });
    for (const id of guideIds) {
      for (const [suffix, maximum] of [
        ["label", 80],
        ["title", 160],
        ["description", 800],
      ] as const) {
        const key = `guides.tab.${id}.${suffix}`;
        if (!content[key] || content[key].length > maximum)
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: `Enter between 1 and ${maximum} characters`,
          });
      }
    }
    if (content["contact.mapUrl"]) {
      const result = z.string().url().safeParse(content["contact.mapUrl"]);
      if (
        !result.success ||
        new URL(content["contact.mapUrl"]).protocol !== "https:"
      )
        ctx.addIssue({
          code: "custom",
          path: ["contact.mapUrl"],
          message: "Use a valid HTTPS Google Maps link or leave blank",
        });
    }
    for (const key of [
      "home.primaryCtaPath",
      "home.secondaryCtaPath",
      "home.calloutButtonPath",
    ]) {
      const path = content[key];
      if (
        !path ||
        path.length > 300 ||
        !path.startsWith("/") ||
        path.startsWith("//") ||
        path.includes("\\") ||
        /\p{Cc}/u.test(path)
      )
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "Use a valid path within this website",
        });
    }
    try {
      const socialLinks = SocialLinksSchema.safeParse(
        JSON.parse(content["footer.socialLinks"] || "[]"),
      );
      if (
        !socialLinks.success ||
        new Set(socialLinks.data.map((link) => link.id)).size !==
          socialLinks.data.length
      )
        ctx.addIssue({
          code: "custom",
          path: ["footer.socialLinks"],
          message:
            "Provide up to eight social links with unique IDs, labels, and HTTPS addresses",
        });
    } catch {
      ctx.addIssue({
        code: "custom",
        path: ["footer.socialLinks"],
        message: "Invalid social links",
      });
    }
    for (const [key, maximum] of [
      ["guides.callout.title", 160],
      ["guides.callout.description", 800],
    ] as const)
      if (!content[key] || content[key].length > maximum)
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `Enter between 1 and ${maximum} characters`,
        });
    if (
      content["contact.phone"] &&
      !/^[6-9]\d{9}$/.test(content["contact.phone"])
    )
      ctx.addIssue({
        code: "custom",
        path: ["contact.phone"],
        message: "Enter a 10-digit Indian mobile number",
      });
    if (
      content["contact.email"] &&
      !z.string().email().safeParse(content["contact.email"]).success
    )
      ctx.addIssue({
        code: "custom",
        path: ["contact.email"],
        message: "Enter a valid contact email",
      });
  });
