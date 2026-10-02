import { Msg91WidgetService } from "./msg91-widget.service";

describe("MSG91 OTP widget verification", () => {
  const service = new Msg91WidgetService();
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.MSG91_AUTHKEY = "test-server-authkey";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.MSG91_AUTHKEY;
  });

  it("accepts only the phone number returned by MSG91 after server verification", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ type: "success", message: "919876543210" }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      service.verifyAccessToken("signed-widget-access-token"),
    ).resolves.toBe("9876543210");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://control.msg91.com/api/v5/widget/verifyAccessToken",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          authkey: "test-server-authkey",
          "access-token": "signed-widget-access-token",
        }),
      }),
    );
  });

  it("rejects an unverified provider response", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ type: "error", message: "Invalid token" }),
    }) as unknown as typeof fetch;
    await expect(service.verifyAccessToken("bad-token")).rejects.toThrow(
      "Invalid or expired OTP verification",
    );
  });
});
