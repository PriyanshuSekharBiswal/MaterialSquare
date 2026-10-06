import { BadRequestException } from "@nestjs/common";
import { sanitizePublicSiteContent, SITE_CONTENT_DEFAULTS } from "@material-square/types";
import {
  AdminSiteContentController,
  PublicSiteContentController,
} from "./site-content.controller";

describe("website content", () => {
  let stored: Record<string, unknown> | null;
  const upsert = jest.fn(
    async ({ create }: { create: { content: Record<string, unknown> } }) => {
      stored = create.content;
      return { content: stored };
    },
  );
  const auditCreate = jest.fn();
  const findPublishedArticles = jest.fn(async () => [
    {
      slug: "care-and-maintenance",
      updatedAt: new Date("2026-09-30T00:00:00Z"),
    },
  ]);
  const prisma = {
    auditLog: { create: auditCreate },
    blogPost: { findMany: findPublishedArticles },
    $transaction: async (work: (tx: unknown) => Promise<unknown>) =>
      work(prisma),
    websiteContent: {
      findUnique: jest.fn(async () => (stored ? { content: stored } : null)),
      upsert,
    },
    websiteContentRevision: {
      deleteMany: jest.fn(async () => ({ count: 0 })),
      findFirst: jest.fn(async () => null),
      create: jest.fn(async ({ data }: { data: unknown }) => data),
      findMany: jest.fn(async () => []),
      update: jest.fn(async ({ data }: { data: unknown }) => data),
    },
  } as never;

  beforeEach(() => {
    stored = null;
    jest.clearAllMocks();
  });

  it("does not expose unpublished pages or include them in the sitemap", async () => {
    const page = { id: "page", path: "/our-services", title: "Services", description: "", published: false, sections: [] };
    stored = { "website.pages": JSON.stringify([page]) };
    const controller = new PublicSiteContentController(prisma);
    expect((await controller.get())["website.pages"]).toBe("[]");
    expect(await controller.sitemap("https://materials.example")).not.toContain("/our-services");
    stored = { "website.pages": JSON.stringify([{ ...page, published: true }]) };
    expect(JSON.parse((await controller.get())["website.pages"])).toHaveLength(1);
    expect(await controller.sitemap("https://materials.example")).toContain("/our-services");
  });

  it("serves compiled defaults until the owner publishes page copy", async () => {
    const controller = new PublicSiteContentController(prisma);
    await expect(controller.get()).resolves.toEqual(SITE_CONTENT_DEFAULTS);
  });

  it("replaces unchanged preview contact details and copy but preserves client edits", () => {
    const safe = sanitizePublicSiteContent({
      "contact.phone": "9773505015",
      "contact.phoneDisplay": "+91 97735 05015",
      "contact.location": "Serving Delhi NCR (Noida, Greater Noida, Delhi, Gurugram, Ghaziabad & Faridabad)",
      "home.title": "Why Make 5 Calls?\nOne Call. All Materials.",
      "footer.slogan": "Client-approved slogan",
    });

    expect(safe["contact.phone"]).toBe(SITE_CONTENT_DEFAULTS["contact.phone"]);
    expect(safe["contact.phoneDisplay"]).toBe(
      SITE_CONTENT_DEFAULTS["contact.phoneDisplay"],
    );
    expect(safe["contact.location"]).toBe(
      SITE_CONTENT_DEFAULTS["contact.location"],
    );
    expect(safe["home.title"]).toBe(SITE_CONTENT_DEFAULTS["home.title"]);
    expect(safe["footer.slogan"]).toBe("Client-approved slogan");
  });

  it("builds a public sitemap from static pages and currently published articles", async () => {
    const controller = new PublicSiteContentController(prisma);
    const sitemap = await controller.sitemap("https://materials.example");
    expect(sitemap).toContain("https://materials.example/marketplace");
    expect(sitemap).toContain(
      "https://materials.example/blogs/care-and-maintenance",
    );
    expect(findPublishedArticles).toHaveBeenCalledWith({
      where: { status: "PUBLISHED", publishedAt: { lte: expect.any(Date) } },
      orderBy: { publishedAt: "desc" },
      select: { slug: true, updatedAt: true },
    });
  });

  it("requires a safe HTTPS origin when building a sitemap", async () => {
    const controller = new PublicSiteContentController(prisma);
    await expect(
      controller.sitemap("http://materials.example"),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      controller.sitemap("https://materials.example/path"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("persists text-only edits and publishes them through the public endpoint", async () => {
    const admin = new AdminSiteContentController(prisma);
    const edited = {
      ...SITE_CONTENT_DEFAULTS,
      "home.title": "Updated headline\nSecond line",
    };
    await expect(admin.save(edited)).resolves.toEqual(edited);
    await expect(
      new PublicSiteContentController(prisma).get(),
    ).resolves.toEqual(edited);
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(auditCreate).toHaveBeenCalledWith({
      data: {
        staffId: undefined,
        action: "WEBSITE_CONTENT_PUBLISHED",
        entityType: "WEBSITE_CONTENT",
        entityId: "global",
        metadata: {
          changedFields: ["home.title"],
          changes: [{ field: "home.title", before: SITE_CONTENT_DEFAULTS["home.title"].slice(0, 240), after: "Updated headline\nSecond line" }],
        },
      },
    });
  });

  it("rejects unapproved fields and malformed contact information", async () => {
    const admin = new AdminSiteContentController(prisma);
    await expect(
      admin.save({ ...SITE_CONTENT_DEFAULTS, "home.script": "<script>" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      admin.save({ ...SITE_CONTENT_DEFAULTS, "contact.phone": "12" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      admin.save({
        ...SITE_CONTENT_DEFAULTS,
        "home.heroImage": "javascript:alert(1)",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      admin.save({
        ...SITE_CONTENT_DEFAULTS,
        "home.primaryCtaPath": "https://outside.example/",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      admin.save({
        ...SITE_CONTENT_DEFAULTS,
        "footer.socialLinks": JSON.stringify([
          {
            id: "social-test",
            label: "Unsafe link",
            url: "javascript:alert(1)",
          },
        ]),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      admin.save({
        ...SITE_CONTENT_DEFAULTS,
        "faq.entries": JSON.stringify([{ question: "Question", answer: "" }]),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      admin.save({ ...SITE_CONTENT_DEFAULTS, "faq.entries": "invalid json" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      admin.save({ ...SITE_CONTENT_DEFAULTS, "policy.privacy": "{}" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(upsert).not.toHaveBeenCalled();
  });
  it("validates editable guide order, visibility, and bounded public copy", async () => {
    const admin = new AdminSiteContentController(prisma);
    await expect(
      admin.save({
        ...SITE_CONTENT_DEFAULTS,
        "guides.tabOrder": "wire,wire,storage",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      admin.save({
        ...SITE_CONTENT_DEFAULTS,
        "guides.hiddenTabs": "wire,plumbing,storage",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      admin.save({
        ...SITE_CONTENT_DEFAULTS,
        "guides.tab.wire.description": "x".repeat(801),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(upsert).not.toHaveBeenCalled();
  });
  it("validates repeatable homepage content and keeps buttons on the website", async () => {
    const admin = new AdminSiteContentController(prisma);
    const blocks = [
      {
        id: "block-announcement-1",
        title: "Service update",
        body: "Read our latest service information.",
        buttonLabel: "Contact us",
        buttonPath: "/contact",
        visible: true,
      },
    ];
    const edited = {
      ...SITE_CONTENT_DEFAULTS,
      "home.contentBlocks": JSON.stringify(blocks),
    };
    await expect(admin.save(edited)).resolves.toEqual(edited);
    expect(upsert).toHaveBeenCalledTimes(1);

    await expect(
      admin.save({
        ...SITE_CONTENT_DEFAULTS,
        "home.contentBlocks": JSON.stringify([
          { ...blocks[0], buttonPath: "https://outside.example/" },
        ]),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      admin.save({
        ...SITE_CONTENT_DEFAULTS,
        "home.contentBlocks": JSON.stringify([
          { ...blocks[0], buttonPath: "" },
        ]),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      admin.save({
        ...SITE_CONTENT_DEFAULTS,
        "home.contentBlocks": JSON.stringify([blocks[0], blocks[0]]),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      admin.save({
        ...SITE_CONTENT_DEFAULTS,
        "home.contentBlocks": JSON.stringify(
          Array.from({ length: 11 }, (_, index) => ({
            ...blocks[0],
            id: `block-section-${index}`,
          })),
        ),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(upsert).toHaveBeenCalledTimes(1);
  });
  it("keeps drafts separate from live copy until publish", async () => {
    const documents = new Map();
    const db = {
      auditLog: { create: auditCreate },
      websiteContentRevision: {
        deleteMany: jest.fn(async () => ({ count: 0 })),
        findFirst: jest.fn(async () => null),
        create: jest.fn(async ({ data }) => data),
        findMany: jest.fn(async () => []),
        update: jest.fn(async ({ data }) => data),
      },
      $transaction: async (work: (tx: unknown) => Promise<unknown>) => work(db),
      websiteContent: {
        findUnique: jest.fn(
          async ({ where }) => documents.get(where.id) || null,
        ),
        upsert: jest.fn(async ({ where, create, update }) => {
          const value = documents.has(where.id) ? update : create;
          documents.set(where.id, value);
          return value;
        }),
      },
    };
    const admin = new AdminSiteContentController(db as never);
    const publicContent = new PublicSiteContentController(db as never);
    const edited = { ...SITE_CONTENT_DEFAULTS, "home.title": "Draft headline" };
    await admin.saveDraft(edited, {
      user: { userId: "staff-editor" },
    } as never);
    expect(auditCreate).toHaveBeenCalledWith({
      data: {
        staffId: "staff-editor",
        action: "WEBSITE_CONTENT_DRAFT_SAVED",
        entityType: "WEBSITE_CONTENT",
        entityId: "draft",
        metadata: {
          changedFields: ["home.title"],
          changes: [{ field: "home.title", before: SITE_CONTENT_DEFAULTS["home.title"].slice(0, 240), after: "Draft headline" }],
        },
      },
    });
    await expect(admin.draft()).resolves.toEqual(edited);
    await expect(publicContent.get()).resolves.toEqual(SITE_CONTENT_DEFAULTS);
    await admin.publish(edited);
    await expect(publicContent.get()).resolves.toEqual(edited);
  });

  it("keeps actor-attributed autosave recovery points for seven days without publishing", async () => {
    const docs = new Map<string, { content: Record<string, string>; updatedAt: Date }>();
    const revisionCreate = jest.fn(async ({ data }: { data: Record<string, unknown> }) => data);
    const db = {
      auditLog: { create: jest.fn() },
      websiteContent: {
        findUnique: jest.fn(async ({ where }: { where: { id: string } }) => docs.get(where.id) || null),
        upsert: jest.fn(async ({ where, create, update }: { where: { id: string }; create: { content: Record<string, string> }; update: { content: Record<string, string> } }) => {
          const value = docs.has(where.id) ? update : create;
          docs.set(where.id, { content: value.content, updatedAt: new Date() });
          return value;
        }),
      },
      websiteContentRevision: {
        deleteMany: jest.fn(async () => ({ count: 0 })),
        findFirst: jest.fn(async () => null),
        create: revisionCreate,
        findMany: jest.fn(async () => []),
        update: jest.fn(async ({ data }: { data: unknown }) => data),
      },
      $transaction: async (work: (tx: unknown) => Promise<unknown>) => work(db),
    };
    const admin = new AdminSiteContentController(db as never);
    const live = { ...SITE_CONTENT_DEFAULTS, "home.title": "Live heading" };
    docs.set("global", { content: live, updatedAt: new Date() });
    const draft = { ...live, "home.title": "Recovered heading" };
    await admin.saveDraft(draft, { user: { userId: "staff-editor" } } as never, "autosave");

    expect(revisionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        staffId: "staff-editor",
        content: draft,
        changedFields: ["home.title"],
        saveType: "AUTOSAVE",
        expiresAt: expect.any(Date),
      }),
    });
    const expiresAt = (revisionCreate.mock.calls[0][0].data.expiresAt as Date).getTime();
    expect(expiresAt).toBeGreaterThan(Date.now() + 6 * 24 * 60 * 60 * 1000);
    expect(expiresAt).toBeLessThan(Date.now() + 8 * 24 * 60 * 60 * 1000);
    expect(db.auditLog.create).not.toHaveBeenCalled();
    await expect(new PublicSiteContentController(db as never).get()).resolves.toEqual(live);
  });
});
