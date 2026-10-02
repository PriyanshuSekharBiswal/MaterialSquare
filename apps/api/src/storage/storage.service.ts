import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
@Injectable()
export class StorageService {
  async uploadFile(
    key: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    const bucket = process.env.AWS_S3_BUCKET;
    const publicUrl = process.env.AWS_S3_PUBLIC_URL;
    if (!bucket || !publicUrl)
      throw new ServiceUnavailableException("File storage is not configured");
    const client = new S3Client({
      region: process.env.AWS_REGION || "ap-south-1",
      endpoint: process.env.AWS_S3_ENDPOINT,
      forcePathStyle: !!process.env.AWS_S3_ENDPOINT,
    });
    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        }),
      );
      return `${publicUrl.replace(/\/$/, "")}/${key.split("/").map(encodeURIComponent).join("/")}`;
    } catch {
      throw new ServiceUnavailableException("File upload failed");
    } finally {
      client.destroy();
    }
  }
}
