import { WebsitePagesSchema, websitePages } from "@material-square/types";
const page = {
  id: "page-one", path: "/our-services", title: "Our services", description: "", published: false,
  sections: [{ id: "section-one", kind: "text", title: "Delivery", body: "Materials to your site", imageUrl: "", imageAlt: "", buttonLabel: "", buttonPath: "", visible: true }],
};
describe("managed website page boundaries", () => {
  it("accepts a page draft and preserves section content", () => {
    expect(websitePages(JSON.stringify([page]))).toEqual([page]);
  });
  it.each(["/account", "/account/profile", "/api/secrets", "/admin", "/product/example", "//external.test", "/foo?bar=1"])("rejects reserved or unsafe path %s", path => {
    expect(WebsitePagesSchema.safeParse([{ ...page, path }]).success).toBe(false);
  });
  it("rejects duplicate routes and IDs", () => {
    expect(WebsitePagesSchema.safeParse([page, page]).success).toBe(false);
    expect(WebsitePagesSchema.safeParse([{ ...page, sections: [page.sections[0], page.sections[0]] }]).success).toBe(false);
  });
  it("rejects script images and external button destinations", () => {
    expect(WebsitePagesSchema.safeParse([{ ...page, sections: [{ ...page.sections[0], imageUrl: "javascript:alert(1)" }] }]).success).toBe(false);
    expect(WebsitePagesSchema.safeParse([{ ...page, sections: [{ ...page.sections[0], buttonLabel: "Open", buttonPath: "//external.test" }] }]).success).toBe(false);
  });
});
