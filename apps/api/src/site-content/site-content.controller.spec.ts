import { BadRequestException } from "@nestjs/common";
import { SITE_CONTENT_DEFAULTS } from "@material-square/types";
import { AdminSiteContentController, PublicSiteContentController } from "./site-content.controller";

describe("website content", () => {
  let stored: Record<string, unknown> | null;
  const upsert = jest.fn(async ({ create }: { create: { content: Record<string, unknown> } }) => {
    stored = create.content;
    return { content: stored };
  });
  const prisma = {
    websiteContent: {
      findUnique: jest.fn(async () => stored ? { content: stored } : null),
      upsert,
    },
  } as never;

  beforeEach(() => {
    stored = null;
    jest.clearAllMocks();
  });

  it("serves compiled defaults until the owner publishes page copy", async () => {
    const controller = new PublicSiteContentController(prisma);
    await expect(controller.get()).resolves.toEqual(SITE_CONTENT_DEFAULTS);
  });

  it("persists text-only edits and publishes them through the public endpoint", async () => {
    const admin = new AdminSiteContentController(prisma);
    const edited = { ...SITE_CONTENT_DEFAULTS, "home.title": "Updated headline\nSecond line" };
    await expect(admin.save(edited)).resolves.toEqual(edited);
    await expect(new PublicSiteContentController(prisma).get()).resolves.toEqual(edited);
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it("rejects unapproved fields and malformed contact information", async () => {
    const admin = new AdminSiteContentController(prisma);
    await expect(admin.save({ ...SITE_CONTENT_DEFAULTS, "home.script": "<script>" }))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(admin.save({ ...SITE_CONTENT_DEFAULTS, "contact.phone": "12" }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(upsert).not.toHaveBeenCalled();
  });
});
