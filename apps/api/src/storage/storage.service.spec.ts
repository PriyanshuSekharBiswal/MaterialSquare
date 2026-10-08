import { StorageService } from "./storage.service";
const mockSend = jest.fn().mockRejectedValue(new Error("Provider unavailable"));
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn(() => ({
    send: mockSend,
    destroy: jest.fn(),
  })),
  PutObjectCommand: jest.fn(),
}));
describe("Storage failures", () => {
  const old = {
    bucket: process.env.AWS_S3_BUCKET,
    url: process.env.AWS_S3_PUBLIC_URL,
    endpoint: process.env.AWS_S3_ENDPOINT,
    nodeEnv: process.env.NODE_ENV,
  };
  afterAll(() => {
    if (old.bucket) process.env.AWS_S3_BUCKET = old.bucket;
    else delete process.env.AWS_S3_BUCKET;
    if (old.url) process.env.AWS_S3_PUBLIC_URL = old.url;
    else delete process.env.AWS_S3_PUBLIC_URL;
    if (old.endpoint) process.env.AWS_S3_ENDPOINT = old.endpoint;
    else delete process.env.AWS_S3_ENDPOINT;
    if (old.nodeEnv) process.env.NODE_ENV = old.nodeEnv;
    else delete process.env.NODE_ENV;
  });
  it("never returns a fabricated URL for missing configuration", async () => {
    delete process.env.AWS_S3_BUCKET;
    await expect(
      new StorageService().uploadFile(
        "file.pdf",
        Buffer.from("test"),
        "application/pdf",
      ),
    ).rejects.toThrow("File storage is not configured");
  });
  it("reports an actual provider failure", async () => {
    process.env.AWS_S3_BUCKET = "test-bucket";
    process.env.AWS_S3_PUBLIC_URL = "https://example.com";
    await expect(
      new StorageService().uploadFile(
        "file.pdf",
        Buffer.from("test"),
        "application/pdf",
      ),
    ).rejects.toThrow("File upload failed");
  });

  it("serves local S3Mock assets from the trusted storefront HTTPS origin", async () => {
    process.env.NODE_ENV = "development";
    process.env.AWS_S3_BUCKET = "material-square-assets";
    process.env.AWS_S3_ENDPOINT = "http://127.0.0.1:9000";
    process.env.AWS_S3_PUBLIC_URL =
      "http://127.0.0.1:9000/material-square-assets";
    mockSend.mockResolvedValueOnce({});

    await expect(
      new StorageService().uploadFile(
        "images/qa image.png",
        Buffer.from("test"),
        "image/png",
      ),
    ).resolves.toBe(
      "https://material-square.localtest.me:5175/material-square-assets/images/qa%20image.png",
    );
  });
});
