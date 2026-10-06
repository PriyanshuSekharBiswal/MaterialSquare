import { z } from "zod";
const reserved = new Set([
  "account",
  "admin",
  "api",
  "marketplace",
  "product",
  "material-list",
  "get-quote",
  "contact",
  "why-us",
  "guides",
  "blogs",
  "experts",
  "locations",
  "privacy",
  "terms",
]);
const internalPath = z
  .string()
  .max(300)
  .refine(
    (value) =>
      !value ||
      (value.startsWith("/") &&
        !value.startsWith("//") &&
        !value.includes("\\") &&
        !/\p{Cc}/u.test(value)),
    "Use an internal website path",
  );
export const PageSectionSchema = z
  .object({
    id: z.string().min(1).max(80),
    kind: z.enum(["text", "hero", "image", "cta"]),
    title: z.string().trim().min(1).max(160),
    body: z.string().trim().max(4000),
    imageUrl: z
      .string()
      .max(2000)
      .refine(
        (value) =>
          !value ||
          (/^https:\/\//.test(value) &&
            z.string().url().safeParse(value).success),
        "Use an HTTPS image URL",
      ),
    imageAlt: z.string().trim().max(200),
    buttonLabel: z.string().trim().max(60),
    buttonPath: internalPath,
    visible: z.boolean(),
  })
  .strict()
  .refine(
    (section) => Boolean(section.buttonLabel) === Boolean(section.buttonPath),
    "Set both the button label and destination",
  );
export const WebsitePagesSchema = z
  .array(
    z
      .object({
        id: z.string().min(1).max(80),
        path: z
          .string()
          .regex(/^\/[a-z0-9]+(?:[/-][a-z0-9]+)*$/)
          .max(200)
          .refine(
            (path) => !reserved.has(path.split("/")[1]),
            "This path belongs to an application page",
          ),
        title: z.string().trim().min(1).max(100),
        description: z.string().trim().max(300),
        published: z.boolean(),
        sections: z
          .array(PageSectionSchema)
          .max(30)
          .refine(
            (sections) =>
              new Set(sections.map((s) => s.id)).size === sections.length,
            "Section IDs must be unique",
          ),
      })
      .strict(),
  )
  .max(50)
  .refine(
    (pages) =>
      new Set(pages.map((p) => p.path)).size === pages.length &&
      new Set(pages.map((p) => p.id)).size === pages.length,
    "Page paths and IDs must be unique",
  );
export type WebsitePage = z.infer<typeof WebsitePagesSchema>[number];
export type PageSection = z.infer<typeof PageSectionSchema>;
export function websitePages(value: string): WebsitePage[] {
  try {
    const result = WebsitePagesSchema.safeParse(JSON.parse(value || "[]"));
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}
