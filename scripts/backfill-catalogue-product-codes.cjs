#!/usr/bin/env node

require("dotenv").config({ path: ".env" });

const { PrismaClient } = require("@prisma/client");

const LEGACY_CODE = /^MS-[A-Z0-9]{3}-\d{2,}$/i;

function firstThreeCodeLetters(value) {
  return value.replace(/[^a-z0-9]/gi, "").slice(0, 3).toLocaleUpperCase();
}

function generateVariantCode(productCode, sequence) {
  return `${String(productCode || "").trim().toLocaleUpperCase()}-V${String(sequence).padStart(2, "0")}`;
}

function planProductCodeUpdates(listings) {
  const targets = listings.filter(
    (listing) => listing.deletedAt === null && listing.code && LEGACY_CODE.test(listing.code),
  );
  const targetIds = new Set(targets.map(({ id }) => id));
  const used = new Set(
    listings
      .filter((listing) => !targetIds.has(listing.id))
      .map((listing) => listing.code?.toLocaleUpperCase())
      .filter(Boolean),
  );
  const nextByPrefix = new Map();
  const updates = [];

  for (const listing of targets) {
    const brandPrefix = firstThreeCodeLetters(listing.brand || "");
    const categoryPrefix = firstThreeCodeLetters(listing.category || "");
    if (!brandPrefix || !categoryPrefix) {
      throw new Error(`Cannot generate a product code for catalogue listing ${listing.id}: brand or category is empty.`);
    }

    const prefix = `MS-${brandPrefix}-${categoryPrefix}-`;
    let serial = nextByPrefix.get(prefix) || 1;
    let code = `${prefix}${String(serial).padStart(2, "0")}`;
    while (used.has(code)) {
      serial += 1;
      code = `${prefix}${String(serial).padStart(2, "0")}`;
    }
    used.add(code);
    nextByPrefix.set(prefix, serial + 1);
    updates.push({ id: listing.id, name: listing.name, previous: listing.code, code });
  }
  return updates;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to backfill catalogue product codes.");
  }
  const prisma = new PrismaClient();
  try {
    const listings = await prisma.catalogListing.findMany({
      select: { id: true, code: true, brand: true, category: true, name: true, sortOrder: true, deletedAt: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    const updates = planProductCodeUpdates(listings);
    const nextProductCodeById = new Map(updates.map(({ id, code }) => [id, code]));
    const activeListingIds = new Set(listings.filter(({ deletedAt }) => deletedAt === null).map(({ id }) => id));
    const variants = await prisma.catalogListingVariant.findMany({
      where: { listingId: { in: [...activeListingIds] } },
      select: { id: true, code: true, label: true, attributes: true, unit: true, sortOrder: true, listingId: true, listing: { select: { code: true } } },
      orderBy: [{ listingId: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
    });
    const variantsByListing = new Map();
    for (const variant of variants) {
      const rows = variantsByListing.get(variant.listingId) || [];
      rows.push(variant);
      variantsByListing.set(variant.listingId, rows);
    }
    const variantUpdates = [];
    for (const [listingId, rows] of variantsByListing) {
      const productCode = nextProductCodeById.get(listingId) || rows[0].listing.code;
      if (!productCode) throw new Error(`Cannot generate option codes for listing ${listingId}: product code is empty.`);
      const usedSequences = new Set();
      rows.forEach((variant, index) => {
        const existingSequence = variant.code?.match(/-V(\d+)$/i);
        let sequence = existingSequence ? Number(existingSequence[1]) : index + 1;
        if (!sequence || usedSequences.has(sequence)) {
          sequence = Math.max(index + 1, ...usedSequences, 0);
          while (usedSequences.has(sequence)) sequence += 1;
        }
        usedSequences.add(sequence);
        const code = generateVariantCode(productCode, sequence);
        if (variant.code !== code) variantUpdates.push({ id: variant.id, product: listings.find(({ id }) => id === listingId)?.name || listingId, previous: variant.code, code });
      });
    }
    console.table(updates.map(({ name, previous, code }) => ({ product: name, previous, code })));
    console.log(`Sellable option codes to update: ${variantUpdates.length} of ${variants.length}`);
    console.table(variantUpdates.slice(0, 12).map(({ product, previous, code }) => ({ product, previous, code })));
    if (!process.argv.includes("--apply")) {
      console.log(`Dry run: ${updates.length} product codes and ${variantUpdates.length} option codes would be updated. Pass --apply to save them.`);
      return;
    }
    await prisma.$transaction(async (transaction) => {
      for (const update of updates) {
        await transaction.catalogListing.update({
          where: { id: update.id },
          data: { code: update.code },
        });
      }
      if (variantUpdates.length) {
        await transaction.catalogListingVariant.updateMany({
          where: { id: { in: variantUpdates.map(({ id }) => id) } },
          data: { code: null },
        });
        for (const update of variantUpdates) {
          await transaction.catalogListingVariant.update({
            where: { id: update.id },
            data: { code: update.code },
          });
        }
      }
    }, { maxWait: 10000, timeout: 120000 });
    console.log(`Saved ${updates.length} product codes and ${variantUpdates.length} option codes.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
