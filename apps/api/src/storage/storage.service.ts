import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createReadStream } from "node:fs";
import type { Readable } from "node:stream";
@Injectable()
export class StorageService {
  private createClient() {
    return new S3Client({
      region: process.env.AWS_REGION || "ap-south-1",
      endpoint: process.env.AWS_S3_ENDPOINT,
      forcePathStyle: !!process.env.AWS_S3_ENDPOINT,
    });
  }

  private bucket() {
    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket)
      throw new ServiceUnavailableException("File storage is not configured");
    return bucket;
  }

  async uploadFile(
    key: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    const bucket = process.env.AWS_S3_BUCKET;
    const publicUrl = process.env.AWS_S3_PUBLIC_URL;
    if (!bucket || !publicUrl)
      throw new ServiceUnavailableException("File storage is not configured");
    const assetBaseUrl = this.publicAssetBaseUrl(publicUrl);
    const client = this.createClient();
    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        }),
      );
      return `${assetBaseUrl.replace(/\/$/, "")}/${key.split("/").map(encodeURIComponent).join("/")}`;
    } catch {
      throw new ServiceUnavailableException("File upload failed");
    } finally {
      client.destroy();
    }
  }

  private publicAssetBaseUrl(configuredUrl: string) {
    if (process.env.NODE_ENV === "production") return configuredUrl;
    const endpoint = process.env.AWS_S3_ENDPOINT;
    if (!endpoint) return configuredUrl;
    try {
      const publicUrl = new URL(configuredUrl);
      const storageEndpoint = new URL(endpoint);
      const loopbackHosts = new Set(["127.0.0.1", "localhost", "::1"]);
      if (
        publicUrl.protocol === "http:" &&
        publicUrl.origin === storageEndpoint.origin &&
        loopbackHosts.has(storageEndpoint.hostname)
      ) {
        return `https://material-square.localtest.me:5175${publicUrl.pathname}`;
      }
    } catch {
      return configuredUrl;
    }
    return configuredUrl;
  }

  async uploadPrivateFile(
    key: string,
    filePath: string,
    mimeType: string,
    byteSize: number,
  ) {
    const client = this.createClient();
    try {
      await client.send(
        new PutObjectCommand({
          Bucket: this.bucket(),
          Key: key,
          Body: createReadStream(filePath),
          ContentLength: byteSize,
          ContentType: mimeType,
        }),
      );
      return key;
    } catch {
      throw new ServiceUnavailableException("Attachment storage failed");
    } finally {
      client.destroy();
    }
  }

  async openPrivateFile(
    key: string,
  ): Promise<Readable & { closeClient?: () => void }> {
    const client = this.createClient();
    try {
      const result = await client.send(
        new GetObjectCommand({ Bucket: this.bucket(), Key: key }),
      );
      if (!result.Body || !("pipe" in result.Body))
        throw new ServiceUnavailableException("Attachment could not be read");
      const body = result.Body as Readable & { closeClient?: () => void };
      body.closeClient = () => client.destroy();
      return body;
    } catch {
      client.destroy();
      throw new ServiceUnavailableException("Attachment could not be read");
    }
  }

  async deletePrivateFile(key: string) {
    const client = this.createClient();
    try {
      await client.send(
        new DeleteObjectCommand({ Bucket: this.bucket(), Key: key }),
      );
    } finally {
      client.destroy();
    }
  }
}
