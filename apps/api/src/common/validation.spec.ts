import { validate } from "./validation";
import { RfqSchema } from "../rfqs/rfqs.module";
import { CreateQuoteSchema } from "@material-square/types";
describe("Request validation", () => {
  it("rejects empty material requests with HTTP 400", () => {
    try {
      validate(RfqSchema, {
        customerName: "Test",
        customerPhone: "9876543210",
        siteLocation: "Noida",
        items: [],
      });
      throw new Error("Expected validation failure");
    } catch (error) {
      expect((error as { getStatus(): number }).getStatus()).toBe(400);
    }
  });
  it("rejects malformed phones and negative quantities", () => {
    expect(() =>
      validate(RfqSchema, {
        customerName: "Test",
        customerPhone: "hello",
        siteLocation: "Noida",
        items: [{ material: "Cement", quantity: -2, unit: "Bags" }],
      }),
    ).toThrow();
  });
  it("requires a staff-entered quotation rate", () => {
    expect(
      CreateQuoteSchema.safeParse({
        customerName: "Test",
        customerPhone: "9876543210",
        projectSiteAddress: "Noida site",
        sitePincode: "201301",
        items: [{ productId: "cement", quantityMt: 2 }],
      }).success,
    ).toBe(false);
  });
});
