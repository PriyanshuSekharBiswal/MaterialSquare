#!/usr/bin/env node

// Adds clearly labeled local-only supplier fixtures for procurement matching.
// Safe to rerun: supplier, product, and rating records are updated in place.
require("dotenv").config({ path: ".env" });

const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

const marker = "[PROCUREMENT MATCH TEST DATA]";
const deliveryPin = "110001";

const locations = [
  ["New Delhi", "Delhi", "110001", "Connaught Place"],
  ["Delhi", "Delhi", "110020", "Okhla Industrial Area"],
  ["Delhi", "Delhi", "110034", "Shalimar Bagh"],
  ["Delhi", "Delhi", "110092", "Laxmi Nagar"],
  ["Noida", "Uttar Pradesh", "201301", "Sector 18"],
  ["Noida", "Uttar Pradesh", "201309", "Sector 63"],
  ["Ghaziabad", "Uttar Pradesh", "201010", "Indirapuram"],
  ["Gurugram", "Haryana", "122001", "Udyog Vihar"],
  ["Faridabad", "Haryana", "121001", "NIT Industrial Area"],
  ["Jaipur", "Rajasthan", "302001", "M.I. Road"],
  ["Lucknow", "Uttar Pradesh", "226001", "Aminabad"],
  ["Mumbai", "Maharashtra", "400001", "Fort"],
  ["Mumbai", "Maharashtra", "400053", "Andheri West"],
  ["Pune", "Maharashtra", "411001", "Camp"],
  ["Ahmedabad", "Gujarat", "380001", "Relief Road"],
  ["Bengaluru", "Karnataka", "560001", "Shivajinagar"],
  ["Hyderabad", "Telangana", "500001", "Abids"],
  ["Chennai", "Tamil Nadu", "600001", "Parrys Corner"],
  ["Kolkata", "West Bengal", "700001", "B.B.D. Bagh"],
  ["Indore", "Madhya Pradesh", "452001", "M.G. Road"],
];

const brands = [
  "UltraTech Cement", "JK Cement", "Ambuja Cement", "Shree Cement",
  "Asian Paints", "Finolex Pipes", "Astral Pipes", "Finolex Cables Limited",
  "Havells India", "Polycab Wires", "Tata Tiscon", "CERA Sanitaryware",
  "Jaquar Bath + Light", "MYK Laticrete", "Supreme Industries", "Zoloto Valves",
  "Birla Opus Paints",
];

const products = [
  { name: "UltraTech Super Weather Plus Cement", brand: "UltraTech Cement", category: "Cement & Aggregates", unit: "50 kg bag", price: 390 },
  { name: "JK Super Strong OPC 53 Grade", brand: "JK Cement", category: "Cement & Aggregates", unit: "50 kg bag", price: 375 },
  { name: "Ambuja Kawach Water Shield Cement", brand: "Ambuja Cement", category: "Cement & Aggregates", unit: "50 kg bag", price: 410 },
  { name: "Shree Roofon Concrete Master Cement", brand: "Shree Cement", category: "Cement & Aggregates", unit: "50 kg bag", price: 385 },
  { name: "Shree Roofon Concrete Master Cement", brand: "Shree Cement", category: "Cement & Aggregates", unit: "50 Kg Laminated Bag", price: 405 },
  { name: "Asian Paints Apex Ultima Weatherproof Emulsion", brand: "Asian Paints", category: "Paints & Wall Prep", unit: "1 L tin", price: 620 },
  { name: "Asian Paints Apex Ultima Weatherproof Emulsion", brand: "Asian Paints", category: "Paints & Wall Prep", unit: "4 L tin", price: 2250 },
  { name: "Asian Paints Apex Ultima Weatherproof Emulsion", brand: "Asian Paints", category: "Paints & Wall Prep", unit: "20 L drum", price: 9800 },
  { name: "JK WallMaxX White Cement Wall Putty", brand: "JK Cement", category: "Paints & Wall Prep", unit: "40 kg bag", price: 760 },
  { name: "Finolex Lead-Free UPVC Cold Water Plumbing Pipes", brand: "Finolex Pipes", category: "Pipes & Fittings", unit: "3 m length", price: 290 },
  { name: "Astral CPVC Plumbing Pipe", brand: "Astral Pipes", category: "Pipes & Fittings", unit: "3 m length", price: 420 },
  { name: "Havells FR PVC Insulated Copper Wire", brand: "Havells India", category: "Wires & Electrical", unit: "90 m coil", price: 1850 },
  { name: "Polycab Green Wire", brand: "Polycab Wires", category: "Wires & Electrical", unit: "90 m coil", price: 1650 },
  { name: "Tata Tiscon TMT Reinforcement Bar", brand: "Tata Tiscon", category: "Steel & Reinforcement", unit: "12 m length", price: 690 },
  { name: "CERA Floor Mounted EWC", brand: "CERA Sanitaryware", category: "Sanitaryware & Bath", unit: "piece", price: 5800 },
  { name: "MYK Laticrete Tile Adhesive", brand: "MYK Laticrete", category: "Adhesives & Grouts", unit: "20 kg bag", price: 540 },
  { name: "Supreme SWR Drainage Pipe", brand: "Supreme Industries", category: "Pipes & Fittings", unit: "3 m length", price: 360 },
  { name: "Zoloto Brass Ball Valve", brand: "Zoloto Valves", category: "Pipes & Fittings", unit: "piece", price: 480 },
  { name: "Birla Opus Style Colour Smart Interior Emulsion", brand: "Birla Opus Paints", category: "Paints & Wall Prep", unit: "20 L drum", price: 6100 },
  { name: "Finolex FR PVC Insulated Copper Cable", brand: "Finolex Cables Limited", category: "Wires & Electrical", unit: "90 m coil", price: 1720 },
  { name: "Jaquar Chrome Basin Mixer", brand: "Jaquar Bath + Light", category: "Sanitaryware & Bath", unit: "piece", price: 3450 },
];

const mod = (n, d) => ((n % d) + d) % d;
const ratingFor = (index) => 3 + (mod(index * 7, 11) / 10); // 3.0–4.0 out of 5

function supplierBrands(index) {
  // Intentionally overlap popular RFQ brands while distributing the wider
  // catalogue across the sample set so supplier suggestions are varied.
  if ([0, 20, 40].includes(index)) {
    return ["UltraTech Cement", "JK Cement", "Ambuja Cement", "Shree Cement", "Asian Paints", "Finolex Pipes"];
  }
  const count = 2 + mod(index, 3);
  const chosen = [];
  for (let step = 0; chosen.length < count && step < brands.length * 2; step += 1) {
    const brand = brands[mod(index * 3 + step * (index % 2 ? 5 : 7), brands.length)];
    if (!chosen.includes(brand)) chosen.push(brand);
  }
  if (index % 2 === 0) {
    const popular = ["UltraTech Cement", "JK Cement", "Ambuja Cement", "Shree Cement", "Asian Paints", "Finolex Pipes"];
    const brand = popular[mod(index, popular.length)];
    if (!chosen.includes(brand)) chosen[0] = brand;
  }
  return chosen;
}

function supplierProducts(index, chosenBrands) {
  // Three New Delhi suppliers carry every distinct product pack from the
  // current sample RFQ, giving the near-location tier enough coverage to test
  // both ranking and stock-allocation suggestions.
  if ([0, 20, 40].includes(index)) return products.slice(0, 10);
  const matching = products.filter((product) => chosenBrands.includes(product.brand));
  const selected = [];
  const desired = Math.min(matching.length, 1 + mod(index, 4));
  for (let step = 0; selected.length < desired; step += 1) {
    const candidate = matching[mod(index + step, matching.length)];
    if (candidate && !selected.some((item) => item.name === candidate.name && item.unit === candidate.unit)) selected.push(candidate);
  }
  return selected;
}

async function main() {
  const url = new URL(process.env.DATABASE_URL || "");
  if (!new Set(["127.0.0.1", "localhost"]).has(url.hostname) || url.pathname !== "/material_square_dev") {
    throw new Error("Refusing to seed: DATABASE_URL must point to local material_square_dev.");
  }

  const publishedVariants = await db.catalogListingVariant.findMany({
    where: { listing: { isPublished: true, deletedAt: null } },
    include: { listing: true },
  });

  const now = new Date();
  let productsCreated = 0;
  let ratingsCreated = 0;
  for (let index = 0; index < 100; index += 1) {
    const number = index + 1;
    const [city, state, pincode, area] = locations[mod(index * 7, locations.length)];
    const chosenBrands = supplierBrands(index);
    const assignedProducts = supplierProducts(index, chosenBrands);
    const servicePincodes = [];
    if (index % 4 === 0) servicePincodes.push(deliveryPin);
    if (index % 3 === 0) servicePincodes.push("201301");
    if (index % 5 === 0) servicePincodes.push("201309");
    const brandCategories = chosenBrands.map((brand) => ({
      brand,
      categories: [...new Set(products.filter((product) => product.brand === brand).map((product) => product.category))],
    }));
    const supplier = await db.supplier.upsert({
      where: { gstin: `TESTMS${String(number).padStart(10, "0")}` },
      create: {
        name: `TEST Supplier ${String(number).padStart(2, "0")} - ${city}`,
        legalName: `TEST Supplier ${String(number).padStart(2, "0")} Trading Co.`,
        phone: `90000${String(10000 + number).slice(-5)}`,
        email: `supplier${String(number).padStart(2, "0")}@example.test`,
        gstin: `TESTMS${String(number).padStart(10, "0")}`,
        address: `${area}, ${city}`,
        city,
        state,
        pincode,
        servicePincodes,
        status: "ACTIVE",
        notes: `${marker} Fixture ${String(number).padStart(2, "0")}; fictional supplier for local procurement matching tests.`,
        brandCatalog: brandCategories,
      },
      update: {
        name: `TEST Supplier ${String(number).padStart(2, "0")} - ${city}`,
        legalName: `TEST Supplier ${String(number).padStart(2, "0")} Trading Co.`,
        phone: `90000${String(10000 + number).slice(-5)}`,
        email: `supplier${String(number).padStart(2, "0")}@example.test`,
        address: `${area}, ${city}`,
        city,
        state,
        pincode,
        servicePincodes,
        status: "ACTIVE",
        notes: `${marker} Fixture ${String(number).padStart(2, "0")}; fictional supplier for local procurement matching tests.`,
        brandCatalog: brandCategories,
        deletedAt: null,
      },
    });

    for (const [productIndex, product] of assignedProducts.entries()) {
      const values = {
        brand: product.brand,
        category: product.category,
        supplierSku: `TEST-${String(number).padStart(2, "0")}-${String(productIndex + 1).padStart(2, "0")}`,
        unit: product.unit,
        minimumOrderQty: 1,
        availableQuantity: 10 + mod(index * 13 + productIndex * 17, 250),
        availabilityCheckedAt: now,
        lastQuotedPrice: product.price + mod(index * 19 + productIndex * 31, 650),
        lastQuotedPriceAt: now,
        isActive: true,
        deletedAt: null,
      };
      const existing = await db.supplierProduct.findFirst({
        where: { supplierId: supplier.id, productName: product.name, unit: product.unit },
      });
      if (existing) {
        await db.supplierProduct.update({ where: { id: existing.id }, data: values });
      } else {
        await db.supplierProduct.create({ data: { supplierId: supplier.id, productName: product.name, ...values } });
        productsCreated += 1;
      }
    }

    const catalogVariantsForSupplier = publishedVariants.filter((variant) =>
      chosenBrands.includes(variant.listing.brand),
    );
    for (const [variantIndex, variant] of catalogVariantsForSupplier.entries()) {
      const values = {
        productName: variant.listing.name,
        brand: variant.listing.brand,
        category: variant.listing.categoryLabel || variant.listing.category,
        supplierSku: `TEST-${String(number).padStart(2, "0")}-CAT-${variant.id.slice(0, 8)}`,
        unit: variant.unit,
        minimumOrderQty: 1,
        availableQuantity: 50 + mod(index * 19 + variantIndex * 23, 450),
        availabilityCheckedAt: now,
        lastQuotedPrice: Number(variant.price ?? 100) + mod(index * 17 + variantIndex * 29, 75),
        lastQuotedPriceAt: now,
        isActive: true,
        deletedAt: null,
      };
      const existing = await db.supplierProduct.findFirst({
        where: { supplierId: supplier.id, catalogVariantId: variant.id },
      });
      if (existing) {
        await db.supplierProduct.update({ where: { id: existing.id }, data: values });
      } else {
        await db.supplierProduct.create({
          data: {
            supplierId: supplier.id,
            catalogVariantId: variant.id,
            ...values,
          },
        });
        productsCreated += 1;
      }
    }

    const score = Math.round(ratingFor(index) * 10) / 10;
    const rating = Math.max(1, Math.min(5, Math.round(score)));
    const ratingComment = `${marker} Rating fixture ${String(number).padStart(2, "0")}`;
    const existingRating = await db.supplierRating.findFirst({ where: { supplierId: supplier.id, comment: ratingComment } });
    const ratingData = {
      priceScore: rating,
      deliveryScore: Math.max(1, Math.min(5, rating - (index % 7 === 0 ? 1 : 0))),
      availabilityScore: rating,
      qualityScore: Math.max(1, Math.min(5, rating + (index % 5 === 0 ? 1 : 0))),
      serviceScore: rating,
      comment: ratingComment,
    };
    if (existingRating) {
      await db.supplierRating.update({ where: { id: existingRating.id }, data: ratingData });
    } else {
      await db.supplierRating.create({ data: { supplierId: supplier.id, ...ratingData } });
      ratingsCreated += 1;
    }
  }

  const [suppliers, activeSuppliers, markedFixtures, listedProducts, markedRatings, cities] = await Promise.all([
    db.supplier.count({ where: { deletedAt: null } }),
    db.supplier.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    db.supplier.count({ where: { deletedAt: null, notes: { contains: marker } } }),
    db.supplierProduct.count({ where: { deletedAt: null, isActive: true, supplier: { notes: { contains: marker } } } }),
    db.supplierRating.count({ where: { comment: { startsWith: marker } } }),
    db.supplier.findMany({ where: { deletedAt: null, notes: { contains: marker } }, distinct: ["city"], select: { city: true } }),
  ]);
  console.log(JSON.stringify({
    fixtureSuppliers: markedFixtures,
    activeSuppliers,
    allSuppliers: suppliers,
    activeFixtureProducts: listedProducts,
    fixtureRatings: markedRatings,
    productsCreated,
    ratingsCreated,
    locations: cities.map((entry) => entry.city).sort(),
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
}).finally(async () => db.$disconnect());
