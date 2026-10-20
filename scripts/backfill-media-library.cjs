#!/usr/bin/env node

const { ListObjectsV2Command, S3Client } = require("@aws-sdk/client-s3");
const { PrismaClient } = require("@prisma/client");

const PREFIX = "images/";
const PAGE_SIZE = 1000;
const WRITE_BATCH_SIZE = 20;
const MIME_TYPES = new Map([
  ["png", "image/png"],
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["webp", "image/webp"],
]);

function imageMetadata(key) {
  const extension = key.split(".").pop()?.toLowerCase();
  const mimeType = MIME_TYPES.get(extension);
  if (!mimeType) return null;
  return {
    originalName: key.split("/").pop() || key,
    mimeType,
  };
}

function publicAssetUrl(publicBaseUrl, key) {
  return `${publicBaseUrl.replace(/\/+$/, "")}/${key
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

async function listImageObjects(s3, bucket) {
  const objects = [];
  let continuationToken;
  do {
    const page = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: PREFIX,
        ContinuationToken: continuationToken,
        MaxKeys: PAGE_SIZE,
      }),
    );
    for (const object of page.Contents || []) {
      if (!object.Key || object.Key.endsWith("/")) continue;
      const metadata = imageMetadata(object.Key);
      if (metadata && Number.isSafeInteger(object.Size) && object.Size >= 0) {
        objects.push({
          key: object.Key,
          byteSize: object.Size,
          createdAt: object.LastModified || new Date(),
          ...metadata,
        });
      }
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);
  return objects;
}

async function main() {
  const bucket = process.env.AWS_S3_BUCKET;
  const publicBaseUrl = process.env.AWS_S3_PUBLIC_URL;
  if (!bucket || !publicBaseUrl || !process.env.DATABASE_URL || !process.env.AWS_REGION) {
    throw new Error(
      "Set AWS_S3_BUCKET, AWS_S3_PUBLIC_URL, AWS_REGION, and DATABASE_URL before running the media-library backfill.",
    );
  }
  const apply = process.argv.includes("--apply");
  const prisma = new PrismaClient();
  const s3 = new S3Client({
    region: process.env.AWS_REGION,
    endpoint: process.env.AWS_S3_ENDPOINT,
    forcePathStyle: Boolean(process.env.AWS_S3_ENDPOINT),
  });

  try {
    await prisma.$connect();
    const [objects, indexedAssets] = await Promise.all([
      listImageObjects(s3, bucket),
      prisma.mediaAsset.findMany({
        where: { key: { startsWith: PREFIX } },
        select: { key: true, url: true },
      }),
    ]);
    const indexedByKey = new Map(indexedAssets.map(({ key, url }) => [key, url]));
    const missing = objects.filter(({ key }) => !indexedByKey.has(key));
    const urlChanges = objects.filter(({ key }) =>
      indexedByKey.has(key) && indexedByKey.get(key) !== publicAssetUrl(publicBaseUrl, key),
    );
    const updates = [...missing, ...urlChanges];
    console.log(`Supported bucket images found: ${objects.length}`);
    console.log(`Already indexed: ${objects.length - missing.length}`);
    console.log(`Not yet indexed: ${missing.length}`);
    console.log(`Existing URLs to update: ${urlChanges.length}`);

    if (!apply) {
      console.log("Dry run only. Pass --apply to index these files; bucket objects are never modified.");
      return;
    }

    for (let index = 0; index < updates.length; index += WRITE_BATCH_SIZE) {
      const batch = updates.slice(index, index + WRITE_BATCH_SIZE);
      await Promise.all(
        batch.map((asset) =>
          prisma.mediaAsset.upsert({
            where: { key: asset.key },
            create: {
              ...asset,
              url: publicAssetUrl(publicBaseUrl, asset.key),
            },
            update: { url: publicAssetUrl(publicBaseUrl, asset.key) },
          }),
        ),
      );
    }
    console.log(`Media library backfill complete. Added ${missing.length} assets and repaired ${urlChanges.length} asset URLs.`);
  } finally {
    await prisma.$disconnect();
    s3.destroy();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Media-library backfill failed.");
  process.exitCode = 1;
});
