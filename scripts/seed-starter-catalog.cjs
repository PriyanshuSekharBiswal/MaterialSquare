require("dotenv").config();

const { PrismaClient } = require("@prisma/client");

// Starter catalogue names are based on public manufacturer product ranges.
// This script never invents commercial terms or overwrites a client's edits.
// Run it explicitly against the database that should receive the starter rows.
const products = [
  ...[
    "Royale Play",
    "Royale Glitz",
    "Royale",
    "Ace Exterior Emulsion",
    "Apex Ultima",
    "Apex Ultima Suprema Air-O-Clean",
    "SmartCare Damp Proof",
    "SmartCare Damp Block 2K",
    "SmartCare Infinia",
    "SmartCare Hydroloc",
    "WoodTech PU Palette",
    "WoodTech Aquadur PU Interior Matt",
    "WoodTech Melamyne",
  ].map((name) => ({ brand: "Asian Paints", category: "paints", categoryLabel: "Paints & finishes", name })),
  ...[
    "Silk Glamor Dazzle",
    "Silk Glamor High Sheen",
    "Silk Glamor Soft Sheen",
    "Silk Glamor Matt",
    "Silk Metallics",
    "Silk GlamArt Metallica",
    "Silk GlamArt Metallica for Designs",
    "Silk GlamArt Non Metallic",
    "Silk GlamArt Vintage",
    "Silk GlamArt Stucco",
    "Silk GlamArt Stones & Tones",
    "Easy Clean",
  ].map((name) => ({ brand: "Berger", category: "paints", categoryLabel: "Paints & finishes", name })),
  ...[
    ["Grey cement · Ordinary Portland Cement", "cement"],
    ["Grey cement · Portland Pozzolana Cement", "cement"],
    ["Grey cement · Portland Pozzolana Super", "cement"],
    ["Grey cement · Composite Cement", "cement"],
    ["Grey cement · Weather Plus", "cement"],
    ["Grey cement · Portland Slag Cement", "cement"],
    ["Birla White Cement", "cement"],
    ["Birla White Wall Care Putty", "cement"],
    ["Weather Pro Waterproofing System", "waterproofing"],
    ["Tilefixo Sumo CT", "tile-adhesives"],
    ["Tilefixo NT", "tile-adhesives"],
    ["Tilefixo YT", "tile-adhesives"],
    ["Readiplast", "plaster"],
    ["Super Stucco", "plaster"],
  ].map(([name, category]) => ({ brand: "UltraTech", category, categoryLabel: category === "cement" ? "Cement & aggregates" : category === "tile-adhesives" ? "Tile adhesives & grouts" : category === "plaster" ? "Plaster & repair" : "Waterproofing", name })),
  ...[
    "CPVC Pro",
    "Pex-a Pro",
    "MultiPex",
    "Aquarius",
    "Eco Pro",
    "Chem Flow",
    "Silencio",
    "Drain Pro",
  ].map((name) => ({ brand: "Astral", category: "pipes", categoryLabel: "Pipes & fittings", name })),
  ...[
    "Green Wire+",
    "Suprema with E-Beam Technology",
    "Optima+",
    "Primma",
    "HR-FR-LSH-LF Green Wire",
  ].map((name) => ({ brand: "Polycab", category: "wires", categoryLabel: "Wires & electrical", name })),
];

if (products.length < 50) {
  throw new Error(`Expected at least 50 starter listings; found ${products.length}`);
}

const slugify = (value) => value.toLowerCase()
  .normalize("NFKD")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

async function main() {
  const prisma = new PrismaClient();
  try {
    let created = 0;
    let skipped = 0;

    for (const [index, product] of products.entries()) {
      const slug = slugify(`${product.brand}-${product.name}`);
      const existing = await prisma.catalogListing.findUnique({ where: { slug }, select: { id: true } });
      if (existing) {
        skipped += 1;
        continue;
      }

      await prisma.catalogListing.create({
        data: {
          slug,
          code: null,
          name: product.name,
          brand: product.brand,
          category: product.category,
          categoryLabel: product.categoryLabel,
          unit: "Pack size to confirm",
          description:
            "Ask the team to confirm the exact variant, pack size, colour or grade, price and current availability for your requirement.",
          price: null,
          compareAtPrice: null,
          priceNote: null,
          offerLabel: null,
          minOrderQty: null,
          dispatchTime: null,
          image: null,
          galleryImages: [],
          grade: null,
          isInStock: false,
          isPublished: true,
          features: [],
          applications: [],
          specifications: {},
          sortOrder: index + 1,
        },
      });
      created += 1;
    }

    console.log(`Starter catalogue complete: ${created} created, ${skipped} existing listings left unchanged.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
