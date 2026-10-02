import { StorageService } from "./storage.service";
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn(() => ({
    send: jest.fn().mockRejectedValue(new Error("Provider unavailable")),
    destroy: jest.fn(),
  })),
  PutObjectCommand: jest.fn(),
}));
describe("Storage failures", () => {
  const old = {
    bucket: process.env.AWS_S3_BUCKET,
    url: process.env.AWS_S3_PUBLIC_URL,
  };
  afterAll(() => {
    if (old.bucket) process.env.AWS_S3_BUCKET = old.bucket;
    else delete process.env.AWS_S3_BUCKET;
    if (old.url) process.env.AWS_S3_PUBLIC_URL = old.url;
    else delete process.env.AWS_S3_PUBLIC_URL;
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
});
