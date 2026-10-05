import { validate } from "./validation";
import { CreateQuoteSchema } from "@material-square/types";
describe("Request validation", () => {
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
